/**
 * DirectorScorePreviewComposition.tsx — 渲染 DEEPSEEK_V4_DIRECTOR_SCORE 示例
 *
 * 用于 Remotion Studio 预览 / 命令行渲染。
 */
import React, {useMemo} from 'react';
import {AbsoluteFill} from 'remotion';
import {scoreToSequences} from '../data/directorScore';
import {DEEPSEEK_V4_DIRECTOR_SCORE} from '../data/generated/directorScoreSample';
import {DirectorScoreOrchestrator} from '../components/ultimate-kit/DirectorScoreOrchestrator';

const FPS = 30;

const BASE_STYLE: React.CSSProperties = {
  color: '#fff',
  fontFamily: '"SF Pro Display", "PingFang SC", system-ui, sans-serif',
  textAlign: 'center',
  lineHeight: 1.2,
};

const CAPSULE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

const elementRenderMap = new Map<string, React.ReactNode>([
  [
    'main-title',
    <div
      key="main-title"
      style={{
        ...BASE_STYLE,
        position: 'absolute',
        left: 120,
        top: 340,
        fontSize: 96,
        fontWeight: 800,
        letterSpacing: -2,
        whiteSpace: 'nowrap',
      }}
    >
      GPT-5.5 发布了
    </div>,
  ],
  [
    'subtitle',
    <div
      key="subtitle"
      style={{
        ...BASE_STYLE,
        position: 'absolute',
        left: 120,
        top: 450,
        fontSize: 38,
        fontWeight: 500,
        color: '#94a3b8',
        whiteSpace: 'nowrap',
      }}
    >
      不再只是卖 Token
    </div>,
  ],
  [
    'top-tag',
    <div
      key="top-tag"
      style={{
        ...BASE_STYLE,
        position: 'absolute',
        left: '50%',
        top: 100,
        fontSize: 16,
        fontWeight: 600,
        color: '#38bdf8',
        background: '#38bdf822',
        padding: '6px 20px',
        borderRadius: 999,
        border: '1px solid #38bdf844',
        transform: 'translateX(-50%)',
        whiteSpace: 'nowrap',
      }}
    >
      HERO · OpenAI
    </div>,
  ],
  [
    'capsule-1',
    <div
      key="capsule-1"
      style={{
        position: 'absolute',
        left: 120,
        top: 340,
        width: 360,
        height: 120,
        background: CAPSULE_COLORS[0],
        borderRadius: 60,
        opacity: 0.85,
      }}
    />,
  ],
  [
    'capsule-2',
    <div
      key="capsule-2"
      style={{
        position: 'absolute',
        left: 560,
        top: 340,
        width: 360,
        height: 120,
        background: CAPSULE_COLORS[1],
        borderRadius: 60,
        opacity: 0.85,
      }}
    />,
  ],
  [
    'capsule-3',
    <div
      key="capsule-3"
      style={{
        position: 'absolute',
        left: 120,
        top: 520,
        width: 360,
        height: 120,
        background: CAPSULE_COLORS[2],
        borderRadius: 60,
        opacity: 0.85,
      }}
    />,
  ],
  [
    'capsule-4',
    <div
      key="capsule-4"
      style={{
        position: 'absolute',
        left: 560,
        top: 520,
        width: 360,
        height: 120,
        background: CAPSULE_COLORS[3],
        borderRadius: 60,
        opacity: 0.85,
      }}
    />,
  ],
  [
    'closing-quote',
    <div
      key="closing-quote"
      style={{
        ...BASE_STYLE,
        position: 'absolute',
        left: 160,
        top: 360,
        width: 1600,
        fontSize: 52,
        fontWeight: 700,
        color: '#f1f5f9',
        letterSpacing: -1,
      }}
    >
      "AI 的未来不是回答问题，而是交付结果。"
    </div>,
  ],
  [
    'nav-bar',
    <div
      key="nav-bar"
      style={{
        position: 'absolute',
        left: 120,
        bottom: 100,
        width: 1680,
        height: 4,
        background: 'linear-gradient(90deg, #3b82f6, #8b5cf6, #ec4899)',
        borderRadius: 2,
      }}
    />,
  ],
  [
    'footer',
    <div
      key="footer"
      style={{
        ...BASE_STYLE,
        position: 'absolute',
        left: 120,
        bottom: 50,
        fontSize: 18,
        color: '#64748b',
      }}
    >
      OpenClaw · 深度观察
    </div>,
  ],
  [
    'trace-dot',
    <div
      key="trace-dot"
      style={{
        position: 'absolute',
        left: 240,
        top: 200,
        width: 24,
        height: 24,
        background: '#6366f1',
        borderRadius: '50%',
        boxShadow: '0 0 24px #6366f199',
      }}
    />,
  ],
  [
    'trace-label',
    <div
      key="trace-label"
      style={{
        ...BASE_STYLE,
        position: 'absolute',
        right: 160,
        top: 140,
        fontSize: 28,
        fontWeight: 600,
        color: '#a5b4fc',
        background: '#6366f122',
        padding: '12px 28px',
        borderRadius: 12,
        border: '1px solid #6366f144',
      }}
    >
      SVG 路径追踪
    </div>,
  ],
]);

export const DirectorScorePreviewComposition: React.FC = () => {
  const sequences = useMemo(
    () => scoreToSequences(DEEPSEEK_V4_DIRECTOR_SCORE, {resolveMode: 'compat', fps: FPS}),
    [],
  );

  return (
    <AbsoluteFill style={{background: '#0f172a'}}>
      <DirectorScoreOrchestrator
        sequences={sequences}
        elementRenderMap={elementRenderMap}
        fps={FPS}
      />
    </AbsoluteFill>
  );
};
