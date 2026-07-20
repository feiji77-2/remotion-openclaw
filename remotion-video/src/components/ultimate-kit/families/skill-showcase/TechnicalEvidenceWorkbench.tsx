import React from 'react';
import {AbsoluteFill, Easing, interpolate} from 'remotion';
import {TechExplainerHero} from './TechExplainerHero';
import type {SkillShowcaseBeat, TechnicalWorkbenchEvidence, TechnicalWorkbenchLens, TechnicalWorkbenchSession, TechnicalWorkbenchStep} from './types';

const FONT = '"PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", Inter, system-ui, sans-serif';
const MONO = '"SFMono-Regular", "JetBrains Mono", Menlo, Consolas, monospace';
const clamp = {extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const};
const ease = Easing.bezier(0.16, 1, 0.3, 1);

const beatProgress = (frame: number, beat: SkillShowcaseBeat) => Math.max(0, Math.min(1, (
  frame - beat.startFrame
) / Math.max(1, beat.endFrame - beat.startFrame)));

const reveal = (p: number, from: number, to: number) => interpolate(p, [from, to], [0, 1], {...clamp, easing: ease});

const sourceColor = (source: TechnicalWorkbenchEvidence['source'], accent: string) => (
  source === 'script' ? accent : source === 'derived' ? '#ffc44d' : '#8d98aa'
);

