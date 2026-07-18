/**
 * MultiPlatformComparison.tsx — 全量视觉验证基准
 *
 * 在 1920 × 1080 单帧内并排渲染 3 个 family (evidence-wall / hero / tag-matrix)
 * 在 3 个平台 (tiktok / web / youtube) 下的实际组件效果。
 *
 * 每个单元格展示：
 *   - 实际 family 组件渲染结果（缩放到单元格尺寸）
 *   - archetype 标签
 *   - 当前平台的 sizeRatio / spacing / intensity 系数值
 *
 * 使用 computeAdaptiveIntent 自动计算平台适配后的系数，
 * 通过 directorMeta 注入 family 组件实现视觉差异化。
 */
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {computeAdaptiveIntent} from '../render/adaptiveCoefficients';
import {UltimateHeroPanel} from '../components/ultimate-kit/families/UltimateHeroPanel';
import {UltimateEvidenceWall} from '../components/ultimate-kit/families/UltimateEvidenceWall';
import {UltimateTagMatrix} from '../components/ultimate-kit/families/UltimateTagMatrix';
import type {FamilyContext} from '../types/director';
import type {FamilyDirectorMeta, UltimateSceneGrammar} from '../components/ultimate-kit/types';

const FPS = 30;

const PLATFORMS = ['tiktok', 'web', 'youtube'] as const;
type Platform = (typeof PLATFORMS)[number];

interface FamilyConfig {
  id: string;
  label: string;
  archetype: string;
  Component: React.ComponentType<Record<string, unknown>>;
  data: Record<string, unknown>;
  grammar: UltimateSceneGrammar;
}

// ── Demo data ──────────────────────────────────────────────────────────────

const heroData: Record<string, unknown> = {
  kicker: 'OpenAI / GPT-5.5',
  title: 'GPT-5.5 正式发布',
  subtitle: '不再只是卖 Token',
  badge: 'HERO',
  accent: 'lime',
  tag: 'AI / Breakthrough',
  heroEmoji: '🤖',
  highlightedWord: 'GPT-5.5',
  lines: ['直接交付结果，不是 Token 调用。', '这才是这次发布最值得讲的主叙事。'],
  brandLabel: 'OpenClaw',
};

const evidenceData: Record<string, unknown> = {
  heading: 'Terminal-Bench 基准测试',
  summary: '82.7% — 行业最高分',
  cards: [
    {source: 'Terminal-Bench 2.0', quote: 'GPT-5.5得分82.7%，位列第一', detail: '编码任务基准测试', accent: 'red'},
    {source: '对比模型', quote: 'Claude 3.5得分71.2%', detail: '次优竞争者', accent: 'orange'},
    {source: '测试覆盖', quote: '涵盖多步骤终端操作', detail: '真实工作流场景', accent: 'orange'},
  ],
  accent: 'yellow',
};

const tagData: Record<string, unknown> = {
  heading: 'AI 能力矩阵',
  tabs: ['推理', '编码', 'Agent', '多模态'],
  activeTab: 'Agent',
  items: [
    {label: '任务自主执行', accent: 'cyan'},
    {label: '百万 Token 上下文', accent: 'purple'},
    {label: '工具调用', accent: 'green'},
    {label: '跨系统协同', accent: 'orange'},
    {label: '实时决策', accent: 'red'},
  ],
};

const FAMILIES: FamilyConfig[] = [
  {
    id: 'evidence-wall',
    label: 'evidence-wall',
    archetype: 'evidence pin',
    Component: UltimateEvidenceWall as unknown as React.ComponentType<Record<string, unknown>>,
    data: evidenceData,
    grammar: {archetype: 'evidence pin'},
  },
  {
    id: 'hero',
    label: 'hero',
    archetype: 'drift reveal',
    Component: UltimateHeroPanel as unknown as React.ComponentType<Record<string, unknown>>,
    data: heroData,
    grammar: {archetype: 'drift reveal'},
  },
  {
    id: 'tag-matrix',
    label: 'tag-matrix',
    archetype: 'trace flow',
    Component: UltimateTagMatrix as unknown as React.ComponentType<Record<string, unknown>>,
    data: tagData,
    grammar: {archetype: 'trace flow'},
  },
];

// ── Layout constants ────────────────────────────────────────────────────────
const HEADER_H = 52;
const CELL_W = 1920 / 3; // 640
const CELL_H = (1080 - HEADER_H) / 3; // ~342.67
const SCALE = CELL_H / 1080; // ~0.317

const COLORS = {
  bg: '#0a0c16',
  cellBorder: 'rgba(255,255,255,0.07)',
  borderStrong: 'rgba(255,255,255,0.12)',
  text: '#e8ecf4',
  textSoft: 'rgba(200,212,240,0.55)',
  accent: '#4fc3f7',
  platformAccent: {
    tiktok: '#ffa726',
    web: '#4fc3f7',
    youtube: '#66bb6a',
  } as Record<Platform, string>,
};

