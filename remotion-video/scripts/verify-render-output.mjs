import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {compileUltimateOutline, validateUltimateOutline} from './lib/ultimate-outline-compiler.mjs';
import {
  summarizeUltimateConfig,
  validateUltimateConfig,
} from './lib/ultimate-scene-config.mjs';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, '..');
const args = process.argv.slice(2);

const readFlag = (name) => {
  const index = args.indexOf(name);
  if (index === -1 || index === args.length - 1) {
    return null;
  }

  return args[index + 1];
};

const parseFrameRate = (value) => {
  if (!value) {
    return null;
  }

  const normalized = String(value).trim();
  if (!normalized) {
    return null;
  }

  if (normalized.includes('/')) {
    const [numerator, denominator] = normalized.split('/');
    const top = Number(numerator);
    const bottom = Number(denominator);
    if (Number.isFinite(top) && Number.isFinite(bottom) && bottom > 0) {
      return top / bottom;
    }
    return null;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const readNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const resolveInputConfig = () => {
  const configArg = readFlag('--config');
  const outlineArg = readFlag('--outline');
  const step4Arg = readFlag('--step4');

  if (!configArg && !outlineArg && !step4Arg) {
    console.error('Usage: node scripts/verify-render-output.mjs --config <json-file> --video <output.mp4>');
    console.error('   or: node scripts/verify-render-output.mjs --outline <outline-json> --video <output.mp4>');
    console.error('   or: node scripts/verify-render-output.mjs --step4 <step-04.json> --video <output.mp4>');
    process.exit(1);
  }

  // Step-4 mode: read meta.totalFrames / meta.totalDuration directly
  if (step4Arg) {
    const step4Path = path.resolve(process.cwd(), step4Arg);
    if (!fs.existsSync(step4Path)) {
      console.error(`Step-4 file not found: ${step4Path}`);
      process.exit(1);
    }
    const json = JSON.parse(fs.readFileSync(step4Path, 'utf8'));
    const meta = json?.payload?.meta ?? json?.meta ?? {};
    const expectedFrames = meta.totalFrames ?? 0;
    const expectedDuration = meta.totalDuration ?? 0;
    if (!expectedFrames || !expectedDuration) {
      console.error('[verify] Step-4 meta.totalFrames / meta.totalDuration not found');
      process.exit(1);
    }
    return {
      inputPath: step4Path,
      expectedFrames,
      expectedDurationSeconds: expectedDuration,
      isStep4: true,
    };
  }

  const inputPath = path.resolve(process.cwd(), configArg ?? outlineArg);
  if (!fs.existsSync(inputPath)) {
    console.error(`Input file not found: ${inputPath}`);
    process.exit(1);
  }

  const parsed = JSON.parse(fs.readFileSync(inputPath, 'utf8'));

  if (outlineArg) {
    const outlineErrors = validateUltimateOutline(parsed);
    if (outlineErrors.length > 0) {
      console.error('Outline check failed:');
      for (const error of outlineErrors) {
        console.error(`- ${error}`);
      }
      process.exit(1);
    }
  }

  const config = outlineArg ? compileUltimateOutline(parsed) : parsed;
  const configErrors = validateUltimateConfig(config);
  if (configErrors.length > 0) {
    console.error('Config check failed:');
    for (const error of configErrors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }

  return {
    inputPath,
    config,
    isStep4: false,
  };
};

const canRun = (command, commandArgs = ['-version']) => {
  const result = spawnSync(command, commandArgs, {stdio: 'ignore'});
  return result.status === 0;
};

const resolveBundledFfprobe = () => {
  const remotionNodeModules = path.join(projectRoot, 'node_modules', '@remotion');
  if (!fs.existsSync(remotionNodeModules)) {
    return null;
  }

  const entries = fs.readdirSync(remotionNodeModules, {withFileTypes: true});
  for (const entry of entries) {
    if (!entry.isDirectory() || !entry.name.startsWith('compositor-')) {
      continue;
    }
    const candidate = path.join(remotionNodeModules, entry.name, 'ffprobe');
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
};

const resolveFfprobePath = () => {
  const explicit = String(process.env.FFPROBE_BIN || '').trim();
  if (explicit) {
    if (!fs.existsSync(explicit)) {
      throw new Error(`FFPROBE_BIN does not exist: ${explicit}`);
    }
    return explicit;
  }

  if (canRun('ffprobe')) {
    return 'ffprobe';
  }

  const bundled = resolveBundledFfprobe();
  if (bundled && canRun(bundled)) {
    return bundled;
  }

  throw new Error('Unable to locate ffprobe. Install ffmpeg or use the bundled Remotion compositor package.');
};

const probeVideo = (ffprobePath, videoPath) => {
  const result = spawnSync(ffprobePath, [
    '-v',
    'error',
    '-count_frames',
    '-show_entries',
    'stream=nb_read_frames,avg_frame_rate,r_frame_rate,duration',
    '-show_entries',
    'format=duration',
    '-of',
    'json',
    videoPath,
  ], {
    cwd: projectRoot,
    encoding: 'utf8',
  });

  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || `ffprobe failed with code ${result.status ?? 'unknown'}`);
  }

  const payload = JSON.parse(result.stdout || '{}');
  const stream = Array.isArray(payload.streams) ? payload.streams[0] ?? {} : {};
  const format = payload.format ?? {};
  const fps = parseFrameRate(stream.avg_frame_rate) ?? parseFrameRate(stream.r_frame_rate) ?? 30;
  const durationSeconds = readNumber(stream.duration) ?? readNumber(format.duration);
  const frameCount = readNumber(stream.nb_read_frames)
    ?? (durationSeconds ? Math.round(durationSeconds * fps) : null);

  return {
    fps,
    durationSeconds,
    frameCount,
  };
};

const resolvedConfig = resolveInputConfig();
const videoArg = readFlag('--video');
const resolvedVideoPath = path.resolve(process.cwd(), videoArg ?? 'out/ultimate-scene-demo.mp4');

if (!fs.existsSync(resolvedVideoPath)) {
  console.error(`Rendered video not found: ${resolvedVideoPath}`);
  process.exit(1);
}

const fileSizeBytes = fs.statSync(resolvedVideoPath).size;
if (fileSizeBytes <= 0) {
  console.error(`Rendered video is empty: ${resolvedVideoPath}`);
  process.exit(1);
}

const ffprobePath = resolveFfprobePath();
const metadata = probeVideo(ffprobePath, resolvedVideoPath);

let expectedFrames;
let expectedDurationSeconds;
let frameTolerance;

if (resolvedConfig.isStep4) {
  // Step-4 mode: expected values from resolveInputConfig
  expectedFrames = resolvedConfig.expectedFrames;
  expectedDurationSeconds = resolvedConfig.expectedDurationSeconds;
  frameTolerance = Number(process.env.RELEASE_RENDER_FRAME_TOLERANCE || '2');
} else {
  // Ultimate config mode: derive from config
  const summary = summarizeUltimateConfig(resolvedConfig.config);
  expectedFrames = summary.durationInFrames;
  expectedDurationSeconds = summary.durationInSeconds;
  frameTolerance = Number(process.env.RELEASE_RENDER_FRAME_TOLERANCE || '2');
}

const durationToleranceRatio = Number(process.env.RELEASE_RENDER_DURATION_TOLERANCE_RATIO || '0.02');
const durationToleranceSeconds = Math.max(0.2, expectedDurationSeconds * durationToleranceRatio);

if (!metadata.durationSeconds) {
  console.error('ffprobe did not return a usable duration.');
  process.exit(1);
}

if (!metadata.frameCount) {
  console.error('ffprobe did not return a usable frame count.');
  process.exit(1);
}

const frameDiff = Math.abs(metadata.frameCount - expectedFrames);
const durationDiff = Math.abs(metadata.durationSeconds - expectedDurationSeconds);

if (frameDiff > frameTolerance) {
  console.error(`Frame count mismatch for ${resolvedVideoPath}`);
  console.error(`Expected ${expectedFrames} frames, got ${metadata.frameCount} frames (diff ${frameDiff}).`);
  process.exit(1);
}

if (durationDiff > durationToleranceSeconds) {
  console.error(`Duration mismatch for ${resolvedVideoPath}`);
  console.error(
    `Expected ${expectedDurationSeconds}s, got ${metadata.durationSeconds.toFixed(3)}s `
      + `(diff ${durationDiff.toFixed(3)}s, tolerance ${durationToleranceSeconds.toFixed(3)}s).`,
  );
  process.exit(1);
}

console.log('[verify-render-output] render contract verified');
console.log(`- input: ${resolvedConfig.inputPath}`);
console.log(`- video: ${resolvedVideoPath}`);
console.log(`- expected: ${expectedFrames}f / ${expectedDurationSeconds}s`);
console.log(`- actual: ${metadata.frameCount}f / ${metadata.durationSeconds.toFixed(3)}s @ ${metadata.fps.toFixed(3)} fps`);