const WindowFrame: React.FC<{
  session: TechnicalWorkbenchSession;
  accent: string;
  secondary: string;
  p: number;
  children: React.ReactNode;
}> = ({session, accent, secondary, p, children}) => {
  const enter = reveal(p, 0, 0.14);
  const phases = ['CONTEXT', 'ACTION', 'REACTION', 'EVIDENCE'];
  const active = Math.min(3, Math.floor(p * 4));
  return (
    <div style={{position: 'absolute', left: 54, right: 54, top: 40, bottom: 54, borderRadius: 18, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.14)', background: '#070b12', boxShadow: `0 32px 100px rgba(0,0,0,.55),0 0 44px ${accent}18`, opacity: enter, transform: `translateY(${interpolate(enter, [0, 1], [32, 0])}px) scale(${interpolate(enter, [0, 1], [0.98, 1])})`, fontFamily: FONT}}>
      <div style={{height: 64, display: 'flex', alignItems: 'center', padding: '0 20px', gap: 9, borderBottom: '1px solid rgba(255,255,255,.09)', background: '#0a0f18'}}>
        {['#ff5f57', '#febc2e', '#28c840'].map((color) => <div key={color} style={{width: 11, height: 11, borderRadius: '50%', background: color}} />)}
        <div style={{marginLeft: 12}}>
          <div style={{fontFamily: MONO, fontSize: 15, color: '#edf3ff', fontWeight: 800}}>{session.title}</div>
          <div style={{fontFamily: MONO, fontSize: 12, color: 'rgba(255,255,255,.4)', marginTop: 3}}>{session.context}</div>
        </div>
        <div style={{marginLeft: 'auto', display: 'flex', gap: 5}}>
          {phases.map((phase, index) => <div key={phase} style={{padding: '7px 9px', border: `1px solid ${index === active ? accent : '#273142'}`, color: index === active ? accent : '#667287', fontFamily: MONO, fontSize: 10, fontWeight: 900}}>{phase}</div>)}
        </div>
      </div>
      <div style={{position: 'absolute', left: 0, right: 0, top: 64, bottom: 0}}>{children}</div>
      <div style={{position: 'absolute', left: 0, top: 62, width: `${p * 100}%`, height: 2, background: `linear-gradient(90deg, ${secondary}, ${accent})`}} />
    </div>
  );
};

const EvidenceRail: React.FC<{items: TechnicalWorkbenchEvidence[]; accent: string; p: number}> = ({items, accent, p}) => (
  <div style={{display: 'grid', gap: 10}}>
    {items.map((item, index) => {
      const shown = reveal(p, 0.58 + index * 0.07, 0.72 + index * 0.07);
      const color = item.status === 'fail' ? '#ff617c' : item.status === 'pass' ? '#45e28d' : accent;
      return <div key={`${item.label}-${index}`} style={{minHeight: 70, padding: '13px 15px', border: `1px solid ${color}55`, borderLeft: `4px solid ${color}`, background: `${color}0c`, opacity: shown, transform: `translateX(${interpolate(shown, [0, 1], [18, 0])}px)`}}>
        <div style={{display: 'flex', justifyContent: 'space-between', gap: 12, fontFamily: MONO, fontSize: 10, letterSpacing: .8}}><span style={{color: 'rgba(255,255,255,.46)'}}>{item.label}</span><span style={{color: sourceColor(item.source, accent)}}>{item.source.toUpperCase()}</span></div>
        <div style={{fontFamily: MONO, fontSize: 18, lineHeight: 1.15, color: '#fff', marginTop: 9, fontWeight: 900}}>{item.value}</div>
      </div>;
    })}
  </div>
);

const CodeLines: React.FC<{lines: string[]; accent: string; p: number; from?: number; mode?: 'normal' | 'add' | 'remove'}> = ({lines, accent, p, from = 0.2, mode = 'normal'}) => (
  <div style={{fontFamily: MONO, fontSize: 15, lineHeight: 1.72}}>
    {lines.map((line, index) => {
      const shown = reveal(p, from + index * 0.04, from + 0.13 + index * 0.04);
      const color = mode === 'add' ? '#7fffb8' : mode === 'remove' ? '#ff91a2' : '#d9e2f0';
      return <div key={`${line}-${index}`} style={{display: 'grid', gridTemplateColumns: '30px 1fr', minHeight: 27, opacity: shown, background: mode === 'add' ? 'rgba(69,226,141,.06)' : mode === 'remove' ? 'rgba(255,95,117,.06)' : 'transparent', borderLeft: `2px solid ${mode === 'normal' ? 'transparent' : color}`, color}}><span style={{color: '#4f5b70', textAlign: 'right', paddingRight: 10}}>{index + 1}</span><span>{mode === 'add' ? '+ ' : mode === 'remove' ? '- ' : ''}{line}</span></div>;
    })}
  </div>
);

const fallbackLensByKind: Record<TechnicalWorkbenchSession['kind'], TechnicalWorkbenchLens> = {
  'ide-terminal': 'source-diff',
  'audit-trace': 'live-scan',
  'prompt-pipeline': 'skill-gate',
  'design-system-lab': 'token-assembly',
  'architecture-workspace': 'system-graph',
};

const clipped = (value: string, length = 34) => value.length > length ? `${value.slice(0, length - 1)}…` : value;

const lensChromeMode: Record<TechnicalWorkbenchLens, 'editor' | 'blueprint' | 'hud' | 'surface'> = {
  'source-diff': 'editor',
  'terminal-run': 'editor',
  'manifest-resolve': 'blueprint',
  'design-inspector': 'surface',
  'rule-counter': 'hud',
  'category-index': 'blueprint',
  'live-scan': 'surface',
  'snapshot-compare': 'surface',
  'repo-signal': 'hud',
  'direction-picker': 'surface',
  'style-lock': 'editor',
  'anchor-map': 'blueprint',
  'deny-list': 'hud',
  'skill-gate': 'blueprint',
  'knowledge-vault': 'blueprint',
  'catalog-metrics': 'hud',
  'token-assembly': 'surface',
  'scenario-switch': 'surface',
  'blank-audit': 'editor',
  'brand-pack': 'blueprint',
  'brand-style-map': 'surface',
  'system-graph': 'blueprint',
};

const TechnicalHeroShell: React.FC<{
  session: TechnicalWorkbenchSession;
  lens: TechnicalWorkbenchLens;
  accent: string;
  secondary: string;
  p: number;
  children: React.ReactNode;
}> = ({session, lens, accent, secondary, p, children}) => {
  const mode = lensChromeMode[lens];
  const enter = reveal(p, 0, 0.14);
  const activePhase = ['context', 'inspect', 'transform', 'proof'][Math.min(3, Math.floor(p * 4))];
  const base: React.CSSProperties = {
    position: 'absolute',
    overflow: 'hidden',
    opacity: enter,
    transform: `translateY(${interpolate(enter, [0, 1], [34, 0])}px) scale(${interpolate(enter, [0, 1], [0.975, 1])})`,
    fontFamily: FONT,
  };
  const shells: Record<typeof mode, React.CSSProperties> = {
    editor: {
      ...base,
      left: 54,
      right: 54,
      top: 34,
      bottom: 44,
      borderRadius: 17,
      border: '1px solid rgba(255,255,255,0.15)',
      background: '#070b12',
      boxShadow: `0 30px 100px rgba(0,0,0,.55), 0 0 46px ${accent}18`,
    },
    blueprint: {
      ...base,
      left: 28,
      right: 28,
      top: 10,
      bottom: 22,
      borderRadius: 0,
      border: `1px solid ${accent}30`,
      background: `radial-gradient(circle at 50% 48%, ${accent}12, transparent 42%), linear-gradient(135deg, rgba(255,255,255,.025), rgba(255,255,255,.005))`,
      boxShadow: `inset 0 0 70px rgba(0,0,0,.45), 0 0 55px ${accent}12`,
    },
    hud: {
      ...base,
      left: 10,
      right: 10,
      top: 0,
      bottom: 10,
      borderRadius: 0,
      border: '0 solid transparent',
      background: `radial-gradient(circle at 50% 45%, ${accent}16, transparent 38%)`,
      boxShadow: 'none',
    },
    surface: {
      ...base,
      left: 42,
      right: 42,
      top: 24,
      bottom: 34,
      borderRadius: 10,
      border: '1px solid rgba(255,255,255,.10)',
      background: `linear-gradient(180deg, rgba(12,18,29,.86), rgba(5,9,15,.94)), radial-gradient(circle at 74% 20%, ${secondary}14, transparent 34%)`,
      boxShadow: `0 28px 80px rgba(0,0,0,.42), inset 0 0 44px ${accent}0f`,
    },
  };
  return (
    <div style={shells[mode]}>
      {mode === 'editor' ? (
        <div style={{position: 'absolute', left: 0, right: 0, top: 0, height: 48, display: 'flex', alignItems: 'center', padding: '0 18px', gap: 9, borderBottom: '1px solid rgba(255,255,255,.08)', background: '#0a0f18'}}>
          {['#ff5f57', '#febc2e', '#28c840'].map((color) => <div key={color} style={{width: 10, height: 10, borderRadius: '50%', background: color}} />)}
          <div style={{marginLeft: 11, fontFamily: MONO, fontSize: 12, color: '#dfe7f4', fontWeight: 850}}>{session.title}</div>
          <div style={{marginLeft: 'auto', fontFamily: MONO, fontSize: 10, letterSpacing: 1, color: accent}}>{lens}</div>
        </div>
      ) : (
        <>
          <div style={{position: 'absolute', left: mode === 'hud' ? 46 : 22, top: mode === 'hud' ? 28 : 18, height: 2, width: 130, background: `linear-gradient(90deg, ${accent}, transparent)`}} />
          <div style={{position: 'absolute', right: mode === 'hud' ? 46 : 22, top: mode === 'hud' ? 28 : 18, fontFamily: MONO, fontSize: 10, color: mode === 'surface' ? 'rgba(255,255,255,.42)' : `${secondary}`, letterSpacing: 1.1}}>{activePhase.toUpperCase()} / {lens.toUpperCase()}</div>
          {mode === 'blueprint' ? <svg width="100%" height="100%" viewBox="0 0 900 760" style={{position: 'absolute', inset: 0, opacity: .32}}>
            <path d="M40 610 C220 470 260 220 430 292 C610 366 608 150 830 72" fill="none" stroke={accent} strokeWidth="1.4" strokeDasharray="10 18" />
            <path d="M74 92 L826 655" fill="none" stroke={secondary} strokeWidth="1" opacity=".55" />
            <path d="M120 680 L800 680" fill="none" stroke="rgba(255,255,255,.16)" strokeWidth="1" />
          </svg> : null}
        </>
      )}
      <div style={{position: 'absolute', left: 0, right: 0, top: mode === 'editor' ? 48 : 0, bottom: 0}}>
        {children}
      </div>
      <div style={{position: 'absolute', left: mode === 'hud' ? 74 : 0, right: mode === 'hud' ? 74 : 0, bottom: mode === 'hud' ? 26 : 0, height: 2, background: `linear-gradient(90deg, ${secondary}, ${accent})`, transform: `scaleX(${Math.max(.02, p)})`, transformOrigin: 'left center', opacity: .78}} />
    </div>
  );
};

const LensTitle: React.FC<{step: TechnicalWorkbenchStep; accent: string; label: string}> = ({step, accent, label}) => (
  <div style={{fontFamily: MONO}}>
    <div style={{fontSize: 11, letterSpacing: 1, color: accent}}>{label}</div>
    <div style={{marginTop: 9, color: '#f4f7ff', fontSize: 22, lineHeight: 1.18, fontWeight: 950}}>{step.objective}</div>
  </div>
);

const MiniPanel: React.FC<{title: string; children: React.ReactNode; accent?: string}> = ({title, children, accent}) => (
  <div style={{border: `1px solid ${accent ? `${accent}55` : 'rgba(255,255,255,.09)'}`, background: '#080e17', padding: 14, minHeight: 0}}>
    <div style={{fontFamily: MONO, fontSize: 10, letterSpacing: .8, color: accent ?? '#728096', marginBottom: 12}}>{title}</div>
    {children}
  </div>
);

const LensCode: React.FC<{step: TechnicalWorkbenchStep; accent: string; p: number}> = ({step, accent, p}) => (
  <div style={{display: 'grid', gridTemplateColumns: step.before?.length ? '1fr 1fr' : '1fr', gap: 12}}>
    {step.before?.length ? <MiniPanel title="BEFORE" accent="#ff617c"><CodeLines lines={step.before} accent={accent} p={p} mode="remove" from={.16} /></MiniPanel> : null}
    <MiniPanel title="AFTER / OBSERVED" accent={accent}><CodeLines lines={step.after ?? step.logs ?? [step.objective]} accent={accent} p={p} mode={step.after?.length ? 'add' : 'normal'} from={.24} /></MiniPanel>
  </div>
);

const LensTerminal: React.FC<{step: TechnicalWorkbenchStep; accent: string; secondary: string; p: number}> = ({step, accent, secondary, p}) => {
  const command = step.command ?? `run ${step.actionLabel}`;
  const typed = command.slice(0, Math.floor(command.length * reveal(p, .08, .3)));
  const rows = [typed, ...(step.logs ?? []), ...(step.after ?? []).slice(0, 2)];
  return <div style={{height: '100%', padding: 26, display: 'grid', gridTemplateRows: 'auto 1fr auto', gap: 18}}>
    <LensTitle step={step} accent={accent} label="TERMINAL REPLAY / FRAME-BOUND" />
    <div style={{border: '1px solid rgba(255,255,255,.1)', background: '#03070c', padding: 22, fontFamily: MONO, overflow: 'hidden', boxShadow: `inset 0 0 44px ${accent}10`}}>
      {rows.map((row, index) => {
        const shown = reveal(p, .16 + index * .08, .31 + index * .08);
        return <div key={`${row}-${index}`} style={{height: 44, color: index === 0 ? '#fff' : index === rows.length - 1 ? '#7fffb8' : '#aeb9ca', opacity: shown, transform: `translateX(${interpolate(shown, [0, 1], [-18, 0])}px)`, fontSize: index === 0 ? 21 : 15}}>
          <span style={{color: index === 0 ? secondary : accent}}>{index === 0 ? '➜' : index === rows.length - 1 ? '✓' : '·'}</span> {row}
          {index === 0 ? <span style={{display: 'inline-block', width: 10, height: 22, marginLeft: 5, background: accent, verticalAlign: -4, opacity: Math.floor(p * 18) % 2 ? .25 : 1}} /> : null}
        </div>;
      })}
    </div>
    <EvidenceRail items={step.evidence} accent={accent} p={p} />
  </div>;
};

const ManifestLens: React.FC<{step: TechnicalWorkbenchStep; accent: string; secondary: string; p: number}> = ({step, accent, secondary, p}) => {
  const files = ['skills.yml', step.file ?? 'contract.json', 'prompt.md', 'output.spec'];
  return <div style={{height: '100%', position: 'relative', padding: 28}}>
    <LensTitle step={step} accent={accent} label="MANIFEST RESOLVE / PRODUCT CONTRACT" />
    <svg width="100%" height="100%" viewBox="0 0 820 720" style={{position: 'absolute', left: 0, top: 74}}>
      {files.map((_, index) => {
        const x = [120, 640, 180, 600][index];
        const y = [86, 126, 430, 470][index];
        const line = reveal(p, .18 + index * .08, .38 + index * .08);
        return <line key={index} x1={410} y1={300} x2={x} y2={y} stroke={index % 2 ? secondary : accent} strokeWidth="3" strokeDasharray={`${line * 360} 420`} opacity=".75" />;
      })}
    </svg>
    <div style={{position: 'absolute', left: 330, top: 310, width: 230, height: 150, border: `1px solid ${accent}`, display: 'grid', placeItems: 'center', background: '#081019', boxShadow: `0 0 38px ${accent}28`, opacity: reveal(p, .12, .28)}}>
      <div style={{fontFamily: MONO, color: '#fff', fontWeight: 950, fontSize: 19, textAlign: 'center'}}>SKILL<br />CONTRACT</div>
    </div>
    {files.map((file, index) => {
      const shown = reveal(p, .2 + index * .08, .36 + index * .08);
      return <div key={file} style={{position: 'absolute', left: [72, 640, 116, 610][index], top: [210, 250, 555, 590][index], width: 190, minHeight: 72, padding: 14, border: `1px solid ${index % 2 ? secondary : accent}88`, background: '#090f18', color: '#eaf0fb', fontFamily: MONO, opacity: shown, transform: `scale(${interpolate(shown, [0, 1], [.86, 1])})`}}>
        <div style={{fontSize: 10, color: index % 2 ? secondary : accent}}>FILE / 0{index + 1}</div>
        <div style={{fontSize: 14, marginTop: 8, fontWeight: 900}}>{file}</div>
      </div>;
    })}
    <div style={{position: 'absolute', right: 28, bottom: 26, width: 310}}><EvidenceRail items={step.evidence} accent={accent} p={p} /></div>
  </div>;
};

const InspectorLens: React.FC<{step: TechnicalWorkbenchStep; accent: string; secondary: string; p: number}> = ({step, accent, secondary, p}) => (
  <div style={{height: '100%', padding: 26, display: 'grid', gridTemplateColumns: '1fr 260px', gap: 18}}>
    <div style={{position: 'relative'}}>
      <LensTitle step={step} accent={accent} label="DESIGN INSPECTOR / REAL SURFACE" />
      <div style={{position: 'absolute', left: 18, right: 0, top: 110, height: 515, border: '1px solid rgba(255,255,255,.13)', background: '#101722', padding: 24}}>
        <div style={{height: 52, border: '1px solid #2d384a', padding: 14}}><div style={{width: '42%', height: 8, background: '#e8eef6'}} /></div>
        <div style={{display: 'grid', gridTemplateColumns: '1.1fr .9fr', gap: 18, marginTop: 20}}>
          <div style={{height: 350, border: '1px solid #2b3548', padding: 18}}>
            {Array.from({length: 5}).map((_, index) => <div key={index} style={{height: 9, width: `${76 - index * 8}%`, marginTop: index ? 22 : 0, background: index === 2 ? secondary : '#6f7d90'}} />)}
          </div>
          <div style={{height: 350, border: `1px solid ${accent}`, boxShadow: `0 0 32px ${accent}20`, padding: 18, transform: `translateY(${interpolate(reveal(p, .2, .42), [0, 1], [22, 0])}px)`}}>
            <div style={{width: 54, height: 54, borderRadius: 10, background: accent}} />
            <div style={{height: 9, width: '72%', marginTop: 30, background: '#e3eaf4'}} />
            <div style={{height: 8, width: '88%', marginTop: 16, background: '#4c596d'}} />
          </div>
        </div>
        <div style={{position: 'absolute', left: 330, top: 205, width: 210, padding: 14, border: `1px solid ${secondary}`, background: '#060b12', color: '#fff', fontSize: 13, opacity: reveal(p, .45, .6)}}>{step.target ?? step.actionLabel}</div>
      </div>
    </div>
    <div style={{paddingTop: 112}}><EvidenceRail items={step.evidence} accent={accent} p={p} /></div>
  </div>
);

const RuleCounterLens: React.FC<{step: TechnicalWorkbenchStep; accent: string; secondary: string; p: number}> = ({step, accent, secondary, p}) => {
  const value = step.evidence.find((item) => /\d/.test(item.value))?.value ?? '37';
  const labels = ['命名', '色彩', '布局', '解释', '对比', '扫描', '层级', 'WCAG'];
  return <div style={{height: '100%', position: 'relative', padding: 24}}>
    <LensTitle step={step} accent={accent} label="RULE COUNTER / LIVE REGISTRY" />
    <svg width="760" height="610" viewBox="0 0 760 610" style={{position: 'absolute', left: 58, top: 120}}>
      {[132, 210, 288].map((r, ringIndex) => <circle key={r} cx="380" cy="310" r={r} fill="none" stroke={ringIndex === 1 ? accent : '#263143'} strokeWidth={ringIndex === 1 ? 5 : 2} strokeDasharray={ringIndex === 1 ? `${reveal(p,.16,.52) * 900} 1000` : '16 18'} opacity={ringIndex === 0 ? .18 : .78} />)}
      {labels.map((label, index) => {
        const a = (-90 + index * 45) * Math.PI / 180;
        const x = 380 + Math.cos(a) * 250;
        const y = 310 + Math.sin(a) * 250;
        return <g key={label} opacity={reveal(p, .22 + index * .035, .42 + index * .035)}>
          <circle cx={x} cy={y} r={index % 2 ? 7 : 10} fill={index % 2 ? secondary : accent} />
          <text x={x + 16} y={y + 4} fill="#f6f8ff" fontSize="15" fontFamily={MONO}>{label}</text>
        </g>;
      })}
    </svg>
    <div style={{position: 'absolute', left: 344, top: 360, width: 210, height: 210, borderRadius: '50%', border: `4px solid ${accent}`, display: 'grid', placeItems: 'center', color: accent, fontFamily: MONO, fontSize: 76, fontWeight: 950, boxShadow: `0 0 54px ${accent}28`, opacity: reveal(p,.12,.32)}}>{value}</div>
    <div style={{position: 'absolute', right: 28, bottom: 28, width: 300}}><EvidenceRail items={step.evidence} accent={accent} p={p} /></div>
  </div>;
};

const NetworkLens: React.FC<{step: TechnicalWorkbenchStep; accent: string; secondary: string; p: number; mode: 'category' | 'system'}> = ({step, accent, secondary, p, mode}) => {
  const nodes = (step.after?.length ? step.after : step.evidence.map((item) => item.value)).slice(0, mode === 'category' ? 8 : 6);
  const positions = mode === 'category'
    ? [[80,180],[280,90],[560,120],[700,300],[540,500],[280,570],[80,450],[400,330]]
    : [[70,150],[310,90],[560,170],[140,470],[370,420],[610,540]];
  return <div style={{height: '100%', position: 'relative', padding: 26}}>
    <LensTitle step={step} accent={accent} label={mode === 'category' ? 'CATEGORY INDEX / QUERY GRAPH' : 'SYSTEM GRAPH / REUSABLE PATH'} />
    <svg width="100%" height="100%" viewBox="0 0 860 720" style={{position: 'absolute', left: 0, top: 80}}>
      {positions.slice(0, nodes.length).map(([x, y], index) => {
        const next = positions[(index + 1) % nodes.length];
        const line = reveal(p, .18 + index * .04, .36 + index * .04);
        return <line key={index} x1={x + 70} y1={y + 28} x2={next[0] + 70} y2={next[1] + 28} stroke={index % 2 ? secondary : accent} strokeWidth="2" strokeDasharray={`${line * 260} 320`} opacity=".7" />;
      })}
    </svg>
    {nodes.map((node, index) => {
      const [x, y] = positions[index];
      const shown = reveal(p, .16 + index * .05, .32 + index * .05);
      return <div key={`${node}-${index}`} style={{position: 'absolute', left: x + 22, top: y + 105, width: mode === 'category' ? 150 : 180, minHeight: 68, padding: 12, border: `1px solid ${index % 2 ? secondary : accent}`, background: '#080e17', color: '#f1f5ff', fontFamily: MONO, opacity: shown, transform: `scale(${interpolate(shown, [0, 1], [.82, 1])})`}}>
        <div style={{fontSize: 9, color: index % 2 ? secondary : accent}}>NODE / {String(index + 1).padStart(2, '0')}</div>
        <div style={{fontSize: 13, lineHeight: 1.25, marginTop: 8, fontWeight: 900}}>{clipped(node, 28)}</div>
      </div>;
    })}
    <div style={{position: 'absolute', right: 28, bottom: 26, width: 310}}><EvidenceRail items={step.evidence} accent={accent} p={p} /></div>
  </div>;
};

const ScanLens: React.FC<{step: TechnicalWorkbenchStep; accent: string; secondary: string; p: number; compare?: boolean}> = ({step, accent, secondary, p, compare = false}) => {
  const scan = interpolate(p, [.16, .66], [120, 560], clamp);
  return <div style={{height: '100%', padding: 26, display: 'grid', gridTemplateColumns: '1fr 280px', gap: 18}}>
    <div style={{position: 'relative'}}>
      <LensTitle step={step} accent={accent} label={compare ? 'SNAPSHOT COMPARE / SAME INPUT' : 'LIVE SCAN / SOURCE-BOUND'} />
      <div style={{position: 'absolute', left: 20, top: 112, width: compare ? 610 : 430, height: 520, border: '1px solid rgba(255,255,255,.12)', background: '#0f1621', overflow: 'hidden', padding: 22}}>
        {compare ? <div style={{position: 'absolute', left: `${interpolate(p,[.14,.7],[12,92],clamp)}%`, top: 0, bottom: 0, width: 2, background: accent, boxShadow: `0 0 20px ${accent}`}} /> : <div style={{position: 'absolute', left: 0, right: 0, top: scan, height: 4, background: `linear-gradient(90deg,transparent,${accent},#fff,transparent)`, boxShadow: `0 0 24px ${accent}`}} />}
        <div style={{height: 58, border: '1px solid #2d384a', padding: 16}}><div style={{height: 8, width: '45%', background: '#e4eaf5'}} /></div>
        <div style={{display: 'grid', gridTemplateColumns: compare ? '1fr 1fr' : '1fr', gap: 14, marginTop: 18}}>
          {Array.from({length: compare ? 2 : 4}).map((_, index) => <div key={index} style={{height: compare ? 330 : 90, border: `1px solid ${index === 1 || !compare && index === 2 ? secondary : '#2e3a4d'}`, background: compare && index === 1 ? `${accent}12` : '#121a26', padding: 14, opacity: reveal(p, .18 + index * .08, .34 + index * .08)}}>
            <div style={{width: 42, height: 42, borderRadius: 8, background: index % 2 ? accent : secondary}} />
            <div style={{height: 7, width: '72%', marginTop: 18, background: '#aab4c3'}} />
            <div style={{height: 6, width: '88%', marginTop: 11, background: '#4d596b'}} />
          </div>)}
        </div>
      </div>
    </div>
    <div style={{paddingTop: 110}}><EvidenceRail items={step.evidence} accent={accent} p={p} /></div>
  </div>;
};

const PipelineLens: React.FC<{step: TechnicalWorkbenchStep; accent: string; secondary: string; p: number; variant: 'repo' | 'direction' | 'lock' | 'anchor' | 'deny' | 'gate'}> = ({step, accent, secondary, p, variant}) => {
  const base = step.after ?? step.logs ?? [step.objective];
  const labels = variant === 'direction' ? ['Swiss', 'RAW', 'Nordic', 'Neo', 'Brutal', 'Editorial'] : variant === 'deny' ? ['purple gradient', 'center stack', 'generic SaaS', 'random style'] : base.slice(0, 6);
  if (variant === 'repo') {
    const stars = step.evidence.find((item) => /\d/.test(item.value))?.value ?? '22K';
    return <div style={{height: '100%', padding: 28, display: 'grid', gridTemplateColumns: '1.05fr .95fr', gap: 22}}>
      <div style={{position: 'relative'}}>
        <LensTitle step={step} accent={accent} label="REPO SIGNAL / OPEN-SOURCE PROOF" />
        <div style={{position: 'absolute', left: 38, top: 165, fontFamily: MONO, color: '#fff'}}>
          <div style={{fontSize: 88, lineHeight: 1, color: secondary, fontWeight: 950, letterSpacing: -4}}>{stars}</div>
          <div style={{marginTop: 12, color: '#aeb9ca', fontSize: 15}}>stars collapsed into reusable style entrypoints</div>
        </div>
        <svg width="100%" height="100%" viewBox="0 0 430 650" style={{position: 'absolute', inset: 0}}>
          {Array.from({length: 34}).map((_, index) => {
            const angle = index * 137.5 * Math.PI / 180;
            const radius = 42 + index * 5.2;
            const x = 210 + Math.cos(angle) * radius;
            const y = 328 + Math.sin(angle) * radius;
            const shown = reveal(p, .1 + index * .008, .38 + index * .008);
            return <text key={index} x={x} y={y} fill={index % 3 ? accent : secondary} fontSize={index % 3 ? 12 : 17} fontFamily={MONO} opacity={shown}>★</text>;
          })}
          <circle cx="210" cy="330" r={interpolate(reveal(p,.22,.54), [0, 1], [30, 118])} fill="none" stroke={secondary} strokeWidth="2" strokeDasharray="8 14" opacity=".5" />
        </svg>
      </div>
      <div style={{display: 'grid', gridTemplateRows: 'auto 1fr auto', gap: 14}}>
        <MiniPanel title="STYLE ENTRYPOINTS" accent={secondary}>
          {['Swiss baseline', 'RAW list', 'Nordic restraint', 'Neo ornament', 'Brutal contrast', 'Editorial rhythm'].map((item, index) => <div key={item} style={{height: 45, display: 'grid', gridTemplateColumns: '22px 1fr 54px', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,.06)', color: '#dce5f3', fontFamily: MONO, fontSize: 12, opacity: reveal(p,.18+index*.045,.34+index*.045)}}>
            <span style={{color: index % 2 ? accent : secondary}}>●</span><span>{item}</span><span style={{color: '#7d899d'}}>0{index + 1}</span>
          </div>)}
        </MiniPanel>
        <MiniPanel title="REPO TRACE" accent={accent}><CodeLines lines={base.slice(0, 5)} accent={accent} p={p} from={.22} /></MiniPanel>
        <EvidenceRail items={step.evidence} accent={accent} p={p} />
      </div>
    </div>;
  }

  if (variant === 'lock') {
    const modes = ['Swiss 极简', 'RAW list', 'Nordic 克制', 'Neo 赛博'];
    const active = Math.min(3, Math.floor(reveal(p, .18, .72) * 4));
    return <div style={{height: '100%', padding: 28, display: 'grid', gridTemplateRows: 'auto 1fr auto', gap: 18}}>
      <LensTitle step={step} accent={accent} label="STYLE LOCK / DETERMINISTIC SWITCH" />
      <div style={{display: 'grid', gridTemplateColumns: '260px 1fr 220px', gap: 18, minHeight: 0}}>
        <MiniPanel title="CANDIDATE MODES" accent={secondary}>
          {modes.map((mode, index) => <div key={mode} style={{height: 76, padding: 12, marginTop: index ? 10 : 0, border: `1px solid ${index === active ? accent : '#2b3548'}`, background: index === active ? `${accent}12` : '#090f18', color: index === active ? '#fff' : '#8b97aa', fontFamily: MONO, opacity: reveal(p,.14+index*.06,.32+index*.06)}}>
            <div style={{fontSize: 10, color: index === active ? accent : '#667287'}}>{index === active ? 'LOCKED' : 'CANDIDATE'}</div>
            <div style={{fontSize: 17, fontWeight: 900, marginTop: 11}}>{mode}</div>
          </div>)}
        </MiniPanel>
        <div style={{position: 'relative', border: `1px solid ${accent}55`, background: '#071019', overflow: 'hidden'}}>
          <svg width="100%" height="100%" viewBox="0 0 430 520" style={{position: 'absolute', inset: 0}}>
            {[90, 150, 210].map((radius, index) => <rect key={radius} x={215 - radius} y={260 - radius * .65} width={radius * 2} height={radius * 1.3} fill="none" stroke={index === 1 ? accent : '#303b4f'} strokeWidth={index === 1 ? 3 : 1.4} strokeDasharray={index === 1 ? `${reveal(p,.2,.62) * 620} 720` : '10 16'} opacity=".85" />)}
            <line x1="40" y1="260" x2="390" y2="260" stroke={secondary} strokeWidth="2" strokeDasharray="14 18" />
            <line x1="215" y1="58" x2="215" y2="462" stroke={secondary} strokeWidth="2" strokeDasharray="14 18" />
          </svg>
          <div style={{position: 'absolute', left: 125, top: 205, width: 190, height: 110, display: 'grid', placeItems: 'center', border: `1px solid ${accent}`, background: '#080f18', boxShadow: `0 0 42px ${accent}28`, color: '#fff', fontFamily: MONO, fontSize: 22, fontWeight: 950}}>SWISS<br />LOCKED</div>
        </div>
        <MiniPanel title="TOKEN PATCH" accent={accent}><CodeLines lines={base.slice(0, 6)} accent={accent} p={p} mode="add" from={.2} /></MiniPanel>
      </div>
      <EvidenceRail items={step.evidence} accent={accent} p={p} />
    </div>;
  }

  if (variant === 'anchor') {
    const points = ['grid', 'type scale', 'negative space', 'contrast'];
    return <div style={{height: '100%', padding: 28, display: 'grid', gridTemplateColumns: '1fr 285px', gap: 18}}>
      <div style={{position: 'relative', border: '1px solid rgba(255,255,255,.09)', background: '#071019', overflow: 'hidden'}}>
        <LensTitle step={step} accent={accent} label="ANCHOR MAP / STYLE MEMORY" />
        <svg width="100%" height="100%" viewBox="0 0 580 640" style={{position: 'absolute', inset: 0}}>
          {Array.from({length: 7}).map((_, index) => <line key={`v-${index}`} x1={70 + index * 72} y1="110" x2={70 + index * 72} y2="560" stroke="rgba(255,255,255,.08)" />)}
          {Array.from({length: 6}).map((_, index) => <line key={`h-${index}`} x1="70" y1={130 + index * 72} x2="510" y2={130 + index * 72} stroke="rgba(255,255,255,.08)" />)}
          <circle cx={interpolate(p,[.12,.62],[120,310],clamp)} cy={interpolate(p,[.12,.62],[455,292],clamp)} r="28" fill="none" stroke={accent} strokeWidth="4" />
          <line x1="70" y1="292" x2="510" y2="292" stroke={secondary} strokeWidth="2" strokeDasharray="12 16" />
          <line x1="310" y1="110" x2="310" y2="560" stroke={secondary} strokeWidth="2" strokeDasharray="12 16" />
          {points.map((point, index) => {
            const x = [118, 410, 182, 445][index];
            const y = [175, 230, 432, 455][index];
            return <g key={point} opacity={reveal(p,.22+index*.07,.38+index*.07)}>
              <circle cx={x} cy={y} r="8" fill={index % 2 ? secondary : accent} />
              <text x={x + 16} y={y + 5} fill="#edf3fb" fontSize="14" fontFamily={MONO}>{point}</text>
            </g>;
          })}
        </svg>
        <div style={{position: 'absolute', left: 230, top: 248, padding: 14, border: `1px solid ${accent}`, background: '#080f18', color: '#fff', fontFamily: MONO, fontWeight: 900}}>anchor acquired</div>
      </div>
      <div style={{display: 'grid', gridTemplateRows: 'auto 1fr', gap: 14}}>
        <MiniPanel title="ANCHOR SOURCE" accent={secondary}><CodeLines lines={base.slice(0, 5)} accent={accent} p={p} from={.18} /></MiniPanel>
        <EvidenceRail items={step.evidence} accent={accent} p={p} />
      </div>
    </div>;
  }

  if (variant === 'gate') {
    const packetY = interpolate(p, [.14, .74], [92, 492], clamp);
    return <div style={{height: '100%', padding: 28, display: 'grid', gridTemplateColumns: '270px 1fr 270px', gap: 18}}>
      <MiniPanel title="RAW PROMPT" accent="#ff617c"><CodeLines lines={step.before ?? base.slice(0, 5)} accent={accent} p={p} mode="remove" from={.12} /></MiniPanel>
      <div style={{position: 'relative', border: `1px solid ${accent}55`, background: '#071019', overflow: 'hidden'}}>
        <LensTitle step={step} accent={accent} label="SKILL GATE / SOURCE AVOIDANCE" />
        <div style={{position: 'absolute', left: '50%', top: 90, bottom: 80, width: 4, background: '#263244', transform: 'translateX(-50%)'}}>
          <div style={{width: '100%', height: `${reveal(p,.08,.75) * 100}%`, background: `linear-gradient(180deg, ${secondary}, ${accent})`}} />
        </div>
        {['input', 'skill rules', 'blocked defaults', 'validated output'].map((label, index) => <div key={label} style={{position: 'absolute', left: index % 2 ? 270 : 44, top: 92 + index * 120, width: 190, height: 76, padding: 13, border: `1px solid ${index === 2 ? '#ff617c' : index % 2 ? accent : secondary}`, background: index === 2 ? 'rgba(255,97,124,.08)' : '#090f18', color: '#fff', fontFamily: MONO, opacity: reveal(p,.14+index*.08,.32+index*.08)}}>
          <div style={{fontSize: 10, color: index === 2 ? '#ff91a2' : index % 2 ? accent : secondary}}>0{index + 1}</div>
          <div style={{fontSize: 13, marginTop: 9, fontWeight: 900}}>{label}</div>
        </div>)}
        <div style={{position: 'absolute', left: '50%', top: packetY, width: 34, height: 34, borderRadius: '50%', border: `7px solid ${accent}`, background: '#fff', boxShadow: `0 0 28px ${accent}`, transform: 'translate(-50%, -50%)'}} />
      </div>
      <MiniPanel title="CLEAN OUTPUT" accent={accent}><CodeLines lines={step.after ?? base.slice(0, 5)} accent={accent} p={p} mode="add" from={.24} /></MiniPanel>
    </div>;
  }

  const packetX = interpolate(p, [.15, .72], [72, 660], clamp);
  return <div style={{height: '100%', padding: 26, display: 'grid', gridTemplateRows: 'auto 1fr auto', gap: 18}}>
    <LensTitle step={step} accent={accent} label={`PIPELINE / ${variant.toUpperCase()}`} />
    {variant === 'direction' || variant === 'deny' ? <div style={{display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14}}>
      {labels.map((label, index) => {
        const bad = variant === 'deny';
        const shown = reveal(p, .16 + index * .05, .32 + index * .05);
        return <div key={label} style={{height: 132, padding: 16, border: `1px solid ${bad ? '#ff617c' : index === 0 ? accent : secondary}`, background: bad ? 'rgba(255,97,124,.07)' : '#09101a', color: '#fff', opacity: shown, transform: `translateY(${interpolate(shown,[0,1],[24,0])}px) rotate(${variant === 'direction' ? -4 + index * 1.6 : 0}deg)`}}>
          <div style={{fontFamily: MONO, fontSize: 10, color: bad ? '#ff91a2' : index === 0 ? accent : secondary}}>{bad ? 'BLOCKED' : index === 0 ? 'LOCKED' : 'OPTION'}</div>
          <div style={{fontSize: 22, fontWeight: 950, marginTop: 24}}>{label}</div>
          {bad ? <div style={{height: 3, background: '#ff617c', transform: 'rotate(-7deg)', marginTop: -14}} /> : null}
        </div>;
      })}
    </div> : <div style={{position: 'relative', height: 430}}>
      <div style={{position: 'absolute', left: 64, right: 64, top: 210, height: 4, background: '#273244'}}><div style={{width: `${reveal(p,.1,.72) * 100}%`, height: '100%', background: `linear-gradient(90deg,${secondary},${accent})`}} /></div>
      {['INPUT', variant === 'gate' ? 'SKILL GATE' : 'SIGNAL', variant === 'anchor' ? 'ANCHOR' : 'OUTPUT'].map((label, index) => <div key={label} style={{position: 'absolute', left: 46 + index * 285, top: index === 1 ? 118 : 155, width: 210, height: 160, border: `1px solid ${index === 1 ? accent : '#303b4f'}`, background: index === 1 ? `${accent}0d` : '#090f18', padding: 18, opacity: reveal(p,.12+index*.12,.3+index*.12)}}>
        <div style={{fontFamily: MONO, color: index === 1 ? accent : '#7d899d', fontSize: 11}}>0{index + 1} / {label}</div>
        <div style={{fontFamily: MONO, color: '#eef3fb', fontSize: 14, lineHeight: 1.45, marginTop: 24}}>{clipped(base[index] ?? step.objective, 54)}</div>
      </div>)}
      <div style={{position: 'absolute', left: packetX, top: 197, width: 30, height: 30, borderRadius: '50%', border: `7px solid ${accent}`, background: '#fff', boxShadow: `0 0 24px ${accent}`}} />
    </div>}
    <EvidenceRail items={step.evidence} accent={accent} p={p} />
  </div>;
};

const TokenLabCenter: React.FC<{step: TechnicalWorkbenchStep; tokens: string[]; accent: string; secondary: string; p: number; variant: 'vault' | 'assembly' | 'scenario' | 'blank' | 'brand-pack' | 'brand-map'}> = ({step, tokens, accent, secondary, p, variant}) => {
  if (variant === 'vault') {
    return <div style={{position: 'relative', border: `1px solid ${accent}44`, background: '#071019', color: '#d8e0ed', padding: 26, overflow: 'hidden'}}>
      <div style={{fontFamily: MONO, fontSize: 11, color: accent}}>BUILT-IN KNOWLEDGE VAULT</div>
      <svg width="100%" height="100%" viewBox="0 0 540 620" style={{position: 'absolute', inset: 0}}>
        {[110, 170, 230].map((radius, index) => <circle key={radius} cx="270" cy="315" r={radius} fill="none" stroke={index === 1 ? accent : '#2b3548'} strokeWidth={index === 1 ? 3 : 1.5} strokeDasharray={index === 1 ? `${reveal(p,.12,.58) * 820} 900` : '12 16'} opacity=".8" />)}
        {['rules', 'tokens', 'patterns', 'a11y', 'industry', 'scenes'].map((label, index) => {
          const angle = (-90 + index * 60) * Math.PI / 180;
          const x = 270 + Math.cos(angle) * 205;
          const y = 315 + Math.sin(angle) * 205;
          return <g key={label} opacity={reveal(p,.2+index*.05,.36+index*.05)}>
            <circle cx={x} cy={y} r="9" fill={index % 2 ? secondary : accent} />
            <text x={x + 14} y={y + 4} fill="#eef3fb" fontSize="13" fontFamily={MONO}>{label}</text>
          </g>;
        })}
      </svg>
      <div style={{position: 'absolute', left: 172, top: 250, width: 210, height: 130, display: 'grid', placeItems: 'center', border: `1px solid ${accent}`, background: '#08121d', color: accent, fontFamily: MONO, fontSize: 23, fontWeight: 950, boxShadow: `0 0 40px ${accent}24`, opacity: reveal(p,.12,.3)}}>BUILT-IN<br />READY</div>
    </div>;
  }

  if (variant === 'scenario') {
    const scenarios = ['WEBSITE', 'TOOL', 'PORTFOLIO', 'ADMIN'];
    return <div style={{position: 'relative', border: '1px solid rgba(255,255,255,.09)', background: '#081019', color: '#dbe4f2', padding: 24, overflow: 'hidden'}}>
      <div style={{fontFamily: MONO, fontSize: 11, color: accent}}>SCENARIO SWITCH / SAME SYSTEM</div>
      <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 34}}>
        {scenarios.map((label, index) => {
          const active = index === Math.min(3, Math.floor(p * 4));
          const shown = reveal(p, .14 + index * .06, .31 + index * .06);
          return <div key={label} style={{height: 210, padding: 15, border: `1px solid ${active ? accent : '#303b4f'}`, background: active ? `${accent}10` : '#0c1420', opacity: shown, transform: `translateY(${interpolate(shown,[0,1],[20,0])}px)`}}>
            <div style={{display: 'flex', justifyContent: 'space-between', fontFamily: MONO, color: active ? accent : '#7c899d', fontSize: 10}}><span>{label}</span><span>{active ? 'ACTIVE' : 'READY'}</span></div>
            <div style={{height: 8, width: '70%', background: active ? accent : '#687589', marginTop: 30}} />
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 18}}>
              {Array.from({length: 4}).map((_, itemIndex) => <div key={itemIndex} style={{height: 44, border: '1px solid #263244', background: itemIndex === index % 4 ? `${secondary}22` : '#111a26'}} />)}
            </div>
          </div>;
        })}
      </div>
    </div>;
  }

  if (variant === 'brand-pack') {
    return <div style={{position: 'relative', border: `1px solid ${accent}44`, background: '#071019', color: '#eef3fb', padding: 26, overflow: 'hidden'}}>
      <div style={{fontFamily: MONO, fontSize: 11, color: accent}}>BRAND PACK / SINGLE FILE INDEX</div>
      <div style={{position: 'absolute', left: 150, top: 145, width: 260, height: 330, border: `1px solid ${accent}`, background: '#0b1320', padding: 22, boxShadow: `0 0 42px ${accent}22`, opacity: reveal(p,.12,.28)}}>
        <div style={{fontFamily: MONO, fontSize: 12, color: accent}}>brand-pack.json</div>
        <div style={{fontFamily: MONO, fontSize: 72, color: secondary, fontWeight: 950, marginTop: 58}}>68</div>
        <div style={{fontFamily: MONO, fontSize: 14, color: '#d8e0ed'}}>systems indexed</div>
        <div style={{height: 3, width: `${interpolate(p,[0,1],[18,85],clamp)}%`, background: accent, marginTop: 36}} />
      </div>
      {['tokens', 'components', 'styles', 'industry'].map((label, index) => <div key={label} style={{position: 'absolute', left: [58, 430, 72, 420][index], top: [160, 190, 410, 440][index], width: 116, height: 74, padding: 12, border: `1px solid ${index % 2 ? secondary : accent}66`, background: '#09111d', fontFamily: MONO, opacity: reveal(p,.22+index*.07,.38+index*.07)}}>
        <div style={{fontSize: 10, color: index % 2 ? secondary : accent}}>INDEX</div>
        <div style={{fontSize: 13, marginTop: 10}}>{label}</div>
      </div>)}
    </div>;
  }

  if (variant === 'brand-map') {
    return <div style={{position: 'relative', border: '1px solid rgba(255,255,255,.09)', background: '#f1f2ed', color: '#11151c', padding: 26, overflow: 'hidden'}}>
      <div style={{fontFamily: MONO, fontSize: 11, color: '#58616d'}}>BRAND STYLE MAP / TOKENIZED PREVIEW</div>
      <div style={{display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginTop: 42}}>
        {['Stripe', 'Linear', 'Vercel', 'Recta'].map((brand, index) => <div key={brand} style={{height: 360, padding: 14, background: index % 2 ? '#11151c' : '#fff', color: index % 2 ? '#fff' : '#11151c', borderTop: `8px solid ${index % 2 ? secondary : accent}`, opacity: reveal(p,.16+index*.08,.34+index*.08)}}>
          <div style={{fontSize: 20, fontWeight: 950}}>{brand}</div>
          <div style={{height: 5, width: '70%', background: index % 2 ? secondary : accent, marginTop: 30}} />
          <div style={{height: 70, border: `1px solid ${index % 2 ? '#384256' : '#d0d3ce'}`, marginTop: 38}} />
        </div>)}
      </div>
    </div>;
  }

  const isBlank = variant === 'blank';
  return <div style={{position: 'relative', border: '1px solid rgba(255,255,255,.09)', background: isBlank ? '#080b11' : '#f1f2ed', color: isBlank ? '#d8e0ed' : '#11151c', padding: 26, overflow: 'hidden'}}>
    <div style={{fontFamily: MONO, fontSize: 11, color: isBlank ? '#667287' : '#58616d'}}>{variant.toUpperCase()} / {isBlank ? 'MISSING CONTEXT' : 'TOKEN FLOW'}</div>
    <div style={{marginTop: 36, fontSize: 31, lineHeight: 1.2, fontWeight: 950, maxWidth: 430}}>{isBlank ? 'No industry-aware system is connected yet.' : 'Tokens compile into one constrained interface.'}</div>
    {!isBlank ? <svg width="100%" height="100%" viewBox="0 0 540 560" style={{position: 'absolute', inset: 0, pointerEvents: 'none'}}>
      {tokens.slice(0, 5).map((_, index) => {
        const y = 160 + index * 58;
        const line = reveal(p,.18+index*.05,.38+index*.05);
        return <line key={index} x1="36" y1={y} x2="315" y2={300 + (index - 2) * 18} stroke={index % 2 ? secondary : accent} strokeWidth="2" strokeDasharray={`${line * 320} 360`} opacity=".75" />;
      })}
    </svg> : null}
    <div style={{position: 'absolute', right: 42, top: 170, width: 185, height: 330, border: isBlank ? '1px dashed #465266' : '1px solid #c8cdc6', background: isBlank ? 'transparent' : '#fff', padding: 18, opacity: reveal(p,.18,.36)}}>
      <div style={{height: 5, width: '76%', background: isBlank ? '#313b4d' : accent}} />
      {Array.from({length: 4}).map((_, index) => <div key={index} style={{height: 48, marginTop: 20, border: isBlank ? '1px dashed #313b4d' : '1px solid #d5d9d2', background: isBlank ? 'transparent' : index % 2 ? '#f8f9f5' : '#e9ece5'}} />)}
    </div>
  </div>;
};

