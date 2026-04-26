#!/usr/bin/env node

import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import dotenv from 'dotenv';

const require = createRequire(import.meta.url);
const {
  createQwenClonedVoice,
  deleteQwenClonedVoice,
  ensureQwenCloneVoice,
  listQwenClonedVoices,
  resolveQwenCloneModel,
  resolveQwenTtsDefaultVoice,
  resolveQwenSynthesisModel,
  sanitizeVoiceName,
  synthesizeQwenTtsToFile,
} = require('../../server/voice/qwenTtsClient');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REMOTION_ROOT = path.resolve(__dirname, '..', '..');

dotenv.config({path: path.join(REMOTION_ROOT, '.env.local'), override: false});
dotenv.config({path: path.join(REMOTION_ROOT, '.env'), override: false});

function safeString(value) {
  return String(value || '').trim();
}

function printHelp() {
  process.stdout.write(`Usage:
  node scripts/voice/qwen-tts-voice.mjs <command> [options]

Commands:
  create       创建并保存一个 Qwen 克隆音色
  ensure       若存在则复用，不存在则创建
  list         列出现有克隆音色
  delete       删除指定克隆音色
  synthesize   直接生成一条 wav 预览

Options:
  --file <path>         参考音频路径（create / ensure）
  --name <voice>        希望创建的音色名
  --voice <voice>       现有音色名（delete / synthesize）
  --text <text>         合成文本或参考音频文本
  --language <code>     语言代码，例如 zh-cn / en
  --model <name>        模型，默认读取 QWEN_TTS_MODEL
  --speed <number>      输出语速，默认 1.0
  --out <path>          synthesize 输出 wav 路径
  --help                显示帮助

Examples:
  node scripts/voice/qwen-tts-voice.mjs create --file /path/to/reference.wav --name daman-qwen
  node scripts/voice/qwen-tts-voice.mjs ensure --file /path/ref.wav --name my-qwen-clone
  node scripts/voice/qwen-tts-voice.mjs list
  node scripts/voice/qwen-tts-voice.mjs synthesize --voice daman-qwen --text "这是一条阿里云百炼语音测试" --out out/qwen-tts-preview.wav
`);
}

function parseArgs(argv) {
  const args = {
    command: '',
    file: '',
    name: '',
    voice: '',
    text: '',
    language: 'zh-cn',
    model: '',
    speed: '1.0',
    out: '',
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!args.command && !token.startsWith('--')) {
      args.command = token;
      continue;
    }

    switch (token) {
      case '--file':
        args.file = safeString(argv[index + 1]);
        index += 1;
        break;
      case '--name':
        args.name = safeString(argv[index + 1]);
        index += 1;
        break;
      case '--voice':
        args.voice = safeString(argv[index + 1]);
        index += 1;
        break;
      case '--text':
        args.text = safeString(argv[index + 1]);
        index += 1;
        break;
      case '--language':
        args.language = safeString(argv[index + 1]) || 'zh-cn';
        index += 1;
        break;
      case '--model':
        args.model = safeString(argv[index + 1]);
        index += 1;
        break;
      case '--speed':
        args.speed = safeString(argv[index + 1]) || '1.0';
        index += 1;
        break;
      case '--out':
        args.out = safeString(argv[index + 1]);
        index += 1;
        break;
      case '--help':
      case '-h':
        args.help = true;
        break;
      default:
        break;
    }
  }

  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || !args.command) {
    printHelp();
    process.exit(args.help ? 0 : 1);
  }

  const model = safeString(args.model);

  if (args.command === 'list') {
    const voices = await listQwenClonedVoices({env: process.env});
    process.stdout.write(`${JSON.stringify({model, voices}, null, 2)}\n`);
    return;
  }

  if (args.command === 'create') {
    if (!args.file) {
      throw new Error('create 需要 --file 参考音频路径。');
    }
    const preferredName = sanitizeVoiceName(args.name || path.basename(args.file, path.extname(args.file)));
    const created = await createQwenClonedVoice({
      referenceUrl: args.file,
      preferredName,
      targetModel: model || resolveQwenCloneModel({}, process.env),
      referenceText: args.text,
      referenceLanguage: args.language,
      env: process.env,
    });
    process.stdout.write(`${JSON.stringify({preferredName, ...created}, null, 2)}\n`);
    return;
  }

  if (args.command === 'ensure') {
    if (!args.file) {
      throw new Error('ensure 需要 --file 参考音频路径。');
    }
    const preferredName = sanitizeVoiceName(args.name || path.basename(args.file, path.extname(args.file)));
    const resolved = await ensureQwenCloneVoice({
      referenceUrl: args.file,
      preferredName,
      targetModel: model || resolveQwenCloneModel({}, process.env),
      referenceText: args.text,
      referenceLanguage: args.language,
      env: process.env,
    });
    process.stdout.write(`${JSON.stringify({preferredName, ...resolved}, null, 2)}\n`);
    return;
  }

  if (args.command === 'delete') {
    const voice = safeString(args.voice || args.name);
    if (!voice) {
      throw new Error('delete 需要 --voice。');
    }
    const removed = await deleteQwenClonedVoice({
      voice,
      env: process.env,
    });
    process.stdout.write(`${JSON.stringify({voice, ...removed}, null, 2)}\n`);
    return;
  }

  if (args.command === 'synthesize') {
    const voice = safeString(args.voice || args.name) || resolveQwenTtsDefaultVoice(process.env);
    const text = safeString(args.text) || '这是一条阿里云百炼千问语音测试。';
    const outputPath = path.resolve(REMOTION_ROOT, args.out || path.join('out', `${voice}-preview.wav`));
    const synthesisModel = model || resolveQwenSynthesisModel({voice, env: process.env});
    await synthesizeQwenTtsToFile({
      text,
      voice,
      language: args.language,
      outputPath,
      model: synthesisModel,
      speed: args.speed,
      env: process.env,
    });
    process.stdout.write(`${JSON.stringify({voice, model: synthesisModel, speed: args.speed, outputPath}, null, 2)}\n`);
    return;
  }

  throw new Error(`不支持的命令: ${args.command}`);
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exit(1);
});
