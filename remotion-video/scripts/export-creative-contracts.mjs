import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {getRhythmContract, REGISTRY} from '../src/data/registry.ts';
import {
  CAMERA_INTENT_TO_MOTION,
  DATA_EVENT_CONFIGS,
  resolveFamilyShotContract,
  SHOT_ARCHETYPE_REGISTRY,
} from '../src/data/shotGrammar.ts';

function hashJson(obj) {
  return crypto.createHash('sha256').update(JSON.stringify(obj)).digest('hex').slice(0, 16);
}

function stripGeneratedAt(value) {
  if (Array.isArray(value)) {
    return value.map(stripGeneratedAt);
  }

  if (value && typeof value === 'object') {
    const result = {};
    for (const [key, child] of Object.entries(value)) {
      if (key === 'generatedAt') continue;
      result[key] = stripGeneratedAt(child);
    }
    return result;
  }

  return value;
}

export async function exportCreativeContracts(options = {}) {
  const cwd = options.cwd ?? process.cwd();
  const outDir = path.resolve(cwd, options.outDir ?? 'public/r');
  const generatedAt = new Date().toISOString();

  const payloads = [
    {
      file: 'registry.json',
      data: {
        generatedAt,
        families: Object.values(REGISTRY).map((entry) => ({
          ...entry,
          rhythm: getRhythmContract(entry.family),
        })),
      },
    },
    {
      file: 'shot-archetypes.json',
      data: {
        generatedAt,
        archetypes: Object.values(SHOT_ARCHETYPE_REGISTRY),
      },
    },
    {
      file: 'data-events.json',
      data: {
        generatedAt,
        dataEvents: DATA_EVENT_CONFIGS,
        cameraIntentToMotion: CAMERA_INTENT_TO_MOTION,
      },
    },
    {
      file: 'shot-registry.json',
      data: {
        generatedAt,
        shots: Object.values(REGISTRY).map((entry) => {
          const contract = resolveFamilyShotContract(entry.family);
          return {
            family: entry.family,
            label: entry.label,
            description: entry.description,
            semanticTags: entry.semanticTags,
            requiredFields: entry.requiredFields,
            optionalFields: entry.optionalFields,
            defaultArchetype: contract.archetype,
            defaultCameraIntent: contract.cameraIntent,
            defaultDataEvent: contract.dataEvent,
            defaultEnterFrames: contract.enterFrames,
            defaultEmphasisFrames: contract.emphasisFrames,
            defaultStaggerGap: contract.staggerGap,
            rhythm: getRhythmContract(entry.family),
            memoryObject: contract.memoryObject,
            directorNote: contract.directorNote,
          };
        }),
      },
    },
  ];

  // Check if all cached files exist with matching content — skip if unchanged
  const stablePayloads = payloads.map((payload) => ({
    file: payload.file,
    data: stripGeneratedAt(payload.data),
  }));
  const contentMap = new Map(payloads.map(p => [p.file, `${JSON.stringify(p.data, null, 2)}\n`]));
  const contentHash = hashJson(stablePayloads);
  const hashFile = path.join(outDir, '.contracts-hash');
  let cachedHash = null;
  try { cachedHash = await fs.readFile(hashFile, 'utf8'); } catch { /* no cache */ }

  if (cachedHash === contentHash) {
    return {
      outDir,
      files: payloads.map((payload) => path.join(outDir, payload.file)),
      cached: true,
    };
  }

  await fs.mkdir(outDir, {recursive: true});

  for (const payload of payloads) {
    await fs.writeFile(path.join(outDir, payload.file), contentMap.get(payload.file), 'utf8');
  }
  await fs.writeFile(hashFile, contentHash, 'utf8');

  return {
    outDir,
    files: payloads.map((payload) => path.join(outDir, payload.file)),
    cached: false,
  };
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isMain) {
  const result = await exportCreativeContracts();
  console.log(`[contracts] ${result.cached ? 'cached' : 'exported'} ${result.files.length} files at ${result.outDir}`);
  for (const file of result.files) {
    console.log(`- ${file}`);
  }
}
