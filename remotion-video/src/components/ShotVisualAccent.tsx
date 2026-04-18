import React from 'react';
import {AbsoluteFill, spring, useCurrentFrame} from 'remotion';
import {ACCENT_GOLD, ACCENT_PURPLE} from '../data/storyboard';

const ICON_URLS = {
  arrowRight: new URL('../assets/icons/arrow-right.svg', import.meta.url).href,
  checkCircle: new URL('../assets/icons/check-circle.svg', import.meta.url).href,
  clock: new URL('../assets/icons/clock.svg', import.meta.url).href,
  code: new URL('../assets/icons/code.svg', import.meta.url).href,
  cpu: new URL('../assets/icons/cpu.svg', import.meta.url).href,
  database: new URL('../assets/icons/database.svg', import.meta.url).href,
  fileText: new URL('../assets/icons/file-text.svg', import.meta.url).href,
  flame: new URL('../assets/icons/flame.svg', import.meta.url).href,
  folder: new URL('../assets/icons/folder.svg', import.meta.url).href,
  gitBranch: new URL('../assets/icons/git-branch.svg', import.meta.url).href,
  gitMerge: new URL('../assets/icons/git-merge.svg', import.meta.url).href,
  heart: new URL('../assets/icons/heart.svg', import.meta.url).href,
  home: new URL('../assets/icons/home.svg', import.meta.url).href,
  inbox: new URL('../assets/icons/inbox.svg', import.meta.url).href,
  layers: new URL('../assets/icons/layers.svg', import.meta.url).href,
  layoutDashboard: new URL('../assets/icons/layout-dashboard.svg', import.meta.url).href,
  list: new URL('../assets/icons/list.svg', import.meta.url).href,
  lock: new URL('../assets/icons/lock.svg', import.meta.url).href,
  messagesSquare: new URL('../assets/icons/messages-square.svg', import.meta.url).href,
  play: new URL('../assets/icons/play.svg', import.meta.url).href,
  puzzle: new URL('../assets/icons/puzzle.svg', import.meta.url).href,
  repeat: new URL('../assets/icons/repeat.svg', import.meta.url).href,
  save: new URL('../assets/icons/save.svg', import.meta.url).href,
  server: new URL('../assets/icons/server.svg', import.meta.url).href,
  settings: new URL('../assets/icons/settings.svg', import.meta.url).href,
  sparkles: new URL('../assets/icons/sparkles.svg', import.meta.url).href,
  terminal: new URL('../assets/icons/terminal.svg', import.meta.url).href,
  toggleRight: new URL('../assets/icons/toggle-right.svg', import.meta.url).href,
  user: new URL('../assets/icons/user.svg', import.meta.url).href,
  wrench: new URL('../assets/icons/wrench.svg', import.meta.url).href,
  zap: new URL('../assets/icons/zap.svg', import.meta.url).href,
} as const;

type IconName = keyof typeof ICON_URLS;
type Tone = 'purple' | 'gold' | 'white';

const toneColor = (tone: Tone) => {
  if (tone === 'gold') {
    return ACCENT_GOLD;
  }

  if (tone === 'white') {
    return 'rgba(255,255,255,0.92)';
  }

  return ACCENT_PURPLE;
};

