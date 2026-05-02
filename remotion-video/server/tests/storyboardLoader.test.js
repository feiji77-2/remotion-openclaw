process.env.NODE_ENV = 'development';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const {pathToFileURL} = require('node:url');

const REMOTION_ROOT = path.resolve(__dirname, '../..');

function importModule(relativePath) {
  return import(pathToFileURL(path.join(REMOTION_ROOT, relativePath)).href);
}

test('storyboardLoader preserves explicit shot director contract into scene grammar', async () => {
  const {normalizeShots, shotsToScenes} = await importModule('src/data/storyboardLoader.ts');

  const workflowPayload = {
    result: {
      payload: {
        shots: [
          {
            id: 'shot-01',
            sceneFamily: 'pipeline-flow',
            title: '流程编排',
            narration: '输入进来以后，先拆任务，再调工具，最后回收结果。',
            durationSeconds: 5,
            visual: {
              props: {
                sceneIntent: '让用户理解任务链路如何被串起来',
                storyboardCueZh: '链路逐段推进',
                scriptBlockLabel: '机制拆解',
                type: '流程',
              },
            },
            director: {
              archetype: 'trace flow',
              cameraIntent: 'chase',
              cameraMotion: 'pan-y',
              dataEvent: 'trace-flow',
              enterFrames: 18,
              emphasisFrames: 52,
              staggerGap: 10,
              revealDirection: 'left',
              memoryObject: {
                type: 'line',
                role: '流程主路径',
                enterFrame: 12,
                color: '#00d4ff',
              },
              directorNote: '[explicit] trace flow',
            },
          },
        ],
      },
    },
  };

  const shots = normalizeShots(workflowPayload, 30);
  const scenes = shotsToScenes(shots, {directorQA: 'off'});

  assert.equal(shots[0].director?.cameraMotion, 'pan-y');
  assert.equal(scenes[0].grammar.cameraIntent, 'chase');
  assert.equal(scenes[0].grammar.cameraMotion, 'pan-y');
  assert.equal(scenes[0].grammar.dataEvent, 'trace-flow');
  assert.equal(scenes[0].grammar.enterFrames, 18);
  assert.equal(scenes[0].grammar.staggerGap, 10);
  assert.equal(scenes[0].grammar.revealDirection, 'left');
  assert.equal(scenes[0].grammar.memoryObject.type, 'line');
  assert.equal(scenes[0].grammar.directorNote, '[explicit] trace flow');
});
