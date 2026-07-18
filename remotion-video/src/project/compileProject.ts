import type {Caption} from '@remotion/captions';
import type {CompiledAsset, ProjectDiagnostic} from './assetResolver';
import {missingVisualAsset, resolveProjectAsset} from './assetResolver';
import type {ProjectSceneFamily} from './sceneRegistry';
import {parseProjectScenePayload} from './sceneRegistry';
import type {ProjectTransition, VideoProject} from './projectSchema';
import {ProjectValidationError} from './projectSchema';

export type CompiledProjectScene = {
  id: string;
  family: ProjectSceneFamily;
  durationInFrames: number;
  seriesDurationInFrames: number;
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
  const durationInFrames = project.scenes.reduce((total, scene) => total + scene.durationInFrames, 0);
  const scenes = project.scenes.map<CompiledProjectScene>((scene, index) => {
    const parsed = parseProjectScenePayload(scene.family, scene.payload, `scenes[${index}]`);
    if (parsed.family === 'skill-showcase' && Array.isArray(parsed.payload.beats)) {
      parsed.payload.beats.forEach((beat, beatIndex) => {
        if (typeof beat !== 'object' || beat === null || !('endFrame' in beat)) return;
        if (typeof beat.endFrame === 'number' && beat.endFrame > scene.durationInFrames) {
          throw new ProjectValidationError(
            'SCENE_PAYLOAD_INVALID',
            `scenes[${index}].payload.beats[${beatIndex}].endFrame`,
            'beat must end within the scene duration',
          );
        }
      });
    }
    const transitionOut = index === project.scenes.length - 1 ? false : scene.transition;
    if (transitionOut && transitionOut.durationInFrames >= project.scenes[index + 1].durationInFrames) {
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
      durationInFrames: scene.durationInFrames,
      seriesDurationInFrames: scene.durationInFrames + (transitionOut ? transitionOut.durationInFrames : 0),
      transitionOut,
      payload: parsed.payload,
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
    scenes,
    captions: compileCaptions(project, durationInFrames, diagnostics),
    audioTracks: compileAudio(project, diagnostics),
    diagnostics,
  };
};
