import React from 'react';
import {AbsoluteFill, Easing, interpolate} from 'remotion';
import type {HeroTrack, HeroLens, HeroShot, HeroTrackState} from './types';
import {PORTRAIT_COLOR_THEME} from './portraitColorTheme';

const FONT = '"PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", Inter, system-ui, sans-serif';
const MONO = '"SFMono-Regular", "JetBrains Mono", Menlo, Consolas, monospace';
const clamp = {extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const};
const ease = Easing.bezier(0.16, 1, 0.3, 1);

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

const TrackShell: React.FC<{label: string; detail: string; accent: string; p: number; children: React.ReactNode}> = ({label, detail, accent, p, children}) => (
  <AbsoluteFill style={{fontFamily: FONT, overflow: 'hidden'}}>
    <div style={{position: 'absolute', inset: -120, background: `radial-gradient(circle at 52% 42%, ${accent}16, transparent 43%)`, opacity: interpolate(p, [0, 1], [0.2, 0.82], clamp)}} />
    <div style={{position: 'absolute', inset: 0, opacity: interpolate(p, [0, 1], [0.25, 1], clamp), transform: `translateY(${interpolate(p, [0, 1], [18, 0], clamp)}px)`}}>{children}</div>
  </AbsoluteFill>
);

const OverviewMatrix: React.FC<{state: HeroTrackState; accent: string; secondary: string; p: number; stateIndex: number; target: string}> = ({state, accent, secondary, p, stateIndex, target}) => {
  const skills = ['编码原则', 'Remotion', 'PPT Master', '正文配图', 'HyperFrames', 'UI Skill'];
  const targetIndex = Number(target.match(/skill-(\d+)/)?.[1]) - 1;
  const active = Number.isFinite(targetIndex) && targetIndex >= 0 ? targetIndex : Math.min(skills.length - 1, Math.floor((stateIndex + p) * 2));
  return <TrackShell label="几个 Skill" detail={state.detail} accent={accent} p={p}>
    <div style={{position: 'absolute', left: 40, top: 42, fontSize: 72, lineHeight: 1, color: '#fff', fontWeight: 950}}>装上 <span style={{color: accent}}>Skill</span></div>
    <div style={{position: 'absolute', left: 40, right: 40, top: 176, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16}}>{skills.map((skill, index) => {
      const shown = interpolate(p, [index * 0.08, 0.26 + index * 0.08], [0, 1], {...clamp, easing: ease});
      const isActive = index === active;
      return <div key={skill} style={{height: 76, padding: '0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: `1px solid ${isActive ? accent : 'rgba(255,255,255,.15)'}`, background: isActive ? `${accent}18` : 'rgba(7,10,18,.62)', color: isActive ? '#fff' : 'rgba(255,255,255,.74)', fontSize: 23, fontWeight: 900, opacity: shown, transform: `translateY(${interpolate(shown, [0, 1], [26, 0])}px)`}}><span>{skill}</span><span style={{color: isActive ? accent : '#59677c', fontFamily: MONO}}>0{index + 1}</span></div>;
    })}</div>
    <div style={{position: 'absolute', left: 40, right: 40, bottom: 32}}><EvidenceChips items={state.evidence ?? ['写代码', '做网页', '生成 PPT', '完整设计']} accent={secondary} p={p} /></div>
  </TrackShell>;
};

const RuleCompare: React.FC<{state: HeroTrackState; accent: string; secondary: string; p: number; stateIndex: number; target: string}> = ({state, accent, secondary, p, stateIndex, target}) => {
  const bad = ['乱猜需求', '脑加抽象', '顺手改无关文件', '不做验证'];
  const good = ['先讲清假设', '只做最小改动', '不碰无关文件', '改完自己验证'];
  const solvedRows = Math.min(good.length, stateIndex + Math.floor(p * 2) + 1);
  const activeBad = Number(target.match(/bad-rule-(\d+)/)?.[1]) - 1;
  const activeGood = Number(target.match(/good-rule-(\d+)/)?.[1]) - 1;
  const pulse = interpolate(p, [0, 0.12, 0.62, 1], [0, 1, 0.86, 0.78], {...clamp, easing: ease});
  return <TrackShell label="先约束，再动手" detail={state.detail} accent={accent} p={p}>
    <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginTop: 10}}>
      {[{title: '没有原则', items: bad, color: '#ff5f7a'}, {title: '装上 Skill', items: good, color: accent}].map((panel) => <div key={panel.title} style={{border: `1px solid ${panel.color}88`, background: `${panel.color}0d`, padding: 18}}><div style={{fontSize: 20, color: panel.color, fontWeight: 950}}>{panel.title}</div>{panel.items.map((item, index) => {const verified = index < solvedRows; const current = panel.title === '没有原则' ? index === activeBad : index === activeGood; const itemOpacity = interpolate(p, [index * .08, .3 + index * .08], [0, 1], clamp); return <div key={item} style={{position: 'relative', marginTop: 13, padding: '10px 12px', borderTop: '1px solid rgba(255,255,255,.09)', borderLeft: current ? `5px solid ${panel.color}` : '5px solid transparent', background: current ? `${panel.color}24` : 'transparent', color: panel.title === '没有原则' && verified ? 'rgba(255,255,255,.42)' : '#f2f5fa', textDecoration: panel.title === '没有原则' && verified && !current ? 'line-through' : undefined, fontSize: 17, fontWeight: current ? 950 : 800, opacity: itemOpacity, transform: `translateX(${current ? interpolate(pulse, [0, 1], [-18, 0]) : 0}px)`, boxShadow: current ? `0 0 ${30 * pulse}px ${panel.color}36` : undefined}}>{current ? <div style={{position: 'absolute', inset: 0, opacity: pulse, background: `linear-gradient(90deg, ${panel.color}24, transparent 72%)`}} /> : null}<span style={{position: 'relative'}}>{panel.title === '没有原则' ? '×' : verified ? '✓' : '○'} {item}</span></div>;})}</div>)}
    </div>
    <div style={{position: 'absolute', left: 0, right: 0, bottom: 20, height: 170, padding: 18, background: target === 'terminal-verify' ? `${accent}12` : PORTRAIT_COLOR_THEME.surfaceMuted, border: `1px solid ${target === 'terminal-verify' ? accent : 'rgba(255,255,255,.12)'}`, fontFamily: MONO, boxShadow: target === 'terminal-verify' ? `0 0 ${42 * pulse}px ${accent}26` : undefined}}><div style={{color: PORTRAIT_COLOR_THEME.textMuted, fontSize: 12}}>AGENTS.md / EXECUTION TRACE</div><div style={{marginTop: 20, fontSize: 18, color: '#dce5f3'}}>$ codex fix --scope minimal</div><div style={{marginTop: 14, color: accent, fontSize: 16, opacity: p}}>✓ {solvedRows}/4 rules verified · scope locked · tests queued</div></div>
  </TrackShell>;
};

