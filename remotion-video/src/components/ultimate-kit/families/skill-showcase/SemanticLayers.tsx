import React from 'react';
import {AbsoluteFill, Easing, Img, interpolate, staticFile} from 'remotion';
import type {SkillBeatAction, SkillIconKey, SkillShowcaseBeat} from './types';

const clamp = {
  extrapolateLeft: 'clamp' as const,
  extrapolateRight: 'clamp' as const,
};

const crispEase = Easing.bezier(0.16, 1, 0.3, 1);

export const SemanticIcon: React.FC<{
  icon: SkillIconKey;
  color: string;
  size?: number;
  framed?: boolean;
}> = ({icon, color, size = 34, framed = false}) => (
  <div style={{
    width: framed ? size + 30 : size,
    height: framed ? size + 30 : size,
    borderRadius: framed ? 8 : 0,
    border: framed ? `1px solid ${color}88` : 'none',
    background: framed ? `${color}18` : 'transparent',
    boxShadow: framed ? `0 0 24px ${color}24` : 'none',
    display: 'grid',
    placeItems: 'center',
    flex: '0 0 auto',
  }}>
    <Img
      src={staticFile(`projects/skill-showcase/icons/${icon}.svg`)}
      style={{
        width: size,
        height: size,
        objectFit: 'contain',
        filter: 'brightness(0) invert(1)',
        opacity: 0.96,
      }}
    />
  </div>
);

const beatProgress = (frame: number, beat: SkillShowcaseBeat) => {
  const duration = Math.max(1, beat.endFrame - beat.startFrame);
  let enterFrames = Math.min(24, Math.max(18, Math.round(duration * 0.22)));
  let exitFrames = Math.min(14, Math.max(10, Math.round(duration * 0.13)));
  if (enterFrames + exitFrames >= duration) {
    enterFrames = Math.max(6, Math.floor(duration * 0.42));
    exitFrames = Math.max(4, Math.floor(duration * 0.24));
  }
  const enter = interpolate(frame, [beat.startFrame, beat.startFrame + enterFrames], [0, 1], {
    ...clamp,
    easing: crispEase,
  });
  const exit = interpolate(frame, [beat.endFrame - exitFrames, beat.endFrame], [1, 0], {
    ...clamp,
    easing: Easing.in(Easing.cubic),
  });
  return enter * exit;
};

const beatMotionStyle = (
  progress: number,
  beat: SkillShowcaseBeat,
  frame: number,
  accent: string,
): React.CSSProperties => {
  const preset = beat.motionPreset ?? 'slow-rise';
  const pulse = Math.sin(frame / 9) * 0.5 + 0.5;
  if (preset === 'scan-lock') {
    return {
      transform: `translateY(${interpolate(progress, [0, 1], [18, 0])}px) skewX(${interpolate(progress, [0, 1], [-4, 0])}deg)`,
      filter: `drop-shadow(0 0 ${10 + pulse * 12}px ${accent}55)`,
    };
  }
  if (preset === 'number-roll') {
    return {
      transform: `translateY(${interpolate(progress, [0, 1], [26, 0])}px) scale(${interpolate(progress, [0, 1], [0.92, 1])})`,
      filter: `drop-shadow(0 0 ${18 + pulse * 18}px ${accent}66)`,
    };
  }
  if (preset === 'split-reveal') {
    return {
      transform: `translateX(${interpolate(progress, [0, 1], [-34, 0])}px)`,
      clipPath: `inset(0 ${interpolate(progress, [0, 1], [42, 0])}% 0 0)`,
    };
  }
  if (preset === 'card-regroup') {
    return {
      transform: `translateY(${interpolate(progress, [0, 1], [20, 0])}px) rotateX(${interpolate(progress, [0, 1], [10, 0])}deg)`,
      transformOrigin: '50% 100%',
    };
  }
  if (preset === 'focus-pulse') {
    return {
      transform: `translateY(${interpolate(progress, [0, 1], [16, 0])}px) scale(${1 + pulse * 0.018 * progress})`,
      filter: `drop-shadow(0 0 ${14 + pulse * 16}px ${accent}66)`,
    };
  }
  if (preset === 'flash-cut') {
    const snap = interpolate(progress, [0, 0.22, 1], [1.12, 0.96, 1], clamp);
    return {
      transform: `translateY(${interpolate(progress, [0, 1], [12, 0])}px) scale(${snap})`,
      filter: `contrast(${1 + (1 - progress) * 0.25})`,
    };
  }
  return {
    transform: `translateY(${interpolate(progress, [0, 1], [30, 0])}px)`,
  };
};

