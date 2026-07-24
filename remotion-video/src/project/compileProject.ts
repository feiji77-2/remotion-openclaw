import type {Caption} from '@remotion/captions';
import type {CompiledAsset, ProjectDiagnostic} from './assetResolver';
import {missingVisualAsset, resolveProjectAsset} from './assetResolver';
import type {ProjectSceneFamily} from './sceneRegistry';
import {parseProjectScenePayload} from './sceneRegistry';
import type {ProjectCaptionRange, ProjectTransition, VideoProject} from './projectSchema';
import {ProjectValidationError} from './projectSchema';
import type {VisualPlanEntry, VisualSystem} from './visualPlan';
import {visualPlanEntriesForScene} from './visualPlan';

const GOLDEN_PROJECT_ID = 'workbuddy-six-skills-showcase';
const REQUIRED_GOLDEN_NARRATION_TERMS = [
  'WorkBuddy',
  'PPT Master',
  'HyperFrames',
  '正文配图',
];

const compactMeaningText = (value: unknown): string => String(value ?? '')
  .replace(/\s+/g, '')
  .replace(/[，。！？、；：,.!?;:《》「」“”"'`~()[\]{}<>|/\\-]/g, '')
  .toLocaleLowerCase();

const sourceTextIsCoveredByNarration = (sourceText: string, narrationText: string): boolean => {
  const source = compactMeaningText(sourceText);
  const narration = compactMeaningText(narrationText);
  if (source.length < 4 || narration.length < 4) return false;
  if (narration.includes(source)) return true;
  const middle = Math.floor(source.length / 2);
  return [
    source.slice(0, Math.min(36, source.length)),
    source.slice(Math.max(0, middle - 18), Math.min(source.length, middle + 18)),
    source.slice(Math.max(0, source.length - 36)),
  ].some((anchor) => anchor.length >= 4 && narration.includes(anchor));
};

const frameForMs = (ms: number, fps: 30 = 30): number => Math.round(ms / 1000 * fps);

type SceneTimingPlan = {
  captionRange?: ProjectCaptionRange;
  startFrame: number;
  endFrame: number;
  durationInFrames: number;
};

const orderedProjectCaptions = (project: VideoProject): Caption[] => project.captions
  .filter((caption) => caption.text.trim().length > 0)
  .sort((a, b) => a.startMs - b.startMs || a.endMs - b.endMs);

const captionRangeFromPayload = (payload: Record<string, unknown>): ProjectCaptionRange | undefined => {
  const startIndex = payload.captionStartIndex;
  const endIndex = payload.captionEndIndex;
  if (typeof startIndex !== 'number' || typeof endIndex !== 'number') return undefined;
  if (!Number.isInteger(startIndex) || !Number.isInteger(endIndex) || endIndex < startIndex) return undefined;
  return {startIndex, endIndex};
};

const resolveSceneTimingPlans = (
  project: VideoProject,
  captions: Caption[],
): SceneTimingPlan[] => {
  let legacyCursor = 0;
  const plans = project.scenes.map<SceneTimingPlan>((scene, index) => {
    const range = scene.captionRange ?? captionRangeFromPayload(scene.payload);
    if (!range) {
      const durationInFrames = scene.durationInFrames;
      const plan = {
        startFrame: legacyCursor,
        endFrame: legacyCursor + durationInFrames,
        durationInFrames,
      };
      legacyCursor += durationInFrames;
      return plan;
    }

    const startCaption = captions[range.startIndex];
    const endCaption = captions[range.endIndex];
    if (!startCaption || !endCaption) {
      throw new ProjectValidationError(
        'CAPTION_RANGE_INVALID',
        `scenes[${index}].captionRange`,
        `captionRange ${range.startIndex}-${range.endIndex} is outside captions[0..${Math.max(0, captions.length - 1)}]`,
      );
    }
    const startFrame = frameForMs(startCaption.startMs, project.render.fps);
    const endFrame = frameForMs(endCaption.endMs, project.render.fps);
    const durationInFrames = endFrame - startFrame;
    if (durationInFrames <= 0) {
      throw new ProjectValidationError(
        'CAPTION_RANGE_INVALID',
        `scenes[${index}].captionRange`,
        'captionRange resolves to an empty scene',
      );
    }
    if (Math.abs(durationInFrames - scene.durationInFrames) > 1) {
      throw new ProjectValidationError(
        'CAPTION_RANGE_MISMATCH',
        `scenes[${index}].durationInFrames`,
        `scene duration must be derived from captionRange; expected ${durationInFrames}, received ${scene.durationInFrames}`,
      );
    }
    legacyCursor = endFrame;
    return {captionRange: range, startFrame, endFrame, durationInFrames};
  });

  const rangedCount = plans.filter((plan) => plan.captionRange).length;
  if (rangedCount > 0 && rangedCount !== plans.length) {
    throw new ProjectValidationError(
      'CAPTION_RANGE_INVALID',
      'scenes',
      'captionRange must be declared on every scene or omitted from every scene',
    );
  }
  if (rangedCount === plans.length) {
    plans.forEach((plan, index) => {
      const previous = plans[index - 1];
      if (!plan.captionRange) return;
      if (index === 0 && plan.captionRange.startIndex !== 0) {
        throw new ProjectValidationError(
          'CAPTION_RANGE_INVALID',
          'scenes[0].captionRange.startIndex',
          'the first scene captionRange must start at caption 0',
        );
      }
      if (previous?.captionRange && plan.captionRange.startIndex !== previous.captionRange.endIndex + 1) {
        throw new ProjectValidationError(
          'CAPTION_RANGE_INVALID',
          `scenes[${index}].captionRange.startIndex`,
          'scene captionRanges must be continuous and non-overlapping',
        );
      }
      if (previous && plan.startFrame !== previous.endFrame) {
        throw new ProjectValidationError(
          'CAPTION_RANGE_MISMATCH',
          `scenes[${index}].captionRange`,
          'scene captionRange frame boundary does not align with the previous scene',
        );
      }
    });
  }

  return plans;
};

const normalizeSkillShowcaseBeats = (
  beats: unknown[],
  sceneIndex: number,
  sceneDurationInFrames: number,
  timing: SceneTimingPlan,
  captions: Caption[],
): unknown[] => beats.map((beat, beatIndex) => {
  if (typeof beat !== 'object' || beat === null) return beat;
  const current = beat as Record<string, unknown>;
  const captionStartIndex = current.captionStartIndex;
  const captionEndIndex = current.captionEndIndex;
  if (typeof captionStartIndex !== 'number' || typeof captionEndIndex !== 'number') return beat;
  if (!Number.isInteger(captionStartIndex) || !Number.isInteger(captionEndIndex) || captionEndIndex < captionStartIndex) {
    throw new ProjectValidationError(
      'BEAT_CAPTION_RANGE_INVALID',
      `scenes[${sceneIndex}].payload.beats[${beatIndex}]`,
      'beat captionStartIndex/captionEndIndex must be integer indexes in ascending order',
    );
  }
  if (timing.captionRange && (
    captionStartIndex < timing.captionRange.startIndex
    || captionEndIndex > timing.captionRange.endIndex
  )) {
    throw new ProjectValidationError(
      'BEAT_CAPTION_RANGE_INVALID',
      `scenes[${sceneIndex}].payload.beats[${beatIndex}]`,
      'beat caption range must stay inside its scene captionRange',
    );
  }
  const startCaption = captions[captionStartIndex];
  const endCaption = captions[captionEndIndex];
  if (!startCaption || !endCaption) {
    throw new ProjectValidationError(
      'BEAT_CAPTION_RANGE_INVALID',
      `scenes[${sceneIndex}].payload.beats[${beatIndex}]`,
      'beat caption range points outside captions',
    );
  }
  const computedStartFrame = Math.max(0, frameForMs(startCaption.startMs) - timing.startFrame);
  const computedEndFrame = Math.min(sceneDurationInFrames, frameForMs(endCaption.endMs) - timing.startFrame);
  const startFrame = Number(current.startFrame);
  const endFrame = Number(current.endFrame);
  if (Number.isFinite(startFrame) && Math.abs(startFrame - computedStartFrame) > 1) {
    throw new ProjectValidationError(
      'BEAT_CAPTION_MISMATCH',
      `scenes[${sceneIndex}].payload.beats[${beatIndex}].startFrame`,
      `beat startFrame must be derived from captions[${captionStartIndex}].startMs; expected ${computedStartFrame}, received ${startFrame}`,
    );
  }
  if (Number.isFinite(endFrame) && Math.abs(endFrame - computedEndFrame) > 1) {
    throw new ProjectValidationError(
      'BEAT_CAPTION_MISMATCH',
      `scenes[${sceneIndex}].payload.beats[${beatIndex}].endFrame`,
      `beat endFrame must be derived from captions[${captionEndIndex}].endMs; expected ${computedEndFrame}, received ${endFrame}`,
    );
  }
  return {
    ...current,
    startFrame: computedStartFrame,
    endFrame: computedEndFrame,
  };
});

const payloadFromVisualPlan = (
  payload: Record<string, unknown>,
  entries: VisualPlanEntry[],
  sceneIndex: number,
  sceneDurationInFrames: number,
  timing: SceneTimingPlan,
): Record<string, unknown> => {
  if (entries.length === 0) {
    throw new ProjectValidationError(
      'VISUAL_PLAN_INVALID',
      `scenes[${sceneIndex}]`,
      'every scene must have at least one Visual Plan entry',
    );
  }
  entries.forEach((entry, entryIndex) => {
    const previous = entries[entryIndex - 1];
    if (entry.sceneIndex !== sceneIndex) {
      throw new ProjectValidationError(
        'VISUAL_PLAN_INVALID',
        `visualPlan.entries[${entry.id}].sceneIndex`,
        `expected sceneIndex ${sceneIndex}, received ${entry.sceneIndex}`,
      );
    }
    if (timing.captionRange && (
      entry.captionStartIndex < timing.captionRange.startIndex
      || entry.captionEndIndex > timing.captionRange.endIndex
    )) {
      throw new ProjectValidationError(
        'VISUAL_PLAN_INVALID',
        `visualPlan.entries[${entry.id}].captionStartIndex`,
        'Visual Plan caption range must stay inside its scene',
      );
    }
    if (entry.endFrame > sceneDurationInFrames || (previous && entry.startFrame !== previous.endFrame)) {
      throw new ProjectValidationError(
        'VISUAL_PLAN_INVALID',
        `visualPlan.entries[${entry.id}].startFrame`,
        'Visual Plan entries must continuously cover the scene timeline',
      );
    }
    if (entry.resolution !== 'matched' || entry.diagnostics.some((diagnostic) => diagnostic.level === 'error')) {
      throw new ProjectValidationError(
        'VISUAL_PLAN_UNRESOLVED',
        `visualPlan.entries[${entry.id}]`,
        entry.diagnostics.map((diagnostic) => diagnostic.message).join('; ') || 'Visual Plan entry is unresolved',
      );
    }
  });
  if (entries[0]?.startFrame !== 0 || entries[entries.length - 1]?.endFrame !== sceneDurationInFrames) {
    throw new ProjectValidationError(
      'VISUAL_PLAN_INVALID',
      `scenes[${sceneIndex}]`,
      'Visual Plan entries must cover the complete scene duration',
    );
  }

  const beats = entries.map((entry) => ({
    ...entry.beat,
    startFrame: entry.startFrame,
    endFrame: entry.endFrame,
    captionStartIndex: entry.captionStartIndex,
    captionEndIndex: entry.captionEndIndex,
  }));
  const existingTrack = payload.heroTrack && typeof payload.heroTrack === 'object'
    ? payload.heroTrack as {kind?: unknown}
    : null;
  // Legacy hero shells only retain the eight data-driven track kinds; a stale
  // or missing kind is re-derived from the Visual Plan shot, never defaulted
  // to the removed generic-explainer.
  const legacyTrackKinds = new Set(['overview-matrix', 'rule-compare', 'code-render', 'slide-editor', 'article-map', 'video-agent', 'design-compare', 'system-summary']);
  const shotKind = entries[0]?.shot?.kind;
  const kind = typeof existingTrack?.kind === 'string' && legacyTrackKinds.has(existingTrack.kind)
    ? existingTrack.kind
    : typeof shotKind === 'string' && legacyTrackKinds.has(shotKind)
      ? shotKind
      : 'overview-matrix';
  const states = entries.map((entry) => ({
    startFrame: entry.startFrame,
    endFrame: entry.endFrame,
    captionStartIndex: entry.captionStartIndex,
    captionEndIndex: entry.captionEndIndex,
    label: entry.componentProps.title.slice(0, 32),
    detail: entry.componentProps.detail.slice(0, 120),
    evidence: entry.componentProps.evidence.slice(0, 5),
    entityTarget: entry.componentId,
    cinematicPreset: entry.beat.shotPreset,
    lens: entry.lens,
    shot: entry.shot,
    componentId: entry.componentId,
    componentProps: entry.componentProps,
    director: entry.director,
    intent: entry.intent,
    visualPlanEntryId: entry.id,
    resolution: entry.resolution,
    diagnostics: entry.diagnostics,
  }));
  return {
    ...payload,
    captionStartIndex: timing.captionRange?.startIndex ?? entries[0].captionStartIndex,
    captionEndIndex: timing.captionRange?.endIndex ?? entries[entries.length - 1]?.captionEndIndex,
    director: entries[0].director ?? payload.director,
    beats,
    heroTrack: {
      kind,
      captionStartIndex: entries[0].captionStartIndex,
      captionEndIndex: entries[entries.length - 1]?.captionEndIndex ?? entries[0].captionEndIndex,
      states,
    },
    visualPlanEntries: entries,
  };
};

export type CompiledProjectScene = {
  id: string;
  family: ProjectSceneFamily;
  durationInFrames: number;
  seriesDurationInFrames: number;
  captionRange?: ProjectCaptionRange;
  transitionOut: ProjectTransition | false;
  payload: Record<string, unknown>;
  assets: CompiledAsset[];
};

export type CompiledProjectAudioTrack =
  | {kind: 'voice'; asset: CompiledAsset; volume: number}
  | {kind: 'music'; asset: CompiledAsset; volume: number; loop: true};

export type CompiledProject = {
  schemaVersion: 1;
  projectId: string;
  title: string;
  durationInFrames: number;
  fps: 30;
  width: number;
  height: number;
  qualityMode: 'fast' | 'cinematic';
  orientation: 'landscape' | 'portrait';
  captionStyle: 'boxed' | 'editorial';
  showProjectLabel: boolean;
  visualSystem?: VisualSystem;
  scenes: CompiledProjectScene[];
  captions: Caption[];
  audioTracks: CompiledProjectAudioTrack[];
  diagnostics: ProjectDiagnostic[];
};

const compileCaptions = (
  project: VideoProject,
  durationInFrames: number,
  diagnostics: ProjectDiagnostic[],
): Caption[] => {
  const durationMs = durationInFrames / project.render.fps * 1000;
  return project.captions
    .filter((caption) => caption.text.trim().length > 0)
    .sort((a, b) => a.startMs - b.startMs || a.endMs - b.endMs)
    .map((caption, index) => {
      if (caption.endMs <= durationMs) return caption;
      diagnostics.push({
        level: 'warning',
        code: 'caption.end.clamped',
        message: 'Caption end was clamped to the project duration',
        path: `captions[${index}].endMs`,
      });
      return {...caption, endMs: durationMs};
    });
};

const compileAudio = (project: VideoProject, diagnostics: ProjectDiagnostic[]): CompiledProjectAudioTrack[] => {
  const tracks: CompiledProjectAudioTrack[] = [];
  if (project.audio.voiceAssetId) {
    const asset = resolveProjectAsset(project, project.audio.voiceAssetId, 'audio.voiceAssetId', diagnostics, 'audio');
    if (asset) tracks.push({kind: 'voice', asset, volume: 1});
  }
  if (project.audio.musicAssetId) {
    const asset = resolveProjectAsset(project, project.audio.musicAssetId, 'audio.musicAssetId', diagnostics, 'audio');
    if (asset) tracks.push({kind: 'music', asset, volume: 0.12, loop: true});
  }
  if (!tracks.some((track) => track.kind === 'voice')) {
    diagnostics.push({
      level: 'warning',
      code: 'audio.voice.missing',
      message: 'No voice asset was provided; the project will render silently',
      path: 'audio.voiceAssetId',
    });
  }
  return tracks;
};

export const compileProject = (project: VideoProject): CompiledProject => {
  const diagnostics: ProjectDiagnostic[] = [];
  const narrationText = [project.title, ...project.captions.map((caption) => caption.text)].join('\n');
  const orderedCaptions = orderedProjectCaptions(project);
  const sceneTimingPlans = resolveSceneTimingPlans(project, orderedCaptions);
  const durationInFrames = sceneTimingPlans.reduce((total, plan) => total + plan.durationInFrames, 0);
  const isGoldenNarration = (
    project.projectId === GOLDEN_PROJECT_ID
    && REQUIRED_GOLDEN_NARRATION_TERMS.every((term) => narrationText.toLocaleLowerCase().includes(term.toLocaleLowerCase()))
  );
  if (project.projectId === GOLDEN_PROJECT_ID && !isGoldenNarration) {
    throw new ProjectValidationError(
      'VISUAL_CONTRACT_INVALID',
      'projectId',
      `${GOLDEN_PROJECT_ID} is reserved for the WorkBuddy golden sample; changed narration must use a new projectId and regenerated scenes`,
    );
  }
  const scenes = project.scenes.map<CompiledProjectScene>((scene, index) => {
    const parsed = parseProjectScenePayload(scene.family, scene.payload, `scenes[${index}]`);
    const timing = sceneTimingPlans[index];
    const sceneDurationInFrames = timing.durationInFrames;
    let payload = parsed.payload;
    if (parsed.family === 'skill-showcase') {
      const planEntries = visualPlanEntriesForScene(project.visualPlan, scene.id);
      const visualPlanPayload = project.visualPlan
        ? payloadFromVisualPlan(parsed.payload, planEntries, index, sceneDurationInFrames, timing)
        : parsed.payload;
      const beats = Array.isArray(visualPlanPayload.beats) ? visualPlanPayload.beats : [];
      if (beats.length === 0) {
        throw new ProjectValidationError(
          'VISUAL_CONTRACT_INVALID',
          `scenes[${index}].payload.beats`,
          'skill-showcase scene must declare semantic beats',
        );
      }
      if (!isGoldenNarration) {
        const sourceText = typeof visualPlanPayload.sourceText === 'string' ? visualPlanPayload.sourceText : '';
        if (compactMeaningText(sourceText).length < 4) {
          throw new ProjectValidationError(
            'VISUAL_CONTRACT_INVALID',
            `scenes[${index}].payload.sourceText`,
            'changed-script skill-showcase scenes must declare sourceText',
          );
        }
        if (project.captions.length > 0 && !sourceTextIsCoveredByNarration(sourceText, narrationText)) {
          throw new ProjectValidationError(
            'VISUAL_CONTRACT_INVALID',
            `scenes[${index}].payload.sourceText`,
            'sourceText is not covered by current captions; regenerate scene payload after changing voiceover',
          );
        }
      }
      const normalizedBeats = normalizeSkillShowcaseBeats(
        beats,
        index,
        sceneDurationInFrames,
        timing,
        orderedCaptions,
      );
      payload = {
        ...visualPlanPayload,
        visualSystem: visualPlanPayload.visualSystem ?? project.visualSystem,
        captionStartIndex: timing.captionRange?.startIndex ?? visualPlanPayload.captionStartIndex,
        captionEndIndex: timing.captionRange?.endIndex ?? visualPlanPayload.captionEndIndex,
        beats: normalizedBeats,
      };
      const heroTrack = visualPlanPayload.heroTrack as {kind?: unknown; captionStartIndex?: unknown; captionEndIndex?: unknown; states?: unknown};
      if (heroTrack && typeof heroTrack === 'object' && Array.isArray(heroTrack.states)) {
        const heroStates = heroTrack.states as Array<Record<string, unknown>>;
        const sceneCaptionStart = timing.captionRange?.startIndex ?? 0;
        const sceneCaptionEnd = timing.captionRange?.endIndex ?? orderedCaptions.length - 1;
        const heroTrackCaptionStart = typeof heroTrack.captionStartIndex === 'number' ? heroTrack.captionStartIndex : undefined;
        const heroTrackCaptionEnd = typeof heroTrack.captionEndIndex === 'number' ? heroTrack.captionEndIndex : undefined;
        if (heroTrackCaptionStart !== undefined && heroTrackCaptionStart !== sceneCaptionStart) {
          throw new ProjectValidationError(
            'CAPTION_INDEX_MISMATCH',
            `scenes[${index}].payload.heroTrack.captionStartIndex`,
            `heroTrack captionStartIndex must match scene captionStartIndex: expected ${sceneCaptionStart}, received ${heroTrackCaptionStart}`,
          );
        }
        if (heroTrackCaptionEnd !== undefined && heroTrackCaptionEnd !== sceneCaptionEnd) {
          throw new ProjectValidationError(
            'CAPTION_INDEX_MISMATCH',
            `scenes[${index}].payload.heroTrack.captionEndIndex`,
            `heroTrack captionEndIndex must match scene captionEndIndex: expected ${sceneCaptionEnd}, received ${heroTrackCaptionEnd}`,
          );
        }
        heroStates.forEach((heroState, hsIndex) => {
          const hsCaptionStart = heroState.captionStartIndex;
          const hsCaptionEnd = heroState.captionEndIndex;
          if (typeof hsCaptionStart !== 'number' || typeof hsCaptionEnd !== 'number') {
            throw new ProjectValidationError(
              'CAPTION_INDEX_MISSING',
              `scenes[${index}].payload.heroTrack.states[${hsIndex}]`,
              'every heroTrack state must declare captionStartIndex and captionEndIndex',
            );
          }
          if (hsCaptionEnd < hsCaptionStart) {
            throw new ProjectValidationError(
              'CAPTION_INDEX_INVALID',
              `scenes[${index}].payload.heroTrack.states[${hsIndex}].captionEndIndex`,
              'heroTrack state caption range must be ascending',
            );
          }
          if (hsCaptionStart < sceneCaptionStart || hsCaptionEnd > sceneCaptionEnd) {
            throw new ProjectValidationError(
              'CAPTION_INDEX_INVALID',
              `scenes[${index}].payload.heroTrack.states[${hsIndex}]`,
              `heroTrack state caption range [${hsCaptionStart},${hsCaptionEnd}] must stay inside scene caption range [${sceneCaptionStart},${sceneCaptionEnd}]`,
            );
          }
          const hsStartFrame = heroState.startFrame;
          const hsEndFrame = heroState.endFrame;
          if (typeof hsStartFrame !== 'number' || typeof hsEndFrame !== 'number') {
            throw new ProjectValidationError(
              'CAPTION_INDEX_MISSING',
              `scenes[${index}].payload.heroTrack.states[${hsIndex}]`,
              'every heroTrack state must declare startFrame and endFrame',
            );
          }
          const computedStartFrame = Math.max(0, frameForMs(orderedCaptions[hsCaptionStart].startMs) - timing.startFrame);
          const computedEndFrame = Math.min(sceneDurationInFrames, frameForMs(orderedCaptions[hsCaptionEnd].endMs) - timing.startFrame);
          if (Math.abs(hsStartFrame - computedStartFrame) > 1) {
            throw new ProjectValidationError(
              'CAPTION_INDEX_MISMATCH',
              `scenes[${index}].payload.heroTrack.states[${hsIndex}].startFrame`,
              `heroTrack state startFrame must be derived from captions[${hsCaptionStart}].startMs; expected ${computedStartFrame}, received ${hsStartFrame}`,
            );
          }
          if (Math.abs(hsEndFrame - computedEndFrame) > 1) {
            throw new ProjectValidationError(
              'CAPTION_INDEX_MISMATCH',
              `scenes[${index}].payload.heroTrack.states[${hsIndex}].endFrame`,
              `heroTrack state endFrame must be derived from captions[${hsCaptionEnd}].endMs; expected ${computedEndFrame}, received ${hsEndFrame}`,
            );
          }
          const prevHs = heroStates[hsIndex - 1];
          if (prevHs && typeof prevHs.captionEndIndex === 'number' && hsCaptionStart !== prevHs.captionEndIndex + 1) {
            throw new ProjectValidationError(
              'CAPTION_INDEX_INVALID',
              `scenes[${index}].payload.heroTrack.states[${hsIndex}].captionStartIndex`,
              'heroTrack state caption ranges must be continuous; each state must start at previous state captionEndIndex + 1',
            );
          }
        });
        if (heroStates.length > 0) {
          const firstState = heroStates[0];
          const lastState = heroStates[heroStates.length - 1];
          if (firstState.captionStartIndex !== sceneCaptionStart) {
            throw new ProjectValidationError(
              'CAPTION_INDEX_INVALID',
              `scenes[${index}].payload.heroTrack.states[0].captionStartIndex`,
              `first heroTrack state must start at scene captionStartIndex ${sceneCaptionStart}`,
            );
          }
          if (lastState.captionEndIndex !== sceneCaptionEnd) {
            throw new ProjectValidationError(
              'CAPTION_INDEX_INVALID',
              `scenes[${index}].payload.heroTrack.states`,
              `last heroTrack state must end at scene captionEndIndex ${sceneCaptionEnd}`,
            );
          }
        }
      }
      normalizedBeats.forEach((beat, beatIndex) => {
        if (typeof beat !== 'object' || beat === null || !('endFrame' in beat)) return;
        if (typeof beat.endFrame === 'number' && beat.endFrame > sceneDurationInFrames) {
          throw new ProjectValidationError(
            'SCENE_PAYLOAD_INVALID',
            `scenes[${index}].payload.beats[${beatIndex}].endFrame`,
            'beat must end within the scene duration',
          );
        }
      });
    }
    const transitionOut = index === project.scenes.length - 1 ? false : scene.transition;
    if (transitionOut && transitionOut.durationInFrames >= sceneTimingPlans[index + 1].durationInFrames) {
      throw new ProjectValidationError(
        'TRANSITION_INVALID',
        `scenes[${index}].transition.durationInFrames`,
        'transition must be shorter than the following scene',
      );
    }
    if (index === project.scenes.length - 1 && scene.transition !== false) {
      diagnostics.push({
        level: 'info',
        code: 'transition.last.ignored',
        message: 'The last scene transition was ignored',
        path: `scenes[${index}].transition`,
      });
    }
    const assets = scene.assetIds.map((assetId, assetIndex) => (
      resolveProjectAsset(project, assetId, `scenes[${index}].assetIds[${assetIndex}]`, diagnostics)
      ?? missingVisualAsset(assetId)
    ));
    return {
      id: scene.id,
      family: parsed.family,
      durationInFrames: sceneDurationInFrames,
      seriesDurationInFrames: sceneDurationInFrames + (transitionOut ? transitionOut.durationInFrames : 0),
      captionRange: timing.captionRange,
      transitionOut,
      payload,
      assets,
    };
  });

  const transitionSeriesDuration = scenes.reduce((total, scene) => (
    total + scene.seriesDurationInFrames - (scene.transitionOut ? scene.transitionOut.durationInFrames : 0)
  ), 0);
  if (transitionSeriesDuration !== durationInFrames) {
    throw new ProjectValidationError('DURATION_MISMATCH', 'scenes', 'compiled scene duration is inconsistent');
  }

  const orientation = project.render.orientation;

  const width = orientation === 'portrait' ? 1080 : 1920;
  const height = orientation === 'portrait' ? 1920 : 1080;

  return {
    schemaVersion: 1,
    projectId: project.projectId,
    title: project.title,
    durationInFrames,
    fps: project.render.fps,
    width,
    height,
    qualityMode: project.render.qualityMode,
    orientation,
    captionStyle: project.render.captionStyle,
    showProjectLabel: project.render.showProjectLabel,
    visualSystem: project.visualSystem,
    scenes,
    captions: compileCaptions(project, durationInFrames, diagnostics),
    audioTracks: compileAudio(project, diagnostics),
    diagnostics,
  };
};
