process.env.NODE_ENV = 'development';
process.env.PIPELINE_API_KEY = 'test-api-key';
process.env.PIPELINE_ADMIN_KEY = 'test-admin-key';
process.env.PIPELINE_READ_RATE_LIMIT = '2';
process.env.PIPELINE_WRITE_RATE_LIMIT = '3';
process.env.PIPELINE_WEBHOOK_HOSTS = 'hooks.example.com';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {startServer, resetServerState} = require('../api/server');
const {JOBS_DIR} = require('../queue/fileQueue');

function buildHeaders(includeAuth = true) {
  return {
    'Content-Type': 'application/json',
    ...(includeAuth ? {'X-API-Key': process.env.PIPELINE_API_KEY} : {}),
  };
}

function buildAdminHeaders(includeAdmin = true) {
  return {
    ...buildHeaders(true),
    ...(includeAdmin ? {'X-Admin-Key': process.env.PIPELINE_ADMIN_KEY} : {}),
  };
}

async function startTestServer() {
  resetServerState();
  return await new Promise((resolve) => {
    const server = startServer(0);
    server.on('listening', () => resolve(server));
  });
}

function resetJobsDir() {
  fs.rmSync(JOBS_DIR, {recursive: true, force: true});
  fs.mkdirSync(JOBS_DIR, {recursive: true});
}

async function requestJson(baseUrl, pathname, {method = 'GET', body, auth = true} = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    method,
    headers: buildHeaders(auth),
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await response.json().catch(() => ({}));
  return {response, json};
}

async function requestAdminJson(baseUrl, pathname, {method = 'GET', body, admin = true} = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    method,
    headers: buildAdminHeaders(admin),
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await response.json().catch(() => ({}));
  return {response, json};
}

test('health remains public while API routes require auth', {concurrency: false}, async () => {
  resetJobsDir();
  const server = await startTestServer();
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const health = await fetch(`${baseUrl}/health`);
    assert.equal(health.status, 200);
    const healthJson = await health.json();
    assert.ok(healthJson?.capabilities?.voice?.engines?.xtts);

    const {response} = await requestJson(baseUrl, '/api/jobs', {auth: false});
    assert.equal(response.status, 401);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('render submission rejects unsafe asset paths and disallowed webhooks', {concurrency: false}, async () => {
  resetJobsDir();
  const server = await startTestServer();
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const unsafePath = await requestJson(baseUrl, '/api/render', {
      method: 'POST',
      body: {
        projectId: 'demo',
        script: 'hello',
        subtitleFile: '/etc/passwd',
      },
    });
    assert.equal(unsafePath.response.status, 400);

    const unsafeWebhook = await requestJson(baseUrl, '/api/render', {
      method: 'POST',
      body: {
        projectId: 'demo',
        script: 'hello',
        webhook: 'https://evil.example.com/hook',
      },
    });
    assert.equal(unsafeWebhook.response.status, 400);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('render submission stores jobs in runtime directory and read requests are rate limited', {concurrency: false}, async () => {
  resetJobsDir();
  const server = await startTestServer();
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const create = await requestJson(baseUrl, '/api/render', {
      method: 'POST',
      body: {
        projectId: 'demo',
        script: 'hello world',
      },
    });
    assert.equal(create.response.status, 200);
    assert.ok(create.json.jobId);

    const jobFile = path.join(JOBS_DIR, `${create.json.jobId}.json`);
    assert.ok(fs.existsSync(jobFile));
    assert.ok(!jobFile.includes(`${path.sep}public${path.sep}`));

    const first = await requestAdminJson(baseUrl, '/api/jobs');
    const second = await requestAdminJson(baseUrl, '/api/jobs');
    const third = await requestAdminJson(baseUrl, '/api/jobs');
    assert.equal(first.response.status, 200);
    assert.equal(second.response.status, 200);
    assert.equal(third.response.status, 429);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('admin routes require admin key and sanitize project asset requests', {concurrency: false}, async () => {
  resetJobsDir();
  const server = await startTestServer();
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const jobsWithoutAdmin = await requestJson(baseUrl, '/api/jobs');
    assert.equal(jobsWithoutAdmin.response.status, 403);

    const assetsWithAdmin = await requestAdminJson(baseUrl, '/api/projects/%2E%2E%2F%2E%2E%2Fetc/assets');
    assert.equal(assetsWithAdmin.response.status, 200);
    assert.deepEqual(assetsWithAdmin.json, {assets: []});
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
