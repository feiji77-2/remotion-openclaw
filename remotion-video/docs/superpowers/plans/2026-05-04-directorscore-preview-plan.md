# DirectorScore 预览工具 Implementation Plan

> **For agentic workers:** Use subagent-driven-development (recommended) or executing-plans to implement task-by-task.

**Goal:** Build a standalone React page that visualizes DirectorScore data with a multi-track timeline, detail panel, camera path chart, and Remotion Player animation preview.

**Architecture:** Single-page React app inside `remotion-video/src/tools/`. Data layer compiles embedded `DEEPSEEK_V4_DIRECTOR_SCORE` via `scoreToSequences()`. Timeline components render cue bars with color-coded segments. Right panel toggles between detail view and Remotion `<Player>` preview. Pure CSS styling, no external UI library.

**Tech Stack:** React 18, TypeScript, `@remotion/player` 4.0.454, Pure CSS

---

### Task 1: Data Layer (`src/tools/data.ts`)

**Files:**
- Create: `src/tools/data.ts`
- Test: `src/tools/__tests__/data.test.ts`
- Depends on: `src/data/directorScore.ts`, `src/data/generated/directorScoreSample.ts`

This module is the single source of data for all components. It imports the sample score, compiles it to sequences, and provides utility functions.

- [ ] **Step 1: Write the failing test**

Create `src/tools/__tests__/data.test.ts`:

```typescript
import {describe, expect, it} from 'vitest';
import {SCORE, SEQUENCES, getCuesForAct, getTimelineCues} from '../data';

describe('data layer', () => {
  it('exports the embedded score', () => {
    expect(SCORE.id).toBe('deepseek-v4-hero');
    expect(SCORE.totalFrames).toBe(210);
    expect(SCORE.acts).toHaveLength(4);
  });

  it('compiles to 4 top-level sequences', () => {
    expect(SEQUENCES).toHaveLength(4);
    SEQUENCES.forEach((seq) => {
      expect(seq.from).toBeGreaterThanOrEqual(0);
      expect(seq.durationInFrames).toBeGreaterThan(0);
    });
  });

  it('getCuesForAct returns cues for the given act', () => {
    const cues = getCuesForAct('act-01');
    expect(cues.length).toBeGreaterThan(0);
    cues.forEach((c) => expect(c.actId).toBe('act-01'));
  });

  it('getTimelineCues returns flat timeline items', () => {
    const items = getTimelineCues();
    expect(items.length).toBeGreaterThan(0);
    const item = items[0];
    expect(item).toHaveProperty('elementId');
    expect(item).toHaveProperty('frameRange');
    expect(item).toHaveProperty('color');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd remotion-video && npx vitest run src/tools/__tests__/data.test.ts 2>&1 | head -10`
Expected: FAIL — module not found errors

- [ ] **Step 3: Create data.ts**

Create `src/tools/data.ts`:

