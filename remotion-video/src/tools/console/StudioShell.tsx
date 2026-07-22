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
}

export const StudioShell: React.FC<StudioShellProps> = ({header, stepper, preview, workspace, timeline, wideWorkspace = false, previewLabel = '中间预览区', drawer}) => {
  const hasTimeline = Boolean(timeline);
  const hasPreview = Boolean(preview) && !wideWorkspace;
  return (
    <main className={`studio-shell ${hasTimeline ? '' : 'studio-shell--without-timeline'} ${wideWorkspace ? 'studio-shell--wide-workspace' : ''}`.trim()}>
      <header className="studio-header">{header}</header>
      <section className="studio-body">
        <aside className="studio-navigation">{stepper}</aside>
        {hasPreview && <section className="studio-preview" aria-label={previewLabel}>{preview}</section>}
        <aside className="studio-workspace">{workspace}</aside>
      </section>
      {hasTimeline && <footer className="studio-timeline">{timeline}</footer>}
      {drawer}
    </main>
  );
};