const evidenceFor = (beat: SkillShowcaseBeat) => beat.evidence?.length
  ? beat.evidence
  : beat.detail
    ? [beat.detail]
    : [];

const ActionFrame: React.FC<{
  beat: SkillShowcaseBeat;
  accent: string;
  progress: number;
}> = ({beat, accent, progress}) => {
  const evidence = evidenceFor(beat);
  const lineProgress = interpolate(progress, [0, 1], [0, 1], clamp);
  const keywordSize = beat.keyword.length > 10 ? 42 : beat.keyword.length > 6 ? 50 : 58;
  const sharedKeyword: React.CSSProperties = {
    color: '#fff',
    fontSize: keywordSize,
    lineHeight: 1,
    fontWeight: 950,
  };

  if (beat.action === 'stamp') {
    return (
      <div style={{
        minWidth: 530,
        padding: '20px 34px',
        border: `4px solid ${accent}`,
        background: 'rgba(7,10,18,0.72)',
        boxShadow: `0 0 34px ${accent}33`,
        transform: `rotate(${interpolate(progress, [0, 1], [-7, -1.4])}deg) scale(${interpolate(progress, [0, 1], [1.12, 1])})`,
      }}>
        <div style={{display: 'flex', alignItems: 'center', gap: 22}}>
          <SemanticIcon icon={beat.icon} color={accent} size={46} />
          <div>
            <div style={{color: accent, fontSize: 14, fontWeight: 950}}>关键提示</div>
            <div style={{...sharedKeyword, marginTop: 8}}>{beat.keyword}</div>
          </div>
        </div>
      </div>
    );
  }

  if (beat.action === 'compare') {
    const left = evidence[0] ?? '旧方式';
    const right = evidence[1] ?? '新方式';
    return (
      <div style={{width: 760}}>
        <div style={{...sharedKeyword, textAlign: 'center', marginBottom: 18}}>{beat.keyword}</div>
        <div style={{display: 'grid', gridTemplateColumns: '1fr 62px 1fr', alignItems: 'center'}}>
          <div style={{height: 62, display: 'grid', placeItems: 'center', borderLeft: '6px solid #ff5f7a', background: 'rgba(255,95,122,0.12)', color: '#ffc2cc', fontSize: 22, fontWeight: 900}}>{left}</div>
          <div style={{textAlign: 'center', color: 'rgba(255,255,255,0.44)', fontSize: 18, fontWeight: 950}}>VS</div>
          <div style={{height: 62, display: 'grid', placeItems: 'center', borderRight: `6px solid ${accent}`, background: `${accent}16`, color: '#fff', fontSize: 22, fontWeight: 900}}>{right}</div>
        </div>
      </div>
    );
  }

  if (beat.action === 'counter') {
    return (
      <div style={{display: 'flex', alignItems: 'center', gap: 30}}>
        <SemanticIcon icon={beat.icon} color={accent} size={52} framed />
        <div style={{fontSize: 112, lineHeight: 0.8, fontWeight: 950, color: accent}}>{beat.value ?? '100%'}</div>
        <div>
          <div style={{...sharedKeyword, fontSize: 40}}>{beat.keyword}</div>
          <div style={{marginTop: 12, color: 'rgba(255,255,255,0.52)', fontSize: 17, fontWeight: 800}}>数据提示</div>
        </div>
      </div>
    );
  }

  if (beat.action === 'stack') {
    const rows = evidence.length ? evidence : ['语义', '证据', '结论'];
    const stackKeywordSize = beat.keyword.length > 7 ? 30 : beat.keyword.length > 4 ? 42 : 50;
    return (
      <div style={{width: 760, display: 'grid', gridTemplateColumns: '390px 1fr', gap: 22, alignItems: 'center'}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 18}}>
          <SemanticIcon icon={beat.icon} color={accent} size={44} framed />
          <div style={{...sharedKeyword, fontSize: stackKeywordSize, whiteSpace: 'nowrap'}}>{beat.keyword}</div>
        </div>
        <div style={{height: 112, position: 'relative'}}>
          {rows.slice(0, 4).map((item, index) => (
            <div key={item} style={{
              position: 'absolute',
              left: index * 18,
              right: (rows.length - index - 1) * 18,
              top: index * 25,
              height: 52,
              padding: '0 18px',
              display: 'flex',
              alignItems: 'center',
              border: `1px solid ${accent}${index === rows.length - 1 ? 'bb' : '66'}`,
              background: index === rows.length - 1 ? 'rgba(10,15,25,0.96)' : 'rgba(10,15,25,0.82)',
              color: index === rows.length - 1 ? '#fff' : 'rgba(255,255,255,0.66)',
              fontSize: 19,
              fontWeight: 900,
              transform: `translateX(${interpolate(progress, [0, 1], [44 + index * 12, 0])}px)`,
            }}>{String(index + 1).padStart(2, '0')} / {item}</div>
          ))}
        </div>
      </div>
    );
  }

  if (beat.action === 'focus') {
    const reticle = interpolate(progress, [0, 1], [1.34, 1]);
    return (
      <div style={{display: 'flex', alignItems: 'center', gap: 34}}>
        <div style={{width: 124, height: 124, position: 'relative', display: 'grid', placeItems: 'center', transform: `scale(${reticle})`}}>
          <div style={{position: 'absolute', inset: 0, borderTop: `3px solid ${accent}`, borderLeft: `3px solid ${accent}`}} />
          <div style={{position: 'absolute', inset: 0, borderRight: `3px solid ${accent}`, borderBottom: `3px solid ${accent}`}} />
          <div style={{position: 'absolute', left: '50%', top: -16, bottom: -16, width: 1, background: `${accent}88`}} />
          <div style={{position: 'absolute', top: '50%', left: -16, right: -16, height: 1, background: `${accent}88`}} />
          <SemanticIcon icon={beat.icon} color={accent} size={50} />
        </div>
        <div>
          <div style={{color: accent, fontSize: 15, fontWeight: 950}}>核心判断</div>
          <div style={{...sharedKeyword, marginTop: 10}}>{beat.keyword}</div>
          {evidence.length ? <div style={{marginTop: 12, color: 'rgba(255,255,255,0.56)', fontSize: 19, fontWeight: 800}}>{evidence.join(' · ')}</div> : null}
        </div>
      </div>
    );
  }

  if (beat.action === 'burst') {
    const burstScale = interpolate(progress, [0, 1], [0.5, 1]);
    return (
      <div style={{width: 720, height: 150, position: 'relative', display: 'grid', placeItems: 'center'}}>
        {Array.from({length: 10}).map((_, index) => (
          <div key={index} style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: 150 * lineProgress,
            height: index % 2 === 0 ? 3 : 1,
            transformOrigin: '0 50%',
            transform: `rotate(${index * 36}deg) translateX(72px)`,
            background: `linear-gradient(90deg, ${accent}, transparent)`,
            opacity: index % 2 === 0 ? 0.75 : 0.35,
          }} />
        ))}
        <div style={{display: 'flex', alignItems: 'center', gap: 24, padding: '18px 30px', background: 'rgba(7,10,18,0.92)', borderTop: `4px solid ${accent}`, transform: `scale(${burstScale})`}}>
          <SemanticIcon icon={beat.icon} color={accent} size={54} />
          <div style={sharedKeyword}>{beat.keyword}</div>
          {beat.value ? <div style={{fontSize: 54, color: accent, fontWeight: 950}}>{beat.value}</div> : null}
        </div>
      </div>
    );
  }

  if (beat.action === 'trace') {
    return (
      <div style={{width: 760}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 22}}>
          <SemanticIcon icon={beat.icon} color={accent} size={44} framed />
          <div style={{flex: 1}}>
            <div style={sharedKeyword}>{beat.keyword}</div>
            <div style={{height: 7, marginTop: 16, position: 'relative', background: 'rgba(255,255,255,0.07)'}}>
              <div style={{height: '100%', width: `${lineProgress * 100}%`, background: `linear-gradient(90deg, ${accent}, #fff)`}} />
              <div style={{position: 'absolute', left: `${lineProgress * 100}%`, top: -8, width: 3, height: 23, background: '#fff'}} />
            </div>
          </div>
          {beat.value ? <div style={{fontSize: 30, color: accent, fontWeight: 950}}>{beat.value}</div> : null}
        </div>
      </div>
    );
  }

  return (
    <div style={{display: 'flex', alignItems: 'center', gap: 24}}>
      <SemanticIcon icon={beat.icon} color={accent} size={48} framed />
      <div>
        <div style={sharedKeyword}>{beat.keyword}</div>
        {evidence.length ? <div style={{marginTop: 12, color: 'rgba(255,255,255,0.56)', fontSize: 19, fontWeight: 800}}>{evidence.join(' · ')}</div> : null}
        <div style={{marginTop: 14, height: 3, width: `${lineProgress * 100}%`, background: `linear-gradient(90deg, ${accent}, transparent)`}} />
      </div>
    </div>
  );
};