```typescript
import type {SequenceConfig} from '../data/directorScore';
import {scoreToSequences} from '../data/directorScore';
import {DEEPSEEK_V4_DIRECTOR_SCORE} from '../data/generated/directorScoreSample';
import type {ElementType} from '../data/directorScore';

// ── 内嵌数据 ──

export const SCORE = DEEPSEEK_V4_DIRECTOR_SCORE;
export const SEQUENCES: SequenceConfig[] = scoreToSequences(SCORE);

// ── 类型 ──

export interface TimelineCue {
  elementId: string;
  type: ElementType;
  actId: string;
  shotId: string;
  /** 帧范围  [enterStart, maxEnd] */
  frameRange: [number, number];
  /** 入场段 [enterStart, enterEnd] */
  enterRange: [number, number];
  /** 退场段（可选） */
  exitRange?: [number, number];
  hasLoop: boolean;
  easing?: string;
  effectPreset?: string;
  color: string;
  raw: Record<string, unknown>;
}

const TYPE_COLORS: Record<ElementType, string> = {
  text: '#3b82f6',
  shape: '#10b981',
  image: '#8b5cf6',
  icon: '#f59e0b',
  container: '#6b7280',
  path: '#8b5cf6',
};

const ENERGY_COLORS: Record<string, string> = {
  explosive: '#ef4444',
  high: '#f97316',
  moderate: '#eab308',
  calm: '#3b82f6',
};

export function getEnergyColor(energy: string): string {
  return ENERGY_COLORS[energy] ?? '#6b7280';
}

export function getTypeColor(type: ElementType): string {
  return TYPE_COLORS[type] ?? '#6b7280';
}

// ── 工具函数 ──

/** 获取指定幕的所有 cue（拍平成 TimelineCue[]） */
export function getCuesForAct(actId: string): TimelineCue[] {
  return getTimelineCues().filter((c) => c.actId === actId);
}

/** 获取指定 shot 的摄像机路径 */
export function getCameraPathForShot(shotId: string) {
  for (const act of SCORE.acts) {
    for (const shot of act.shots) {
      if (shot.shotId === shotId) return shot.cameraPath;
    }
  }
  return null;
}

/** 获取所有 cue 的扁平列表 */
export function getTimelineCues(): TimelineCue[] {
  const result: TimelineCue[] = [];
  for (const act of SCORE.acts) {
    for (const shot of act.shots) {
      for (const cue of shot.cues) {
        const enterEnd = cue.enterAtFrame + cue.enterDuration;
        let maxEnd = enterEnd;
        let exitRange: [number, number] | undefined;
        if (cue.exitAtFrame !== undefined && cue.exitDuration !== undefined) {
          const exitEnd = cue.exitAtFrame + cue.exitDuration;
          maxEnd = Math.max(maxEnd, exitEnd);
          exitRange = [cue.exitAtFrame, exitEnd];
        }
        result.push({
          elementId: cue.elementId,
          type: cue.type,
          actId: act.actId,
          shotId: shot.shotId,
          frameRange: [cue.enterAtFrame, maxEnd],
          enterRange: [cue.enterAtFrame, enterEnd],
          exitRange,
          hasLoop: !!cue.loopAnimation,
          easing: cue.easing,
          effectPreset: cue.effectPreset,
          color: getTypeColor(cue.type),
          raw: cue as unknown as Record<string, unknown>,
        });
      }
    }
  }
  return result;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd remotion-video && npx vitest run src/tools/__tests__/data.test.ts 2>&1`
Expected: PASS — all 4 tests pass

- [ ] **Step 5: Commit**

```bash
git add src/tools/data.ts src/tools/__tests__/data.test.ts
git commit -m "feat: add DirectorScore preview data layer"
```

---

### Task 2: PreviewHeader — Metadata + Energy

**Files:**
- Create: `src/tools/components/PreviewHeader.tsx`

A simple bar at the top showing the score title, FPS, total frames, duration, and energy curve pills.

- [ ] **Step 1: Create PreviewHeader.tsx**

```tsx
import React from 'react';
import type {DirectorScore, EnergyLevel} from '../../data/directorScore';
import {getEnergyColor} from '../data';

interface PreviewHeaderProps {
  score: DirectorScore;
}

const ENERGY_LABELS: Record<EnergyLevel, string> = {
  explosive: '爆发',
  high: '高能',
  moderate: '温和',
  calm: '平静',
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '12px 16px',
  background: '#f9fafb',
  borderBottom: '1px solid #e5e7eb',
  fontFamily: 'system-ui, sans-serif',
};

const titleStyle: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 600,
  color: '#111827',
};

const metaStyle: React.CSSProperties = {
  fontSize: 13,
  color: '#6b7280',
};

const pillStyle = (color: string): React.CSSProperties => ({
  display: 'inline-block',
  padding: '2px 8px',
  borderRadius: 4,
  color: '#fff',
  fontSize: 12,
  fontWeight: 500,
  background: color,
  marginLeft: 4,
});

export const PreviewHeader: React.FC<PreviewHeaderProps> = ({score}) => {
  const durationSec = (score.totalFrames / score.fps).toFixed(1);
  return (
    <div style={headerStyle}>
      <div>
        <span style={titleStyle}>DirectorScore Preview · {score.id}</span>
        <span style={{...metaStyle, marginLeft: 12}}>
          {score.totalFrames}帧 · {score.fps}fps · {durationSec}s
        </span>
      </div>
      <div style={{display: 'flex', alignItems: 'center', gap: 4}}>
        <span style={{fontSize: 12, color: '#6b7280', marginRight: 4}}>能量:</span>
        {score.acts.map((act) => (
          <span key={act.actId} style={pillStyle(getEnergyColor(act.energy))} title={act.label}>
            {ENERGY_LABELS[act.energy as EnergyLevel] ?? act.energy}
          </span>
        ))}
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add src/tools/components/PreviewHeader.tsx
git commit -m "feat: add PreviewHeader component"
```

