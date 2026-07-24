import React from 'react';
import {AbsoluteFill, Easing, interpolate} from 'remotion';
import type {HeroTrack, HeroLens, HeroShot, HeroTrackState, VisualDirector, VisualSystem} from './types';
import {ProductionComponentCatalogSchema, type ProductionComponentId} from '../../../../project/visualPlan';
import {PORTRAIT_COLOR_THEME, resolvePortraitVisualTheme} from './portraitColorTheme';
import componentCatalog from './productionComponentCatalog.json';

const FONT = '"PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", Inter, system-ui, sans-serif';
const MONO = '"SFMono-Regular", "JetBrains Mono", Menlo, Consolas, monospace';
const clamp = {extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const};
const ease = Easing.bezier(0.16, 1, 0.3, 1);
const DEFAULT_VISUAL_THEME = resolvePortraitVisualTheme();
const DEFAULT_STAGE_CONTEXT: {
  accent: string;
  secondary: string;
  p: number;
  visualSystem?: VisualSystem;
  visualTheme: ReturnType<typeof resolvePortraitVisualTheme>;
} = {
  accent: PORTRAIT_COLOR_THEME.palette[4],
  secondary: PORTRAIT_COLOR_THEME.palette[3],
  p: 1,
  visualTheme: DEFAULT_VISUAL_THEME,
};
const ProductionStageContext = React.createContext(DEFAULT_STAGE_CONTEXT);

const stateProgress = (frame: number, state: HeroTrackState) => {
  const duration = Math.max(1, state.endFrame - state.startFrame);
  return interpolate(frame, [state.startFrame, state.startFrame + Math.min(18, duration * 0.25)], [0, 1], {...clamp, easing: ease});
};

const stateOpacity = (frame: number, state: HeroTrackState) => {
  const enter = stateProgress(frame, state);
  const exit = interpolate(frame, [state.endFrame - 9, state.endFrame], [1, 0], {...clamp, easing: Easing.in(Easing.cubic)});
  return enter * exit;
};

const textFit = (text: string, normal: number, compact = 26) => text.length > 20 ? compact : text.length > 13 ? Math.round((normal + compact) / 2) : normal;

const EvidenceChips: React.FC<{items: string[]; accent: string; p: number; dark?: boolean}> = ({items, accent, p, dark = true}) => (
  <div style={{display: 'flex', gap: 10, flexWrap: 'wrap'}}>
    {items.slice(0, 4).map((item, index) => {
      const shown = interpolate(p, [0.16 + index * 0.1, 0.36 + index * 0.1], [0, 1], {...clamp, easing: ease});
      return <div key={`${item}-${index}`} style={{padding: '8px 12px', border: `1px solid ${accent}${dark ? '66' : '99'}`, background: dark ? `${accent}12` : '#fff', color: dark ? '#e8f0fb' : '#10141b', fontFamily: MONO, fontSize: 12, fontWeight: 800, opacity: shown, transform: `translateY(${interpolate(shown, [0, 1], [12, 0])}px)`}}>{item}</div>;
    })}
  </div>
);

const ProductionDepthEnvironment: React.FC<{
  accent: string;
  secondary: string;
  p: number;
  seed?: string;
  visualTheme?: ReturnType<typeof resolvePortraitVisualTheme>;
}> = ({accent, secondary, p, seed = '', visualTheme = DEFAULT_VISUAL_THEME}) => {
  const variant = seededVariant(seed || accent, 7);
  const glowX = 14 + variant * 11;
  const glowY = 18 + (variant % 4) * 15;
  const swing = Math.sin(p * Math.PI);
  const gridSize = interpolate(p, [0, 1], [92, 70], clamp);
  return <>
    <AbsoluteFill style={{background: PORTRAIT_COLOR_THEME.stage}} />
    <AbsoluteFill
      data-stage-depth-map="near-black-chroma"
      style={{
        background: `linear-gradient(${124 + variant * 7}deg, #04070d 0%, #111927 28%, #091c26 52%, #140d22 74%, #06050c 100%)`,
        opacity: .84,
      }}
    />
    <div style={{position: 'absolute', width: 860, height: 860, left: `${glowX - 28}%`, top: `${glowY - 42}%`, borderRadius: '50%', background: `radial-gradient(circle, ${accent}24, transparent 67%)`, opacity: (.34 + swing * .26) * visualTheme.glowBoost}} />
    <div style={{position: 'absolute', width: 720, height: 720, right: -340 + variant * 18, bottom: -310, borderRadius: '50%', background: `radial-gradient(circle, ${secondary}1f, transparent 70%)`, opacity: (.38 + p * .18) * visualTheme.glowBoost}} />
    <div
      data-stage-grid="low-contrast"
      style={{
        position: 'absolute',
        inset: 0,
        opacity: visualTheme.gridOpacity,
        backgroundImage: `linear-gradient(${PORTRAIT_COLOR_THEME.stageGrid} 1px, transparent 1px), linear-gradient(90deg, ${PORTRAIT_COLOR_THEME.stageGrid} 1px, transparent 1px)`,
        backgroundSize: `${gridSize}px ${gridSize}px`,
        transform: `translate3d(${interpolate(p, [0, 1], [-12, 12], clamp)}px, ${interpolate(p, [0, 1], [10, -10], clamp)}px, 0)`,
      }}
    />
    <div
      data-stage-grain="chromatic-depth"
      style={{
        position: 'absolute',
        inset: -40,
        opacity: (.24 + swing * .08) * visualTheme.glowBoost,
        backgroundImage: `radial-gradient(circle at ${22 + variant * 9}% ${18 + variant * 5}%, ${accent}12, transparent 42%), radial-gradient(circle at ${74 - variant * 5}% ${72 - variant * 4}%, ${secondary}10, transparent 44%), repeating-conic-gradient(from ${variant * 19}deg at 50% 52%, ${accent}0f 0deg 8deg, transparent 8deg 17deg, ${secondary}0d 17deg 25deg, transparent 25deg 38deg)`,
        backgroundSize: '100% 100%, 100% 100%, 23px 29px',
        mixBlendMode: 'screen',
      }}
    />
    <div style={{position: 'absolute', left: 48, right: 48, top: 36, height: 1, background: `linear-gradient(90deg, transparent, ${PORTRAIT_COLOR_THEME.stageGridStrong}, transparent)`, opacity: .42}} />
    <AbsoluteFill data-stage-vignette="cinematic" style={{background: `radial-gradient(circle at 50% 42%, transparent 0 42%, ${PORTRAIT_COLOR_THEME.stageVignette} 100%)`}} />
    <AbsoluteFill style={{background: `linear-gradient(180deg, transparent 0, rgba(255,255,255,${0.018 + swing * 0.025}) 46%, ${PORTRAIT_COLOR_THEME.stageShadow} 100%)`}} />
  </>;
};

const TrackShell: React.FC<{label: string; detail: string; accent: string; p: number; children: React.ReactNode}> = ({label, detail, accent, p, children}) => {
  const stage = React.useContext(ProductionStageContext);
  return (
    <AbsoluteFill data-production-stage="depth" style={{fontFamily: FONT, overflow: 'hidden', background: PORTRAIT_COLOR_THEME.stage}}>
      <ProductionDepthEnvironment accent={accent} secondary={stage.secondary} p={p} seed={`${label}:${detail}`} visualTheme={stage.visualTheme} />
      <div style={{position: 'absolute', inset: 0, opacity: interpolate(p, [0, 1], [0.25, 1], clamp), transform: `translateY(${interpolate(p, [0, 1], [18, 0], clamp)}px)`}}>{children}</div>
    </AbsoluteFill>
  );
};

const OverviewMatrix: React.FC<{state: HeroTrackState; accent: string; secondary: string; p: number; stateIndex: number; target: string}> = ({state, accent, secondary, p, stateIndex, target}) => {
  const items = productionEvidence(state, 6);
  const targetIndex = Number(target.match(/(?:item|skill)-(\d+)/)?.[1]) - 1;
  const active = Number.isFinite(targetIndex) && targetIndex >= 0 ? targetIndex : Math.min(items.length - 1, Math.floor((stateIndex + p) * 2));
  return <TrackShell label={productionTitle(state, 28)} detail={productionDetail(state)} accent={accent} p={p}>
    <div style={{position: 'absolute', left: 40, top: 42, fontSize: 72, lineHeight: 1, color: '#fff', fontWeight: 950}}>{productionTitle(state, 20)} <span style={{color: accent}}>ready</span></div>
    <div style={{position: 'absolute', left: 40, right: 40, top: 176, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16}}>{items.map((item, index) => {
      const shown = interpolate(p, [index * 0.08, 0.26 + index * 0.08], [0, 1], {...clamp, easing: ease});
      const isActive = index === active;
      return <div key={`${item}-${index}`} style={{height: 76, padding: '0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: `1px solid ${isActive ? accent : 'rgba(255,255,255,.15)'}`, background: isActive ? `${accent}18` : 'rgba(7,10,18,.62)', color: isActive ? '#fff' : 'rgba(255,255,255,.74)', fontSize: 23, fontWeight: 900, opacity: shown, transform: `translateY(${interpolate(shown, [0, 1], [26, 0])}px)`}}><span>{compact(item, 22)}</span><span style={{color: isActive ? accent : '#59677c', fontFamily: MONO}}>0{index + 1}</span></div>;
    })}</div>
    <div style={{position: 'absolute', left: 40, right: 40, bottom: 32}}><EvidenceChips items={items} accent={secondary} p={p} /></div>
  </TrackShell>;
};

const RuleCompare: React.FC<{state: HeroTrackState; accent: string; secondary: string; p: number; stateIndex: number; target: string}> = ({state, accent, secondary, p, stateIndex, target}) => {
  const evidence = productionEvidence(state, 6);
  const split = Math.max(1, Math.ceil(evidence.length / 2));
  const bad = [state.shot?.before ?? state.componentProps?.before, ...evidence.slice(0, split)].filter(Boolean);
  const good = [state.shot?.after ?? state.componentProps?.after, ...evidence.slice(split)].filter(Boolean);
  const solvedRows = Math.min(good.length, stateIndex + Math.floor(p * 2) + 1);
  const activeBad = Number(target.match(/bad-rule-(\d+)/)?.[1]) - 1;
  const activeGood = Number(target.match(/good-rule-(\d+)/)?.[1]) - 1;
  const pulse = interpolate(p, [0, 0.12, 0.62, 1], [0, 1, 0.86, 0.78], {...clamp, easing: ease});
  return <TrackShell label={productionTitle(state, 28)} detail={productionDetail(state)} accent={accent} p={p}>
    <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginTop: 10}}>
      {[{title: 'before', items: bad, color: '#ff5f7a'}, {title: 'after', items: good, color: accent}].map((panel) => <div key={panel.title} style={{border: `1px solid ${panel.color}88`, background: `${panel.color}0d`, padding: 18}}><div style={{fontSize: 20, color: panel.color, fontWeight: 950}}>{panel.title}</div>{panel.items.map((item, index) => {const verified = index < solvedRows; const current = panel.title === 'before' ? index === activeBad : index === activeGood; const itemOpacity = interpolate(p, [index * .08, .3 + index * .08], [0, 1], clamp); return <div key={`${item}-${index}`} style={{position: 'relative', marginTop: 13, padding: '10px 12px', borderTop: '1px solid rgba(255,255,255,.09)', borderLeft: current ? `5px solid ${panel.color}` : '5px solid transparent', background: current ? `${panel.color}24` : 'transparent', color: panel.title === 'before' && verified ? 'rgba(255,255,255,.42)' : '#f2f5fa', textDecoration: panel.title === 'before' && verified && !current ? 'line-through' : undefined, fontSize: 17, fontWeight: current ? 950 : 800, opacity: itemOpacity, transform: `translateX(${current ? interpolate(pulse, [0, 1], [-18, 0]) : 0}px)`, boxShadow: current ? `0 0 ${30 * pulse}px ${panel.color}36` : undefined}}>{current ? <div style={{position: 'absolute', inset: 0, opacity: pulse, background: `linear-gradient(90deg, ${panel.color}24, transparent 72%)`}} /> : null}<span style={{position: 'relative'}}>{panel.title === 'before' ? '×' : verified ? '✓' : '○'} {compact(item, 30)}</span></div>;})}</div>)}
    </div>
    <div style={{position: 'absolute', left: 0, right: 0, bottom: 20, height: 170, padding: 18, background: target === 'terminal-verify' ? `${accent}12` : PORTRAIT_COLOR_THEME.surfaceMuted, border: `1px solid ${target === 'terminal-verify' ? accent : 'rgba(255,255,255,.12)'}`, fontFamily: MONO, boxShadow: target === 'terminal-verify' ? `0 0 ${42 * pulse}px ${accent}26` : undefined}}><div style={{color: PORTRAIT_COLOR_THEME.textMuted, fontSize: 12}}>TRACE / CURRENT CAPTION</div><div style={{marginTop: 20, fontSize: 18, color: '#dce5f3'}}>{compact(state.shot?.command ?? state.label, 48)}</div><div style={{marginTop: 14, color: accent, fontSize: 16, opacity: p}}>✓ {solvedRows}/{Math.max(1, good.length)} signals aligned</div></div>
  </TrackShell>;
};

const CodeRender: React.FC<{state: HeroTrackState; accent: string; secondary: string; p: number; stateIndex: number; target: string}> = ({state, accent, secondary, p, stateIndex, target}) => {
  const evidence = productionEvidence(state, 4);
  const lines = [
    state.shot?.before ?? state.componentProps?.path ?? state.label,
    state.shot?.after ?? state.componentProps?.command ?? state.detail,
    evidence[0] ?? state.label,
    evidence[1] ?? state.detail,
  ];
  const typed = Math.min(lines.length, Math.max(1, stateIndex + Math.floor(interpolate(p, [0.1, 0.62], [0, 2], clamp)) + 1));
  const activeLine = Number(target.match(/code-line-(\d+)/)?.[1]) - 1;
  const activeTab = target === 'frame-track' ? 1 : target === 'mp4-output' ? 2 : 0;
  return <TrackShell label={productionTitle(state, 30)} detail={productionDetail(state)} accent={accent} p={p}>
    <div style={{padding: '22px 26px', border: `1px solid ${secondary}77`, background: PORTRAIT_COLOR_THEME.surfaceMuted, fontFamily: MONO}}><div style={{fontSize: 13, color: PORTRAIT_COLOR_THEME.textMuted}}>{compact(state.shot?.path ?? state.componentProps?.path ?? 'source', 30)}</div>{lines.map((line, index) => {const current = index === activeLine; return <div key={`${line}-${index}`} style={{marginTop: 16, padding: current ? '7px 10px' : undefined, marginLeft: current ? -10 : 0, marginRight: current ? -10 : 0, borderLeft: current ? `4px solid ${accent}` : '4px solid transparent', background: current ? `${accent}18` : 'transparent', color: index === 1 ? '#b4ff7c' : index === 2 ? '#f7c66f' : '#d6b8ff', fontSize: 19, fontWeight: current ? 900 : 500, opacity: index < typed ? 1 : 0.18, transform: `translateX(${current ? interpolate(p, [0, 1], [-16, 0], clamp) : 0}px)`}}>{compact(line, 62)}{current ? <span style={{color: accent}}>▋</span> : null}</div>;})}</div>
    <div style={{display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginTop: 22}}>{['Source', 'Frame', 'Output'].map((tab, index) => {const current = index === activeTab; return <div key={tab} style={{height: 86, display: 'grid', placeItems: 'center', border: `2px solid ${current ? accent : PORTRAIT_COLOR_THEME.line}`, color: current ? '#fff' : PORTRAIT_COLOR_THEME.textMuted, background: current ? `${accent}1c` : PORTRAIT_COLOR_THEME.surface, fontSize: 21, fontWeight: current ? 950 : 900, boxShadow: current ? `0 0 ${30 * p}px ${accent}3a` : undefined, transform: `translateY(${current ? interpolate(p, [0, 1], [14, 0], clamp) : 0}px)`}}>{tab}</div>;})}</div>
    <div style={{position: 'absolute', left: 26, right: 26, bottom: 38, height: 9, background: PORTRAIT_COLOR_THEME.line}}><div style={{height: '100%', width: `${interpolate(p, [0, 1], [5, 90], clamp)}%`, background: `linear-gradient(90deg, ${secondary}, ${accent})`}} /></div>
  </TrackShell>;
};

