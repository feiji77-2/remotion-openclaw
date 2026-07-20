import React from 'react';
import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {SemanticIcon} from './SemanticLayers';
import {TechExplainerHero} from './TechExplainerHero';
import {TechnicalEvidenceWorkbench} from './TechnicalEvidenceWorkbench';
import {HeroTrackV2} from './HeroTrackV2';
import {PORTRAIT_COLOR_THEME} from './portraitColorTheme';
import storyboardContract from './storyboardContract.json';
import {productIconPath, type ProductIconKey} from './productIcons';
import type {
  SkillBeatShotPreset,
  SkillIconKey,
  HeroTrack,
  SkillShowcaseBeat,
  SkillShowcaseProps,
  SkillShowcaseVariant,
} from './types';

const FONT = '"PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", Inter, system-ui, sans-serif';
const MONO = '"SFMono-Regular", "JetBrains Mono", Menlo, Consolas, monospace';
const PALETTE = PORTRAIT_COLOR_THEME.palette;
const STAGE_BACKGROUND = PORTRAIT_COLOR_THEME.stage;
const STAGE_SHADOW = PORTRAIT_COLOR_THEME.stageShadow;
const HERO_STAGE_TOP = storyboardContract.zones.hero.top;
const HERO_STAGE_HEIGHT = storyboardContract.zones.hero.bottom - storyboardContract.zones.hero.top;
const HERO_STAGE_SCALE = 1;
const SEMANTIC_STAGE_TOP = storyboardContract.zones.semantic.top;
const SEMANTIC_STAGE_HEIGHT = storyboardContract.zones.semantic.bottom - storyboardContract.zones.semantic.top;
const clamp = {extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const};
const easeOut = Easing.bezier(0.16, 1, 0.3, 1);

const PRODUCT_FOR_VARIANT: Record<SkillShowcaseVariant, ProductIconKey> = {
  intro: 'design-system',
  overview: 'design-system',
  coding: 'coding',
  remotion: 'remotion',
  ppt: 'ppt',
  illustration: 'illustration',
  hyperframes: 'hyperframes',
  ui: 'ui',
  outro: 'design-system',
  impeccable: 'impeccable',
  'frontend-design': 'frontend-design',
  'ux-pro': 'ux-pro',
  'cloud-design': 'cloud-design',
  generic: 'generic-ai',
};

const fract = (value: number) => value - Math.floor(value);
const seeded = (seed: number) => fract(Math.sin(seed * 91.173) * 43758.5453);
const phase = (frame: number, beat: SkillShowcaseBeat) => {
  const duration = Math.max(1, beat.endFrame - beat.startFrame);
  return Math.max(0, Math.min(1, (frame - beat.startFrame) / duration));
};
const layerOpacity = (frame: number, beat: SkillShowcaseBeat) => {
  const overlap = 7;
  const enter = interpolate(frame, [beat.startFrame - overlap, beat.startFrame + 10], [0, 1], {...clamp, easing: easeOut});
  const exit = interpolate(frame, [beat.endFrame - 9, beat.endFrame + overlap], [1, 0], {...clamp, easing: Easing.in(Easing.cubic)});
  return enter * exit;
};
const lift = (progress: number, distance = 42) => interpolate(progress, [0, 1], [distance, 0]);

const ProductMark: React.FC<{icon: ProductIconKey; accent: string; size?: number}> = ({icon, accent, size = 58}) => (
  <div style={{
    width: size,
    height: size,
    flex: `0 0 ${size}px`,
    borderRadius: Math.round(size * 0.24),
    overflow: 'hidden',
    border: `1px solid ${accent}77`,
    background: PORTRAIT_COLOR_THEME.surface,
    boxShadow: `0 0 ${Math.round(size * 0.7)}px ${accent}35`,
  }}>
    <Img src={staticFile(productIconPath(icon))} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
  </div>
);

const CinematicBackdrop: React.FC<{frame: number; accent: string; secondary: string}> = ({frame, accent, secondary}) => {
  const scanY = interpolate(frame % 180, [0, 180], [-160, 2080]);
  const drift = Math.sin(frame / 54) * 55;
  return (
    <AbsoluteFill style={{background: STAGE_BACKGROUND, overflow: 'hidden'}}>
      <AbsoluteFill style={{
        opacity: 0.62,
        backgroundImage: [
          `linear-gradient(118deg, transparent 0 42%, ${accent}12 42% 43%, transparent 43% 100%)`,
          `linear-gradient(28deg, transparent 0 70%, ${secondary}10 70% 71%, transparent 71% 100%)`,
          'linear-gradient(rgba(255,255,255,0.022) 1px, transparent 1px)',
          'linear-gradient(90deg, rgba(255,255,255,0.022) 1px, transparent 1px)',
        ].join(', '),
        backgroundSize: 'auto, auto, 64px 64px, 64px 64px',
        backgroundPosition: `${drift}px 0, ${-drift * 0.6}px 0, 0 0, 0 0`,
      }} />
      <div style={{position: 'absolute', left: -220, right: -220, top: scanY, height: 220, transform: 'skewY(-8deg)', background: `linear-gradient(180deg, transparent, ${accent}12, transparent)`}} />
      <div style={{position: 'absolute', width: 780, height: 780, right: -360, top: 120, borderRadius: '50%', background: `radial-gradient(circle, ${secondary}20, transparent 68%)`}} />
      <div style={{position: 'absolute', width: 680, height: 680, left: -390, bottom: 120, borderRadius: '50%', background: `radial-gradient(circle, ${accent}18, transparent 70%)`}} />
      <AbsoluteFill style={{background: `linear-gradient(180deg, rgba(16,24,39,0.04), rgba(12,19,33,0.18) 56%, ${STAGE_SHADOW})`}} />
      <div style={{position: 'absolute', left: 38, top: 38, width: 44, height: 44, borderLeft: `2px solid ${accent}88`, borderTop: `2px solid ${accent}88`}} />
      <div style={{position: 'absolute', right: 38, bottom: 38, width: 44, height: 44, borderRight: `2px solid ${secondary}88`, borderBottom: `2px solid ${secondary}88`}} />
    </AbsoluteFill>
  );
};

const ChapterHeader: React.FC<{
  frame: number;
  title: string;
  subtitle?: string;
  index?: string;
  accent: string;
  product: ProductIconKey;
  progressIndex: number;
  progressTotal: number;
}> = ({frame, title, subtitle, index, accent, product, progressIndex, progressTotal}) => {
  const p = interpolate(frame, [0, 14], [0, 1], {...clamp, easing: easeOut});
  return (
    <>
      <div style={{position: 'absolute', left: 52, right: 52, top: 42, display: 'grid', gridTemplateColumns: `repeat(${progressTotal}, 1fr)`, gap: 7}}>
        {Array.from({length: progressTotal}).map((_, itemIndex) => (
          <div key={itemIndex} style={{height: itemIndex === progressIndex ? 5 : 3, background: PALETTE[itemIndex % PALETTE.length], opacity: itemIndex <= progressIndex ? 1 : 0.2}} />
        ))}
      </div>
      <div style={{position: 'absolute', left: 52, right: 52, top: 78, height: 142, display: 'flex', alignItems: 'center', gap: 16, opacity: p, transform: `translateY(${lift(p, -18)}px)`}}>
        {index ? <div style={{width: 56, height: 56, borderRadius: '50%', border: `2px solid ${accent}`, display: 'grid', placeItems: 'center', fontFamily: MONO, fontSize: 17, color: accent, fontWeight: 950}}>{index}</div> : null}
        <ProductMark icon={product} accent={accent} size={58} />
        <div style={{minWidth: 0}}>
          <div style={{fontSize: 28, lineHeight: 1.05, color: '#fff', fontWeight: 950, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 670}}>{title}</div>
          {subtitle ? <div style={{fontSize: 14, color: 'rgba(255,255,255,0.44)', fontWeight: 750, marginTop: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 720}}>{subtitle}</div> : null}
        </div>
        <div style={{marginLeft: 'auto', fontFamily: MONO, fontSize: 10, letterSpacing: 1.6, color: 'rgba(255,255,255,0.3)', writingMode: 'vertical-rl'}}>VOICE / VISUAL</div>
      </div>
    </>
  );
};