---

### Task 3: CueTrack — Individual Cue Bar

**Files:**
- Create: `src/tools/components/CueTrack.tsx`

Renders a single horizontal bar representing one cue's lifecycle: enter segment (colored), optional exit segment (gray), optional loop indicator (gold dot). Clickable to select.

- [ ] **Step 1: Create CueTrack.tsx**

```tsx
import React from 'react';
import type {TimelineCue} from '../data';

interface CueTrackProps {
  cue: TimelineCue;
  /** 时间线总帧数（用于计算百分比宽度） */
  totalFrames: number;
  selected: boolean;
  onClick: (cue: TimelineCue) => void;
  onHover?: (cue: TimelineCue | null) => void;
}

const rowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  height: 22,
  marginBottom: 2,
  cursor: 'pointer',
  borderRadius: 3,
  padding: '0 4px',
};

const labelStyle: React.CSSProperties = {
  width: 90,
  fontSize: 11,
  fontFamily: 'monospace',
  color: '#374151',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  flexShrink: 0,
};

const trackWrapStyle: React.CSSProperties = {
  flex: 1,
  height: '100%',
  position: 'relative',
  background: '#f3f4f6',
  borderRadius: 2,
  overflow: 'hidden',
};

const barBase: React.CSSProperties = {
  position: 'absolute',
  height: '100%',
  borderRadius: 2,
  transition: 'opacity 0.15s',
};

export const CueTrack: React.FC<CueTrackProps> = ({cue, totalFrames, selected, onClick, onHover}) => {
  const pct = (frame: number) => (frame / totalFrames) * 100;

  return (
    <div
      style={{...rowStyle, background: selected ? '#eff6ff' : 'transparent'}}
      onClick={() => onClick(cue)}
      onMouseEnter={() => onHover?.(cue)}
      onMouseLeave={() => onHover?.(null)}
      title={`${cue.elementId}  ${cue.enterRange[0]}-${cue.enterRange[1]}帧`}
    >
      <span style={labelStyle}>{cue.elementId}</span>
      <div style={trackWrapStyle}>
        {/* 入场段 */}
        <div
          style={{
            ...barBase,
            left: `${pct(cue.enterRange[0])}%`,
            width: `${pct(cue.enterRange[1] - cue.enterRange[0])}%`,
            background: cue.color,
            opacity: 0.85,
          }}
        />
        {/* 退场段 */}
        {cue.exitRange && (
          <div
            style={{
              ...barBase,
              left: `${pct(cue.exitRange[0])}%`,
              width: `${pct(cue.exitRange[1] - cue.exitRange[0])}%`,
              background: '#9ca3af',
              opacity: 0.5,
            }}
          />
        )}
        {/* 循环动画指示器 */}
        {cue.hasLoop && (
          <div
            style={{
              position: 'absolute',
              right: 4,
              top: '50%',
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: '#f59e0b',
              transform: 'translateY(-50%)',
            }}
            title="loop animation"
          />
        )}
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add src/tools/components/CueTrack.tsx
git commit -m "feat: add CueTrack component"
```

---

### Task 4: ActTrack — Collapsible Act Block

**Files:**
- Create: `src/tools/components/ActTrack.tsx`
- Depends on: CueTrack, data layer

Collapsible section for one act, showing the act header (colored energy bar + label + frame range) and a list of CueTracks when expanded.

- [ ] **Step 1: Create ActTrack.tsx**

