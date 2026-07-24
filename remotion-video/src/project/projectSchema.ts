import {z} from 'zod';
import {VisualDirectorSchema, VisualPlanSchema, VisualSystemSchema} from './visualPlan';

export const PROJECT_SCHEMA_VERSION = 1 as const;

export class ProjectValidationError extends Error {
  public readonly code: string;
  public readonly path: string;

  public constructor(code: string, path: string, message: string) {
    super(`[${code}] ${path}: ${message}`);
    this.name = 'ProjectValidationError';
    this.code = code;
    this.path = path;
  }
}

export const ProjectCaptionSchema = z.object({
  text: z.string(),
  startMs: z.number().nonnegative(),
  endMs: z.number().positive(),
  timestampMs: z.number().nonnegative().nullable().default(null),
  confidence: z.number().min(0).max(1).nullable().default(null),
}).refine((caption) => caption.endMs > caption.startMs, {
  message: 'endMs must be greater than startMs',
  path: ['endMs'],
});

export const ProjectTransitionSchema = z.object({
  type: z.enum(['fade', 'slide']),
  durationInFrames: z.number().int().positive().max(90),
});

export const ProjectCaptionRangeSchema = z.object({
  startIndex: z.number().int().nonnegative(),
  endIndex: z.number().int().nonnegative(),
}).refine((range) => range.endIndex >= range.startIndex, {
  message: 'endIndex must be greater than or equal to startIndex',
  path: ['endIndex'],
});