const CodeRender: React.FC<{state: HeroTrackState; accent: string; secondary: string; p: number; stateIndex: number; target: string}> = ({state, accent, secondary, p, stateIndex, target}) => {
  const lines = ['export const Scene = () => {', '  const frame = useCurrentFrame();', '  return <Sequence from={0} />;', '}'];
  const typed = Math.min(lines.length, Math.max(1, stateIndex + Math.floor(interpolate(p, [0.1, 0.62], [0, 2], clamp)) + 1));
  const activeLine = Number(target.match(/code-line-(\d+)/)?.[1]) - 1;
  const activeTab = target === 'frame-track' ? 1 : target === 'mp4-output' ? 2 : 0;
  return <TrackShell label="React 代码，变成画面" detail={state.detail} accent={accent} p={p}>
    <div style={{padding: '22px 26px', border: `1px solid ${secondary}77`, background: PORTRAIT_COLOR_THEME.surfaceMuted, fontFamily: MONO}}><div style={{fontSize: 13, color: PORTRAIT_COLOR_THEME.textMuted}}>SkillVideo.tsx</div>{lines.map((line, index) => {const current = index === activeLine; return <div key={line} style={{marginTop: 16, padding: current ? '7px 10px' : undefined, marginLeft: current ? -10 : 0, marginRight: current ? -10 : 0, borderLeft: current ? `4px solid ${accent}` : '4px solid transparent', background: current ? `${accent}18` : 'transparent', color: index === 1 ? '#b4ff7c' : index === 2 ? '#f7c66f' : '#d6b8ff', fontSize: 19, fontWeight: current ? 900 : 500, opacity: index < typed ? 1 : 0.18, transform: `translateX(${current ? interpolate(p, [0, 1], [-16, 0], clamp) : 0}px)`}}>{line}{current ? <span style={{color: accent}}>▋</span> : null}</div>;})}</div>
    <div style={{display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginTop: 22}}>{['React', 'Frames', 'MP4'].map((tab, index) => {const current = index === activeTab; return <div key={tab} style={{height: 86, display: 'grid', placeItems: 'center', border: `2px solid ${current ? accent : PORTRAIT_COLOR_THEME.line}`, color: current ? '#fff' : PORTRAIT_COLOR_THEME.textMuted, background: current ? `${accent}1c` : PORTRAIT_COLOR_THEME.surface, fontSize: 21, fontWeight: current ? 950 : 900, boxShadow: current ? `0 0 ${30 * p}px ${accent}3a` : undefined, transform: `translateY(${current ? interpolate(p, [0, 1], [14, 0], clamp) : 0}px)`}}>{tab}</div>;})}</div>
    <div style={{position: 'absolute', left: 26, right: 26, bottom: 38, height: 9, background: PORTRAIT_COLOR_THEME.line}}><div style={{height: '100%', width: `${interpolate(p, [0, 1], [5, 90], clamp)}%`, background: `linear-gradient(90deg, ${secondary}, ${accent})`}} /></div>
  </TrackShell>;
};