const StageTitle: React.FC<{beat: SkillShowcaseBeat; accent: string; progress: number; align?: 'left' | 'center'}> = ({beat, accent, progress, align = 'center'}) => (
  <div style={{position: 'absolute', left: 56, right: 56, top: 48, textAlign: align, opacity: progress, transform: `translateY(${lift(progress, 30)}px)`}}>
    <div style={{fontFamily: MONO, fontSize: 12, color: accent, letterSpacing: 2, fontWeight: 900}}>VOICE HIT / {beat.action.toUpperCase()}</div>
    <div style={{fontSize: beat.keyword.length > 9 ? 54 : 68, lineHeight: 1.02, color: '#fff', fontWeight: 950, marginTop: 14}}>{beat.keyword}</div>
  </div>
);

const PhoneInterface: React.FC<{
  accent: string;
  secondary: string;
  progress: number;
  scanY?: number;
  compact?: boolean;
  theme?: 'default' | 'designed' | 'mono';
}> = ({accent, secondary, progress, scanY, compact = false, theme = 'designed'}) => {
  const width = compact ? 430 : 520;
  const height = compact ? 620 : 760;
  const purple = theme === 'default';
  const mono = theme === 'mono';
  const background = purple ? 'linear-gradient(150deg, #6d39b5, #263d9d)' : mono ? '#f4f1e8' : PORTRAIT_COLOR_THEME.surface;
  const foreground = mono ? '#111' : '#fff';
  return (
    <div style={{position: 'relative', width, height, borderRadius: 30, border: `2px solid ${purple ? '#a777ff' : accent}`, background, overflow: 'hidden', padding: compact ? 24 : 30, boxShadow: `0 28px 80px rgba(0,0,0,0.45), 0 0 42px ${accent}24`, color: foreground}}>
      <div style={{height: 18, width: '34%', borderRadius: 20, margin: '0 auto', background: mono ? '#111' : 'rgba(255,255,255,0.78)'}} />
      <div style={{marginTop: 36, fontFamily: MONO, fontSize: 11, letterSpacing: 1.4, color: purple ? '#f7e9ff' : mono ? '#444' : accent}}>SYSTEM / LIVE OUTPUT</div>
      <div style={{fontSize: compact ? 30 : 38, lineHeight: 1.02, fontWeight: 950, marginTop: 14}}>{purple ? 'Everything, centered.' : 'A clear point of view.'}</div>
      <div style={{height: 5, width: `${interpolate(progress, [0, 1], [18, 72])}%`, background: purple ? '#d9b8ff' : accent, marginTop: 24}} />
      {[0, 1, 2, 3].map((index) => (
        <div key={index} style={{height: compact ? 70 : 86, marginTop: 14, borderRadius: purple ? 24 : 4, background: purple ? 'rgba(255,255,255,0.14)' : mono ? (index % 2 ? '#dedbd2' : '#fff') : 'rgba(255,255,255,0.055)', border: `1px solid ${purple ? 'rgba(255,255,255,0.16)' : mono ? '#bbb7ad' : `${accent}35`}`, transform: `translateX(${interpolate(progress, [0, 1], [index % 2 ? 40 : -40, 0])}px)`}} />
      ))}
      <div style={{position: 'absolute', left: 28, right: 28, bottom: 28, height: 54, borderRadius: purple ? 28 : 4, display: 'grid', placeItems: 'center', background: purple ? '#efe9ff' : accent, color: purple ? '#6c35b4' : '#07100b', fontWeight: 950, fontSize: 15}}>RUN SYSTEM</div>
      {scanY !== undefined ? <div style={{position: 'absolute', left: 0, right: 0, top: scanY, height: 5, background: `linear-gradient(90deg, transparent, #fff, ${secondary}, transparent)`, boxShadow: `0 0 28px ${secondary}`}} /> : null}
    </div>
  );
};

const KineticTypeShot: React.FC<{frame: number; beat: SkillShowcaseBeat; accent: string; secondary: string; opacity: number}> = ({frame, beat, accent, secondary, opacity}) => {
  const p = phase(frame, beat);
  const state = beat.visualState ?? '';
  const tokens = beat.evidence?.length ? beat.evidence : ['TYPE', 'COLOR', 'GRID', 'SPACE'];
  const metrics = state.includes('metrics');
  const anti = state.includes('rules') || state.includes('anti');
  return (
    <AbsoluteFill style={{opacity}}>
      <StageTitle beat={beat} accent={accent} progress={Math.min(1, p * 5)} align={metrics ? 'center' : 'left'} />
      {metrics ? (
        <div style={{position: 'absolute', left: 42, right: 42, top: 300, bottom: 110, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8}}>
          {['161', '67', '57', '99'].map((value, index) => {
            const x = index % 2 === 0 ? -260 : 260;
            const y = index < 2 ? -170 : 170;
            const enter = Math.min(1, Math.max(0, p * 4 - index * 0.16));
            return <div key={value} style={{display: 'grid', placeItems: 'center', borderTop: `3px solid ${PALETTE[index]}`, color: PALETTE[index], fontSize: 116, fontWeight: 950, transform: `translate(${interpolate(enter, [0, 1], [x, 0])}px, ${interpolate(enter, [0, 1], [y, 0])}px) scale(${interpolate(enter, [0, 1], [1.4, 1])})`, opacity: enter}}>{value}</div>;
          })}
        </div>
      ) : (
        <>
          <div style={{position: 'absolute', left: 56, right: 56, top: 300, height: 650}}>
            {tokens.slice(0, 4).map((token, index) => {
              const enter = Math.min(1, Math.max(0, p * 5 - index * 0.16));
              const scatterX = (seeded(index + 8) - 0.5) * 580;
              const scatterY = (seeded(index + 18) - 0.5) * 440;
              return (
                <div key={token} style={{position: 'absolute', left: 40 + (index % 2) * 430, top: 80 + Math.floor(index / 2) * 250, width: 390, fontSize: anti ? 42 : 54, fontWeight: 950, color: anti ? '#ff718b' : index % 2 ? secondary : '#fff', transform: `translate(${interpolate(enter, [0, 1], [scatterX, 0])}px, ${interpolate(enter, [0, 1], [scatterY, 0])}px) rotate(${interpolate(enter, [0, 1], [index % 2 ? 14 : -12, 0])}deg)`, opacity: enter}}>
                  {token}
                  <div style={{height: anti ? 6 : 3, width: `${interpolate(enter, [0, 1], [0, anti ? 100 : 72])}%`, background: anti ? '#ff4f70' : accent, marginTop: 12, transform: anti ? `rotate(${index % 2 ? -3 : 3}deg)` : undefined}} />
                </div>
              );
            })}
          </div>
          <div style={{position: 'absolute', left: 56, right: 56, bottom: 110, fontSize: 28, lineHeight: 1.4, color: 'rgba(255,255,255,0.56)', fontWeight: 780}}>{beat.detail ?? (anti ? '规则不是建议，而是源头约束。' : '散乱的审美变量，重新吸附成设计语言。')}</div>
        </>
      )}
    </AbsoluteFill>
  );
};

