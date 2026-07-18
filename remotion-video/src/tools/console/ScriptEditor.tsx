// src/tools/console/ScriptEditor.tsx
import React from 'react';
import {theme} from './theme';
import type {DraftScript} from './types';

interface ScriptEditorProps {
  draft: DraftScript;
  onSetDraft: (d: DraftScript) => void;
  scriptSeconds: number;
  onSaveScript: () => void;
  onRunCommand: (cmd: string, label: string) => void;
}

export const ScriptEditor: React.FC<ScriptEditorProps> = ({
  draft, onSetDraft, scriptSeconds, onSaveScript, onRunCommand,
}) => {
  const generateTitles = () => {
    const topic = draft.topic.trim() || '这个视频选题';
    const titles = [
      `别再低估${topic}，真正变化已经开始`,
      `${topic}：普通人最该看懂的三个变化`,
      `未来一年，${topic}会先改变这类工作`,
    ];
    onSetDraft({...draft, titles, selectedTitle: titles[0]});
  };

  const rewriteScript = () => {
    const lines = [
      draft.hook, draft.pain, draft.solution,
      '第一步，写清楚目标和观众，让系统知道这条视频到底要说服谁。',
      '第二步，冻结标题、口播和分镜，不要一边渲染一边漂移。',
      '第三步，先生成关键帧验收，再进入完整 MP4 渲染。',
      '所以未来的视频生产，不是从命令开始，而是从选题、文案和验收标准开始。',
    ].filter(Boolean);
    onSetDraft({...draft, script: lines.join('\n\n'), keywords: draft.keywords || `${draft.topic}，工作流，自动化，效率，案例`});
  };

  return (
    <div style={{padding: '12px 14px', flex: 1, overflow: 'auto', fontSize: 10}}>
      {/* Header */}
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10}}>
        <div style={{display: 'flex', gap: 8, alignItems: 'center'}}>
          <span style={{fontWeight: 600, fontSize: 12, color: theme.text.primary}}>口播文案</span>
          <span style={{color: theme.text.muted, background: theme.bg.surface, padding: '1px 8px', borderRadius: 4, fontSize: 8}}>
            {draft.script.length} 字
          </span>
          <span style={{color: theme.text.muted, fontSize: 8}}>预计 {scriptSeconds}s</span>
        </div>
        <div style={{display: 'flex', gap: 4}}>
          <button onClick={rewriteScript} style={{
            background: theme.bg.surface, border: `1px solid ${theme.border.default}`,
            color: theme.text.secondary, padding: '3px 8px', borderRadius: 4,
            fontSize: 8, cursor: 'pointer',
          }}>✎ 优化</button>
        </div>
      </div>

      {/* Theme */}
      <div style={{marginBottom: 10}}>
        <div style={{color: theme.text.muted, fontSize: 8, fontWeight: 600, marginBottom: 3, textTransform: 'uppercase', letterSpacing: 0.3}}>
          主题
        </div>
        <div style={{
          background: theme.bg.surface, border: `1px solid ${theme.border.default}`,
          borderRadius: 6, padding: '6px 10px', fontSize: 11, color: theme.text.primary,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <input
            value={draft.topic}
            onChange={(e) => onSetDraft({...draft, topic: e.target.value})}
            style={{
              background: 'transparent', border: 'none', color: theme.text.primary,
              fontSize: 11, outline: 'none', flex: 1,
            }}
          />
        </div>
      </div>

      {/* Viewpoint */}
      <div style={{marginBottom: 10}}>
        <div style={{color: theme.text.muted, fontSize: 8, fontWeight: 600, marginBottom: 3, textTransform: 'uppercase', letterSpacing: 0.3}}>
          主观点
        </div>
        <input
          value={draft.viewpoint}
          onChange={(e) => onSetDraft({...draft, viewpoint: e.target.value})}
          style={{
            width: '100%', background: theme.bg.surface, border: `1px solid ${theme.border.default}`,
            borderRadius: 6, padding: '6px 10px', fontSize: 11, color: theme.text.primary,
            outline: 'none',
          }}
        />
      </div>

      {/* Title candidates */}
      <div style={{marginBottom: 10}}>
        <div style={{color: theme.text.muted, fontSize: 8, fontWeight: 600, marginBottom: 3, textTransform: 'uppercase', letterSpacing: 0.3}}>
          标题候选
        </div>
        <div style={{display: 'flex', flexDirection: 'column', gap: 4}}>
          {draft.titles.map((title) => (
            <button
              key={title}
              onClick={() => onSetDraft({...draft, selectedTitle: title})}
              style={{
                textAlign: 'left', padding: '5px 10px', borderRadius: 4, fontSize: 10,
                background: draft.selectedTitle === title ? `${theme.accent.blue}15` : theme.bg.surface,
                border: draft.selectedTitle === title ? `1px solid ${theme.accent.blue}66` : `1px solid ${theme.border.default}`,
                color: theme.text.primary, cursor: 'pointer',
              }}
            >
              <span style={{color: draft.selectedTitle === title ? theme.accent.blue : theme.text.muted, marginRight: 6}}>
                {draft.selectedTitle === title ? '●' : '○'}
              </span>
              {title}
            </button>
          ))}
        </div>
      </div>

      {/* Script */}
      <div style={{marginBottom: 10}}>
        <div style={{color: theme.text.muted, fontSize: 8, fontWeight: 600, marginBottom: 3, textTransform: 'uppercase', letterSpacing: 0.3}}>
          脚本内容
        </div>
        <textarea
          value={draft.script}
          onChange={(e) => onSetDraft({...draft, script: e.target.value})}
          style={{
            width: '100%', minHeight: 110, background: theme.bg.surface,
            border: `1px solid ${theme.border.default}`, borderRadius: 6,
            padding: 10, fontSize: 10, lineHeight: 1.7, color: theme.text.secondary,
            resize: 'vertical', outline: 'none', fontFamily: 'inherit',
          }}
        />
      </div>

      {/* Actions */}
      <div style={{display: 'flex', gap: 6, marginTop: 10}}>
        <button onClick={generateTitles} style={{
          background: theme.bg.surface, border: `1px solid ${theme.border.default}`,
          padding: '4px 10px', borderRadius: 4, fontSize: 9, color: theme.text.secondary,
          cursor: 'pointer',
        }}>生成标题</button>
        <button onClick={rewriteScript} style={{
          background: theme.bg.surface, border: `1px solid ${theme.border.default}`,
          padding: '4px 10px', borderRadius: 4, fontSize: 9, color: theme.text.secondary,
          cursor: 'pointer',
        }}>生成口播</button>
        <button onClick={() => onSetDraft({...draft, keywords: `${draft.topic}，工作流，自动化，效率`})} style={{
          background: theme.bg.surface, border: `1px solid ${theme.border.default}`,
          padding: '4px 10px', borderRadius: 4, fontSize: 9, color: theme.text.secondary,
          cursor: 'pointer',
        }}># 关键词</button>
        <div style={{flex: 1}} />
        <button onClick={() => onRunCommand('build-project', '生成分镜')} style={{
          background: `linear-gradient(135deg, ${theme.accent.blue}, ${theme.accent.indigo})`,
          border: 'none', padding: '4px 14px', borderRadius: 6, fontSize: 9,
          color: '#fff', fontWeight: 600, cursor: 'pointer',
        }}>✨ 生成分镜</button>
      </div>
    </div>
  );
};