const TokenLabLens: React.FC<{step: TechnicalWorkbenchStep; accent: string; secondary: string; p: number; variant: 'vault' | 'metrics' | 'assembly' | 'scenario' | 'blank' | 'brand-pack' | 'brand-map'}> = ({step, accent, secondary, p, variant}) => {
  const tokens = step.after ?? step.logs ?? [step.objective];
  const metricValues = step.evidence.map((item) => item.value).slice(0, 4);
  return <div style={{height: '100%', padding: 24, display: 'grid', gridTemplateColumns: variant === 'metrics' ? '1fr' : '250px 1fr 250px', gap: 16}}>
    {variant === 'metrics' ? <div style={{display: 'grid', gridTemplateRows: 'auto 1fr auto', gap: 20}}>
      <LensTitle step={step} accent={accent} label="CATALOG METRICS / SEMANTIC COUNTS" />
      <div style={{display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, alignItems: 'center'}}>
        {metricValues.map((value, index) => <div key={`${value}-${index}`} style={{height: 220, display: 'grid', placeItems: 'center', border: `1px solid ${index % 2 ? secondary : accent}`, background: '#090f18', opacity: reveal(p, .15 + index * .08, .32 + index * .08)}}>
          <div style={{textAlign: 'center'}}><div style={{fontFamily: MONO, fontSize: 52, color: index % 2 ? secondary : accent, fontWeight: 950}}>{value}</div><div style={{fontFamily: MONO, fontSize: 12, color: '#aeb9ca', marginTop: 12}}>{step.evidence[index]?.label}</div></div>
        </div>)}
      </div>
      <EvidenceRail items={step.evidence} accent={accent} p={p} />
    </div> : <>
      <MiniPanel title={variant === 'blank' ? 'MISSING SETUP' : variant === 'brand-pack' ? 'BRAND PACK' : 'TOKEN SOURCE'} accent={accent}>
        <CodeLines lines={tokens.slice(0, 6)} accent={accent} p={p} mode={variant === 'blank' ? 'remove' : 'add'} from={.12} />
      </MiniPanel>
      <TokenLabCenter step={step} tokens={tokens} accent={accent} secondary={secondary} p={p} variant={variant} />
      <MiniPanel title="SYSTEM EVIDENCE" accent={secondary}><EvidenceRail items={step.evidence} accent={accent} p={p} /></MiniPanel>
    </>}
  </div>;
};

