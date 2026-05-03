import React from 'react';
import {SCORE, type TimelineCue} from '../data';
import {validateScore} from '../../data/directorScore';
import {getCameraPathForShot} from '../data';
import {CameraPathChart} from './CameraPathChart';

interface DetailPanelProps {
  selectedCue: TimelineCue | null;
  totalFrames: number;
}

const panelStyle: React.CSSProperties = {
  width: '30%',
  minWidth: 280,
  background: '#f9fafb',
  borderLeft: '1px solid #e5e7eb',
  padding: 16,
  overflowY: 'auto',
  fontFamily: 'system-ui, sans-serif',
  fontSize: 13,
};

const sectionTitle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: '#6b7280',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  marginTop: 16,
  marginBottom: 8,
  paddingBottom: 4,
  borderBottom: '1px solid #e5e7eb',
};

const rowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  padding: '3px 0',
  fontSize: 12,
};

const labelStyle: React.CSSProperties = {color: '#6b7280', fontFamily: 'monospace'};
const valueStyle: React.CSSProperties = {color: '#111827', fontFamily: 'monospace', fontWeight: 500};

const emptyStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: '100%',
  color: '#9ca3af',
  fontSize: 14,
};

function Row({label, value}: {label: string; value: string}) {
  return (
    <div style={rowStyle}>
      <span style={labelStyle}>{label}</span>
      <span style={valueStyle}>{value}</span>
    </div>
  );
}

export const DetailPanel: React.FC<DetailPanelProps> = ({selectedCue, totalFrames}) => {
  const validation = React.useMemo(() => validateScore(SCORE), []);

  // 空状态
  if (!selectedCue) {
    return (
      <div style={panelStyle}>
        <div style={emptyStyle}>点击 cue 查看详情</div>
      </div>
    );
  }

  const shotId = selectedCue.shotId;
  const cameraPath = getCameraPathForShot(shotId);
  const raw = selectedCue.raw;

  return (
    <div style={panelStyle}>
      {/* 元素信息 */}
      <div style={{fontSize: 15, fontWeight: 600, color: '#111827', marginBottom: 4}}>
        {selectedCue.elementId}
      </div>
      <div style={{fontSize: 12, color: '#6b7280', marginBottom: 12, fontFamily: 'monospace'}}>
        {selectedCue.actId} / {shotId}
      </div>

      {/* 帧范围 */}
      <div style={sectionTitle}>帧范围</div>
      <Row label="入场" value={`${selectedCue.enterRange[0]}–${selectedCue.enterRange[1]} (${selectedCue.enterRange[1] - selectedCue.enterRange[0]}帧)`} />
      {selectedCue.exitRange && (
        <Row label="退场" value={`${selectedCue.exitRange[0]}–${selectedCue.exitRange[1]} (${selectedCue.exitRange[1] - selectedCue.exitRange[0]}帧)`} />
      )}
      <Row label="总跨距" value={`${selectedCue.frameRange[0]}–${selectedCue.frameRange[1]}`} />

      {/* 动画参数 */}
      <div style={sectionTitle}>动画参数</div>
      <Row label="类型" value={selectedCue.type} />
      <Row label="入场动画" value={String(raw.enterAnimation ?? '-')} />
      <Row label="入场方向" value={String(raw.enterFrom ?? '-')} />
      <Row label="弹簧预设" value={String(raw.springPreset ?? '-')} />
      {selectedCue.easing && <Row label="缓动" value={selectedCue.easing} />}
      {selectedCue.effectPreset && <Row label="效果预设" value={selectedCue.effectPreset} />}
      {selectedCue.hasLoop && <Row label="循环动画" value={String(raw.loopAnimation)} />}

      {/* 摄像机路径 */}
      {cameraPath && cameraPath.length > 0 && (
        <>
          <div style={sectionTitle}>摄像机路径</div>
          <CameraPathChart path={cameraPath} shotId={shotId} totalFrames={totalFrames} />
        </>
      )}

      {/* 验证 */}
      <div style={sectionTitle}>验证</div>
      {validation.valid ? (
        <div style={{color: '#059669', fontWeight: 500}}>✅ 验证通过</div>
      ) : (
        <>
          {validation.errors.length > 0 && (
            <div style={{color: '#dc2626', fontWeight: 500, marginBottom: 4}}>
              ❌ {validation.errors.length} 个错误
            </div>
          )}
          {validation.warnings && validation.warnings.length > 0 && (
            <div style={{color: '#d97706', fontWeight: 500}}>
              ⚠️ {validation.warnings.length} 个警告
            </div>
          )}
        </>
      )}
    </div>
  );
};
