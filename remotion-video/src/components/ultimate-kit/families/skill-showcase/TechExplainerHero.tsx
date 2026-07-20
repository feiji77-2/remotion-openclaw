import React from 'react';
import {AbsoluteFill, Easing, interpolate} from 'remotion';
import type {SkillBeatHeroPreset, SkillShowcaseBeat} from './types';

const FONT = '"PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", Inter, system-ui, sans-serif';
const MONO = '"SFMono-Regular", "JetBrains Mono", Menlo, Consolas, monospace';
const clamp = {extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const};
const easeOut = Easing.bezier(0.16, 1, 0.3, 1);

const progressFor = (frame: number, beat: SkillShowcaseBeat) => {
  const duration = Math.max(1, beat.endFrame - beat.startFrame);
  return Math.max(0, Math.min(1, (frame - beat.startFrame) / duration));
};

const enterFor = (frame: number, beat: SkillShowcaseBeat) => interpolate(
  frame,
  [beat.startFrame - 5, beat.startFrame + 13],
  [0, 1],
  {...clamp, easing: easeOut},
);

const short = (value: string | undefined, fallback: string, length = 30) => {
  const normalized = String(value ?? '').replace(/\s+/gu, ' ').trim();
  return (normalized || fallback).slice(0, length);
};

const evidenceFor = (beat: SkillShowcaseBeat, fallbacks: string[]) => {
  const items = [
    ...(beat.evidence ?? []),
    ...String(beat.detail ?? '').split(/[，。；;、]/u),
  ].map((item) => short(item, '', 26)).filter(Boolean);
  return [...new Set([...items, ...fallbacks])].slice(0, Math.max(4, fallbacks.length));
};

const windowTitle = (preset: SkillBeatHeroPreset) => ({
  'browser-demo': 'localhost:3000 / preview',
  'terminal-run': 'skill-runner — zsh',
  'code-diff': 'design.config.ts — changes',
  'config-inspector': 'skill.config.json',
  'ui-audit': 'interface-audit / live',
  'workflow-trace': 'execution-trace / pipeline',
  'test-report': 'verification-suite / report',
  'asset-gallery': 'system-assets / library',
  'system-map': 'runtime-graph / dependencies',
  'before-after': 'output-compare / review',
}[preset]);

const WindowShell: React.FC<{
  preset: SkillBeatHeroPreset;
  accent: string;
  secondary: string;
  enter: number;
  children: React.ReactNode;
  status?: string;
}> = ({preset, accent, secondary, enter, children, status = 'LIVE'}) => (
  <div style={{
    position: 'absolute',
    left: 70,
    right: 70,
    top: 92,
    bottom: 118,
    borderRadius: 20,
    overflow: 'hidden',
    border: '1px solid rgba(255,255,255,0.13)',
    background: 'rgba(5,8,15,0.96)',
    boxShadow: `0 34px 110px rgba(0,0,0,0.52), 0 0 50px ${accent}18`,
    opacity: enter,
    transform: `translateY(${interpolate(enter, [0, 1], [42, 0])}px) scale(${interpolate(enter, [0, 1], [0.965, 1])})`,
    fontFamily: FONT,
  }}>
    <div style={{height: 54, display: 'flex', alignItems: 'center', padding: '0 18px', gap: 8, borderBottom: '1px solid rgba(255,255,255,0.09)', background: 'rgba(255,255,255,0.025)'}}>
      {['#ff5f57', '#febc2e', '#28c840'].map((color) => <div key={color} style={{width: 10, height: 10, borderRadius: '50%', background: color, opacity: 0.86}} />)}
      <div style={{fontFamily: MONO, fontSize: 11, color: 'rgba(255,255,255,0.42)', marginLeft: 10}}>{windowTitle(preset)}</div>
      <div style={{marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, fontFamily: MONO, fontSize: 10, color: accent, letterSpacing: 1.1}}>
        <div style={{width: 6, height: 6, borderRadius: '50%', background: accent, boxShadow: `0 0 12px ${accent}`}} />
        {status}
      </div>
    </div>
    <div style={{position: 'absolute', left: 0, right: 0, top: 54, bottom: 0, overflow: 'hidden'}}>{children}</div>
    <div style={{position: 'absolute', left: 0, right: 0, top: 52, height: 2, background: `linear-gradient(90deg, transparent, ${accent}, ${secondary}, transparent)`, opacity: 0.8}} />
  </div>
);