```tsx
import React, {useState} from 'react';
import type {ActBlock} from '../../data/directorScore';
import {getCuesForAct, getEnergyColor, type TimelineCue} from '../data';
import {CueTrack} from './CueTrack';

interface ActTrackProps {
  act: ActBlock;
  totalFrames: number;
  selectedCueId: string | null;
  onSelectCue: (cue: TimelineCue) => void;
}

const actStyle = (color: string): React.CSSProperties => ({
  background: `${color}10`,
  borderRadius: 6,
  marginBottom: 8,
  border: `1px solid ${color}20`,
  overflow: 'hidden',
});

const headerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '8px 12px',
  cursor: 'pointer',
  userSelect: 'none',
};

const headerLeft: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
};

const caretStyle: React.CSSProperties = {
  fontSize: 10,
  color: '#6b7280',
  transition: 'transform 0.15s',
};

const actLabelStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: '#111827',
};

const frameBadgeStyle: React.CSSProperties = {
  fontSize: 11,
  color: '#6b7280',
  fontFamily: 'monospace',
  background: '#f3f4f6',
  padding: '2px 6px',
  borderRadius: 4,
};

const bodyStyle: React.CSSProperties = {
  padding: '4px 12px 8px 12px',
};

export const ActTrack: React.FC<ActTrackProps> = ({act, totalFrames, selectedCueId, onSelectCue}) => {
  const [expanded, setExpanded] = useState(true);
  const color = getEnergyColor(act.energy);
  const cues = getCuesForAct(act.actId);

  return (
    <div style={actStyle(color)}>
      <div style={headerStyle} onClick={() => setExpanded(!expanded)}>
        <div style={headerLeft}>
          <span style={{...caretStyle, transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)'}}>▶</span>
          <span style={{display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: color}} />
          <span style={actLabelStyle}>{act.actId} · {act.label}</span>
        </div>
        <span style={frameBadgeStyle}>
          {act.fromFrame}-{act.fromFrame + act.durationInFrames}帧
        </span>
      </div>
      {expanded && (
        <div style={bodyStyle}>
          {cues.length === 0 && (
            <div style={{fontSize: 12, color: '#9ca3af', padding: '8px 0', textAlign: 'center'}}>
              此幕无 cue 数据
            </div>
          )}
          {cues.map((cue) => (
            <CueTrack
              key={cue.elementId}
              cue={cue}
              totalFrames={totalFrames}
              selected={cue.elementId === selectedCueId}
              onClick={onSelectCue}
            />
          ))}
        </div>
      )}
    </div>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add src/tools/components/ActTrack.tsx
git commit -m "feat: add ActTrack collapsible component"
```

---

### Task 5: TimelinePanel — Timeline Container

**Files:**
- Create: `src/tools/components/TimelinePanel.tsx`
- Depends on: ActTrack, data layer

Scrollable container that holds all ActTracks. Includes a time ruler at the top (frame number ticks).

- [ ] **Step 1: Create TimelinePanel.tsx**

```tsx
import React from 'react';
import type {ActBlock} from '../../data/directorScore';
import {getTimelineCues, type TimelineCue} from '../data';
import {ActTrack} from './ActTrack';

interface TimelinePanelProps {
  acts: ActBlock[];
  totalFrames: number;
  fps: number;
  selectedCueId: string | null;
  onSelectCue: (cue: TimelineCue) => void;
  expandedShotId: string | null;
  onToggleShotCamera: (shotId: string | null) => void;
}

const containerStyle: React.CSSProperties = {
  flex: 1,
  overflowY: 'auto',
  padding: '8px 12px',
  background: '#fff',
};

const rulerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'flex-end',
  height: 24,
  marginBottom: 8,
  borderBottom: '1px solid #e5e7eb',
  position: 'relative',
};

const tickStyle: React.CSSProperties = {
  position: 'absolute',
  fontSize: 10,
  color: '#9ca3af',
  fontFamily: 'monospace',
  transform: 'translateX(-50%)',
};

export const TimelinePanel: React.FC<TimelinePanelProps> = ({
  acts,
  totalFrames,
  fps,
  selectedCueId,
  onSelectCue,
}) => {
  // 每 30 帧一个刻度
  const tickInterval = Math.max(30, Math.ceil(totalFrames / 10 / 30) * 30);
  const ticks: number[] = [];
  for (let f = 0; f <= totalFrames; f += tickInterval) {
    ticks.push(f);
  }

  return (
    <div style={containerStyle}>
      {/* 时间标尺 */}
      <div style={rulerStyle}>
        {ticks.map((f) => (
          <span key={f} style={{...tickStyle, left: `${(f / totalFrames) * 100}%`}}>
            {f}f
          </span>
        ))}
      </div>

      {/* 幕列表 */}
      {acts.map((act) => (
        <ActTrack
          key={act.actId}
          act={act}
          totalFrames={totalFrames}
          selectedCueId={selectedCueId}
          onSelectCue={onSelectCue}
        />
      ))}

      {acts.length === 0 && (
        <div style={{textAlign: 'center', padding: 40, color: '#9ca3af', fontSize: 14}}>
          无幕数据
        </div>
      )}
    </div>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add src/tools/components/TimelinePanel.tsx
git commit -m "feat: add TimelinePanel with ruler"
```

---

### Task 6: CameraPathChart — Camera Motion Chart

**Files:**
- Create: `src/tools/components/CameraPathChart.tsx`
- Depends on: data layer