const WorkbenchLensView: React.FC<{session: TechnicalWorkbenchSession; step: TechnicalWorkbenchStep; accent: string; secondary: string; p: number}> = ({session, step, accent, secondary, p}) => {
  const lens = step.lens ?? fallbackLensByKind[session.kind];
  if (lens === 'terminal-run') return <LensTerminal step={step} accent={accent} secondary={secondary} p={p} />;
  if (lens === 'manifest-resolve') return <ManifestLens step={step} accent={accent} secondary={secondary} p={p} />;
  if (lens === 'design-inspector') return <InspectorLens step={step} accent={accent} secondary={secondary} p={p} />;
  if (lens === 'rule-counter') return <RuleCounterLens step={step} accent={accent} secondary={secondary} p={p} />;
  if (lens === 'category-index') return <NetworkLens step={step} accent={accent} secondary={secondary} p={p} mode="category" />;
  if (lens === 'live-scan') return <ScanLens step={step} accent={accent} secondary={secondary} p={p} />;
  if (lens === 'snapshot-compare') return <ScanLens step={step} accent={accent} secondary={secondary} p={p} compare />;
  if (lens === 'repo-signal') return <PipelineLens step={step} accent={accent} secondary={secondary} p={p} variant="repo" />;
  if (lens === 'direction-picker') return <PipelineLens step={step} accent={accent} secondary={secondary} p={p} variant="direction" />;
  if (lens === 'style-lock') return <PipelineLens step={step} accent={accent} secondary={secondary} p={p} variant="lock" />;
  if (lens === 'anchor-map') return <PipelineLens step={step} accent={accent} secondary={secondary} p={p} variant="anchor" />;
  if (lens === 'deny-list') return <PipelineLens step={step} accent={accent} secondary={secondary} p={p} variant="deny" />;
  if (lens === 'skill-gate') return <PipelineLens step={step} accent={accent} secondary={secondary} p={p} variant="gate" />;
  if (lens === 'knowledge-vault') return <TokenLabLens step={step} accent={accent} secondary={secondary} p={p} variant="vault" />;
  if (lens === 'catalog-metrics') return <TokenLabLens step={step} accent={accent} secondary={secondary} p={p} variant="metrics" />;
  if (lens === 'token-assembly') return <TokenLabLens step={step} accent={accent} secondary={secondary} p={p} variant="assembly" />;
  if (lens === 'scenario-switch') return <TokenLabLens step={step} accent={accent} secondary={secondary} p={p} variant="scenario" />;
  if (lens === 'blank-audit') return <TokenLabLens step={step} accent={accent} secondary={secondary} p={p} variant="blank" />;
  if (lens === 'brand-pack') return <TokenLabLens step={step} accent={accent} secondary={secondary} p={p} variant="brand-pack" />;
  if (lens === 'brand-style-map') return <TokenLabLens step={step} accent={accent} secondary={secondary} p={p} variant="brand-map" />;
  if (lens === 'system-graph') return <NetworkLens step={step} accent={accent} secondary={secondary} p={p} mode="system" />;
  return <div style={{height: '100%', padding: 26, display: 'grid', gridTemplateRows: 'auto 1fr auto', gap: 18}}>
    <LensTitle step={step} accent={accent} label="SOURCE DIFF / TECHNICAL CLAIM" />
    <LensCode step={step} accent={accent} p={p} />
    <EvidenceRail items={step.evidence} accent={accent} p={p} />
  </div>;
};

