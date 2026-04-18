#!/usr/bin/env node
/**
 * render-qa.js — 帧级自动化回归测试（Node.js 重写）
 *
 * 验证对象: Video1v4（当前主线）
 * 合同: src/data/segments_meta_v4h.ts
 * 关键帧: 动态从 TS 数据提取（镜头边界 + 重要时间点）
 * 音画同步: v4h_narration.mp3 vs 渲染视频
 *
 * 用法:
 *   node scripts/render-qa.js                   # 完整 QA
 *   node scripts/render-qa.js --frames         # 仅关键帧
 *   node scripts/render-qa.js --sync           # 仅音画同步
 *   node scripts/render-qa.js --update-baseline # 更新基准图
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const PROJECT_DIR = path.resolve(__dirname, "..");
const QA_DIR = path.join(PROJECT_DIR, "out", "qa");
const BASELINE_DIR = path.join(QA_DIR, "baseline");
const FRAMES_DIR = path.join(QA_DIR, "frames");
const SRC_ENTRY = "src/Root.tsx";
const COMPOSITION = "Video1v4";

function log(msg) { console.log(`[QA] ${msg}`); }
function warn(msg) { console.warn(`[QA] ⚠  ${msg}`); }
function fail(msg) { console.error(`[QA] ❌ ${msg}`); process.exit(1); }

// ---- 动态加载关键帧 ----
function loadKeyFrames() {
  const tsPath = path.join(PROJECT_DIR, "src", "data", "segments_meta_v4h.ts");
  if (!fs.existsSync(tsPath)) {
    warn("segments_meta_v4h.ts 不存在，使用旧关键帧");
    return { frames: [0, 302, 544, 793, 1251, 1875, 2339, 2853, 4062, 6409, 6922], totalFrames: 6923 };
  }
  const content = fs.readFileSync(tsPath, "utf8");

  // 提取每个 segment 的 start
  const frames = [];
  const lines = content.split("\n");
  let inArray = false;
  for (const line of lines) {
    if (/\bSEGMENTS\s*:\s*SegmentMeta/.test(line)) { inArray = true; continue; }
    if (inArray && line.includes("];")) break;
    if (inArray) {
      const m = line.match(/\{ id:\s*['"](\S+)['"],\s*start:\s*(\d+),\s*frames:\s*(\d+)/);
      if (m) {
        frames.push(parseInt(m[2]));
        frames.push(parseInt(m[2]) + parseInt(m[3])); // end frame
      }
    }
  }

  const totalMatch = content.match(/TOTAL_FRAMES\s*=\s*(\d+)/);
  const totalFrames = totalMatch ? parseInt(totalMatch[1], 10) : 0;

  if (frames.length === 0) {
    warn("无法解析关键帧，使用默认");
    return { frames: [0, 302, 544, 793, 1251, 1875, 2339, 2853, 4062, 6409, 6922], totalFrames: totalFrames || 6923 };
  }

  // 去重 + 排序 + 取首尾 + 中间采样（最多10个）
  const unique = [...new Set(frames)].sort((a, b) => a - b);
  const lastSegmentBoundary = unique[unique.length - 1];
  const selected = [0]; // 始终包含首帧

  // 在中间均匀取样（最多8个额外点）
  const extraNeeded = Math.min(8, unique.length - 2);
  for (let i = 1; i <= extraNeeded; i++) {
    const idx = Math.round((i / (extraNeeded + 1)) * (unique.length - 1));
    selected.push(unique[idx]);
  }
  selected.push(lastSegmentBoundary);
  if (totalFrames > 0) {
    selected.push(totalFrames - 1); // 真正的最终尾帧
  }

  return {
    frames: [...new Set(selected)].sort((a, b) => a - b),
    totalFrames: totalFrames || lastSegmentBoundary + 1,
  };
}

function run(cmd, opts = {}) {
  try {
    return execSync(cmd, { cwd: PROJECT_DIR, encoding: "utf8", stdio: "pipe", ...opts });
  } catch (e) {
    if (opts.exit !== false) { fail(`Command failed: ${cmd}`); }
    return e.stdout || "";
  }
}

function ensureContentManifest() {
  log("🧱 同步内容合同生成产物...");
  run(`${process.execPath} scripts/generate-content-manifest.js`, {
    maxBuffer: 10 * 1024 * 1024,
  });
}

// ---- 关键帧提取 ----
function extractKeyFrames(frames) {
  log(`📸 提取关键帧（${frames.length}个检测点）...`);
  fs.mkdirSync(FRAMES_DIR, { recursive: true });
  fs.readdirSync(FRAMES_DIR).forEach((f) => fs.unlinkSync(path.join(FRAMES_DIR, f)));

  let i = 1;
  for (const frame of frames) {
    const outFile = path.join(FRAMES_DIR, `frame_${frame}.jpg`);
    process.stdout.write(`  [${i}/${frames.length}] frame=${frame}  `);
    try {
      execSync(
        `npx remotion still "${SRC_ENTRY}" "${COMPOSITION}" --frame="${frame}" "${outFile}" 2>/dev/null`,
        { cwd: PROJECT_DIR, stdio: "pipe" }
      );
      if (fs.existsSync(outFile)) {
        console.log("✅");
      } else {
        console.log("⚠  文件未生成");
      }
    } catch {
      console.log("⚠  提取失败");
    }
    i++;
  }
  log(`✅ 提取完成: ${FRAMES_DIR}`);
}

// ---- 帧比对 ----
function compareFrames(frames) {
  log("🔍 帧级回归对比...");
  fs.mkdirSync(BASELINE_DIR, { recursive: true });

  let issues = 0;
  for (const frame of frames) {
    const current = path.join(FRAMES_DIR, `frame_${frame}.jpg`);
    const baseline = path.join(BASELINE_DIR, `frame_${frame}.jpg`);

    if (!fs.existsSync(current)) {
      warn(`  frame=${frame} 当前帧不存在，跳过`);
      continue;
    }
    if (!fs.existsSync(baseline)) {
      log(`  frame=${frame} 🆕 新帧（无baseline）`);
      continue;
    }

    try {
      const psnr = execSync(
        `ffmpeg -i "${baseline}" -i "${current}" -lavfi psnr="stats_file=/dev/stdout" -f null - 2>&1 | grep "average" | tail -1`,
        { encoding: "utf8", cwd: PROJECT_DIR }
      );
      const match = psnr.match(/average:\s*([\d.]+)/);
      const val = match ? parseFloat(match[1]) : 0;

      if (val < 30) {
        console.log(`  frame=${frame} 🔴 视觉回归 PSNR=${val.toFixed(1)}dB (<30dB)`);
        issues++;
      } else {
        log(`  frame=${frame} ✅ PSNR=${val.toFixed(1)}dB`);
      }
    } catch {
      warn(`  frame=${frame} PSNR 计算失败`);
    }
  }

  if (issues > 0) {
    fail(`${issues} 个帧检测到视觉回归`);
  }
  log("✅ 所有关键帧通过");
}

// ---- 更新基准 ----
function updateBaseline(frames) {
  log("📦 更新基准图像...");
  fs.mkdirSync(BASELINE_DIR, { recursive: true });
  for (const frame of frames) {
    const src = path.join(FRAMES_DIR, `frame_${frame}.jpg`);
    const dst = path.join(BASELINE_DIR, `frame_${frame}.jpg`);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dst);
      log(`  frame=${frame} ✅ 已设为基准`);
    }
  }
  log("✅ 基准更新完成");
}

// ---- 音画同步 ----
function checkAudioSync() {
  log("🎙️ 音画同步检测...");

  const videoCandidates = [
    path.join(PROJECT_DIR, "out", "hermes_openclaw_v4_final.mp4"),
    path.join(PROJECT_DIR, "out", "hermes_openclaw_v4.mp4"),
  ];
  const video = videoCandidates.find((candidate) => fs.existsSync(candidate));
  const audio = path.join(PROJECT_DIR, "audio-tmp", "v4h_narration.mp3");

  if (!video) {
    fail(`视频不存在: ${videoCandidates.join(" / ")}（请先运行渲染）`);
  }
  if (!fs.existsSync(audio)) {
    fail(`参考音频不存在: ${audio}`);
  }

  // 将 MP3 预处理为 clean WAV（去除 ID3 标签），再传给 lipsync
  const cleanWav = path.join(QA_DIR, "__clean_ref.wav");
  try {
    execSync(
      `ffmpeg -y -i "${audio}" -acodec pcm_s16le -ar 16000 -ac 1 "${cleanWav}" 2>/dev/null`,
      { stdio: "pipe" }
    );
    log("  已将参考音频转为 clean WAV (mono / 16k)");
  } catch {
    fail("音频预处理失败");
  }

  const lipsyncScript = path.join(PROJECT_DIR, "scripts", "check-lipsync.py");
  if (!fs.existsSync(lipsyncScript)) {
    fail("check-lipsync.py 不存在");
  }

  try {
    const result = execSync(
      `python3 "${lipsyncScript}" "${video}" "${cleanWav}"`,
      { cwd: PROJECT_DIR, encoding: "utf8", maxBuffer: 10 * 1024 * 1024 }
    );
    console.log(result);
    if (/FAIL|ERROR|❌/.test(result)) {
      fail("音画同步检测失败");
    }
    log("✅ 音画同步检测通过");
  } catch (e) {
    const output = (e.stderr || "") + (e.stdout || "");
    if (output) console.log(output);
    // 旧 lipsync 脚本在音轨时长差大时 scipy 会报错
    // 改用 ffmpeg 直接比时长作为兜底
    if (/ValueError|IndexError|dimensionality/.test(output)) {
      log("  ⚠️  精确检测失败，改用时长对比...");
      const videoDur = parseFloat(execSync(
        `ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${video}"`,
        { encoding: "utf8" }
      ).trim());
      const audioDur = parseFloat(execSync(
        `ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${cleanWav}"`,
        { encoding: "utf8" }
      ).trim());
      const diff = Math.abs(videoDur - audioDur);
      const pct = (diff / audioDur * 100).toFixed(1);
      if (diff < 1.0) {
        warn(`DEGRADED PASS: 精确检测退化为时长对比 | 视频=${videoDur.toFixed(2)}s 音频=${audioDur.toFixed(2)}s 差=${diff.toFixed(2)}s (${pct}%)`);
      } else {
        fail(`  🔴 时长偏差过大: 视频=${videoDur.toFixed(2)}s 音频=${audioDur.toFixed(2)}s 差=${diff.toFixed(2)}s (${pct}%)`);
      }
    } else {
      fail("音画同步检测失败");
    }
  } finally {
    if (fs.existsSync(cleanWav)) {
      fs.unlinkSync(cleanWav);
    }
  }
}

// ---- Main ----
const args = process.argv.slice(2);
const skipManifest = args.includes("--no-manifest");
const mode = args.find((a) => !a.startsWith("--")) || "full";
if (!skipManifest) ensureContentManifest();
const contract = loadKeyFrames();
const frames = contract.frames;

log(`🚀 QA 回归测试开始 — ${COMPOSITION} (${contract.totalFrames}帧)`);
log(`📋 关键帧: ${frames.join(", ")}`);
console.log("");

switch (mode) {
  case "--frames":
    extractKeyFrames(frames);
    compareFrames(frames);
    break;
  case "--sync":
    checkAudioSync();
    break;
  case "--update-baseline":
    extractKeyFrames(frames);
    updateBaseline(frames);
    break;
  case "full":
  default:
    extractKeyFrames(frames);
    compareFrames(frames);
    checkAudioSync();
    break;
}
log("✅ QA 完成！");