const rgba = (hex: string, alpha: number) => {
  const value = hex.replace('#', '');
  const normalized = value.length === 3
    ? value.split('').map((char) => char + char).join('')
    : value;
  const numeric = Number.parseInt(normalized, 16);
  const r = (numeric >> 16) & 255;
  const g = (numeric >> 8) & 255;
  const b = numeric & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const MaskedIcon: React.FC<{icon: IconName; size: number; tone?: Tone}> = ({
  icon,
  size,
  tone = 'white',
}) => {
  const iconUrl = ICON_URLS[icon];

  return (
    <div
      style={{
        width: size,
        height: size,
        background: toneColor(tone),
        WebkitMaskImage: `url(${iconUrl})`,
        WebkitMaskRepeat: 'no-repeat',
        WebkitMaskPosition: 'center',
        WebkitMaskSize: 'contain',
        maskImage: `url(${iconUrl})`,
        maskRepeat: 'no-repeat',
        maskPosition: 'center',
        maskSize: 'contain',
      }}
    />
  );
};

const GlowBlob: React.FC<{
  color?: string;
  width: number;
  height: number;
  top?: number | string;
  right?: number | string;
  bottom?: number | string;
  left?: number | string;
  opacity?: number;
}> = ({
  color = ACCENT_PURPLE,
  width,
  height,
  top,
  right,
  bottom,
  left,
  opacity = 0.22,
}) => (
  <div
    style={{
      position: 'absolute',
      top,
      right,
      bottom,
      left,
      width,
      height,
      borderRadius: '50%',
      background: `radial-gradient(circle, ${rgba(color, opacity)} 0%, ${rgba(color, opacity * 0.45)} 36%, transparent 76%)`,
      filter: 'blur(26px)',
    }}
  />
);

const IconBadge: React.FC<{
  icon: IconName;
  size?: number;
  badgeSize?: number;
  tone?: Tone;
  top?: number | string;
  right?: number | string;
  bottom?: number | string;
  left?: number | string;
  rotate?: number;
  delay?: number;
  opacity?: number;
}> = ({
  icon,
  size = 28,
  badgeSize = 82,
  tone = 'purple',
  top,
  right,
  bottom,
  left,
  rotate = 0,
  delay = 0,
  opacity = 1,
}) => {
  const frame = useCurrentFrame();
  const float = Math.sin((frame + delay * 8) / 18) * 8;
  const scale = 0.96 + spring({frame: Math.max(0, frame - delay), fps: 30, config: {damping: 18, stiffness: 90}}) * 0.06;
  const accent = toneColor(tone);

  return (
    <div
      style={{
        position: 'absolute',
        top,
        right,
        bottom,
        left,
        width: badgeSize,
        height: badgeSize,
        borderRadius: 26,
        border: `1px solid ${rgba(accent, 0.24)}`,
        background: `linear-gradient(180deg, ${rgba(accent, 0.16)} 0%, rgba(255,255,255,0.04) 100%)`,
        boxShadow: `0 16px 40px ${rgba(accent, 0.14)}`,
        backdropFilter: 'blur(18px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transform: `translateY(${float}px) rotate(${rotate}deg) scale(${scale})`,
        opacity,
      }}
    >
      <MaskedIcon icon={icon} size={size} tone={tone === 'white' ? 'white' : tone} />
    </div>
  );
};

const PanelWindow: React.FC<{
  width: number;
  height: number;
  top?: number | string;
  right?: number | string;
  bottom?: number | string;
  left?: number | string;
  tone?: Tone;
  title?: string;
  children: React.ReactNode;
  rotate?: number;
  opacity?: number;
}> = ({
  width,
  height,
  top,
  right,
  bottom,
  left,
  tone = 'purple',
  title,
  children,
  rotate = 0,
  opacity = 1,
}) => {
  const frame = useCurrentFrame();
  const drift = Math.sin(frame / 28) * 4;
  const accent = toneColor(tone);

  return (
    <div
      style={{
        position: 'absolute',
        top,
        right,
        bottom,
        left,
        width,
        height,
        borderRadius: 28,
        border: `1px solid ${rgba(accent, 0.18)}`,
        background: 'linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)',
        boxShadow: `0 20px 48px rgba(0,0,0,0.28), 0 0 46px ${rgba(accent, 0.12)}`,
        backdropFilter: 'blur(22px)',
        padding: 18,
        transform: `translateY(${drift}px) rotate(${rotate}deg)`,
        opacity,
        overflow: 'hidden',
      }}
    >
      <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14}}>
        <div style={{display: 'flex', gap: 7}}>
          {['rgba(255,255,255,0.75)', rgba(accent, 0.76), 'rgba(255,255,255,0.32)'].map((dot, index) => (
            <div
              key={`${dot}-${index}`}
              style={{width: 8, height: 8, borderRadius: 999, background: dot}}
            />
          ))}
        </div>
        {title ? (
          <div style={{fontSize: 14, fontWeight: 700, letterSpacing: 0.8, color: 'rgba(255,255,255,0.52)'}}>
            {title}
          </div>
        ) : null}
      </div>
      {children}
    </div>
  );
};