const IdeTerminal: React.FC<{session: TechnicalWorkbenchSession; step: TechnicalWorkbenchStep; accent: string; secondary: string; p: number}> = ({session, step, accent, secondary, p}) => {
  const command = step.command ?? 'inspect current configuration';
  const typed = command.slice(0, Math.floor(command.length * reveal(p, 0.12, 0.34)));
  const logs = step.logs ?? [];
  return <WindowFrame session={session} accent={accent} secondary={secondary} p={p}>
    <div style={{position: 'absolute', inset: 0, display: 'grid', gridTemplateColumns: '170px 1fr 260px'}}>
      <div style={{padding: '24px 15px', borderRight: '1px solid rgba(255,255,255,.08)', background: '#080d15'}}>
        <div style={{fontFamily: MONO, fontSize: 11, color: accent, marginBottom: 18}}>EXPLORER</div>
        {(session.files ?? ['skill.config.yml', 'tokens.json', 'output.tsx']).map((file, index) => <div key={file} style={{height: 39, display: 'flex', alignItems: 'center', gap: 9, padding: '0 8px', marginTop: 4, background: file === step.file ? `${accent}18` : 'transparent', color: file === step.file ? '#fff' : '#7b879b', fontFamily: MONO, fontSize: 12}}><span style={{color: index % 2 ? secondary : accent}}>◇</span>{file}</div>)}
      </div>
      <div style={{display: 'grid', gridTemplateRows: '1fr 290px', minWidth: 0}}>
        <div style={{padding: '20px 18px', overflow: 'hidden'}}>
          <div style={{fontFamily: MONO, fontSize: 12, color: '#8e99ac', paddingBottom: 12, borderBottom: '1px solid rgba(255,255,255,.07)'}}>{step.file ?? 'skill.config.yml'} <span style={{color: accent}}>● modified</span></div>
          <div style={{display: 'grid', gridTemplateColumns: step.before?.length ? '1fr 1fr' : '1fr', gap: 10, marginTop: 15}}>
            {step.before?.length ? <div><div style={{fontFamily: MONO, fontSize: 10, color: '#ff7188', marginBottom: 8}}>BEFORE</div><CodeLines lines={step.before} accent={accent} p={p} mode="remove" /></div> : null}
            <div><div style={{fontFamily: MONO, fontSize: 10, color: accent, marginBottom: 8}}>AFTER</div><CodeLines lines={step.after ?? [step.objective]} accent={accent} p={p} mode="add" from={0.28} /></div>
          </div>
        </div>
        <div style={{padding: '17px 20px', borderTop: '1px solid rgba(255,255,255,.09)', background: '#050910', fontFamily: MONO}}>
          <div style={{fontSize: 11, color: '#667287'}}>TERMINAL / TASK</div>
          <div style={{fontSize: 15, color: '#e8eef9', marginTop: 14}}><span style={{color: accent}}>➜</span> {typed}<span style={{display: 'inline-block', width: 8, height: 16, background: accent, marginLeft: 4, verticalAlign: -2, opacity: Math.floor(p * 18) % 2 ? .3 : 1}} /></div>
          <div style={{marginTop: 13}}>{logs.slice(0, 4).map((log, index) => {const shown = reveal(p, .36 + index * .08, .48 + index * .08); return <div key={log} style={{fontSize: 12, color: index === logs.length - 1 ? '#7fffb8' : '#93a0b5', lineHeight: 1.8, opacity: shown}}><span style={{color: index === logs.length - 1 ? '#45e28d' : '#526077'}}>{index === logs.length - 1 ? '✓' : '·'}</span> {log}</div>;})}</div>
        </div>
      </div>
      <div style={{padding: '22px 16px', borderLeft: '1px solid rgba(255,255,255,.08)', background: '#080d15'}}><div style={{fontFamily: MONO, fontSize: 11, color: accent, marginBottom: 16}}>OBSERVABLE EVIDENCE</div><EvidenceRail items={step.evidence} accent={accent} p={p} /></div>
    </div>
  </WindowFrame>;
};

