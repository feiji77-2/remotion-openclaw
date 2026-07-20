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
import {productIconPath, type ProductIconKey} from './productIcons';
import type {SkillIconKey, SkillShowcaseBeat, SkillShowcaseProps, SkillShowcaseVariant} from './types';

const FONT = '"PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", Inter, system-ui, sans-serif';
const MONO = '"SFMono-Regular", "JetBrains Mono", Menlo, Consolas, monospace';
const PALETTE = ['#45e28d', '#5f7dff', '#ffc44d', '#ff5f91', '#20d9e8', '#9a7cff'];
const clamp = {
  extrapolateLeft: 'clamp' as const,
  extrapolateRight: 'clamp' as const,
};
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

const enter = (frame: number, fps: number, delaySeconds = 0, durationSeconds = 0.52) => interpolate(
  frame,
  [delaySeconds * fps, (delaySeconds + durationSeconds) * fps],
  [0, 1],
  {...clamp, easing: easeOut},
);

const enterStyle = (progress: number, x = 0, y = 24): React.CSSProperties => ({
  opacity: progress,
  transform: `translate3d(${interpolate(progress, [0, 1], [x, 0])}px, ${interpolate(progress, [0, 1], [y, 0])}px, 0)`,
});

const activeBeatAt = (frame: number, beats: SkillShowcaseBeat[]) => (
  beats.find((beat) => frame >= beat.startFrame && frame < beat.endFrame) ?? beats[beats.length - 1]
);

const beatProgress = (frame: number, beat?: SkillShowcaseBeat) => {
  if (!beat) return 0;
  const duration = Math.max(1, beat.endFrame - beat.startFrame);
  const enterFrames = Math.min(16, Math.max(7, Math.round(duration * 0.18)));
  const exitFrames = Math.min(9, Math.max(5, Math.round(duration * 0.1)));
  const reveal = interpolate(frame, [beat.startFrame, beat.startFrame + enterFrames], [0, 1], {
    ...clamp,
    easing: easeOut,
  });
  const hide = interpolate(frame, [beat.endFrame - exitFrames, beat.endFrame], [1, 0], {
    ...clamp,
    easing: Easing.in(Easing.cubic),
  });
  return reveal * hide;
};

const ProductBadge: React.FC<{
  icon: ProductIconKey;
  accent: string;
  size?: number;
}> = ({icon, accent, size = 58}) => (
  <div style={{
    width: size,
    height: size,
    borderRadius: 14,
    overflow: 'hidden',
    background: 'rgba(255,255,255,0.07)',
    border: `1px solid ${accent}66`,
    boxShadow: `0 0 30px ${accent}2f`,
    flex: `0 0 ${size}px`,
  }}>
    <Img src={staticFile(productIconPath(icon))} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
  </div>
);

