#!/usr/bin/env node

/**
 * export-coefficients.mjs
 *
 * 运行时动态导入 src/render/adaptiveCoefficients.ts 中的函数，
 * 枚举所有 archetype × platform × textLength × duration 组合，输出完整系数数据。
 *
 * 使用方式：
 *   # 推荐（通过 tsx 直接加载 TypeScript）：
 *   npm install -D tsx && node --import tsx scripts/export-coefficients.mjs
 *
 *   # 或先编译 TypeScript：
 *   tsc src/render/adaptiveCoefficients.ts --outDir out/ --moduleResolution bundler --module ESNext --target ES2020
 *   node scripts/export-coefficients.mjs
 *
 * 输出：
 *   out/coefficients-data.json  — 全量系数数据（供手册生成/可视化使用）
 *   out/coefficients-summary.json — Archetype 基线汇总
 *
 * 注意：此脚本依赖 TypeScript 源文件或编译后的 JS 输出。如果未安装 tsx
 * 且未预编译，动态导入将报错并提示构建步骤。
 */

import {writeFileSync, mkdirSync} from 'fs';
import {resolve, dirname} from 'path';
import {fileURLToPath} from 'url';

// ─── 路径 ───────────────────────────────────────────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '..');
const OUT_DIR = resolve(PROJECT_ROOT, 'out');
mkdirSync(OUT_DIR, {recursive: true});

// ─── 12 种 Archetype ────────────────────────────────────────────────────

const ARCHETYPES = [
  'lock-on reveal',
  'pressure countdown',
  'overtake race',
  'evidence pin',
  'threshold breach',
  'aftershock hold',
  'follow focus',
  'compress compare',
  'drift reveal',
  'bullet train',
  'burst spread',
  'trace flow',
];

// ─── 平台枚举 ───────────────────────────────────────────────────────────

const PLATFORMS = ['tiktok', 'web', 'youtube'];

// ─── 内容自适应参数组合 ─────────────────────────────────────────────────
// textLength: 20（短文本，< 30 阈值，不触发长文本适配）
//             50（长文本，> 30 阈值，触发 spacing*0.95, padding*0.95, sizeRatio*1.05）
// duration:   3（中间时长，不触发任何时长适配）
//             10（长时长，> 8 阈值，触发 duration*1.2, bounce*0.8, sizeRatio*0.95）

const TEXT_LENGTHS = [20, 50];
const DURATIONS = [3, 10];

// ─── Runtime import from TypeScript source ──────────────────────────
// Use dynamic import to resolve .ts through tsx/ts-node or transpiled output

const coefficients = await import('../src/render/adaptiveCoefficients.ts')
  .catch(() => import('../../remotion-video/src/render/adaptiveCoefficients.js'))
  .catch(() => {
    throw new Error(
      'Cannot import adaptiveCoefficients. Build it first with: tsc src/render/adaptiveCoefficients.ts --outDir out/\n' +
      'Or install tsx: npm install -D tsx && node --import tsx scripts/export-coefficients.mjs'
    );
  });

const {
  archetypeToAdaptiveBase,
  applyPlatformAdaptation,
  applyContentAdaptation,
  computeAdaptiveIntent,
} = coefficients;

// ─── 组合枚举 ───────────────────────────────────────────────────────────

console.log('📊 导出自适应系数...');

const results = [];

for (const archetype of ARCHETYPES) {
  for (const platform of PLATFORMS) {
    for (const textLength of TEXT_LENGTHS) {
      for (const duration of DURATIONS) {
        const context = {
          familyId: 'export-test',
          textLength,
          wordCount: Math.round(textLength / 5),
          duration,
          platform,
        };

        const baseline = archetypeToAdaptiveBase(archetype);
        const platformAdapted = applyPlatformAdaptation(baseline, platform);
        const finalIntent = computeAdaptiveIntent(archetype, context);

        // 描述哪些自适应规则被触发
        const activeAdaptations = [];
        if (platform !== 'web') {
          activeAdaptations.push(`平台适配 (${platform})`);
        }
        if (textLength > 30) {
          activeAdaptations.push('长文本适配 (textLength > 30)');
        }
        if (duration < 3) {
          activeAdaptations.push('短场景适配 (duration < 3s)');
        }
        if (duration > 8) {
          activeAdaptations.push('长场景适配 (duration > 8s)');
        }
        if (activeAdaptations.length === 0) {
          activeAdaptations.push('无 (仅基线)');
        }

        // 计算各维度相对于基线的变化幅度
        const deltas = {
          density: {
            padding: Number((finalIntent.density.padding - baseline.density.padding).toFixed(4)),
            spacing: Number((finalIntent.density.spacing - baseline.density.spacing).toFixed(4)),
            scale: Number((finalIntent.density.scale - baseline.density.scale).toFixed(4)),
          },
          contrast: {
            sizeRatio: Number((finalIntent.contrast.sizeRatio - baseline.contrast.sizeRatio).toFixed(4)),
            weightRatio: Number((finalIntent.contrast.weightRatio - baseline.contrast.weightRatio).toFixed(4)),
            opacityRatio: Number((finalIntent.contrast.opacityRatio - baseline.contrast.opacityRatio).toFixed(4)),
          },
          energy: {
            duration: Number((finalIntent.energy.duration - baseline.energy.duration).toFixed(4)),
            bounce: Number((finalIntent.energy.bounce - baseline.energy.bounce).toFixed(4)),
            intensity: Number((finalIntent.energy.intensity - baseline.energy.intensity).toFixed(4)),
          },
        };

        results.push({
          archetype,
          platform,
          textLength,
          duration,
          activeAdaptations,
          baseline,
          platformAdapted,
          final: finalIntent,
          deltas,
        });
      }
    }
  }
}

// ─── 输出 JSON ──────────────────────────────────────────────────────────

const outputPath = resolve(OUT_DIR, 'coefficients-data.json');
writeFileSync(outputPath, JSON.stringify(results, null, 2), 'utf-8');
console.log(`✅ 已输出 ${results.length} 组系数组合 → ${outputPath}`);

// ─── 汇总统计 ───────────────────────────────────────────────────────────

const archetypeSummary = ARCHETYPES.map((name) => {
  const baseline = archetypeToAdaptiveBase(name);
  return {
    name,
    density: JSON.stringify(baseline.density),
    contrast: JSON.stringify(baseline.contrast),
    energy: `${baseline.energy.duration.toFixed(2)}s/${baseline.energy.bounce.toFixed(2)}b/${baseline.energy.intensity.toFixed(2)}i`,
    parallax: JSON.stringify(baseline.parallax),
    highlight: `${baseline.highlight.color} (glow: ${baseline.highlight.glowIntensity}, weight: ${baseline.highlight.weight})`,
    entryEvent: `${baseline.entryEvent.type} (stagger: ${baseline.entryEvent.stagger}, dir: ${baseline.entryEvent.direction})`,
  };
});

const summaryPath = resolve(OUT_DIR, 'coefficients-summary.json');
writeFileSync(summaryPath, JSON.stringify(archetypeSummary, null, 2), 'utf-8');
console.log(`✅ 已输出 Archetype 基线汇总 → ${summaryPath}`);
console.log('');
console.log('📋 组合矩阵：');
console.log(`   12 种 Archetype × 3 种 Platform × 2 种文本长度 × 2 种时长 = ${results.length} 组`);
console.log('');
