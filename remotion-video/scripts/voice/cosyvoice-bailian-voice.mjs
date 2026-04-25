#!/usr/bin/env node

import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import dotenv from 'dotenv';

const require = createRequire(import.meta.url);
const {
  resolveCosyVoiceInstruction,
  resolveCosyVoiceModel,
  resolveCosyVoiceVoiceId,
  synthesizeCosyVoiceToFile,
} = require('../../server/voice/cosyvoiceBailianClient');

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
  node scripts/voice/cosyvoice-bailian-voice.mjs synthesize [options]

Options:
  --voice <id>           现成 CosyVoice voice id
  --text <text>          要合成的文案
  --language <code>      语言代码，默认 zh-cn
  --speed <number>       语速，默认读取 WORKFLOW_DEFAULT_VOICE_SPEED，没有则 1.0
  --instruction <text>   指令控制，例如“性格直率，情绪易激动且外露”
  --model <name>         模型，可留空自动从 voice id 推断
  --out <path>           输出 wav 路径
  --help                 显示帮助
`);
}

function parseArgs(argv) {
  const args = {
    command: '',
    voice: '',
    text: '',
    language: 'zh-cn',
    speed: '',
    instruction: '',
    model: '',
    out: '',
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!args.command && !token.startsWith('--')) {
      args.command = token;
      continue;
    }

    switch (token) {
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
      case '--speed':
        args.speed = safeString(argv[index + 1]) || '';
        index += 1;
        break;
      case '--instruction':
        args.instruction = safeString(argv[index + 1]);
        index += 1;
        break;
      case '--model':
        args.model = safeString(argv[index + 1]);
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

  if (args.command !== 'synthesize') {
    throw new Error(`不支持的命令: ${args.command}`);
  }

  const voice = safeString(args.voice) || resolveCosyVoiceVoiceId({}, process.env);
  const model = safeString(args.model) || resolveCosyVoiceModel({voice}, process.env);
  const instruction = safeString(args.instruction) || resolveCosyVoiceInstruction({}, process.env);
  const speed = safeString(args.speed) || safeString(process.env.WORKFLOW_DEFAULT_VOICE_SPEED) || '1.0';
  const text = safeString(args.text) || '这是一条 CosyVoice 百炼音色测试。';
  const outputPath = path.resolve(REMOTION_ROOT, args.out || path.join('out', `${voice || 'cosyvoice'}-preview.wav`));

  await synthesizeCosyVoiceToFile({
    text,
    voice,
    language: args.language,
    outputPath,
    model,
    speed,
    instruction,
    env: process.env,
  });

  process.stdout.write(`${JSON.stringify({voice, model, speed, instruction, outputPath}, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exit(1);
});
