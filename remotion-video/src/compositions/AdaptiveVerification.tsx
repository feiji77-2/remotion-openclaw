/**
 * AdaptiveVerification.tsx — 自适应系数视觉验证合成
 *
 * 在一个 1920×1080 帧内并排显示所有验证场景的系数值和视觉效果。
 * 用于截图保存作为回归基准。
 */
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {computeAdaptiveIntent} from '../render/adaptiveCoefficients';
import type {FamilyContext} from '../types/director';

const FPS = 30;

const COLORS = {
  bg: '#0a0c16',
  card: 'rgba(14,18,30,0.85)',
  border: 'rgba(255,255,255,0.08)',
  text: '#e8ecf4',
  textSoft: 'rgba(200,212,240,0.6)',
  accent: '#4fc3f7',
  green: '#66bb6a',
  orange: '#ffa726',
  red: '#ef5350',
  purple: '#ab47bc',
};

interface ScenarioCard {
  title: string;
  subtitle: string;
  items: Array<{
    label: string;
    value: string;
    color: string;
    sampleSize: number;
  }>;
}

// ── 场景 1: Archetype × Platform ──
const ARCHETYPE = 'lock-on reveal';
type Platform = 'tiktok' | 'web' | 'youtube';

const SCENARIO_1: ScenarioCard = {
  title: 'Archetype × Platform',
  subtitle: `archetype: "${ARCHETYPE}"`,
  items: (['tiktok', 'web', 'youtube'] as Platform[]).map((platform) => {
    const ctx: FamilyContext = {platform, textLength: 20, duration: 6, familyId: 'evidence-wall', wordCount: 4};
    const intent = computeAdaptiveIntent(ARCHETYPE, ctx);
    const base = 34;
    const adapted = Math.round(base * intent.contrast.sizeRatio);
    return {
      label: platform,
      value: `sizeRatio: ${intent.contrast.sizeRatio.toFixed(3)} → ${adapted}px`,
      color: platform === 'tiktok' ? COLORS.orange : platform === 'youtube' ? COLORS.green : COLORS.accent,
      sampleSize: adapted,
    };
  }),
};

// ── 场景 2: Archetype × Family (不同 archetype 对同一 family 的影响) ──
const ARCHETYPES = ['burst spread', 'lock-on reveal', 'drift reveal'];
const FLAVORS: Array<{name: string; archetype: string}> = [
  {name: 'Burst', archetype: 'burst spread'},
  {name: 'Lock-on', archetype: 'lock-on reveal'},
  {name: 'Drift', archetype: 'drift reveal'},
];

const SCENARIO_2: ScenarioCard = {
  title: 'Archetype × Visual Differentiation',
  subtitle: '不同 archetype 在同平台 (web) 下的字号差异',
  items: FLAVORS.map(({name, archetype}) => {
    const ctx: FamilyContext = {platform: 'web' as const, textLength: 20, duration: 6, familyId: 'evidence-wall', wordCount: 4};
    const intent = computeAdaptiveIntent(archetype, ctx);
    const base = 34;
    const adapted = Math.round(base * intent.contrast.sizeRatio);
    return {
      label: name,
      value: `sizeRatio: ${intent.contrast.sizeRatio.toFixed(3)} → ${adapted}px`,
      color:
        archetype === 'burst spread'
          ? COLORS.accent
          : archetype === 'lock-on reveal'
            ? COLORS.orange
            : COLORS.green,
      sampleSize: adapted,
    };
  }),
};

// ── 场景 3: 文本长度触发 ──
const SCENARIO_3: ScenarioCard = {
  title: 'Content Adaptation — Text Length',
  subtitle: '长文本 (30+字) vs 短文本 对 spacing 的影响',
  items: [20, 35, 50].map((len) => {
    const ctx: FamilyContext = {platform: 'web' as const, textLength: len, duration: 6, familyId: 'evidence-wall', wordCount: Math.ceil(len / 5)};
    const intent = computeAdaptiveIntent('drift reveal', ctx);
    const baseGap = 22;
    const adaptedGap = Math.round(baseGap * intent.density.spacing);
    return {
      label: `${len} chars`,
      value: `spacing: ${intent.density.spacing.toFixed(3)} → ${adaptedGap}px`,
      color: len > 30 ? COLORS.orange : COLORS.green,
      sampleSize: Math.round(28 * intent.contrast.sizeRatio),
    };
  }),
};