const AuditTrace: React.FC<{session: TechnicalWorkbenchSession; step: TechnicalWorkbenchStep; accent: string; secondary: string; p: number}> = ({session, step, accent, secondary, p}) => {
  const scan = interpolate(p, [.14, .62], [70, 650], clamp);
  const logs = step.logs ?? [];
  return <WindowFrame session={session} accent={accent} secondary={secondary} p={p}>
    <div style={{position: 'absolute', inset: 0, display: 'grid', gridTemplateColumns: '1.15fr .85fr'}}>
      <div style={{position: 'relative', padding: '22px', borderRight: '1px solid rgba(255,255,255,.08)'}}>
        <div style={{display: 'flex', gap: 8, marginBottom: 16}}>{['PAGE', 'DOM', 'SOURCE'].map((tab, index) => <div key={tab} style={{padding: '7px 11px', color: index === Math.min(2, Math.floor(p * 3)) ? accent : '#667287', borderBottom: `2px solid ${index === Math.min(2, Math.floor(p * 3)) ? accent : 'transparent'}`, fontFamily: MONO, fontSize: 10}}>{tab}</div>)}</div>
        <div style={{height: 390, padding: 20, border: '1px solid rgba(255,255,255,.1)', background: '#0b111b', position: 'relative', overflow: 'hidden'}}>
          <div style={{height: 46, border: '1px solid #2b3545', padding: '14px'}}><div style={{height: 8, width: '38%', background: '#dce4ef'}} /></div>
          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12}}>{Array.from({length: 4}).map((_, index) => <div key={index} style={{height: 125, padding: 14, border: `1px solid ${p > .42 && index === 1 ? '#ff617c' : '#263143'}`, background: index === 1 ? `${secondary}12` : '#0e1521', boxShadow: p > .42 && index === 1 ? '0 0 24px rgba(255,97,124,.24)' : 'none'}}><div style={{width: 30, height: 30, borderRadius: 4, background: index === 1 ? secondary : '#344055'}} /><div style={{height: 7, width: '65%', marginTop: 16, background: '#9ba8bc'}} /><div style={{height: 6, width: '84%', marginTop: 10, background: '#344055'}} /></div>)}</div>
          <div style={{position: 'absolute', left: 0, right: 0, top: scan, height: 3, background: `linear-gradient(90deg,transparent,${accent},#fff,transparent)`, boxShadow: `0 0 20px ${accent}`}} />
        </div>
        <div style={{marginTop: 15, border: '1px solid rgba(255,255,255,.09)', padding: 14}}><div style={{fontFamily: MONO, fontSize: 10, color: '#697589'}}>SOURCE / {step.file ?? step.target ?? 'component.tsx'}</div><CodeLines lines={step.after ?? step.before ?? [step.objective]} accent={accent} p={p} from={.4} /></div>
      </div>
      <div style={{padding: '22px 18px', display: 'grid', gridTemplateRows: 'auto 1fr auto', gap: 16}}>
        <div><div style={{fontFamily: MONO, fontSize: 11, color: accent}}>TRACE / {step.actionLabel.toUpperCase()}</div><div style={{fontSize: 19, color: '#fff', fontWeight: 900, marginTop: 9, lineHeight: 1.25}}>{step.objective}</div></div>
        <div>{logs.slice(0, 5).map((log, index) => {const shown = reveal(p, .2 + index * .08, .32 + index * .08); return <div key={log} style={{minHeight: 58, marginTop: 8, padding: '10px 12px', borderLeft: `3px solid ${index === logs.length - 1 ? accent : '#344055'}`, background: 'rgba(255,255,255,.025)', opacity: shown}}><div style={{fontFamily: MONO, fontSize: 10, color: '#667287'}}>0{index + 1} / {index === logs.length - 1 ? 'PROOF' : 'TRACE'}</div><div style={{fontFamily: MONO, fontSize: 13, color: '#d9e2ef', marginTop: 6}}>{log}</div></div>;})}</div>
        <EvidenceRail items={step.evidence} accent={accent} p={p} />
      </div>
    </div>
  </WindowFrame>;
};