const Backdrop: React.FC<{
  accent: string;
  secondary: string;
  frame: number;
  fps: number;
}> = ({accent, secondary, frame, fps}) => {
  const drift = interpolate(frame, [0, fps * 12], [0, 130], clamp);
  const scanX = interpolate(frame % (fps * 6), [0, fps * 6], [-260, 2180]);
  const pulse = 0.5 + Math.sin(frame / fps * Math.PI * 0.7) * 0.5;
  return (
    <AbsoluteFill style={{background: '#070a12', overflow: 'hidden'}}>
      <AbsoluteFill style={{
        opacity: 0.62,
        backgroundImage: [
          `linear-gradient(118deg, transparent 0 44%, ${accent}12 44% 45%, transparent 45% 100%)`,
          `linear-gradient(22deg, transparent 0 70%, ${secondary}10 70% 71%, transparent 71% 100%)`,
          'linear-gradient(rgba(255,255,255,0.026) 1px, transparent 1px)',
          'linear-gradient(90deg, rgba(255,255,255,0.026) 1px, transparent 1px)',
        ].join(', '),
        backgroundSize: 'auto, auto, 72px 72px, 72px 72px',
        backgroundPosition: `${drift}px 0, ${-drift * 0.55}px 0, 0 0, 0 0`,
      }} />
      <div style={{
        position: 'absolute',
        left: scanX,
        top: 0,
        bottom: 0,
        width: 210,
        transform: 'skewX(-12deg)',
        background: `linear-gradient(90deg, transparent, ${accent}12, transparent)`,
        opacity: 0.5,
      }} />
      <div style={{
        position: 'absolute',
        right: -280,
        top: -320,
        width: 860,
        height: 860,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${secondary}${pulse > 0.5 ? '1f' : '15'} 0%, transparent 68%)`,
      }} />
      <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(7,10,18,0.03), rgba(7,10,18,0.3) 60%, rgba(7,10,18,0.96))'}} />
      <div style={{position: 'absolute', left: 42, top: 42, width: 48, height: 48, borderLeft: `2px solid ${accent}77`, borderTop: `2px solid ${accent}77`}} />
      <div style={{position: 'absolute', right: 42, bottom: 42, width: 48, height: 48, borderRight: `2px solid ${secondary}77`, borderBottom: `2px solid ${secondary}77`}} />
    </AbsoluteFill>
  );
};

const Header: React.FC<{
  frame: number;
  fps: number;
  index?: string;
  title: string;
  subtitle?: string;
  accent: string;
  productIcon: ProductIconKey;
  progressIndex: number;
  progressTotal: number;
}> = ({frame, fps, index, title, subtitle, accent, productIcon, progressIndex, progressTotal}) => {
  const progress = enter(frame, fps, 0.03, 0.45);
  return (
    <>
      <div style={{position: 'absolute', top: 30, left: 76, right: 76, display: 'grid', gridTemplateColumns: `repeat(${progressTotal}, 1fr)`, gap: 8}}>
        {Array.from({length: progressTotal}).map((_, itemIndex) => (
          <div key={itemIndex} style={{
            height: itemIndex === progressIndex ? 6 : 3,
            background: PALETTE[itemIndex % PALETTE.length],
            opacity: itemIndex <= progressIndex ? 1 : 0.2,
          }} />
        ))}
      </div>
      <div style={{position: 'absolute', left: 76, right: 76, top: 62, height: 92, display: 'flex', alignItems: 'center', gap: 16, ...enterStyle(progress, -24, 0)}}>
        {index ? (
          <div style={{width: 58, height: 58, borderRadius: '50%', border: `2px solid ${accent}`, display: 'grid', placeItems: 'center', color: accent, fontSize: 20, fontWeight: 950, background: `${accent}12`}}>{index}</div>
        ) : null}
        <ProductBadge icon={productIcon} accent={accent} size={58} />
        <div>
          <div style={{fontSize: 34, lineHeight: 1, color: '#f7f9ff', fontWeight: 950}}>{title}</div>
          {subtitle ? <div style={{fontSize: 16, marginTop: 8, color: 'rgba(235,240,255,0.52)', fontWeight: 750}}>{subtitle}</div> : null}
        </div>
        <div style={{marginLeft: 'auto', fontFamily: MONO, fontSize: 13, letterSpacing: 2, color: 'rgba(255,255,255,0.34)'}}>SEMANTIC MOTION / 16:9</div>
      </div>
    </>
  );
};

const Panel: React.FC<React.PropsWithChildren<{
  accent?: string;
  style?: React.CSSProperties;
}>> = ({accent = '#ffffff', style, children}) => (
  <div style={{
    border: `1px solid ${accent}3b`,
    background: 'rgba(10,14,24,0.82)',
    boxShadow: '0 24px 70px rgba(0,0,0,0.28)',
    borderRadius: 10,
    overflow: 'hidden',
    ...style,
  }}>
    {children}
  </div>
);

const ActionGlyph: React.FC<{
  beat: SkillShowcaseBeat;
  accent: string;
  progress: number;
}> = ({beat, accent, progress}) => {
  const evidence = beat.evidence ?? (beat.detail ? [beat.detail] : []);
  if (beat.action === 'compare') {
    return (
      <div style={{display: 'grid', gridTemplateColumns: '1fr 34px 1fr', alignItems: 'center', width: '100%'}}>
        <div style={{height: 52, display: 'grid', placeItems: 'center', background: 'rgba(255,95,122,0.13)', borderLeft: '4px solid #ff5f7a', color: '#ffc4ce', fontSize: 16, fontWeight: 850}}>{evidence[0] ?? '默认'}</div>
        <div style={{textAlign: 'center', fontSize: 12, color: 'rgba(255,255,255,0.38)', fontWeight: 950}}>VS</div>
        <div style={{height: 52, display: 'grid', placeItems: 'center', background: `${accent}14`, borderRight: `4px solid ${accent}`, color: '#fff', fontSize: 16, fontWeight: 850}}>{evidence[1] ?? '装上'}</div>
      </div>
    );
  }
  if (beat.action === 'counter') {
    return <div style={{fontSize: 78, lineHeight: 0.9, color: accent, fontWeight: 950, transform: `translateY(${interpolate(progress, [0, 1], [22, 0])}px)`}}>{beat.value ?? '100%'}</div>;
  }
  if (beat.action === 'stack') {
    const rows = evidence.length ? evidence : ['规则', '证据', '结论'];
    return (
      <div style={{position: 'relative', width: '100%', height: 92}}>
        {rows.slice(0, 3).map((row, index) => (
          <div key={row} style={{position: 'absolute', left: index * 14, right: (rows.length - index - 1) * 14, top: index * 22, height: 42, display: 'flex', alignItems: 'center', padding: '0 14px', background: index === rows.length - 1 ? 'rgba(11,16,28,0.98)' : 'rgba(18,24,38,0.88)', border: `1px solid ${accent}${index === rows.length - 1 ? 'a8' : '52'}`, color: index === rows.length - 1 ? '#fff' : 'rgba(255,255,255,0.62)', fontSize: 15, fontWeight: 850, transform: `translateX(${interpolate(progress, [0, 1], [28 + index * 12, 0])}px)`}}>{String(index + 1).padStart(2, '0')} / {row}</div>
        ))}
      </div>
    );
  }
  if (beat.action === 'trace') {
    return (
      <div style={{width: '100%'}}>
        <div style={{height: 6, background: 'rgba(255,255,255,0.08)', position: 'relative'}}>
          <div style={{height: '100%', width: `${progress * 100}%`, background: `linear-gradient(90deg, ${accent}, #fff)`}} />
          <div style={{position: 'absolute', left: `${progress * 100}%`, top: -7, width: 2, height: 20, background: '#fff'}} />
        </div>
      </div>
    );
  }
  if (beat.action === 'focus' || beat.action === 'spotlight') {
    return (
      <div style={{width: 96, height: 96, position: 'relative', display: 'grid', placeItems: 'center', transform: `scale(${interpolate(progress, [0, 1], [1.28, 1])})`}}>
        <div style={{position: 'absolute', inset: 0, border: `2px solid ${accent}`}} />
        <div style={{position: 'absolute', left: '50%', top: -12, bottom: -12, width: 1, background: `${accent}77`}} />
        <div style={{position: 'absolute', top: '50%', left: -12, right: -12, height: 1, background: `${accent}77`}} />
        <SemanticIcon icon={beat.icon} color={accent} size={38} />
      </div>
    );
  }
  if (beat.action === 'burst') {
    return (
      <div style={{position: 'relative', width: 180, height: 90, display: 'grid', placeItems: 'center'}}>
        {Array.from({length: 8}).map((_, index) => (
          <div key={index} style={{position: 'absolute', left: '50%', top: '50%', width: 76 * progress, height: index % 2 ? 1 : 2, transformOrigin: '0 50%', transform: `rotate(${index * 45}deg) translateX(30px)`, background: `linear-gradient(90deg, ${accent}, transparent)`}} />
        ))}
        <SemanticIcon icon={beat.icon} color={accent} size={40} framed />
      </div>
    );
  }
  return (
    <div style={{padding: '14px 20px', border: `3px solid ${accent}`, transform: `rotate(${interpolate(progress, [0, 1], [-6, -1])}deg)`, color: '#fff', fontSize: 17, fontWeight: 950}}>VOICE HIT / LOCKED</div>
  );
};

const BeatInspector: React.FC<{
  frame: number;
  accent: string;
  beat?: SkillShowcaseBeat;
}> = ({frame, accent, beat}) => {
  const progress = beatProgress(frame, beat);
  if (!beat) return null;
  return (
    <Panel accent={accent} style={{height: '100%', padding: 26, display: 'flex', flexDirection: 'column', position: 'relative', opacity: progress, transform: `translateX(${interpolate(progress, [0, 1], [34, 0])}px)`}}>
      <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
        <div style={{fontFamily: MONO, fontSize: 12, letterSpacing: 1.5, color: accent, fontWeight: 900}}>{beat.action.toUpperCase()} / LIVE</div>
        <div style={{fontFamily: MONO, fontSize: 12, color: 'rgba(255,255,255,0.34)'}}>{String(beat.startFrame).padStart(4, '0')}—{String(beat.endFrame).padStart(4, '0')}</div>
      </div>
      <div style={{display: 'flex', alignItems: 'center', gap: 18, marginTop: 26}}>
        <SemanticIcon icon={beat.icon} color={accent} size={28} framed />
        <div style={{fontSize: beat.keyword.length > 9 ? 38 : 48, lineHeight: 1.02, color: '#fff', fontWeight: 950}}>{beat.keyword}</div>
      </div>
      {beat.detail ? <div style={{marginTop: 18, fontSize: 17, lineHeight: 1.55, color: 'rgba(255,255,255,0.58)', fontWeight: 700}}>{beat.detail}</div> : null}
      <div style={{flex: 1, display: 'grid', placeItems: 'center', minHeight: 145}}>
        <ActionGlyph beat={beat} accent={accent} progress={progress} />
      </div>
      {beat.evidence?.length ? (
        <div style={{display: 'flex', flexWrap: 'wrap', gap: 8}}>
          {beat.evidence.map((item) => <div key={item} style={{padding: '8px 11px', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.64)', fontSize: 13, fontWeight: 800}}>{item}</div>)}
        </div>
      ) : null}
      <div style={{height: 4, marginTop: 20, background: 'rgba(255,255,255,0.07)'}}>
        <div style={{height: '100%', width: `${progress * 100}%`, background: `linear-gradient(90deg, ${accent}, transparent)`}} />
      </div>
    </Panel>
  );
};

const LandscapeSemanticOverlay: React.FC<{
  frame: number;
  accent: string;
  beats: SkillShowcaseBeat[];
  activeBeat?: SkillShowcaseBeat;
}> = ({frame, accent, beats, activeBeat}) => {
  if (!activeBeat || !['compare', 'stamp'].includes(activeBeat.action)) return null;
  const progress = beatProgress(frame, activeBeat);
  const activeIndex = Math.max(0, beats.indexOf(activeBeat));
  const evidence = activeBeat.evidence ?? [];
  const slideY = interpolate(progress, [0, 1], [34, 0]);
  const scale = interpolate(progress, [0, 1], [0.94, 1]);
  const keywordSize = activeBeat.keyword.length > 9 ? 42 : 50;

  return (
    <AbsoluteFill style={{
      zIndex: 24,
      pointerEvents: 'none',
      opacity: progress,
    }}>
      <AbsoluteFill style={{background: 'rgba(4,7,13,0.28)', opacity: progress}} />
      <div style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: 590,
        height: 240,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{
          width: 860,
          minHeight: 216,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          transform: `translateY(${slideY}px) scale(${scale})`,
          filter: `drop-shadow(0 20px 54px rgba(0,0,0,0.56))`,
        }}>
        <div style={{height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9}}>
          {[activeIndex - 1, activeIndex, activeIndex + 1].map((index, slot) => {
            const item = beats[index];
            if (!item) return <div key={`empty-${index}`} style={{width: 26}} />;
            const current = slot === 1;
            return (
              <React.Fragment key={`${item.startFrame}-${item.icon}`}>
                {slot > 0 ? <div style={{width: current ? 44 : 22, height: 1, background: current ? accent : 'rgba(255,255,255,0.2)'}} /> : null}
                <div style={{opacity: current ? 1 : 0.34, transform: `scale(${current ? 1 : 0.72})`}}>
                  <SemanticIcon icon={item.icon} color={accent} size={current ? 20 : 14} framed={current} />
                </div>
              </React.Fragment>
            );
          })}
        </div>

        {activeBeat.action === 'compare' ? (
          <div style={{width: '100%', marginTop: 14}}>
            <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14}}>
              <SemanticIcon icon={activeBeat.icon} color={accent} size={30} framed />
              <div style={{fontSize: keywordSize, lineHeight: 1, color: '#fff', fontWeight: 950}}>{activeBeat.keyword}</div>
            </div>
            <div style={{display: 'grid', gridTemplateColumns: '1fr 56px 1fr', alignItems: 'center', marginTop: 22}}>
              <div style={{height: 58, display: 'grid', placeItems: 'center', borderLeft: '5px solid #ff5f7a', background: 'linear-gradient(90deg, rgba(255,95,122,0.22), rgba(255,95,122,0.08))', color: '#ffc3ce', fontSize: 19, fontWeight: 900}}>{evidence[0] ?? '默认输出'}</div>
              <div style={{textAlign: 'center', color: 'rgba(255,255,255,0.42)', fontSize: 14, fontWeight: 950}}>VS</div>
              <div style={{height: 58, display: 'grid', placeItems: 'center', borderRight: `5px solid ${accent}`, background: `linear-gradient(90deg, ${accent}0d, ${accent}26)`, color: '#fff', fontSize: 19, fontWeight: 900}}>{evidence[1] ?? '装上 Skill'}</div>
            </div>
          </div>
        ) : (
          <div style={{
            width: 740,
            minHeight: 118,
            marginTop: 14,
            padding: '18px 28px',
            border: `3px solid ${accent}`,
            background: 'rgba(7,10,18,0.92)',
            boxShadow: `0 0 36px ${accent}33, inset 0 0 28px ${accent}0d`,
            transform: `rotate(${interpolate(progress, [0, 1], [-4.5, -1.2])}deg)`,
            display: 'flex',
            alignItems: 'center',
            gap: 20,
          }}>
            <SemanticIcon icon={activeBeat.icon} color={accent} size={36} />
            <div>
              <div style={{fontFamily: MONO, fontSize: 11, color: accent, letterSpacing: 1.2, fontWeight: 950}}>VOICE HIT / LOCKED</div>
              <div style={{fontSize: keywordSize, lineHeight: 1, color: '#fff', fontWeight: 950, marginTop: 7}}>{activeBeat.keyword}</div>
            </div>
          </div>
        )}
        </div>
      </div>
    </AbsoluteFill>
  );
};

const DefaultAiMock: React.FC<{accent: string; active: boolean}> = ({accent, active}) => (
  <div style={{height: '100%', borderRadius: 8, padding: 24, background: 'linear-gradient(145deg, rgba(124,58,237,0.68), rgba(37,99,235,0.5))', border: `1px solid ${active ? accent : 'rgba(255,255,255,0.18)'}`, boxShadow: active ? `0 0 36px ${accent}35` : 'none'}}>
    <div style={{height: 22, width: '58%', margin: '0 auto', borderRadius: 18, background: 'rgba(255,255,255,0.86)'}} />
    <div style={{height: 96, marginTop: 18, borderRadius: 22, background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.34)'}} />
    {[0, 1, 2].map((index) => <div key={index} style={{height: 50, marginTop: 11, borderRadius: 18, background: 'rgba(255,255,255,0.13)'}} />)}
    <div style={{height: 42, marginTop: 16, borderRadius: 24, background: '#f3f0ff', color: '#6d28d9', display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 900}}>Get Started</div>
  </div>
);

const SwissMock: React.FC<{accent: string; active: boolean}> = ({accent, active}) => (
  <div style={{height: '100%', borderRadius: 8, padding: 24, background: '#f2f0e8', color: '#171717', border: `1px solid ${active ? accent : 'rgba(255,255,255,0.2)'}`, boxShadow: active ? `0 0 36px ${accent}35` : 'none'}}>
    <div style={{fontSize: 11, letterSpacing: 1.5, fontWeight: 950}}>SYSTEM / 01</div>
    <div style={{fontSize: 34, lineHeight: 0.98, fontWeight: 950, marginTop: 30}}>A clear point<br />of view.</div>
    <div style={{width: 116, height: 5, background: accent, marginTop: 20}} />
    <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9, marginTop: 38}}>
      {['TYPE', 'GRID', 'SPACE', 'A11Y'].map((label) => <div key={label} style={{height: 54, borderTop: '2px solid #171717', paddingTop: 9, fontSize: 11, fontWeight: 900}}>{label}</div>)}
    </div>
  </div>
);

