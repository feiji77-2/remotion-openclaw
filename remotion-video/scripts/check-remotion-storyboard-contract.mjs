#!/usr/bin/env node

import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {assertStoryboardArtifacts, assertStoryboardContract} from './lib/storyboard-contract.mjs';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(SCRIPT_DIR, '..');
const artifactMode = process.argv.includes('--artifacts');
const result = assertStoryboardContract({projectRoot: PROJECT_ROOT});
const artifacts = artifactMode
  ? assertStoryboardArtifacts({
      contract: result.contract,
      ids: result.ids,
      outputDir: path.join(PROJECT_ROOT, 'out', 'remotion-storyboard-library'),
    })
  : null;

console.log(JSON.stringify({
  ok: true,
  renderer: result.contract.policies.stillRenderer,
  imageGeneration: result.contract.policies.imageGeneration,
  spec: `${result.contract.composition.width}x${result.contract.composition.height}@${result.contract.composition.fps}`,
  motion: result.motionCount,
  hero: result.heroCount,
  zones: result.contract.zones,
  uniqueStills: artifacts?.uniqueStillCount ?? null,
}, null, 2));