const IconRelay: React.FC<{
  beats: SkillShowcaseBeat[];
  activeIndex: number;
  accent: string;
  progress: number;
}> = ({beats, activeIndex, accent, progress}) => {
  const indexes = [activeIndex - 1, activeIndex, activeIndex + 1];
  return (
    <div style={{height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, opacity: progress}}>
      {indexes.map((index, slot) => {
        const beat = beats[index];
        if (!beat) return <div key={index} style={{width: 34, height: 34}} />;
        const current = slot === 1;
        return (
          <React.Fragment key={`${beat.startFrame}-${beat.icon}`}>
            {slot > 0 ? <div style={{width: current ? 34 * progress : 18, height: 1, background: current ? accent : 'rgba(255,255,255,0.18)'}} /> : null}
            <div style={{opacity: current ? 1 : 0.28, transform: `scale(${current ? interpolate(progress, [0, 1], [0.72, 1]) : 0.72})`}}>
              <SemanticIcon icon={beat.icon} color={accent} size={current ? 24 : 18} framed={current} />
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
};

export const SemanticBeatOverlay: React.FC<{
  frame: number;
  beats: SkillShowcaseBeat[];
  accent: string;
}> = ({frame, beats, accent}) => {
  const activeIndex = beats.findIndex((candidate) => frame >= candidate.startFrame && frame < candidate.endFrame);
  if (activeIndex < 0) return null;
  const beat = beats[activeIndex];
  if (beat.placement === 'body') return null;
  const progress = beatProgress(frame, beat);
  const overlayTop = beat.placement === 'highlight' ? 1080 : 1195;

  return (
    <div style={{
      position: 'absolute',
      top: overlayTop,
      left: 64,
      right: 64,
      height: 300,
      pointerEvents: 'none',
      opacity: progress,
      ...beatMotionStyle(progress, beat, frame, accent),
    }}>
      <IconRelay beats={beats} activeIndex={activeIndex} accent={accent} progress={progress} />
      <div style={{height: 238, display: 'grid', placeItems: 'center'}}>
        <ActionFrame beat={beat} accent={accent} progress={progress} />
      </div>
    </div>
  );
};

export const DeterministicMotionField: React.FC<{
  frame: number;
  fps: number;
  accent: string;
  secondary: string;
  beats: SkillShowcaseBeat[];
}> = ({frame, fps, accent, secondary, beats}) => {
  const scanY = interpolate(frame % (fps * 5), [0, fps * 5], [-80, 2000]);
  const focusX = interpolate(frame % (fps * 7), [0, fps * 7], [-220, 1260]);
  const depthPhase = (frame % (fps * 8)) / (fps * 8);
  const depthPush = interpolate(depthPhase, [0, 0.5, 1], [0, 1, 0]);
  const beatFlash = beats.reduce((strongest, beat) => {
    const flash = interpolate(frame, [beat.startFrame, beat.startFrame + 6, beat.startFrame + 18], [0, 1, 0], clamp);
    return Math.max(strongest, flash);
  }, 0);
  const beatTrace = beats.reduce((strongest, beat) => {
    const trace = interpolate(frame, [beat.startFrame + 8, beat.startFrame + 28], [1, 0], clamp);
    return Math.max(strongest, trace);
  }, 0);

  return (
    <AbsoluteFill style={{pointerEvents: 'none', overflow: 'hidden'}}>
      <AbsoluteFill style={{
        opacity: 0.075,
        backgroundImage: [
          'repeating-linear-gradient(0deg, rgba(255,255,255,0.18) 0 1px, transparent 1px 5px)',
          'repeating-linear-gradient(90deg, rgba(255,255,255,0.08) 0 1px, transparent 1px 9px)',
        ].join(', '),
        backgroundPosition: `${frame % 19}px ${frame % 13}px, ${-(frame % 17)}px ${frame % 11}px`,
        mixBlendMode: 'screen',
      }} />

      {[0, 1, 2].map((index) => {
        const scale = 0.82 + index * 0.13 + depthPush * (0.035 + index * 0.012);
        return (
          <div key={`depth-${index}`} style={{
            position: 'absolute',
            left: 120 - index * 70,
            top: 280 - index * 95,
            width: 840 + index * 140,
            height: 1180 + index * 190,
            border: `1px solid ${index % 2 === 0 ? accent : secondary}${index === 0 ? '2f' : '1c'}`,
            transform: `perspective(1200px) rotateX(2deg) scale(${scale}) translateY(${depthPush * 18}px)`,
            transformOrigin: '50% 50%',
            opacity: 0.35 - index * 0.07,
          }} />
        );
      })}

      {[0, 1, 2, 3, 4].map((index) => {
        const cycle = fps * (3.2 + index * 0.55);
        const phase = ((frame + index * fps * 0.72) % cycle) / cycle;
        const x = interpolate(phase, [0, 1], [-480, 1360]);
        return (
          <div key={`streak-${index}`} style={{
            position: 'absolute',
            top: 220 + index * 320,
            left: x,
            width: 300 + index * 74,
            height: index % 2 === 0 ? 2 : 1,
            background: `linear-gradient(90deg, transparent, ${index % 2 === 0 ? accent : secondary}, transparent)`,
            opacity: 0.11 + index * 0.014,
            transform: `rotate(${index % 2 === 0 ? -18 : 12}deg)`,
          }} />
        );
      })}

      <div style={{position: 'absolute', left: 0, right: 0, top: scanY, height: 2, background: `linear-gradient(90deg, transparent, ${accent}99, transparent)`, opacity: 0.16, boxShadow: `0 0 20px ${accent}55`}} />
      <div style={{position: 'absolute', top: 0, bottom: 0, left: focusX, width: 160, background: `linear-gradient(90deg, transparent, ${secondary}0f, transparent)`, transform: 'skewX(-10deg)', opacity: 0.5}} />
      <div style={{position: 'absolute', left: 0, top: 240, width: 4, height: 820, background: `linear-gradient(180deg, transparent, ${accent}88, transparent)`, opacity: 0.34}} />
      <div style={{position: 'absolute', right: 0, top: 720, width: 3, height: 640, background: `linear-gradient(180deg, transparent, ${secondary}88, transparent)`, opacity: 0.3}} />
      <AbsoluteFill style={{background: `linear-gradient(105deg, transparent 38%, ${accent}1c 48%, ${secondary}18 52%, transparent 62%)`, opacity: beatFlash}} />
      <AbsoluteFill style={{border: `${Math.round(beatFlash * 3)}px solid ${accent}`, opacity: beatFlash * 0.42}} />
      <div style={{position: 'absolute', left: 76, right: 76, top: 1080, height: 1, background: `linear-gradient(90deg, transparent, ${accent}, transparent)`, opacity: beatTrace * 0.72, transform: `translateX(${interpolate(beatTrace, [0, 1], [120, 0])}px)`}} />
      <div style={{position: 'absolute', left: 76, right: 76, top: 1480, height: 1, background: `linear-gradient(90deg, transparent, ${secondary}, transparent)`, opacity: beatTrace * 0.55, transform: `translateX(${interpolate(beatTrace, [0, 1], [-120, 0])}px)`}} />
      <div style={{position: 'absolute', left: 42, top: 42, width: 46, height: 46, borderLeft: `2px solid ${accent}77`, borderTop: `2px solid ${accent}77`}} />
      <div style={{position: 'absolute', right: 42, bottom: 42, width: 46, height: 46, borderRight: `2px solid ${secondary}77`, borderBottom: `2px solid ${secondary}77`}} />
    </AbsoluteFill>
  );
};

export const ChapterTransitionOverlay: React.FC<{
  frame: number;
  accent: string;
  secondary: string;
  icon: SkillIconKey;
  index?: string;
  title: string;
}> = ({frame, accent, secondary, icon, index, title}) => {
  const duration = 12;
  if (frame >= duration) return null;
  const sweep = interpolate(frame, [0, 8], [0, 1], {...clamp, easing: crispEase});
  const exit = interpolate(frame, [8, duration], [1, 0], {...clamp, easing: Easing.in(Easing.cubic)});
  const flash = interpolate(frame, [0, 2, 5, 9, duration], [0.82, 0.2, 0.5, 0.12, 0], clamp);
  const iconX = interpolate(sweep, [0, 1], [860, 0]);

  return (
    <AbsoluteFill style={{pointerEvents: 'none', zIndex: 30, opacity: exit}}>
      <AbsoluteFill style={{background: '#ffffff', opacity: flash}} />
      {[0, 1, 2].map((bar) => (
        <div key={bar} style={{
          position: 'absolute',
          left: 0,
          top: 820 + bar * 70,
          width: `${Math.min(112, sweep * 112 + bar * 7)}%`,
          height: 62 - bar * 12,
          background: bar === 1 ? secondary : accent,
          transform: `translateX(${bar * -90}px) skewX(-18deg)`,
          opacity: 0.96 - bar * 0.2,
          boxShadow: bar === 0 ? `0 0 70px ${accent}88` : 'none',
        }} />
      ))}
      <div style={{
        position: 'absolute',
        left: 118,
        top: 842,
        display: 'flex',
        alignItems: 'center',
        gap: 22,
        transform: `translateX(${iconX}px)`,
      }}>
        <SemanticIcon icon={icon} color={accent} size={56} framed />
        <div>
          <div style={{color: '#071019', fontSize: 16, fontWeight: 950}}>{index ? `CHAPTER ${index}` : 'NEXT CHAPTER'}</div>
          <div style={{color: '#fff', fontSize: 46, lineHeight: 1, fontWeight: 950, marginTop: 5}}>{title}</div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const BEAT_ACTIONS: readonly SkillBeatAction[] = [
  'spotlight',
  'stamp',
  'trace',
  'compare',
  'counter',
  'stack',
  'focus',
  'burst',
];