const IntroContent: React.FC<{
  frame: number;
  fps: number;
  accent: string;
  secondary: string;
  headline: string;
  body?: string;
  labels: string[];
  beat?: SkillShowcaseBeat;
}> = ({frame, fps, accent, secondary, headline, body, labels, beat}) => {
  const p1 = enter(frame, fps, 0.08, 0.56);
  const p2 = enter(frame, fps, 0.26, 0.6);
  const state = beat?.visualState ?? '';
  return (
    <Panel accent={accent} style={{height: '100%', padding: 34, display: 'grid', gridTemplateColumns: '0.92fr 1.08fr', gap: 34}}>
      <div style={{display: 'flex', flexDirection: 'column', justifyContent: 'center', ...enterStyle(p1, -38, 0)}}>
        <div style={{fontFamily: MONO, color: accent, fontSize: 14, letterSpacing: 2, fontWeight: 900}}>DESIGN SKILL / POSITION</div>
        <div style={{fontSize: headline.length > 16 ? 66 : 78, lineHeight: 0.98, marginTop: 22, color: '#fff', fontWeight: 950}}>{headline}</div>
        <div style={{height: 7, width: state === 'install' ? 330 : 190, marginTop: 26, background: `linear-gradient(90deg, ${accent}, ${secondary}, transparent)`}} />
        <div style={{fontSize: 22, lineHeight: 1.55, marginTop: 28, color: 'rgba(255,255,255,0.62)', fontWeight: 750, maxWidth: 590}}>{body ?? '默认平均审美，没有稳定的设计立场。'}</div>
        <div style={{display: 'flex', flexWrap: 'wrap', gap: 9, marginTop: 34}}>
          {labels.slice(0, 4).map((label, index) => <div key={label} style={{padding: '9px 13px', border: `1px solid ${PALETTE[index]}66`, background: `${PALETTE[index]}10`, color: '#fff', fontSize: 14, fontWeight: 850}}>{label}</div>)}
        </div>
      </div>
      <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, minHeight: 0, ...enterStyle(p2, 34, 0)}}>
        <div><div style={{height: 28, color: accent, fontSize: 13, fontWeight: 950}}>有设计语言</div><div style={{height: 'calc(100% - 28px)'}}><SwissMock accent={accent} active={state === 'install' || state === 'language'} /></div></div>
        <div><div style={{height: 28, color: '#ff6d92', fontSize: 13, fontWeight: 950}}>默认 AI</div><div style={{height: 'calc(100% - 28px)'}}><DefaultAiMock accent="#ff5f91" active={state === 'problem'} /></div></div>
      </div>
    </Panel>
  );
};

