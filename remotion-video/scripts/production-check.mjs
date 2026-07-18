#!/usr/bin/env node

import {existsSync} from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const input = process.argv[2];
if (!input) {
  console.error('Usage: npm run production:check -- <production-dir>');
  process.exit(1);
}

const productionDir = path.resolve(process.cwd(), input);
const readJson = async (file) => JSON.parse(await fs.readFile(path.join(productionDir, file), 'utf8'));
const errors = [];
const warnings = [];

const requiredFiles = ['brief.json', 'script-pack.json', 'asset-pack.json', 'sources.md', 'production-log.md'];
for (const file of requiredFiles) {
  if (!existsSync(path.join(productionDir, file))) errors.push(`missing ${file}`);
}

let brief = null;
let script = null;
let assetPack = null;
if (errors.length === 0) {
  brief = await readJson('brief.json');
  script = await readJson('script-pack.json');
  assetPack = await readJson('asset-pack.json');
}

const textLength = (value) => String(value ?? '').replace(/\s+/g, '').length;
const safePublicPath = /^(?!\/)(?!.*(?:^|\/)\.\.(?:\/|$))[A-Za-z0-9._~!$&'()+,;=@%\-/]+$/;

if (brief) {
  if (!brief.productionId) errors.push('brief.productionId is required');
  if (!brief.title) errors.push('brief.title is required');
  if (brief.platform && brief.platform !== 'douyin') console.info(`[info] platform is '${brief.platform}'; only advisory, not enforced at runtime`);
  if (brief.format?.width !== 1920 || brief.format?.height !== 1080 || brief.format?.fps !== 30) {
    errors.push('brief.format must be 1920x1080 / 30fps for v1');
  }
  if (!Array.isArray(brief.viewpointCandidates) || brief.viewpointCandidates.length !== 3) {
    warnings.push('brief.viewpointCandidates should contain exactly 3 options');
  }
  if (!brief.selectedViewpointId) warnings.push('brief.selectedViewpointId is not chosen yet');
}

if (script) {
  if (!script.title) errors.push('script-pack.title is required');
  if (!script.hook) warnings.push('script-pack.hook is empty');
  if (!script.selectedViewpoint) warnings.push('script-pack.selectedViewpoint is empty');
  if (!Array.isArray(script.steps) || script.steps.length < 3) warnings.push('script-pack.steps has fewer than 3 steps; build-project will insert placeholder steps');
  if (textLength(script.spokenScript) > 1200) warnings.push(`script-pack.spokenScript exceeds 1200 chars: ${textLength(script.spokenScript)}; long captions will be split automatically`);
  if (textLength(script.spokenScript) === 0) warnings.push('script-pack.spokenScript is empty; build-project will use section text');
  if (Array.isArray(script.cautions) && script.cautions.length > 4) {
    warnings.push(`script-pack.cautions has ${script.cautions.length} items; build-project only uses the first 4`);
  }
}

if (assetPack) {
  if (!assetPack.publicPathPrefix) errors.push('asset-pack.publicPathPrefix is required');
  for (const asset of Array.isArray(assetPack.assets) ? assetPack.assets : []) {
    if (!asset.id || !asset.kind || !asset.src) errors.push(`asset is incomplete: ${JSON.stringify(asset)}`);
    if (asset.src && !/^https:\/\//i.test(asset.src) && !safePublicPath.test(asset.src)) {
      errors.push(`asset ${asset.id} has unsafe src: ${asset.src}`);
    }
    if (asset.src && !/^https:\/\//i.test(asset.src)) {
      const absolute = path.join(PROJECT_ROOT, 'public', asset.src);
      if (!existsSync(absolute)) {
        const message = `asset ${asset.id} missing at public/${asset.src}`;
        if (asset.required) errors.push(message);
        else warnings.push(message);
      }
    }
  }
}

const result = {
  ok: errors.length === 0,
  productionDir,
  productionId: brief?.productionId ?? null,
  scriptChars: textLength(script?.spokenScript),
  assets: Array.isArray(assetPack?.assets) ? assetPack.assets.length : 0,
  errors,
  warnings,
};

console.log(JSON.stringify(result, null, 2));
if (errors.length > 0) process.exit(1);