const EvidenceFooter: React.FC<{beat: SkillShowcaseBeat; accent: string; enter: number}> = ({beat, accent, enter}) => (
  <div style={{position: 'absolute', left: 88, right: 88, bottom: 50, height: 44, display: 'flex', alignItems: 'center', gap: 12, opacity: enter, transform: `translateY(${interpolate(enter, [0, 1], [18, 0])}px)`}}>
    <div style={{fontFamily: MONO, fontSize: 10, color: accent, letterSpacing: 1.5, fontWeight: 900}}>EVIDENCE / {beat.action.toUpperCase()}</div>
    <div style={{height: 1, flex: 1, background: `linear-gradient(90deg, ${accent}88, transparent)`}} />
    <div style={{fontFamily: MONO, fontSize: 10, color: 'rgba(255,255,255,0.35)'}}>FRAME-LOCKED</div>
  </div>
);

const Cursor: React.FC<{x: number; y: number; accent: string; down?: boolean}> = ({x, y, accent, down}) => (
  <div style={{position: 'absolute', left: x, top: y, width: 24, height: 30, transform: `rotate(-18deg) scale(${down ? 0.86 : 1})`, filter: `drop-shadow(0 0 8px ${accent})`}}>
    <div style={{width: 0, height: 0, borderTop: '22px solid #fff', borderRight: '13px solid transparent'}} />
  </div>
);

const BrowserDemo: React.FC<{beat: SkillShowcaseBeat; accent: string; secondary: string; p: number; enter: number}> = ({beat, accent, secondary, p, enter}) => {
  const items = evidenceFor(beat, ['读取输入', '应用规则', '生成结果', '发布预览']);
  const cursorX = interpolate(p, [0, 0.42, 0.72, 1], [708, 620, 735, 735], clamp);
  const cursorY = interpolate(p, [0, 0.42, 0.72, 1], [180, 430, 622, 622], clamp);
  const activated = interpolate(p, [0.48, 0.62], [0, 1], clamp);
  return (
    <WindowShell preset="browser-demo" accent={accent} secondary={secondary} enter={enter}>
      <div style={{position: 'absolute', inset: 0, display: 'grid', gridTemplateColumns: '185px 1fr'}}>
        <div style={{borderRight: '1px solid rgba(255,255,255,0.08)', padding: '28px 18px', background: 'rgba(255,255,255,0.018)'}}>
          <div style={{fontFamily: MONO, color: accent, fontSize: 11, marginBottom: 22}}>WORKSPACE</div>
          {items.map((item, index) => <div key={item} style={{height: 42, padding: '0 11px', marginTop: 8, display: 'flex', alignItems: 'center', gap: 9, borderRadius: 7, background: index === Math.min(3, Math.floor(p * 4)) ? `${accent}1c` : 'transparent', color: index === Math.min(3, Math.floor(p * 4)) ? '#fff' : 'rgba(255,255,255,0.44)', fontSize: 12, fontWeight: 750}}><div style={{width: 7, height: 7, borderRadius: 2, background: index === Math.min(3, Math.floor(p * 4)) ? accent : '#455064'}} />{item}</div>)}
        </div>
        <div style={{position: 'relative', padding: 32}}>
          <div style={{fontFamily: MONO, fontSize: 11, color: 'rgba(255,255,255,0.35)'}}>PREVIEW / RESPONSIVE CANVAS</div>
          <div style={{height: 90, marginTop: 22, border: `1px solid ${accent}44`, background: `linear-gradient(110deg, ${accent}18, ${secondary}0d)`, padding: '19px 22px'}}>
            <div style={{height: 8, width: '24%', background: accent}} />
            <div style={{height: 18, width: `${interpolate(p, [0, 1], [42, 72])}%`, marginTop: 14, background: 'rgba(255,255,255,0.84)'}} />
          </div>
          <div style={{display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 15, marginTop: 15}}>
            <div style={{height: 270, border: '1px solid rgba(255,255,255,0.1)', padding: 20}}>
              {[0, 1, 2].map((index) => <div key={index} style={{height: 62, marginBottom: 12, background: index === 1 ? `${accent}18` : 'rgba(255,255,255,0.045)', borderLeft: `3px solid ${index === 1 ? accent : '#30394a'}`, transform: `translateX(${interpolate(enter, [0, 1], [28 * (index + 1), 0])}px)`}} />)}
            </div>
            <div style={{height: 270, border: '1px solid rgba(255,255,255,0.1)', padding: 18}}>
              <div style={{fontFamily: MONO, fontSize: 10, color: secondary}}>INSPECTOR</div>
              {items.slice(0, 4).map((item, index) => <div key={item} style={{display: 'flex', justifyContent: 'space-between', marginTop: 20, color: 'rgba(255,255,255,0.55)', fontSize: 11}}><span>{item}</span><span style={{fontFamily: MONO, color: index < Math.floor(p * 5) ? accent : '#556076'}}>{index < Math.floor(p * 5) ? '✓' : '—'}</span></div>)}
            </div>
          </div>
          <div style={{position: 'absolute', right: 34, bottom: 30, height: 46, padding: '0 22px', display: 'grid', placeItems: 'center', borderRadius: 8, background: activated ? accent : '#252d3b', color: activated ? '#07100b' : '#8d98aa', fontFamily: MONO, fontSize: 11, fontWeight: 900}}>APPLY CHANGES</div>
          <Cursor x={cursorX - 185} y={cursorY - 54} accent={accent} down={p > 0.5 && p < 0.62} />
        </div>
      </div>
    </WindowShell>
  );
};

