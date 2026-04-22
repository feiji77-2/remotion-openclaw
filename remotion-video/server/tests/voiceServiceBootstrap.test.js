process.env.NODE_ENV = 'development';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const {pathToFileURL} = require('node:url');

async function loadBootstrapModule() {
  const modulePath = pathToFileURL(
    path.join(__dirname, '..', '..', 'scripts', 'lib', 'voice-service-bootstrap.mjs'),
  ).href;
  return await import(modulePath);
}

test('ensureXttsServiceReady does not spawn when XTTS is already healthy', async () => {
  const {ensureXttsServiceReady} = await loadBootstrapModule();
  let spawned = false;

  const result = await ensureXttsServiceReady({
    fetchImpl: async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        status: 'ok',
        engine: 'xtts',
        device: 'cpu',
      }),
    }),
    spawnImpl: () => {
      spawned = true;
      throw new Error('spawn should not be called');
    },
  });

  assert.equal(result.started, false);
  assert.equal(result.health?.status, 'ok');
  assert.equal(spawned, false);
});

test('ensureXttsServiceReady auto-starts XTTS when the health endpoint is unreachable', async () => {
  const {ensureXttsServiceReady} = await loadBootstrapModule();
  let probeCount = 0;
  let spawnRecord = null;
  let closedFd = null;

  const result = await ensureXttsServiceReady({
    fetchImpl: async () => {
      probeCount += 1;
      if (probeCount === 1) {
        throw new Error('connect ECONNREFUSED 127.0.0.1:18083');
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          status: 'ok',
          engine: 'xtts',
          device: 'cpu',
        }),
      };
    },
    sleepImpl: async () => {},
    spawnImpl: (command, args, options) => {
      spawnRecord = {command, args, options, unrefCalled: false};
      return {
        pid: 43210,
        unref() {
          spawnRecord.unrefCalled = true;
        },
      };
    },
    mkdirImpl: async () => {},
    openLogFdImpl: () => 88,
    closeLogFdImpl: (fd) => {
      closedFd = fd;
    },
  });

  assert.equal(result.started, true);
  assert.equal(result.pid, 43210);
  assert.equal(result.health?.status, 'ok');
  assert.equal(spawnRecord?.command, 'bash');
  assert.match(spawnRecord?.args?.[0] || '', /start-xtts-server\.sh$/);
  assert.equal(spawnRecord?.options?.detached, true);
  assert.equal(spawnRecord?.unrefCalled, true);
  assert.equal(closedFd, 88);
});
