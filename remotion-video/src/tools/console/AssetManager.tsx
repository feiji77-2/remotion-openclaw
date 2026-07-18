// src/tools/console/AssetManager.tsx
import React from 'react';
import {theme} from './theme';
import type {VideoProject} from '../../project/projectSchema';
import type {StudioFile, ContractKey} from './types';

interface AssetManagerProps {
  files: Record<ContractKey, StudioFile | null>;
  project: VideoProject;
  onRunCommand: (cmd: string, label: string) => void;
}

export const AssetManager: React.FC<AssetManagerProps> = ({files, project, onRunCommand}) => {
  const assetPack = files['asset-pack.json'];
  const assets = assetPack?.data && typeof assetPack.data === 'object'
    ? (assetPack.data as Record<string, unknown>).assets : null;
  const assetList = Array.isArray(assets) ? assets as Array<{id?: string; kind?: string; src?: string; required?: boolean}> : [];

  return (
    <div style={{flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0}}>
      {/* Header */}
      <div style={{
        padding: '6px 14px', borderBottom: `1px solid ${theme.border.subtle}`,
        background: theme.bg.elevated, display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <span style={{fontWeight: 600, fontSize: 11, color: theme.text.primary}}>素材资产</span>
        <span style={{fontSize: 9, color: theme.text.muted}}>
          {Object.keys(project.assets).length} 个注册资产
        </span>
      </div>

      <div style={{flex: 1, overflow: 'auto', padding: 12}}>
        {/* Project assets */}
        <div style={{fontSize: 9, color: theme.text.muted, fontWeight: 600, marginBottom: 8, textTransform: 'uppercase'}}>
          项目资产 ({Object.keys(project.assets).length})
        </div>
        {Object.keys(project.assets).length === 0 ? (
          <div style={{padding: 20, textAlign: 'center', color: theme.text.muted, fontSize: 10}}>
            暂无资产数据，请先生成项目
          </div>
        ) : (
          <div style={{display: 'flex', flexDirection: 'column', gap: 4}}>
            {Object.entries(project.assets).map(([id, asset]) => (
              <div key={id} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '5px 8px', borderRadius: 4,
                background: theme.bg.surface, border: `1px solid ${theme.border.subtle}`,
              }}>
                <span style={{
                  fontSize: 7, padding: '1px 5px', borderRadius: 3,
                  background: asset.kind === 'image' ? theme.accent.blue + '22' :
                    asset.kind === 'audio' ? theme.accent.green + '22' :
                    asset.kind === 'video' ? theme.accent.purple + '22' : theme.bg.elevated,
                  color: asset.kind === 'image' ? theme.accent.blue :
                    asset.kind === 'audio' ? theme.accent.green :
                    asset.kind === 'video' ? theme.accent.purple : theme.text.muted,
                  fontWeight: 600, textTransform: 'uppercase',
                }}>
                  {asset.kind}
                </span>
                <span style={{fontSize: 9, color: theme.text.primary, flex: 1}}>{id}</span>
                <span style={{fontSize: 8, color: theme.text.muted}}>{asset.src}</span>
                {asset.required && <span style={{fontSize: 7, color: theme.accent.amber}}>必需</span>}
              </div>
            ))}
          </div>
        )}

        {/* Asset pack files */}
        {assetPack?.exists && (
          <>
            <div style={{fontSize: 9, color: theme.text.muted, fontWeight: 600, margin: '16px 0 8px', textTransform: 'uppercase'}}>
              素材包 ({assetList.length})
            </div>
            {assetList.length === 0 ? (
              <div style={{padding: 12, textAlign: 'center', color: theme.text.muted, fontSize: 9}}>
                asset-pack.json 存在但无资产条目
              </div>
            ) : (
              <div style={{display: 'flex', flexDirection: 'column', gap: 4}}>
                {assetList.map((a, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '5px 8px', borderRadius: 4,
                    background: theme.bg.surface, border: `1px solid ${theme.border.subtle}`,
                  }}>
                    <span style={{fontSize: 8, color: theme.text.muted}}>{a.id || `#${i}`}</span>
                    <span style={{
                      fontSize: 7, padding: '1px 5px', borderRadius: 3,
                      background: theme.bg.elevated, color: theme.text.muted,
                    }}>{a.kind || '?'}</span>
                    <span style={{fontSize: 8, color: theme.text.muted, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis'}}>
                      {a.src || '-'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Action bar */}
      <div style={{
        padding: '6px 14px', borderTop: `1px solid ${theme.border.subtle}`,
        display: 'flex', gap: 6, background: theme.bg.elevated,
      }}>
        <button
          onClick={() => onRunCommand('build-project', '构建项目')}
          style={{
            background: theme.bg.surface, border: `1px solid ${theme.border.default}`,
            color: theme.text.secondary, padding: '3px 10px', borderRadius: 4,
            fontSize: 9, cursor: 'pointer',
          }}
        >
          重新构建项目
        </button>
        <button
          onClick={() => onRunCommand('production-check', '检查生产目录')}
          style={{
            background: theme.bg.surface, border: `1px solid ${theme.border.default}`,
            color: theme.text.secondary, padding: '3px 10px', borderRadius: 4,
            fontSize: 9, cursor: 'pointer',
          }}
        >
          检查素材完整性
        </button>
      </div>
    </div>
  );
};