const SlideEditor: React.FC<{state: HeroTrackState; accent: string; secondary: string; p: number; target: string}> = ({state, accent, secondary, p, target}) => {
  const selectByTarget: Record<string, number> = {'slide-01': 0, 'shape-object': 0, 'chart-object': 1, 'text-object': 2, 'export-result': 3};
  const select = selectByTarget[target] ?? Math.floor(p * 4);
  const selectedObject = ['形状 / Shape', '图表 / Chart', '标题 / Text', '导出 / Export'][select];
  const objectCurrent = (index: number) => (select === 0 && index === 0) || (select === 1 && index === 1) || (select === 2 && index === 2);
  const selectionPulse = interpolate(p, [0, .14, .55, 1], [.3, 1, .72, .85], {...clamp, easing: ease});
  const slideLabels = ['封面', '分析', '结论', '交付'];
  return <TrackShell label="可编辑的原生对象" detail={state.detail} accent={accent} p={p}>
    <div style={{display: 'grid', gridTemplateColumns: '126px minmax(0, 1fr) 156px', height: '100%', gap: 10}}>
      <div style={{padding: 10, background: PORTRAIT_COLOR_THEME.surfaceMuted, borderRight: `1px solid ${PORTRAIT_COLOR_THEME.line}`}}>
        <div style={{fontFamily: MONO, color: PORTRAIT_COLOR_THEME.textMuted, fontSize: 10, letterSpacing: 1.2, marginBottom: 11}}>SLIDES / 04</div>
        {[0, 1, 2, 3].map((item) => <div key={item} style={{height: 108, marginBottom: 11, padding: 7, background: item === select ? '#f4f0e6' : '#2a3447', border: `2px solid ${item === select ? accent : 'transparent'}`, opacity: interpolate(p, [item * .07, .2 + item * .07], [.25, 1], clamp), boxShadow: item === select ? `0 0 ${20 * selectionPulse}px ${accent}40` : undefined}}><div style={{height: 56, background: item === 0 ? secondary : item === 1 ? '#7b6ce0' : item === 2 ? '#e47d9d' : '#6da4af', opacity: .8}} /><div style={{marginTop: 7, color: item === select ? '#1a1b20' : '#d8e2f0', fontSize: 11, fontWeight: 900}}>{String(item + 1).padStart(2, '0')} {slideLabels[item]}</div></div>)}
      </div>
      <div style={{background: '#e2ded4', color: '#17171b', padding: '18px 18px 14px', position: 'relative', overflow: 'hidden'}}>
        <div style={{height: 32, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #b5b0a7', fontSize: 12, fontWeight: 950}}><span>PPT MASTER · {state.label}</span><span style={{fontFamily: MONO, color: '#7e7770'}}>100% · 16:9</span></div>
        <div style={{position: 'absolute', left: 18, right: 18, top: 64, height: 18, backgroundImage: 'repeating-linear-gradient(90deg, transparent 0 19px, #aaa59b 20px)', borderTop: '1px solid #c4bfb5'}} />
        <div style={{position: 'absolute', top: 82, bottom: 18, left: 28, width: 18, backgroundImage: 'repeating-linear-gradient(0deg, transparent 0 19px, #aaa59b 20px)', borderLeft: '1px solid #c4bfb5'}} />
        <div style={{position: 'absolute', left: 55, right: 20, top: 84, bottom: 26, background: '#faf8f1', boxShadow: '0 8px 24px rgba(50,44,36,.16)'}}>
          <div style={{position: 'absolute', left: '13%', right: '13%', top: '31%', borderTop: '1px dashed #c4bfb5'}} /><div style={{position: 'absolute', top: '14%', bottom: '12%', left: '50%', borderLeft: '1px dashed #c4bfb5'}} />
          <div style={{position: 'absolute', left: 42, top: 36, fontSize: 27, lineHeight: 1, fontWeight: 950}}>季度增长<br/><span style={{color: secondary}}>策略复盘</span></div>
          <div style={{position: 'absolute', left: '11%', top: '52%', width: 180, height: 90, background: secondary, opacity: .86, border: objectCurrent(0) ? `3px solid ${accent}` : '3px solid transparent', boxShadow: objectCurrent(0) ? `0 0 ${30 * selectionPulse}px ${accent}66` : undefined}} />
          <div style={{position: 'absolute', right: '14%', top: '39%', width: 138, height: 138, borderRadius: '50%', border: `11px solid ${accent}`, transform: `scale(${interpolate(p, [0, 1], [.68, 1], clamp)})`, opacity: .95}} />
          <div style={{position: 'absolute', left: '12%', right: '13%', bottom: '14%', height: 122, display: 'flex', gap: 13, alignItems: 'end'}}>{[48, 84, 128, 72].map((height, index) => <div key={index} style={{flex: 1, height, background: [accent, '#ff5f91', secondary, '#ffc44d'][index], border: objectCurrent(1) ? `3px solid ${accent}` : '3px solid transparent', boxShadow: objectCurrent(1) && index === 2 ? `0 0 ${28 * selectionPulse}px ${accent}66` : undefined}} />)}</div>
          <div style={{position: 'absolute', right: 28, top: 22, width: 114, fontSize: 13, fontWeight: 900, border: objectCurrent(2) ? `2px solid ${accent}` : '2px solid transparent', padding: 5, color: '#5d5960'}}>可编辑<br/>原生对象</div>
          {select < 3 ? <><div style={{position: 'absolute', left: select === 0 ? '9%' : select === 1 ? '12%' : 'auto', right: select === 2 ? 24 : 'auto', top: select === 2 ? 20 : select === 1 ? '71%' : '49%', width: select === 0 ? 190 : select === 1 ? '77%' : 128, height: select === 0 ? 100 : select === 1 ? 140 : 56, border: `2px solid ${accent}`, pointerEvents: 'none'}} />{Array.from({length: 8}).map((_, i) => <div key={i} style={{position: 'absolute', left: `${select === 2 ? 0 : select === 1 ? (i < 4 ? 10 : 85) : (i % 2 ? 9 : 28)}%`, top: `${select === 2 ? (i < 4 ? 20 : 31) : select === 1 ? (i % 2 ? 70 : 86) : (i < 4 ? 49 : 62)}%`, width: 7, height: 7, marginLeft: i % 2 ? -3 : 0, marginTop: i > 3 ? -3 : 0, background: accent, transform: 'translate(-50%, -50%)'}} />)}</> : <div style={{position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', background: `${accent}12`, color: '#17231e', fontSize: 27, fontWeight: 950}}>✓ 仍可在 PowerPoint 中编辑</div>}
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
  const nodes = ['素材', '正文', '承接'];
  const activeNode = target === 'article-source' ? 0 : target === 'article-body' ? 1 : target === 'article-bridge' || target === 'article-action' ? 2 : -1;
  const actionActive = target === 'article-action';
  const nodeX = [70, 350, 630];
  return <TrackShell label="读懂正文，再画成图" detail={state.detail} accent={accent} p={p}>
    <div style={{position: 'absolute', inset: '4px 0 0', padding: 28, background: '#f8f5ed', color: '#1a1c21', overflow: 'hidden'}}>
      <div style={{color: '#d7506d', fontSize: 21, fontWeight: 950}}>正文配图 · 信息建模画布</div><div style={{color: '#777', fontSize: 16, marginTop: 8}}>把“素材—判断—行动”连成一个读者看得懂的路径。</div>
      <div style={{position: 'absolute', left: 28, top: 105, width: 225, padding: 14, background: '#fff', borderLeft: `5px solid ${activeNode === 0 ? accent : '#202124'}`, boxShadow: activeNode === 0 ? `0 0 ${26 * p}px ${accent}33` : '0 4px 12px rgba(30,30,30,.08)'}}><div style={{fontFamily: MONO, fontSize: 11, color: '#8c8076'}}>SOURCE NOTE / 01</div><div style={{marginTop: 8, fontSize: 15, fontWeight: 900}}>“读者不知道下一步该做什么。”</div><div style={{marginTop: 8, color: '#736c66', fontSize: 12}}>引用、数据、访谈，先被整理成可判断的证据。</div></div>
      <div style={{position: 'absolute', right: 28, top: 105, width: 220, padding: 14, background: '#20242b', color: '#f8f5ed', borderLeft: `5px solid ${actionActive ? accent : '#ff5f91'}`, boxShadow: actionActive ? `0 0 ${26 * p}px ${accent}33` : undefined}}><div style={{fontFamily: MONO, fontSize: 11, color: '#ffb1bf'}}>READER ACTION / 03</div><div style={{marginTop: 8, fontSize: 15, fontWeight: 900}}>看到关系，才能继续行动。</div><div style={{marginTop: 10, color: '#bac3ce', fontSize: 12}}>一张图把正文的结论固定下来。</div></div>
      <svg viewBox="0 0 860 560" style={{position: 'absolute', left: 0, right: 0, top: 142, width: '100%', height: 560, pointerEvents: 'none'}}><path d="M190 205 C275 205 285 268 365 268" fill="none" stroke={activeNode === 0 || activeNode === 1 ? accent : '#202124'} strokeWidth="4" strokeDasharray={`${interpolate(p, [.08, .62], [0, 260], clamp)} 300`} /><path d="M540 268 C610 268 620 205 695 205" fill="none" stroke={activeNode === 1 || activeNode === 2 ? accent : '#202124'} strokeWidth="4" strokeDasharray={`${interpolate(p, [.2, .78], [0, 240], clamp)} 280`} /><path d="M445 332 C445 390 445 410 445 456" fill="none" stroke={actionActive ? accent : '#7e756e'} strokeWidth="3" strokeDasharray="8 12" /></svg>
      <div style={{position: 'absolute', left: 290, top: 224, fontFamily: MONO, fontSize: 11, color: '#777'}}>提炼判断</div><div style={{position: 'absolute', right: 255, top: 224, fontFamily: MONO, fontSize: 11, color: '#777'}}>承接结论</div>
      {nodes.map((node, index) => {const shown = interpolate(p, [.1 + index * .18, .32 + index * .18], [0, 1], {...clamp, easing: ease}); const current = index === activeNode; return <div key={node} style={{position: 'absolute', left: nodeX[index], top: index === 1 ? 292 : 272, width: 190, height: 110, display: 'grid', placeItems: 'center', border: `4px solid ${current ? accent : index === 2 ? '#ff5f91' : '#292a30'}`, background: current ? `${accent}22` : index === 1 ? '#fff0aa' : '#fff', borderRadius: index === 1 ? 60 : 0, fontSize: 25, fontWeight: 950, opacity: shown, transform: `scale(${interpolate(shown, [0, 1], [.7, 1], clamp)})`, boxShadow: current ? `0 0 ${34 * p}px ${accent}66` : undefined}}>{node}<span style={{position: 'absolute', bottom: -25, fontFamily: MONO, fontSize: 10, color: '#726b64'}}>{['证据', '观点', '结构'][index]}</span></div>;})}
      <div style={{position: 'absolute', left: 175, right: 175, bottom: 36, minHeight: 118, padding: '17px 20px', background: '#fff', border: `3px solid ${actionActive ? accent : '#222'}`, boxShadow: actionActive ? `0 0 ${30 * p}px ${accent}33` : '0 4px 12px rgba(30,30,30,.09)'}}><div style={{fontFamily: MONO, color: '#806f66', fontSize: 11}}>VISUAL OUTPUT / ONE CLEAR TAKEAWAY</div><div style={{marginTop: 9, fontSize: 22, fontWeight: 950}}>再画成一张读者能看懂的图</div><div style={{marginTop: 5, fontSize: 12, color: '#6d6863'}}>证据不丢失，正文不断层，结论有下一步。</div></div>
    </div>
  </TrackShell>;
};

const VideoAgent: React.FC<{state: HeroTrackState; accent: string; secondary: string; p: number}> = ({state, accent, secondary, p}) => <TrackShell label="HTML 交给 Agent 变成视频" detail={state.detail} accent={accent} p={p}>
  <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, height: '100%'}}><div style={{padding: 22, background: '#0b111b', border: '1px solid rgba(255,255,255,.1)', fontFamily: MONO}}><div style={{color: accent, fontSize: 13}}>INPUT / HTML</div><div style={{marginTop: 30, color: '#d6e4f7', fontSize: 18}}>&lt;section className="hero"&gt;</div><div style={{marginTop: 13, color: '#b8c2d0', fontSize: 18}}>  &lt;SkillCard /&gt;</div><div style={{marginTop: 13, color: '#d6e4f7', fontSize: 18}}>&lt;/section&gt;</div><EvidenceChips items={state.evidence ?? ['20+ Skills', 'Agent 执行']} accent={accent} p={p} /></div><div style={{padding: 22, background: `${secondary}12`, border: `1px solid ${secondary}77`}}><div style={{fontFamily: MONO, color: secondary, fontSize: 13}}>OUTPUT / VIDEO</div><div style={{height: 280, marginTop: 24, display: 'grid', placeItems: 'center', border: `1px solid ${accent}66`, background: '#101827'}}><div style={{width: 92, height: 92, borderRadius: '50%', display: 'grid', placeItems: 'center', border: `3px solid ${accent}`, color: accent, fontSize: 34, transform: `scale(${interpolate(p, [0, 1], [.7, 1], clamp)})`}}>▶</div></div><div style={{marginTop: 20, display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6}}>{Array.from({length: 8}).map((_, index) => <div key={index} style={{height: 38, background: index < p * 9 ? accent : '#263143'}} />)}</div></div></div>
</TrackShell>;

const DesignCompare: React.FC<{state: HeroTrackState; accent: string; secondary: string; p: number; target: string}> = ({state, accent, secondary, p, target}) => {
  const tokenIndex = target === 'type-token' ? 0 : target === 'space-token' ? 1 : target === 'color-token' ? 2 : target === 'system-token' ? 3 : -1;
  const beforeActive = target === 'before-surface' || tokenIndex < 0;
  const tokenNames = ['TYPE', 'SPACE', 'COLOR', 'SYSTEM'];
  const tokenValues = ['Display 52 / 0.94', '8 · 16 · 24 · 40', '#17372C / #F2C85C', '12 columns / 4 rules'];
  const highlightPulse = interpolate(p, [0, .14, .54, 1], [.25, 1, .7, .9], {...clamp, easing: ease});
  return <TrackShell label="不是模板，是设计立场" detail={state.detail} accent={accent} p={p}>
    <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, height: 462}}>
      <div style={{position: 'relative'}}><div style={{fontFamily: MONO, color: '#ff7e9b', fontSize: 13, fontWeight: 900}}>BEFORE · AI 塑料味</div><div style={{height: 426, marginTop: 12, padding: 22, borderRadius: 16, overflow: 'hidden', position: 'relative', background: 'linear-gradient(160deg, #7d42ff, #2856d8)', border: beforeActive ? `2px solid #ff7e9b` : '2px solid transparent', boxShadow: beforeActive ? `0 0 ${32 * highlightPulse}px #ff7e9b55` : undefined}}><div style={{position: 'absolute', left: 18, right: 18, top: 16, display: 'flex', justifyContent: 'space-between', color: 'rgba(255,255,255,.58)', fontFamily: MONO, fontSize: 10}}><span>NEW AI APP</span><span>00:00</span></div><div style={{marginTop: 42, fontSize: 31, lineHeight: .96, fontWeight: 950, color: '#fff'}}>Everything<br/>for everyone.</div>{[0, 1, 2].map((index) => <div key={index} style={{height: 55, marginTop: index ? 15 : 28, marginLeft: index === 1 ? 14 : 0, marginRight: index === 2 ? 20 : 0, borderRadius: 24, background: 'rgba(255,255,255,.16)', border: index === 1 && beforeActive ? '1px solid rgba(255,255,255,.68)' : '1px solid transparent'}} />)}<div style={{height: 52, marginTop: 18, borderRadius: 28, background: '#fff', color: '#6d42d8', display: 'grid', placeItems: 'center', fontWeight: 950}}>Get Started</div><div style={{position: 'absolute', right: 15, bottom: 15, color: '#fff', fontFamily: MONO, fontSize: 10, opacity: .78}}>RANDOM / NO SYSTEM</div></div></div>
      <div style={{position: 'relative'}}><div style={{fontFamily: MONO, color: accent, fontSize: 13, fontWeight: 900}}>AFTER · 可上线设计</div><div style={{height: 426, marginTop: 12, padding: 22, position: 'relative', overflow: 'hidden', background: '#f6f3e8', color: '#17191c', border: tokenIndex >= 0 ? `2px solid ${accent}` : '2px solid transparent', boxShadow: tokenIndex >= 0 ? `0 0 ${32 * highlightPulse}px ${accent}4d` : undefined}}><div style={{position: 'absolute', inset: 0, opacity: .22, backgroundImage: 'linear-gradient(90deg, #777 1px, transparent 1px)', backgroundSize: '28px 100%'}} /><div style={{position: 'relative', display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 900}}><span>ATELIER / 24</span><span>MENU</span></div><div style={{position: 'relative', fontSize: 38, lineHeight: .98, fontWeight: 950, marginTop: 58}}>Coffee for<br/>slow mornings.</div><div style={{position: 'relative', height: 4, width: `${interpolate(p, [0, 1], [20, 78], clamp)}%`, background: secondary, marginTop: 24}} /><div style={{position: 'relative', height: 128, marginTop: 44, background: '#17372c'}}><div style={{position: 'absolute', left: 26, top: 22, width: 68, height: 68, border: '8px solid #f2c85c', borderRadius: '50%'}} /><div style={{position: 'absolute', right: 20, top: 22, color: '#f6f3e8', fontFamily: MONO, fontSize: 11}}>01 / 04<br/>EDITORIAL</div></div><div style={{position: 'absolute', left: 16, bottom: 10, fontFamily: MONO, fontSize: 10, color: '#6f6a62'}}>GRID 12 · BASELINE 8 · CONTRAST AA</div></div></div>
    </div>
    <div style={{display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginTop: 22}}>{tokenNames.map((item, index) => {const current = index === tokenIndex; const revealed = index <= Math.max(0, Math.floor(p * 4)); return <div key={item} style={{height: 104, padding: '14px 13px', borderTop: `4px solid ${current ? accent : revealed ? secondary : PORTRAIT_COLOR_THEME.line}`, background: current ? `${accent}16` : PORTRAIT_COLOR_THEME.surfaceMuted, color: current ? '#fff' : '#b7c5d7', boxShadow: current ? `0 0 ${28 * highlightPulse}px ${accent}40` : undefined, transform: `translateY(${current ? interpolate(highlightPulse, [0, 1], [12, 0]) : 0}px)`, opacity: revealed || current ? 1 : .38}}><div style={{fontFamily: MONO, fontSize: 11, fontWeight: 950}}>{String(index + 1).padStart(2, '0')} / {item}</div><div style={{marginTop: 13, fontSize: 12, lineHeight: 1.25, color: current ? accent : PORTRAIT_COLOR_THEME.textMuted, fontWeight: 800}}>{tokenValues[index]}</div></div>;})}</div>
  </TrackShell>;
};

const SystemSummary: React.FC<{state: HeroTrackState; accent: string; secondary: string; p: number; brandName: string}> = ({state, accent, secondary, p, brandName}) => {
  const nodes = ['编码原则', 'Remotion', 'PPT Master', '正文配图', 'HyperFrames', 'UI Skill'];
  const positions = [[80, 90], [370, 45], [635, 120], [100, 360], [375, 430], [645, 350]];
  return <TrackShell label="六个 Skill，汇成一个系统" detail={state.detail} accent={accent} p={p}>
    <svg viewBox="0 0 860 650" style={{position: 'absolute', inset: 0, width: '100%', height: '100%'}}>{positions.map(([x, y], index) => index === 0 ? null : <line key={index} x1="430" y1="290" x2={x + 80} y2={y + 42} stroke={index % 2 ? accent : secondary} strokeWidth="3" strokeDasharray={`${interpolate(p, [0.08 + index * .05, .48 + index * .05], [0, 420], clamp)} 520`} opacity=".8" />)}</svg>
    <div style={{position: 'absolute', left: 365, top: 245, width: 150, height: 110, display: 'grid', placeItems: 'center', border: `3px solid ${accent}`, background: '#0b111c', color: '#fff', fontWeight: 950, textAlign: 'center', boxShadow: `0 0 30px ${accent}44`, fontSize: textFit(brandName, 21, 15), lineHeight: 1.05}}>{brandName}</div>{nodes.map((node, index) => {const shown = interpolate(p, [.12 + index * .08, .3 + index * .08], [0, 1], {...clamp, easing: ease}); const [x, y] = positions[index]; return <div key={node} style={{position: 'absolute', left: x, top: y, width: 160, minHeight: 84, padding: 12, display: 'grid', placeItems: 'center', border: `1px solid ${index % 2 ? secondary : accent}`, background: '#0a101a', color: '#f3f6fb', fontSize: 16, fontWeight: 900, textAlign: 'center', opacity: shown, transform: `scale(${interpolate(shown, [0, 1], [.75, 1], clamp)})`}}>{node}</div>;})}
  </TrackShell>;
};

const GenericExplainer: React.FC<{state: HeroTrackState; accent: string; secondary: string; p: number}> = ({state, accent, secondary, p}) => <TrackShell label={state.label} detail={state.detail} accent={accent} p={p}><div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 18, marginTop: 90}}>{['输入', '规则', '结果'].map((label, index) => <div key={label} style={{height: 340, padding: 24, border: `1px solid ${index === 1 ? accent : '#334055'}`, background: index === 1 ? `${accent}12` : '#0b111c', opacity: interpolate(p, [index * .12, .32 + index * .12], [0, 1], clamp)}}><div style={{fontFamily: MONO, color: index === 1 ? accent : '#8c98aa'}}>0{index + 1} / {label}</div><div style={{marginTop: 55, color: '#fff', fontSize: 25, lineHeight: 1.2, fontWeight: 950}}>{(state.evidence?.[index] ?? state.label)}</div></div>)}</div></TrackShell>;

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

