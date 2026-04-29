/**
 * storyboardLoader.node.ts
 * Node.js-only — DO NOT import from Remotion composition files.
 * Contains: loadStep04Shots, loadAndConvert (use fs/promises).
 * The .mts snapshot script imports these via tsx, NOT via webpack.
 */

import {
  normalizeShots,
  shotsToScenes,
  calcTotalFrames,
  hydrateUltimateProjectConfigWithDirectorGrammar,
} from './storyboardLoader.ts';

export {
  shotsToScenes,
  calcTotalFrames,
  hydrateUltimateProjectConfigWithDirectorGrammar,
} from './storyboardLoader.ts';

interface SegmentsMetaItem {
  id: string;
  family: string;
  frames: number;
  dur: number;
  title: string;
  narration: string;
  items?: Array<{label: string; detail: string; accent?: string}>;
  features?: Array<{icon: string; title: string; desc: string}>;
  comparisons?: Array<{label: string; text: string; secondary?: string; accent?: string}>;
  dataPoints?: string[];
  visual?: {description: string; layoutNote: string; props: Record<string, unknown>; [key: string]: unknown};
  [key: string]: unknown;
}

interface Step04Json {
  payload?: {
    meta?: {fps?: number; totalFrames?: number; totalDuration?: number; [key: string]: unknown};
    segments_meta?: SegmentsMetaItem[];
    shots?: Array<Record<string, unknown>>;
    [key: string]: unknown;
  };
  segments_meta?: SegmentsMetaItem[];
  [key: string]: unknown;
}

interface WorkflowPayload {
  result?: {
    payload?: {
      shots?: Array<Record<string, unknown>>;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

/** Load step-04.json and return NormalizedShot[] */
export async function loadStep04Shots(filePath: string) {
  const {readFile} = await import('fs/promises');
  const content = await readFile(filePath, 'utf-8');
  const json = JSON.parse(content) as Step04Json | WorkflowPayload;

  // Extract fps from meta if available
  let fps = 30;
  const meta = (json as Step04Json).payload?.meta;
  if (meta?.fps) {
    fps = meta.fps;
  }

  return normalizeShots(json, fps);
}

/** Load + convert in one call */
export async function loadAndConvert(filePath: string) {
  const shots = await loadStep04Shots(filePath);
  const scenes = shotsToScenes(shots, {directorQA: 'error'});
  const totalFrames = calcTotalFrames(scenes);

  let fps = 30;
  try {
    const {readFile} = await import('fs/promises');
    const content = await readFile(filePath, 'utf-8');
    const json = JSON.parse(content) as Step04Json | WorkflowPayload;
    const meta = (json as Step04Json).payload?.meta;
    if (meta?.fps) {
      fps = meta.fps;
    }
  } catch {
    // Use default
  }

  return {shots, scenes, totalFrames, fps};
}