// ── Cell header style helper ────────────────────────────────────────────────
const cellLabelStyle = (
  top: number,
  left: number,
  color: string,
  label: string,
  bg: string,
): React.CSSProperties => ({
  position: 'absolute',
  top,
  left,
  zIndex: 20,
  fontSize: 9,
  fontWeight: 700,
  color,
  textTransform: 'uppercase',
  letterSpacing: 1.2,
  background: bg,
  padding: '2px 8px',
  borderRadius: 4,
  lineHeight: '18px',
  whiteSpace: 'nowrap',
  pointerEvents: 'none',
});

// ── Component ──────────────────────────────────────────────────────────────

export const MultiPlatformComparison: React.FC = () => {
  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.bg,
        color: COLORS.text,
        fontFamily: '"SF Pro Display", "PingFang SC", system-ui, sans-serif',
        overflow: 'hidden',
      }}
    >
      {/* ── Header bar ── */}
      <div
        style={{
          height: HEADER_H,
          display: 'flex',
          alignItems: 'center',
          padding: '0 20px',
          borderBottom: `1px solid ${COLORS.borderStrong}`,
          gap: 16,
          flexShrink: 0,
        }}
      >
        <span style={{fontSize: 18, fontWeight: 700, letterSpacing: -0.3, color: COLORS.accent}}>
          Multi-Platform Visual Comparison
        </span>
        <span style={{fontSize: 11, color: COLORS.textSoft}}>
          {FPS}fps / 1920×1080 / archetype × platform adaptive verification
        </span>
      </div>

      {/* ── 3×3 Grid ── */}
      {FAMILIES.map((family, rowIndex) => (
        <div
          key={family.id}
          style={{
            display: 'flex',
            height: CELL_H,
            borderBottom: rowIndex < FAMILIES.length - 1 ? `1px solid ${COLORS.cellBorder}` : 'none',
          }}
        >
          {PLATFORMS.map((platform, colIndex) => {
            // Compute adaptive coefficients for this combination
            const ctx: FamilyContext = {
              familyId: family.id,
              platform,
              textLength: 20,
              wordCount: 4,
              duration: 6,
            };
            const intent = computeAdaptiveIntent(family.archetype, ctx);
            const directorMeta: FamilyDirectorMeta = {
              adaptive: {
                density: intent.density,
                contrast: intent.contrast,
                energy: intent.energy,
              },
              platform,
            };
            const pColor = COLORS.platformAccent[platform];

            return (
              <div
                key={`${family.id}-${platform}`}
                style={{
                  width: CELL_W,
                  height: CELL_H,
                  borderRight: colIndex < PLATFORMS.length - 1 ? `1px solid ${COLORS.cellBorder}` : 'none',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {/* Platform / archetype labels */}
                <div style={cellLabelStyle(4, 6, pColor, platform, `${COLORS.bg}dd`)}>
                  {platform}
                </div>
                <div style={{...cellLabelStyle(4, CELL_W - 130, COLORS.textSoft, family.archetype, `${COLORS.bg}dd`), right: 6, left: 'auto'}}>
                  {family.archetype}
                </div>

                {/* Family row label (first column only) */}
                {colIndex === 0 && (
                  <div
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: 24,
                      zIndex: 20,
                      fontSize: 9,
                      fontWeight: 600,
                      color: COLORS.accent,
                      letterSpacing: 1.4,
                      textTransform: 'uppercase',
                      padding: '3px 6px',
                      writingMode: 'vertical-lr',
                      background: `${COLORS.bg}cc`,
                      borderRadius: '0 4px 4px 0',
                      pointerEvents: 'none',
                    }}
                  >
                    {family.label}
                  </div>
                )}

                {/* Scaled component render */}
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: 1920,
                    height: 1080,
                    transform: `scale(${SCALE})`,
                    transformOrigin: 'top left',
                    pointerEvents: 'none',
                  }}
                >
                  <div style={{position: 'absolute', inset: 0, backgroundColor: COLORS.bg}} />
                  <family.Component
                    {...family.data}
                    grammar={family.grammar}
                    directorMeta={directorMeta}
                  />
                </div>

                {/* Coefficient overlay footer */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    zIndex: 15,
                    display: 'flex',
                    gap: 10,
                    padding: '5px 10px',
                    fontSize: 9,
                    color: COLORS.textSoft,
                    background: 'linear-gradient(transparent, rgba(10,12,22,0.94) 35%)',
                    fontVariantNumeric: 'tabular-nums',
                    pointerEvents: 'none',
                  }}
                >
                  <span>
                    sizeRatio:
                    {' '}
                    <b style={{color: pColor}}>
                      {intent.contrast.sizeRatio.toFixed(3)}
                    </b>
                  </span>
                  <span>
                    spacing:
                    {' '}
                    <b style={{color: pColor}}>
                      {intent.density.spacing.toFixed(3)}
                    </b>
                  </span>
                  <span>
                    intensity:
                    {' '}
                    <b style={{color: pColor}}>
                      {intent.energy.intensity.toFixed(3)}
                    </b>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </AbsoluteFill>
  );
};
