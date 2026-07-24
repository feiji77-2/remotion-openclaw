import {z} from 'zod';

export const SEMANTIC_INTENT_KEYS = [
  'browser-interaction',
  'command-execution',
  'code-change',
  'configuration',
  'interface-audit',
  'process-flow',
  'verification',
  'asset-selection',
  'system-architecture',
  'comparison',
  'metric',
  'concept-explanation',
  'opening',
  'conclusion',
  'product-showcase',
  'editor-canvas',
  'article-illustration',
  'timeline-story',
  'quote-callout',
  'checklist-progress',
  'radial-explainer',
  'media-compare',
  'overview',
  'rule-compare',
  'code-render',
  'slide-editor',
  'article-map',
  'video-agent',
  'design-token',
  'system-summary',
  'evidence-replay',
] as const;

export const HERO_SHOT_KINDS = [
  'browser-demo',
  'terminal-execution',
  'code-diff',
  'config-check',
  'interface-audit',
  'flow-trace',
  'test-report',
  'asset-library',
  'system-map',
  'before-after',
  'metric-highlight',
  'concept-explainer',
  'product-showcase',
  'editor-canvas',
  'article-illustration',
  'timeline-story',
  'quote-callout',
  'checklist-progress',
  'radial-explainer',
  'media-compare',
  'overview-matrix',
  'rule-compare',
  'code-render',
  'slide-editor',
  'article-map',
  'video-agent',
  'design-compare',
  'system-summary',
  'evidence-replay',
] as const;

export const PRODUCTION_COMPONENT_IDS = HERO_SHOT_KINDS;

export const VISUAL_SYSTEM_VARIANTS = [
  'cinematic-tech',
  'editorial-lightcut',
  'product-console',
] as const;

export const VISUAL_SYSTEM_PACING = [
  'fast',
  'balanced',
  'explainer',
] as const;

export const VISUAL_SYSTEM_PLATFORMS = [
  'portrait',
  'landscape',
  'square',
] as const;

export const SCENE_PRIMITIVES = [
  'hook-title',
  'capability-matrix',
  'problem-solution-compare',
  'editor-canvas-demo',
  'code-or-terminal-evidence',
  'process-map',
  'metric-spike',
  'quote-close',
  'system-summary',
] as const;

export const DIRECTOR_MOTION_PRESETS = [
  'stage-breathe',
  'focus-lock',
  'split-reveal',
  'matrix-step',
  'object-select',
  'number-roll',
  'path-draw',
  'quote-snap',
  'handoff-wipe',
] as const;

export const DIRECTOR_TRANSITION_PRESETS = [
  'ambient-fade',
  'stage-slide',
  'focus-handoff',
  'contrast-flash',
  'none',
] as const;

export const VisualSystemSchema = z.object({
  variant: z.enum(VISUAL_SYSTEM_VARIANTS),
  pacing: z.enum(VISUAL_SYSTEM_PACING),
  platform: z.enum(VISUAL_SYSTEM_PLATFORMS),
}).strict();

export const VisualDirectorSchema = z.object({
  scenePrimitive: z.enum(SCENE_PRIMITIVES),
  layoutSignature: z.string().min(1),
  motionPreset: z.enum(DIRECTOR_MOTION_PRESETS),
  transitionPreset: z.enum(DIRECTOR_TRANSITION_PRESETS),
  focusTarget: z.string().min(1).optional(),
  density: z.enum(['low', 'medium', 'high']),
}).strict();

export const SemanticIntentSchema = z.object({
  key: z.enum(SEMANTIC_INTENT_KEYS),
  shotKind: z.enum(HERO_SHOT_KINDS),
  confidence: z.number().min(0).max(1),
  signals: z.array(z.string().min(1)).min(1),
  sourceText: z.string().min(1),
}).strict();

export const HeroLensSchema = z.object({
  key: z.string().min(1),
  objective: z.string().min(1),
  actionLabel: z.string().min(1),
  signal: z.string().min(1),
  evidenceType: z.string().min(1),
}).strict();

export const HeroShotSchema = z.object({
  kind: z.enum(HERO_SHOT_KINDS),
  environment: z.string().min(1),
  target: z.string().min(1),
  before: z.string().min(1).optional(),
  after: z.string().min(1).optional(),
  command: z.string().min(1).optional(),
  path: z.string().min(1).optional(),
  log: z.string().min(1).optional(),
  metric: z.string().min(1).optional(),
  status: z.string().min(1).optional(),
  evidence: z.array(z.string().min(1)).min(1),
}).strict();

export const VisualPlanDiagnosticSchema = z.object({
  level: z.enum(['error', 'warning', 'info']),
  code: z.string().min(1),
  message: z.string().min(1),
  path: z.string().min(1).optional(),
}).strict();

export const ProductionComponentPropsSchema = z.object({
  title: z.string().min(1),
  detail: z.string().min(1),
  evidence: z.array(z.string().min(1)).min(1),
  metric: z.string().min(1).optional(),
  before: z.string().min(1).optional(),
  after: z.string().min(1).optional(),
  command: z.string().min(1).optional(),
  path: z.string().min(1).optional(),
  log: z.string().min(1).optional(),
  status: z.string().min(1).optional(),
}).strict();