const BarRows: React.FC<{
  rows: number[];
  tone?: Tone;
  compact?: boolean;
}> = ({
  rows,
  tone = 'purple',
  compact = false,
}) => {
  const accent = toneColor(tone);

  return (
    <div style={{display: 'grid', gap: compact ? 8 : 10}}>
      {rows.map((width, index) => (
        <div
          key={`${width}-${index}`}
          style={{
            height: compact ? 10 : 12,
            width: `${width * 100}%`,
            borderRadius: 999,
            background: index === 0
              ? `linear-gradient(90deg, ${rgba(accent, 0.82)}, ${rgba(accent, 0.24)})`
              : `rgba(255,255,255,${index % 2 === 0 ? 0.12 : 0.08})`,
          }}
        />
      ))}
    </div>
  );
};

const IconTrail: React.FC<{
  icons: IconName[];
  tone?: Tone;
  top?: number | string;
  right?: number | string;
  bottom?: number | string;
  left?: number | string;
}> = ({
  icons,
  tone = 'purple',
  top,
  right,
  bottom,
  left,
}) => {
  const accent = toneColor(tone);

  return (
    <div
      style={{
        position: 'absolute',
        top,
        right,
        bottom,
        left,
        display: 'flex',
        gap: 16,
        alignItems: 'center',
      }}
    >
      {icons.map((icon, index) => (
        <React.Fragment key={`${icon}-${index}`}>
          <div
            style={{
              width: 54,
              height: 54,
              borderRadius: 18,
              border: `1px solid ${rgba(accent, index === 0 ? 0.24 : 0.16)}`,
              background: `rgba(255,255,255,${index === 0 ? 0.07 : 0.04})`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: `0 12px 26px ${rgba(accent, 0.1)}`,
            }}
          >
            <MaskedIcon icon={icon} size={22} tone={index === 0 ? tone : 'white'} />
          </div>
          {index < icons.length - 1 ? (
            <div
              style={{
                width: 42,
                height: 2,
                borderRadius: 999,
                background: `linear-gradient(90deg, ${rgba(accent, 0.42)}, rgba(255,255,255,0.12))`,
              }}
            />
          ) : null}
        </React.Fragment>
      ))}
    </div>
  );
};

const QueueLanes: React.FC = () => (
  <div
    style={{
      position: 'absolute',
      left: 140,
      right: 140,
      bottom: 260,
      display: 'grid',
      gap: 18,
      opacity: 0.86,
    }}
  >
    {[0, 1].map((lane) => (
      <div
        key={lane}
        style={{
          height: 64,
          borderRadius: 22,
          border: `1px solid ${rgba(ACCENT_PURPLE, lane === 0 ? 0.22 : 0.12)}`,
          background: `linear-gradient(90deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))`,
          display: 'flex',
          alignItems: 'center',
          padding: '0 22px',
          gap: 14,
        }}
      >
        <MaskedIcon icon={lane === 0 ? 'messagesSquare' : 'lock'} size={22} tone={lane === 0 ? 'purple' : 'gold'} />
        <div style={{display: 'flex', gap: 14, alignItems: 'center', flex: 1}}>
          {[0.18, 0.32, 0.2].map((alpha, index) => (
            <div
              key={`${alpha}-${index}`}
              style={{
                width: lane === 0 && index === 1 ? 180 : 110,
                height: 14,
                borderRadius: 999,
                background: lane === 0 && index === 1
                  ? `linear-gradient(90deg, ${rgba(ACCENT_GOLD, 0.72)}, ${rgba(ACCENT_GOLD, 0.18)})`
                  : `rgba(255,255,255,${alpha})`,
              }}
            />
          ))}
        </div>
      </div>
    ))}
  </div>
);

