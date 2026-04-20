/**
 * 文件版任务队列（仅限本地开发）
 *
 * 任务状态保存在私有 runtime/jobs/ 目录，不再暴露到 public/。
 */

const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const {JOBS_DIR, ensureDir} = require('../config/runtimePaths');

ensureDir(JOBS_DIR);

// ─── 添加任务 ─────────────────────────────────────────────
function addJob(jobType, data) {
  const jobId = `job_${Date.now()}_${uuidv4().slice(0, 8)}`;
  const job = {
    id: jobId,
    type: jobType,
    data,
    status: 'pending',  // pending | running | done | error
    progress: 0,
    progressMsg: '等待执行',
    result: null,
    error: null,
    createdAt: new Date().toISOString(),
    startedAt: null,
    completedAt: null,
  };

  fs.writeFileSync(getJobPath(jobId), JSON.stringify(job, null, 2));
  console.log(`[FileQueue] Added job ${jobId} (${jobType})`);
  return jobId;
}

// ─── 查询任务 ─────────────────────────────────────────────
function getJob(jobId) {
  const p = getJobPath(jobId);
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function getJobPath(jobId) {
  return path.join(JOBS_DIR, `${jobId}.json`);
}

function removeJob(jobId) {
  const jobPath = getJobPath(jobId);
  if (!fs.existsSync(jobPath)) {
    return false;
  }
  fs.unlinkSync(jobPath);
  return true;
}

// ─── 更新进度 ─────────────────────────────────────────────
function updateProgress(jobId, progress, msg) {
  const job = getJob(jobId);
  if (!job) return;
  job.progress = progress;
  job.progressMsg = msg;
  fs.writeFileSync(getJobPath(jobId), JSON.stringify(job, null, 2));
}

// ─── 完成任务 ─────────────────────────────────────────────
function completeJob(jobId, result) {
  const job = getJob(jobId);
  if (!job) return;
  job.status = 'done';
  job.progress = 100;
  job.progressMsg = '完成';
  job.result = result;
  job.completedAt = new Date().toISOString();
  fs.writeFileSync(getJobPath(jobId), JSON.stringify(job, null, 2));
  console.log(`[FileQueue] Job ${jobId} completed`);
}

// ─── 标记错误 ─────────────────────────────────────────────
function failJob(jobId, error) {
  const job = getJob(jobId);
  if (!job) return;
  job.status = 'error';
  job.error = error;
  job.completedAt = new Date().toISOString();
  fs.writeFileSync(getJobPath(jobId), JSON.stringify(job, null, 2));
  console.error(`[FileQueue] Job ${jobId} failed: ${error}`);
}

function retryJob(jobId) {
  const job = getJob(jobId);
  if (!job) {
    return false;
  }
  job.status = 'pending';
  job.progress = 0;
  job.progressMsg = '等待重试';
  job.result = null;
  job.error = null;
  job.startedAt = null;
  job.completedAt = null;
  fs.writeFileSync(getJobPath(jobId), JSON.stringify(job, null, 2));
  return true;
}

// ─── 列出所有任务 ─────────────────────────────────────────
function listJobs(filterStatus) {
  const files = fs.readdirSync(JOBS_DIR).filter(f => f.endsWith('.json'));
  const jobs = files.map(f => {
    const job = JSON.parse(fs.readFileSync(path.join(JOBS_DIR, f), 'utf8'));
    delete job.data; // 不返回完整数据，节省带宽
    return job;
  });

  if (filterStatus) {
    return jobs.filter(j => j.status === filterStatus);
  }
  return jobs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

// ─── 轮询 worker ─────────────────────────────────────────
/**
 * 简单轮询 worker（适合单进程）
 * 每秒检查一次 pending 任务并执行
 */
function startSimpleWorker(handlers = {}) {
  console.log('[FileQueue] Simple worker started (polling every 1s)');
  let isProcessing = false;

  setInterval(() => {
    if (isProcessing) return;
    const jobs = listJobs('pending');
    if (jobs.length === 0) return;

    const job = jobs[0];
    console.log(`[FileQueue] Processing ${job.id}...`);

    // 标记为运行中
    const fullJob = getJob(job.id);
    fullJob.status = 'running';
    fullJob.startedAt = new Date().toISOString();
    fs.writeFileSync(getJobPath(job.id), JSON.stringify(fullJob, null, 2));
    isProcessing = true;

    // 执行处理函数
    Promise.resolve()
      .then(() => handlers[job.type]?.(fullJob, (pct, msg) => updateProgress(job.id, pct, msg)))
      .then(result => completeJob(job.id, result))
      .catch(err => failJob(job.id, err.message))
      .finally(() => {
        isProcessing = false;
      });
  }, 1000);
}

module.exports = {
  addJob,
  getJob,
  updateProgress,
  completeJob,
  failJob,
  removeJob,
  retryJob,
  listJobs,
  startSimpleWorker,
  JOBS_DIR,
};
