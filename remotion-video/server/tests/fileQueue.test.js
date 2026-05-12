process.env.NODE_ENV = 'development';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  addJob,
  DEFAULT_POLL_INTERVAL_MS,
  JOBS_DIR,
  MAX_POLL_INTERVAL_MS,
  getJob,
  listJobs,
  resolveNextIdlePollDelay,
  startSimpleWorker,
} = require('../queue/fileQueue');

function resetJobsDir() {
  fs.mkdirSync(JOBS_DIR, {recursive: true});
  for (const entry of fs.readdirSync(JOBS_DIR, {withFileTypes: true})) {
    if (entry.isFile() && entry.name.endsWith('.json')) {
      fs.rmSync(path.join(JOBS_DIR, entry.name), {force: true});
    }
  }
}

function writeJob(id, status, createdAt) {
  fs.writeFileSync(path.join(JOBS_DIR, `${id}.json`), JSON.stringify({
    id,
    type: 'render',
    status,
    progress: 0,
    progressMsg: '',
    result: null,
    error: null,
    createdAt,
    startedAt: null,
    completedAt: null,
  }, null, 2));
}

async function waitFor(check, timeoutMs = 1500) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (await check()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error('Timed out waiting for condition');
}

test('pending jobs are listed in FIFO order for processing', async () => {
  resetJobsDir();

  writeJob('job-newest', 'pending', '2026-04-25T08:00:02.000Z');
  writeJob('job-oldest', 'pending', '2026-04-25T08:00:00.000Z');
  writeJob('job-middle', 'pending', '2026-04-25T08:00:01.000Z');

  const pendingJobs = await listJobs('pending');
  assert.deepEqual(pendingJobs.map((job) => job.id), ['job-oldest', 'job-middle', 'job-newest']);
});

test('idle poll delay backs off and caps at max interval', () => {
  let delay = DEFAULT_POLL_INTERVAL_MS;

  for (let index = 0; index < 8; index += 1) {
    delay = resolveNextIdlePollDelay(delay);
  }

  assert.equal(resolveNextIdlePollDelay(MAX_POLL_INTERVAL_MS), MAX_POLL_INTERVAL_MS);
  assert.ok(delay <= MAX_POLL_INTERVAL_MS);
  assert.ok(delay >= DEFAULT_POLL_INTERVAL_MS);
});

test('graceful stop drains only the active job and leaves later jobs pending', async () => {
  resetJobsDir();

  const started = [];
  let releaseFirstJob;
  const firstJobDone = new Promise((resolve) => {
    releaseFirstJob = resolve;
  });

  const firstJobId = await addJob('render', {index: 1});
  const secondJobId = await addJob('render', {index: 2});

  const worker = startSimpleWorker({
    async render(job) {
      started.push(job.id);
      if (job.id === firstJobId) {
        await firstJobDone;
      }
      return {ok: true, jobId: job.id};
    },
  });

  await waitFor(async () => (await getJob(firstJobId))?.status === 'running');
  const stopPromise = worker.stop({graceful: true, timeoutMs: 1000});
  releaseFirstJob();

  const stopResult = await stopPromise;
  await waitFor(async () => (await getJob(firstJobId))?.status === 'done');

  assert.equal(stopResult.timedOut, false);
  assert.deepEqual(started, [firstJobId]);
  assert.equal((await getJob(secondJobId))?.status, 'pending');
});
