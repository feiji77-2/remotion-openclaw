process.env.NODE_ENV = 'development';

const { before, after, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  addJob,
  DEFAULT_POLL_INTERVAL_MS,
  JOBS_DIR,
  MAX_POLL_INTERVAL_MS,
  MAX_RETRIES,
  getJob,
  retryJob,
  resolveNextIdlePollDelay,
  startSimpleWorker,
} = require('../queue/fileQueue');

function resetJobsDir() {
  fs.mkdirSync(JOBS_DIR, { recursive: true });
  for (const entry of fs.readdirSync(JOBS_DIR, { withFileTypes: true })) {
    if (entry.isFile() && entry.name.endsWith('.json')) {
      fs.rmSync(path.join(JOBS_DIR, entry.name), { force: true });
    }
  }
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

before(async () => {
  resetJobsDir();
});

after(async () => {
  resetJobsDir();
});

test('retryJob respects MAX_RETRIES', async () => {
  resetJobsDir();

  const jobId = await addJob('test', {});

  // First MAX_RETRIES calls should succeed
  for (let index = 0; index < MAX_RETRIES; index += 1) {
    assert.equal(await retryJob(jobId), true);
  }

  // The next call should return false (exceeded max retries)
  assert.equal(await retryJob(jobId), false);
});

test('retryJob resets job state', async () => {
  resetJobsDir();

  const jobId = await addJob('test', {});
  const jobPath = path.join(JOBS_DIR, `${jobId}.json`);

  // Directly modify job to simulate a running state with progress
  const modified = await getJob(jobId);
  modified.status = 'running';
  modified.progress = 50;
  modified.progressMsg = 'processing';
  modified.startedAt = new Date().toISOString();
  fs.writeFileSync(jobPath, JSON.stringify(modified, null, 2));

  const beforeRetry = await getJob(jobId);
  assert.equal(beforeRetry.status, 'running');
  assert.equal(beforeRetry.progress, 50);

  const result = await retryJob(jobId);
  assert.equal(result, true);

  const afterRetry = await getJob(jobId);
  assert.equal(afterRetry.status, 'pending');
  assert.equal(afterRetry.progress, 0);
  assert.equal(afterRetry.progressMsg, '等待重试');
  assert.equal(afterRetry.error, null);
  assert.equal(afterRetry.retryCount, 1);
  assert.equal(afterRetry.startedAt, null);
  assert.equal(afterRetry.completedAt, null);
});

test('startSimpleWorker processes pending jobs', async () => {
  resetJobsDir();

  const jobId = await addJob('render', { index: 1 });

  const worker = startSimpleWorker({
    async render(job) {
      return { ok: true, jobId: job.id };
    },
  });

  await waitFor(async () => (await getJob(jobId))?.status === 'done');

  await worker.stop();
  const job = await getJob(jobId);
  assert.equal(job.status, 'done');
  assert.deepEqual(job.result, { ok: true, jobId });
});

test('startSimpleWorker calls updateProgress', async () => {
  resetJobsDir();

  const jobId = await addJob('render', { index: 1 });

  let releaseHandler;
  const handlerReleased = new Promise((resolve) => {
    releaseHandler = resolve;
  });

  const worker = startSimpleWorker({
    async render(job, updateProgress) {
      updateProgress(50, 'halfway');
      await handlerReleased;
      return { ok: true };
    },
  });

  await waitFor(async () => (await getJob(jobId))?.status === 'running');
  await waitFor(async () => {
    const job = await getJob(jobId);
    return job && job.progress === 50 && job.progressMsg === 'halfway';
  });

  releaseHandler();
  await waitFor(async () => (await getJob(jobId))?.status === 'done');

  await worker.stop();
  const job = await getJob(jobId);
  assert.equal(job.status, 'done');
  assert.equal(job.progress, 100);
});

test('Worker handles unknown job types', async () => {
  resetJobsDir();

  const jobId = await addJob('nonexistent', {});

  const worker = startSimpleWorker({
    // Only 'render' handler — no 'nonexistent' handler registered
    async render() {
      return { ok: true };
    },
  });

  await waitFor(async () => {
    const job = await getJob(jobId);
    return job && job.status === 'error';
  });

  await worker.stop();
  const job = await getJob(jobId);
  assert.equal(job.status, 'error');
  assert.ok(job.error.includes('No handler registered'));
  assert.ok(job.error.includes('nonexistent'));
});

test('resolveNextIdlePollDelay returns increasing values when called repeatedly', () => {
  let delay = DEFAULT_POLL_INTERVAL_MS;
  const delays = [];

  // 3 iterations stay below MAX_POLL_INTERVAL_MS (1000->1500->2250->3375)
  for (let index = 0; index < 3; index += 1) {
    delay = resolveNextIdlePollDelay(delay);
    delays.push(delay);
  }

  for (let index = 1; index < delays.length; index += 1) {
    assert.ok(
      delays[index] > delays[index - 1],
      `delays[${index}] (${delays[index]}) should be > delays[${index - 1}] (${delays[index - 1]})`,
    );
  }

  // Once at max, it stays at max
  assert.equal(resolveNextIdlePollDelay(MAX_POLL_INTERVAL_MS), MAX_POLL_INTERVAL_MS);
});