SVG-based chart showing zoom and pan curves over time. One line per axis (zoom, panX, panY). Expandable when a shot is selected.

- [ ] **Step 1: Create CameraPathChart.tsx**

```tsx
import React from 'react';
import type {CameraPathCue} from '../../data/directorScore';

interface CameraPathChartProps {
  path: CameraPathCue[];
  shotId: string;
  totalFrames: number;
}

const CHART_HEIGHT = 80;
const CHART_WIDTH_PCT = 100;
const PADDING = {top: 8, bottom: 16, left: 8, right: 8};

const containerStyle: React.CSSProperties = {
  marginTop: 8,
  marginBottom: 8,
  padding: 8,
  background: '#f9fafb',
  borderRadius: 6,
  border: '1px solid #e5e7eb',
};

const titleStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: '#6b7280',
  marginBottom: 4,
  fontFamily: 'monospace',
};

export const CameraPathChart: React.FC<CameraPathChartProps> = ({path, shotId, totalFrames}) => {
  if (!path.length) {
    return (
      <div style={containerStyle}>
        <div style={titleStyle}>{shotId} · 无摄像机路径</div>
      </div>
    );
  }

  const maxFrame = Math.max(...path.map((p) => p.atFrame), 1);
  const maxZoom = Math.max(...path.map((p) => p.zoom ?? 1), 1);
  const maxPan = Math.max(
    ...path.map((p) => Math.abs(p.panX ?? 0)),
    ...path.map((p) => Math.abs(p.panY ?? 0)),
    1
  );

  const toX = (frame: number) => (frame / maxFrame) * (CHART_WIDTH_PCT - PADDING.left - PADDING.right);
  const toY = (val: number, max: number) => CHART_HEIGHT - PADDING.bottom - ((val / max) * (CHART_HEIGHT - PADDING.top - PADDING.bottom));

  const makeLine = (getVal: (p: CameraPathCue) => number, max: number, color: string) => {
    const points = path.map((p) => `${toX(p.atFrame)},${toY(getVal(p), max)}`).join(' ');
    return <polyline points={points} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" />;
  };

  return (
    <div style={containerStyle}>
      <div style={titleStyle}>{shotId} · 摄像机路径 (zoom/pan)</div>
      <svg
        viewBox={`0 0 ${CHART_WIDTH_PCT} ${CHART_HEIGHT}`}
        style={{width: '100%', height: CHART_HEIGHT, fontFamily: 'monospace'}}
      >
        {/* 网格线 */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
          <line
            key={`g-${ratio}`}
            x1={PADDING.left}
            y1={toY(ratio, 1) /* reuse scale */}
            x2={CHART_WIDTH_PCT - PADDING.right}
            y2={toY(ratio, 1)}
            stroke="#e5e7eb"
            strokeWidth={0.5}
          />
        ))}
        {/* zoom 曲线 */}
        {makeLine((p) => (p.zoom ?? 1) - 1, maxZoom - 1, '#3b82f6')}
        {/* panX 曲线 */}
        {makeLine((p) => Math.abs(p.panX ?? 0) / maxPan * maxPan, maxPan, '#10b981')}
        {/* panY 曲线 */}
        {makeLine((p) => Math.abs(p.panY ?? 0) / maxPan * maxPan, maxPan, '#f59e0b')}
        {/* 关键帧标记 */}
        {path.map((p, i) => (
          <circle key={i} cx={toX(p.atFrame)} cy={CHART_HEIGHT - PADDING.bottom} r={2} fill="#9ca3af" />
        ))}
      </svg>
      <div style={{display: 'flex', gap: 16, fontSize: 10, color: '#6b7280', marginTop: 2}}>
        <span><span style={{color: '#3b82f6'}}>━</span> zoom</span>
        <span><span style={{color: '#10b981'}}>━</span> panX</span>
        <span><span style={{color: '#f59e0b'}}>━</span> panY</span>
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add src/tools/components/CameraPathChart.tsx
git commit -m "feat: add CameraPathChart SVG component"
```

---

### Task 7: DetailPanel — Property Panel

**Files:**
- Create: `src/tools/components/DetailPanel.tsx`
- Depends on: data layer

Right-side panel showing details of the selected cue. Displays animation parameters, easing, effect preset, camera path, and validation status. When nothing is selected, shows a placeholder.

- [ ] **Step 1: Create DetailPanel.tsx**

