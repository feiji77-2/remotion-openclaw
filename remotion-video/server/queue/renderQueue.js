/**
 * BullMQ 渲染队列配置
 * 
 * 注意：需要 Redis 运行在 localhost:6379
 * 启动：redis-server（或 docker run -p 6379:6379 redis）
 */

let _queue;
let _connection;

function getConnection() {
  if (!_connection) {
    const Redis = require('ioredis');
    _connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: null,  // BullMQ requires this
      enableReadyCheck: false,
    });

    _connection.on('error', err => {
      console.error('[Queue] Redis connection error:', err.message);
    });

    _connection.on('connect', () => {
      console.log('[Queue] Connected to Redis');
    });
  }
  return _connection;
}

function getQueue() {
  if (!_queue) {
    _queue = new (require('bullmq').Queue)('video-render', {
      connection: getConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: { count: 100 },  // 保留最近100个完成记录
        removeOnFail: { count: 200 },     // 保留最近200个失败记录
      },
    });

    _queue.on('error', err => {
      console.error('[Queue] Queue error:', err.message);
    });
  }
  return _queue;
}

/**
 * 获取任务实例
 */
async function getJob(jobId) {
  const queue = getQueue();
  return await queue.getJob(jobId);
}

/**
 * 获取队列统计信息
 */
function getQueueStats() {
  // 同步返回估算值，实际精确值需异步查询
  return {
    name: 'video-render',
    redis: process.env.REDIS_URL || 'redis://localhost:6379',
    status: 'connected',
  };
}

/**
 * 监听队列事件（Worker 里调用）
 */
function setupQueueEvents(handler) {
  const queue = getQueue();

  queue.on('active', ({ jobId }) => {
    console.log(`[Queue] ▶ Job ${jobId} started`);
    handler?.('active', jobId);
  });

  queue.on('completed', ({ jobId, returnvalue }) => {
    console.log(`[Queue] ✅ Job ${jobId} completed`);
    handler?.('completed', jobId, returnvalue);
  });

  queue.on('failed', ({ jobId, failedReason }) => {
    console.error(`[Queue] ❌ Job ${jobId} failed: ${failedReason}`);
    handler?.('failed', jobId, failedReason);
  });

  queue.on('progress', ({ jobId, progress }) => {
    handler?.('progress', jobId, progress);
  });

  queue.on('delayed', ({ jobId }) => {
    console.log(`[Queue] ⏸ Job ${jobId} delayed`);
  });

  queue.on('waiting', ({ jobId }) => {
    console.log(`[Queue] ⏳ Job ${jobId} waiting`);
  });
}

module.exports = { getQueue, getConnection, getJob, getQueueStats, setupQueueEvents };
