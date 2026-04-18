#!/usr/bin/env node
/**
 * render-for-platform.js — 多平台渲染
 *
 * Node.js 重写，兼容 macOS 默认 Bash 3.2
 * 用法:
 *   node scripts/render-for-platform.js 抖音 [render]   # 渲染抖音版（9:16, 1080x1920）
 *   node scripts/render-for-platform.js B站 [render]    # 渲染B站版（16:9, 1920x1080）
 *   node scripts/render-for-platform.js all             # 渲染所有平台
 *   node scripts/render-for-platform.js 抖音 check      # 检查抖音版输出
 *   node scripts/render-for-platform.js check 抖音      # 同上，兼容旧写法
 *   node scripts/render-for-platform.js list            # 列出所有平台
 */

const { execSync, spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const PROJECT_DIR = path.resolve(__dirname, "..");
const OUT_DIR = path.join(PROJECT_DIR, "out", "platforms");
const MASTER_DIR = path.join(PROJECT_DIR, "out");
const SRC_ENTRY = "src/Root.tsx";
const COMPOSITION = "Video1v4";
const MASTER_VIDEO = path.join(MASTER_DIR, "Video1v4_master.mp4");
const SANDBOX_HINTS = [
  "MachPortRendezvousServer",
  "Permission denied (1100)",
  "Failed to launch the browser process",
  "Sandbox(Signal(6))",
  "current execution environment is blocking Chromium/Chrome startup",
];

// 平台配置（与 platform-adapter.ts 保持同步）
// 原则：master 固定 9:16 (1080x1920)，横屏平台由 ffmpeg 裁剪派生
const PLATFORMS = {
  抖音: {
    width: 1080, height: 1920, ratio: "9:16",
    crf: 20, bitrate: "8000k",
    tag: "竖屏",
    is_master: true,          // ← master 直接复用，无需二次处理
  },
  B站: {
    width: 1920, height: 1080, ratio: "16:9",
    crf: 18, bitrate: "15000k",
    tag: "横屏",
    is_master: false,
  },
  YouTubeShorts: {
    width: 1080, height: 1920, ratio: "9:16",
    crf: 18, bitrate: "10000k",
    tag: "竖屏",
    is_master: true,
  },
  InstagramReels: {
    width: 1080, height: 1920, ratio: "9:16",
    crf: 20, bitrate: "8000k",
    tag: "竖屏",
    is_master: true,
  },
  微信公众号: {
    width: 1920, height: 1080, ratio: "16:9",
    crf: 22, bitrate: "6000k",
    tag: "横屏",
    is_master: false,
  },
};

function log(msg) {
  console.log(`[${new Date().toTimeString().slice(0, 8)}] ${msg}`);
}

function run(cmd, opts = {}) {
  try {
    return execSync(cmd, {
      cwd: PROJECT_DIR,
      encoding: "utf8",
      stdio: "pipe",
      ...opts,
    });
  } catch (e) {
    if (opts.exit !== false) {
      console.error(`❌ Command failed: ${cmd}`);
      process.exit(1);
    }
    return e.stdout || "";
  }
}

function ensureContentManifest() {
  log("🧱 同步内容合同生成产物...");
  run(`${process.execPath} scripts/generate-content-manifest.js`, {
    maxBuffer: 10 * 1024 * 1024,
  });
}

function ensureRenderEnvironment() {
  log("🩺 检查渲染环境...");
  const result = spawnSync(process.execPath, ["scripts/doctor-render-env.mjs"], {
    cwd: PROJECT_DIR,
    encoding: "utf8",
  });

  const stdout = result.stdout || "";
  const stderr = result.stderr || "";
  if (stdout) process.stdout.write(stdout);
  if (stderr) process.stderr.write(stderr);

  if (result.status === 0) {
    return;
  }

  const combined = `${stdout}\n${stderr}`;
  if (SANDBOX_HINTS.some((hint) => combined.includes(hint))) {
    console.error("❌ 当前执行环境无法启动 Chromium，平台渲染已中止。");
    console.error("   请在普通 macOS Terminal 中重试：npm run pipeline:platform -- 抖音");
  }

  process.exit(result.status || 1);
}

// ---- 一次性渲染 master（9:16 竖屏）----
function ensureMasterVideo() {
  if (fs.existsSync(MASTER_VIDEO)) {
    log(`⏭️  Master 视频已存在: ${MASTER_VIDEO}，跳过渲染`);
    return;
  }

  log("▶  渲染 Master (9:16 1080x1920)...");
  ensureContentManifest();
  ensureRenderEnvironment();

  run(
    `npx remotion render "${SRC_ENTRY}" "${COMPOSITION}" "${MASTER_VIDEO}" --concurrency=8 --crf=20 2>&1 | tail -5`,
    { maxBuffer: 50 * 1024 * 1024 }
  );

  if (!fs.existsSync(MASTER_VIDEO)) {
    console.error(`❌ Master 渲染失败: ${MASTER_VIDEO}`);
    process.exit(1);
  }
  const size = fs.statSync(MASTER_VIDEO).st_size / 1024 / 1024;
  log(`✅ Master 完成: ${MASTER_VIDEO} (${size.toFixed(1)}MB)`);
}

// ---- 从 master 派生平台版本（不做二次 Remotion 渲染）----
function derivePlatform(name, cfg) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const outFile = path.join(OUT_DIR, `${name}_Video1v4.mp4`);

  // is_master 平台：直接复用 master（竖屏 master → 竖屏输出）
  if (cfg.is_master) {
    if (fs.existsSync(outFile) && !fs.existsSync(outFile + ".reuse")) {
      // 已有旧版，先删
      fs.unlinkSync(outFile);
    }
    if (!fs.existsSync(outFile)) {
      fs.copyFileSync(MASTER_VIDEO, outFile);
    }
    const size = fs.statSync(outFile).st_size / 1024 / 1024;
    log(`✅ ${name} ← master 复用 (${size.toFixed(1)}MB)`);
    return true;
  }

  // 横屏平台：用 ffmpeg 从 master 裁剪
  log(`▶  派生 ${name}: ${cfg.width}x${cfg.height} (横屏裁剪)`);

  // 9:16(1080x1920) → 16:9(1920x1080): 取中间水平条带
  const crop = `crop=1920:1080:(iw-1920)/2:(ih-1080)/2`;
  const scale = `scale=1920:1080`;

  run(
    `ffmpeg -y -i "${MASTER_VIDEO}" -vf "${crop},${scale}" -c:v libx264 -preset fast -crf ${cfg.crf} -b:v ${cfg.bitrate} -c:a copy "${outFile}" 2>&1 | tail -3`
  );

  if (!fs.existsSync(outFile)) {
    log(`❌ 派生失败: ${name}`);
    return false;
  }
  const size = fs.statSync(outFile).st_size / 1024 / 1024;
  log(`✅ ${name} ← ffmpeg 派生 (${size.toFixed(1)}MB)`);
  return true;
}