const TerminalRun: React.FC<{beat: SkillShowcaseBeat; accent: string; secondary: string; p: number; enter: number}> = ({beat, accent, secondary, p, enter}) => {
  const lines = evidenceFor(beat, ['loading skill contract', 'resolving scene data', 'running visual checks', 'render ready']);
  const command = `skill run --input "${short(beat.keyword, 'topic', 14)}"`;
  const typed = command.slice(0, Math.floor(command.length * interpolate(p, [0, 0.34], [0, 1], clamp)));
  return (
    <WindowShell preset="terminal-run" accent={accent} secondary={secondary} enter={enter} status={p > 0.84 ? 'EXIT 0' : 'RUNNING'}>
      <div style={{position: 'absolute', inset: 0, padding: '34px 38px', fontFamily: MONO}}>
        <div style={{fontSize: 15, lineHeight: 1.8, color: '#dbe5f5'}}><span style={{color: accent}}>➜</span> <span style={{color: secondary}}>~/project</span> {typed}<span style={{display: 'inline-block', width: 8, height: 17, marginLeft: 3, verticalAlign: -3, background: accent, opacity: Math.floor(p * 16) % 2 ? 0.25 : 1}} /></div>
        <div style={{marginTop: 32}}>
          {lines.map((line, index) => {
            const row = interpolate(p, [0.22 + index * 0.13, 0.36 + index * 0.13], [0, 1], clamp);
            return <div key={`${line}-${index}`} style={{height: 62, display: 'grid', gridTemplateColumns: '34px 1fr 84px', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.055)', opacity: row, transform: `translateX(${interpolate(row, [0, 1], [-20, 0])}px)`, color: 'rgba(255,255,255,0.68)', fontSize: 13}}><span style={{color: row > 0.8 ? accent : '#647086'}}>{row > 0.8 ? '✓' : '·'}</span><span>{line}</span><span style={{color: row > 0.8 ? accent : '#647086', textAlign: 'right'}}>{row > 0.8 ? `${36 + index * 17}ms` : '...'}</span></div>;
          })}
        </div>
        <div style={{position: 'absolute', left: 38, right: 38, bottom: 34, border: `1px solid ${accent}44`, background: `${accent}0c`, minHeight: 78, padding: '18px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', opacity: interpolate(p, [0.7, 0.88], [0, 1], clamp)}}>
          <span style={{color: '#fff', fontSize: 12}}>{short(beat.detail, 'Execution completed with reusable scene data.', 52)}</span>
          <span style={{color: accent, fontWeight: 900, fontSize: 11}}>READY</span>
        </div>
      </div>
    </WindowShell>
  );
};

const CodeDiff: React.FC<{beat: SkillShowcaseBeat; accent: string; secondary: string; p: number; enter: number}> = ({beat, accent, secondary, p, enter}) => {
  const lines = evidenceFor(beat, ['generic defaults', 'opinionated tokens', 'shared spacing scale', 'validated output']);
  const reveal = Math.floor(interpolate(p, [0.12, 0.86], [0, 8], clamp));
  return (
    <WindowShell preset="code-diff" accent={accent} secondary={secondary} enter={enter} status="4 CHANGES">
      <div style={{position: 'absolute', inset: 0, padding: '25px 0', fontFamily: MONO}}>
        <div style={{display: 'grid', gridTemplateColumns: '52px 1fr', padding: '0 25px 18px', color: 'rgba(255,255,255,0.32)', fontSize: 10}}><span>LN</span><span>CONFIGURATION DIFF</span></div>
        {Array.from({length: 8}).map((_, index) => {
          const added = index % 2 === 1;
          const visible = index < reveal;
          const content = added ? `+ ${['preset', 'tokens', 'layout', 'checks'][Math.floor(index / 2)]}: "${lines[Math.floor(index / 2)]}"` : `- ${['preset', 'tokens', 'layout', 'checks'][Math.floor(index / 2)]}: "default"`;
          return <div key={index} style={{height: 55, display: 'grid', gridTemplateColumns: '52px 1fr', alignItems: 'center', padding: '0 25px', background: added ? `${accent}10` : 'rgba(255,77,108,0.075)', borderLeft: `3px solid ${added ? accent : '#ff5f75'}`, opacity: visible ? 1 : 0.08, transform: `translateX(${visible ? 0 : added ? 24 : -24}px)`, color: added ? '#bfffe0' : '#ffb5c0', fontSize: 13}}><span style={{color: 'rgba(255,255,255,0.25)'}}>{index + 12}</span><span>{content}</span></div>;
        })}
        <div style={{position: 'absolute', right: 24, bottom: 20, display: 'flex', gap: 9}}>{['TYPE', 'TOKEN', 'A11Y'].map((item, index) => <div key={item} style={{padding: '8px 10px', border: `1px solid ${index < p * 4 ? accent : '#384254'}`, color: index < p * 4 ? accent : '#667286', fontSize: 9}}>{item} ✓</div>)}</div>
      </div>
    </WindowShell>
  );
};

const ConfigInspector: React.FC<{beat: SkillShowcaseBeat; accent: string; secondary: string; p: number; enter: number}> = ({beat, accent, secondary, p, enter}) => {
  const items = evidenceFor(beat, ['typography', 'color', 'spacing', 'accessibility']);
  const active = Math.min(items.length - 1, Math.floor(p * items.length));
  return (
    <WindowShell preset="config-inspector" accent={accent} secondary={secondary} enter={enter}>
      <div style={{position: 'absolute', inset: 0, display: 'grid', gridTemplateColumns: '1.14fr 0.86fr', fontFamily: MONO}}>
        <div style={{padding: '30px 26px', borderRight: '1px solid rgba(255,255,255,0.08)', fontSize: 13, lineHeight: 2.1, color: '#c8d1e1'}}>
          <div style={{color: '#6d7890'}}>01&nbsp; {'{'}</div>
          {items.map((item, index) => <div key={item} style={{paddingLeft: 24, background: index === active ? `${accent}10` : 'transparent', borderLeft: `2px solid ${index === active ? accent : 'transparent'}`, opacity: interpolate(enter, [0, 1], [0.2, 1])}}><span style={{color: secondary}}>"{short(item, `field_${index}`, 18)}"</span>: <span style={{color: index <= active ? accent : '#8894a8'}}>"enabled"</span>,</div>)}
          <div style={{paddingLeft: 24}}><span style={{color: secondary}}>"strict"</span>: <span style={{color: '#ffc75c'}}>true</span></div>
          <div style={{color: '#6d7890'}}>08&nbsp; {'}'}</div>
        </div>
        <div style={{padding: '30px 24px'}}>
          <div style={{fontSize: 10, color: accent, letterSpacing: 1.3}}>PROPERTY INSPECTOR</div>
          <div style={{marginTop: 18, padding: 16, background: `${accent}10`, border: `1px solid ${accent}44`}}>
            <div style={{fontSize: 10, color: 'rgba(255,255,255,0.35)'}}>SELECTED</div>
            <div style={{fontFamily: FONT, fontSize: 18, color: '#fff', marginTop: 8, fontWeight: 850}}>{items[active]}</div>
          </div>
          {['source', 'mode', 'scope', 'status'].map((label, index) => <div key={label} style={{height: 54, borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11, color: 'rgba(255,255,255,0.42)'}}><span>{label}</span><span style={{color: index === 3 ? accent : '#d6deec'}}>{index === 0 ? 'skill' : index === 1 ? 'strict' : index === 2 ? 'global' : 'valid'}</span></div>)}
          <div style={{height: 7, marginTop: 28, background: '#18202d'}}><div style={{height: '100%', width: `${interpolate(p, [0, 1], [16, 100])}%`, background: `linear-gradient(90deg, ${secondary}, ${accent})`}} /></div>
        </div>
      </div>
    </WindowShell>
  );
};

const UiAudit: React.FC<{beat: SkillShowcaseBeat; accent: string; secondary: string; p: number; enter: number}> = ({beat, accent, secondary, p, enter}) => {
  const issues = evidenceFor(beat, ['contrast ratio', 'spacing drift', 'missing label', 'focus order']);
  const scanY = interpolate(p, [0.08, 0.86], [38, 650], clamp);
  return (
    <WindowShell preset="ui-audit" accent={accent} secondary={secondary} enter={enter} status="SCANNING">
      <div style={{position: 'absolute', inset: 0, display: 'grid', gridTemplateColumns: '1fr 260px'}}>
        <div style={{position: 'relative', padding: 28}}>
          <div style={{height: 74, border: '1px solid rgba(255,255,255,0.1)', padding: 18}}><div style={{height: 10, width: '32%', background: '#fff'}} /><div style={{height: 7, width: '56%', marginTop: 13, background: '#3c4658'}} /></div>
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14, marginTop: 14}}>{Array.from({length: 4}).map((_, index) => <div key={index} style={{height: 170, position: 'relative', border: `1px solid ${index < p * 5 ? `${accent}66` : 'rgba(255,255,255,0.09)'}`, background: index === 1 ? `${secondary}12` : 'rgba(255,255,255,0.028)', padding: 16}}><div style={{width: 38, height: 38, borderRadius: index % 2 ? 19 : 4, background: index % 2 ? `${accent}bb` : '#3c4658'}} /><div style={{height: 10, width: '64%', marginTop: 20, background: '#dce4ef'}} /><div style={{height: 7, width: '82%', marginTop: 13, background: '#3c4658'}} />{index < p * 5 ? <div style={{position: 'absolute', right: 8, top: 8, width: 22, height: 22, borderRadius: '50%', background: '#ff5f75', display: 'grid', placeItems: 'center', color: '#fff', fontFamily: MONO, fontSize: 10}}>{index + 1}</div> : null}</div>)}</div>
          <div style={{position: 'absolute', left: 18, right: 18, top: scanY, height: 3, background: `linear-gradient(90deg, transparent, ${accent}, #fff, transparent)`, boxShadow: `0 0 24px ${accent}`}} />
        </div>
        <div style={{padding: '26px 19px', borderLeft: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.018)'}}>
          <div style={{fontFamily: MONO, fontSize: 10, color: accent}}>ISSUE QUEUE</div>
          {issues.slice(0, 4).map((issue, index) => { const found = p > 0.2 + index * 0.14; return <div key={issue} style={{minHeight: 78, marginTop: 14, padding: 12, border: `1px solid ${found ? '#ff5f7555' : '#2c3545'}`, opacity: found ? 1 : 0.25, transform: `translateX(${found ? 0 : 15}px)`}}><div style={{fontSize: 11, color: found ? '#ff9aaa' : '#667286', fontWeight: 800}}>{found ? `0${index + 1} / FLAG` : 'WAITING'}</div><div style={{fontSize: 12, color: '#fff', marginTop: 8}}>{issue}</div></div>;})}
        </div>
      </div>
    </WindowShell>
  );
};