const SplitWipeShot: React.FC<{frame: number; beat: SkillShowcaseBeat; accent: string; secondary: string; opacity: number}> = ({frame, beat, accent, secondary, opacity}) => {
  const p = phase(frame, beat);
  const reveal = interpolate(p, [0.08, 0.68], [0, 1], {...clamp, easing: easeOut});
  const dividerY = interpolate(reveal, [0, 1], [920, 610]);
  const evidence = beat.evidence ?? ['默认 AI', '装上 Skill'];
  const pain = (beat.visualState ?? '').includes('pain');
  return (
    <AbsoluteFill style={{opacity}}>
      <StageTitle beat={beat} accent={accent} progress={Math.min(1, p * 5)} />
      <div style={{position: 'absolute', left: 54, right: 54, top: 230, bottom: 80, overflow: 'hidden'}}>
        <div style={{position: 'absolute', inset: 0, background: pain ? 'rgba(255,255,255,0.025)' : 'linear-gradient(150deg, rgba(111,58,183,0.8), rgba(39,59,148,0.68))', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 110}}>
          {pain ? <div style={{fontSize: 170, color: 'rgba(255,255,255,0.1)', fontWeight: 950}}>?</div> : <PhoneInterface accent="#9a7cff" secondary={secondary} progress={reveal} compact theme="default" />}
          <div style={{position: 'absolute', left: 28, bottom: 24, fontFamily: MONO, color: '#ff9bb0', fontSize: 14, letterSpacing: 1.5}}>{evidence[0]}</div>
        </div>
        <div style={{position: 'absolute', inset: 0, clipPath: `inset(0 0 ${Math.max(0, 100 - reveal * 100)}% 0)`, background: pain ? `radial-gradient(circle at 50% 42%, ${accent}25, rgba(7,10,18,0.98) 66%)` : 'rgba(7,10,18,0.97)', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 110}}>
          {pain ? (
            <svg width="720" height="720" viewBox="0 0 720 720">
              <path d="M84 560 C150 210 300 520 368 180 C440 12 590 250 646 96" fill="none" stroke={accent} strokeWidth="5" strokeDasharray="12 16" strokeDashoffset={-frame * 4} />
              {[[84,560],[368,180],[646,96]].map(([x,y], index) => <circle key={index} cx={x} cy={y} r={18 + index * 4} fill="#070a12" stroke={PALETTE[index]} strokeWidth="5" />)}
            </svg>
          ) : <PhoneInterface accent={accent} secondary={secondary} progress={reveal} compact theme="designed" />}
          <div style={{position: 'absolute', right: 28, bottom: 24, fontFamily: MONO, color: accent, fontSize: 14, letterSpacing: 1.5}}>{evidence[1]}</div>
        </div>
        <div style={{position: 'absolute', left: 0, right: 0, top: dividerY, height: 5, background: `linear-gradient(90deg, transparent, ${accent}, #fff, ${secondary}, transparent)`, boxShadow: `0 0 28px ${accent}`}} />
      </div>
    </AbsoluteFill>
  );
};

const ParticleFieldShot: React.FC<{frame: number; beat: SkillShowcaseBeat; accent: string; opacity: number}> = ({frame, beat, accent, opacity}) => {
  const p = phase(frame, beat);
  const state = beat.visualState ?? '';
  const brandMode = state.includes('brands');
  const categoryMode = state.includes('categories');
  const labels = brandMode ? ['Stripe', 'Linear', 'Vercel', 'Recta', 'Figma', 'Notion', 'Arc', 'Framer'] : categoryMode ? ['字体', '色彩', '布局', '间距', '网格', '对比', '层级', '无障碍'] : [];
  const centerText = beat.value ?? (brandMode ? '68' : categoryMode ? '8' : '22K');
  return (
    <AbsoluteFill style={{opacity}}>
      <StageTitle beat={beat} accent={accent} progress={Math.min(1, p * 5)} />
      <div style={{position: 'absolute', left: 0, right: 0, top: 210, bottom: 60}}>
        {Array.from({length: 42}).map((_, index) => {
          const angle = seeded(index + 2) * Math.PI * 2 + frame * (index % 2 ? 0.002 : -0.0015);
          const radius = 170 + seeded(index + 40) * 360;
          const settle = Math.min(1, p * 2.8);
          const x = 540 + Math.cos(angle) * radius * settle;
          const y = 530 + Math.sin(angle) * radius * 0.95 * settle;
          const size = 3 + seeded(index + 77) * 8;
          return <div key={index} style={{position: 'absolute', left: x, top: y, width: size, height: size, transform: 'translate(-50%, -50%) rotate(45deg)', background: index % 5 === 0 ? '#fff' : PALETTE[index % PALETTE.length], boxShadow: `0 0 ${size * 3}px ${PALETTE[index % PALETTE.length]}`, opacity: 0.34 + seeded(index) * 0.66}} />;
        })}
        <div style={{position: 'absolute', left: '50%', top: 520, transform: `translate(-50%, -50%) scale(${interpolate(Math.min(1, p * 3), [0, 1], [1.8, 1])})`, fontSize: centerText.length > 3 ? 146 : 210, lineHeight: 0.8, color: accent, fontWeight: 950, textShadow: `0 0 52px ${accent}55`}}>{centerText}</div>
        {labels.map((label, index) => {
          const angle = index / labels.length * Math.PI * 2 - Math.PI / 2;
          const radius = 360 + (index % 2) * 70;
          const enter = Math.min(1, Math.max(0, p * 4 - index * 0.08));
          return <div key={label} style={{position: 'absolute', left: 540 + Math.cos(angle) * radius, top: 530 + Math.sin(angle) * radius, transform: `translate(-50%, -50%) scale(${enter})`, color: '#fff', fontSize: 23, fontWeight: 900, whiteSpace: 'nowrap', opacity: enter}}>{label}<div style={{height: 3, background: PALETTE[index % PALETTE.length], marginTop: 7}} /></div>;
        })}
      </div>
    </AbsoluteFill>
  );
};

