// src/tools/console/StudioShell.tsx
// R1: 产品级布局 — 四区主界面 shell
import React from 'react';
import {theme} from './theme';

interface StudioShellProps {
  header: React.ReactNode;
  stepper: React.ReactNode;
  preview: React.ReactNode;
  workspace: React.ReactNode;
  timeline: React.ReactNode;
  drawer: React.ReactNode;
}

export const StudioShell: React.FC<StudioShellProps> = ({
  header, stepper, preview, workspace, timeline, drawer,
}) => (
  <div style={{height: '100vh', display: 'flex', flexDirection: 'column', background: theme.bg.base, overflow: 'hidden'}}>
    {/* Top: project status bar */}
    <div style={{flexShrink: 0, height: 52, borderBottom: `1px solid ${theme.border.subtle}`, background: theme.bg.elevated}}>
      {header}
    </div>

    {/* Middle: stepper | preview | workspace */}
    <div style={{flex: 1, display: 'flex', minHeight: 0}}>
      {/* Left: stepper (65px wide) */}
      <div style={{
        width: 65, flexShrink: 0, borderRight: `1px solid ${theme.border.subtle}`,
        background: theme.bg.base, display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {stepper}
      </div>

      {/* Center: preview canvas */}
      <div style={{flex: 1, minWidth: 0, background: '#050608'}}>
        {preview}
      </div>

      {/* Right: workspace panel (360px) */}
      <div style={{
        width: 360, flexShrink: 0, borderLeft: `1px solid ${theme.border.subtle}`,
        background: theme.bg.elevated, overflow: 'auto',
      }}>
        {workspace}
      </div>
    </div>

    {/* Bottom: scene timeline (72px) */}
    <div style={{
      flexShrink: 0, height: 72, borderTop: `1px solid ${theme.border.subtle}`,
      background: theme.bg.surface, overflow: 'hidden',
    }}>
      {timeline}
    </div>

    {/* Developer drawer (hidden by default) */}
    {drawer}
  </div>
);
