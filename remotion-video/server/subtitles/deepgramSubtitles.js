/**
 * Deepgram 字幕生成模块
 * 语音 WAV → SRT 字幕文件
 * 
 * 使用方式：
 *   const { generateSubtitles } = require('./subtitles/deepgramSubtitles');
 *   await generateSubtitles('/path/to/audio.wav', '/path/to/output.srt');
 * 
 * 环境变量：
 *   DEEPGRAM_API_KEY=xxx  （从 deepgram.com 免费获取）
 *   或使用 OPENAI_WHISPER_API_KEY 调用 Whisper
 */

const fs = require('fs');
const path = require('path');
const { Readable } = require('stream');

// ─── Deepgram ─────────────────────────────────────────────
async function generateWithDeepgram(audioPath, outputPath) {
  const { Deepgram } = require('@deepgram/sdk');
  const apiKey = process.env.DEEPGRAM_API_KEY;

  if (!apiKey) {
    throw new Error('DEEPGRAM_API_KEY not set');
  }

  const deepgram = new Deepgram(apiKey);

  // 检查文件格式
  const fileExt = path.extname(audioPath).toLowerCase();
  const mimeTypes = {
    '.wav': 'audio/wav',
    '.mp3': 'audio/mpeg',
    '.m4a': 'audio/m4a',
    '.flac': 'audio/flac',
  };
  const mimetype = mimeTypes[fileExt] || 'audio/wav';

  console.log(`[Deepgram] Transcribing ${audioPath}...`);

  // 发送音频文件
  const audioFile = fs.createReadStream(audioPath);
  const response = await deepgram.transcription.preRecorded({
    file: audioFile,
    mimetype,
    punctuate: true,
    diarize: false,
    paragraph: true,
    smart_format: true,
  });

  const transcript = response.results?.channels?.[0]?.alternatives?.[0];

  if (!transcript?.words || transcript.words.length === 0) {
    throw new Error('No words detected in audio');
  }

  console.log(`[Deepgram] Detected ${transcript.words.length} words`);

  // 生成 SRT
  const srt = wordsToSRT(transcript.words);
  fs.writeFileSync(outputPath, srt);
  console.log(`[Deepgram] SRT saved: ${outputPath}`);

  return outputPath;
}

// ─── OpenAI Whisper ──────────────────────────────────────
async function generateWithWhisper(audioPath, outputPath) {
  const apiKey = process.env.OPENAI_WHISPER_API_KEY || process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error('OPENAI_WHISPER_API_KEY not set');
  }

  if (typeof globalThis.fetch !== 'function') {
    throw new Error('Fetch API is not available in this Node runtime');
  }

  console.log(`[Whisper] Transcribing ${audioPath}...`);

  const form = new FormData();
  form.append('file', new Blob([fs.readFileSync(audioPath)]), path.basename(audioPath));
  form.append('model', 'whisper-1');
  form.append('response_format', 'verbose_json');
  form.append('timestamp_granularities[]', 'word');

  const response = await globalThis.fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}` },
    body: form,
  });

  if (!response.ok) {
    throw new Error(`Whisper API error: ${response.status}`);
  }

  const data = await response.json();
  const words = data.words || [];

  if (words.length === 0) {
    throw new Error('No words detected');
  }

  const srt = wordsToSRT(words);
  fs.writeFileSync(outputPath, srt);
  console.log(`[Whisper] SRT saved: ${outputPath}`);

  return outputPath;
}

// ─── SRT Generator ──────────────────────────────────────
function wordsToSRT(words) {
  let srt = '';
  let subtitleIndex = 1;

  // 合并连续单词成字幕块（每块最多5秒或15个词）
  let currentGroup = [];
  let groupStartWord = null;

  for (const word of words) {
    currentGroup.push(word);

    const startMs = Math.round((word.start || 0) * 1000);
    const endMs = Math.round((word.end || 0) * 1000);
    const durationSec = (word.end || 0) - (word.start || 0);

    // 满足以下任一条件则输出一个字幕块
    const isLast = word === words[words.length - 1];
    const tooLong = durationSec > 5;
    const tooManyWords = currentGroup.length >= 15;

    if (isLast || tooLong || tooManyWords) {
      const blockStart = groupStartWord ? Math.round((groupStartWord.start || 0) * 1000) : startMs;
      const blockEnd = endMs;
      const text = currentGroup.map(w => w.word || w.text || '').join(' ').replace(/\s+/g, ' ').trim();

      if (text) {
        srt += `${subtitleIndex}\n`;
        srt += `${msToSRTTime(blockStart)} --> ${msToSRTTime(blockEnd)}\n`;
        srt += `${text}\n\n`;
        subtitleIndex++;
      }

      currentGroup = [];
      groupStartWord = null;
    } else if (!groupStartWord) {
      groupStartWord = word;
    }
  }

  return srt;
}

function msToSRTTime(ms) {
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const millis = ms % 1000;
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)},${String(millis).padStart(3, '0')}`;
}

function pad(n) {
  return String(n).padStart(2, '0');
}

// ─── Main Export ─────────────────────────────────────────
/**
 * 生成字幕文件（自动选择 Deepgram 或 Whisper）
 * @param {string} audioPath - 输入音频路径（WAV/MP3）
 * @param {string} outputPath - 输出 SRT 路径
 * @returns {Promise<string>} 输出文件路径
 */
async function generateSubtitles(audioPath, outputPath) {
  if (!fs.existsSync(audioPath)) {
    throw new Error(`Audio file not found: ${audioPath}`);
  }

  // 确保输出目录存在
  const outDir = path.dirname(outputPath);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  // 优先 Deepgram（更快更准，支持 word-level timestamps）
  if (process.env.DEEPGRAM_API_KEY) {
    return await generateWithDeepgram(audioPath, outputPath);
  }

  // 回退 Whisper
  if (process.env.OPENAI_WHISPER_API_KEY || process.env.OPENAI_API_KEY) {
    return await generateWithWhisper(audioPath, outputPath);
  }

  throw new Error('No subtitle API key set (need DEEPGRAM_API_KEY or OPENAI_WHISPER_API_KEY)');
}

module.exports = { generateSubtitles, generateWithDeepgram, generateWithWhisper };