const TechnicalShotHero: React.FC<{state: HeroTrackState; accent: string; secondary: string; p: number}> = ({state, accent, secondary, p}) => {
  const shot = state.shot;
  if (!shot) return null;
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
    return <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, height: '100%'}}>
      {[['BEFORE', shot.before ?? shot.evidence[0] ?? '旧状态', '#ff6b88'], ['AFTER', shot.after ?? shot.evidence[1] ?? '新状态', accent]].map(([label, text, color], index) => <div key={label} style={{position: 'relative', padding: 22, border: `1px solid ${color}88`, background: `${color}14`, overflow: 'hidden'}}><div style={{fontFamily: MONO, color, fontSize: 12, fontWeight: 950}}>{label}</div><div style={{marginTop: 48, color: '#fff', fontSize: 27, lineHeight: 1.12, fontWeight: 950}}>{compact(text, 36)}</div><div style={{position: 'absolute', left: 0, top: 0, bottom: 0, width: `${index === 0 ? interpolate(sweep, [0, 1], [100, 22], clamp) : interpolate(sweep, [0, 1], [0, 100], clamp)}%`, background: index === 0 ? 'rgba(0,0,0,.26)' : `${accent}10`, pointerEvents: 'none'}} /></div>)}
    </div>;
  })();
  return <TrackShell label={state.label} detail={state.detail} accent={accent} p={p}><ShotFrame shot={shot} lens={state.lens} accent={accent} secondary={secondary} p={p}>{body}</ShotFrame></TrackShell>;
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

