// src/tools/console/CenterPanel.tsx
import React, {useState} from 'react';
import {theme} from './theme';
import type {DraftScript, SceneTimeline} from './types';
import type {VideoProject} from '../../project/projectSchema';
import {ScriptEditor} from './ScriptEditor';

interface CenterPanelProps {
  draft: DraftScript;
  onSetDraft: (d: DraftScript) => void;
  scriptSeconds: number;
  onSaveScript: () => void;
  onRunCommand: (cmd: string, label: string) => void;
  timeline: SceneTimeline[];
  totalFrames: number;
  fps: number;
  project: VideoProject;
}

const subTabs = [
  {id: 'script', label: '✎ 文案'},
  {id: 'storyboard', label: '📋 分镜'},
  {id: 'audio', label: '🔊 配音'},
];

const familyLabels: Record<string, string> = {
  'spoken-title': '标题开场', 'spoken-compare': '左右对比',
  'spoken-process': '步骤流程', 'spoken-tags': '标签矩阵',
  'spoken-code': '代码窗口', 'spoken-ranking': '排行重点',
  'spoken-takeaway': '结论收束', 'spoken-metric': '数据指标',
};

export const CenterPanel: React.FC<CenterPanelProps> = (props) => {
  const [activeSubTab, setActiveSubTab] = useState('script');
  const {timeline, totalFrames, fps} = props;

  return (
    <div style={{flex: 1, display: 'flex', flexDirection: 'column', background: theme.bg.base}}>
      {/* Sub tabs */}
      <div style={{display: 'flex', borderBottom: `1px solid ${theme.border.subtle}`, background: theme.bg.elevated}}>
        {subTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id)}
            style={{
              padding: '6px 16px', borderBottom: activeSubTab === tab.id ? `2px solid ${theme.accent.blue}` : '2px solid transparent',
              color: activeSubTab === tab.id ? theme.text.primary : theme.text.muted,
              fontWeight: activeSubTab === tab.id ? 600 : 400, fontSize: 10,
              background: 'none', borderTop: 'none', borderLeft: 'none', borderRight: 'none',
              cursor: 'pointer',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeSubTab === 'script' && <ScriptEditor {...props} />}

      {activeSubTab === 'storyboard' && (
        <div style={{flex: 1, overflow: 'auto', padding: '10px 14px'}}>
          <div style={{fontSize: 9, color: theme.text.muted, fontWeight: 600, marginBottom: 8, textTransform: 'uppercase'}}>
            场景时间线 ({timeline.length} 个场景 · {totalFrames} 帧)
          </div>
          {timeline.length === 0 ? (
            <div style={{padding: 20, textAlign: 'center', color: theme.text.muted, fontSize: 10}}>
              暂无场景数据
            </div>
          ) : (
            <div style={{display: 'flex', flexDirection: 'column', gap: 4}}>
              {timeline.map(({scene, start, end}, i) => (
                <div key={scene.id} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '5px 8px', borderRadius: 4, fontSize: 9,
                  background: theme.bg.surface, border: `1px solid ${theme.border.subtle}`,
                }}>
                  <span style={{color: theme.text.muted, fontWeight: 700, fontSize: 8, width: 20}}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span style={{
                    fontSize: 7, padding: '1px 6px', borderRadius: 3,
                    background: theme.accent.blue + '22', color: theme.accent.blue,
                    fontWeight: 600,
                  }}>
                    {familyLabels[scene.family] || scene.family}
                  </span>
                  <span style={{color: theme.text.primary, flex: 1}}>{scene.id}</span>
                  <span style={{color: theme.text.muted, fontSize: 8}}>{start}–{end} f</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeSubTab === 'audio' && (
        <div style={{flex: 1, overflow: 'auto', padding: '10px 14px'}}>
          <div style={{fontSize: 9, color: theme.text.muted, fontWeight: 600, marginBottom: 8, textTransform: 'uppercase'}}>
            配音配置
          </div>
          <div style={{
            background: theme.bg.surface, border: `1px solid ${theme.border.subtle}`,
            borderRadius: 6, padding: 10, marginBottom: 12,
          }}>
            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 9}}>
              <span style={{color: theme.text.muted}}>配音来源</span>
              <span style={{color: theme.text.primary}}>{props.project.audio.voiceAssetId || '未配置'}</span>
            </div>
            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 9}}>
              <span style={{color: theme.text.muted}}>背景音乐</span>
              <span style={{color: theme.text.primary}}>{props.project.audio.musicAssetId || '未配置'}</span>
            </div>
            <div style={{display: 'flex', justifyContent: 'space-between', fontSize: 9}}>
              <span style={{color: theme.text.muted}}>字幕数</span>
              <span style={{color: theme.text.primary}}>{props.project.captions.length} 条</span>
            </div>
          </div>

          <div style={{fontSize: 9, color: theme.text.muted, fontWeight: 600, marginBottom: 8, textTransform: 'uppercase'}}>
            字幕预览
          </div>
          {props.project.captions.length === 0 ? (
            <div style={{padding: 20, textAlign: 'center', color: theme.text.muted, fontSize: 10}}>
              暂无字幕数据，请先生成项目
            </div>
          ) : (
            <div style={{display: 'flex', flexDirection: 'column', gap: 3}}>
              {props.project.captions.slice(0, 10).map((cap, i) => (
                <div key={i} style={{
                  fontSize: 9, color: theme.text.secondary, lineHeight: 1.5,
                  padding: '3px 6px', background: theme.bg.surface, borderRadius: 3,
                  border: `1px solid ${theme.border.subtle}`,
                }}>
                  <span style={{fontSize: 7, color: theme.text.muted}}>
                    {Math.round(cap.startMs / 1000)}s →
                  </span>
                  {' '}{cap.text}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