const ImpeccableContent: React.FC<{frame: number; fps: number; accent: string; beat?: SkillShowcaseBeat}> = ({frame, fps, accent, beat}) => {
  const keyword = beat?.keyword ?? '';
  const categories = ['视觉字体', '色彩', '布局', '间距', '网格', '对比', '层级', '无障碍'];
  const categoryActive = keyword.includes('八') || keyword.includes('类别');
  const scanActive = keyword.includes('检测') || keyword.includes('标注');
  const compareActive = keyword.includes('左边') || keyword.includes('结果');
  return (
    <Panel accent={accent} style={{height: '100%', padding: 28, display: 'grid', gridTemplateColumns: '300px 1fr', gridTemplateRows: '1fr 150px', gap: 18}}>
      <div style={{borderRight: '1px solid rgba(255,255,255,0.08)', paddingRight: 24, display: 'flex', flexDirection: 'column', justifyContent: 'center', ...enterStyle(enter(frame, fps, 0.08, 0.5), -26, 0)}}>
        <div style={{fontSize: 164, lineHeight: 0.78, color: accent, fontWeight: 950, textShadow: keyword.includes('37') ? `0 0 45px ${accent}66` : 'none'}}>37</div>
        <div style={{fontSize: 23, color: '#fff', marginTop: 28, fontWeight: 950}}>条 AI 反模式规则</div>
        <div style={{fontSize: 15, lineHeight: 1.6, color: 'rgba(255,255,255,0.52)', marginTop: 12}}>命名问题 · 实时检测<br />标注反模式 · 给出解释</div>
      </div>
      <div style={{display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, ...enterStyle(enter(frame, fps, 0.18, 0.55), 0, 24)}}>
        {categories.map((label, index) => {
          const active = categoryActive && index <= Math.floor((frame / 8) % categories.length);
          return (
            <div key={label} style={{padding: 16, border: `1px solid ${active ? accent : 'rgba(255,255,255,0.1)'}`, background: active ? `${accent}18` : 'rgba(255,255,255,0.025)', boxShadow: active ? `0 0 22px ${accent}26` : 'none'}}>
              <div style={{fontFamily: MONO, fontSize: 11, color: active ? accent : 'rgba(255,255,255,0.35)'}}>{String(index + 1).padStart(2, '0')}</div>
              <div style={{fontSize: 20, color: '#fff', fontWeight: 900, marginTop: 14}}>{label}</div>
            </div>
          );
        })}
      </div>
      <div style={{gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12}}>
        {[['SCAN', '逐元素扫描'], ['MARK', '命名并标注'], ['COMPARE', '输出前后对照']].map(([code, label], index) => {
          const active = (scanActive && index < 2) || (compareActive && index === 2);
          return <div key={code} style={{borderTop: `4px solid ${active ? accent : 'rgba(255,255,255,0.12)'}`, padding: '18px 20px', background: active ? `${accent}14` : 'rgba(255,255,255,0.025)', display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}><div><div style={{fontFamily: MONO, color: active ? accent : 'rgba(255,255,255,0.38)', fontSize: 12}}>{code}</div><div style={{fontSize: 21, color: '#fff', fontWeight: 900, marginTop: 8}}>{label}</div></div><SemanticIcon icon={(index === 0 ? 'scan-search' : index === 1 ? 'scan-line' : 'git-compare-arrows') as SkillIconKey} color={accent} size={24} framed /></div>;
        })}
      </div>
    </Panel>
  );
};

const FrontendContent: React.FC<{frame: number; fps: number; accent: string; beat?: SkillShowcaseBeat}> = ({frame, fps, accent, beat}) => {
  const keyword = beat?.keyword ?? '';
  const directions = [
    ['Swiss', '极简', '#f05a5a'],
    ['RAW', '粗粝工业', '#a9b2bf'],
    ['Nordic', '克制', '#7ec8a5'],
    ['Neo', '赛博', '#20d9e8'],
    ['Editorial', '杂志感', '#ffcf5a'],
    ['Utility', '工具感', '#7b8cff'],
  ];
  const activeIndex = directions.findIndex(([name]) => keyword.includes(name));
  const showRules = keyword.includes('禁用') || keyword.includes('清单') || keyword.includes('雷区');
  const showAnchor = keyword.includes('锚定') || keyword.includes('结果') || keyword.includes('源头');
  return (
    <Panel accent={accent} style={{height: '100%', padding: 28, display: 'grid', gridTemplateRows: '1fr 142px', gap: 18}}>
      <div style={{display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12}}>
        {directions.map(([name, cn, color], index) => {
          const active = activeIndex === index || (keyword.includes('六种') && index < 4);
          const p = enter(frame, fps, 0.08 + index * 0.05, 0.48);
          return (
            <div key={name} style={{...enterStyle(p, 0, 20), border: `1px solid ${active ? color : 'rgba(255,255,255,0.1)'}`, background: active ? `${color}18` : 'rgba(255,255,255,0.025)', padding: 20, position: 'relative', boxShadow: active ? `0 0 26px ${color}2f` : 'none'}}>
              <div style={{fontFamily: MONO, fontSize: 11, color: active ? color : 'rgba(255,255,255,0.3)'}}>{String(index + 1).padStart(2, '0')} / DIRECTION</div>
              <div style={{fontSize: 34, color: '#fff', fontWeight: 950, marginTop: 16}}>{name}</div>
              <div style={{fontSize: 15, color: 'rgba(255,255,255,0.54)', fontWeight: 800, marginTop: 6}}>{cn}</div>
              <div style={{position: 'absolute', left: 20, right: active ? 50 : 150, bottom: 18, height: 4, background: color}} />
            </div>
          );
        })}
      </div>
      <div style={{display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 12}}>
        <div style={{borderTop: `4px solid ${showRules ? '#ff5f7a' : accent}`, background: showRules ? 'rgba(255,95,122,0.1)' : `${accent}0d`, padding: 18}}>
          <div style={{fontSize: 13, color: showRules ? '#ff7b96' : accent, fontWeight: 950}}>ANTI-PATTERN / 源头规避</div>
          <div style={{display: 'flex', gap: 10, marginTop: 13}}>
            {['Inter 字体', '紫色渐变', '居中堆叠'].map((rule) => <div key={rule} style={{flex: 1, height: 44, display: 'grid', placeItems: 'center', border: '1px solid rgba(255,95,122,0.38)', color: '#fff', fontSize: 15, fontWeight: 850, textDecoration: showRules ? 'line-through' : 'none'}}>{rule}</div>)}
          </div>
        </div>
        <div style={{borderTop: `4px solid ${showAnchor ? accent : 'rgba(255,255,255,0.12)'}`, background: showAnchor ? `${accent}14` : 'rgba(255,255,255,0.025)', padding: 18}}>
          <div style={{fontSize: 13, color: showAnchor ? accent : 'rgba(255,255,255,0.38)', fontWeight: 950}}>ANCHOR / 主动选择</div>
          <div style={{fontSize: 25, color: '#fff', fontWeight: 950, marginTop: 17}}>稳定输出有记忆点的界面</div>
        </div>
      </div>
    </Panel>
  );
};

const UxContent: React.FC<{frame: number; fps: number; accent: string; beat?: SkillShowcaseBeat}> = ({frame, fps, accent, beat}) => {
  const keyword = beat?.keyword ?? '';
  const metrics = [
    ['161', '配色方案', '#45e28d'],
    ['67', 'UI 风格', '#5f7dff'],
    ['57', '字体搭配', '#ffc44d'],
    ['99', 'UX 原则', '#ff5f91'],
  ];
  const showSystem = keyword.includes('系统') || keyword.includes('官网') || keyword.includes('场景');
  return (
    <Panel accent={accent} style={{height: '100%', padding: 28, display: 'grid', gridTemplateColumns: '1fr 0.9fr', gap: 18}}>
      <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12}}>
        {metrics.map(([value, label, color], index) => {
          const active = keyword.includes(value) || keyword.includes('内置');
          const p = enter(frame, fps, 0.08 + index * 0.06, 0.5);
          return (
            <div key={value} style={{...enterStyle(p, 0, 20), border: `1px solid ${active ? color : 'rgba(255,255,255,0.1)'}`, background: active ? `${color}15` : 'rgba(255,255,255,0.025)', padding: 24, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxShadow: active ? `0 0 28px ${color}2f` : 'none'}}>
              <div style={{fontSize: 76, lineHeight: 0.85, color, fontWeight: 950}}>{value}</div>
              <div><div style={{fontSize: 23, color: '#fff', fontWeight: 950}}>{label}</div><div style={{fontSize: 13, color: 'rgba(255,255,255,0.42)', marginTop: 7}}>按行业整理 · 可直接执行</div></div>
            </div>
          );
        })}
      </div>
      <div style={{display: 'grid', gridTemplateRows: '0.72fr 1fr', gap: 12}}>
        <div style={{border: `1px solid ${showSystem ? accent : 'rgba(255,255,255,0.1)'}`, background: showSystem ? `${accent}12` : 'rgba(255,255,255,0.025)', padding: 22}}>
          <div style={{fontFamily: MONO, color: accent, fontSize: 12, fontWeight: 900}}>INPUT / PRODUCT TYPE</div>
          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9, marginTop: 17}}>
            {['官网', '工具', '作品集', '后台'].map((item, index) => <div key={item} style={{height: 52, display: 'grid', placeItems: 'center', borderTop: `3px solid ${PALETTE[index]}`, background: `${PALETTE[index]}10`, color: '#fff', fontSize: 16, fontWeight: 900}}>{item}</div>)}
          </div>
        </div>
        <div style={{border: `1px solid ${showSystem ? '#ffcf5a' : `${accent}55`}`, background: showSystem ? 'rgba(255,196,77,0.09)' : 'rgba(255,255,255,0.025)', padding: 22}}>
          <div style={{fontFamily: MONO, color: '#ffcf5a', fontSize: 12, fontWeight: 900}}>SYSTEM OUTPUT</div>
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginTop: 18}}>
            {['颜色', '字体', '间距', 'WCAG'].map((token, index) => <div key={token} style={{height: 64, display: 'grid', placeItems: 'center', borderTop: `3px solid ${PALETTE[index]}`, background: `${PALETTE[index]}12`, color: '#fff', fontSize: 15, fontWeight: 900}}>{token}</div>)}
          </div>
          <div style={{fontSize: 31, lineHeight: 1.06, color: '#fff', fontWeight: 950, marginTop: 30}}>{showSystem ? '不是建议，是整套决策' : '一句话生成设计系统'}</div>
          <div style={{fontSize: 15, color: 'rgba(255,255,255,0.48)', marginTop: 10}}>规则、反模式与行业标准一次到位</div>
        </div>
      </div>
    </Panel>
  );
};