export const ProductionComponentCatalogDescriptorSchema = z.object({
  componentId: z.enum(PRODUCTION_COMPONENT_IDS),
  rendererId: z.enum(PRODUCTION_COMPONENT_IDS),
  label: z.string().min(1),
  description: z.string().min(1),
  category: z.string().min(1),
  orientation: z.enum(['portrait', 'landscape']),
  size: z.string().min(1),
  compatibleIntents: z.array(z.enum(SEMANTIC_INTENT_KEYS)).min(1),
  compatibleShotKinds: z.array(z.enum(HERO_SHOT_KINDS)).min(1),
  requiredData: z.array(z.string().min(1)).min(1),
  motionCapability: z.array(z.string().min(1)).min(1),
  styleCapability: z.array(z.string().min(1)).min(1),
  productionReady: z.literal(true),
}).strict();

export const ProductionComponentCatalogSchema = z.object({
  version: z.literal(1),
  components: z.array(ProductionComponentCatalogDescriptorSchema).min(1),
}).strict();

const VisualBeatSchema = z.object({
  keyword: z.string().min(1),
  icon: z.string().min(1),
  action: z.string().min(1),
  visualState: z.string().min(1),
  motionPreset: z.string().min(1),
  placement: z.string().min(1),
  shotPreset: z.string().min(1),
  detail: z.string().min(1),
  evidence: z.array(z.string().min(1)).optional(),
  value: z.string().min(1).optional(),
}).strict();

export const VisualPlanEntrySchema = z.object({
  id: z.string().min(1),
  sceneId: z.string().min(1),
  sceneIndex: z.number().int().nonnegative(),
  captionStartIndex: z.number().int().nonnegative(),
  captionEndIndex: z.number().int().nonnegative(),
  startFrame: z.number().int().nonnegative(),
  endFrame: z.number().int().positive(),
  intent: SemanticIntentSchema,
  beat: VisualBeatSchema,
  lens: HeroLensSchema,
  shot: HeroShotSchema,
  componentId: z.enum(PRODUCTION_COMPONENT_IDS),
  componentProps: ProductionComponentPropsSchema,
  director: VisualDirectorSchema.optional(),
  assetIds: z.array(z.string().min(1)),
  orientation: z.literal('portrait'),
  resolution: z.enum(['matched', 'fallback', 'error']),
  diagnostics: z.array(VisualPlanDiagnosticSchema),
}).strict().superRefine((entry, context) => {
  if (entry.captionEndIndex < entry.captionStartIndex) {
    context.addIssue({code: 'custom', path: ['captionEndIndex'], message: 'caption range must be ascending'});
  }
  if (entry.endFrame <= entry.startFrame) {
    context.addIssue({code: 'custom', path: ['endFrame'], message: 'entry endFrame must be after startFrame'});
  }
  if (entry.resolution === 'matched' && entry.diagnostics.some((diagnostic) => diagnostic.level === 'error')) {
    context.addIssue({code: 'custom', path: ['diagnostics'], message: 'matched entries cannot contain error diagnostics'});
  }
  if (entry.componentId !== entry.shot.kind) {
    context.addIssue({code: 'custom', path: ['componentId'], message: 'componentId must match shot.kind for production components'});
  }
});

export const VisualPlanSchema = z.object({
  version: z.literal(1),
  generatedFrom: z.literal('captions'),
  narrationHash: z.string().regex(/^[a-f0-9]{64}$/),
  entries: z.array(VisualPlanEntrySchema).min(1),
  diagnostics: z.array(VisualPlanDiagnosticSchema),
}).strict();

export type SemanticIntent = z.infer<typeof SemanticIntentSchema>;
export type HeroLens = z.infer<typeof HeroLensSchema>;
export type HeroShot = z.infer<typeof HeroShotSchema>;
export type VisualSystem = z.infer<typeof VisualSystemSchema>;
export type VisualDirector = z.infer<typeof VisualDirectorSchema>;
export type VisualPlanDiagnostic = z.infer<typeof VisualPlanDiagnosticSchema>;
export type ProductionComponentProps = z.infer<typeof ProductionComponentPropsSchema>;
export type ProductionComponentCatalogDescriptor = z.infer<typeof ProductionComponentCatalogDescriptorSchema>;
export type ProductionComponentCatalog = z.infer<typeof ProductionComponentCatalogSchema>;
export type VisualPlanEntry = z.infer<typeof VisualPlanEntrySchema>;
export type VisualPlan = z.infer<typeof VisualPlanSchema>;
export type ProductionComponentId = typeof PRODUCTION_COMPONENT_IDS[number];

export const visualPlanEntriesForScene = (visualPlan: VisualPlan | undefined, sceneId: string) =>
  visualPlan?.entries.filter((entry) => entry.sceneId === sceneId) ?? [];