export const ProjectAssetSchema = z.object({
  kind: z.enum(['image', 'audio', 'video', 'font', 'json']),
  src: z.string().min(1),
  required: z.boolean().default(false),
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const layoutSignatureForScene = (scene: {family: string; payload: Record<string, unknown>}) => {
  const payload = scene.payload;
  if (typeof payload.layoutSignature === 'string' && payload.layoutSignature.trim()) {
    return payload.layoutSignature.trim();
  }
  if (typeof payload.variant === 'string' && payload.variant.trim() && payload.variant !== 'generic') {
    return `variant:${payload.variant.trim()}`;
  }
  if (typeof payload.visualMode === 'string' && payload.visualMode.trim()) {
    return `visual:${payload.visualMode.trim()}`;
  }
  return `family:${scene.family}`;
};

const assertDirectorMatchesLayout = (
  value: unknown,
  layoutSignature: string,
  ctx: z.RefinementCtx,
  path: Array<string | number>,
) => {
  const parsed = VisualDirectorSchema.safeParse(value);
  if (!parsed.success) {
    ctx.addIssue({
      code: 'custom',
      message: 'director must match the visual director grammar',
      path,
    });
    return;
  }
  if (parsed.data.layoutSignature !== layoutSignature) {
    ctx.addIssue({
      code: 'custom',
      message: 'director.layoutSignature must match the scene layoutSignature',
      path: [...path, 'layoutSignature'],
    });
  }
};

export const VideoProjectSchema = z.object({
  schemaVersion: z.literal(PROJECT_SCHEMA_VERSION),
  projectId: z.string().regex(/^[A-Za-z0-9._-]{1,96}$/),
  title: z.string().min(1).max(200),
  render: z.object({
    fps: z.literal(30),
    width: z.number().int().positive().default(1920),
    height: z.number().int().positive().default(1080),
    qualityMode: z.enum(['fast', 'cinematic']).default('fast'),
    orientation: z.enum(['landscape', 'portrait']).default('landscape'),
    captionStyle: z.enum(['boxed', 'editorial']).default('boxed'),
    showProjectLabel: z.boolean().default(true),
  }),
  scenes: z.array(z.object({
    id: z.string().min(1),
    family: z.string().min(1),
    durationInFrames: z.number().int().positive(),
    captionRange: ProjectCaptionRangeSchema.optional(),
    payload: z.record(z.string(), z.unknown()),
    assetIds: z.array(z.string().min(1)).default([]),
    transition: z.union([ProjectTransitionSchema, z.literal(false)]).default(false),
  })).min(1),
  captions: z.array(ProjectCaptionSchema).default([]),
  visualPlan: VisualPlanSchema.optional(),
  visualSystem: VisualSystemSchema.optional(),
  audio: z.object({
    voiceAssetId: z.string().min(1).optional(),
    musicAssetId: z.string().min(1).optional(),
  }).default({}),
  assets: z.record(z.string().min(1), ProjectAssetSchema).default({}),
}).superRefine((project, ctx) => {
  const seen = new Set<string>();
  const sceneById = new Map<string, (typeof project.scenes)[number]>();
  project.scenes.forEach((scene, index) => {
    if (seen.has(scene.id)) {
      ctx.addIssue({
        code: 'custom',
        message: `duplicate scene id: ${scene.id}`,
        path: ['scenes', index, 'id'],
      });
    }
    seen.add(scene.id);
    sceneById.set(scene.id, scene);
  });
  if (project.visualSystem) {
    const visualSystemJson = JSON.stringify(project.visualSystem);
    if (!project.visualPlan) {
      ctx.addIssue({
        code: 'custom',
        message: 'visualSystem projects must include a visualPlan',
        path: ['visualPlan'],
      });
    }
    project.scenes.forEach((scene, sceneIndex) => {
      const payload = scene.payload;
      const layoutSignature = layoutSignatureForScene(scene);
      if (JSON.stringify(payload.visualSystem ?? null) !== visualSystemJson) {
        ctx.addIssue({
          code: 'custom',
          message: 'scene payload visualSystem must match project.visualSystem',
          path: ['scenes', sceneIndex, 'payload', 'visualSystem'],
        });
      }
      assertDirectorMatchesLayout(
        payload.director,
        layoutSignature,
        ctx,
        ['scenes', sceneIndex, 'payload', 'director'],
      );
      const heroTrack = isRecord(payload.heroTrack) ? payload.heroTrack : null;
      const states = Array.isArray(heroTrack?.states) ? heroTrack.states : [];
      states.forEach((state, stateIndex) => {
        if (!isRecord(state)) {
          ctx.addIssue({
            code: 'custom',
            message: 'hero track state must be an object',
            path: ['scenes', sceneIndex, 'payload', 'heroTrack', 'states', stateIndex],
          });
          return;
        }
        assertDirectorMatchesLayout(
          state.director,
          layoutSignature,
          ctx,
          ['scenes', sceneIndex, 'payload', 'heroTrack', 'states', stateIndex, 'director'],
        );
      });
    });
  }
  project.visualPlan?.entries.forEach((entry, index) => {
    if (!seen.has(entry.sceneId)) {
      ctx.addIssue({
        code: 'custom',
        message: `visual plan references unknown scene id: ${entry.sceneId}`,
        path: ['visualPlan', 'entries', index, 'sceneId'],
      });
    }
    if (!project.captions[entry.captionStartIndex] || !project.captions[entry.captionEndIndex]) {
      ctx.addIssue({
        code: 'custom',
        message: 'visual plan caption range points outside captions',
        path: ['visualPlan', 'entries', index, 'captionStartIndex'],
      });
    }
    if (project.visualSystem) {
      const scene = sceneById.get(entry.sceneId);
      if (scene) {
        assertDirectorMatchesLayout(
          entry.director,
          layoutSignatureForScene(scene),
          ctx,
          ['visualPlan', 'entries', index, 'director'],
        );
      }
    }
  });
});

export type VideoProject = z.infer<typeof VideoProjectSchema>;
export type ProjectTransition = z.infer<typeof ProjectTransitionSchema>;
export type ProjectAsset = z.infer<typeof ProjectAssetSchema>;
export type ProjectCaptionRange = z.infer<typeof ProjectCaptionRangeSchema>;

export const formatProjectPath = (path: PropertyKey[]): string =>
  path.reduce<string>((result, part) => (
    typeof part === 'number' ? `${result}[${part}]` : result ? `${result}.${String(part)}` : String(part)
  ), '');
