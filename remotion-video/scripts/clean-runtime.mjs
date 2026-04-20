import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, '..');
const runtimeDirs = ['public/assets', 'public/jobs', 'public/voice', 'runtime/jobs'].map((dir) =>
  path.join(projectRoot, dir),
);
const checkOnly = process.argv.includes('--check');

const relativeToProject = (targetPath) => path.relative(projectRoot, targetPath) || '.';

const listUnexpectedEntries = async (dirPath) => {
  try {
    const entries = await fs.readdir(dirPath, {withFileTypes: true});
    return entries
      .filter((entry) => entry.name !== '.gitkeep')
      .map((entry) => entry.name);
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
};

const ensureGitkeep = async (dirPath) => {
  await fs.mkdir(dirPath, {recursive: true});
  const gitkeepPath = path.join(dirPath, '.gitkeep');
  await fs.writeFile(gitkeepPath, '', {flag: 'a'});
};

const cleanRuntimeDir = async (dirPath) => {
  await fs.mkdir(dirPath, {recursive: true});
  const entries = await fs.readdir(dirPath, {withFileTypes: true});
  for (const entry of entries) {
    if (entry.name === '.gitkeep') {
      continue;
    }
    await fs.rm(path.join(dirPath, entry.name), {recursive: true, force: true});
  }
  await ensureGitkeep(dirPath);
};

const verifyRuntimeDir = async (dirPath) => {
  const unexpectedEntries = await listUnexpectedEntries(dirPath);
  if (unexpectedEntries === null) {
    return `${relativeToProject(dirPath)} 缺失`;
  }
  const hasGitkeep = await fs
    .access(path.join(dirPath, '.gitkeep'))
    .then(() => true)
    .catch(() => false);
  if (!hasGitkeep) {
    return `${relativeToProject(dirPath)} 缺少 .gitkeep`;
  }
  if (unexpectedEntries.length > 0) {
    return `${relativeToProject(dirPath)} 存在额外内容: ${unexpectedEntries.join(', ')}`;
  }
  return null;
};

if (checkOnly) {
  const problems = [];
  for (const dirPath of runtimeDirs) {
    const problem = await verifyRuntimeDir(dirPath);
    if (problem) {
      problems.push(problem);
    }
  }
  if (problems.length > 0) {
    console.error('[clean-runtime] runtime 校验失败');
    for (const problem of problems) {
      console.error(`- ${problem}`);
    }
    process.exit(1);
  }
  console.log('[clean-runtime] runtime 目录校验通过');
  process.exit(0);
}

for (const dirPath of runtimeDirs) {
  await cleanRuntimeDir(dirPath);
  console.log(`[clean-runtime] cleaned ${relativeToProject(dirPath)}`);
}
