#!/usr/bin/env node
/**
 * generate-tts-for-project.mjs
 *
 * 读取 project JSON 中的 captions，拼接全部文字，
 * 调用阿里云百炼 Qwen TTS 生成配音音频（m4a 格式）。
 *
 * Usage:
 *   node scripts/generate-tts-for-project.mjs <project.json> [--voice Cherry] [--out output.m4a]
 */

import path from 'node:path';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');
dotenv.config({path: path.join(PROJECT_ROOT, '.env.local'), override: false, quiet: true});
dotenv.config({path: path.join(PROJECT_ROOT, '.env'), override: false, quiet: true});

const DASHSCOPE_BASE_URL = 'https://dashscope.aliyuncs.com/api/v1';
const API_KEY = process.env.DASHSCOPE_API_KEY || process.env.QWEN_TTS_API_KEY;

function safeString(v) { return String(v || '').trim(); }

function isRemoteSrc(src) {
  return /^https?:\/\//i.test(src);
}

function toPublicStaticSrc(outputPath) {
  const publicDir = path.join(PROJECT_ROOT, 'public');
  const relative = path.relative(publicDir, outputPath);
  if (relative.startsWith('..') || path.isAbsolute(relative)) return '';
  return relative.split(path.sep).join('/');
}

function parseArgs(argv) {
  const args = {input: '', voice: process.env.QWEN_TTS_DEFAULT_VOICE || 'Cherry', out: ''};
  let i = 0;
  while (i < argv.length) {
    if (argv[i] === '--voice') { args.voice = safeString(argv[i + 1]); i += 2; }
    else if (argv[i] === '--out') { args.out = safeString(argv[i + 1]); i += 2; }
    else if (!args.input && !argv[i].startsWith('--')) { args.input = argv[i]; i += 1; }
    else i += 1;
  }
  return args;
}

function getDefaultOutputPath(projectJson) {
  const voiceAssetId = safeString(projectJson?.audio?.voiceAssetId) || 'voiceover';
  const voiceAsset = projectJson?.assets?.[voiceAssetId];
  if (voiceAsset?.kind === 'audio' && voiceAsset?.src && !isRemoteSrc(voiceAsset.src)) {
    return path.join(PROJECT_ROOT, 'public', voiceAsset.src);
  }
  const projectId = safeString(projectJson?.projectId) || 'project';
  return path.join(PROJECT_ROOT, 'public', 'projects', projectId, 'audio', 'voice.m4a');
}

function getProjectDurationSeconds(projectJson) {
  const fps = Number(projectJson?.render?.fps || 30);
  const frames = Array.isArray(projectJson?.scenes)
    ? projectJson.scenes.reduce((sum, scene) => sum + Number(scene?.durationInFrames || 0), 0)
    : 0;
  return frames > 0 && fps > 0 ? frames / fps : 0;
}

function getAudioDurationSeconds(audioPath) {
  const result = spawnSync('ffprobe', [
    '-v', 'error',
    '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1',
    audioPath,
  ], {encoding: 'utf8'});
  if (result.status !== 0) return 0;
  return Number.parseFloat(result.stdout.trim()) || 0;
}

async function synthesizeTts(text, voice = 'Cherry') {
  const response = await fetch(`${DASHSCOPE_BASE_URL}/services/aigc/multimodal-generation/generation`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'qwen3-tts-flash',
      input: {text, voice, language_type: 'Chinese'},
    }),
  });
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`TTS API 请求失败: HTTP ${response.status} ${body}`);
  }
  const json = await response.json();
  const audioUrl = json?.output?.audio?.url;
  if (!audioUrl) throw new Error(`TTS 未返回音频 URL: ${JSON.stringify(json)}`);
  return audioUrl;
}

