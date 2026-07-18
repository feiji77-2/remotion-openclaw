// src/tools/console/StoryboardView.tsx
import React, {useState} from 'react';
import {theme} from './theme';
import type {VideoProject} from '../../project/projectSchema';
import type {SceneTimeline} from './types';

interface StoryboardViewProps {
  timeline: SceneTimeline[];
  project: VideoProject;
  totalFrames: number;
  fps: number;
}

const familyLabels: Record<string, string> = {
  'spoken-title': '标题开场', 'spoken-compare': '左右对比',
  'spoken-process': '步骤流程', 'spoken-tags': '标签矩阵',
  'spoken-code': '代码窗口', 'spoken-ranking': '排行重点',
  'spoken-takeaway': '结论收束', 'spoken-metric': '数据指标',
};

const familyColors: Record<string, string> = {
  'spoken-title': '#06b6d4',
  'spoken-compare': theme.accent.blue,
  'spoken-process': theme.accent.green,
  'spoken-tags': theme.accent.purple,
  'spoken-code': '#06b6d4',
  'spoken-ranking': theme.accent.amber,
  'spoken-takeaway': theme.accent.green,
};

export const StoryboardView: React.FC<StoryboardViewProps> = ({timeline, totalFrames, fps}) => {
  const totalDuration = totalFrames;

  return (
    <div style={{flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0}}>
      {/* Header */}
      <div style={{
        padding: '6px 14px', borderBottom: `1px solid ${theme.border.subtle}`,
        background: theme.bg.elevated, display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <span style={{fontWeight: 600, fontSize: 11, color: theme.text.primary}}>分镜编排</span>
        <span style={{fontSize: 9, color: theme.text.muted}}>
          {timeline.length} 场景 · {totalDuration} 帧 · {(totalDuration / fps).toFixed(1)}s
        </span>
      </div>

      {/* Timeline ruler + scenes */}
      <div style={{flex: 1, overflow: 'auto', padding: '12px 14px'}}>
        {timeline.length === 0 ? (
          <div style={{padding: 40, textAlign: 'center', color: theme.text.muted, fontSize: 10}}>
            暂无分镜数据，请先在制作台创建项目
          </div>
        ) : (
          <>
            {/* Ruler */}
            <div style={{
              position: 'sticky', top: 0, zIndex: 1,
              display: 'flex', height: 24, marginBottom: 8,
              borderBottom: `1px solid ${theme.border.subtle}`,
              background: theme.bg.base,
            }}>
              {(() => {
                const tickInterval = Math.max(30, Math.ceil(totalDuration / 12 / 30) * 30);
                const ticks: number[] = [];
                for (let f = 0; f <= totalDuration; f += tickInterval) ticks.push(f);
                return ticks.map((f) => (
                  <div key={f} style={{
                    position: 'absolute', left: `${(f / Math.max(totalDuration, 1)) * 100}%`,
                    transform: 'translateX(-50%)', fontSize: 8, color: theme.text.muted,
                  }}>
                    {f}f
                  </div>
                ));
              })()}
            </div>

            {/* Scene blocks */}
            {timeline.map((item, index) => {
              const scene = item.scene;
              const startPct = (item.start / Math.max(totalDuration, 1)) * 100;
              const endPct = (item.end / Math.max(totalDuration, 1)) * 100;
              const color = familyColors[scene.family] || theme.accent.blue;
              const label = familyLabels[scene.family] || scene.family;

              return (
                <div key={scene.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6,
                  padding: '6px 8px', borderRadius: 6,
                  background: index % 2 === 0 ? theme.bg.surface : 'transparent',
                  border: `1px solid ${theme.border.subtle}`,
                }}>
                  {/* Index */}
                  <div style={{
                    width: 22, height: 22, borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: `${color}22`, color, fontSize: 9, fontWeight: 700,
                    flexShrink: 0,
                  }}>
                    {index + 1}
                  </div>

                  {/* Scene info */}
                  <div style={{width: 90, flexShrink: 0}}>
                    <div style={{fontSize: 10, fontWeight: 600, color: theme.text.primary}}>
                      {scene.id}
                    </div>
                    <div style={{fontSize: 8, color: theme.text.muted}}>{label}</div>
                  </div>

                  {/* Timeline bar */}
                  <div style={{flex: 1, position: 'relative', height: 24}}>
                    {/* Background track */}
                    <div style={{
                      position: 'absolute', left: 0, right: 0, top: 8, height: 8,
                      background: theme.bg.elevated, borderRadius: 4,
                    }} />
                    {/* Scene block */}
                    <div style={{
                      position: 'absolute', left: `${startPct}%`, width: `${endPct - startPct}%`,
                      top: 4, height: 16, borderRadius: 4,
                      background: `${color}33`, border: `1px solid ${color}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <span style={{fontSize: 7, color, fontWeight: 600, whiteSpace: 'nowrap'}}>
                        {scene.durationInFrames}f
                      </span>
                    </div>
                  </div>

                  {/* Frame info */}
                  <div style={{fontSize: 8, color: theme.text.muted, flexShrink: 0, width: 70, textAlign: 'right'}}>
                    {item.start}–{item.end}
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>

      {/* Bottom info */}
      <div style={{
        padding: '4px 14px', borderTop: `1px solid ${theme.border.subtle}`,
        fontSize: 8, color: theme.text.muted, background: theme.bg.elevated,
      }}>
        点击上方场景查看详情 · 共 {timeline.length} 个场景
      </div>
    </div>
  );
};
