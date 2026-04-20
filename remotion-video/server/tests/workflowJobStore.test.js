process.env.NODE_ENV = 'development';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  WORKFLOW_JOBS_DIR,
} = require('../config/runtimePaths');
const {
  createWorkflowJob,
  readWorkflowJob,
  runWorkflowJob,
} = require('../workflow/workflowJobStore');

test('workflow jobs transition from pending to done and persist result', async () => {
  const job = createWorkflowJob({stepId: 1, pipelineState: {}, projectState: {}, shotsState: []});

  await runWorkflowJob(job.jobId, {stepId: 1}, async (input) => ({
    stepId: input.stepId,
    payload: {analysis: {thesis: 'ok'}},
  }));

  const persisted = readWorkflowJob(job.jobId);
  assert.equal(persisted?.status, 'done');
  assert.equal(persisted?.result?.payload?.analysis?.thesis, 'ok');

  fs.rmSync(path.join(WORKFLOW_JOBS_DIR, `${job.jobId}.json`), {force: true});
});
