import React from 'react';

interface StudioShellProps {
  header: React.ReactNode;
  stepper: React.ReactNode;
  preview?: React.ReactNode;
  workspace: React.ReactNode;
  timeline?: React.ReactNode;
  wideWorkspace?: boolean;
  previewLabel?: string;
  drawer: React.ReactNode;
  interactionLock?: {
    label: string;
    detail: string;
    progress: number;
  };
}

export const StudioShell: React.FC<StudioShellProps> = ({header, stepper, preview, workspace, timeline, wideWorkspace = false, previewLabel = '中间预览区', drawer, interactionLock}) => {
  const hasTimeline = Boolean(timeline);
  const hasPreview = Boolean(preview) && !wideWorkspace;
  const locked = Boolean(interactionLock);
  const progress = Math.max(0, Math.min(100, Math.round(interactionLock?.progress || 0)));
  return (
    <main className={`studio-shell ${hasTimeline ? '' : 'studio-shell--without-timeline'} ${wideWorkspace ? 'studio-shell--wide-workspace' : ''} ${locked ? 'studio-shell--interaction-locked' : ''}`.trim()} aria-busy={locked}>
      <header className="studio-header" inert={locked}>{header}</header>
      <section className="studio-body" inert={locked}>
        <aside className="studio-navigation">{stepper}</aside>
        {hasPreview && <section className="studio-preview" aria-label={previewLabel}>{preview}</section>}
        <aside className="studio-workspace">{workspace}</aside>
      </section>
      {hasTimeline && <footer className="studio-timeline" inert={locked}>{timeline}</footer>}
      {interactionLock && <div className="studio-interaction-lock" role="status" aria-live="polite">
        <div className="studio-interaction-lock__status">
          <span className="action-spinner" aria-hidden="true" />
          <span><strong>{interactionLock.label}</strong><small>{interactionLock.detail}</small></span>
          <b>{progress}%</b>
          <div className="studio-interaction-lock__bar" aria-label={`关键帧渲染进度 ${progress}%`}><i style={{width: `${Math.max(4, progress)}%`}} /></div>
        </div>
      </div>}
      {drawer}
    </main>
  );
};