const OrbitalMapShot: React.FC<{frame: number; beat: SkillShowcaseBeat; accent: string; opacity: number}> = ({frame, beat, accent, opacity}) => {
  const p = phase(frame, beat);
  const state = beat.visualState ?? '';
  const database = state.includes('database');
  const labels = database ? ['COLOR', 'TYPE', 'SPACE', 'WCAG', 'GRID', 'VOICE'] : ['命名', '扫描', '对比', '解释', '布局', '色彩'];
  const core = beat.value ?? (database ? 'DB' : '37');
  return (
    <AbsoluteFill style={{opacity}}>
      <StageTitle beat={beat} accent={accent} progress={Math.min(1, p * 5)} />
      <div style={{position: 'absolute', left: 40, right: 40, top: 250, height: 870}}>
        <svg width="1000" height="870" viewBox="0 0 1000 870" style={{position: 'absolute', inset: 0}}>
          {[210, 310, 410].map((radius, index) => <circle key={radius} cx="500" cy="430" r={radius} fill="none" stroke={index === 1 ? accent : 'rgba(255,255,255,0.13)'} strokeWidth={index === 1 ? 4 : 2} strokeDasharray={`${20 + index * 10} ${18 + index * 8}`} strokeDashoffset={(index % 2 ? 1 : -1) * frame * (2 + index)} opacity={0.45 + index * 0.15} />)}
          {Array.from({length: 16}).map((_, index) => {
            const a = index / 16 * Math.PI * 2 + frame * 0.003 * (index % 2 ? 1 : -1);
            const r = index % 3 === 0 ? 410 : index % 2 ? 310 : 210;
            return <circle key={index} cx={500 + Math.cos(a) * r} cy={430 + Math.sin(a) * r} r={index % 4 === 0 ? 10 : 5} fill={PALETTE[index % PALETTE.length]} />;
          })}
        </svg>
        <div style={{position: 'absolute', left: '50%', top: 430, transform: `translate(-50%, -50%) scale(${interpolate(Math.min(1, p * 4), [0, 1], [1.5, 1])})`, width: 270, height: 270, borderRadius: database ? 36 : '50%', border: `5px solid ${accent}`, background: 'rgba(7,10,18,0.94)', display: 'grid', placeItems: 'center', color: accent, fontSize: core.length > 2 ? 90 : 132, lineHeight: 1, fontWeight: 950, boxShadow: `0 0 70px ${accent}44`}}>{core}</div>
        {labels.map((label, index) => {
          const angle = index / labels.length * Math.PI * 2 - Math.PI / 2;
          const radius = index % 2 ? 325 : 420;
          return <div key={label} style={{position: 'absolute', left: 500 + Math.cos(angle) * radius, top: 430 + Math.sin(angle) * radius, transform: 'translate(-50%, -50%)', fontFamily: MONO, fontSize: 15, letterSpacing: 1.2, color: '#fff', fontWeight: 850}}>{label}</div>;
        })}
      </div>
    </AbsoluteFill>
  );
};