const CloudContent: React.FC<{frame: number; fps: number; accent: string; beat?: SkillShowcaseBeat}> = ({frame, fps, accent, beat}) => {
  const keyword = beat?.keyword ?? '';
  const brands = [
    ['Stripe', '极简兼容感', '#635bff'],
    ['Linear', '工程美学', '#5e6ad2'],
    ['Vercel', '极致黑白', '#f4f4f4'],
    ['Recta', '精密渐变', '#9a7cff'],
  ];
  const activeBrand = brands.findIndex(([name]) => keyword.includes(name));
  return (
    <Panel accent={accent} style={{height: '100%', padding: 28, display: 'grid', gridTemplateColumns: '280px 1fr', gridTemplateRows: '1fr 148px', gap: 18}}>
      <div style={{display: 'flex', flexDirection: 'column', justifyContent: 'center', borderRight: '1px solid rgba(255,255,255,0.08)', ...enterStyle(enter(frame, fps, 0.08, 0.5), -24, 0)}}>
        <div style={{fontSize: 164, lineHeight: 0.78, color: accent, fontWeight: 950, textShadow: keyword.includes('68') ? `0 0 44px ${accent}66` : 'none'}}>68</div>
        <div style={{fontSize: 22, color: '#fff', fontWeight: 950, marginTop: 28}}>个品牌设计系统</div>
        <div style={{fontSize: 15, color: 'rgba(255,255,255,0.48)', lineHeight: 1.55, marginTop: 10}}>设计 Token、组件规范<br />与品牌立场打包复用</div>
      </div>
      <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12}}>
        {brands.map(([name, desc, color], index) => {
          const active = activeBrand === index || keyword.includes('品牌');
          const p = enter(frame, fps, 0.16 + index * 0.06, 0.48);
          return (
            <div key={name} style={{...enterStyle(p, 0, 20), border: `1px solid ${active ? color : 'rgba(255,255,255,0.1)'}`, background: name === 'Vercel' ? 'rgba(245,245,245,0.92)' : active ? `${color}18` : 'rgba(255,255,255,0.025)', padding: 22, color: name === 'Vercel' ? '#101010' : '#fff', boxShadow: active ? `0 0 28px ${color}30` : 'none'}}>
              <div style={{fontFamily: MONO, color: name === 'Vercel' ? '#555' : color, fontSize: 11}}>{String(index + 1).padStart(2, '0')} / BRAND SYSTEM</div>
              <div style={{fontSize: 34, fontWeight: 950, marginTop: 18}}>{name}</div>
              <div style={{fontSize: 15, opacity: 0.62, fontWeight: 800, marginTop: 8}}>{desc}</div>
              <div style={{width: active ? '78%' : '34%', height: 4, background: color, marginTop: 22}} />
            </div>
          );
        })}
      </div>
      <div style={{gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: '180px repeat(4, 1fr)', alignItems: 'stretch', borderTop: `4px solid ${accent}`, background: `${accent}0c`}}>
        <div style={{padding: 20}}><div style={{fontFamily: MONO, color: accent, fontSize: 12}}>TOKEN RELAY</div><div style={{fontSize: 20, color: '#fff', fontWeight: 950, marginTop: 12}}>一个文件<br />加载立场</div></div>
        {['COLOR', 'TYPE', 'SPACE', 'COMP'].map((token, index) => <div key={token} style={{borderLeft: '1px solid rgba(255,255,255,0.08)', padding: 20, display: 'flex', flexDirection: 'column', justifyContent: 'space-between'}}><div style={{fontFamily: MONO, color: PALETTE[index], fontSize: 12}}>{token}</div><div style={{height: 4, width: keyword.includes('品牌') ? '100%' : '45%', background: PALETTE[index]}} /></div>)}
      </div>
    </Panel>
  );
};