const WorkflowTrace: React.FC<{beat: SkillShowcaseBeat; accent: string; secondary: string; p: number; enter: number}> = ({beat, accent, secondary, p, enter}) => {
  const labels = evidenceFor(beat, ['INPUT', 'SKILL GATE', 'RULE ENGINE', 'OUTPUT']).slice(0, 4);
  const packet = interpolate(p, [0.08, 0.9], [70, 710], clamp);
  return (
    <WindowShell preset="workflow-trace" accent={accent} secondary={secondary} enter={enter} status="TRACE 01">
      <div style={{position: 'absolute', inset: 0, padding: '62px 34px', fontFamily: MONO}}>
        <div style={{position: 'absolute', left: 100, right: 100, top: 182, height: 3, background: 'rgba(255,255,255,0.1)'}}><div style={{height: '100%', width: `${interpolate(p, [0, 1], [0, 100])}%`, background: `linear-gradient(90deg, ${secondary}, ${accent})`}} /></div>
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 22}}>{labels.map((label, index) => {const on = p > index * 0.23; return <div key={label} style={{position: 'relative', height: 244, padding: '26px 15px', border: `1px solid ${on ? accent : '#313a4b'}`, background: on ? `${accent}0e` : '#0b101a', textAlign: 'center'}}><div style={{width: 46, height: 46, borderRadius: '50%', margin: '0 auto', border: `2px solid ${on ? accent : '#465166'}`, display: 'grid', placeItems: 'center', color: on ? accent : '#637087', fontSize: 13}}>{String(index + 1).padStart(2, '0')}</div><div style={{fontFamily: FONT, fontSize: 13, lineHeight: 1.25, color: on ? '#fff' : '#637087', marginTop: 26, fontWeight: 800}}>{label}</div><div style={{height: 5, marginTop: 32, background: '#1a2230'}}><div style={{height: '100%', width: on ? '100%' : '0%', background: accent}} /></div><div style={{fontSize: 9, color: on ? accent : '#4b5669', marginTop: 18}}>{on ? 'PASSED' : 'PENDING'}</div></div>;})}</div>
        <div style={{position: 'absolute', left: packet, top: 169, width: 27, height: 27, borderRadius: '50%', background: '#fff', border: `7px solid ${accent}`, boxShadow: `0 0 30px ${accent}`}} />
        <div style={{marginTop: 36, display: 'grid', gridTemplateColumns: '120px 1fr 80px', gap: 16, color: 'rgba(255,255,255,0.42)', fontSize: 10}}><span>EVENT LOG</span><span>{short(beat.detail, 'Data crossed the reusable skill boundary.', 58)}</span><span style={{color: accent, textAlign: 'right'}}>OK</span></div>
      </div>
    </WindowShell>
  );
};