const PromptPipeline: React.FC<{session: TechnicalWorkbenchSession; step: TechnicalWorkbenchStep; accent: string; secondary: string; p: number}> = ({session, step, accent, secondary, p}) => {
  const packetX = interpolate(p, [.15, .72], [105, 745], clamp);
  const columns = [
    {label: 'INPUT', lines: step.before ?? ['Generate a product page', 'use default styling']},
    {label: 'SKILL GATE', lines: step.logs ?? ['load design constraints', 'reject generic defaults', 'anchor target direction']},
    {label: 'OUTPUT', lines: step.after ?? ['apply explicit direction', 'emit reusable tokens']},
  ];
  return <WindowFrame session={session} accent={accent} secondary={secondary} p={p}>
    <div style={{position: 'absolute', inset: 0, padding: '32px 28px'}}>
      <div style={{position: 'absolute', left: 100, right: 100, top: 190, height: 3, background: '#222d3d'}}><div style={{width: `${reveal(p, .12, .76) * 100}%`, height: '100%', background: `linear-gradient(90deg,${secondary},${accent})`}} /></div>
      <div style={{display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 18}}>{columns.map((column, index) => {const shown = reveal(p, .04 + index * .15, .2 + index * .15); return <div key={column.label} style={{height: 440, border: `1px solid ${index === 1 ? accent : '#2a3444'}`, background: index === 1 ? `${accent}0b` : '#0a1019', padding: 18, opacity: shown}}><div style={{fontFamily: MONO, color: index === 1 ? accent : '#7d899d', fontSize: 11}}>0{index + 1} / {column.label}</div><div style={{height: 46, width: 46, borderRadius: '50%', border: `2px solid ${index === 1 ? accent : '#455167'}`, marginTop: 25, display: 'grid', placeItems: 'center', color: index === 1 ? accent : '#718096', fontFamily: MONO, fontWeight: 900}}>{index === 0 ? 'IN' : index === 1 ? 'SK' : 'OUT'}</div><div style={{marginTop: 28}}>{column.lines.map((line, lineIndex) => <div key={line} style={{minHeight: 52, padding: '10px', marginTop: 9, border: '1px solid rgba(255,255,255,.07)', color: '#d9e2ef', fontFamily: MONO, fontSize: 13, lineHeight: 1.35, opacity: reveal(p, .18 + index * .14 + lineIndex * .05, .32 + index * .14 + lineIndex * .05)}}>{line}</div>)}</div></div>;})}</div>
      <div style={{position: 'absolute', left: packetX, top: 175, width: 32, height: 32, borderRadius: '50%', border: `7px solid ${accent}`, background: '#fff', boxShadow: `0 0 24px ${accent}`}} />
      <div style={{display: 'grid', gridTemplateColumns: '1fr 350px', gap: 18, marginTop: 18}}><div style={{padding: 16, border: '1px solid rgba(255,255,255,.08)', fontFamily: MONO, fontSize: 13, color: '#9aa7ba'}}><span style={{color: accent}}>TRACE</span> {step.objective}</div><EvidenceRail items={step.evidence} accent={accent} p={p} /></div>
    </div>
  </WindowFrame>;
};