export const HeroTrackV2: React.FC<{frame: number; track: HeroTrack; accent: string; secondary: string; brandName?: string}> = ({frame, track, accent, secondary, brandName = 'Skill System'}) => {
  const state = track.states.find((item) => frame >= item.startFrame && frame < item.endFrame) ?? track.states[track.states.length - 1];
  if (!state) return null;
  const stateP = stateProgress(frame, state);
  const stateIndex = track.states.indexOf(state);
  // The product composition is persistent inside a Hero Track. Only its
  // selected entity changes after the opening has established the layout.
  const p = stateIndex === 0 ? stateP : 1;
  const common = {state, accent, secondary, p, stateIndex, target: state.entityTarget ?? ''};
  const visual = state.shot ? <TechnicalShotHero state={state} accent={accent} secondary={secondary} p={stateP} />
    : track.kind === 'overview-matrix' ? <OverviewMatrix {...common} />
    : track.kind === 'rule-compare' ? <RuleCompare {...common} />
      : track.kind === 'code-render' ? <CodeRender {...common} />
        : track.kind === 'slide-editor' ? <SlideEditor {...common} />
          : track.kind === 'article-map' ? <ArticleMap {...common} />
            : track.kind === 'video-agent' ? <VideoAgent {...common} />
              : track.kind === 'design-compare' ? <DesignCompare {...common} />
                : track.kind === 'system-summary' ? <SystemSummary {...common} brandName={brandName} />
                  : <GenericExplainer {...common} />;
  return <AbsoluteFill>
    {visual}
    {state.shot ? null : <EntityBoundMotion track={track} state={state} accent={accent} secondary={secondary} p={stateP} />}
  </AbsoluteFill>;
};