```tsx
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
  const raw = selectedCue.raw as Record<string, unknown>;

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
```

- [ ] **Step 2: Commit**

```bash
git add src/tools/components/DetailPanel.tsx
git commit -m "feat: add DetailPanel with cue properties and validation"
```

---

### Task 8: TimelineFooter — Zoom + Markers

**Files:**
- Create: `src/tools/components/TimelineFooter.tsx`

Bottom bar with zoom slider and timeline marker indicators.

- [ ] **Step 1: Create TimelineFooter.tsx**

```tsx
import React from 'react';
import type {DirectorScore} from '../../data/directorScore';

interface TimelineFooterProps {
  score: DirectorScore;
  zoom: number;
  onZoomChange: (zoom: number) => void;
}

const footerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '8px 12px',
  background: '#f3f4f6',
  borderTop: '1px solid #e5e7eb',
  fontSize: 12,
  color: '#6b7280',
  fontFamily: 'system-ui, sans-serif',
};

const markerStyle = (type: string): React.CSSProperties => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  marginLeft: 12,
  fontSize: 11,
  color: type === 'transition' ? '#dc2626' : type === 'emphasis' ? '#d97706' : '#3b82f6',
});

export const TimelineFooter: React.FC<TimelineFooterProps> = ({score, zoom, onZoomChange}) => {
  // 收集所有标记（去重）
  const allMarkers = new Map<string, {label: string; type: string}>();
  for (const act of score.acts) {
    for (const shot of act.shots) {
      for (const m of shot.timelineMarkers ?? []) {
        if (!allMarkers.has(m.label)) {
          allMarkers.set(m.label, {label: m.label, type: m.type});
        }
      }
    }
  }

  return (
    <div style={footerStyle}>
      <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
        <span style={{cursor: 'pointer'}} onClick={() => onZoomChange(Math.max(0.5, zoom - 0.2))}>🔍−</span>
        <div style={{width: 100, height: 4, background: '#e5e7eb', borderRadius: 2, position: 'relative'}}>
          <div style={{width: `${(zoom - 0.5) / 3.5 * 100}%`, height: '100%', background: '#3b82f6', borderRadius: 2}} />
        </div>
        <span style={{cursor: 'pointer'}} onClick={() => onZoomChange(Math.min(4, zoom + 0.2))}>🔍+</span>
        <input
          type="range"
          min={0.5}
          max={4}
          step={0.1}
          value={zoom}
          onChange={(e) => onZoomChange(Number(e.target.value))}
          style={{width: 80, height: 4, margin: 0}}
        />
      </div>
      <div style={{display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 2}}>
        {Array.from(allMarkers.values()).map((m) => (
          <span key={m.label} style={markerStyle(m.type)}>
            ◆ {m.label}
          </span>
        ))}
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add src/tools/components/TimelineFooter.tsx
git commit -m "feat: add TimelineFooter with zoom and markers"
```

---

### Task 9: PreviewPlayer — Remotion Animation Preview

**Files:**
- Create: `src/tools/remotion/PreviewComposition.tsx`
- Create: `src/tools/components/PreviewPlayer.tsx`
- Depends on: `@remotion/player`, DirectorScoreOrchestrator

Wraps `DirectorScoreOrchestrator` + `scoreToSequences` into a Remotion `<Composition>` for use with `<Player>`.

- [ ] **Step 1: Create PreviewComposition.tsx**

```tsx
import React, {useMemo} from 'react';
import {useCurrentFrame, useVideoConfig} from 'remotion';
import type {SequenceConfig} from '../../data/directorScore';

interface PreviewCompositionProps {
  sequences: SequenceConfig[];
}

/**
 * 在 Remotion Player 内渲染的 Composition 包装。
 * DirectorScoreOrchestrator 需要帧号和序列列表即可渲染。
 */
export const PreviewComposition: React.FC<PreviewCompositionProps> = ({sequences}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  // 动态导入避免循环依赖
  const Orchestrator = React.lazy(
    () => import('../../components/ultimate-kit/DirectorScoreOrchestrator')
  );

  const elementRenderMap = useMemo(() => new Map(), []);

  return (
    <React.Suspense fallback={<div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#6b7280', fontFamily: 'sans-serif'}}>Loading...</div>}>
      <Orchestrator
        sequences={sequences}
        frame={frame}
        fps={fps}
        elementRenderMap={elementRenderMap}
      />
    </React.Suspense>
  );
};
```