function renderAllPlatforms() {
  ensureMasterVideo();

  const names = Object.keys(PLATFORMS);
  let ok = true;

  for (const name of names) {
    const success = derivePlatform(name, PLATFORMS[name]);
    if (!success) {
      ok = false;
    }
  }

  if (!ok) {
    process.exit(1);
  }
  log("🎉 所有平台版本派生完成");
}

function checkPlatform(name, cfg) {
  const outFile = path.join(OUT_DIR, `${name}_Video1v4.mp4`);
  if (!fs.existsSync(outFile)) {
    console.log(`❌ ${name}: 文件不存在`);
    return;
  }

  const info = JSON.parse(
    execSync(
      `ffprobe -v quiet -show_streams -of json "${outFile}"`,
      { encoding: "utf8" }
    )
  );

  const video = info.streams.find((s) => s.codec_type === "video");
  const audio = info.streams.find((s) => s.codec_type === "audio");

  console.log(`\n=== ${name} ===`);
  console.log(`文件: ${outFile}`);
  console.log(`分辨率: ${video?.width}x${video?.height}`);
  console.log(`帧率: ${video?.r_frame_rate}`);
  console.log(`码率: ${video?.bit_rate}`);
  console.log(`编码: ${video?.codec_name}`);
  console.log(`音频: ${audio?.codec_name} ${audio?.sample_rate}Hz`);
  console.log(`时长: ${video?.duration}s`);

  const ratio = video?.width / video?.height;
  const expectedRatio = cfg.width / cfg.height;
  const ratioOk = Math.abs(ratio - expectedRatio) < 0.1;
  console.log(`比例: ${ratio?.toFixed(2)} (期望 ${expectedRatio.toFixed(2)}) — ${ratioOk ? "✅" : "❌"}`);
}

// ---- Main ----
const args = process.argv.slice(2);
const arg0 = args[0];
const arg1 = args[1];

let platform = arg0;
let command = arg1 || "render";

if (arg0 === "check") {
  platform = arg1;
  command = "check";
}

if (!arg0 || arg0 === "list") {
  console.log("可用平台:");
  for (const [name, cfg] of Object.entries(PLATFORMS)) {
    console.log(`  ${name} (${cfg.width}x${cfg.height} ${cfg.ratio} crf=${cfg.crf} bitrate=${cfg.bitrate})`);
  }
  console.log("\n用法:");
  console.log("  node scripts/render-for-platform.js <平台> [render|check]");
  console.log("  node scripts/render-for-platform.js check <平台>");
  console.log("  node scripts/render-for-platform.js all");
  process.exit(0);
}

if (platform === "all") {
  if (command !== "render") {
    console.error(`❌ all 仅支持 render，收到: ${command}`);
    process.exit(1);
  }
  renderAllPlatforms();
  process.exit(0);
}

if (!PLATFORMS[platform]) {
  console.error(`❌ 未知平台: ${platform}`);
  console.log("可用平台:", Object.keys(PLATFORMS).join(", "));
  process.exit(1);
}

const cfg = PLATFORMS[platform];

if (command === "check") {
  checkPlatform(platform, cfg);
} else if (command === "render") {
  ensureMasterVideo();
  derivePlatform(platform, cfg);
} else {
  console.error(`❌ 未知命令: ${command}`);
  process.exit(1);
}