const TestReport: React.FC<{beat: SkillShowcaseBeat; accent: string; secondary: string; p: number; enter: number}> = ({beat, accent, secondary, p, enter}) => {
  const tests = evidenceFor(beat, ['visual contract', 'caption binding', 'safe zone', 'frame continuity']);
  const completed = Math.min(tests.length, Math.floor(interpolate(p, [0.12, 0.82], [0, tests.length + 1], clamp)));
  return (
    <WindowShell preset="test-report" accent={accent} secondary={secondary} enter={enter} status={completed === tests.length ? 'ALL PASS' : 'TESTING'}>
      <div style={{position: 'absolute', inset: 0, display: 'grid', gridTemplateColumns: '1fr 250px', fontFamily: MONO}}>
        <div style={{padding: '30px 28px'}}>
          <div style={{display: 'grid', gridTemplateColumns: '1fr 88px 82px', color: 'rgba(255,255,255,0.3)', fontSize: 9, paddingBottom: 15}}><span>CHECK</span><span>TIME</span><span>STATUS</span></div>
          {tests.slice(0, 4).map((test, index) => {const done = index < completed; return <div key={test} style={{height: 82, display: 'grid', gridTemplateColumns: '1fr 88px 82px', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.07)', opacity: done ? 1 : 0.28, transform: `translateX(${done ? 0 : 16}px)`}}><span style={{fontFamily: FONT, fontSize: 14, color: '#fff', fontWeight: 750}}>{test}</span><span style={{fontSize: 10, color: '#7f8ca1'}}>{42 + index * 23}ms</span><span style={{fontSize: 10, color: done ? accent : '#626d80'}}>{done ? '✓ PASS' : 'WAIT'}</span></div>;})}
        </div>
        <div style={{padding: '32px 24px', borderLeft: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.018)'}}>
          <div style={{fontSize: 10, color: accent}}>COVERAGE</div>
          <div style={{height: 180, marginTop: 24, display: 'flex', alignItems: 'flex-end', gap: 10}}>{[0.68, 0.9, 0.76, 1, 0.84].map((value, index) => <div key={index} style={{height: `${value * interpolate(p, [0, 0.8], [0, 100], clamp)}%`, flex: 1, background: `linear-gradient(180deg, ${index % 2 ? secondary : accent}, ${accent}33)`}} />)}</div>
          <div style={{height: 1, background: '#2c3544', marginTop: 14}} />
          {['FRAMES', 'TYPE', 'DECODE'].map((label, index) => <div key={label} style={{display: 'flex', justifyContent: 'space-between', marginTop: 26, fontSize: 10, color: 'rgba(255,255,255,0.4)'}}><span>{label}</span><span style={{color: index < completed ? accent : '#5b6678'}}>{index < completed ? 'VALID' : '...'}</span></div>)}
        </div>
      </div>
    </WindowShell>
  );
};

const AssetGallery: React.FC<{beat: SkillShowcaseBeat; accent: string; secondary: string; p: number; enter: number}> = ({beat, accent, secondary, p, enter}) => {
  const items = evidenceFor(beat, ['Swiss', 'Editorial', 'Nordic', 'Neo']).slice(0, 4);
  return (
    <WindowShell preset="asset-gallery" accent={accent} secondary={secondary} enter={enter} status="LIBRARY">
      <div style={{position: 'absolute', inset: 0, padding: '28px'}}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}><div style={{fontFamily: MONO, color: 'rgba(255,255,255,0.35)', fontSize: 10}}>4 REUSABLE ASSETS</div><div style={{display: 'flex', gap: 7}}>{[accent, secondary, '#ffc44d', '#ff5f91'].map((color) => <div key={color} style={{width: 17, height: 17, background: color}} />)}</div></div>
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginTop: 24}}>{items.map((item, index) => {const active = index <= p * 4; return <div key={item} style={{height: 252, padding: 20, position: 'relative', overflow: 'hidden', border: `1px solid ${active ? (index % 2 ? secondary : accent) : '#30394a'}`, background: index % 4 === 0 ? '#f0eee6' : index % 4 === 1 ? '#111824' : index % 4 === 2 ? '#efe5ce' : '#15101c', color: index % 2 ? '#fff' : '#10131a', opacity: active ? 1 : 0.25, transform: `translateY(${active ? 0 : 24}px)`}}><div style={{fontFamily: MONO, fontSize: 9, opacity: 0.6}}>ASSET / 0{index + 1}</div><div style={{fontSize: 22, fontWeight: 950, marginTop: 28}}>{item}</div><div style={{height: index % 2 ? 68 : 4, width: index % 2 ? '70%' : '88%', marginTop: 30, background: index % 2 ? `linear-gradient(135deg, ${accent}, ${secondary})` : accent}} /><div style={{position: 'absolute', left: 20, right: 20, bottom: 18, display: 'flex', gap: 8}}>{Array.from({length: 4}).map((_, token) => <div key={token} style={{height: 6 + token * 4, flex: 1, background: token % 2 ? secondary : accent, opacity: 0.35 + token * 0.15}} />)}</div></div>;})}</div>
      </div>
    </WindowShell>
  );
};

const SystemMap: React.FC<{beat: SkillShowcaseBeat; accent: string; secondary: string; p: number; enter: number}> = ({beat, accent, secondary, p, enter}) => {
  const items = evidenceFor(beat, ['Input', 'Rules', 'Renderer', 'Output']);
  const nodes = [[120, 150], [690, 140], [120, 510], [690, 520]] as const;
  return (
    <WindowShell preset="system-map" accent={accent} secondary={secondary} enter={enter} status="CONNECTED">
      <div style={{position: 'absolute', inset: 0, fontFamily: MONO}}>
        <svg width="100%" height="100%" viewBox="0 0 940 810" style={{position: 'absolute', inset: 0}}>{nodes.map(([x, y], index) => {const line = interpolate(p, [index * 0.12, index * 0.12 + 0.38], [0, 1], clamp); return <line key={index} x1={x + 80} y1={y + 55} x2={470} y2={405} stroke={index % 2 ? secondary : accent} strokeWidth="2" strokeDasharray={`${line * 380} 500`} opacity="0.8" />;})}<circle cx="470" cy="405" r={interpolate(p, [0.18, 0.55], [0, 92], clamp)} fill={`${accent}14`} stroke={accent} strokeWidth="2" /></svg>
        {nodes.map(([x, y], index) => {const node = interpolate(p, [0.08 + index * 0.1, 0.3 + index * 0.1], [0, 1], clamp); return <div key={index} style={{position: 'absolute', left: x, top: y, width: 160, height: 110, padding: 18, border: `1px solid ${index % 2 ? secondary : accent}`, background: '#0a0f19', opacity: node, transform: `scale(${interpolate(node, [0, 1], [0.78, 1])})`}}><div style={{fontSize: 9, color: index % 2 ? secondary : accent}}>NODE / 0{index + 1}</div><div style={{fontFamily: FONT, color: '#fff', fontSize: 14, fontWeight: 800, marginTop: 15}}>{items[index]}</div><div style={{height: 4, marginTop: 17, background: '#1f2837'}}><div style={{width: `${node * 100}%`, height: '100%', background: index % 2 ? secondary : accent}} /></div></div>;})}
        <div style={{position: 'absolute', left: 390, top: 325, width: 160, height: 160, borderRadius: '50%', display: 'grid', placeItems: 'center', textAlign: 'center', background: '#080d16', border: `2px solid ${accent}`, boxShadow: `0 0 50px ${accent}33`, opacity: interpolate(p, [0.3, 0.55], [0, 1], clamp)}}><div><div style={{fontSize: 10, color: accent}}>SYSTEM</div><div style={{fontFamily: FONT, fontSize: 18, color: '#fff', fontWeight: 900, marginTop: 8}}>REUSABLE</div></div></div>
      </div>
    </WindowShell>
  );
};

const BeforeAfter: React.FC<{beat: SkillShowcaseBeat; accent: string; secondary: string; p: number; enter: number}> = ({beat, accent, secondary, p, enter}) => {
  const labels = evidenceFor(beat, ['DEFAULT OUTPUT', 'SKILL OUTPUT']);
  const divider = interpolate(p, [0.12, 0.84], [18, 76], clamp);
  return (
    <WindowShell preset="before-after" accent={accent} secondary={secondary} enter={enter} status="COMPARE">
      <div style={{position: 'absolute', inset: 0, overflow: 'hidden'}}>
        <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(145deg, #6840a0, #20356f)', padding: '42px'}}>
          <div style={{fontFamily: MONO, fontSize: 10, color: '#decfff'}}>{labels[0]}</div><div style={{fontSize: 32, fontWeight: 900, color: '#fff', marginTop: 24}}>Everything centered.</div>
          {Array.from({length: 4}).map((_, index) => <div key={index} style={{height: 86, width: '72%', margin: '18px auto 0', borderRadius: 30, background: 'rgba(255,255,255,0.13)'}} />)}
        </div>
        <div style={{position: 'absolute', inset: 0, clipPath: `inset(0 0 0 ${divider}%)`, background: '#eef0e9', color: '#111', padding: '42px'}}>
          <div style={{fontFamily: MONO, fontSize: 10, color: '#1b8e5c'}}>{labels[1]}</div><div style={{fontSize: 34, fontWeight: 950, color: '#10131a', marginTop: 24, maxWidth: 520}}>A system with a point of view.</div>
          <div style={{height: 5, width: '38%', background: accent, marginTop: 30}} />
          {Array.from({length: 3}).map((_, index) => <div key={index} style={{height: 92, width: index === 1 ? '82%' : '64%', marginTop: 22, border: '1px solid #aeb5ac', borderLeft: `6px solid ${index % 2 ? secondary : accent}`, background: index === 1 ? '#fff' : '#e4e7df'}} />)}
        </div>
        <div style={{position: 'absolute', left: `${divider}%`, top: 0, bottom: 0, width: 3, background: '#fff', boxShadow: `0 0 24px ${accent}`}}><div style={{position: 'absolute', left: -19, top: '50%', width: 40, height: 40, marginTop: -20, borderRadius: '50%', border: '2px solid #fff', background: '#0b1019', color: accent, display: 'grid', placeItems: 'center', fontFamily: MONO, fontSize: 13}}>↔</div></div>
      </div>
    </WindowShell>
  );
};

const PRESETS: SkillBeatHeroPreset[] = [
  'browser-demo', 'terminal-run', 'code-diff', 'config-inspector', 'ui-audit',
  'workflow-trace', 'test-report', 'asset-gallery', 'system-map', 'before-after',
];

export const TECH_EXPLAINER_HERO_PRESETS = PRESETS;

export const TechExplainerHero: React.FC<{
  frame: number;
  beat: SkillShowcaseBeat;
  accent: string;
  secondary: string;
}> = ({frame, beat, accent, secondary}) => {
  const preset = beat.heroPreset ?? 'browser-demo';
  const p = progressFor(frame, beat);
  const enter = enterFor(frame, beat);
  const overlap = 7;
  const opacity = enter * interpolate(frame, [beat.endFrame - 9, beat.endFrame + overlap], [1, 0], clamp);
  const common = {beat, accent, secondary, p, enter};
  const visual = (() => {
    switch (preset) {
      case 'terminal-run': return <TerminalRun {...common} />;
      case 'code-diff': return <CodeDiff {...common} />;
      case 'config-inspector': return <ConfigInspector {...common} />;
      case 'ui-audit': return <UiAudit {...common} />;
      case 'workflow-trace': return <WorkflowTrace {...common} />;
      case 'test-report': return <TestReport {...common} />;
      case 'asset-gallery': return <AssetGallery {...common} />;
      case 'system-map': return <SystemMap {...common} />;
      case 'before-after': return <BeforeAfter {...common} />;
      case 'browser-demo':
      default: return <BrowserDemo {...common} />;
    }
  })();
  return (
    <AbsoluteFill style={{opacity, fontFamily: FONT}}>
      {visual}
      <EvidenceFooter beat={beat} accent={accent} enter={enter} />
    </AbsoluteFill>
  );
};
