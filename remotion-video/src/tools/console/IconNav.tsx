// src/tools/console/IconNav.tsx
import React from 'react';
import {theme} from './theme';

interface IconNavProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
}

const tabs = [
  {id: 'production', icon: '📝', label: '制作'},
  {id: 'preview', icon: '🎬', label: '预览'},
  {id: 'storyboard', icon: '📊', label: '分镜'},
  {id: 'assets', icon: '🗂️', label: '资产'},
  {id: 'settings', icon: '⚙️', label: '设置'},
];

export const IconNav: React.FC<IconNavProps> = ({activeTab, onSelectTab}) => (
  <div style={{
    width: 44, background: theme.bg.elevated, borderRight: `1px solid ${theme.border.subtle}`,
    padding: '6px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
  }}>
    {tabs.map((tab) => (
      <button
        key={tab.id}
        onClick={() => onSelectTab(tab.id)}
        title={tab.label}
        style={{
          width: 32, height: 32, borderRadius: 6,
          background: activeTab === tab.id ? theme.accent.blue : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, color: activeTab === tab.id ? '#fff' : theme.text.muted,
          border: 'none', cursor: 'pointer', position: 'relative',
        }}
      >
        {tab.icon}
        {activeTab === tab.id && (
          <span style={{
            position: 'absolute', bottom: -1, right: -1, width: 8, height: 8,
            borderRadius: '50%', background: theme.accent.green,
            border: `2px solid ${theme.bg.elevated}`,
          }} />
        )}
      </button>
    ))}
  </div>
);