const UiScanShot: React.FC<{frame: number; beat: SkillShowcaseBeat; accent: string; secondary: string; opacity: number}> = ({frame, beat, accent, secondary, opacity}) => {
  const p = phase(frame, beat);
  const scanY = interpolate((p * 1.35) % 1, [0, 1], [30, 710]);
  return (
    <AbsoluteFill style={{opacity}}>
      <StageTitle beat={beat} accent={accent} progress={Math.min(1, p * 5)} />
      <div style={{position: 'absolute', left: 0, right: 0, top: 220, bottom: 40, display: 'grid', placeItems: 'center'}}>
        <div style={{position: 'relative'}}>
          <PhoneInterface accent={accent} secondary={secondary} progress={Math.min(1, p * 3)} scanY={scanY} />
          {[[92,210],[420,365],[120,538]].map(([x,y], index) => {
            const visible = scanY > y ? 1 : 0;
            return <div key={index} style={{position: 'absolute', left: x, top: y, width: 58, height: 58, border: `3px solid ${index === 1 ? '#ff5f7a' : accent}`, opacity: visible, transform: `scale(${visible ? 1 : 1.8})`, boxShadow: `0 0 30px ${index === 1 ? '#ff5f7a' : accent}66`}}><div style={{position: 'absolute', left: 66, top: 4, width: 160, fontFamily: MONO, fontSize: 12, color: index === 1 ? '#ff8299' : accent, whiteSpace: 'nowrap'}}>ISSUE / 0{index + 1}</div></div>;
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};

const MaterialCarouselShot: React.FC<{frame: number; beat: SkillShowcaseBeat; accent: string; opacity: number}> = ({frame, beat, accent, opacity}) => {
  const p = phase(frame, beat);
  const state = beat.visualState ?? '';
  const gradient = state.includes('gradient');
  const brands = state.includes('brand');
  const items = brands ? ['Stripe', 'Linear', 'Vercel', 'Recta'] : ['Swiss', 'RAW', 'Nordic', 'Neo', 'Editorial', 'Utility'];
  return (
    <AbsoluteFill style={{opacity}}>
      <StageTitle beat={beat} accent={accent} progress={Math.min(1, p * 5)} />
      {gradient ? (
        <div style={{position: 'absolute', inset: '240px 40px 70px'}}>
          {Array.from({length: 5}).map((_, index) => {
            const size = 330 + index * 90;
            const x = 500 + Math.sin(frame / 20 + index) * 160;
            const y = 430 + Math.cos(frame / 27 + index) * 240;
            return <div key={index} style={{position: 'absolute', left: x, top: y, width: size, height: size, transform: `translate(-50%, -50%) rotate(${frame * (index % 2 ? 0.4 : -0.3)}deg)`, borderRadius: index % 2 ? '34% 66% 48% 52%' : '58% 42% 64% 36%', background: `linear-gradient(${120 + index * 22}deg, ${index % 2 ? '#7c3aed' : '#4f46e5'}aa, ${index % 3 ? '#ec4899' : '#06b6d4'}44)`, filter: 'blur(1px)', mixBlendMode: 'screen', opacity: 0.32 + index * 0.08, boxShadow: 'inset 0 0 70px rgba(255,255,255,0.12)' }} />;
          })}
          <div style={{position: 'absolute', left: 80, right: 80, bottom: 70, display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8}}>{Array.from({length: 6}).map((_, index) => <div key={index} style={{height: 180, borderLeft: `3px solid ${PALETTE[index]}`, background: `${PALETTE[index]}0c`, transform: `translateY(${interpolate(Math.min(1, p * 3 - index * 0.12), [0, 1], [120, 0], clamp)}px)`}} />)}</div>
        </div>
      ) : (
        <div style={{position: 'absolute', left: 0, right: 0, top: 235, height: 950, perspective: 1200}}>
          {items.map((item, index) => {
            const spread = interpolate(Math.min(1, p * 3), [0, 1], [0, (index - (items.length - 1) / 2) * 86]);
            const active = Math.floor(p * items.length * 1.5) % items.length === index;
            const color = PALETTE[index % PALETTE.length];
            return (
              <div key={item} style={{position: 'absolute', left: 540, top: 470 + Math.abs(index - items.length / 2) * 22, width: 620, height: 730, transformOrigin: '50% 110%', transform: `translate(-50%, -50%) translateX(${spread}px) rotate(${spread * 0.12}deg) translateZ(${active ? 90 : -index * 8}px)`, background: item === 'Vercel' ? '#f4f2eb' : `linear-gradient(160deg, ${color}2a, rgba(9,12,21,0.98) 54%)`, borderTop: `7px solid ${color}`, boxShadow: active ? `0 0 70px ${color}44` : '0 28px 70px rgba(0,0,0,0.55)', padding: 38, color: item === 'Vercel' ? '#111' : '#fff', opacity: 0.5 + (active ? 0.5 : 0)}}>
                <div style={{fontFamily: MONO, fontSize: 12, letterSpacing: 1.4, color}}>DIRECTION / {String(index + 1).padStart(2, '0')}</div>
                <div style={{fontSize: 74, fontWeight: 950, marginTop: 28}}>{item}</div>
                <div style={{width: active ? '82%' : '38%', height: 6, background: color, marginTop: 32}} />
                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 260}}>{Array.from({length: 4}).map((_, tokenIndex) => <div key={tokenIndex} style={{height: 72, borderTop: `2px solid ${color}`, opacity: 0.5 + tokenIndex * 0.12}} />)}</div>
              </div>
            );
          })}
        </div>
      )}
    </AbsoluteFill>
  );
};

const FocusLockShot: React.FC<{frame: number; beat: SkillShowcaseBeat; accent: string; opacity: number}> = ({frame, beat, accent, opacity}) => {
  const p = phase(frame, beat);
  const lock = interpolate(p, [0.05, 0.6], [0, 1], {...clamp, easing: easeOut});
  const x = interpolate(lock, [0, 1], [760, 540]);
  const y = interpolate(lock, [0, 1], [310, 650]);
  return (
    <AbsoluteFill style={{opacity}}>
      <StageTitle beat={beat} accent={accent} progress={Math.min(1, p * 5)} />
      <div style={{position: 'absolute', left: 54, right: 54, top: 250, bottom: 80, overflow: 'hidden', backgroundImage: `linear-gradient(${accent}16 1px, transparent 1px), linear-gradient(90deg, ${accent}16 1px, transparent 1px)`, backgroundSize: `${interpolate(lock, [0, 1], [116, 72])}px ${interpolate(lock, [0, 1], [116, 72])}px`}}>
        <div style={{position: 'absolute', left: 115, right: 115, top: 250, height: 440, borderTop: `6px solid ${accent}`, color: '#fff', paddingTop: 34}}>
          <div style={{fontFamily: MONO, fontSize: 13, color: accent}}>SELECTED / SWISS</div>
          <div style={{fontSize: 86, lineHeight: 0.92, fontWeight: 950, marginTop: 28}}>A clear<br />point of view.</div>
          <div style={{width: `${interpolate(lock, [0, 1], [22, 84])}%`, height: 7, background: accent, marginTop: 32}} />
        </div>
        <div style={{position: 'absolute', left: x, top: y, width: 190, height: 190, transform: `translate(-50%, -50%) rotate(${interpolate(lock, [0, 1], [18, 0])}deg)`, border: `4px solid ${accent}`, boxShadow: `0 0 46px ${accent}44`}}>
          <div style={{position: 'absolute', left: '50%', top: -65, bottom: -65, width: 2, background: `${accent}88`}} />
          <div style={{position: 'absolute', top: '50%', left: -65, right: -65, height: 2, background: `${accent}88`}} />
        </div>
        <div style={{position: 'absolute', left: 0, right: 0, bottom: 28, textAlign: 'center', fontFamily: MONO, fontSize: 15, color: lock > 0.92 ? accent : 'rgba(255,255,255,0.42)', letterSpacing: 2}}>{lock > 0.92 ? 'DIRECTION LOCKED' : 'SEARCHING DIRECTION'}</div>
      </div>
    </AbsoluteFill>
  );
};

const PipelineFlowShot: React.FC<{frame: number; beat: SkillShowcaseBeat; accent: string; secondary: string; opacity: number}> = ({frame, beat, accent, secondary, opacity}) => {
  const p = phase(frame, beat);
  const nodes = [
    ['PROMPT', '默认输入'],
    ['SKILL GATE', '规则与反模式'],
    ['OUTPUT', '有立场的界面'],
  ];
  return (
    <AbsoluteFill style={{opacity}}>
      <StageTitle beat={beat} accent={accent} progress={Math.min(1, p * 5)} />
      <div style={{position: 'absolute', left: 0, right: 0, top: 250, bottom: 50}}>
        <div style={{position: 'absolute', left: '50%', top: 90, bottom: 100, width: 4, transform: 'translateX(-50%)', background: `linear-gradient(180deg, #ff5f7a, ${accent}, ${secondary})`}} />
        <div style={{position: 'absolute', left: '50%', top: interpolate((p * 1.35) % 1, [0, 1], [90, 930]), width: 24, height: 24, transform: 'translate(-50%, -50%) rotate(45deg)', background: '#fff', boxShadow: `0 0 32px ${accent}`}} />
        {nodes.map(([code, label], index) => {
          const enter = Math.min(1, Math.max(0, p * 4 - index * 0.22));
          const left = index % 2 === 0 ? 90 : 570;
          return (
            <div key={code} style={{position: 'absolute', left, top: 90 + index * 360, width: 420, height: 190, borderLeft: `6px solid ${index === 0 ? '#ff5f7a' : index === 1 ? accent : secondary}`, background: 'rgba(10,14,24,0.88)', padding: 28, transform: `translateX(${interpolate(enter, [0, 1], [index % 2 ? 120 : -120, 0])}px)`, opacity: enter}}>
              <div style={{fontFamily: MONO, fontSize: 12, color: index === 0 ? '#ff758e' : index === 1 ? accent : secondary, letterSpacing: 1.4}}>{code}</div>
              <div style={{fontSize: 34, color: '#fff', fontWeight: 950, marginTop: 22}}>{label}</div>
              {index === 1 ? <div style={{position: 'absolute', right: 24, top: 56}}><SemanticIcon icon="shield-check" color={accent} size={42} framed /></div> : null}
            </div>
          );
        })}
        <div style={{position: 'absolute', left: 92, bottom: 5, color: '#ff6d88', fontSize: 24, fontWeight: 950, textDecoration: 'line-through'}}>紫色渐变 · 居中模板</div>
        <div style={{position: 'absolute', right: 86, bottom: 5, color: accent, fontSize: 24, fontWeight: 950}}>Swiss · 清晰立场</div>
      </div>
    </AbsoluteFill>
  );
};

const TokenAssemblyShot: React.FC<{frame: number; beat: SkillShowcaseBeat; accent: string; secondary: string; opacity: number}> = ({frame, beat, accent, secondary, opacity}) => {
  const p = phase(frame, beat);
  const tokens = ['COLOR', 'TYPE', 'SPACE', 'WCAG'];
  return (
    <AbsoluteFill style={{opacity}}>
      <StageTitle beat={beat} accent={accent} progress={Math.min(1, p * 5)} />
      <div style={{position: 'absolute', left: 0, right: 0, top: 245, bottom: 50, display: 'grid', placeItems: 'center'}}>
        <PhoneInterface accent={accent} secondary={secondary} progress={Math.min(1, p * 2.4)} compact theme="designed" />
        {tokens.map((token, index) => {
          const enter = Math.min(1, Math.max(0, p * 4 - index * 0.15));
          const fromX = index % 2 ? 860 : 60;
          const fromY = 170 + index * 230;
          const targetX = index % 2 ? 745 : 335;
          const targetY = 330 + index * 115;
          return (
            <div key={token} style={{position: 'absolute', left: interpolate(enter, [0, 1], [fromX, targetX]), top: interpolate(enter, [0, 1], [fromY, targetY]), width: 190, height: 70, transform: `translate(-50%, -50%) scale(${interpolate(enter, [0, 1], [1.35, 1])})`, display: 'grid', placeItems: 'center', borderTop: `4px solid ${PALETTE[index]}`, background: 'rgba(7,10,18,0.92)', color: '#fff', fontFamily: MONO, fontSize: 14, fontWeight: 900, boxShadow: `0 0 26px ${PALETTE[index]}33`}}>{token}</div>
          );
        })}
        <svg width="1080" height="1000" viewBox="0 0 1080 1000" style={{position: 'absolute', inset: 0, pointerEvents: 'none'}}>
          {tokens.map((_, index) => <path key={index} d={index % 2 ? `M 860 ${170 + index * 230} C 760 ${240 + index * 120}, 810 ${300 + index * 70}, 745 ${330 + index * 115}` : `M 60 ${170 + index * 230} C 240 ${240 + index * 120}, 280 ${300 + index * 70}, 335 ${330 + index * 115}`} fill="none" stroke={PALETTE[index]} strokeWidth="2" strokeDasharray="8 12" strokeDashoffset={-frame * 3} opacity="0.58" />)}
        </svg>
      </div>
    </AbsoluteFill>
  );
};

const SurfaceMorphShot: React.FC<{frame: number; beat: SkillShowcaseBeat; accent: string; opacity: number}> = ({frame, beat, accent, opacity}) => {
  const p = phase(frame, beat);
  const state = beat.visualState ?? '';
  const directionMode = state.includes('directions');
  const names = directionMode ? ['Swiss', 'RAW', 'Nordic', 'Neo'] : ['官网', '工具', '作品集', '后台'];
  const activeIndex = directionMode && p > 0.72
    ? 0
    : Math.min(names.length - 1, Math.floor(p * names.length * 1.35));
  const colors = directionMode ? ['#f05a5a', '#9ea7b2', '#7ec8a5', '#20d9e8'] : PALETTE;
  const activeColor = colors[activeIndex];
  return (
    <AbsoluteFill style={{opacity}}>
      <StageTitle beat={beat} accent={accent} progress={Math.min(1, p * 5)} />
      <div style={{position: 'absolute', left: 76, right: 76, top: 270, bottom: 85}}>
        <div style={{height: 840, background: activeIndex === 2 && directionMode ? '#f1eee6' : 'rgba(9,13,23,0.96)', color: activeIndex === 2 && directionMode ? '#111' : '#fff', borderTop: `8px solid ${activeColor}`, padding: 42, transform: `perspective(900px) rotateY(${Math.sin(frame / 14) * 1.8}deg)`, boxShadow: `0 30px 100px rgba(0,0,0,0.52), 0 0 50px ${activeColor}26`}}>
          <div style={{fontFamily: MONO, fontSize: 13, color: activeColor}}>LIVE SURFACE / 0{activeIndex + 1}</div>
          <div style={{fontSize: 82, lineHeight: 0.92, fontWeight: 950, marginTop: 34}}>{names[activeIndex]}</div>
          <div style={{width: `${36 + activeIndex * 14}%`, height: 7, background: activeColor, marginTop: 34}} />
          <div style={{display: 'grid', gridTemplateColumns: activeIndex % 2 ? '1.3fr 0.7fr' : '0.8fr 1.2fr', gap: 14, marginTop: 150}}>
            {Array.from({length: 4}).map((_, index) => <div key={index} style={{height: 120 + (index % 2) * 54, background: activeIndex === 2 && directionMode ? (index % 2 ? '#dcd8cf' : '#fff') : `${activeColor}${index % 2 ? '12' : '20'}`, borderTop: `3px solid ${activeColor}`, transform: `translateY(${Math.sin(frame / 10 + index) * 8}px)`}} />)}
          </div>
        </div>
        <div style={{display: 'grid', gridTemplateColumns: `repeat(${names.length}, 1fr)`, gap: 8, marginTop: 24}}>
          {names.map((name, index) => <div key={name} style={{height: 62, display: 'grid', placeItems: 'center', borderBottom: `4px solid ${colors[index]}`, color: index === activeIndex ? '#fff' : 'rgba(255,255,255,0.32)', fontWeight: 900, fontSize: 17}}>{name}</div>)}
        </div>
      </div>
    </AbsoluteFill>
  );
};

const SystemConvergenceShot: React.FC<{
  frame: number;
  beat: SkillShowcaseBeat;
  accent: string;
  secondary: string;
  opacity: number;
  productIcons?: ProductIconKey[];
}> = ({frame, beat, accent, secondary, opacity, productIcons}) => {
  const p = phase(frame, beat);
  const install = (beat.visualState ?? '').includes('install');
  const icons = (productIcons?.length ? productIcons : ['impeccable', 'frontend-design', 'ux-pro', 'cloud-design']) as ProductIconKey[];
  const gather = interpolate(p, [0.06, install ? 0.58 : 0.78], [0, 1], {...clamp, easing: easeOut});
  const positions = [[190,250],[890,250],[190,850],[890,850]];
  return (
    <AbsoluteFill style={{opacity}}>
      <StageTitle beat={beat} accent={accent} progress={Math.min(1, p * 5)} />
      <div style={{position: 'absolute', left: 0, right: 0, top: 225, bottom: 55}}>
        <svg width="1080" height="1040" viewBox="0 0 1080 1040" style={{position: 'absolute', inset: 0}}>
          {positions.map(([x,y], index) => <path key={index} d={`M ${x} ${y} Q 540 ${index % 2 ? 240 : 800}, 540 540`} fill="none" stroke={PALETTE[index]} strokeWidth="3" strokeDasharray="10 14" strokeDashoffset={-frame * 4} opacity={0.65} />)}
          {Array.from({length: 12}).map((_, index) => {
            const angle = index / 12 * Math.PI * 2 + frame * 0.008;
            return <line key={index} x1={540 + Math.cos(angle) * 155} y1={540 + Math.sin(angle) * 155} x2={540 + Math.cos(angle) * 245} y2={540 + Math.sin(angle) * 245} stroke={index % 2 ? accent : secondary} strokeWidth={index % 3 ? 2 : 5} opacity={0.55} />;
          })}
        </svg>
        {icons.slice(0, 4).map((icon, index) => {
          const [startX, startY] = positions[index];
          const angle = index / 4 * Math.PI * 2 - Math.PI / 2;
          const targetRadius = install
            ? interpolate(p, [0, 0.72, 1], [260, 220, 44], clamp)
            : 280;
          const targetX = 540 + Math.cos(angle) * targetRadius;
          const targetY = 540 + Math.sin(angle) * targetRadius;
          const absorbed = install ? interpolate(p, [0.78, 1], [1, 0], clamp) : 1;
          return <div key={icon} style={{position: 'absolute', left: interpolate(gather, [0, 1], [startX, targetX]), top: interpolate(gather, [0, 1], [startY, targetY]), transform: `translate(-50%, -50%) scale(${interpolate(gather, [0, 1], [0.72, 1])})`, opacity: absorbed}}><ProductMark icon={icon} accent={PALETTE[index]} size={install ? 72 : 92} /></div>;
        })}
        <div style={{position: 'absolute', left: 540, top: 540, width: install ? 210 : 310, height: install ? 210 : 310, transform: `translate(-50%, -50%) scale(${interpolate(gather, [0, 1], [0.6, 1])})`, borderRadius: '50%', border: `5px solid ${accent}`, background: 'rgba(7,10,18,0.95)', boxShadow: `0 0 80px ${accent}55`, display: 'grid', placeItems: 'center'}}>
          <SemanticIcon icon={install ? 'plug-zap' : 'workflow'} color={accent} size={install ? 74 : 88} framed />
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const CinematicShot: React.FC<{
  frame: number;
  beat: SkillShowcaseBeat;
  accent: string;
  secondary: string;
  productIcons?: ProductIconKey[];
}> = ({frame, beat, accent, secondary, productIcons}) => {
  const opacity = layerOpacity(frame, beat);
  if (opacity <= 0) return null;
  const preset: SkillBeatShotPreset = beat.shotPreset ?? 'kinetic-type';
  const shared = {frame, beat, accent, opacity};
  switch (preset) {
    case 'split-wipe': return <SplitWipeShot {...shared} secondary={secondary} />;
    case 'particle-field': return <ParticleFieldShot {...shared} />;
    case 'orbital-map': return <OrbitalMapShot {...shared} />;
    case 'ui-scan': return <UiScanShot {...shared} secondary={secondary} />;
    case 'material-carousel': return <MaterialCarouselShot {...shared} />;
    case 'focus-lock': return <FocusLockShot {...shared} />;
    case 'pipeline-flow': return <PipelineFlowShot {...shared} secondary={secondary} />;
    case 'token-assembly': return <TokenAssemblyShot {...shared} secondary={secondary} />;
    case 'surface-morph': return <SurfaceMorphShot {...shared} />;
    case 'system-convergence': return <SystemConvergenceShot {...shared} secondary={secondary} productIcons={productIcons} />;
    case 'kinetic-type': return <KineticTypeShot {...shared} secondary={secondary} />;
  }
};

/**
 * Hero Track V2 owns the stable technical composition. This layer borrows a
 * cinematic component only around a state boundary, so the viewer feels a
 * semantic change without losing the product context to repeated hard cuts.
 */
const activeHeroTrackMotionState = (frame: number, track: HeroTrack) => {
  const stateIndex = track.states.findIndex((state) => frame >= Math.max(0, state.startFrame - (state.startFrame === 0 ? 0 : 18)) && frame < state.startFrame + (state.startFrame === 0 ? 50 : 16));
  const state = stateIndex >= 0 ? track.states[stateIndex] : undefined;
  return state?.cinematicPreset ? {state, stateIndex} : null;
};

const HeroTrackMotionTransition: React.FC<{
  frame: number;
  track: HeroTrack;
  accent: string;
  secondary: string;
  productIcons?: ProductIconKey[];
}> = ({frame, track, accent, secondary, productIcons}) => {
  const active = activeHeroTrackMotionState(frame, track);
  if (!active) return null;
  const {state, stateIndex} = active;
  const isOpening = stateIndex === 0;
  const beat: SkillShowcaseBeat = {
    startFrame: isOpening ? 0 : Math.max(0, state.startFrame - 18),
    endFrame: isOpening ? Math.min(state.endFrame, 50) : Math.min(state.endFrame, state.startFrame + 16),
    keyword: state.label,
    detail: state.detail,
    evidence: state.evidence,
    icon: 'focus',
    action: state.cinematicPreset === 'split-wipe' || state.cinematicPreset === 'surface-morph' ? 'compare' : state.cinematicPreset === 'particle-field' || state.cinematicPreset === 'orbital-map' ? 'counter' : state.cinematicPreset === 'system-convergence' ? 'burst' : state.cinematicPreset === 'material-carousel' || state.cinematicPreset === 'token-assembly' ? 'stack' : state.cinematicPreset === 'ui-scan' || state.cinematicPreset === 'pipeline-flow' ? 'trace' : 'focus',
    shotPreset: state.cinematicPreset,
  };
  return <CinematicShot frame={frame} beat={beat} accent={accent} secondary={secondary} productIcons={productIcons} />;
};

const BeatRelay: React.FC<{beat: SkillShowcaseBeat; accent: string; progress: number}> = ({beat, accent, progress}) => (
  <div style={{position: 'absolute', left: 0, right: 0, top: 0, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 11, opacity: progress}}>
    <div style={{width: 42, height: 1, background: `linear-gradient(90deg, transparent, ${accent})`}} />
    <SemanticIcon icon={beat.icon} color={accent} size={18} />
    <div style={{width: 42, height: 1, background: `linear-gradient(90deg, ${accent}, transparent)`}} />
  </div>
);

const SemanticBeatAnimation: React.FC<{
  frame: number;
  beat: SkillShowcaseBeat;
  accent: string;
  secondary: string;
}> = ({frame, beat, accent, secondary}) => {
  const opacity = layerOpacity(frame, beat);
  if (opacity <= 0) return null;
  const p = phase(frame, beat);
  const enter = interpolate(p, [0, 0.28], [0, 1], {...clamp, easing: easeOut});
  const evidence = beat.evidence ?? (beat.detail ? [beat.detail] : []);
  const number = beat.value ?? beat.keyword.match(/[\d]+(?:[Kk]|[·/]\d+)*/)?.[0] ?? beat.keyword;
  const keywordSize = beat.keyword.length > 9 ? 34 : 42;

  const content = (() => {
    if (beat.action === 'counter') {
      const numberSize = number.length > 8 ? 58 : number.length > 4 ? 72 : 94;
      return (
        <div style={{position: 'absolute', left: 86, right: 86, top: 56, height: 184, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24, transform: `translateY(${lift(enter, 24)}px)`}}>
          <SemanticIcon icon={beat.icon} color={accent} size={34} />
          <div style={{fontSize: numberSize, lineHeight: 0.9, color: accent, fontWeight: 950, letterSpacing: -2}}>{number}</div>
          <div style={{borderLeft: '1px solid rgba(255,255,255,0.16)', paddingLeft: 22}}>
            <div style={{fontSize: 28, color: '#fff', fontWeight: 950}}>{beat.keyword.replace(number, '').trim() || '语义证据'}</div>
            <div style={{fontFamily: MONO, color: 'rgba(255,255,255,0.4)', fontSize: 11, letterSpacing: 1.1, marginTop: 8}}>FRAME-LOCKED EVIDENCE</div>
          </div>
        </div>
      );
    }

    if (beat.action === 'stack') {
      const rows = evidence.length ? evidence : ['目标', '范围', '验收'];
      return (
        <div style={{position: 'absolute', left: 64, right: 64, top: 56, height: 190, display: 'grid', gridTemplateColumns: '0.86fr 1.14fr', alignItems: 'center', gap: 34}}>
          <div style={{display: 'flex', alignItems: 'center', gap: 16, transform: `translateX(${interpolate(enter, [0, 1], [-46, 0])}px)`}}>
            <SemanticIcon icon={beat.icon} color={accent} size={36} framed />
            <div style={{fontSize: keywordSize, color: '#fff', fontWeight: 950, lineHeight: 1.05}}>{beat.keyword}</div>
          </div>
          <div style={{position: 'relative', height: 148}}>
            {rows.slice(0, 3).map((row, index) => (
              <div key={row} style={{position: 'absolute', left: index * 16, right: (2 - index) * 16, top: index * 42, height: 52, display: 'flex', alignItems: 'center', gap: 12, color: index === 2 ? '#fff' : 'rgba(255,255,255,0.52)', fontSize: 15, fontWeight: 850, transform: `translateX(${interpolate(enter, [0, 1], [54 + index * 18, 0])}px)`}}><span style={{fontFamily: MONO, color: index === 2 ? accent : 'rgba(255,255,255,.34)'}}>{String(index + 1).padStart(2, '0')}</span><span style={{height: 1, width: index === 2 ? 42 : 24, background: index === 2 ? accent : 'rgba(255,255,255,.22)'}} /><span>{row}</span></div>
            ))}
          </div>
        </div>
      );
    }

    if (beat.action === 'focus' || beat.action === 'spotlight') {
      return (
        <div style={{position: 'absolute', left: 110, right: 110, top: 58, height: 178, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 30}}>
          <div style={{width: 8, height: interpolate(enter, [0, 1], [20, 120]), background: `linear-gradient(${accent}, transparent)`, transform: `rotate(${interpolate(enter, [0, 1], [-22, -8])}deg)`}} />
          <div style={{minWidth: 0}}>
            <div style={{fontFamily: MONO, fontSize: 11, letterSpacing: 1.4, color: accent, fontWeight: 900}}>VOICE HIT / KEY CLAIM</div>
            <div style={{fontSize: keywordSize + 11, lineHeight: 0.94, color: '#fff', fontWeight: 950, marginTop: 9, transform: `translateX(${interpolate(enter, [0, 1], [-38, 0])}px)`}}>{beat.keyword}</div>
            <div style={{fontSize: 15, color: 'rgba(255,255,255,0.46)', marginTop: 9, fontWeight: 750}}>{beat.detail ?? evidence.join(' · ')}</div>
          </div>
        </div>
      );
    }

    if (beat.action === 'compare') {
      return (
        <div style={{position: 'absolute', left: 86, right: 86, top: 50, height: 196}}>
          <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, transform: `translateY(${lift(enter, 18)}px)`}}>
            <SemanticIcon icon={beat.icon} color={accent} size={30} framed />
            <div style={{fontSize: keywordSize, color: '#fff', fontWeight: 950}}>{beat.keyword}</div>
          </div>
          <div style={{display: 'grid', gridTemplateColumns: '1fr 54px 1fr', alignItems: 'center', marginTop: 25}}>
            <div style={{height: 58, display: 'grid', placeItems: 'center', borderLeft: '5px solid #ff5f7a', background: 'linear-gradient(90deg, rgba(255,95,122,0.22), rgba(255,95,122,0.07))', color: '#ffc0cb', fontSize: 16, fontWeight: 900}}>{evidence[0] ?? '默认 AI'}</div>
            <div style={{textAlign: 'center', color: 'rgba(255,255,255,0.35)', fontFamily: MONO, fontSize: 12, fontWeight: 950}}>VS</div>
            <div style={{height: 58, display: 'grid', placeItems: 'center', borderRight: `5px solid ${accent}`, background: `linear-gradient(90deg, ${accent}0d, ${accent}25)`, color: '#fff', fontSize: 16, fontWeight: 900}}>{evidence[1] ?? '装上 Skill'}</div>
          </div>
        </div>
      );
    }

    if (beat.action === 'burst') {
      return (
        <div style={{position: 'absolute', left: 110, right: 110, top: 58, height: 178, display: 'grid', placeItems: 'center'}}>
          {Array.from({length: 10}).map((_, index) => (
            <div key={index} style={{position: 'absolute', left: '50%', top: '50%', width: interpolate(enter, [0, 1], [0, 170]), height: index % 3 === 0 ? 3 : 1, transformOrigin: '0 50%', transform: `rotate(${index * 36}deg) translateX(92px)`, background: `linear-gradient(90deg, ${index % 2 ? accent : secondary}, transparent)`}} />
          ))}
          <div style={{minWidth: 420, height: 94, padding: '0 30px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 18, transform: `scale(${interpolate(enter, [0, 1], [0.78, 1])})`}}>
            <SemanticIcon icon={beat.icon} color="#fff" size={34} />
            <div style={{fontSize: keywordSize + 12, color: '#fff', fontWeight: 950, textShadow: `0 0 28px ${accent}66`}}>{beat.keyword}</div>
          </div>
        </div>
      );
    }

    if (beat.action === 'stamp') {
      return (
        <div style={{position: 'absolute', left: 150, right: 150, top: 72, height: 142, transform: `rotate(${interpolate(enter, [0, 1], [-5, -1.2])}deg) scale(${interpolate(enter, [0, 1], [1.18, 1])})`, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 22}}>
          <div style={{position: 'absolute', left: 0, right: 0, top: 22, height: 4, background: accent, transformOrigin: 'left', transform: `scaleX(${enter})`}} />
          <SemanticIcon icon={beat.icon} color={accent} size={34} />
          <div><div style={{fontFamily: MONO, color: accent, fontSize: 11, letterSpacing: 1.2, fontWeight: 900}}>VOICE HIT / LOCKED</div><div style={{fontSize: keywordSize + 10, color: '#fff', fontWeight: 950, marginTop: 7}}>{beat.keyword}</div></div>
        </div>
      );
    }

    return (
      <div style={{position: 'absolute', left: 92, right: 92, top: 74, height: 130, display: 'flex', alignItems: 'center', gap: 20}}>
        <SemanticIcon icon={beat.icon} color={accent} size={34} />
        <div style={{fontSize: keywordSize + 5, color: '#fff', fontWeight: 950}}>{beat.keyword}</div>
        <div style={{height: 5, flex: 1, background: 'rgba(255,255,255,0.08)', position: 'relative'}}><div style={{height: '100%', width: `${enter * 100}%`, background: `linear-gradient(90deg, ${accent}, #fff)`}} /></div>
      </div>
    );
  })();

  return (
    <AbsoluteFill style={{opacity}}>
      <BeatRelay beat={beat} accent={accent} progress={enter} />
      {content}
    </AbsoluteFill>
  );
};

export const PortraitCinematicSkillShowcase: React.FC<SkillShowcaseProps> = ({
  variant,
  title,
  subtitle,
  index,
  accent = '#20d9e8',
  secondaryAccent = '#9a7cff',
  productIcon,
  productIcons,
  brandName,
  progressIndex = 0,
  progressTotal = 6,
  heroStyle = 'cinematic',
  beats = [],
  workbench,
  heroTrack,
}) => {
  const frame = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const scale = Math.min(width / 1080, height / 1920);
  const resolvedProduct = productIcon ?? PRODUCT_FOR_VARIANT[variant];
  return (
    <AbsoluteFill style={{background: STAGE_BACKGROUND, overflow: 'hidden', fontFamily: FONT}}>
      <div style={{position: 'absolute', width: 1080, height: 1920, left: '50%', top: '50%', transform: `translate(-50%, -50%) scale(${scale})`}}>
        <CinematicBackdrop frame={frame} accent={accent} secondary={secondaryAccent} />
        <ChapterHeader frame={frame} title={title} subtitle={subtitle} index={index} accent={accent} product={resolvedProduct} progressIndex={progressIndex} progressTotal={progressTotal} />
        <div style={{position: 'absolute', left: 0, right: 0, top: HERO_STAGE_TOP, height: HERO_STAGE_HEIGHT * HERO_STAGE_SCALE, overflow: 'hidden'}}>
          <div style={{position: 'absolute', left: '50%', top: 0, width: 1080, height: HERO_STAGE_HEIGHT, transform: `translateX(-50%) scale(${HERO_STAGE_SCALE})`, transformOrigin: '50% 0'}}>
            {heroStyle === 'hero-track-v2' && heroTrack
              ? <HeroTrackV2 frame={frame} track={heroTrack} accent={accent} secondary={secondaryAccent} brandName={brandName} />
              : heroStyle === 'technical-workbench-v2' && workbench
              ? <TechnicalEvidenceWorkbench frame={frame} session={workbench} beats={beats} accent={accent} secondary={secondaryAccent} />
              : beats.map((beat) => heroStyle === 'tech-explainer'
                ? <TechExplainerHero key={`${beat.startFrame}-${beat.keyword}`} frame={frame} beat={beat} accent={accent} secondary={secondaryAccent} />
                : <CinematicShot key={`${beat.startFrame}-${beat.keyword}`} frame={frame} beat={beat} accent={accent} secondary={secondaryAccent} productIcons={productIcons} />)}
          </div>
        </div>
        <div style={{position: 'absolute', left: 0, right: 0, top: SEMANTIC_STAGE_TOP, height: SEMANTIC_STAGE_HEIGHT, overflow: 'hidden'}}>
          {beats.map((beat) => <SemanticBeatAnimation key={`${beat.startFrame}-${beat.keyword}`} frame={frame} beat={beat} accent={accent} secondary={secondaryAccent} />)}
        </div>
        <div style={{position: 'absolute', left: 54, right: 54, top: 1552, height: 1, background: `linear-gradient(90deg, transparent, ${accent}88, transparent)`}} />
        <div style={{position: 'absolute', left: 54, top: 1572, fontFamily: MONO, fontSize: 10, letterSpacing: 1.6, color: 'rgba(255,255,255,0.24)'}}>{brandName ?? 'DESIGN SKILL'} / {heroStyle === 'hero-track-v2' ? 'HERO TRACK V2' : heroStyle === 'technical-workbench-v2' ? 'EVIDENCE WORKBENCH V2' : heroStyle === 'tech-explainer' ? 'TECH EXPLAINER' : 'PORTRAIT CINEMATIC V4'}</div>
      </div>
    </AbsoluteFill>
  );
};