- [ ] **Step 2: Create PreviewPlayer.tsx**

```tsx
import React from 'react';
import {Player} from '@remotion/player';
import type {SequenceConfig} from '../../data/directorScore';
import {PreviewComposition} from '../remotion/PreviewComposition';

interface PreviewPlayerProps {
  sequences: SequenceConfig[];
  totalFrames: number;
  fps: number;
}

const containerStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  background: '#111827',
  borderRadius: 6,
  overflow: 'hidden',
};

const playerWrapper: React.CSSProperties = {
  width: '100%',
  maxWidth: 480,
  aspectRatio: '16 / 9',
};

export const PreviewPlayer: React.FC<PreviewPlayerProps> = ({sequences, totalFrames, fps}) => {
  return (
    <div style={containerStyle}>
      <div style={playerWrapper}>
        <Player
          component={PreviewComposition}
          inputProps={{sequences}}
          durationInFrames={totalFrames}
          compositionWidth={1920}
          compositionHeight={1080}
          fps={fps}
          controls
          style={{width: '100%', height: '100%'}}
        />
      </div>
    </div>
  );
};
```

- [ ] **Step 3: Verify build**

Run: `cd remotion-video && npx tsc --noEmit 2>&1 | tail -5`
Expected: no errors (the `React.lazy` dynamic import should resolve)

- [ ] **Step 4: Commit**

```bash
git add src/tools/remotion/PreviewComposition.tsx src/tools/components/PreviewPlayer.tsx
git commit -m "feat: add PreviewPlayer with Remotion Player integration"
```

---

### Task 10: Root Assembly — DirectorScorePreview

**Files:**
- Create: `src/tools/DirectorScorePreview.tsx`
- Modify: `remotion-video/package.json` — add preview script

Assembles all components into a single page. Manages state (selected cue, zoom, tab).

- [ ] **Step 1: Create DirectorScorePreview.tsx**

```tsx
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
  const [expandedShotId, setExpandedShotId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('details');
  const [zoom, setZoom] = useState(1);

  const handleSelectCue = useCallback((cue: TimelineCue) => {
    setSelectedCueId(cue.elementId);
    setSelectedCue(cue);
    setActiveTab('details');
  }, []);

  const handleExpandCamera = useCallback((shotId: string | null) => {
    setExpandedShotId((prev) => (prev === shotId ? null : shotId));
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
          fps={SCORE.fps}
          selectedCueId={selectedCueId}
          onSelectCue={handleSelectCue}
          expandedShotId={expandedShotId}
          onToggleShotCamera={handleExpandCamera}
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

// ── CLI 入口 ──
if (typeof document !== 'undefined') {
  const root = document.getElementById('root');
  if (root) {
    const {createRoot} = require('react-dom/client');
    createRoot(root).render(<DirectorScorePreview />);
  }
}
```

- [ ] **Step 2: Add preview script to package.json**

Edit `package.json` to add the `"preview"` script:

```json
"preview": "npx tsx src/tools/DirectorScorePreview.tsx"
```

- [ ] **Step 3: Verify type check**

Run: `cd remotion-video && npx tsc --noEmit 2>&1`
Expected: exit code 0 (no errors)

- [ ] **Step 4: Commit**

```bash
git add src/tools/DirectorScorePreview.tsx package.json
git commit -m "feat: add DirectorScorePreview root component"
```

---

### Task 11: Global Styles + HTML Entry

**Files:**
- Create: `src/tools/index.html`
- Create: `src/tools/global.css`

Minimal HTML shell and global styles for the standalone page.

- [ ] **Step 1: Create index.html**

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>DirectorScore Preview</title>
  <link rel="stylesheet" href="./global.css" />
</head>
<body>
  <div id="root"></div>
  <script type="module" src="./DirectorScorePreview.tsx"></script>
</body>
</html>
```

- [ ] **Step 2: Create global.css**

```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body, #root {
  height: 100%;
  width: 100%;
  overflow: hidden;
}

body {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* 自定义滚动条 */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: #d1d5db;
  border-radius: 3px;
}
::-webkit-scrollbar-thumb:hover {
  background: #9ca3af;
}

/* Remotion Player 覆盖 */
.css-1c6s3fv, .css-1v8p4kz {
  font-family: system-ui, sans-serif !important;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/tools/index.html src/tools/global.css
git commit -m "feat: add HTML entry and global styles for preview tool"
```