async function downloadFile(url, outputPath) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`下载音频失败: HTTP ${response.status}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  fs.mkdirSync(path.dirname(outputPath), {recursive: true});
  fs.writeFileSync(outputPath, buffer);
  return buffer.length;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.input || !fs.existsSync(args.input)) {
    console.error('Usage: node scripts/generate-tts-for-project.mjs <project.json> [--voice Cherry] [--out output.m4a]');
    process.exit(1);
  }
  if (!API_KEY) {
    console.error('错误: 请设置 DASHSCOPE_API_KEY 环境变量');
    process.exit(1);
  }

  const projectJson = JSON.parse(fs.readFileSync(args.input, 'utf8'));
  const captions = projectJson.captions || [];
  if (captions.length === 0) {
    console.error('错误: project JSON 中没有 captions');
    process.exit(1);
  }

  // 拼接所有字幕文本
  const fullText = captions.map(c => safeString(c.text).replace(/[。！？；，,.!?;]+$/, '')).filter(Boolean).join('。') + '。';
  const projectDurationSeconds = getProjectDurationSeconds(projectJson);
  const voiceAssetId = safeString(projectJson?.audio?.voiceAssetId) || 'voiceover';
  console.log(`[tts] 字幕段数: ${captions.length}`);
  console.log(`[tts] 总字符数: ${fullText.length}`);
  console.log(`[tts] 语音: ${args.voice}`);
  if (projectDurationSeconds > 0) {
    console.log(`[tts] 项目时长: ${projectDurationSeconds.toFixed(3)}s`);
  }

  // 长文本分段（Qwen TTS 有长度限制）
  const MAX_CHARS = 500;
  const segments = [];
  for (let i = 0; i < fullText.length; i += MAX_CHARS) {
    let end = Math.min(i + MAX_CHARS, fullText.length);
    // 尽量在句号处分割
    if (end < fullText.length) {
      const periodPos = fullText.lastIndexOf('。', end);
      if (periodPos > i + 100) end = periodPos + 1;
    }
    segments.push(fullText.slice(i, end));
  }
  console.log(`[tts] 分段数: ${segments.length}`);

  const outputPath = path.resolve(PROJECT_ROOT, args.out || getDefaultOutputPath(projectJson));
  const tempRoot = path.join(PROJECT_ROOT, 'tmp', 'tts-segments');
  fs.mkdirSync(tempRoot, {recursive: true});
  const tempDir = fs.mkdtempSync(path.join(tempRoot, 'run-'));

  const downloadedFiles = [];
  try {
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      console.log(`[tts] 合成第 ${i + 1}/${segments.length} 段 (${seg.length} 字符)...`);
      const audioUrl = await synthesizeTts(seg, args.voice);
      const segPath = path.join(tempDir, `segment-${String(i).padStart(2, '0')}.wav`);
      const bytes = await downloadFile(audioUrl, segPath);
      downloadedFiles.push(segPath);
      console.log(`[tts]    → 下载完成 (${(bytes / 1024).toFixed(0)} KB)`);
    }

    fs.mkdirSync(path.dirname(outputPath), {recursive: true});
    // 合并所有 wav 段为单个 m4a
    if (downloadedFiles.length === 1) {
      const result = spawnSync('ffmpeg', ['-y', '-i', downloadedFiles[0], '-c:a', 'aac', '-b:a', '192k', outputPath], {
        cwd: PROJECT_ROOT,
        stdio: 'inherit',
      });
      if (result.status !== 0) throw new Error('ffmpeg 转码失败');
    } else {
      console.log('[tts] 合并音频段...');
      const ffmpegArgs = ['-y'];
      for (const f of downloadedFiles) ffmpegArgs.push('-i', f);
      ffmpegArgs.push('-filter_complex', downloadedFiles.map((_, i) => `[${i}:0]`).join('') + `concat=n=${downloadedFiles.length}:v=0:a=1[out]`);
      ffmpegArgs.push('-map', '[out]', '-c:a', 'aac', '-b:a', '192k', outputPath);
      const result = spawnSync('ffmpeg', ffmpegArgs, {cwd: PROJECT_ROOT, stdio: 'inherit'});
      if (result.status !== 0) throw new Error('ffmpeg 合并失败');
    }
  } finally {
    fs.rmSync(tempDir, {recursive: true, force: true});
  }

  const stats = fs.statSync(outputPath);
  const audioDurationSeconds = getAudioDurationSeconds(outputPath);
  console.log(`[tts] ✅ 配音已生成: ${outputPath} (${(stats.size / 1024 / 1024).toFixed(1)} MB)`);
  if (audioDurationSeconds > 0) {
    console.log(`[tts] 音频时长: ${audioDurationSeconds.toFixed(3)}s`);
    if (projectDurationSeconds > 0) {
      const delta = audioDurationSeconds - projectDurationSeconds;
      const absDelta = Math.abs(delta);
      const status = absDelta <= 0.5 ? '匹配' : '不匹配';
      const sign = delta >= 0 ? '+' : '';
      console.log(`[tts] 和项目时间线${status}: ${sign}${delta.toFixed(3)}s`);
    }
  }
  const publicSrc = toPublicStaticSrc(outputPath);
  if (publicSrc) {
    console.log(`[tts] Project JSON 可使用:`);
    console.log(`      "audio": { "voiceAssetId": "${voiceAssetId}" }`);
    console.log(`      "assets": { "${voiceAssetId}": { "kind": "audio", "src": "${publicSrc}", "required": true } }`);
  } else {
    console.warn(`[tts] ⚠️ 输出文件不在 public/ 下，Remotion staticFile() 不能直接引用。`);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