const DesignSystemLab: React.FC<{session: TechnicalWorkbenchSession; step: TechnicalWorkbenchStep; accent: string; secondary: string; p: number}> = ({session, step, accent, secondary, p}) => {
  const tokens = step.after ?? ['color.brand = #635BFF', 'font.ui = Inter', 'space.4 = 16px', 'focus.ring = 2px'];
  return <WindowFrame session={session} accent={accent} secondary={secondary} p={p}>
    <div style={{position: 'absolute', inset: 0, display: 'grid', gridTemplateColumns: '260px 1fr 270px'}}>
      <div style={{padding: '22px 17px', borderRight: '1px solid rgba(255,255,255,.08)'}}><div style={{fontFamily: MONO, fontSize: 11, color: accent}}>TOKEN SOURCE</div><div style={{marginTop: 20}}><CodeLines lines={tokens} accent={accent} p={p} mode="add" from={.12} /></div><div style={{marginTop: 32, fontFamily: MONO, fontSize: 10, color: '#667287'}}>BOUND COMPONENTS</div>{['Button', 'Card', 'Input', 'Navigation'].map((item, index) => <div key={item} style={{height: 42, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,.06)', color: '#dce5f3', fontSize: 13}}><span>{item}</span><span style={{color: index < p * 5 ? accent : '#536075'}}>LINKED</span></div>)}</div>
      <div style={{padding: '22px 20px'}}><div style={{display: 'flex', justifyContent: 'space-between', fontFamily: MONO, fontSize: 11, color: '#778398'}}><span>COMPONENT PREVIEW</span><span style={{color: accent}}>LIVE TOKENS</span></div><div style={{marginTop: 18, height: 590, border: '1px solid rgba(255,255,255,.09)', background: '#f1f2ed', padding: 28, color: '#11151c'}}><div style={{fontFamily: MONO, fontSize: 10, color: '#58616d'}}>SYSTEM / PRODUCT SURFACE</div><div style={{fontSize: 31, fontWeight: 950, marginTop: 28, maxWidth: 420}}>A consistent interface, assembled from tokens.</div><div style={{height: 5, width: `${interpolate(p,[0,1],[18,72],clamp)}%`, background: accent, marginTop: 24}} /><div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 13, marginTop: 25}}>{Array.from({length: 4}).map((_, index) => <div key={index} style={{height: 120, padding: 15, border: '1px solid #c8cdc6', background: index === 1 ? '#fff' : '#e5e8e1', transform: `translateY(${interpolate(reveal(p,.2+index*.06,.38+index*.06),[0,1],[22,0])}px)`}}><div style={{width: 32, height: 32, borderRadius: index % 2 ? 16 : 4, background: index % 2 ? secondary : accent}} /><div style={{height: 7, width: '72%', background: '#727a83', marginTop: 15}} /></div>)}</div><div style={{height: 50, marginTop: 18, display: 'grid', placeItems: 'center', background: accent, color: '#07110c', fontSize: 13, fontWeight: 900}}>ACCESSIBLE ACTION</div></div></div>
      <div style={{padding: '22px 16px', borderLeft: '1px solid rgba(255,255,255,.08)'}}><div style={{fontFamily: MONO, fontSize: 11, color: accent, marginBottom: 16}}>SYSTEM CHECK</div><EvidenceRail items={step.evidence} accent={accent} p={p} /><div style={{marginTop: 22, padding: 14, border: `1px solid ${accent}55`, color: '#dfe8f5', fontSize: 13, lineHeight: 1.45}}>{step.objective}</div></div>
    </div>
  </WindowFrame>;
};

const ArchitectureWorkspace: React.FC<{session: TechnicalWorkbenchSession; step: TechnicalWorkbenchStep; accent: string; secondary: string; p: number}> = ({session, step, accent, secondary, p}) => {
  const nodes = (step.after?.length ? step.after : ['INPUT', 'SKILL', 'RULES', 'RENDERER', 'OUTPUT']).slice(0, 6);
  const positions = [[55, 120], [270, 78], [492, 132], [92, 430], [310, 420], [492, 510]];
  return <WindowFrame session={session} accent={accent} secondary={secondary} p={p}>
    <div style={{position: 'absolute', inset: 0, display: 'grid', gridTemplateColumns: '1fr 275px'}}>
      <div style={{position: 'relative', overflow: 'hidden', borderRight: '1px solid rgba(255,255,255,.08)'}}>
        <svg width="100%" height="100%" viewBox="0 0 790 940" style={{position: 'absolute', inset: 0}}>
          {positions.slice(0, nodes.length).map(([x, y], index) => {
            if (index === 0) return null;
            const previous = positions[index - 1];
            const line = reveal(p, .1 + index * .07, .32 + index * .07);
            return <line key={index} x1={previous[0] + 80} y1={previous[1] + 42} x2={x + 80} y2={y + 42} stroke={index % 2 ? secondary : accent} strokeWidth="3" strokeDasharray={`${line * 340} 400`} opacity=".8" />;
          })}
        </svg>
        {nodes.map((node, index) => {
          const shown = reveal(p, .04 + index * .08, .2 + index * .08);
          const [x, y] = positions[index];
          return <div key={`${node}-${index}`} style={{position: 'absolute', left: x, top: y, width: 160, minHeight: 84, padding: '14px 13px', border: `1px solid ${index % 2 ? secondary : accent}`, background: '#080d16', boxShadow: shown > .8 ? `0 0 22px ${index % 2 ? secondary : accent}22` : 'none', opacity: shown, transform: `scale(${interpolate(shown,[0,1],[.82,1])})`}}><div style={{fontFamily: MONO, fontSize: 9, color: index % 2 ? secondary : accent}}>NODE / {String(index + 1).padStart(2, '0')}</div><div style={{fontFamily: MONO, fontSize: 13, lineHeight: 1.3, color: '#f1f5fb', marginTop: 10, fontWeight: 800}}>{node}</div></div>;
        })}
        <div style={{position: 'absolute', left: 42, right: 42, bottom: 38, padding: 17, border: '1px solid rgba(255,255,255,.09)', background: '#080d15', fontFamily: MONO, fontSize: 13, color: '#aeb9ca'}}><span style={{color: accent}}>SYSTEM TRACE</span> / {step.objective}</div>
      </div>
      <div style={{padding: '22px 17px'}}><div style={{fontFamily: MONO, fontSize: 11, color: accent, marginBottom: 16}}>SYSTEM EVIDENCE</div><EvidenceRail items={step.evidence} accent={accent} p={p} /><div style={{marginTop: 22}}>{(step.logs ?? []).slice(0, 5).map((log, index) => <div key={log} style={{minHeight: 48, padding: '9px 10px', borderBottom: '1px solid rgba(255,255,255,.07)', color: '#c7d1e1', fontFamily: MONO, fontSize: 11, opacity: reveal(p,.25+index*.06,.4+index*.06)}}><span style={{color: index % 2 ? secondary : accent}}>✓</span> {log}</div>)}</div></div>
    </div>
  </WindowFrame>;
};

export const TechnicalEvidenceWorkbench: React.FC<{
  frame: number;
  session: TechnicalWorkbenchSession;
  beats: SkillShowcaseBeat[];
  accent: string;
  secondary: string;
}> = ({frame, session, beats, accent, secondary}) => {
  const activeBeat = beats.find((beat) => frame >= beat.startFrame && frame < beat.endFrame) ?? beats[beats.length - 1];
  if (!activeBeat) return null;
  const captionIndex = activeBeat.captionStartIndex;
  const step = session.steps.find((item) => item.captionIndex === captionIndex);
  if (!step) return <TechExplainerHero frame={frame} beat={activeBeat} accent={accent} secondary={secondary} />;
  const p = beatProgress(frame, activeBeat);
  const lens = step.lens ?? fallbackLensByKind[session.kind];
  return <AbsoluteFill style={{fontFamily: FONT}}>
    <TechnicalHeroShell session={session} lens={lens} accent={accent} secondary={secondary} p={p}>
      <WorkbenchLensView session={session} step={step} accent={accent} secondary={secondary} p={p} />
    </TechnicalHeroShell>
  </AbsoluteFill>;
};
