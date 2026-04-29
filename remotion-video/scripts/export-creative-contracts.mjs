import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {getRhythmContract, REGISTRY} from '../src/data/registry.ts';
import {
  CAMERA_INTENT_TO_MOTION,
  DATA_EVENT_CONFIGS,
  resolveFamilyShotContract,
  SHOT_ARCHETYPE_REGISTRY,
} from '../src/data/shotGrammar.ts';

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

  await fs.mkdir(outDir, {recursive: true});

  for (const payload of payloads) {
    await fs.writeFile(
      path.join(outDir, payload.file),
      `${JSON.stringify(payload.data, null, 2)}\n`,
      'utf8',
    );
  }

  return {
    outDir,
    files: payloads.map((payload) => path.join(outDir, payload.file)),
  };
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isMain) {
  const result = await exportCreativeContracts();
  console.log(`[contracts] exported ${result.files.length} files to ${result.outDir}`);
  for (const file of result.files) {
    console.log(`- ${file}`);
  }
}
