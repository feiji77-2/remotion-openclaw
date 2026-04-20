const fs = require('fs');
const path = require('path');
const {v4: uuidv4} = require('uuid');
const {WORKFLOW_JOBS_DIR, ensureDir} = require('../config/runtimePaths');

ensureDir(WORKFLOW_JOBS_DIR);

function getWorkflowJobPath(jobId) {
  return path.join(WORKFLOW_JOBS_DIR, `${jobId}.json`);
}

function readWorkflowJob(jobId) {
  const jobPath = getWorkflowJobPath(jobId);
  if (!fs.existsSync(jobPath)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(jobPath, 'utf8'));
}

function writeWorkflowJob(job) {
  fs.writeFileSync(getWorkflowJobPath(job.jobId), JSON.stringify(job, null, 2));
  return job;
}

function updateWorkflowJob(jobId, updates) {
  const job = readWorkflowJob(jobId);
  if (!job) {
    return null;
  }
  return writeWorkflowJob({
    ...job,
    ...updates,
  });
}

function createWorkflowJob(input) {
  const jobId = `workflow_${Date.now()}_${uuidv4().slice(0, 8)}`;
  return writeWorkflowJob({
    jobId,
    id: jobId,
    type: 'workflow',
    status: 'pending',
    progress: 0,
    progressMsg: '等待生成工作流步骤',
    createdAt: new Date().toISOString(),
    startedAt: null,
    completedAt: null,
    error: null,
    stepId: input.stepId,
    input,
    result: null,
  });
}

async function runWorkflowJob(jobId, input, generateWorkflowStep) {
  updateWorkflowJob(jobId, {
    status: 'running',
    startedAt: new Date().toISOString(),
    progress: 10,
    progressMsg: '正在生成工作流步骤',
  });

  try {
    const result = await generateWorkflowStep(input);
    updateWorkflowJob(jobId, {
      status: 'done',
      completedAt: new Date().toISOString(),
      progress: 100,
      progressMsg: '工作流步骤生成完成',
      result,
      error: null,
    });
  } catch (error) {
    updateWorkflowJob(jobId, {
      status: 'error',
      completedAt: new Date().toISOString(),
      progress: 100,
      progressMsg: '工作流步骤生成失败',
      error: error.message || String(error),
      result: null,
    });
  }
}

module.exports = {
  createWorkflowJob,
  readWorkflowJob,
  updateWorkflowJob,
  runWorkflowJob,
};