const OutroContent: React.FC<{
  frame: number;
  fps: number;
  accent: string;
  secondary: string;
  headline: string;
  body?: string;
  labels: string[];
  productIcons?: ProductIconKey[];
}> = ({frame, fps, accent, secondary, headline, body, labels, productIcons}) => (
  <Panel accent={accent} style={{height: '100%', padding: '54px 64px', display: 'grid', gridTemplateColumns: '1.12fr 0.88fr', gap: 52}}>
    <div style={{display: 'flex', flexDirection: 'column', justifyContent: 'center', ...enterStyle(enter(frame, fps, 0.05, 0.58), -40, 0)}}>
      <div style={{fontFamily: MONO, fontSize: 14, letterSpacing: 2, color: accent, fontWeight: 900}}>FINAL POSITION / REUSABLE SYSTEM</div>
      <div style={{fontSize: headline.length > 19 ? 62 : 74, lineHeight: 1.02, color: '#fff', fontWeight: 950, marginTop: 25}}>{headline}</div>
      <div style={{fontSize: 22, lineHeight: 1.55, color: 'rgba(255,255,255,0.58)', fontWeight: 750, marginTop: 28}}>{body}</div>
      <div style={{height: 7, width: 420, background: `linear-gradient(90deg, ${accent}, ${secondary}, transparent)`, marginTop: 34}} />
    </div>
    <div style={{display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 14}}>
      {labels.slice(0, 4).map((label, index) => {
        const p = enter(frame, fps, 0.2 + index * 0.08, 0.48);
        const icon = productIcons?.[index] ?? ['impeccable', 'frontend-design', 'ux-pro', 'cloud-design'][index] as ProductIconKey;
        return <div key={label} style={{...enterStyle(p, 28, 0), height: 78, borderLeft: `5px solid ${PALETTE[index]}`, background: `${PALETTE[index]}0e`, display: 'flex', alignItems: 'center', gap: 18, padding: '0 20px'}}><ProductBadge icon={icon} accent={PALETTE[index]} size={48} /><div style={{fontSize: 22, color: '#fff', fontWeight: 900}}>{label}</div><div style={{marginLeft: 'auto', fontFamily: MONO, color: PALETTE[index], fontSize: 12}}>0{index + 1}</div></div>;
      })}
    </div>
  </Panel>
);

