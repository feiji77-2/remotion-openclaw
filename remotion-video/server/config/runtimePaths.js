const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '../..');
const PUBLIC_DIR = path.join(PROJECT_ROOT, 'public');
const ASSETS_DIR = path.join(PUBLIC_DIR, 'assets');
const OUTPUT_ASSETS_DIR = path.join(ASSETS_DIR, 'outputs');
const VOICE_ASSETS_DIR = path.join(ASSETS_DIR, 'voice');
const SUBTITLE_ASSETS_DIR = path.join(ASSETS_DIR, 'subtitles');
const RUNTIME_DIR = path.join(PROJECT_ROOT, 'runtime');
const JOBS_DIR = path.join(RUNTIME_DIR, 'jobs');
const IMAGE_JOBS_DIR = path.join(JOBS_DIR, 'images');
const WORKFLOW_JOBS_DIR = path.join(JOBS_DIR, 'workflow');

function ensureDir(targetPath) {
  if (!fs.existsSync(targetPath)) {
    fs.mkdirSync(targetPath, {recursive: true});
  }
}

function ensureRuntimePaths() {
  [
    PUBLIC_DIR,
    ASSETS_DIR,
    OUTPUT_ASSETS_DIR,
    VOICE_ASSETS_DIR,
    SUBTITLE_ASSETS_DIR,
    RUNTIME_DIR,
    JOBS_DIR,
    IMAGE_JOBS_DIR,
    WORKFLOW_JOBS_DIR,
  ].forEach(ensureDir);
}

module.exports = {
  PROJECT_ROOT,
  PUBLIC_DIR,
  ASSETS_DIR,
  OUTPUT_ASSETS_DIR,
  VOICE_ASSETS_DIR,
  SUBTITLE_ASSETS_DIR,
  RUNTIME_DIR,
  JOBS_DIR,
  IMAGE_JOBS_DIR,
  WORKFLOW_JOBS_DIR,
  ensureDir,
  ensureRuntimePaths,
};