const SlideEditor: React.FC<{state: HeroTrackState; accent: string; secondary: string; p: number; target: string}> = ({state, accent, secondary, p, target}) => {
  const selectByTarget: Record<string, number> = {'slide-01': 0, 'shape-object': 0, 'chart-object': 1, 'text-object': 2, 'export-result': 3};
  const select = selectByTarget[target] ?? Math.floor(p * 4);
  const evidence = productionEvidence(state, 4);
  const selectedObject = evidence[select] ?? productionTitle(state, 22);
  const objectCurrent = (index: number) => (select === 0 && index === 0) || (select === 1 && index === 1) || (select === 2 && index === 2);
  const selectionPulse = interpolate(p, [0, .14, .55, 1], [.3, 1, .72, .85], {...clamp, easing: ease});
  const slideLabels = evidence.length >= 4 ? evidence : [state.label, ...evidence, state.detail].slice(0, 4);
  return <TrackShell label={productionTitle(state, 28)} detail={productionDetail(state)} accent={accent} p={p}>
    <div style={{display: 'grid', gridTemplateColumns: '126px minmax(0, 1fr) 156px', height: '100%', gap: 10}}>
      <div style={{padding: 10, background: PORTRAIT_COLOR_THEME.surfaceMuted, borderRight: `1px solid ${PORTRAIT_COLOR_THEME.line}`}}>
        <div style={{fontFamily: MONO, color: PORTRAIT_COLOR_THEME.textMuted, fontSize: 10, letterSpacing: 1.2, marginBottom: 11}}>SLIDES / 04</div>
        {[0, 1, 2, 3].map((item) => <div key={item} style={{height: 108, marginBottom: 11, padding: 7, background: item === select ? '#f4f0e6' : '#2a3447', border: `2px solid ${item === select ? accent : 'transparent'}`, opacity: interpolate(p, [item * .07, .2 + item * .07], [.25, 1], clamp), boxShadow: item === select ? `0 0 ${20 * selectionPulse}px ${accent}40` : undefined}}><div style={{height: 56, background: item === 0 ? secondary : item === 1 ? '#7b6ce0' : item === 2 ? '#e47d9d' : '#6da4af', opacity: .8}} /><div style={{marginTop: 7, color: item === select ? '#1a1b20' : '#d8e2f0', fontSize: 11, fontWeight: 900}}>{String(item + 1).padStart(2, '0')} {slideLabels[item]}</div></div>)}
      </div>
      <div style={{background: '#e2ded4', color: '#17171b', padding: '18px 18px 14px', position: 'relative', overflow: 'hidden'}}>
        <div style={{height: 32, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #b5b0a7', fontSize: 12, fontWeight: 950}}><span>{compact(state.label, 28)}</span><span style={{fontFamily: MONO, color: '#7e7770'}}>100% · 16:9</span></div>
        <div style={{position: 'absolute', left: 18, right: 18, top: 64, height: 18, backgroundImage: 'repeating-linear-gradient(90deg, transparent 0 19px, #aaa59b 20px)', borderTop: '1px solid #c4bfb5'}} />
        <div style={{position: 'absolute', top: 82, bottom: 18, left: 28, width: 18, backgroundImage: 'repeating-linear-gradient(0deg, transparent 0 19px, #aaa59b 20px)', borderLeft: '1px solid #c4bfb5'}} />
        <div style={{position: 'absolute', left: 55, right: 20, top: 84, bottom: 26, background: '#faf8f1', boxShadow: '0 8px 24px rgba(50,44,36,.16)'}}>
          <div style={{position: 'absolute', left: '13%', right: '13%', top: '31%', borderTop: '1px dashed #c4bfb5'}} /><div style={{position: 'absolute', top: '14%', bottom: '12%', left: '50%', borderLeft: '1px dashed #c4bfb5'}} />
          <div style={{position: 'absolute', left: 42, top: 36, fontSize: 27, lineHeight: 1, fontWeight: 950}}>{compact(productionTitle(state, 18), 18)}<br/><span style={{color: secondary}}>{compact(productionDetail(state, 18), 18)}</span></div>
          <div style={{position: 'absolute', left: '11%', top: '52%', width: 180, height: 90, background: secondary, opacity: .86, border: objectCurrent(0) ? `3px solid ${accent}` : '3px solid transparent', boxShadow: objectCurrent(0) ? `0 0 ${30 * selectionPulse}px ${accent}66` : undefined}} />
          <div style={{position: 'absolute', right: '14%', top: '39%', width: 138, height: 138, borderRadius: '50%', border: `11px solid ${accent}`, transform: `scale(${interpolate(p, [0, 1], [.68, 1], clamp)})`, opacity: .95}} />
          <div style={{position: 'absolute', left: '12%', right: '13%', bottom: '14%', height: 122, display: 'flex', gap: 13, alignItems: 'end'}}>{[48, 84, 128, 72].map((height, index) => <div key={index} style={{flex: 1, height, background: [accent, '#ff5f91', secondary, '#ffc44d'][index], border: objectCurrent(1) ? `3px solid ${accent}` : '3px solid transparent', boxShadow: objectCurrent(1) && index === 2 ? `0 0 ${28 * selectionPulse}px ${accent}66` : undefined}} />)}</div>
          <div style={{position: 'absolute', right: 28, top: 22, width: 114, fontSize: 13, fontWeight: 900, border: objectCurrent(2) ? `2px solid ${accent}` : '2px solid transparent', padding: 5, color: '#5d5960'}}>{compact(evidence[2] ?? state.label, 12)}</div>
          {select < 3 ? <><div style={{position: 'absolute', left: select === 0 ? '9%' : select === 1 ? '12%' : 'auto', right: select === 2 ? 24 : 'auto', top: select === 2 ? 20 : select === 1 ? '71%' : '49%', width: select === 0 ? 190 : select === 1 ? '77%' : 128, height: select === 0 ? 100 : select === 1 ? 140 : 56, border: `2px solid ${accent}`, pointerEvents: 'none'}} />{Array.from({length: 8}).map((_, i) => <div key={i} style={{position: 'absolute', left: `${select === 2 ? 0 : select === 1 ? (i < 4 ? 10 : 85) : (i % 2 ? 9 : 28)}%`, top: `${select === 2 ? (i < 4 ? 20 : 31) : select === 1 ? (i % 2 ? 70 : 86) : (i < 4 ? 49 : 62)}%`, width: 7, height: 7, marginLeft: i % 2 ? -3 : 0, marginTop: i > 3 ? -3 : 0, background: accent, transform: 'translate(-50%, -50%)'}} />)}</> : <div style={{position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', background: `${accent}12`, color: '#17231e', fontSize: 27, fontWeight: 950}}>✓ {compact(evidence[3] ?? state.detail, 22)}</div>}
        </div>
      </div>
      <div style={{padding: 12, background: PORTRAIT_COLOR_THEME.surface, borderLeft: `1px solid ${PORTRAIT_COLOR_THEME.line}`}}>
        <div style={{fontFamily: MONO, color: PORTRAIT_COLOR_THEME.textMuted, fontSize: 10, letterSpacing: 1.1}}>FORMAT</div><div style={{marginTop: 12, color: '#fff', fontSize: 15, fontWeight: 950}}>{selectedObject}</div>
        {[['填充', select === 0 ? secondary : '#e8e4d9'], ['描边', accent], ['位置', 'X 248 · Y 144'], ['层级', `Layer ${select + 1}`]].map(([name, value], index) => <div key={name} style={{marginTop: 16, paddingTop: 10, borderTop: `1px solid ${PORTRAIT_COLOR_THEME.line}`, fontSize: 11}}><div style={{color: PORTRAIT_COLOR_THEME.textMuted}}>{name}</div><div style={{marginTop: 6, color: value.startsWith('#') ? value : '#edf4ff', fontWeight: 900, fontFamily: index > 1 ? MONO : FONT}}>{value.startsWith('#') ? <span style={{display: 'inline-block', width: 18, height: 18, verticalAlign: 'middle', background: value, border: '1px solid rgba(255,255,255,.5)'}} /> : value}</div></div>)}
      </div>
    </div>
  </TrackShell>;
};

const ArticleMap: React.FC<{state: HeroTrackState; accent: string; secondary: string; p: number; target: string}> = ({state, accent, secondary, p, target}) => {
  const evidence = productionEvidence(state, 5);
  const nodes = [evidence[0] ?? state.label, evidence[1] ?? state.detail, evidence[2] ?? productionTitle(state)];
  const activeNode = target === 'article-source' ? 0 : target === 'article-body' ? 1 : target === 'article-bridge' || target === 'article-action' ? 2 : -1;
  const actionActive = target === 'article-action';
  const nodeX = [70, 350, 630];
  return <TrackShell label={productionTitle(state, 28)} detail={productionDetail(state)} accent={accent} p={p}>
    <div style={{position: 'absolute', inset: '4px 0 0', padding: 28, background: '#f8f5ed', color: '#1a1c21', overflow: 'hidden'}}>
      <div style={{color: '#d7506d', fontSize: 21, fontWeight: 950}}>{compact(productionTitle(state, 28), 28)}</div><div style={{color: '#777', fontSize: 16, marginTop: 8}}>{compact(productionDetail(state, 58), 58)}</div>
      <div style={{position: 'absolute', left: 28, top: 105, width: 225, padding: 14, background: '#fff', borderLeft: `5px solid ${activeNode === 0 ? accent : '#202124'}`, boxShadow: activeNode === 0 ? `0 0 ${26 * p}px ${accent}33` : '0 4px 12px rgba(30,30,30,.08)'}}><div style={{fontFamily: MONO, fontSize: 11, color: '#8c8076'}}>SOURCE / 01</div><div style={{marginTop: 8, fontSize: 15, fontWeight: 900}}>“{compact(evidence[0] ?? state.label, 24)}”</div><div style={{marginTop: 8, color: '#736c66', fontSize: 12}}>{compact(evidence[1] ?? state.detail, 38)}</div></div>
      <div style={{position: 'absolute', right: 28, top: 105, width: 220, padding: 14, background: '#20242b', color: '#f8f5ed', borderLeft: `5px solid ${actionActive ? accent : '#ff5f91'}`, boxShadow: actionActive ? `0 0 ${26 * p}px ${accent}33` : undefined}}><div style={{fontFamily: MONO, fontSize: 11, color: '#ffb1bf'}}>ACTION / 03</div><div style={{marginTop: 8, fontSize: 15, fontWeight: 900}}>{compact(evidence[2] ?? state.label, 26)}</div><div style={{marginTop: 10, color: '#bac3ce', fontSize: 12}}>{compact(evidence[3] ?? state.detail, 38)}</div></div>
      <svg viewBox="0 0 860 560" style={{position: 'absolute', left: 0, right: 0, top: 142, width: '100%', height: 560, pointerEvents: 'none'}}><path d="M190 205 C275 205 285 268 365 268" fill="none" stroke={activeNode === 0 || activeNode === 1 ? accent : '#202124'} strokeWidth="4" strokeDasharray={`${interpolate(p, [.08, .62], [0, 260], clamp)} 300`} /><path d="M540 268 C610 268 620 205 695 205" fill="none" stroke={activeNode === 1 || activeNode === 2 ? accent : '#202124'} strokeWidth="4" strokeDasharray={`${interpolate(p, [.2, .78], [0, 240], clamp)} 280`} /><path d="M445 332 C445 390 445 410 445 456" fill="none" stroke={actionActive ? accent : '#7e756e'} strokeWidth="3" strokeDasharray="8 12" /></svg>
      <div style={{position: 'absolute', left: 290, top: 224, fontFamily: MONO, fontSize: 11, color: '#777'}}>提炼判断</div><div style={{position: 'absolute', right: 255, top: 224, fontFamily: MONO, fontSize: 11, color: '#777'}}>承接结论</div>
      {nodes.map((node, index) => {const shown = interpolate(p, [.1 + index * .18, .32 + index * .18], [0, 1], {...clamp, easing: ease}); const current = index === activeNode; return <div key={node} style={{position: 'absolute', left: nodeX[index], top: index === 1 ? 292 : 272, width: 190, height: 110, display: 'grid', placeItems: 'center', border: `4px solid ${current ? accent : index === 2 ? '#ff5f91' : '#292a30'}`, background: current ? `${accent}22` : index === 1 ? '#fff0aa' : '#fff', borderRadius: index === 1 ? 60 : 0, fontSize: 25, fontWeight: 950, opacity: shown, transform: `scale(${interpolate(shown, [0, 1], [.7, 1], clamp)})`, boxShadow: current ? `0 0 ${34 * p}px ${accent}66` : undefined}}>{node}<span style={{position: 'absolute', bottom: -25, fontFamily: MONO, fontSize: 10, color: '#726b64'}}>{['证据', '观点', '结构'][index]}</span></div>;})}
      <div style={{position: 'absolute', left: 175, right: 175, bottom: 36, minHeight: 118, padding: '17px 20px', background: '#fff', border: `3px solid ${actionActive ? accent : '#222'}`, boxShadow: actionActive ? `0 0 ${30 * p}px ${accent}33` : '0 4px 12px rgba(30,30,30,.09)'}}><div style={{fontFamily: MONO, color: '#806f66', fontSize: 11}}>VISUAL OUTPUT</div><div style={{marginTop: 9, fontSize: 22, fontWeight: 950}}>{compact(productionTitle(state, 34), 34)}</div><div style={{marginTop: 5, fontSize: 12, color: '#6d6863'}}>{compact(productionDetail(state, 46), 46)}</div></div>
    </div>
  </TrackShell>;
};

const VideoAgent: React.FC<{state: HeroTrackState; accent: string; secondary: string; p: number}> = ({state, accent, secondary, p}) => <TrackShell label={productionTitle(state, 30)} detail={productionDetail(state)} accent={accent} p={p}>
  <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, height: '100%'}}><div style={{padding: 22, background: '#0b111b', border: '1px solid rgba(255,255,255,.1)', fontFamily: MONO}}><div style={{color: accent, fontSize: 13}}>INPUT / SOURCE</div><div style={{marginTop: 30, color: '#d6e4f7', fontSize: 18}}>{compact(state.shot?.path ?? state.label, 34)}</div><div style={{marginTop: 13, color: '#b8c2d0', fontSize: 18}}>{compact(state.shot?.command ?? state.detail, 44)}</div><div style={{marginTop: 13, color: '#d6e4f7', fontSize: 18}}>{compact(state.shot?.target ?? productionTitle(state), 42)}</div><EvidenceChips items={productionEvidence(state, 4)} accent={accent} p={p} /></div><div style={{padding: 22, background: `${secondary}12`, border: `1px solid ${secondary}77`}}><div style={{fontFamily: MONO, color: secondary, fontSize: 13}}>OUTPUT / RENDER</div><div style={{height: 280, marginTop: 24, display: 'grid', placeItems: 'center', border: `1px solid ${accent}66`, background: '#101827'}}><div style={{width: 92, height: 92, borderRadius: '50%', display: 'grid', placeItems: 'center', border: `3px solid ${accent}`, color: accent, fontSize: 34, transform: `scale(${interpolate(p, [0, 1], [.7, 1], clamp)})`}}>▶</div></div><div style={{marginTop: 20, display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6}}>{Array.from({length: 8}).map((_, index) => <div key={index} style={{height: 38, background: index < p * 9 ? accent : '#263143'}} />)}</div></div></div>
</TrackShell>;

const DesignCompare: React.FC<{state: HeroTrackState; accent: string; secondary: string; p: number; target: string}> = ({state, accent, secondary, p, target}) => {
  const tokenIndex = target === 'type-token' ? 0 : target === 'space-token' ? 1 : target === 'color-token' ? 2 : target === 'system-token' ? 3 : -1;
  const beforeActive = target === 'before-surface' || tokenIndex < 0;
  const tokenNames = ['TYPE', 'SPACE', 'COLOR', 'SYSTEM'];
  const evidence = productionEvidence(state, 4);
  const tokenValues = evidence.length >= 4 ? evidence : [state.label, state.detail, ...evidence].slice(0, 4);
  const before = state.shot?.before ?? state.componentProps?.before ?? evidence[0] ?? state.label;
  const after = state.shot?.after ?? state.componentProps?.after ?? evidence[1] ?? state.detail;
  const highlightPulse = interpolate(p, [0, .14, .54, 1], [.25, 1, .7, .9], {...clamp, easing: ease});
  return <TrackShell label={productionTitle(state, 30)} detail={productionDetail(state)} accent={accent} p={p}>
    <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, height: 462}}>
      <div style={{position: 'relative'}}><div style={{fontFamily: MONO, color: '#ff7e9b', fontSize: 13, fontWeight: 900}}>BEFORE</div><div style={{height: 426, marginTop: 12, padding: 22, borderRadius: 16, overflow: 'hidden', position: 'relative', background: 'linear-gradient(160deg, #7d42ff, #2856d8)', border: beforeActive ? `2px solid #ff7e9b` : '2px solid transparent', boxShadow: beforeActive ? `0 0 ${32 * highlightPulse}px #ff7e9b55` : undefined}}><div style={{position: 'absolute', left: 18, right: 18, top: 16, display: 'flex', justifyContent: 'space-between', color: 'rgba(255,255,255,.58)', fontFamily: MONO, fontSize: 10}}><span>{compact(state.shot?.target ?? state.label, 18)}</span><span>00:00</span></div><div style={{marginTop: 42, fontSize: 31, lineHeight: .96, fontWeight: 950, color: '#fff'}}>{compact(before, 36)}</div>{[0, 1, 2].map((index) => <div key={index} style={{height: 55, marginTop: index ? 15 : 28, marginLeft: index === 1 ? 14 : 0, marginRight: index === 2 ? 20 : 0, borderRadius: 24, background: 'rgba(255,255,255,.16)', border: index === 1 && beforeActive ? '1px solid rgba(255,255,255,.68)' : '1px solid transparent'}} />)}<div style={{height: 52, marginTop: 18, borderRadius: 28, background: '#fff', color: '#6d42d8', display: 'grid', placeItems: 'center', fontWeight: 950}}>{compact(evidence[2] ?? state.label, 18)}</div><div style={{position: 'absolute', right: 15, bottom: 15, color: '#fff', fontFamily: MONO, fontSize: 10, opacity: .78}}>UNSTRUCTURED</div></div></div>
      <div style={{position: 'relative'}}><div style={{fontFamily: MONO, color: accent, fontSize: 13, fontWeight: 900}}>AFTER</div><div style={{height: 426, marginTop: 12, padding: 22, position: 'relative', overflow: 'hidden', background: '#f6f3e8', color: '#17191c', border: tokenIndex >= 0 ? `2px solid ${accent}` : '2px solid transparent', boxShadow: tokenIndex >= 0 ? `0 0 ${32 * highlightPulse}px ${accent}4d` : undefined}}><div style={{position: 'absolute', inset: 0, opacity: .22, backgroundImage: 'linear-gradient(90deg, #777 1px, transparent 1px)', backgroundSize: '28px 100%'}} /><div style={{position: 'relative', display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 900}}><span>{compact(productionTitle(state, 16), 16)}</span><span>MENU</span></div><div style={{position: 'relative', fontSize: 38, lineHeight: .98, fontWeight: 950, marginTop: 58}}>{compact(after, 36)}</div><div style={{position: 'relative', height: 4, width: `${interpolate(p, [0, 1], [20, 78], clamp)}%`, background: secondary, marginTop: 24}} /><div style={{position: 'relative', height: 128, marginTop: 44, background: '#17372c'}}><div style={{position: 'absolute', left: 26, top: 22, width: 68, height: 68, border: '8px solid #f2c85c', borderRadius: '50%'}} /><div style={{position: 'absolute', right: 20, top: 22, color: '#f6f3e8', fontFamily: MONO, fontSize: 11}}>01 / 04<br/>SYSTEM</div></div><div style={{position: 'absolute', left: 16, bottom: 10, fontFamily: MONO, fontSize: 10, color: '#6f6a62'}}>GRID 12 · BASELINE 8 · CONTRAST AA</div></div></div>
    </div>
    <div style={{display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginTop: 22}}>{tokenNames.map((item, index) => {const current = index === tokenIndex; const revealed = index <= Math.max(0, Math.floor(p * 4)); return <div key={item} style={{height: 104, padding: '14px 13px', borderTop: `4px solid ${current ? accent : revealed ? secondary : PORTRAIT_COLOR_THEME.line}`, background: current ? `${accent}16` : PORTRAIT_COLOR_THEME.surfaceMuted, color: current ? '#fff' : '#b7c5d7', boxShadow: current ? `0 0 ${28 * highlightPulse}px ${accent}40` : undefined, transform: `translateY(${current ? interpolate(highlightPulse, [0, 1], [12, 0]) : 0}px)`, opacity: revealed || current ? 1 : .38}}><div style={{fontFamily: MONO, fontSize: 11, fontWeight: 950}}>{String(index + 1).padStart(2, '0')} / {item}</div><div style={{marginTop: 13, fontSize: 12, lineHeight: 1.25, color: current ? accent : PORTRAIT_COLOR_THEME.textMuted, fontWeight: 800}}>{tokenValues[index]}</div></div>;})}</div>
  </TrackShell>;
};

const SystemSummary: React.FC<{state: HeroTrackState; accent: string; secondary: string; p: number; brandName: string}> = ({state, accent, secondary, p, brandName}) => {
  const nodes = productionEvidence(state, 6);
  const positions = [[80, 90], [370, 45], [635, 120], [100, 360], [375, 430], [645, 350]];
  return <TrackShell label={productionTitle(state, 30)} detail={productionDetail(state)} accent={accent} p={p}>
    <svg viewBox="0 0 860 650" style={{position: 'absolute', inset: 0, width: '100%', height: '100%'}}>{positions.map(([x, y], index) => index === 0 ? null : <line key={index} x1="430" y1="290" x2={x + 80} y2={y + 42} stroke={index % 2 ? accent : secondary} strokeWidth="3" strokeDasharray={`${interpolate(p, [0.08 + index * .05, .48 + index * .05], [0, 420], clamp)} 520`} opacity=".8" />)}</svg>
    <div style={{position: 'absolute', left: 365, top: 245, width: 150, height: 110, display: 'grid', placeItems: 'center', border: `3px solid ${accent}`, background: '#0b111c', color: '#fff', fontWeight: 950, textAlign: 'center', boxShadow: `0 0 30px ${accent}44`, fontSize: textFit(brandName, 21, 15), lineHeight: 1.05}}>{brandName}</div>{nodes.map((node, index) => {const shown = interpolate(p, [.12 + index * .08, .3 + index * .08], [0, 1], {...clamp, easing: ease}); const [x, y] = positions[index]; return <div key={node} style={{position: 'absolute', left: x, top: y, width: 160, minHeight: 84, padding: 12, display: 'grid', placeItems: 'center', border: `1px solid ${index % 2 ? secondary : accent}`, background: '#0a101a', color: '#f3f6fb', fontSize: 16, fontWeight: 900, textAlign: 'center', opacity: shown, transform: `scale(${interpolate(shown, [0, 1], [.75, 1], clamp)})`}}>{node}</div>;})}
  </TrackShell>;
};

const compact = (value: string | undefined, max = 42) => {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim();
  return text.length > max ? `${text.slice(0, max - 3)}...` : text;
};

const ShotFrame: React.FC<{shot: HeroShot; lens?: HeroLens; accent: string; secondary: string; p: number; children: React.ReactNode}> = ({shot, lens, accent, secondary, p, children}) => {
  const evidence = shot.evidence.length ? shot.evidence : [shot.target];
  return <div style={{position: 'absolute', left: 34, right: 34, top: 24, bottom: 24, display: 'grid', gridTemplateRows: '74px minmax(0,1fr)', border: `1px solid ${accent}66`, background: 'rgba(6,10,16,.78)', boxShadow: `0 24px 70px rgba(0,0,0,.28), inset 0 1px 0 rgba(255,255,255,.05)`, overflow: 'hidden'}}>
    <div style={{display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 230px', alignItems: 'center', gap: 18, padding: '0 22px', borderBottom: '1px solid rgba(255,255,255,.09)', background: 'rgba(8,13,22,.82)'}}>
      <div>
        <div style={{display: 'flex', alignItems: 'center', gap: 10, fontFamily: MONO, color: accent, fontSize: 12, fontWeight: 950, letterSpacing: 1.1}}><span>{shot.environment}</span><span style={{color: 'rgba(255,255,255,.28)'}}>/</span><span>{lens?.actionLabel ?? shot.kind}</span></div>
        <div style={{marginTop: 8, color: 'rgba(255,255,255,.72)', fontSize: 17, lineHeight: 1.18, fontWeight: 800}}>{compact(lens?.objective, 66)}</div>
      </div>
      <div style={{fontFamily: MONO, color: 'rgba(255,255,255,.52)', fontSize: 11, textAlign: 'right'}}>{lens?.evidenceType ?? 'evidence'}<br/><span style={{color: secondary}}>target: {compact(shot.target, 28)}</span></div>
    </div>
    <div style={{display: 'grid', gridTemplateColumns: '205px minmax(0, 1fr)', minHeight: 0}}>
      <div style={{borderRight: '1px solid rgba(255,255,255,.09)', padding: '20px 15px', background: 'rgba(255,255,255,.025)'}}>
        {evidence.slice(0, 5).map((item, index) => {
          const shown = interpolate(p, [index * .1, .28 + index * .1], [0, 1], {...clamp, easing: ease});
          return <div key={`${item}-${index}`} style={{position: 'relative', minHeight: 50, marginBottom: 11, padding: '9px 10px 9px 14px', borderLeft: `4px solid ${index === 0 ? accent : 'rgba(255,255,255,.18)'}`, background: index === 0 ? `${accent}16` : 'rgba(255,255,255,.04)', color: index === 0 ? '#fff' : 'rgba(255,255,255,.62)', fontSize: 13, lineHeight: 1.22, fontWeight: 850, opacity: shown, transform: `translateX(${interpolate(shown, [0, 1], [18, 0], clamp)}px)`}}>
            <div style={{fontFamily: MONO, color: index === 0 ? accent : 'rgba(255,255,255,.34)', fontSize: 10, marginBottom: 4}}>EVIDENCE {String(index + 1).padStart(2, '0')}</div>
            {compact(item, 34)}
          </div>;
        })}
      </div>
      <div style={{position: 'relative', minHeight: 0, padding: 20}}>{children}</div>
    </div>
  </div>;
};

const LineRows: React.FC<{items: string[]; accent: string; p: number; danger?: boolean}> = ({items, accent, p, danger = false}) => <div style={{display: 'grid', gap: 10}}>
  {items.map((item, index) => {
    const shown = interpolate(p, [index * .08, .34 + index * .08], [0, 1], {...clamp, easing: ease});
    return <div key={`${item}-${index}`} style={{height: 38, display: 'flex', alignItems: 'center', gap: 10, padding: '0 12px', background: index === items.length - 1 ? `${accent}18` : 'rgba(255,255,255,.045)', borderLeft: `4px solid ${index === items.length - 1 ? accent : danger && index === 0 ? '#ff6b88' : 'rgba(255,255,255,.16)'}`, color: index === items.length - 1 ? '#fff' : 'rgba(255,255,255,.68)', fontFamily: MONO, fontSize: 13, opacity: shown, transform: `translateY(${interpolate(shown, [0, 1], [14, 0], clamp)}px)`}}><span style={{color: 'rgba(255,255,255,.32)'}}>{String(index + 1).padStart(2, '0')}</span>{item}</div>;
  })}
</div>;

const TechnicalShotHero: React.FC<{state: HeroTrackState; accent: string; secondary: string; p: number; expectedKind?: HeroShot['kind']}> = ({state, accent, secondary, p, expectedKind}) => {
  const shot = state.shot;
  if (!shot) return null;
  if (expectedKind && shot.kind !== expectedKind) return null;
  const sweep = interpolate(p, [0, 1], [0, 1], {...clamp, easing: ease});
  const metric = shot.metric ?? '100%';
  const body = (() => {
    if (shot.kind === 'browser-demo') {
      return <div style={{display: 'grid', gridTemplateColumns: '1fr 250px', gap: 14, height: '100%'}}>
        <div style={{border: '1px solid rgba(255,255,255,.12)', background: '#f7f8fb', color: '#111827', overflow: 'hidden'}}>
          <div style={{height: 38, display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px', borderBottom: '1px solid #d6dce6', fontFamily: MONO, fontSize: 11}}><span style={{width: 9, height: 9, borderRadius: 99, background: '#ff6b88'}} /><span style={{width: 9, height: 9, borderRadius: 99, background: '#ffd166'}} /><span style={{width: 9, height: 9, borderRadius: 99, background: '#63f0aa'}} /><span style={{marginLeft: 12, color: '#687386'}}>/preview/{compact(state.label, 18)}</span></div>
          <div style={{padding: 24}}><div style={{height: 42, width: '58%', background: '#151923'}} /><div style={{height: 12, width: '72%', marginTop: 18, background: '#cdd4df'}} /><div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 28}}>{[0, 1, 2, 3].map((item) => <div key={item} style={{height: 86, border: item === 1 ? `3px solid ${accent}` : '1px solid #d6dce6', background: item === 1 ? `${accent}18` : '#fff', boxShadow: item === 1 ? `0 0 ${30 * sweep}px ${accent}55` : undefined}} />)}</div></div>
        </div>
        <div style={{border: '1px solid rgba(255,255,255,.12)', background: '#101827', padding: 13, fontFamily: MONO}}><div style={{color: secondary, fontSize: 11, fontWeight: 950}}>DEVTOOLS / DOM</div><LineRows items={['<main data-state="loading">', '<button aria-busy="false">', '<section data-ready="true">']} accent={accent} p={p} /></div>
      </div>;
    }
    if (shot.kind === 'terminal-execution') {
      return <div style={{height: '100%', border: '1px solid rgba(255,255,255,.12)', background: '#070b11', padding: 22, fontFamily: MONO}}>
        <div style={{color: accent, fontSize: 13}}>$ {shot.command ?? 'npm run verify'}</div>
        <LineRows items={[`project: ${compact(state.label, 24)}`, shot.log ?? 'running checks...', 'done in 3.2s', 'exit code 0']} accent={accent} p={p} />
        <div style={{position: 'absolute', left: 42, right: 42, bottom: 34, height: 8, background: 'rgba(255,255,255,.1)'}}><div style={{height: '100%', width: `${interpolate(sweep, [0, 1], [12, 100], clamp)}%`, background: `linear-gradient(90deg, ${secondary}, ${accent})`}} /></div>
      </div>;
    }
    if (shot.kind === 'code-diff') {
      return <div style={{display: 'grid', gridTemplateColumns: '155px 1fr', gap: 14, height: '100%', fontFamily: MONO}}>
        <div style={{border: '1px solid rgba(255,255,255,.1)', background: '#0a111c', padding: 14, color: 'rgba(255,255,255,.62)', fontSize: 12}}>{['src', 'components', compact(shot.path ?? 'change.ts', 18), 'tests'].map((item, index) => <div key={item} style={{padding: '8px 6px', background: index === 2 ? `${accent}18` : 'transparent', color: index === 2 ? '#fff' : undefined}}>{item}</div>)}</div>
        <div style={{border: '1px solid rgba(255,255,255,.1)', background: '#0b111b', padding: 16}}><LineRows items={[shot.before ?? '- reuse cached video URL', shot.after ?? '+ attach artifact version key', '+ render uses current project state']} accent={accent} p={p} danger /></div>
      </div>;
    }
    if (shot.kind === 'config-check') {
      return <div style={{display: 'grid', gridTemplateColumns: '1fr 230px', gap: 14, height: '100%'}}>
        <div style={{border: '1px solid rgba(255,255,255,.1)', background: '#0b111b', padding: 18, fontFamily: MONO}}><div style={{color: secondary, fontSize: 12}}>{shot.path ?? 'config.json'}</div><LineRows items={['"semanticBeat": "caption-bound"', '"hero": "operation-evidence"', '"cachePolicy": "versioned"']} accent={accent} p={p} /></div>
        <div style={{border: `1px solid ${accent}66`, background: `${accent}12`, padding: 18}}><div style={{fontFamily: MONO, color: accent, fontSize: 12}}>CHECK</div><div style={{marginTop: 34, color: '#fff', fontSize: 28, lineHeight: 1.1, fontWeight: 950}}>rules loaded</div><div style={{marginTop: 20, color: 'rgba(255,255,255,.62)', fontSize: 15, lineHeight: 1.35}}>配置变更被重新读取，画面合同进入当前渲染。</div></div>
      </div>;
    }
    if (shot.kind === 'interface-audit') {
      return <div style={{display: 'grid', gridTemplateColumns: '1fr 260px', gap: 14, height: '100%'}}>
        <div style={{position: 'relative', border: '1px solid rgba(255,255,255,.1)', background: '#f2f5f8', padding: 22}}><div style={{height: 56, background: '#141923'}} /><div style={{height: 88, marginTop: 22, border: `4px solid ${accent}`, background: `${accent}18`, boxShadow: `0 0 ${34 * sweep}px ${accent}55`}} /><div style={{height: 52, marginTop: 16, background: '#dbe2eb'}} /><div style={{position: 'absolute', left: 42, right: 42, top: `${interpolate(sweep, [0, 1], [70, 230], clamp)}px`, height: 3, background: `linear-gradient(90deg, transparent, ${accent}, transparent)`}} /></div>
        <div style={{border: '1px solid rgba(255,255,255,.12)', background: '#101827', padding: 14}}><div style={{fontFamily: MONO, color: secondary, fontSize: 12}}>INSPECTOR</div><LineRows items={['issue: stale render', 'component: preview canvas', 'status: fixed']} accent={accent} p={p} danger /></div>
      </div>;
    }
    if (shot.kind === 'flow-trace') {
      const nodes = shot.evidence.slice(0, 3);
      return <div style={{position: 'relative', height: '100%', border: '1px solid rgba(255,255,255,.1)', background: '#0b111b', overflow: 'hidden'}}>
        <svg viewBox="0 0 620 330" style={{position: 'absolute', inset: 0, width: '100%', height: '100%'}}><path d="M115 165 C230 70 390 70 505 165" fill="none" stroke={accent} strokeWidth="4" strokeDasharray={`${interpolate(sweep, [0, 1], [0, 520], clamp)} 560`} /><path d="M115 165 C230 260 390 260 505 165" fill="none" stroke={secondary} strokeWidth="3" strokeDasharray={`${interpolate(sweep, [0, 1], [0, 520], clamp)} 560`} opacity=".78" /></svg>
        {nodes.map((node, index) => <div key={`${node}-${index}`} style={{position: 'absolute', left: [40, 250, 460][index], top: index === 1 ? 102 : 142, width: 140, height: 76, display: 'grid', placeItems: 'center', border: `2px solid ${index === Math.min(2, Math.floor(sweep * 3)) ? accent : 'rgba(255,255,255,.16)'}`, background: index === Math.min(2, Math.floor(sweep * 3)) ? `${accent}18` : 'rgba(255,255,255,.04)', color: '#fff', fontSize: 17, fontWeight: 900, textAlign: 'center'}}>{compact(node, 14)}</div>)}
      </div>;
    }
    if (shot.kind === 'test-report') {
      return <div style={{display: 'grid', gridTemplateColumns: '250px 1fr', gap: 14, height: '100%'}}>
        <div style={{border: `1px solid ${accent}66`, background: `${accent}12`, padding: 22}}><div style={{fontFamily: MONO, color: accent, fontSize: 12}}>RESULT</div><div style={{marginTop: 28, color: '#fff', fontSize: textFit(metric, 72, 50), lineHeight: .9, fontWeight: 950}}>{metric}</div><div style={{marginTop: 20, color: 'rgba(255,255,255,.62)', fontSize: 15}}>assertions passing</div></div>
        <div style={{border: '1px solid rgba(255,255,255,.1)', background: '#0b111b', padding: 18, fontFamily: MONO}}><LineRows items={['script-project-generator.test', 'studio-backend.test', shot.log ?? 'all checks passed']} accent={accent} p={p} /></div>
      </div>;
    }
    if (shot.kind === 'asset-library') {
      return <div style={{height: '100%', display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12}}>
        {Array.from({length: 6}).map((_, index) => <div key={index} style={{position: 'relative', padding: 14, border: `1px solid ${index === 2 ? accent : 'rgba(255,255,255,.12)'}`, background: index === 2 ? `${accent}16` : 'rgba(255,255,255,.045)', opacity: interpolate(p, [index * .06, .25 + index * .06], [.3, 1], clamp)}}><div style={{height: 78, background: [accent, secondary, '#ffd166'][index % 3], opacity: .2 + index * .04}} /><div style={{marginTop: 12, color: '#fff', fontSize: 15, fontWeight: 900}}>{compact(shot.evidence[index % shot.evidence.length], 16)}</div>{index === 2 ? <div style={{position: 'absolute', inset: -1, border: `3px solid ${accent}`, boxShadow: `0 0 ${28 * sweep}px ${accent}55`}} /> : null}</div>)}
      </div>;
    }
    if (shot.kind === 'system-map') {
      const nodes = ['Prompt', 'Skill', 'Lens', 'Shot', 'Renderer', 'MP4'];
      return <div style={{position: 'relative', height: '100%', border: '1px solid rgba(255,255,255,.1)', background: '#0b111b'}}>
        <svg viewBox="0 0 620 330" style={{position: 'absolute', inset: 0, width: '100%', height: '100%'}}>{nodes.slice(1).map((_, index) => <line key={index} x1={90 + index * 90} y1={165} x2={180 + index * 90} y2={165} stroke={index % 2 ? secondary : accent} strokeWidth="3" strokeDasharray={`${interpolate(sweep, [index * .08, .34 + index * .08], [0, 120], clamp)} 140`} />)}</svg>
        {nodes.map((node, index) => <div key={node} style={{position: 'absolute', left: 34 + index * 92, top: 127, width: 78, height: 78, display: 'grid', placeItems: 'center', borderRadius: 10, border: `1px solid ${index <= Math.floor(sweep * nodes.length) ? accent : 'rgba(255,255,255,.16)'}`, background: index <= Math.floor(sweep * nodes.length) ? `${accent}18` : 'rgba(255,255,255,.045)', color: '#fff', fontFamily: MONO, fontSize: 11, fontWeight: 950}}>{node}</div>)}
      </div>;
    }
    if (shot.kind === 'metric-highlight') {
      const context = shot.evidence.filter((item) => item !== metric).slice(0, 2);
      return <div style={{height: '100%', display: 'grid', gridTemplateRows: '1fr auto', padding: '30px 36px', background: `linear-gradient(135deg, ${accent}22, rgba(255,255,255,.025) 56%)`, overflow: 'hidden'}}>
        <div style={{alignSelf: 'center'}}>
          <div style={{fontFamily: MONO, color: secondary, fontSize: 13, fontWeight: 900}}>CURRENT CAPTION / METRIC</div>
          <div style={{marginTop: 22, color: '#fff', fontSize: textFit(metric, 126, 82), lineHeight: .82, fontWeight: 950, transform: `translateY(${interpolate(sweep, [0, 1], [38, 0], clamp)}px) scale(${interpolate(sweep, [0, 1], [.72, 1], clamp)})`, transformOrigin: 'left bottom'}}>{metric}</div>
          <div style={{width: `${interpolate(sweep, [0, 1], [8, 100], clamp)}%`, height: 8, marginTop: 30, background: `linear-gradient(90deg, ${accent}, ${secondary}, transparent)`}} />
        </div>
        <div style={{display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 26, paddingBottom: 18}}>
          <div style={{maxWidth: 420, color: 'rgba(255,255,255,.86)', fontSize: 26, lineHeight: 1.18, fontWeight: 900}}>{compact(state.detail, 54)}</div>
          <div style={{display: 'grid', gap: 8, textAlign: 'right', fontFamily: MONO, color: 'rgba(255,255,255,.56)', fontSize: 13}}>{context.map((item) => <span key={item}>{compact(item, 24)}</span>)}</div>
        </div>
      </div>;
    }
    if (shot.kind === 'concept-explainer') {
      return <div style={{height: '100%', padding: '46px 48px 38px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: `linear-gradient(145deg, rgba(255,255,255,.035), ${accent}12)`}}>
        <div>
          <div style={{fontFamily: MONO, color: accent, fontSize: 13, fontWeight: 950}}>SEMANTIC CLAIM</div>
          <div style={{marginTop: 28, maxWidth: 570, color: '#fff', fontSize: textFit(state.label, 70, 46), lineHeight: .96, fontWeight: 950, opacity: sweep, transform: `translateY(${interpolate(sweep, [0, 1], [32, 0], clamp)}px)`}}>{state.label}</div>
          <div style={{marginTop: 32, maxWidth: 590, color: 'rgba(255,255,255,.72)', fontSize: 25, lineHeight: 1.28, fontWeight: 760}}>{compact(state.detail, 82)}</div>
        </div>
        <div style={{display: 'flex', alignItems: 'flex-end', gap: 18}}>{shot.evidence.slice(0, 3).map((item, index) => <div key={`${item}-${index}`} style={{flex: index === 0 ? 1.25 : 1, minHeight: 92 + index * 18, padding: '18px 16px', display: 'flex', alignItems: 'flex-end', background: index === 0 ? accent : index === 1 ? secondary : 'rgba(255,255,255,.09)', color: index < 2 ? '#081015' : '#fff', fontSize: 18, lineHeight: 1.1, fontWeight: 950, opacity: interpolate(sweep, [index * .12, .42 + index * .12], [0, 1], clamp), transform: `translateY(${interpolate(sweep, [0, 1], [32 + index * 8, 0], clamp)}px)`}}>{compact(item, 22)}</div>)}</div>
      </div>;
    }
    if (shot.kind !== 'before-after') return null;
    return <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, height: '100%'}}>
      {[['BEFORE', shot.before ?? shot.evidence[0] ?? '旧状态', '#ff6b88'], ['AFTER', shot.after ?? shot.evidence[1] ?? '新状态', accent]].map(([label, text, color], index) => <div key={label} style={{position: 'relative', padding: 22, border: `1px solid ${color}88`, background: `${color}14`, overflow: 'hidden'}}><div style={{fontFamily: MONO, color, fontSize: 12, fontWeight: 950}}>{label}</div><div style={{marginTop: 48, color: '#fff', fontSize: 27, lineHeight: 1.12, fontWeight: 950}}>{compact(text, 36)}</div><div style={{position: 'absolute', left: 0, top: 0, bottom: 0, width: `${index === 0 ? interpolate(sweep, [0, 1], [100, 22], clamp) : interpolate(sweep, [0, 1], [0, 100], clamp)}%`, background: index === 0 ? 'rgba(0,0,0,.26)' : `${accent}10`, pointerEvents: 'none'}} /></div>)}
    </div>;
  })();
  return <TrackShell label={state.label} detail={state.detail} accent={accent} p={p}><ShotFrame shot={shot} lens={state.lens} accent={accent} secondary={secondary} p={p}>{body}</ShotFrame></TrackShell>;
};

const productionCatalog = ProductionComponentCatalogSchema.parse(componentCatalog);
type CatalogDescriptor = (typeof productionCatalog.components)[number];
export type ProductionComponentRendererProps = {state: HeroTrackState; accent: string; secondary: string; p: number};
export type ProductionComponentDescriptor = CatalogDescriptor & {
  renderer: React.FC<ProductionComponentRendererProps>;
};

const ProductionStage: React.FC<{background?: string; children: React.ReactNode}> = ({background, children}) => {
  const stage = React.useContext(ProductionStageContext);
  return (
  <AbsoluteFill data-production-stage="depth" style={{fontFamily: FONT, overflow: 'hidden', color: '#fff', background: background ?? PORTRAIT_COLOR_THEME.stage}}>
    <ProductionDepthEnvironment accent={stage.accent} secondary={stage.secondary} p={stage.p} seed={`${stage.accent}:${stage.secondary}`} visualTheme={stage.visualTheme} />
    <AbsoluteFill style={{zIndex: 1}}>
      {children}
    </AbsoluteFill>
  </AbsoluteFill>
  );
};

const shotMatches = (props: ProductionComponentRendererProps, expectedKind: HeroShot['kind']) =>
  props.state.shot?.kind === expectedKind;

const productionTitle = (state: HeroTrackState, max = 32) =>
  compact(state.componentProps?.title ?? state.label, max);

const productionDetail = (state: HeroTrackState, max = 92) =>
  compact(state.componentProps?.detail ?? state.detail, max);

const productionEvidence = (state: HeroTrackState, max = 5) => {
  const items = state.componentProps?.evidence ?? state.shot?.evidence ?? state.evidence ?? [];
  const evidence = items.filter(Boolean);
  return (evidence.length ? evidence : [state.label]).slice(0, max);
};

const seededVariant = (value: string, count: number) => {
  const seed = Array.from(value).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return seed % count;
};

const revealAt = (p: number, index: number, start = 0.08, span = 0.34) =>
  interpolate(p, [start + index * 0.08, start + span + index * 0.08], [0, 1], {...clamp, easing: ease});

const BrowserDemoRenderer: React.FC<ProductionComponentRendererProps> = (props) => {
  if (!shotMatches(props, 'browser-demo')) return <TechnicalShotHero {...props} expectedKind="browser-demo" />;
  const {state, accent, secondary, p} = props;
  const title = productionTitle(state, 26);
  const detail = productionDetail(state, 82);
  const evidence = productionEvidence(state, 4);
  const focus = interpolate(p, [0.08, 0.78], [0, 1], {...clamp, easing: ease});
  const cursorX = interpolate(focus, [0, 1], [218, 708], clamp);
  const cursorY = interpolate(focus, [0, 1], [592, 425], clamp);
  return <ProductionStage>
    <div style={{position: 'absolute', left: 56, right: 56, top: 44, bottom: 54, borderRadius: 26, overflow: 'hidden', background: '#fbfcff', boxShadow: '0 34px 80px rgba(20,38,66,.23)'}}>
      <div style={{height: 70, display: 'flex', alignItems: 'center', gap: 14, padding: '0 22px', borderBottom: '1px solid #d8e0ea', background: '#eef3f8'}}>
        {['#ff6b88', '#ffd166', '#63f0aa'].map((color) => <span key={color} style={{width: 16, height: 16, borderRadius: 99, background: color}} />)}
        <div style={{marginLeft: 12, flex: 1, height: 34, borderRadius: 17, display: 'flex', alignItems: 'center', padding: '0 18px', background: '#fff', color: '#667084', fontFamily: MONO, fontSize: 15}}>https://work.body/skills/{title.toLowerCase()}</div>
        <div style={{width: 38, height: 34, borderRadius: 10, background: accent}} />
      </div>
      <div style={{position: 'absolute', left: 0, top: 70, bottom: 0, width: 184, background: '#101826', color: '#dbe7f5', padding: '28px 22px'}}>
        <div style={{fontFamily: MONO, fontSize: 12, color: '#7f8da3'}}>WORKSPACE</div>
        {['Skills', 'Pages', 'Render', 'Ship'].map((item, index) => <div key={item} style={{marginTop: 24, padding: '10px 0 10px 12px', borderLeft: index === seededVariant(title, 4) ? `5px solid ${accent}` : '5px solid transparent', color: index === seededVariant(title, 4) ? '#fff' : '#8fa0b7', fontSize: 19, fontWeight: 900}}>{item}</div>)}
      </div>
      <div style={{position: 'absolute', left: 184, right: 0, top: 70, bottom: 0, padding: '50px 54px', color: '#111827'}}>
        <div style={{fontSize: textFit(title, 68, 42), lineHeight: .94, fontWeight: 950, maxWidth: 600}}>{title}</div>
        <div style={{marginTop: 18, maxWidth: 660, color: '#526070', fontSize: 24, lineHeight: 1.24, fontWeight: 750}}>{detail}</div>
        <div style={{display: 'grid', gridTemplateColumns: '1.25fr .75fr', gap: 24, marginTop: 42}}>
          <div style={{height: 250, borderRadius: 22, background: `linear-gradient(145deg, ${accent}24, #ffffff 58%)`, border: `4px solid ${accent}`, position: 'relative', overflow: 'hidden', boxShadow: `0 0 ${36 * focus}px ${accent}55`}}>
            <div style={{position: 'absolute', left: 28, top: 28, fontSize: 28, fontWeight: 950}}>Live page preview</div>
            <div style={{position: 'absolute', left: 30, right: 30, bottom: 30, height: 86, borderRadius: 18, background: '#101826', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 26px'}}>
              <span style={{fontSize: 24, fontWeight: 950}}>{compact(evidence[0], 18)}</span>
              <span style={{height: 42, borderRadius: 21, padding: '0 22px', display: 'grid', placeItems: 'center', background: accent, color: '#071015', fontSize: 16, fontWeight: 950}}>ACTIVE</span>
            </div>
          </div>
          <div style={{height: 250, borderRadius: 22, background: '#edf2f8', padding: 22}}>
            <div style={{fontFamily: MONO, color: '#8190a4', fontSize: 12, fontWeight: 950}}>DOM FOCUS</div>
            {evidence.slice(1).map((item, index) => <div key={`${item}-${index}`} style={{marginTop: 18, height: 42, borderRadius: 12, background: index === 1 ? secondary : '#fff', color: index === 1 ? '#071015' : '#374151', display: 'flex', alignItems: 'center', padding: '0 14px', fontSize: 16, fontWeight: 900, opacity: revealAt(p, index)}}>{compact(item, 18)}</div>)}
          </div>
        </div>
      </div>
      <div style={{position: 'absolute', left: cursorX, top: cursorY, width: 0, height: 0, borderTop: '24px solid #111827', borderRight: '17px solid transparent', transform: 'rotate(-18deg)', filter: 'drop-shadow(0 8px 10px rgba(17,24,39,.25))'}} />
    </div>
  </ProductionStage>;
};

const TerminalExecutionRenderer: React.FC<ProductionComponentRendererProps> = (props) => {
  if (!shotMatches(props, 'terminal-execution')) return <TechnicalShotHero {...props} expectedKind="terminal-execution" />;
  const {state, accent, secondary, p} = props;
  const shot = state.shot;
  const command = shot?.command ?? state.componentProps?.command ?? 'npm run verify';
  const typedCount = Math.max(1, Math.floor(command.length * interpolate(p, [0.04, 0.44], [0, 1], clamp)));
  const output = [shot?.log ?? 'visual plan loaded', ...productionEvidence(state, 4), 'renderer completed', 'exit code 0'];
  return <ProductionStage>
    <div style={{position: 'absolute', left: 64, top: 58, right: 64, height: 704, borderRadius: 22, overflow: 'hidden', background: '#05080c', boxShadow: '0 36px 90px rgba(0,0,0,.55), inset 0 0 0 1px rgba(255,255,255,.08)'}}>
      <div style={{height: 58, display: 'flex', alignItems: 'center', gap: 10, padding: '0 22px', background: '#151b24', borderBottom: '1px solid rgba(255,255,255,.08)'}}>
        {['#ff6b88', '#ffd166', '#63f0aa'].map((color) => <span key={color} style={{width: 14, height: 14, borderRadius: 99, background: color}} />)}
      </div>
      <div style={{padding: '34px 38px', fontFamily: MONO}}>
        <div style={{color: '#6ee7b7', fontSize: 24, lineHeight: 1.2}}><span style={{color: secondary}}>video@factory</span>:<span style={{color: accent}}>~/project</span>$ {command.slice(0, typedCount)}<span style={{opacity: interpolate(p, [0, .5, 1], [1, .2, 1], clamp)}}>_</span></div>
        <div style={{marginTop: 42}}>
          {output.map((item, index) => {
            const shown = revealAt(p, index, 0.28, 0.28);
            const isExit = index === output.length - 1;
            return <div key={`${item}-${index}`} style={{display: 'grid', gridTemplateColumns: '58px minmax(0, 1fr)', alignItems: 'center', minHeight: 48, marginTop: 12, color: isExit ? '#b8ffd7' : '#d7e2f0', fontSize: 22, opacity: shown, transform: `translateX(${interpolate(shown, [0, 1], [-20, 0], clamp)}px)`}}>
              <span style={{color: isExit ? accent : '#526172'}}>{isExit ? 'OK' : String(index + 1).padStart(2, '0')}</span>
              <span>{compact(item, 62)}</span>
            </div>;
          })}
        </div>
      </div>
      <div style={{position: 'absolute', left: 38, right: 38, bottom: 32, height: 12, borderRadius: 6, background: '#1d2633', overflow: 'hidden'}}><div style={{height: '100%', width: `${interpolate(p, [0.2, .88], [4, 100], clamp)}%`, background: `linear-gradient(90deg, ${secondary}, ${accent})`}} /></div>
    </div>
    <div style={{position: 'absolute', left: 74, right: 74, bottom: 62, display: 'flex', justifyContent: 'space-between', color: '#6f7f92', fontFamily: MONO, fontSize: 16}}>
      <span>stdout / stderr separated</span>
      <span style={{color: accent}}>process exited successfully</span>
    </div>
  </ProductionStage>;
};

const CodeDiffRenderer: React.FC<ProductionComponentRendererProps> = (props) => {
  if (!shotMatches(props, 'code-diff')) return <TechnicalShotHero {...props} expectedKind="code-diff" />;
  const {state, accent, secondary, p} = props;
  const shot = state.shot;
  const path = compact(shot?.path ?? state.componentProps?.path ?? 'src/project/visualPlan.ts', 38);
  const evidence = productionEvidence(state, 4);
  const rows = [
    ['-', shot?.before ?? 'renderer: TechnicalShotHero'],
    ['-', 'shared shell: TrackShell / ShotFrame'],
    ['+', shot?.after ?? 'renderer: SemanticProductionView'],
    ['+', evidence[0] ?? 'visual language bound to intent'],
    ['+', evidence[1] ?? 'motion reflects the operation'],
  ];
  return <ProductionStage>
    <div style={{position: 'absolute', left: 42, top: 42, bottom: 42, width: 218, borderRight: '1px solid rgba(255,255,255,.08)', color: '#9aa7ba', fontFamily: MONO, paddingTop: 32}}>
      {['src', 'components', 'ultimate-kit', path, 'visualPlan.ts'].map((item, index) => <div key={`${item}-${index}`} style={{height: 46, display: 'flex', alignItems: 'center', paddingLeft: 16 + Math.min(index, 3) * 15, color: index === 3 ? '#fff' : '#738196', background: index === 3 ? `${accent}18` : 'transparent', borderLeft: index === 3 ? `4px solid ${accent}` : '4px solid transparent', fontSize: 14, fontWeight: index === 3 ? 950 : 700}}>{compact(item, 22)}</div>)}
    </div>
    <div style={{position: 'absolute', left: 304, top: 52, right: 56, bottom: 56, overflow: 'hidden'}}>
      <div style={{fontFamily: MONO, color: '#748196', fontSize: 14}}>EDITOR / DIFF</div>
      <div style={{marginTop: 20, color: '#fff', fontSize: 34, lineHeight: 1.05, fontWeight: 950}}>{productionTitle(state, 34)}</div>
      <div style={{marginTop: 24, background: '#0a0e15', borderRadius: 18, overflow: 'hidden', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.08)'}}>
        <div style={{height: 50, display: 'flex', alignItems: 'center', padding: '0 20px', borderBottom: '1px solid rgba(255,255,255,.08)', color: '#a9b5c6', fontFamily: MONO, fontSize: 14}}>{path}</div>
        <div style={{padding: '22px 0', fontFamily: MONO}}>
          {rows.map(([flag, text], index) => {
            const shown = revealAt(p, index, 0.12, 0.26);
            const add = flag === '+';
            return <div key={`${flag}-${text}-${index}`} style={{display: 'grid', gridTemplateColumns: '52px 38px minmax(0, 1fr)', minHeight: 54, alignItems: 'center', background: add ? 'rgba(99,240,170,.08)' : 'rgba(255,107,136,.08)', color: add ? '#caffdf' : '#ffc5cf', opacity: shown, transform: `translateX(${interpolate(shown, [0, 1], [28, 0], clamp)}px)`}}>
              <span style={{color: '#4c5b6e', textAlign: 'right', paddingRight: 14}}>{102 + index}</span>
              <span style={{fontSize: 24, color: add ? accent : '#ff6b88'}}>{flag}</span>
              <span style={{fontSize: 22}}>{compact(text, 58)}</span>
            </div>;
          })}
        </div>
      </div>
      <div style={{position: 'absolute', right: 0, bottom: 0, padding: '14px 18px', borderRadius: 17, background: secondary, color: '#071015', fontFamily: MONO, fontSize: 15, fontWeight: 950}}>3 additions / 2 removals</div>
    </div>
  </ProductionStage>;
};

const ConfigCheckRenderer: React.FC<ProductionComponentRendererProps> = (props) => {
  if (!shotMatches(props, 'config-check')) return <TechnicalShotHero {...props} expectedKind="config-check" />;
  const {state, accent, secondary, p} = props;
  const shot = state.shot;
  const rows = [
    ['source', shot?.path ?? state.componentProps?.path ?? 'visual-plan.config.json'],
    ['componentId', productionTitle(state, 26)],
    ['resolution', state.resolution ?? 'matched'],
    ['contract', 'caption -> lens -> shot -> renderer'],
  ];
  return <ProductionStage>
    <div style={{position: 'absolute', left: 74, top: 64, right: 74, bottom: 62, color: '#18202b'}}>
      <div style={{fontFamily: MONO, color: '#6c7480', fontSize: 15, fontWeight: 950}}>CONFIG CHECK</div>
      <div style={{marginTop: 18, fontSize: 58, lineHeight: .94, fontWeight: 950, maxWidth: 720}}>{productionTitle(state, 38)}</div>
      <div style={{position: 'absolute', left: 0, top: 160, bottom: 0, width: 620, borderRadius: 28, background: '#111827', color: '#dbe8f7', padding: '34px 36px', fontFamily: MONO, boxShadow: '0 28px 60px rgba(31,41,55,.22)'}}>
        <div style={{color: '#718096', fontSize: 13}}>schema.production.json</div>
        {rows.map(([key, value], index) => {
          const shown = revealAt(p, index, 0.12, 0.3);
          return <div key={key} style={{marginTop: 26, display: 'grid', gridTemplateColumns: '165px minmax(0, 1fr)', gap: 16, alignItems: 'baseline', opacity: shown}}>
            <span style={{color: secondary, fontSize: 17}}>"{key}"</span>
            <span style={{color: '#fff', fontSize: 21}}>: "{compact(value, 38)}"</span>
          </div>;
        })}
      </div>
      <div style={{position: 'absolute', right: 0, top: 202, width: 280, display: 'grid', gap: 22}}>
        {['loaded', 'valid', 'in render'].map((item, index) => {
          const shown = revealAt(p, index, 0.2, 0.32);
          return <div key={item} style={{height: 118, borderRadius: 26, background: index === 1 ? accent : '#fff', color: index === 1 ? '#071015' : '#18202b', display: 'grid', gridTemplateColumns: '72px 1fr', alignItems: 'center', padding: '0 22px', opacity: shown, transform: `translateY(${interpolate(shown, [0, 1], [26, 0], clamp)}px)`, boxShadow: '0 18px 38px rgba(62,74,89,.12)'}}>
            <span style={{width: 48, height: 48, borderRadius: 24, background: index === 1 ? '#071015' : `${accent}24`, color: index === 1 ? accent : '#18202b', display: 'grid', placeItems: 'center', fontFamily: MONO, fontSize: 22, fontWeight: 950}}>OK</span>
            <span style={{fontSize: 25, fontWeight: 950}}>{item}</span>
          </div>;
        })}
      </div>
    </div>
  </ProductionStage>;
};

const InterfaceAuditRenderer: React.FC<ProductionComponentRendererProps> = (props) => {
  if (!shotMatches(props, 'interface-audit')) return <TechnicalShotHero {...props} expectedKind="interface-audit" />;
  const {state, accent, secondary, p} = props;
  const evidence = productionEvidence(state, 4);
  const scan = interpolate(p, [0.06, 0.82], [0, 1], clamp);
  return <ProductionStage>
    <div style={{position: 'absolute', left: 70, top: 58, width: 610, height: 724, borderRadius: 34, background: '#fbfcff', color: '#111827', overflow: 'hidden', boxShadow: '0 34px 80px rgba(35,49,70,.22)'}}>
      <div style={{height: 82, background: '#111827', display: 'flex', alignItems: 'center', padding: '0 34px', color: '#fff', fontSize: 26, fontWeight: 950}}>{productionTitle(state, 28)}</div>
      <div style={{padding: 34}}>
        <div style={{height: 88, borderRadius: 24, background: '#e9eef5'}} />
        <div style={{height: 180, marginTop: 28, borderRadius: 28, background: `linear-gradient(135deg, ${accent}22, #ffffff)`, border: `4px solid ${accent}`, position: 'relative'}}>
          <div style={{position: 'absolute', left: 34, top: 34, width: 230, height: 26, borderRadius: 13, background: '#111827'}} />
          <div style={{position: 'absolute', left: 34, bottom: 32, width: 330, height: 18, borderRadius: 9, background: '#c8d2df'}} />
        </div>
        <div style={{height: 70, marginTop: 26, borderRadius: 22, background: '#e3e9f1'}} />
        <div style={{height: 70, marginTop: 18, borderRadius: 22, background: '#e3e9f1'}} />
      </div>
      <div style={{position: 'absolute', left: 0, right: 0, top: 110 + scan * 460, height: 5, background: `linear-gradient(90deg, transparent, ${accent}, #fff, ${accent}, transparent)`, boxShadow: `0 0 22px ${accent}`}} />
      <div style={{position: 'absolute', left: 310, top: 208, width: 260, height: 220, border: `4px solid ${secondary}`, borderRadius: 30, boxShadow: `0 0 ${34 * scan}px ${secondary}66`}} />
    </div>
    <div style={{position: 'absolute', right: 64, top: 118, width: 296, color: '#111827'}}>
      <div style={{fontFamily: MONO, color: '#667184', fontSize: 13, fontWeight: 950}}>AUDIT FINDINGS</div>
      {evidence.map((item, index) => {
        const shown = revealAt(p, index, 0.18, 0.3);
        return <div key={`${item}-${index}`} style={{marginTop: 20, minHeight: 92, borderRadius: 24, background: index === 0 ? '#111827' : '#fff', color: index === 0 ? '#fff' : '#111827', padding: 20, opacity: shown, transform: `translateX(${interpolate(shown, [0, 1], [34, 0], clamp)}px)`}}>
          <div style={{fontFamily: MONO, color: index === 0 ? accent : secondary, fontSize: 12, fontWeight: 950}}>P{index + 1}</div>
          <div style={{marginTop: 10, fontSize: 20, lineHeight: 1.08, fontWeight: 950}}>{compact(item, 28)}</div>
        </div>;
      })}
    </div>
  </ProductionStage>;
};

const FlowTraceRenderer: React.FC<ProductionComponentRendererProps> = (props) => {
  if (!shotMatches(props, 'flow-trace')) return <TechnicalShotHero {...props} expectedKind="flow-trace" />;
  const {state, accent, secondary, p} = props;
  const evidence = productionEvidence(state, 3);
  const nodes = [evidence[0] ?? '输入', evidence[1] ?? '处理', evidence[2] ?? '输出'];
  const progress = interpolate(p, [0.08, 0.88], [0, 1], clamp);
  return <ProductionStage>
    <div style={{position: 'absolute', left: 76, top: 70, right: 76, color: '#16202a'}}>
      <div style={{fontSize: 54, lineHeight: .96, fontWeight: 950, maxWidth: 760}}>{productionTitle(state, 44)}</div>
      <div style={{marginTop: 16, color: '#6b7280', fontSize: 24, lineHeight: 1.2, maxWidth: 780}}>{productionDetail(state, 74)}</div>
    </div>
    <svg viewBox="0 0 1080 900" style={{position: 'absolute', inset: 0, width: '100%', height: '100%'}}>
      <path d="M160 540 C310 360 486 360 540 540 C594 720 770 720 920 540" fill="none" stroke="#cbd5df" strokeWidth="18" strokeLinecap="round" />
      <path d="M160 540 C310 360 486 360 540 540 C594 720 770 720 920 540" fill="none" stroke={accent} strokeWidth="18" strokeLinecap="round" strokeDasharray={`${progress * 1200} 1200`} />
      <circle cx={160 + progress * 760} cy={540 + Math.sin(progress * Math.PI * 4) * 90} r="18" fill={secondary} />
    </svg>
    {nodes.map((node, index) => {
      const shown = revealAt(p, index, 0.16, 0.32);
      const x = [118, 420, 724][index];
      const y = [492, 320, 492][index];
      return <div key={`${node}-${index}`} style={{position: 'absolute', left: x, top: y, width: 238, minHeight: 116, color: '#111827', opacity: shown, transform: `translateY(${interpolate(shown, [0, 1], [28, 0], clamp)}px)`}}>
        <div style={{fontFamily: MONO, color: index === 1 ? accent : '#7b8492', fontSize: 13, fontWeight: 950}}>STEP {String(index + 1).padStart(2, '0')}</div>
        <div style={{marginTop: 12, fontSize: 31, lineHeight: 1, fontWeight: 950}}>{compact(node, 20)}</div>
      </div>;
    })}
  </ProductionStage>;
};

const TestReportRenderer: React.FC<ProductionComponentRendererProps> = (props) => {
  if (!shotMatches(props, 'test-report')) return <TechnicalShotHero {...props} expectedKind="test-report" />;
  const {state, accent, secondary, p} = props;
  const shot = state.shot;
  const metric = shot?.metric ?? state.componentProps?.metric ?? '100%';
  const evidence = productionEvidence(state, 4);
  return <ProductionStage>
    <div style={{position: 'absolute', left: 72, top: 70, color: '#e9fff2'}}>
      <div style={{fontFamily: MONO, color: accent, fontSize: 16, fontWeight: 950}}>TEST REPORT</div>
      <div style={{marginTop: 24, fontSize: 142, lineHeight: .82, fontWeight: 950, transform: `scale(${interpolate(p, [0, .7], [.72, 1], clamp)})`, transformOrigin: 'left bottom'}}>{metric}</div>
      <div style={{marginTop: 34, maxWidth: 650, color: '#b8d6c5', fontSize: 28, lineHeight: 1.18, fontWeight: 850}}>{productionDetail(state, 86)}</div>
    </div>
    <div style={{position: 'absolute', right: 70, top: 112, width: 260, height: 260, borderRadius: 130, background: `conic-gradient(${accent} ${interpolate(p, [0.1, 0.82], [20, 360], clamp)}deg, rgba(255,255,255,.08) 0deg)`, display: 'grid', placeItems: 'center'}}>
      <div style={{width: 180, height: 180, borderRadius: 90, background: '#07100d', display: 'grid', placeItems: 'center', color: '#eafff2', fontFamily: MONO, fontSize: 24, fontWeight: 950}}>0 failed</div>
    </div>
    <div style={{position: 'absolute', left: 72, right: 72, bottom: 68, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16}}>
      {evidence.map((item, index) => {
        const shown = revealAt(p, index, 0.22, 0.28);
        return <div key={`${item}-${index}`} style={{height: 112, borderTop: `6px solid ${index === 0 ? secondary : accent}`, background: index === 0 ? `${secondary}18` : 'rgba(255,255,255,.06)', color: '#fff', padding: 18, opacity: shown, transform: `translateY(${interpolate(shown, [0, 1], [30, 0], clamp)}px)`}}>
          <div style={{fontFamily: MONO, color: '#85a08d', fontSize: 12}}>SUITE {index + 1}</div>
          <div style={{marginTop: 12, fontSize: 19, lineHeight: 1.08, fontWeight: 950}}>{compact(item, 22)}</div>
        </div>;
      })}
    </div>
  </ProductionStage>;
};

const AssetLibraryRenderer: React.FC<ProductionComponentRendererProps> = (props) => {
  if (!shotMatches(props, 'asset-library')) return <TechnicalShotHero {...props} expectedKind="asset-library" />;
  const {state, accent, secondary, p} = props;
  const evidence = productionEvidence(state, 5);
  const selected = Math.min(5, Math.max(0, seededVariant(productionTitle(state), 6)));
  const thumbnails = Array.from({length: 6}).map((_, index) => evidence[index % evidence.length] ?? `asset-${index + 1}`);
  return <ProductionStage>
    <div style={{position: 'absolute', left: 60, top: 54, right: 60, display: 'flex', justifyContent: 'space-between', alignItems: 'end', color: '#151922'}}>
      <div>
        <div style={{marginTop: 16, fontSize: 56, lineHeight: .94, fontWeight: 950}}>{productionTitle(state, 34)}</div>
      </div>
      <div style={{width: 250, color: '#55606d', fontSize: 21, lineHeight: 1.15, textAlign: 'right', fontWeight: 800}}>{productionDetail(state, 54)}</div>
    </div>
    <div style={{position: 'absolute', left: 60, right: 340, top: 194, bottom: 56, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 18}}>
      {thumbnails.map((item, index) => {
        const shown = revealAt(p, index, 0.12, 0.32);
        const current = index === selected;
        return <div key={`${item}-${index}`} style={{position: 'relative', borderRadius: 26, overflow: 'hidden', background: '#fff', color: '#111827', opacity: shown, transform: `translateY(${interpolate(shown, [0, 1], [34, 0], clamp)}px)`, boxShadow: current ? `0 0 0 5px ${accent}, 0 24px 46px rgba(17,24,39,.2)` : '0 14px 28px rgba(17,24,39,.1)'}}>
          <div style={{height: 118, background: index % 3 === 0 ? `linear-gradient(135deg, ${accent}, #ffffff)` : index % 3 === 1 ? `linear-gradient(135deg, ${secondary}, #fff7dd)` : 'linear-gradient(135deg, #111827, #607089)', position: 'relative'}}>
            {Array.from({length: 4}).map((_, marker) => <div key={marker} style={{position: 'absolute', left: 22 + marker * 42, bottom: 18 + (marker % 2) * 24, width: 42, height: 42, borderRadius: marker % 2 ? 21 : 8, background: 'rgba(255,255,255,.45)'}} />)}
          </div>
          <div style={{padding: 18}}>
            <div style={{fontFamily: MONO, color: current ? accent : '#8a94a3', fontSize: 12, fontWeight: 950}}>{current ? 'SELECTED' : 'READY'} / {String(index + 1).padStart(2, '0')}</div>
            <div style={{marginTop: 10, fontSize: 22, lineHeight: 1.05, fontWeight: 950}}>{compact(item, 20)}</div>
          </div>
          {current ? <div style={{position: 'absolute', right: 16, top: 16, width: 44, height: 44, borderRadius: 22, background: accent, color: '#071015', display: 'grid', placeItems: 'center', fontFamily: MONO, fontSize: 18, fontWeight: 950}}>OK</div> : null}
        </div>;
      })}
    </div>
    <div style={{position: 'absolute', right: 60, top: 194, bottom: 56, width: 244, color: '#111827'}}>
      <div style={{height: 250, borderRadius: 30, background: '#111827', color: '#fff', padding: 24}}>
        <div style={{marginTop: 34, fontSize: 34, lineHeight: .98, fontWeight: 950}}>{compact(thumbnails[selected], 24)}</div>
        <div style={{position: 'absolute', left: 24, right: 24, bottom: 26, height: 8, borderRadius: 4, background: '#263244'}}><div style={{height: '100%', width: `${interpolate(p, [0.2, 0.86], [12, 100], clamp)}%`, background: secondary}} /></div>
      </div>
      <div style={{marginTop: 18, display: 'grid', gap: 14}}>
        {['source evidence', 'thumbnail ready', 'used by shot'].map((item, index) => <div key={item} style={{height: 72, borderRadius: 20, background: '#fff', display: 'flex', alignItems: 'center', padding: '0 18px', fontSize: 18, fontWeight: 950, opacity: revealAt(p, index, 0.32, 0.26)}}>{item}</div>)}
      </div>
    </div>
  </ProductionStage>;
};

const SystemMapRenderer: React.FC<ProductionComponentRendererProps> = (props) => {
  if (!shotMatches(props, 'system-map')) return <TechnicalShotHero {...props} expectedKind="system-map" />;
  const {state, accent, secondary, p} = props;
  const evidence = productionEvidence(state, 4);
  const nodes = [
    evidence[0] ?? 'Caption',
    evidence[1] ?? 'Intent',
    evidence[2] ?? 'Shot',
    'Renderer',
    'Visual Plan',
    'MP4',
  ];
  const progress = interpolate(p, [0.06, 0.88], [0, 1], clamp);
  const positions = [[152, 194], [438, 136], [730, 218], [190, 612], [508, 482], [790, 628]];
  return <ProductionStage>
    <div style={{position: 'absolute', left: 70, top: 62, right: 70, display: 'flex', justifyContent: 'space-between', alignItems: 'start'}}>
      <div>
        <div style={{marginTop: 18, maxWidth: 610, color: '#fff', fontSize: 55, lineHeight: .94, fontWeight: 950}}>{productionTitle(state, 42)}</div>
      </div>
      <div style={{width: 250, color: '#a8b5c7', fontSize: 20, lineHeight: 1.18, textAlign: 'right', fontWeight: 800}}>{productionDetail(state, 58)}</div>
    </div>
    <svg viewBox="0 0 1080 900" style={{position: 'absolute', inset: 0, width: '100%', height: '100%'}}>
      {positions.map(([x, y], index) => index === 4 ? null : <path key={index} d={`M ${x + 82} ${y + 55} C ${x < 508 ? 430 : 650} ${y + 60}, ${x < 508 ? 410 : 650} 515, 548 536`} fill="none" stroke={index % 2 ? secondary : accent} strokeWidth="4" opacity=".74" strokeDasharray={`${interpolate(progress, [index * .09, .45 + index * .05], [0, 420], clamp)} 460`} />)}
      <path d="M548 552 C622 574 710 600 810 660" fill="none" stroke={accent} strokeWidth="6" strokeLinecap="round" strokeDasharray={`${progress * 340} 360`} />
    </svg>
    <div style={{position: 'absolute', left: 440, top: 426, width: 220, height: 184, borderRadius: 92, background: `radial-gradient(circle, ${accent} 0%, ${accent} 42%, #071015 43%)`, color: '#071015', display: 'grid', placeItems: 'center', textAlign: 'center', fontSize: 27, lineHeight: 1, fontWeight: 950, transform: `scale(${interpolate(p, [0, .62], [.74, 1], clamp)})`, boxShadow: `0 0 ${42 * progress}px ${accent}66`}}>Visual<br/>Plan</div>
    {positions.map(([x, y], index) => {
      if (index === 4) return null;
      const shown = revealAt(p, index, 0.12, 0.32);
      return <div key={`${nodes[index]}-${index}`} style={{position: 'absolute', left: x, top: y, width: 164, minHeight: 108, padding: 16, borderRadius: index === 5 ? 54 : 18, background: index === 5 ? secondary : 'rgba(255,255,255,.075)', color: index === 5 ? '#071015' : '#fff', opacity: shown, transform: `scale(${interpolate(shown, [0, 1], [.78, 1], clamp)})`, textAlign: 'center'}}>
        <div style={{marginTop: 12, fontSize: 22, lineHeight: 1.02, fontWeight: 950}}>{compact(nodes[index], 18)}</div>
      </div>;
    })}
  </ProductionStage>;
};

const BeforeAfterRenderer: React.FC<ProductionComponentRendererProps> = (props) => {
  if (!shotMatches(props, 'before-after')) return <TechnicalShotHero {...props} expectedKind="before-after" />;
  const {state, accent, secondary, p} = props;
  const shot = state.shot;
  const before = shot?.before ?? state.componentProps?.before ?? productionEvidence(state, 2)[0] ?? '旧状态';
  const after = shot?.after ?? state.componentProps?.after ?? productionEvidence(state, 2)[1] ?? '新状态';
  const wipe = interpolate(p, [0.12, .82], [0, 1], clamp);
  return <ProductionStage>
    <div style={{position: 'absolute', left: 64, right: 64, top: 58, color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'end'}}>
      <div style={{fontSize: 50, lineHeight: .96, fontWeight: 950}}>{productionTitle(state, 38)}</div>
      <div style={{fontFamily: MONO, color: accent, fontSize: 14, fontWeight: 950}}>SAME OBJECT / STATE CHANGE</div>
    </div>
    <div style={{position: 'absolute', left: 64, right: 64, top: 184, bottom: 74, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, overflow: 'hidden', borderRadius: 36}}>
      <div style={{position: 'relative', background: '#2b2f39', padding: 42}}>
        <div style={{fontFamily: MONO, color: '#ff8aa0', fontSize: 14, fontWeight: 950}}>BEFORE</div>
        <div style={{marginTop: 72, fontSize: 41, lineHeight: 1, fontWeight: 950, color: '#fff'}}>{compact(before, 38)}</div>
        <div style={{position: 'absolute', left: 42, right: 42, bottom: 58, height: 180, borderRadius: 24, background: 'repeating-linear-gradient(135deg, rgba(255,255,255,.13) 0 12px, rgba(255,255,255,.04) 12px 24px)'}} />
        <div style={{position: 'absolute', inset: 0, background: `rgba(0,0,0,${0.34 * wipe})`}} />
      </div>
      <div style={{position: 'relative', background: '#f6f7f3', color: '#111827', padding: 42}}>
        <div style={{fontFamily: MONO, color: accent, fontSize: 14, fontWeight: 950}}>AFTER</div>
        <div style={{marginTop: 72, fontSize: 41, lineHeight: 1, fontWeight: 950}}>{compact(after, 38)}</div>
        <div style={{position: 'absolute', left: 42, right: 42, bottom: 58, height: 180, borderRadius: 24, background: `linear-gradient(135deg, ${accent}55, ${secondary}55)`, transform: `translateX(${interpolate(wipe, [0, 1], [-80, 0], clamp)}px)`}} />
        <div style={{position: 'absolute', inset: 0, width: `${(1 - wipe) * 100}%`, background: '#f6f7f3'}} />
      </div>
      <div style={{position: 'absolute', left: `${50 * wipe}%`, top: 0, bottom: 0, width: 5, background: accent, boxShadow: `0 0 28px ${accent}`}} />
    </div>
  </ProductionStage>;
};

const MetricHighlightRenderer: React.FC<ProductionComponentRendererProps> = (props) => {
  if (!shotMatches(props, 'metric-highlight')) return <TechnicalShotHero {...props} expectedKind="metric-highlight" />;
  const {state, accent, secondary, p} = props;
  const shot = state.shot;
  const metric = shot?.metric ?? state.componentProps?.metric ?? productionTitle(state, 12);
  const evidence = productionEvidence(state, 4).filter((item) => item !== metric);
  return <ProductionStage>
    <div style={{position: 'absolute', left: 74, top: 62, color: '#111827'}}>
      <div style={{marginTop: 36, fontSize: textFit(metric, 210, 138), lineHeight: .78, fontWeight: 950, color: '#111827', transform: `translateY(${interpolate(p, [0, .7], [58, 0], clamp)}px) scale(${interpolate(p, [0, .7], [.68, 1], clamp)})`, transformOrigin: 'left bottom'}}>{metric}</div>
      <div style={{width: 640, height: 14, marginTop: 40, background: '#d3dbe5'}}><div style={{height: '100%', width: `${interpolate(p, [0.18, .8], [6, 100], clamp)}%`, background: `linear-gradient(90deg, ${accent}, ${secondary})`}} /></div>
      <div style={{marginTop: 34, maxWidth: 760, fontSize: 32, lineHeight: 1.1, fontWeight: 900, color: '#243040'}}>{productionDetail(state, 76)}</div>
    </div>
    <div style={{position: 'absolute', right: 72, top: 98, width: 232, height: 650, display: 'grid', alignContent: 'end', gap: 18}}>
      {[...evidence, state.intent?.key ?? 'metric'].slice(0, 4).map((item, index) => {
        const shown = revealAt(p, index, 0.18, 0.3);
        return <div key={`${item}-${index}`} style={{minHeight: 96, borderLeft: `8px solid ${index % 2 ? secondary : accent}`, background: '#fff', color: '#111827', padding: 18, opacity: shown, transform: `translateX(${interpolate(shown, [0, 1], [32, 0], clamp)}px)`, boxShadow: '0 14px 30px rgba(31,41,55,.09)'}}>
          <div style={{fontFamily: MONO, color: '#7b8493', fontSize: 11, fontWeight: 950}}>CONTEXT</div>
          <div style={{marginTop: 10, fontSize: 20, lineHeight: 1.05, fontWeight: 950}}>{compact(item, 24)}</div>
        </div>;
      })}
    </div>
  </ProductionStage>;
};

const conceptSemantic = (state: HeroTrackState) => {
  const text = `${state.label} ${state.detail} ${productionEvidence(state, 5).join(' ')}`.toLowerCase();
  if (/react|代码|code/.test(text)) return 'code';
  if (/ppt|powerpoint|图表|形状|连接线|原生对象/.test(text)) return 'slide';
  if (/正文|配图|插画|比喻|文章/.test(text)) return 'article';
  if (/html|视频|hyper|frame/.test(text)) return 'video';
  if (/设计|排版|留白|配色|模板/.test(text)) return 'design';
  if (/聊天|skill|work|ai|\bia\b/.test(text)) return 'system';
  return 'claim';
};

const ConceptExplainerRenderer: React.FC<ProductionComponentRendererProps> = (props) => {
  if (!shotMatches(props, 'concept-explainer')) return <TechnicalShotHero {...props} expectedKind="concept-explainer" />;
  const {state, accent, secondary, p} = props;
  const title = productionTitle(state, 34);
  const detail = productionDetail(state, 94);
  const evidence = productionEvidence(state, 4);
  const semantic = conceptSemantic(state);
  const variant = seededVariant(`${state.visualPlanEntryId ?? ''}${title}${detail}`, 3);
  const palette = semantic === 'slide' ? ['#f6efe5', '#17202b', '#e06682']
    : semantic === 'article' ? ['#fffdf7', '#17202b', '#222']
      : semantic === 'video' ? ['#111827', '#f9fbff', secondary]
        : semantic === 'design' ? ['#f7f2e8', '#18202a', '#17372c']
          : semantic === 'code' ? ['#0a0f18', '#f6f9ff', accent]
            : semantic === 'system' ? ['#101927', '#f9fbff', secondary]
              : ['#f5f1e8', '#111827', accent];
  const dark = ['code', 'video', 'system'].includes(semantic);
  const fg = dark ? '#fff' : '#111827';
  const muted = dark ? 'rgba(255,255,255,.66)' : '#566170';
  const mainX = variant === 0 ? 70 : variant === 1 ? 410 : 86;
  const mainY = variant === 2 ? 86 : 104;
  return <ProductionStage>
    <div style={{position: 'absolute', left: mainX, top: mainY, width: variant === 1 ? 570 : 700, color: fg}}>
      <div style={{marginTop: 24, fontSize: textFit(title, 86, 54), lineHeight: .9, fontWeight: 950, opacity: interpolate(p, [0, .52], [.62, 1], clamp), transform: `translateY(${interpolate(p, [0, .7], [18, 0], clamp)}px)`}}>{title}</div>
      <div style={{marginTop: 42, maxWidth: 700, color: muted, fontSize: 30, lineHeight: 1.16, fontWeight: 820, opacity: interpolate(p, [0, .48], [.68, 1], clamp), transform: `translateY(${interpolate(p, [0, .7], [18, 0], clamp)}px)`}}>{detail}</div>
    </div>
    {semantic === 'code' ? <div style={{position: 'absolute', right: 70, bottom: 70, width: 410, height: 360, borderRadius: 26, background: '#070b12', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.1)', padding: 28, fontFamily: MONO}}>
      {['const frame = caption;', 'intent.resolve(frame);', '<Hero shot={plan} />'].map((line, index) => <div key={line} style={{marginTop: index ? 28 : 0, color: index === 1 ? accent : index === 2 ? secondary : '#d8e1ee', fontSize: 22, opacity: revealAt(p, index)}}>{line}</div>)}
    </div> : null}
    {semantic === 'slide' ? <div style={{position: 'absolute', right: 78, bottom: 72, width: 430, height: 320, background: '#fff', color: '#111827', boxShadow: '0 24px 60px rgba(23,32,43,.18)', padding: 28}}>
      <div style={{height: 34, borderBottom: '1px solid #d8d2c8', fontFamily: MONO, color: '#80776d', fontSize: 12}}>EDITOR OBJECTS</div>
      <div style={{position: 'absolute', left: 46, top: 92, width: 150, height: 92, background: secondary, opacity: .86}} />
      <div style={{position: 'absolute', right: 54, top: 92, width: 100, height: 100, borderRadius: 50, border: `14px solid ${accent}`}} />
      <div style={{position: 'absolute', left: 52, right: 52, bottom: 48, height: 78, display: 'flex', alignItems: 'end', gap: 14}}>{[42, 78, 58, 104].map((height, index) => <div key={index} style={{flex: 1, height, background: [accent, secondary, '#ffd166', '#e06682'][index]}} />)}</div>
      <div style={{position: 'absolute', left: 38 + p * 172, top: 78 + p * 52, width: 150, height: 92, border: `3px solid ${accent}`}} />
    </div> : null}
    {semantic === 'article' ? <div style={{position: 'absolute', right: 72, bottom: 66, width: 420, height: 350, background: '#fff', color: '#151922', borderRadius: 28, padding: 34, boxShadow: '0 24px 54px rgba(30,41,59,.13)'}}>
      <div style={{fontFamily: MONO, color: '#8a8175', fontSize: 12}}>WHITE ILLUSTRATION</div>
      <svg viewBox="0 0 360 220" style={{position: 'absolute', left: 28, right: 28, bottom: 34, width: 360, height: 220}}>
        <path d="M44 130 C82 60 143 60 178 130 C214 202 290 180 318 112" fill="none" stroke="#18202b" strokeWidth="6" strokeLinecap="round" strokeDasharray={`${interpolate(p, [0, .82], [0, 620], clamp)} 640`} />
        <circle cx="74" cy="138" r="26" fill={accent} />
        <rect x="205" y="82" width="96" height="88" rx="18" fill={secondary} />
      </svg>
    </div> : null}
    {semantic === 'video' ? <div style={{position: 'absolute', left: 74, right: 74, bottom: 66, height: 190, display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12}}>
      {Array.from({length: 5}).map((_, index) => <div key={index} style={{position: 'relative', borderRadius: 18, background: index % 2 ? `${accent}24` : 'rgba(255,255,255,.09)', overflow: 'hidden', opacity: revealAt(p, index)}}><div style={{position: 'absolute', left: 18, right: 18, top: 28, height: 74, background: index === 2 ? secondary : 'rgba(255,255,255,.22)'}} /><div style={{position: 'absolute', left: 18, right: 18, bottom: 26, height: 8, background: index <= p * 5 ? accent : 'rgba(255,255,255,.16)'}} /></div>)}
    </div> : null}
    {semantic === 'design' ? <div style={{position: 'absolute', right: 74, top: 164, width: 360, height: 520, color: '#111827'}}>
      {['TYPE', 'SPACE', 'COLOR', 'SYSTEM'].map((item, index) => <div key={item} style={{height: 100, marginTop: index ? 22 : 0, display: 'grid', gridTemplateColumns: '90px 1fr', alignItems: 'center', borderTop: `5px solid ${index % 2 ? secondary : accent}`, opacity: revealAt(p, index)}}>
        <span style={{fontFamily: MONO, fontSize: 15, fontWeight: 950}}>{item}</span>
        <span style={{fontSize: 27, fontWeight: 950}}>{compact(evidence[index % evidence.length], 18)}</span>
      </div>)}
    </div> : null}
    {semantic === 'system' || semantic === 'claim' ? <div style={{position: 'absolute', right: 72, bottom: 70, width: 420, height: 420}}>
      <svg viewBox="0 0 420 420" style={{position: 'absolute', inset: 0, width: '100%', height: '100%'}}>
        <circle cx="210" cy="210" r={70 + 70 * p} fill="none" stroke={accent} strokeWidth="3" opacity=".72" />
        <circle cx="210" cy="210" r={120 - 34 * p} fill="none" stroke={secondary} strokeWidth="3" opacity=".52" />
        {[0, 1, 2, 3].map((index) => <line key={index} x1="210" y1="210" x2={210 + Math.cos(index * 1.57 + .5) * 168} y2={210 + Math.sin(index * 1.57 + .5) * 168} stroke={index % 2 ? secondary : accent} strokeWidth="4" strokeDasharray={`${revealAt(p, index) * 210} 230`} />)}
      </svg>
      {evidence.map((item, index) => <div key={`${item}-${index}`} style={{position: 'absolute', left: [16, 250, 36, 245][index] ?? 80, top: [40, 74, 288, 278][index] ?? 180, width: 150, minHeight: 68, display: 'grid', placeItems: 'center', textAlign: 'center', color: fg, fontSize: 19, lineHeight: 1.05, fontWeight: 950, opacity: revealAt(p, index)}}>{compact(item, 16)}</div>)}
    </div> : null}
  </ProductionStage>;
};

const ProductShowcaseRenderer: React.FC<ProductionComponentRendererProps> = (props) => {
  const {state, accent, p} = props;
  const title = productionTitle(state, 34);
  return <ProductionStage><div style={{position: 'absolute', left: 62, right: 62, top: 74, bottom: 110, display: 'grid', gridTemplateRows: '1fr auto', gap: 28}}>
    <div style={{position: 'relative', borderRadius: 34, overflow: 'hidden', background: `linear-gradient(145deg, ${accent}55, rgba(255,255,255,.12))`, transform: `scale(${interpolate(p, [0, 1], [.92, 1], clamp)})`}}><div style={{position: 'absolute', inset: 34, background: 'rgba(6,12,22,.35)', borderRadius: 24}} /><div style={{position: 'absolute', left: 48, bottom: 48, fontSize: 62, lineHeight: .94, fontWeight: 950, maxWidth: 700}}>{title}</div></div>
    <div style={{fontSize: 25, lineHeight: 1.18, maxWidth: 780, color: 'rgba(255,255,255,.82)'}}>{productionDetail(state, 82)}</div>
  </div></ProductionStage>;
};

const EditorCanvasRenderer: React.FC<ProductionComponentRendererProps> = ({state, accent, secondary, p}) => {
  const objects = productionEvidence(state, 4);
  return <ProductionStage><div style={{position: 'absolute', left: 80, right: 80, top: 110, bottom: 130, borderRadius: 30, background: 'rgba(255,255,255,.10)'}}>
    {objects.map((label, index) => { const shown = revealAt(p, index, .08, .3); const positions = [[70,100,360,118],[470,190,330,180],[220,430,520,112],[110,620,290,92]]; const [left, top, width, height] = positions[index] ?? positions[0]; return <div key={label} style={{position: 'absolute', left, top, width, height, padding: 22, display: 'grid', placeItems: 'center', textAlign: 'center', border: `3px solid ${index === 1 ? secondary : accent}`, background: 'rgba(8,15,27,.58)', color: '#fff', fontSize: 25, fontWeight: 900, opacity: shown, transform: `scale(${interpolate(shown,[0,1],[.7,1],clamp)})`}}>{compact(label, 24)}</div>; })}
    <div style={{position: 'absolute', left: 0, right: 0, top: 0, height: 8, background: accent, transformOrigin: 'left', transform: `scaleX(${p})`}} />
  </div></ProductionStage>;
};

const ArticleIllustrationRenderer: React.FC<ProductionComponentRendererProps> = ({state, accent, secondary, p}) => <ProductionStage><div style={{position: 'absolute', left: 72, top: 106, width: 420}}><div style={{fontSize: 56, lineHeight: .92, fontWeight: 950}}>{productionTitle(state, 30)}</div><div style={{marginTop: 30, fontSize: 27, lineHeight: 1.25, color: 'rgba(255,255,255,.78)'}}>{productionDetail(state, 80)}</div></div><svg viewBox="0 0 1080 900" style={{position: 'absolute', right: 30, bottom: 80, width: 610, height: 610}}><path d="M90 460 C160 150 400 180 435 410 C470 640 710 630 900 230" fill="none" stroke={accent} strokeWidth="16" strokeLinecap="round" strokeDasharray={`${interpolate(p,[0,1],[0,1250],clamp)} 1300`} /><circle cx="210" cy="370" r="72" fill={secondary} opacity={p} /><rect x="560" y="350" width="180" height="156" rx="28" fill={accent} opacity={p} /></svg></ProductionStage>;

const TimelineStoryRenderer: React.FC<ProductionComponentRendererProps> = ({state, accent, secondary, p}) => { const items = productionEvidence(state, 4); return <ProductionStage><div style={{position: 'absolute', left: 118, right: 118, top: 210, height: 6, background: 'rgba(255,255,255,.25)'}}><div style={{height: '100%', width: `${p * 100}%`, background: accent}} /></div>{items.map((item, index) => { const x = 118 + index * (760 / Math.max(1, items.length - 1)); const shown = revealAt(p,index,.1,.34); return <div key={item} style={{position: 'absolute', left: x - 92, top: index % 2 ? 315 : 110, width: 184, textAlign: 'center', opacity: shown}}><div style={{margin: '0 auto', width: 34, height: 34, borderRadius: 17, background: index === items.length - 1 ? secondary : accent}} /><div style={{marginTop: 20, fontSize: 23, fontWeight: 900}}>{compact(item, 18)}</div></div>; })}<div style={{position: 'absolute', left: 110, bottom: 130, fontSize: 62, lineHeight: .94, fontWeight: 950, maxWidth: 760}}>{productionTitle(state, 32)}</div></ProductionStage>; };

const QuoteCalloutRenderer: React.FC<ProductionComponentRendererProps> = ({state, accent, p}) => <ProductionStage><div style={{position: 'absolute', left: 90, right: 90, top: 230, fontSize: textFit(productionDetail(state, 66), 92, 58), lineHeight: .98, fontWeight: 950, opacity: interpolate(p,[0,.65],[0,1],clamp), transform: `translateY(${interpolate(p,[0,.65],[42,0],clamp)}px)`}}>“{productionDetail(state, 66)}”</div><div style={{position: 'absolute', left: 92, top: 176, width: 130, height: 9, background: accent, transformOrigin: 'left', transform: `scaleX(${p})`}} /><div style={{position: 'absolute', left: 92, bottom: 152, fontSize: 28, color: accent, fontWeight: 900}}>{productionTitle(state, 26)}</div></ProductionStage>;

const ChecklistProgressRenderer: React.FC<ProductionComponentRendererProps> = ({state, accent, secondary, p}) => <ProductionStage><div style={{position: 'absolute', left: 96, top: 100, fontSize: 56, lineHeight: .94, fontWeight: 950, maxWidth: 720}}>{productionTitle(state, 32)}</div><div style={{position: 'absolute', left: 102, right: 102, top: 270, display: 'grid', gap: 25}}>{productionEvidence(state, 5).map((item,index) => { const shown = revealAt(p,index,.08,.36); return <div key={item} style={{display: 'grid', gridTemplateColumns: '68px 1fr', gap: 24, alignItems: 'center', opacity: shown, transform: `translateX(${interpolate(shown,[0,1],[-32,0],clamp)}px)`}}><div style={{width: 48,height:48,borderRadius:24,background:index % 2 ? secondary : accent, display:'grid',placeItems:'center',color:'#071015',fontWeight:950}}>✓</div><div style={{fontSize:31,fontWeight:900}}>{compact(item,30)}</div></div>; })}</div></ProductionStage>;

const RadialExplainerRenderer: React.FC<ProductionComponentRendererProps> = ({state, accent, secondary, p}) => { const items=productionEvidence(state,4); return <ProductionStage><div style={{position:'absolute',left:390,top:350,width:300,height:300,borderRadius:150,background:accent,color:'#071015',display:'grid',placeItems:'center',textAlign:'center',padding:35,fontSize:36,lineHeight:1,fontWeight:950,transform:`scale(${interpolate(p,[0,.6],[.55,1],clamp)})`}}>{productionTitle(state,20)}</div>{items.map((item,index)=>{const angle=(-Math.PI/2)+(index*Math.PI*2/items.length);const shown=revealAt(p,index,.16,.34);const x=540+Math.cos(angle)*360;const y=500+Math.sin(angle)*280;return <div key={item} style={{position:'absolute',left:x-105,top:y-48,width:210,minHeight:96,display:'grid',placeItems:'center',textAlign:'center',padding:14,background:'rgba(8,15,27,.62)',border:`2px solid ${index%2?secondary:accent}`,fontSize:21,fontWeight:900,opacity:shown}}>{compact(item,18)}</div>;})}</ProductionStage>; };

const MediaCompareRenderer: React.FC<ProductionComponentRendererProps> = ({state, accent, secondary, p}) => { const before=state.shot?.before ?? productionEvidence(state,2)[0]; const after=state.shot?.after ?? productionEvidence(state,2)[1]; return <ProductionStage><div style={{position:'absolute',left:70,right:70,top:160,bottom:160,display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,overflow:'hidden'}}><div style={{background:'rgba(255,255,255,.12)',padding:36,display:'grid',alignContent:'center',fontSize:42,lineHeight:1,fontWeight:950,color:'rgba(255,255,255,.7)'}}>{compact(before,36)}</div><div style={{background:`${accent}55`,padding:36,display:'grid',alignContent:'center',fontSize:42,lineHeight:1,fontWeight:950,transform:`translateX(${interpolate(p,[0,.75],[160,0],clamp)}px)`}}>{compact(after,36)}</div><div style={{position:'absolute',top:0,bottom:0,left:`${50*p}%`,width:6,background:secondary}} /></div></ProductionStage>; };

const EvidenceReplayRenderer: React.FC<ProductionComponentRendererProps> = (props) => {
  const {state, accent, secondary, p} = props;
  const evidence = productionEvidence(state, 4);
  const steps = ['input', 'operation', 'result', 'output'];
  const total = steps.length;
  const current = Math.min(total - 1, Math.floor(p * total * 1.1));
  return <ProductionStage>
    <div style={{position: 'absolute', left: 64, top: 52, color: '#fff'}}>
      <div style={{fontFamily: MONO, color: accent, fontSize: 15, fontWeight: 950}}>EVIDENCE REPLAY</div>
      <div style={{marginTop: 18, fontSize: 58, lineHeight: .94, fontWeight: 950, maxWidth: 750}}>{productionTitle(state, 40)}</div>
    </div>
    <div style={{position: 'absolute', left: 64, right: 280, top: 210, bottom: 70, display: 'grid', gridTemplateRows: `repeat(${total}, 1fr)`, gap: 16}}>
      {steps.map((step, index) => {
        const shown = index <= current;
        const currentStep = index === current;
        const label = evidence[index % evidence.length] ?? step;
        return <div key={step} style={{
          display: 'grid', gridTemplateColumns: '86px 1fr', alignItems: 'center', gap: 20,
          padding: '0 24px', borderRadius: 22,
          background: currentStep ? `${accent}18` : shown ? 'rgba(255,255,255,.06)' : 'rgba(255,255,255,.03)',
          border: currentStep ? `2px solid ${accent}` : '2px solid transparent',
          opacity: shown ? 1 : .25,
          transform: `translateX(${shown ? 0 : -24}px)`,
          boxShadow: currentStep ? `0 0 ${30 * p}px ${accent}33` : undefined,
          transition: 'opacity 0.2s, transform 0.2s',
        }}>
          <div style={{fontFamily: MONO, color: currentStep ? accent : '#5d6e84', fontSize: 13, fontWeight: 950}}>{String(index + 1).padStart(2, '0')} / {step.toUpperCase()}</div>
          <div style={{fontSize: 24, lineHeight: 1.1, fontWeight: 900, color: currentStep ? '#fff' : 'rgba(255,255,255,.72)'}}>{compact(label, 38)}</div>
        </div>;
      })}
    </div>
    <div style={{position: 'absolute', right: 64, top: 210, bottom: 70, width: 180, display: 'grid', alignContent: 'center', gap: 12}}>
      {steps.map((step, index) => {
        const currentStep = index === current;
        const done = index < current;
        return <div key={step} style={{
          width: 48, height: 48, borderRadius: 24, margin: '0 auto',
          background: done ? secondary : currentStep ? accent : 'rgba(255,255,255,.08)',
          display: 'grid', placeItems: 'center',
          color: done || currentStep ? '#071015' : 'rgba(255,255,255,.32)',
          fontFamily: MONO, fontSize: 14, fontWeight: 950,
          transform: `scale(${currentStep ? 1.15 : 1})`,
        }}>
          {done ? 'OK' : currentStep ? '▶' : '○'}
        </div>;
      })}
    </div>
  </ProductionStage>;
};

const PRODUCTION_RENDERERS: Record<ProductionComponentId, React.FC<ProductionComponentRendererProps>> = {
  'browser-demo': BrowserDemoRenderer,
  'terminal-execution': TerminalExecutionRenderer,
  'code-diff': CodeDiffRenderer,
  'config-check': ConfigCheckRenderer,
  'interface-audit': InterfaceAuditRenderer,
  'flow-trace': FlowTraceRenderer,
  'test-report': TestReportRenderer,
  'asset-library': AssetLibraryRenderer,
  'system-map': SystemMapRenderer,
  'before-after': BeforeAfterRenderer,
  'metric-highlight': MetricHighlightRenderer,
  'concept-explainer': ConceptExplainerRenderer,
  'product-showcase': ProductShowcaseRenderer,
  'editor-canvas': EditorCanvasRenderer,
  'article-illustration': ArticleIllustrationRenderer,
  'timeline-story': TimelineStoryRenderer,
  'quote-callout': QuoteCalloutRenderer,
  'checklist-progress': ChecklistProgressRenderer,
  'radial-explainer': RadialExplainerRenderer,
  'media-compare': MediaCompareRenderer,
  'overview-matrix': (props) => <OverviewMatrix state={props.state} accent={props.accent} secondary={props.secondary} p={props.p} stateIndex={0} target={props.state.entityTarget ?? 'skill-01'} />,
  'rule-compare': (props) => <RuleCompare state={props.state} accent={props.accent} secondary={props.secondary} p={props.p} stateIndex={0} target={props.state.entityTarget ?? 'good-rule-01'} />,
  'code-render': (props) => <CodeRender state={props.state} accent={props.accent} secondary={props.secondary} p={props.p} stateIndex={0} target={props.state.entityTarget ?? 'code-line-01'} />,
  'slide-editor': (props) => <SlideEditor state={props.state} accent={props.accent} secondary={props.secondary} p={props.p} target={props.state.entityTarget ?? 'slide-01'} />,
  'article-map': (props) => <ArticleMap state={props.state} accent={props.accent} secondary={props.secondary} p={props.p} target={props.state.entityTarget ?? 'article-source'} />,
  'video-agent': VideoAgent,
  'design-compare': (props) => <DesignCompare state={props.state} accent={props.accent} secondary={props.secondary} p={props.p} target={props.state.entityTarget ?? 'before-surface'} />,
  'system-summary': (props) => <SystemSummary state={props.state} accent={props.accent} secondary={props.secondary} p={props.p} brandName={props.state.label} />,
  'evidence-replay': EvidenceReplayRenderer,
};

const rendererForComponent = (componentId: string) => {
  const renderer = PRODUCTION_RENDERERS[componentId as ProductionComponentId];
  if (!renderer) {
    // A catalog entry without a dedicated renderer is a build-time defect.
    // Never fall back to a generic shell: fail loudly instead.
    throw new Error(`[PRODUCTION_COMPONENT_REGISTRY_INVALID] ${componentId} has no dedicated renderer`);
  }
  return renderer;
};

export const PRODUCTION_COMPONENT_REGISTRY: readonly ProductionComponentDescriptor[] = productionCatalog.components.map((descriptor) => ({
  ...descriptor,
  renderer: rendererForComponent(descriptor.componentId),
}));

export const resolveProductionComponentDescriptor = (componentId: string) =>
  PRODUCTION_COMPONENT_REGISTRY.find((descriptor) => descriptor.componentId === componentId) ?? null;

/** Resolve a HeroTrackState by captionIndex rather than frame.
 *  This enforces the three-layer contract: Hero states must be lookupable
 *  by the same captionIndex that drives the beat and subtitle layers. */
export const resolveHeroStateByCaptionIndex = (
  track: HeroTrack,
  captionIndex: number,
): HeroTrackState | null =>
  track.states.find((state) => (
    captionIndex >= state.captionStartIndex && captionIndex <= state.captionEndIndex
  )) ?? null;

/** Validate that every caption index in the scene range has a Hero state.
 *  Returns the first uncovered caption index, or -1 if all are covered. */
export const validateHeroCaptionCoverage = (track: HeroTrack): number => {
  for (let index = track.captionStartIndex; index <= track.captionEndIndex; index++) {
    if (!track.states.some((state) => index >= state.captionStartIndex && index <= state.captionEndIndex)) {
      return index;
    }
  }
  return -1;
};

const ProductionFallbackDiagnostic: React.FC<{state: HeroTrackState; accent: string}> = ({state, accent}) => (
  <TrackShell label="生产组件匹配失败" detail={state.detail} accent={accent} p={1}>
    <div data-production-fallback="true" style={{position: 'absolute', inset: '90px 70px', padding: 42, background: '#240d16', border: '4px solid #ff5f7a', color: '#fff'}}>
      <div style={{fontFamily: MONO, color: '#ff9aad', fontSize: 15, fontWeight: 950}}>VISUAL PLAN DIAGNOSTIC</div>
      <div style={{marginTop: 34, fontSize: 42, lineHeight: 1, fontWeight: 950}}>无法匹配生产组件</div>
      <div style={{marginTop: 24, color: 'rgba(255,255,255,.72)', fontSize: 22, lineHeight: 1.35}}>{state.diagnostics?.map((diagnostic) => diagnostic.message).join(' / ') || `componentId=${state.componentId ?? 'missing'}`}</div>
    </div>
  </TrackShell>
);

export const ProductionComponentPreview: React.FC<{componentId: string}> = ({componentId}) => {
  const descriptor = resolveProductionComponentDescriptor(componentId);
  if (!descriptor) return null;
  const PreviewRenderer = descriptor.renderer;
  const shotKind = descriptor.compatibleShotKinds[0] as HeroShot['kind'];
  const evidence = descriptor.requiredData.includes('shot.before') ? ['旧状态', '新状态', '差异证据']
    : shotKind === 'metric-highlight' ? ['68%', '当前指标', '真实口播']
      : ['当前字幕', '语义证据', '生产渲染'];
  const state: HeroTrackState = {
    startFrame: 0,
    endFrame: 90,
    captionStartIndex: 0,
    captionEndIndex: 0,
    label: descriptor.label,
    detail: descriptor.description,
    componentId,
    resolution: 'matched',
    evidence,
    lens: {key: `preview:${componentId}`, objective: descriptor.description, actionLabel: descriptor.label, signal: descriptor.compatibleIntents[0], evidenceType: '生产预览'},
    shot: {
      kind: shotKind,
      environment: 'Video Factory',
      target: descriptor.requiredData.join(' / '),
      before: shotKind === 'before-after' ? '旧状态' : undefined,
      after: shotKind === 'before-after' ? '新状态' : undefined,
      command: shotKind === 'terminal-execution' ? 'npm run project:render' : undefined,
      path: shotKind === 'code-diff' || shotKind === 'config-check' ? 'src/project/visualPlan.ts' : undefined,
      metric: shotKind === 'test-report' || shotKind === 'metric-highlight' ? '68%' : undefined,
      log: shotKind === 'test-report' ? '12 passed / 0 failed' : undefined,
      status: 'active',
      evidence,
    },
  };
  return <div data-production-component={componentId} style={{position: 'relative', width: 860, height: 900, background: '#05070d'}}>
    <ProductionStageContext.Provider value={{accent: '#48e7f3', secondary: '#ff7aa8', p: .82, visualTheme: DEFAULT_VISUAL_THEME}}>
      <PreviewRenderer state={state} accent="#48e7f3" secondary="#ff7aa8" p={.82} />
    </ProductionStageContext.Provider>
  </div>;
};

type MotionAnchor = {x: number; y: number; width: number; height: number};
const entityAnchor = (kind: HeroTrack['kind'], target: string): MotionAnchor => {
  if (kind === 'rule-compare') return target.startsWith('bad-') ? {x: 44, y: 105, width: 340, height: 62} : target.startsWith('good-') ? {x: 476, y: 105, width: 340, height: 62} : {x: 30, y: 680, width: 800, height: 130};
  if (kind === 'code-render') return target.startsWith('code-') ? {x: 45, y: 150, width: 770, height: 55} : {x: 50 + (target === 'frame-track' ? 270 : target === 'mp4-output' ? 540 : 0), y: 520, width: 220, height: 84};
  if (kind === 'slide-editor') return target === 'shape-object' ? {x: 270, y: 315, width: 180, height: 95} : target === 'chart-object' ? {x: 260, y: 520, width: 430, height: 145} : target === 'text-object' ? {x: 570, y: 190, width: 130, height: 64} : {x: 175, y: 200, width: 540, height: 460};
  if (kind === 'article-map') return target === 'article-source' ? {x: 35, y: 115, width: 225, height: 120} : target === 'article-body' ? {x: 350, y: 292, width: 190, height: 110} : {x: 620, y: 272, width: 190, height: 110};
  if (kind === 'design-compare') return target === 'before-surface' ? {x: 25, y: 55, width: 390, height: 430} : target.endsWith('token') ? {x: 25 + ['type-token', 'space-token', 'color-token', 'system-token'].indexOf(target) * 205, y: 510, width: 190, height: 105} : {x: 445, y: 55, width: 390, height: 430};
  if (kind === 'video-agent') return target === 'input-html' ? {x: 20, y: 80, width: 380, height: 360} : target === 'render-preview' ? {x: 455, y: 130, width: 360, height: 260} : {x: 420, y: 470, width: 380, height: 100};
  if (kind === 'system-summary') return {x: 365, y: 245, width: 150, height: 110};
  if (kind === 'overview-matrix') return {x: target.endsWith('01') || target.endsWith('03') || target.endsWith('05') ? 40 : 440, y: 176 + (Number(target.slice(-2)) % 3) * 92, width: 360, height: 76};
  return {x: 270, y: 250, width: 320, height: 210};
};

/** Motion vocabulary bound to a real Hero entity, never a full-screen cutaway. */
const EntityBoundMotion: React.FC<{track: HeroTrack; state: HeroTrackState; accent: string; secondary: string; p: number}> = ({track, state, accent, secondary, p}) => {
  const preset = state.cinematicPreset;
  if (!preset) return null;
  const a = entityAnchor(track.kind, state.entityTarget ?? '');
  const enter = interpolate(p, [0, 1], [0, 1], {...clamp, easing: ease});
  const style: React.CSSProperties = {position: 'absolute', left: a.x, top: a.y, width: a.width, height: a.height, pointerEvents: 'none', overflow: 'visible'};
  if (preset === 'split-wipe') return <div style={style}><div style={{position: 'absolute', inset: 0, width: `${enter * 100}%`, background: `linear-gradient(90deg, ${accent}2a, transparent)`, borderRight: `3px solid ${accent}`}} /></div>;
  if (preset === 'ui-scan') return <div style={style}><div style={{position: 'absolute', left: -8, right: -8, top: `${interpolate(enter, [0, 1], [0, 100])}%`, height: 3, background: `linear-gradient(90deg, transparent, ${accent}, #fff, ${accent}, transparent)`, boxShadow: `0 0 18px ${accent}`}} /></div>;
  if (preset === 'focus-lock') return <div style={style}>{[[0, 0], [1, 0], [0, 1], [1, 1]].map(([x, y], i) => <div key={i} style={{position: 'absolute', left: x ? 'auto' : -8, right: x ? -8 : 'auto', top: y ? 'auto' : -8, bottom: y ? -8 : 'auto', width: 28, height: 28, borderTop: y ? undefined : `3px solid ${accent}`, borderBottom: y ? `3px solid ${accent}` : undefined, borderLeft: x ? undefined : `3px solid ${accent}`, borderRight: x ? `3px solid ${accent}` : undefined, opacity: enter}} />)}</div>;
  if (preset === 'particle-field') return <div style={style}>{Array.from({length: 10}).map((_, i) => <div key={i} style={{position: 'absolute', left: `${interpolate(enter, [0, 1], [(i * 37) % 150 - 35, 50])}%`, top: `${interpolate(enter, [0, 1], [(i * 61) % 160 - 30, 50])}%`, width: 8, height: 8, borderRadius: '50%', background: i % 2 ? accent : secondary, opacity: 1 - enter * .45}} />)}</div>;
  if (preset === 'orbital-map') return <div style={style}><div style={{position: 'absolute', inset: -28, border: `2px dashed ${accent}aa`, borderRadius: '50%', transform: `rotate(${enter * 220}deg)`}} /><div style={{position: 'absolute', inset: -52, border: `1px dashed ${secondary}88`, borderRadius: '50%', transform: `rotate(${-enter * 160}deg)`}} /></div>;
  if (preset === 'pipeline-flow') return <div style={style}><svg width="100%" height="100%" style={{overflow: 'visible'}}><path d={`M ${-Math.min(210, a.x)} ${a.height / 2} L ${a.width / 2} ${a.height / 2}`} stroke={accent} strokeWidth="3" strokeDasharray={`${enter * 260} 280`} /><circle cx={interpolate(enter, [0, 1], [-Math.min(210, a.x), a.width / 2])} cy={a.height / 2} r="7" fill={secondary} /></svg></div>;
  if (preset === 'token-assembly') return <div style={style}>{['TYPE', 'SPACE', 'COLOR'].map((label, i) => <div key={label} style={{position: 'absolute', left: `${12 + i * 29}%`, top: interpolate(enter, [0, 1], [-95 - i * 24, 35]) , padding: '5px 7px', background: PORTRAIT_COLOR_THEME.surfaceStrong, border: `1px solid ${i % 2 ? secondary : accent}`, color: '#fff', fontFamily: MONO, fontSize: 10}}>{label}</div>)}</div>;
  if (preset === 'material-carousel') return <div style={style}>{[accent, secondary, '#ffd166', '#ff7aa8'].map((color, i) => <div key={color} style={{position: 'absolute', left: `${i * 18}%`, top: `${interpolate(enter, [0, 1], [80 - i * 9, 8])}%`, width: '42%', height: '74%', background: color, opacity: .16 + i * .06, transform: `rotate(${interpolate(enter, [0, 1], [-18 + i * 8, i * 4])}deg)`}} />)}</div>;
  if (preset === 'surface-morph') return <div style={style}><div style={{position: 'absolute', inset: -6, border: `3px solid ${accent}`, borderRadius: interpolate(enter, [0, 1], [0, 42]), boxShadow: `0 0 ${26 * enter}px ${accent}55`}} /></div>;
  if (preset === 'system-convergence') return <div style={style}>{[[-110,-40],[a.width+55,-30],[-85,a.height+35],[a.width+70,a.height+25]].map(([x,y],i) => <div key={i} style={{position: 'absolute', left: interpolate(enter, [0,1], [x,a.width / 2 - 8]), top: interpolate(enter,[0,1],[y,a.height / 2 - 8]), width: 16, height: 16, borderRadius: 4, background: i % 2 ? secondary : accent}} />)}</div>;
  return <div style={style}><div style={{position: 'absolute', left: 0, right: 0, bottom: -18, height: 3, background: accent, transformOrigin: 'left', transform: `scaleX(${enter})`}} /><div style={{position: 'absolute', left: 0, top: -24, color: accent, fontFamily: MONO, fontSize: 10, letterSpacing: 1.2}}>FOCUS / {state.entityTarget ?? 'ENTITY'}</div></div>;
};

const DirectorMotionOverlay: React.FC<{
  track: HeroTrack;
  state: HeroTrackState;
  director?: VisualDirector;
  accent: string;
  secondary: string;
  p: number;
}> = ({track, state, director, accent, secondary, p}) => {
  const resolved = state.director ?? director;
  if (!resolved) return null;
  const enter = interpolate(p, [0, 1], [0, 1], {...clamp, easing: ease});
  const anchor = entityAnchor(track.kind, resolved.focusTarget ?? state.entityTarget ?? '');
  const shared: React.CSSProperties = {
    position: 'absolute',
    left: anchor.x,
    top: anchor.y,
    width: anchor.width,
    height: anchor.height,
    pointerEvents: 'none',
  };
  const label = (
    <div style={{position: 'absolute', right: 18, top: 16, fontFamily: MONO, fontSize: 10, color: accent, opacity: .72, letterSpacing: 1.1}}>
      {resolved.scenePrimitive.toUpperCase()} / {resolved.density.toUpperCase()}
    </div>
  );

  if (resolved.motionPreset === 'split-reveal') {
    return <AbsoluteFill data-director-motion={resolved.motionPreset} style={{zIndex: 5}}>
      <div style={{position: 'absolute', left: 0, top: 0, bottom: 0, width: `${interpolate(enter, [0, 1], [0, 62], clamp)}%`, background: `linear-gradient(90deg, ${accent}1f, transparent)`, borderRight: `2px solid ${accent}`}} />
      {label}
    </AbsoluteFill>;
  }

  if (resolved.motionPreset === 'path-draw') {
    return <AbsoluteFill data-director-motion={resolved.motionPreset} style={{zIndex: 5}}>
      <svg viewBox="0 0 1080 900" style={{position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible'}}>
        <path d={`M 72 ${anchor.y + anchor.height / 2} C 210 ${anchor.y - 60} 360 ${anchor.y + anchor.height + 90} ${anchor.x + anchor.width / 2} ${anchor.y + anchor.height / 2}`} fill="none" stroke={accent} strokeWidth="4" strokeDasharray={`${enter * 720} 760`} opacity=".82" />
        <circle cx={interpolate(enter, [0, 1], [72, anchor.x + anchor.width / 2], clamp)} cy={anchor.y + anchor.height / 2} r="7" fill={secondary} />
      </svg>
      {label}
    </AbsoluteFill>;
  }

  if (resolved.motionPreset === 'number-roll') {
    return <AbsoluteFill data-director-motion={resolved.motionPreset} style={{zIndex: 5}}>
      <div style={{position: 'absolute', right: 42, bottom: 36, minWidth: 176, height: 58, padding: '0 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 18, background: 'rgba(4,8,14,.66)', border: `1px solid ${accent}77`, color: '#fff', fontFamily: MONO, fontWeight: 950, opacity: enter, transform: `translateY(${interpolate(enter, [0, 1], [20, 0], clamp)}px)`}}>
        <span>{compact(state.shot?.metric ?? state.componentProps?.metric ?? state.label, 12)}</span>
        <span style={{color: accent}}>{Math.round(enter * 100)}%</span>
      </div>
    </AbsoluteFill>;
  }

  if (resolved.motionPreset === 'quote-snap') {
    return <AbsoluteFill data-director-motion={resolved.motionPreset} style={{zIndex: 5}}>
      <div style={{position: 'absolute', left: 74, right: 74, bottom: 46, height: 3, background: accent, transformOrigin: 'left', transform: `scaleX(${interpolate(enter, [0, 1], [0, 1], clamp)})`, boxShadow: `0 0 ${22 * enter}px ${accent}`}} />
      {label}
    </AbsoluteFill>;
  }

  if (resolved.motionPreset === 'stage-breathe' || resolved.motionPreset === 'handoff-wipe') {
    return <AbsoluteFill data-director-motion={resolved.motionPreset} style={{zIndex: 5}}>
      <div style={{position: 'absolute', left: 36, right: 36, top: 22, height: 2, background: `linear-gradient(90deg, transparent, ${accent}, ${secondary}, transparent)`, opacity: .22 + enter * .36, transform: `translateX(${interpolate(enter, [0, 1], [-24, 24], clamp)}px)`}} />
      {label}
    </AbsoluteFill>;
  }

  return <AbsoluteFill data-director-motion={resolved.motionPreset} style={{zIndex: 5}}>
    <div style={shared}>
      <div style={{position: 'absolute', inset: -10, border: `2px solid ${accent}`, opacity: enter, boxShadow: `0 0 ${28 * enter}px ${accent}55`, transform: `scale(${interpolate(enter, [0, 1], [1.08, 1], clamp)})`}} />
      {resolved.motionPreset === 'matrix-step' ? <div style={{position: 'absolute', left: 0, right: 0, bottom: -14, height: 4, background: `linear-gradient(90deg, ${secondary}, ${accent})`, transformOrigin: 'left', transform: `scaleX(${enter})`}} /> : null}
      {resolved.motionPreset === 'object-select' ? Array.from({length: 8}).map((_, index) => <div key={index} style={{position: 'absolute', width: 7, height: 7, background: accent, left: index % 4 < 2 ? -13 : 'auto', right: index % 4 >= 2 ? -13 : 'auto', top: index < 4 ? -13 : 'auto', bottom: index >= 4 ? -13 : 'auto', opacity: enter}} />) : null}
    </div>
    {label}
  </AbsoluteFill>;
};

export const HeroTrackV2: React.FC<{
  frame: number;
  track: HeroTrack;
  accent: string;
  secondary: string;
  brandName?: string;
  visualSystem?: VisualSystem;
  director?: VisualDirector;
}> = ({frame, track, accent, secondary, brandName = 'Production System', visualSystem, director}) => {
  const state = track.states.find((item) => frame >= item.startFrame && frame < item.endFrame) ?? track.states[track.states.length - 1];
  if (!state) return null;
  const stateP = stateProgress(frame, state);
  const stateIndex = track.states.indexOf(state);
  const visualTheme = resolvePortraitVisualTheme(visualSystem);
  // The product composition is persistent inside a Hero Track. Only its
  // selected entity changes after the opening has established the layout.
  const p = stateIndex === 0 ? stateP : 1;
  const common = {state, accent, secondary, p, stateIndex, target: state.entityTarget ?? ''};
  const productionDescriptor = state.componentId ? resolveProductionComponentDescriptor(state.componentId) : null;
  const componentMatchesShot = productionDescriptor && state.shot
    ? productionDescriptor.compatibleShotKinds.includes(state.shot.kind)
    : false;
  const ProductionRenderer = productionDescriptor?.renderer;
  const visual = state.componentId
    ? ProductionRenderer && componentMatchesShot && state.resolution === 'matched'
      ? <div data-production-component={state.componentId}><ProductionRenderer state={state} accent={accent} secondary={secondary} p={stateP} /></div>
      : <ProductionFallbackDiagnostic state={state} accent={accent} />
    : state.shot ? <TechnicalShotHero state={state} accent={accent} secondary={secondary} p={stateP} />
    : track.kind === 'overview-matrix' ? <OverviewMatrix {...common} />
    : track.kind === 'rule-compare' ? <RuleCompare {...common} />
      : track.kind === 'code-render' ? <CodeRender {...common} />
        : track.kind === 'slide-editor' ? <SlideEditor {...common} />
          : track.kind === 'article-map' ? <ArticleMap {...common} />
            : track.kind === 'video-agent' ? <VideoAgent {...common} />
              : track.kind === 'design-compare' ? <DesignCompare {...common} />
                : track.kind === 'system-summary' ? <SystemSummary {...common} brandName={brandName} />
                  : <ProductionFallbackDiagnostic state={state} accent={accent} />;
  return <AbsoluteFill
    data-caption-start-index={state.captionStartIndex}
    data-caption-end-index={state.captionEndIndex}
    data-caption-index-sync="active"
  >
    <ProductionStageContext.Provider value={{accent, secondary, p: stateP, visualSystem, visualTheme}}>
      {visual}
    </ProductionStageContext.Provider>
    <DirectorMotionOverlay track={track} state={state} director={director} accent={accent} secondary={secondary} p={stateP} />
    {state.shot || state.componentId ? null : <EntityBoundMotion track={track} state={state} accent={accent} secondary={secondary} p={stateP} />}
  </AbsoluteFill>;
};
