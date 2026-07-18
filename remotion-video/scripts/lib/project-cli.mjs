import {spawnSync} from 'node:child_process';
import {existsSync} from 'node:fs';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
export const PROJECT_ROOT = path.resolve(SCRIPT_DIR, '../..');

/**
 * 注：资产源的路径格式验证统一在 assetResolver.ts (compileProject 阶段) 完成。
 * 本文件只负责检查本地文件是否存在（CLI 特有职责）。
 * 如果 compileProject 抛出 ASSET_INVALID 错误，其消息会清晰传递出来。
 */

export const readProject = async (inputPath) => {
  const absolutePath = path.resolve(process.cwd(), inputPath);
  const project = JSON.parse(await fs.readFile(absolutePath, 'utf8'));
  return {absolutePath, project};
};

export const takeFlag = (args, name, fallback = null) => {
  const direct = args.find((arg) => arg.startsWith(`${name}=`));
  if (direct) return direct.slice(name.length + 1);
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : fallback;
};

export const stripFlags = (args, flagsWithValues) => {
  const output = [];
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (flagsWithValues.some((flag) => arg.startsWith(`${flag}=`))) continue;
    if (flagsWithValues.includes(arg)) {
      index += 1;
      continue;
    }
    output.push(arg);
  }
  return output;
};

const inspectAssets = (project) => {
  const prepared = structuredClone(project);
  const warnings = [];
  const assets = prepared.assets && typeof prepared.assets === 'object' ? prepared.assets : {};

  for (const [assetId, asset] of Object.entries(assets)) {
    const src = String(asset?.src ?? '');
    // HTTPS 远程资产跳过文件存在性检查
    if (/^https:\/\//i.test(src)) continue;
    // 检查本地文件是否存在
    const absoluteAssetPath = path.join(PROJECT_ROOT, 'public', src);
    if (existsSync(absoluteAssetPath)) continue;
    if (asset?.required) {
      throw new Error(`[ASSET_MISSING] assets.${assetId}.src: required file not found at ${absoluteAssetPath}`);
    }
    delete prepared.assets[assetId];
    warnings.push({assetId, src, message: 'optional asset is missing; scene fallback will be used'});
  }
  const warned = new Set(warnings.map((warning) => warning.assetId));
  for (const scene of Array.isArray(prepared.scenes) ? prepared.scenes : []) {
    for (const assetId of Array.isArray(scene.assetIds) ? scene.assetIds : []) {
      if (prepared.assets?.[assetId] || warned.has(assetId)) continue;
      warned.add(assetId);
      warnings.push({assetId, src: null, message: 'scene references an undeclared asset; scene fallback will be used'});
    }
  }
  return {prepared, warnings};
};

export const withPreparedProject = async (inputPath, callback) => {
  const {absolutePath, project} = await readProject(inputPath);
  const {prepared, warnings} = inspectAssets(project);
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'remotion-project-'));
  const tempPath = path.join(tempDir, 'project.json');
  await fs.writeFile(tempPath, `${JSON.stringify(prepared, null, 2)}\n`, 'utf8');
  try {
    return await callback({absolutePath, project, prepared, warnings, tempPath});
  } finally {
    await fs.rm(tempDir, {recursive: true, force: true});
  }
};

const remotionLaunch = () => {
  const cli = path.join(PROJECT_ROOT, 'node_modules', '@remotion', 'cli', 'remotion-cli.js');
  return existsSync(cli) ? {command: process.execPath, prefix: [cli]} : {command: 'npx', prefix: ['remotion']};
};

export const runRemotion = (args) => {
  const launch = remotionLaunch();
  const result = spawnSync(launch.command, [...launch.prefix, ...args], {
    cwd: PROJECT_ROOT,
    stdio: 'inherit',
    shell: false,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
};

export const printAssetWarnings = (warnings) => {
  for (const warning of warnings) {
    console.warn(`[project] warning asset=${warning.assetId} src=${warning.src}: ${warning.message}`);
  }
};