// ── 场景 4: 时长触发 ──
const SCENARIO_4: ScenarioCard = {
  title: 'Content Adaptation — Duration',
  subtitle: '3s / 8s / 12s 场景对 energy 和 sizeRatio 的连锁影响',
  items: [3, 8, 12].map((dur) => {
    const ctx: FamilyContext = {platform: 'web' as const, textLength: 20, duration: dur, familyId: 'evidence-wall', wordCount: 4};
    const intent = computeAdaptiveIntent('threshold breach', ctx);
    const base = 42;
    const adapted = Math.round(base * intent.contrast.sizeRatio);
    return {
      label: `${dur}s`,
      value: `sizeRatio: ${intent.contrast.sizeRatio.toFixed(3)} → ${adapted}px`,
      color: dur < 4 ? COLORS.red : dur > 10 ? COLORS.green : COLORS.orange,
      sampleSize: adapted,
    };
  }),
};

const ALL_SCENARIOS = [SCENARIO_1, SCENARIO_2, SCENARIO_3, SCENARIO_4];

// ── 渲染 ──

const cardStyle: React.CSSProperties = {
  background: COLORS.card,
  borderRadius: 16,
  border: `1px solid ${COLORS.border}`,
  padding: '20px 24px',
  display: 'flex',
  flexDirection: 'column',
  gap: 14,
};

const tileStyle = (color: string): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: 16,
  padding: '12px 16px',
  borderRadius: 12,
  background: 'rgba(255,255,255,0.03)',
  borderLeft: `3px solid ${color}`,
});

export const AdaptiveVerification: React.FC = () => {
  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.bg,
        color: COLORS.text,
        fontFamily: '"SF Pro Display", "PingFang SC", system-ui, sans-serif',
        padding: '32px 48px',
        display: 'flex',
        flexDirection: 'column',
        gap: 24,
      }}
    >
      {/* Header */}
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: `1px solid ${COLORS.border}`, paddingBottom: 16}}>
        <div>
          <div style={{fontSize: 28, fontWeight: 700, letterSpacing: -0.5}}>Adaptive Coefficient Verification</div>
          <div style={{fontSize: 15, color: COLORS.textSoft, marginTop: 4}}>Baseline capture · {new Date().toISOString().slice(0, 10)}</div>
        </div>
        <div style={{fontSize: 13, color: COLORS.textSoft}}>FPS: {FPS} · 1920×1080</div>
      </div>

      {/* Scenario Grid */}
      <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, flex: 1}}>
        {ALL_SCENARIOS.map((scenario) => (
          <div key={scenario.title} style={cardStyle}>
            <div>
              <div style={{fontSize: 16, fontWeight: 600, color: COLORS.accent}}>{scenario.title}</div>
              <div style={{fontSize: 12, color: COLORS.textSoft, marginTop: 2}}>{scenario.subtitle}</div>
            </div>
            <div style={{display: 'flex', flexDirection: 'column', gap: 10}}>
              {scenario.items.map((item) => (
                <div key={item.label} style={tileStyle(item.color)}>
                  <div
                    style={{
                      minWidth: 72,
                      fontSize: 12,
                      fontWeight: 700,
                      color: item.color,
                      textTransform: 'uppercase',
                      letterSpacing: 1.2,
                    }}
                  >
                    {item.label}
                  </div>
                  <div
                    style={{
                      fontSize: item.sampleSize,
                      fontWeight: 800,
                      lineHeight: 1.1,
                      color: COLORS.text,
                      minWidth: 60,
                      textAlign: 'right',
                    }}
                  >
                    Aa
                  </div>
                  <div style={{flex: 1, fontSize: 11, color: COLORS.textSoft}}>{item.value}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Footer — detailed coefficient table */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 16,
          borderTop: `1px solid ${COLORS.border}`,
          paddingTop: 14,
          fontSize: 11,
          color: COLORS.textSoft,
        }}
      >
        {(['tiktok', 'web', 'youtube'] as Platform[]).map((platform) => {
          const ctx: FamilyContext = {platform, textLength: 20, duration: 6, familyId: 'evidence-wall', wordCount: 4};
          const intent = computeAdaptiveIntent('lock-on reveal', ctx);
          return (
            <div key={platform}>
              <div style={{fontWeight: 700, color: COLORS.text, marginBottom: 4}}>{platform}</div>
              <div>sizeRatio: {intent.contrast.sizeRatio}</div>
              <div>spacing: {intent.density.spacing}</div>
              <div>intensity: {intent.energy.intensity}</div>
            </div>
          );
        })}
        <div>
          <div style={{fontWeight: 700, color: COLORS.text, marginBottom: 4}}>drift · 50chars · 12s</div>
          {(() => {
            const i = computeAdaptiveIntent('drift reveal', {platform: 'youtube', textLength: 50, duration: 12, familyId: 'evidence-wall', wordCount: 10});
            return (
              <>
                <div>sizeRatio: {i.contrast.sizeRatio}</div>
                <div>spacing: {i.density.spacing}</div>
                <div>intensity: {i.energy.intensity}</div>
              </>
            );
          })()}
        </div>
      </div>
    </AbsoluteFill>
  );
};
