#!/usr/bin/env node
/**
 * render-with-cache.js — 增量渲染缓存引擎
 *
 * Node.js 重写，兼容 macOS 默认 Bash 3.2
 * 原理：
 *   1. 计算组件代码的 MD5 哈希
 *   2. 对比上次渲染的哈希记录
 *   3. 只渲染哈希变化的镜头片段
 *   4. 用 ffmpeg concat 合并所有片段
 *
 * 用法:
 *   node scripts/render-with-cache.js           # 全量渲染（自动检测变更）
 *   node scripts/render-with-cache.js --force  # 强制全量重渲染
 *   node scripts/render-with-cache.js --clear   # 清除缓存
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const SRC_ENTRY = "src/Root.tsx";
const COMPOSITION = "Video1v4";   // ← 统一指向 Video1v4
const OUT_DIR = "out/cached";
const CACHE_DIR = ".render-cache";
const HASH_FILE = path.join(CACHE_DIR, "manifest.json");
const LOG_FILE = path.join(CACHE_DIR, "render.log");

function ensureContentManifest() {
  log("🧱 同步内容合同生成产物...");
  run(`${process.execPath} scripts/generate-content-manifest.js`, {
    maxBuffer: 10 * 1024 * 1024,
  });
}

// 镜头分段（动态从 src/data/segments_meta_v4h.ts 读取）
// 不再手写边界，由数据文件保证一致
function loadShardRangesFromTS() {
  const tsPath = path.join(__dirname, "..", "src", "data", "segments_meta_v4h.ts");
  if (!fs.existsSync(tsPath)) {
    console.warn("⚠️  src/data/segments_meta_v4h.ts 不存在，使用旧分段");
    return null;
  }
  const content = fs.readFileSync(tsPath, "utf8");

  // 提取 TRANSITION_FRAMES
  const tfMatch = content.match(/TRANSITION_FRAMES\s*=\s*(\d+)/);
  const TRANSITION_FRAMES = tfMatch ? parseInt(tfMatch[1]) : 20;

  // 提取 SEGMENTS 数组内容（每行一个 segment）
  const lines = content.split("\n");
  const segments = [];
  let inArray = false;
  for (const line of lines) {
    if (/\bSEGMENTS\s*:\s*SegmentMeta/.test(line)) { inArray = true; continue; }
    if (inArray && line.includes("];")) break;
    if (inArray) {
      const m = line.match(/\{ id:\s*['"](\S+)['"],\s*start:\s*(\d+),\s*frames:\s*(\d+)/);
      if (m) {
        segments.push({
          id: m[1],
          start: parseInt(m[2]),
          frames: parseInt(m[3]),
        });
      }
    }
  }

  if (segments.length === 0) return null;

  // 计算总帧数（含尾部）
  const last = segments[segments.length - 1];
  const totalFrames = last.start + last.frames + TRANSITION_FRAMES;

  // 将连续镜头合并成 ~7 个 shard（每段约 total/7 帧）
  const NUM_SHARDS = 7;
  const framesPerShard = Math.ceil(totalFrames / NUM_SHARDS);
  const ranges = {};
  for (let s = 0; s < NUM_SHARDS; s++) {
    const start = s * framesPerShard;
    const end = Math.min((s + 1) * framesPerShard - 1, totalFrames - 1);
    ranges[`shard${s + 1}`] = `${start}-${end}`;
  }

  console.log(`📋 动态分段: ${segments.length} shots, ${totalFrames} 帧, ${NUM_SHARDS} shards`);
  return ranges;
}

const SHARD_RANGES = loadShardRangesFromTS() || {
  shard1: "0-1023",
  shard2: "1024-2047",
  shard3: "2048-3071",
  shard4: "3072-4095",
  shard5: "4096-5119",
  shard6: "5120-6143",
  shard7: "6144-7168",
};

function log(msg) {
  const ts = new Date().toTimeString().slice(0, 8);
  console.log(`[${ts}] ${msg}`);
}

function run(cmd, opts = {}) {
  try {
    const out = execSync(cmd, {
      cwd: process.cwd(),
      encoding: "utf8",
      stdio: "pipe",
      ...opts,
    });
    return out;
  } catch (e) {
    if (opts.exit !== false) {
      console.error(`❌ Command failed: ${cmd}`);
      process.exit(1);
    }
    return e.stdout || "";
  }
}

function computeFileHash() {
  const files = execSync(
    `find src/components src/compositions src/styles -name "*.tsx" -o -name "*.ts" 2>/dev/null | sort`,
    { encoding: "utf8" }
  )
    .trim()
    .split("\n")
    .filter(Boolean);

  if (files.length === 0) return "empty";

  const hashes = files.map((f) => {
    try {
      const content = fs.readFileSync(f, "utf8");
      return crypto.createHash("md5").update(content).digest("hex");
    } catch {
      return "";
    }
  });

  return crypto.createHash("md5").update(hashes.join("")).digest("hex");
}

function computeDataHash() {
  const files = execSync(
    `find src/data audio-tmp -name "*.json" -o -name "*.ts" 2>/dev/null | sort`,
    { encoding: "utf8" }
  )
    .trim()
    .split("\n")
    .filter(Boolean);

  if (files.length === 0) return "empty";

  const hashes = files.map((f) => {
    try {
      const content = fs.readFileSync(f, "utf8");
      return crypto.createHash("md5").update(content).digest("hex");
    } catch {
      return "";
    }
  });

  return crypto.createHash("md5").update(hashes.join("")).digest("hex");
}

function loadManifest() {
  if (!fs.existsSync(HASH_FILE)) return { last_hash: "", shard_hashes: {} };
  try {
    return JSON.parse(fs.readFileSync(HASH_FILE, "utf8"));
  } catch {
    return { last_hash: "", shard_hashes: {} };
  }
}

function saveManifest(manifest) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  fs.writeFileSync(HASH_FILE, JSON.stringify(manifest, null, 2));
}

function renderShard(shard, range) {
  const out = path.join(OUT_DIR, `${shard}.mp4`);
  fs.mkdirSync(OUT_DIR, { recursive: true });

  log(`▶  渲染 ${shard} (帧 ${range})`);
  run(
    `npx remotion render "${SRC_ENTRY}" "${COMPOSITION}" "${out}" --frames="${range}" --concurrency=8 2>&1 | tail -3`,
    { maxBuffer: 10 * 1024 * 1024 }
  );

  if (!fs.existsSync(out)) {
    log(`❌ ${shard} 渲染失败`);
    return false;
  }
  log(`✅ ${shard} 完成`);
  return true;
}

function concatShards(finalOut) {
  log("🔗 合并所有片段...");

  // 生成 concat 文件（注意：ffmpeg concat demuxer 需要绝对路径或相对路径）
  const concatFile = path.join(OUT_DIR, "concat.txt");
  const lines = Object.keys(SHARD_RANGES).map(
    (s) => `file '${path.join(OUT_DIR, s + ".mp4")}'`
  );
  fs.writeFileSync(concatFile, lines.join("\n"));

  run(
    `ffmpeg -y -f concat -safe 0 -i "${concatFile}" -c copy "${finalOut}" 2>&1 | tail -3`
  );
  log(`✅ 合并完成: ${finalOut}`);
}

// ---- Main ----
const args = process.argv.slice(2);
const force = args.includes("--force");
const clear = args.includes("--clear");

if (clear) {
  log("🗑️  清除缓存...");
  fs.rmSync(OUT_DIR, { recursive: true, force: true });
  fs.rmSync(CACHE_DIR, { recursive: true, force: true });
  console.log("✅ 缓存已清除");
  process.exit(0);
}

log("🚀 增量渲染开始");
fs.mkdirSync(CACHE_DIR, { recursive: true });
ensureContentManifest();

const fileHash = computeFileHash();
const dataHash = computeDataHash();
const currentHash = `${fileHash}-${dataHash}`;

const manifest = loadManifest();
const lastHash = manifest.last_hash || "";

if (currentHash !== lastHash || force) {
  log("📦 代码/数据变更检测到，准备全量渲染");

  if (force) {
    log("⚡ 强制模式：清除所有片段缓存");
    fs.rmSync(OUT_DIR, { recursive: true, force: true });
  }

  let failed = 0;
  for (const [shard, range] of Object.entries(SHARD_RANGES)) {
    if (!renderShard(shard, range)) failed++;
  }

  if (failed > 0) {
    console.error(`❌ ${failed} 个片段渲染失败`);
    process.exit(1);
  }

  const finalOut = path.join(OUT_DIR, "..", "hermes_openclaw_v4.mp4");
  concatShards(finalOut);

  manifest.last_hash = currentHash;
  saveManifest(manifest);

  log(`🎉 渲染完成！输出: ${finalOut}`);
} else {
  log("✨ 代码无变更，尝试复用缓存...");

  const firstShard = path.join(OUT_DIR, "shard1.mp4");
  if (fs.existsSync(firstShard)) {
    const finalOut = path.join(OUT_DIR, "..", "hermes_openclaw_v4.mp4");
    concatShards(finalOut);
    log("✅ 缓存复用完成！");
  } else {
    log("⚠️  无缓存片段，执行全量渲染...");
    for (const [shard, range] of Object.entries(SHARD_RANGES)) {
      if (!renderShard(shard, range)) {
        console.error(`❌ ${shard} 渲染失败`);
        process.exit(1);
      }
    }
    const finalOut = path.join(OUT_DIR, "..", "hermes_openclaw_v4.mp4");
    concatShards(finalOut);
  }
}

// 记录日志
const entry = `[${new Date().toISOString()}] hash=${currentHash}\n`;
fs.appendFileSync(LOG_FILE, entry);