const PlatformMap: React.FC = () => (
  <div
    style={{
      position: 'absolute',
      inset: 'auto 140px 220px 140px',
      height: 300,
    }}
  >
    <GlowBlob left={260} top={78} width={260} height={160} opacity={0.14} />
    <div
      style={{
        position: 'absolute',
        left: 280,
        top: 72,
        width: 240,
        height: 140,
        borderRadius: 28,
        border: `1px solid ${rgba(ACCENT_PURPLE, 0.2)}`,
        background: 'linear-gradient(180deg, rgba(255,255,255,0.07), rgba(255,255,255,0.03))',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div style={{display: 'grid', justifyItems: 'center', gap: 12}}>
        <MaskedIcon icon="server" size={34} tone="purple" />
        <div style={{fontSize: 18, color: 'rgba(255,255,255,0.64)', letterSpacing: 1.2}}>gateway / main agent</div>
      </div>
    </div>
    {[
      {icon: 'user' as const, left: 78, top: 0},
      {icon: 'folder' as const, left: 40, top: 186},
      {icon: 'gitMerge' as const, right: 42, top: 24},
      {icon: 'layers' as const, right: 94, bottom: 10},
    ].map((node, index) => (
      <div
        key={`${node.icon}-${index}`}
        style={{
          position: 'absolute',
          left: node.left,
          right: node.right,
          top: node.top,
          bottom: node.bottom,
          width: 92,
          height: 92,
          borderRadius: 26,
          border: `1px solid ${rgba(index % 2 === 0 ? ACCENT_GOLD : ACCENT_PURPLE, 0.22)}`,
          background: 'rgba(255,255,255,0.05)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <MaskedIcon icon={node.icon} size={30} tone={index % 2 === 0 ? 'gold' : 'purple'} />
      </div>
    ))}
    {[
      {left: 170, top: 74, width: 138, rotate: 12},
      {left: 182, top: 198, width: 116, rotate: -10},
      {left: 520, top: 86, width: 124, rotate: -11},
      {left: 494, top: 210, width: 110, rotate: 13},
    ].map((line, index) => (
      <div
        key={`${line.left}-${line.top}-${index}`}
        style={{
          position: 'absolute',
          left: line.left,
          top: line.top,
          width: line.width,
          height: 2,
          borderRadius: 999,
          background: `linear-gradient(90deg, ${rgba(ACCENT_PURPLE, 0.42)}, ${rgba(ACCENT_GOLD, 0.14)})`,
          transform: `rotate(${line.rotate}deg)`,
          transformOrigin: '0 50%',
        }}
      />
    ))}
  </div>
);

const SummaryStack: React.FC = () => (
  <div
    style={{
      position: 'absolute',
      left: 200,
      right: 200,
      bottom: 260,
      display: 'grid',
      gap: 14,
      opacity: 0.82,
    }}
  >
    {[0.92, 0.78, 0.62, 0.48].map((width, index) => (
      <div
        key={`${width}-${index}`}
        style={{
          justifySelf: 'center',
          width: `${width * 100}%`,
          height: 42,
          borderRadius: 18,
          background: index === 0
            ? `linear-gradient(90deg, ${rgba(ACCENT_GOLD, 0.42)}, ${rgba(ACCENT_PURPLE, 0.28)})`
            : `linear-gradient(90deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03))`,
          border: `1px solid ${rgba(index < 2 ? ACCENT_PURPLE : ACCENT_GOLD, 0.16)}`,
        }}
      />
    ))}
  </div>
);

export const ShotVisualAccent: React.FC<{shotId: string}> = ({shotId}) => {
  switch (shotId) {
    case 'shot-01':
      return (
        <AbsoluteFill style={{pointerEvents: 'none', overflow: 'hidden'}}>
          <GlowBlob left={140} top={250} width={320} height={220} opacity={0.18} />
          <GlowBlob right={120} bottom={290} width={280} height={200} color={ACCENT_GOLD} opacity={0.16} />
          <IconBadge icon="sparkles" tone="gold" left={110} bottom={320} badgeSize={86} size={32} rotate={-10} />
          <IconBadge icon="flame" tone="purple" right={120} bottom={360} badgeSize={80} size={30} rotate={10} delay={6} />
        </AbsoluteFill>
      );
    case 'shot-02':
      return (
        <AbsoluteFill style={{pointerEvents: 'none', overflow: 'hidden'}}>
          <GlowBlob left={220} bottom={340} width={520} height={160} opacity={0.12} />
          <IconTrail icons={['terminal', 'layers', 'sparkles']} tone="purple" left={250} bottom={230} />
        </AbsoluteFill>
      );
    case 'shot-03':
      return (
        <AbsoluteFill style={{pointerEvents: 'none', overflow: 'hidden'}}>
          <GlowBlob left={240} bottom={460} width={580} height={180} opacity={0.12} />
          <IconTrail icons={['terminal', 'play', 'server', 'layoutDashboard']} tone="gold" left={182} bottom={230} />
        </AbsoluteFill>
      );
    case 'shot-04':
      return (
        <AbsoluteFill style={{pointerEvents: 'none', overflow: 'hidden'}}>
          <GlowBlob left={96} bottom={320} width={250} height={250} opacity={0.12} />
          <GlowBlob right={90} bottom={260} width={300} height={240} color={ACCENT_GOLD} opacity={0.12} />
          <PanelWindow width={248} height={188} left={88} bottom={210} title="terminal" tone="purple" rotate={-3} opacity={0.9}>
            <BarRows rows={[0.72, 0.46, 0.64, 0.34]} compact />
          </PanelWindow>
          <PanelWindow width={284} height={204} right={80} bottom={194} title="dashboard" tone="gold" rotate={3} opacity={0.92}>
            <div style={{display: 'grid', gap: 12}}>
              <div style={{display: 'grid', gridTemplateColumns: '1.1fr 0.8fr', gap: 10}}>
                <div style={{height: 62, borderRadius: 18, background: 'rgba(255,255,255,0.08)'}} />
                <div style={{height: 62, borderRadius: 18, background: rgba(ACCENT_GOLD, 0.16)}} />
              </div>
              <BarRows rows={[0.88, 0.52, 0.76]} compact />
            </div>
          </PanelWindow>
        </AbsoluteFill>
      );
    case 'shot-5a':
      return (
        <AbsoluteFill style={{pointerEvents: 'none', overflow: 'hidden'}}>
          <GlowBlob left={300} bottom={300} width={420} height={220} opacity={0.14} />
          <IconBadge icon="folder" tone="gold" left={490} bottom={250} badgeSize={124} size={46} />
          <IconBadge icon="home" tone="purple" left={350} bottom={300} badgeSize={74} size={24} rotate={-8} delay={4} opacity={0.92} />
          <IconBadge icon="fileText" tone="white" left={640} bottom={320} badgeSize={68} size={22} rotate={8} delay={8} opacity={0.88} />
          <IconBadge icon="layers" tone="purple" left={560} bottom={160} badgeSize={70} size={24} rotate={-6} delay={12} opacity={0.88} />
        </AbsoluteFill>
      );
    case 'shot-5b':
      return (
        <AbsoluteFill style={{pointerEvents: 'none', overflow: 'hidden'}}>
          <GlowBlob right={60} bottom={180} width={300} height={260} opacity={0.12} />
          <IconBadge icon="folder" tone="purple" right={86} bottom={240} badgeSize={96} size={34} rotate={6} opacity={0.9} />
          <IconBadge icon="database" tone="gold" left={90} bottom={220} badgeSize={78} size={28} rotate={-8} delay={6} opacity={0.82} />
        </AbsoluteFill>
      );
    case 'shot-5c':
      return (
        <AbsoluteFill style={{pointerEvents: 'none', overflow: 'hidden'}}>
          <GlowBlob left={150} bottom={300} width={280} height={220} opacity={0.12} />
          <GlowBlob right={130} bottom={320} width={260} height={220} color={ACCENT_GOLD} opacity={0.1} />
          <IconBadge icon="code" tone="purple" left={120} bottom={240} badgeSize={84} size={30} rotate={-8} />
          <IconBadge icon="arrowRight" tone="gold" left={498} bottom={220} badgeSize={76} size={24} delay={8} />
          <IconBadge icon="fileText" tone="gold" right={120} bottom={250} badgeSize={82} size={30} rotate={7} />
        </AbsoluteFill>
      );
    case 'shot-6a':
      return (
        <AbsoluteFill style={{pointerEvents: 'none', overflow: 'hidden'}}>
          <GlowBlob left={180} bottom={330} width={680} height={170} opacity={0.12} />
          <IconTrail icons={['inbox', 'layers', 'cpu', 'wrench', 'zap', 'save']} tone="purple" left={84} bottom={220} />
        </AbsoluteFill>
      );
    case 'shot-6b':
      return (
        <AbsoluteFill style={{pointerEvents: 'none', overflow: 'hidden'}}>
          <GlowBlob left={220} bottom={260} width={560} height={220} opacity={0.1} />
          <QueueLanes />
          <IconBadge icon="repeat" tone="purple" right={110} bottom={180} badgeSize={76} size={24} delay={10} />
        </AbsoluteFill>
      );
    case 'shot-7a':
      return (
        <AbsoluteFill style={{pointerEvents: 'none', overflow: 'hidden'}}>
          <PlatformMap />
        </AbsoluteFill>
      );
    case 'shot-7b':
      return (
        <AbsoluteFill style={{pointerEvents: 'none', overflow: 'hidden'}}>
          <GlowBlob left={90} bottom={250} width={320} height={240} opacity={0.12} />
          <GlowBlob right={90} bottom={250} width={320} height={240} color={ACCENT_GOLD} opacity={0.1} />
          <PanelWindow width={280} height={214} left={88} bottom={180} title="config.json" tone="purple" rotate={-3} opacity={0.92}>
            <BarRows rows={[0.62, 0.48, 0.72, 0.54, 0.4]} compact />
          </PanelWindow>
          <PanelWindow width={264} height={214} right={92} bottom={186} title="allowed tools" tone="gold" rotate={3} opacity={0.92}>
            <div style={{display: 'grid', gap: 11}}>
              {[
                ['puzzle', 'plugin tools'],
                ['toggleRight', 'optional'],
                ['list', 'allowlist'],
              ].map(([icon, label], index) => (
                <div
                  key={`${label}-${index}`}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '28px 1fr auto',
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  <MaskedIcon icon={icon as IconName} size={20} tone={index === 1 ? 'gold' : 'purple'} />
                  <div style={{height: 10, borderRadius: 999, background: 'rgba(255,255,255,0.12)'}} />
                  <div style={{fontSize: 13, color: 'rgba(255,255,255,0.58)'}}>{label}</div>
                </div>
              ))}
            </div>
          </PanelWindow>
        </AbsoluteFill>
      );
    case 'shot-08':
      return (
        <AbsoluteFill style={{pointerEvents: 'none', overflow: 'hidden'}}>
          <GlowBlob left={180} bottom={260} width={720} height={260} opacity={0.12} />
          <SummaryStack />
          <IconBadge icon="gitBranch" tone="purple" left={150} bottom={210} badgeSize={76} size={26} rotate={-8} />
          <IconBadge icon="checkCircle" tone="gold" right={150} bottom={214} badgeSize={76} size={26} rotate={8} delay={8} />
        </AbsoluteFill>
      );
    case 'shot-09':
      return (
        <AbsoluteFill style={{pointerEvents: 'none', overflow: 'hidden'}}>
          <GlowBlob left={280} bottom={290} width={520} height={220} opacity={0.1} />
          <IconTrail icons={['sparkles', 'arrowRight']} tone="gold" left={370} bottom={220} />
        </AbsoluteFill>
      );
    default:
      return null;
  }
};