export const LandscapeSkillShowcase: React.FC<SkillShowcaseProps> = ({
  variant,
  title,
  subtitle,
  index,
  accent = '#20d9e8',
  secondaryAccent = '#7c67ff',
  labels = [],
  productIcon,
  productIcons,
  brandName,
  headline,
  body,
  progressIndex = 0,
  progressTotal = 6,
  beats = [],
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const activeBeat = activeBeatAt(frame, beats);
  const hasCenterHit = activeBeat ? ['compare', 'stamp'].includes(activeBeat.action) : false;
  const resolvedProduct = productIcon ?? PRODUCT_FOR_VARIANT[variant];
  const resolvedHeadline = headline ?? title;

  const content = (() => {
    if (variant === 'intro' || variant === 'overview' || variant === 'generic') {
      return <IntroContent frame={frame} fps={fps} accent={accent} secondary={secondaryAccent} headline={resolvedHeadline} body={body ?? subtitle} labels={labels} beat={activeBeat} />;
    }
    if (variant === 'impeccable') return <ImpeccableContent frame={frame} fps={fps} accent={accent} beat={activeBeat} />;
    if (variant === 'frontend-design') return <FrontendContent frame={frame} fps={fps} accent={accent} beat={activeBeat} />;
    if (variant === 'ux-pro') return <UxContent frame={frame} fps={fps} accent={accent} beat={activeBeat} />;
    if (variant === 'cloud-design') return <CloudContent frame={frame} fps={fps} accent={accent} beat={activeBeat} />;
    if (variant === 'outro') return <OutroContent frame={frame} fps={fps} accent={accent} secondary={secondaryAccent} headline={resolvedHeadline} body={body ?? subtitle} labels={labels} productIcons={productIcons} />;
    return <IntroContent frame={frame} fps={fps} accent={accent} secondary={secondaryAccent} headline={resolvedHeadline} body={body ?? subtitle} labels={labels} beat={activeBeat} />;
  })();

  return (
    <AbsoluteFill style={{background: '#070a12', overflow: 'hidden', fontFamily: FONT}}>
      <Backdrop accent={accent} secondary={secondaryAccent} frame={frame} fps={fps} />
      <Header frame={frame} fps={fps} index={index} title={title} subtitle={subtitle} accent={accent} productIcon={resolvedProduct} progressIndex={progressIndex} progressTotal={progressTotal} />
      <div style={{position: 'absolute', left: 76, right: 76, top: 168, bottom: 196, display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 410px', gap: 24}}>
        {content}
        <BeatInspector frame={frame} accent={accent} beat={hasCenterHit ? undefined : activeBeat} />
      </div>
      <LandscapeSemanticOverlay frame={frame} accent={accent} beats={beats} activeBeat={activeBeat} />
      <div style={{position: 'absolute', left: 76, right: 76, bottom: 170, height: 1, background: `linear-gradient(90deg, transparent, ${accent}66, transparent)`}} />
      <div style={{position: 'absolute', left: 76, bottom: 148, fontFamily: MONO, color: 'rgba(255,255,255,0.28)', fontSize: 11, letterSpacing: 1.5}}>{brandName ?? 'DESIGN SKILL'} / FRAME {String(frame).padStart(4, '0')}</div>
    </AbsoluteFill>
  );
};
