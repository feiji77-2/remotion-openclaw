import React, {useState, useCallback} from 'react';
import {SCORE, SEQUENCES, type TimelineCue} from './data';
import {PreviewHeader} from './components/PreviewHeader';
import {TimelinePanel} from './components/TimelinePanel';
import {DetailPanel} from './components/DetailPanel';
import {PreviewPlayer} from './components/PreviewPlayer';
import {TimelineFooter} from './components/TimelineFooter';

type Tab = 'details' | 'preview';

const pageStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  height: '100vh',
  fontFamily: 'system-ui, sans-serif',
  background: '#fff',
  color: '#111827',
};

const mainStyle: React.CSSProperties = {
  display: 'flex',
  flex: 1,
  overflow: 'hidden',
};

const tabBarStyle: React.CSSProperties = {
  display: 'flex',
  borderBottom: '1px solid #e5e7eb',
  background: '#fff',
};

const tabItem = (active: boolean): React.CSSProperties => ({
  padding: '8px 16px',
  fontSize: 12,
  fontWeight: active ? 600 : 400,
  color: active ? '#3b82f6' : '#6b7280',
  cursor: 'pointer',
  borderBottom: active ? '2px solid #3b82f6' : '2px solid transparent',
  background: 'none',
  fontFamily: 'inherit',
});

export const DirectorScorePreview: React.FC = () => {
  const [selectedCueId, setSelectedCueId] = useState<string | null>(null);
  const [selectedCue, setSelectedCue] = useState<TimelineCue | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('details');
  const [zoom, setZoom] = useState(1);

  const handleSelectCue = useCallback((cue: TimelineCue) => {
    setSelectedCueId(cue.elementId);
    setSelectedCue(cue);
    setActiveTab('details');
  }, []);

  return (
    <div style={pageStyle}>
      <PreviewHeader score={SCORE} />

      <div style={tabBarStyle}>
        <button style={tabItem(activeTab === 'details')} onClick={() => setActiveTab('details')}>
          详情
        </button>
        <button style={tabItem(activeTab === 'preview')} onClick={() => setActiveTab('preview')}>
          预览
        </button>
      </div>

      <div style={mainStyle}>
        <TimelinePanel
          acts={SCORE.acts}
          totalFrames={SCORE.totalFrames}
          selectedCueId={selectedCueId}
          onSelectCue={handleSelectCue}
        />

        {activeTab === 'details' ? (
          <DetailPanel selectedCue={selectedCue} totalFrames={SCORE.totalFrames} />
        ) : (
          <PreviewPlayer sequences={SEQUENCES} totalFrames={SCORE.totalFrames} fps={SCORE.fps} />
        )}
      </div>

      <TimelineFooter score={SCORE} zoom={zoom} onZoomChange={setZoom} />
    </div>
  );
};
