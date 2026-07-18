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
import {resolveSkillBeats, SUMMARY_ICONS, VARIANT_ICON} from './beatRegistry';
import {ChapterTransitionOverlay, DeterministicMotionField, SemanticBeatOverlay, SemanticIcon} from './SemanticLayers';
import {productIconPath, SUMMARY_PRODUCT_ICONS, type ProductIconKey} from './productIcons';
import type {SkillIconKey, SkillShowcaseBeat, SkillShowcaseProps, SkillShowcaseVariant} from './types';

export type {SkillBeatAction, SkillIconKey, SkillShowcaseBeat, SkillShowcaseProps, SkillShowcaseVariant} from './types';

const FONT = '"PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", Inter, system-ui, sans-serif';
const MONO = '"SFMono-Regular", "JetBrains Mono", Menlo, Consolas, monospace';
const PALETTE = ['#45e28d', '#5f7dff', '#ffc44d', '#ff5f91', '#20d9e8', '#9a7cff'];

const clamp = {
  extrapolateLeft: 'clamp' as const,
  extrapolateRight: 'clamp' as const,
};

const reveal = (frame: number, from: number, duration = 18) => interpolate(
  frame,
  [from, from + duration],
  [0, 1],
  {...clamp, easing: Easing.bezier(0.16, 1, 0.3, 1)},
);

const enterStyle = (progress: number, distance = 34): React.CSSProperties => ({
  opacity: progress,
  transform: `translateY(${interpolate(progress, [0, 1], [distance, 0])}px)`,
});

const VARIANT_PRODUCT_ICON: Record<SkillShowcaseVariant, ProductIconKey> = {
  intro: 'workbuddy',
  overview: 'workbuddy',
  coding: 'coding',
  remotion: 'remotion',
  ppt: 'ppt',
  illustration: 'illustration',
  hyperframes: 'hyperframes',
  ui: 'ui',
  outro: 'workbuddy',
};

const ProductIcon: React.FC<{
  icon: ProductIconKey;
  accent: string;
  size?: number;
  glow?: boolean;
  floatSeed?: number;
  floatDelay?: number;
  floatStrength?: number;
}> = ({
  icon,
  accent,
  size = 64,
  glow = true,
  floatSeed = 0,
  floatDelay = 0,
  floatStrength = 1,
}) => {
  const frame = useCurrentFrame();
  const age = Math.max(0, frame - floatDelay);
  const settle = interpolate(age, [0, 18], [0, 1], clamp);
  const phase = age / 42 + floatSeed * 0.77;
  const driftX = Math.sin(phase) * 2.8 * floatStrength * settle;
  const driftY = Math.cos(phase * 0.86) * 3.6 * floatStrength * settle;
  const rotate = Math.sin(phase * 0.72) * 1.6 * floatStrength * settle;
  const pulse = 0.5 + Math.sin(phase * 1.18) * 0.5;
  const liftShadow = glow
    ? `0 0 ${Math.round(size * (0.42 + pulse * 0.18))}px ${accent}66, 0 ${Math.round(size * 0.16)}px ${Math.round(size * 0.34)}px rgba(0,0,0,0.3)`
    : `0 0 ${Math.round(size * (0.18 + pulse * 0.08))}px ${accent}36`;

  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: Math.max(10, size * 0.22),
      overflow: 'hidden',
      flex: `0 0 ${size}px`,
      boxShadow: liftShadow,
      background: 'rgba(255,255,255,0.08)',
      transform: `translate3d(${driftX}px, ${driftY}px, 0) rotate(${rotate}deg)`,
      willChange: 'transform',
    }}>
      <Img
        src={staticFile(productIconPath(icon))}
        alt=""
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transform: `scale(${1 + pulse * 0.012 * floatStrength})`,
        }}
      />
    </div>
  );
};

const WorkBuddyMark: React.FC<{accent: string; size?: number}> = ({accent, size = 68}) => (
  <ProductIcon icon="workbuddy" accent={accent} size={size} floatSeed={0.2} floatStrength={0.75} />
);

const Backdrop: React.FC<{accent: string; secondary: string; frame: number}> = ({accent, secondary, frame}) => {
  const drift = interpolate(frame, [0, 360], [0, 90], clamp);
  return (
    <AbsoluteFill style={{background: '#070a12'}}>
      <AbsoluteFill style={{
        backgroundImage: [
          `linear-gradient(118deg, transparent 0 46%, ${accent}12 46% 47%, transparent 47% 100%)`,
          `linear-gradient(22deg, transparent 0 66%, ${secondary}10 66% 67%, transparent 67% 100%)`,
          'linear-gradient(rgba(255,255,255,0.026) 1px, transparent 1px)',
          'linear-gradient(90deg, rgba(255,255,255,0.026) 1px, transparent 1px)',
        ].join(', '),
        backgroundSize: 'auto, auto, 64px 64px, 64px 64px',
        backgroundPosition: `${drift}px 0, ${-drift * 0.5}px 0, 0 0, 0 0`,
      }} />
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 18,
        background: `linear-gradient(90deg, ${accent}, ${secondary}, transparent 75%)`,
        opacity: 0.9,
      }} />
      <AbsoluteFill style={{
        background: 'linear-gradient(180deg, rgba(7,10,18,0.02) 0%, rgba(7,10,18,0.22) 52%, rgba(7,10,18,0.9) 100%)',
      }} />
    </AbsoluteFill>
  );
};

const ProgressRail: React.FC<{active: number}> = ({active}) => (
  <div style={{
    position: 'absolute',
    top: 78,
    left: 76,
    right: 76,
    display: 'grid',
    gridTemplateColumns: 'repeat(6, 1fr)',
    gap: 8,
  }}>
    {PALETTE.map((color, index) => (
      <div key={color} style={{height: index === active ? 6 : 3, background: color, opacity: index <= active ? 1 : 0.25}} />
    ))}
  </div>
);

const SectionHeader: React.FC<{
  index?: string;
  title: string;
  subtitle?: string;
  accent: string;
  frame: number;
  active: number;
  icon: SkillIconKey;
  productIcon: ProductIconKey;
}> = ({index, title, subtitle, accent, frame, active, icon, productIcon}) => {
  const p = reveal(frame, 2, 16);
  return (
    <>
      <ProgressRail active={active} />
      <div style={{
        position: 'absolute',
        top: 124,
        left: 76,
        right: 76,
        display: 'flex',
        alignItems: 'center',
        gap: 18,
        ...enterStyle(p, 20),
      }}>
        {index ? (
          <div style={{
            width: 62,
            height: 62,
            borderRadius: '50%',
            border: `2px solid ${accent}`,
            background: `${accent}14`,
            color: accent,
            fontSize: 23,
            fontWeight: 900,
            display: 'grid',
            placeItems: 'center',
            boxShadow: `0 0 24px ${accent}33`,
          }}>
            {index}
          </div>
        ) : null}
        <ProductIcon icon={productIcon} accent={accent} size={58} floatSeed={active + 0.3} floatDelay={18} floatStrength={0.72} />
        <SemanticIcon icon={icon} color={accent} size={30} framed />
        <div style={{minWidth: 0}}>
          <div style={{fontSize: 38, lineHeight: 1.05, fontWeight: 900, color: '#f7f9ff'}}>{title}</div>
          {subtitle ? <div style={{fontSize: 18, marginTop: 8, color: 'rgba(235,240,255,0.52)', fontWeight: 700}}>{subtitle}</div> : null}
        </div>
      </div>
    </>
  );
};

const Chip: React.FC<{
  children: React.ReactNode;
  color: string;
  progress: number;
  icon?: SkillIconKey;
  productIcon?: ProductIconKey;
  floatSeed?: number;
}> = ({children, color, progress, icon, productIcon, floatSeed = 0}) => (
  <div style={{
    ...enterStyle(progress, 22),
    minHeight: 56,
    padding: '13px 18px',
    borderRadius: 6,
    border: `1px solid ${color}70`,
    background: `${color}12`,
    color: '#f6f8ff',
    fontSize: 22,
    fontWeight: 800,
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  }}>
    {productIcon ? <ProductIcon icon={productIcon} accent={color} size={34} glow={false} floatSeed={floatSeed} floatDelay={10} floatStrength={0.68} /> : null}
    {!productIcon && icon ? <SemanticIcon icon={icon} color={color} size={21} /> : null}
    {!productIcon && !icon ? <span style={{width: 8, height: 8, borderRadius: '50%', background: color, boxShadow: `0 0 12px ${color}`}} /> : null}
    {children}
  </div>
);

const IntroVisual: React.FC<{frame: number; accent: string; labels: string[]}> = ({frame, accent, labels}) => {
  const p1 = reveal(frame, 4, 18);
  const p2 = reveal(frame, 16, 20);
  const cursor = frame % 24 < 14;
  return (
    <AbsoluteFill style={{padding: '170px 76px 270px', justifyContent: 'center'}}>
      <div style={{display: 'flex', alignItems: 'center', gap: 20, ...enterStyle(p1, 26)}}>
        <WorkBuddyMark accent={accent} size={64} />
        <div style={{fontSize: 38, fontWeight: 900, color: '#fff'}}>Work<span style={{color: accent}}>Buddy</span></div>
        <div style={{marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10}}>
          {SUMMARY_PRODUCT_ICONS.slice(0, 3).map((icon, index) => (
            <ProductIcon key={icon} icon={icon} accent={PALETTE[index]} size={44} glow floatSeed={index + 1} floatDelay={18 + index * 5} floatStrength={0.9} />
          ))}
        </div>
      </div>
      <div style={{marginTop: 118, ...enterStyle(p2, 42)}}>
        <div style={{fontSize: 34, color: 'rgba(255,255,255,0.72)', fontWeight: 700}}>装上这几个</div>
        <div style={{display: 'flex', alignItems: 'flex-end', marginTop: 12}}>
          <div style={{fontSize: 150, lineHeight: 0.92, fontWeight: 950, color: '#eef3ff'}}>Skill</div>
          <div style={{width: 10, height: 126, marginLeft: 12, background: accent, opacity: cursor ? 1 : 0.18}} />
        </div>
        <div style={{height: 8, width: 360, marginTop: 28, background: `linear-gradient(90deg, ${accent}, #5f7dff, transparent)`}} />
        <div style={{marginTop: 42, fontSize: 34, lineHeight: 1.35, color: '#fff', fontWeight: 800}}>它才算真正的好帮手。</div>
      </div>
      <div style={{display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 82}}>
        {labels.slice(0, 4).map((label, index) => (
          <Chip key={label} color={PALETTE[index]} progress={reveal(frame, 34 + index * 6, 14)} icon={SUMMARY_ICONS[index]} productIcon={SUMMARY_PRODUCT_ICONS[index]} floatSeed={index + 2}>{label}</Chip>
        ))}
      </div>
    </AbsoluteFill>
  );
};

const OverviewVisual: React.FC<{frame: number; accent: string; labels: string[]}> = ({frame, accent, labels}) => {
  const title = reveal(frame, 2, 18);
  return (
    <AbsoluteFill style={{padding: '210px 76px 280px'}}>
      <div style={{...enterStyle(title, 28), marginTop: 120}}>
        <div style={{fontSize: 32, color: 'rgba(255,255,255,0.66)', fontWeight: 700}}>我一直在用的</div>
        <div style={{fontSize: 92, lineHeight: 1, color: '#fff', fontWeight: 950, marginTop: 14}}>几个 <span style={{color: accent}}>Skill</span></div>
      </div>
      <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 72}}>
        {labels.slice(0, 6).map((label, index) => (
          <Chip key={label} color={PALETTE[index]} progress={reveal(frame, 18 + index * 5, 16)} icon={SUMMARY_ICONS[index]} productIcon={SUMMARY_PRODUCT_ICONS[index]} floatSeed={index + 3}>{label}</Chip>
        ))}
      </div>
      <div style={{display: 'flex', alignItems: 'center', gap: 18, marginTop: 'auto', ...enterStyle(reveal(frame, 52, 18), 20)}}>
        <WorkBuddyMark accent={accent} size={68} />
        <div style={{fontSize: 28, fontWeight: 800, color: 'rgba(255,255,255,0.72)'}}>今天，一次分享给你。</div>
      </div>
    </AbsoluteFill>
  );
};

const CodingVisual: React.FC<{frame: number; accent: string; bullets: string[]; activeBeat?: SkillShowcaseBeat}> = ({frame, accent, bullets, activeBeat}) => {
  const safeBullets = bullets.length ? bullets : ['先讲清假设', '只做最小改动', '不碰无关文件', '改完自己验证'];
  const badRows = ['乱猜需求', '瞎加抽象', '顺手改无关文件', '不做验证'];
  const keyword = activeBeat?.keyword ?? '';
  const activeBad = keyword === '最大毛病' ? [0, 1] : keyword === '无关改动' ? [2] : [];
  const activeGood = keyword === '讲清假设' ? 0 : keyword === '最小改动' ? 1 : keyword === '自己验证' ? 3 : -1;
  return (
    <AbsoluteFill style={{padding: '270px 76px 285px'}}>
      <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginTop: 70}}>
        <div style={{border: '1px solid rgba(255,95,120,0.35)', borderRadius: 8, background: 'rgba(19,15,25,0.92)', overflow: 'hidden', ...enterStyle(reveal(frame, 10, 18), 24)}}>
          <div style={{padding: '16px 20px', color: '#ff6b82', borderBottom: '1px solid rgba(255,255,255,0.08)', fontSize: 18, fontWeight: 900, display: 'flex', alignItems: 'center', gap: 10}}><SemanticIcon icon="code" color="#ff6b82" size={20} />没有原则</div>
          {badRows.map((text, index) => (
            <div key={text} style={{
              padding: '18px 20px',
              fontSize: 21,
              color: activeBad.includes(index) ? '#fff' : 'rgba(255,255,255,0.56)',
              borderBottom: '1px solid rgba(255,255,255,0.05)',
              borderLeft: activeBad.includes(index) ? '5px solid #ff5f7a' : '5px solid transparent',
              background: activeBad.includes(index) ? 'rgba(255,95,122,0.16)' : 'transparent',
              opacity: reveal(frame, 20 + index * 5, 12),
              transform: `translateX(${activeBad.includes(index) ? 8 : 0}px)`,
            }}>× {text}</div>
          ))}
        </div>
        <div style={{border: `1px solid ${accent}70`, borderRadius: 8, background: 'rgba(10,25,20,0.92)', overflow: 'hidden', ...enterStyle(reveal(frame, 14, 18), 24)}}>
          <div style={{padding: '16px 20px', color: accent, borderBottom: '1px solid rgba(255,255,255,0.08)', fontSize: 18, fontWeight: 900, display: 'flex', alignItems: 'center', gap: 10}}><SemanticIcon icon="shield-check" color={accent} size={20} />装上 Skill</div>
          {safeBullets.slice(0, 4).map((text, index) => (
            <div key={text} style={{
              padding: '18px 20px',
              fontSize: 21,
              color: '#effff7',
              borderBottom: '1px solid rgba(255,255,255,0.05)',
              borderLeft: activeGood === index ? `5px solid ${accent}` : '5px solid transparent',
              background: activeGood === index ? `${accent}1f` : 'transparent',
              boxShadow: activeGood === index ? `inset 0 0 28px ${accent}14` : 'none',
              opacity: reveal(frame, 24 + index * 5, 12),
              transform: `translateX(${activeGood === index ? -8 : 0}px)`,
            }}>✓ {text}</div>
          ))}
        </div>
      </div>
      <div style={{marginTop: 34, border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, overflow: 'hidden', background: 'rgba(5,8,14,0.9)', ...enterStyle(reveal(frame, 48, 18), 26)}}>
        <div style={{height: 48, padding: '0 20px', display: 'flex', alignItems: 'center', gap: 9, borderBottom: '1px solid rgba(255,255,255,0.08)', fontFamily: MONO, fontSize: 15, color: 'rgba(255,255,255,0.42)'}}>
          <span style={{width: 10, height: 10, borderRadius: '50%', background: '#ff5f57'}} />
          <span style={{width: 10, height: 10, borderRadius: '50%', background: '#febc2e'}} />
          <span style={{width: 10, height: 10, borderRadius: '50%', background: '#28c840'}} />
          <span style={{marginLeft: 8}}>AGENTS.md</span>
        </div>
        <div style={{padding: '22px 24px', fontFamily: MONO, fontSize: 20, lineHeight: 1.75}}>
          <div style={{color: 'rgba(255,255,255,0.42)'}}>$ codex fix --scope minimal</div>
          <div style={{color: accent}}>✓ assumptions stated</div>
          <div style={{color: accent, textShadow: ['最小改动', '自己验证'].includes(keyword) ? `0 0 18px ${accent}` : 'none'}}>✓ 3 files changed · 14 tests passed</div>
        </div>
      </div>
      <div style={{marginTop: 48, textAlign: 'center', fontSize: 38, color: '#fff', fontWeight: 950, ...enterStyle(reveal(frame, 70, 18), 20)}}>
        让 AI 写代码更<span style={{color: accent, textShadow: keyword === '更靠谱' ? `0 0 28px ${accent}` : 'none'}}>靠谱</span>
      </div>
    </AbsoluteFill>
  );
};

const RemotionVisual: React.FC<{frame: number; accent: string; activeBeat?: SkillShowcaseBeat}> = ({frame, accent, activeBeat}) => {
  const typed = 'const frame = useCurrentFrame();';
  const count = Math.round(interpolate(frame, [120, 190], [0, typed.length], clamp));
  const playhead = interpolate(frame, [198, 388], [0, 100], clamp);
  const keyword = activeBeat?.keyword ?? '';
  const activeStage = ['Remotion', '网页方式', 'React 代码'].includes(keyword) ? 0 : ['一帧画面', 'AI 读得懂'].includes(keyword) ? 1 : keyword === '渲染成片' ? 2 : 0;
  return (
    <AbsoluteFill style={{padding: '290px 76px 285px'}}>
      <div style={{marginTop: 60, border: '1px solid rgba(255,255,255,0.14)', borderRadius: 8, overflow: 'hidden', background: 'rgba(6,10,22,0.94)', ...enterStyle(reveal(frame, 8, 18), 24)}}>
        <div style={{height: 52, borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', padding: '0 20px', color: 'rgba(255,255,255,0.45)', fontFamily: MONO, fontSize: 16}}>SkillVideo.tsx</div>
        <div style={{padding: '28px 28px 32px', fontFamily: MONO, fontSize: 22, lineHeight: 1.8}}>
          <div><span style={{color: '#c792ea'}}>export const</span> <span style={{color: '#82aaff'}}>Scene</span> = () =&gt; {'{'}</div>
          <div style={{paddingLeft: 28, color: '#c3e88d'}}>{typed.slice(0, count)}<span style={{color: accent, opacity: frame % 20 < 12 ? 1 : 0}}>▌</span></div>
          <div style={{paddingLeft: 28}}><span style={{color: '#89ddff'}}>return</span> &lt;<span style={{color: '#f78c6c'}}>Sequence</span> <span style={{color: '#ffcb6b'}}>from</span>={'{0}'} /&gt;;</div>
          <div>{'}'};</div>
        </div>
      </div>
      <div style={{marginTop: 28, height: 180, border: `1px solid ${accent}4d`, borderRadius: 8, background: `${accent}0c`, position: 'relative', overflow: 'hidden', ...enterStyle(reveal(frame, 30, 18), 24)}}>
        <div style={{position: 'absolute', top: 18, left: 24, right: 24, height: 90, display: 'grid', gridTemplateColumns: '1fr 1.4fr 0.8fr', gap: 8}}>
          {(['braces', 'panels-top-left', 'play'] as SkillIconKey[]).map((icon, index) => (
            <div key={icon} style={{
              background: index === activeStage ? `${accent}30` : 'rgba(255,255,255,0.06)',
              border: `1px solid ${index === activeStage ? accent : 'rgba(255,255,255,0.1)'}`,
              boxShadow: index === activeStage ? `0 0 28px ${accent}22` : 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              color: index === activeStage ? accent : '#fff',
              fontSize: 22,
              fontWeight: 900,
              transform: `translateY(${index === activeStage ? -5 : 0}px)`,
            }}><SemanticIcon icon={icon} color={accent} size={22} />{['React', 'Frames', 'MP4'][index]}</div>
          ))}
        </div>
        <div style={{position: 'absolute', left: 24, right: 24, bottom: 25, height: 22, background: 'rgba(255,255,255,0.08)'}}>
          <div style={{height: '100%', width: `${playhead}%`, background: `linear-gradient(90deg, ${accent}, #8fa3ff)`}} />
          <div style={{position: 'absolute', left: `${playhead}%`, top: -8, width: 3, height: 38, background: '#fff'}} />
        </div>
      </div>
      <div style={{marginTop: 44, fontSize: 34, fontWeight: 900, textAlign: 'center', color: '#fff', ...enterStyle(reveal(frame, 56, 18), 20)}}>
        一段 React 代码，<span style={{color: accent}}>就是一帧画面</span>
      </div>
    </AbsoluteFill>
  );
};

const PptVisual: React.FC<{frame: number; accent: string; activeBeat?: SkillShowcaseBeat}> = ({frame, accent, activeBeat}) => {
  const bars = [0.56, 0.82, 0.68];
  const keyword = activeBeat?.keyword ?? '';
  const titleSelected = keyword === '原生对象';
  const chartSelected = ['形状图表连线', '全都能编辑'].includes(keyword);
  const footerSelected = keyword === '能改的 PPT';
  const imageLocked = keyword === '一张图片';
  return (
    <AbsoluteFill style={{padding: '280px 60px 285px'}}>
      <div style={{marginTop: 48, height: 820, border: '1px solid rgba(255,255,255,0.16)', borderRadius: 8, overflow: 'hidden', background: '#171921', boxShadow: '0 34px 90px rgba(0,0,0,0.45)', ...enterStyle(reveal(frame, 8, 18), 26)}}>
        <div style={{height: 54, background: '#2a2d38', display: 'flex', alignItems: 'center', padding: '0 18px', gap: 18, color: 'rgba(255,255,255,0.55)', fontSize: 16}}>
          <span style={{color: accent, fontWeight: 900}}>P</span><span>Home</span><span>Insert</span><span>Design</span><span>Animations</span>
        </div>
        <div style={{display: 'grid', gridTemplateColumns: '150px 1fr', height: 766}}>
          <div style={{background: '#20232c', padding: 14, display: 'flex', flexDirection: 'column', gap: 12}}>
            {[0, 1, 2].map((i) => <div key={i} style={{height: 88, background: i === 1 ? '#f4f0e8' : '#363a47', border: i === 1 ? `3px solid ${accent}` : '1px solid rgba(255,255,255,0.1)'}} />)}
          </div>
          <div style={{padding: 34, background: '#11131a', display: 'grid', placeItems: 'center'}}>
            <div style={{width: 730, height: 480, background: '#f4f0e8', color: '#18191f', position: 'relative', overflow: 'hidden'}}>
              <div style={{position: 'absolute', left: 42, top: 40, fontSize: 15, fontWeight: 900, color: '#b75b3f'}}>DESIGN SYSTEM / 06</div>
              <div style={{position: 'absolute', left: 34, top: 76, width: 316, padding: 8, fontSize: 42, lineHeight: 1.04, fontWeight: 950, border: titleSelected ? `2px solid ${accent}` : '2px solid transparent'}}>
                原生对象<br />继续编辑
                {titleSelected ? <span style={{position: 'absolute', right: -7, bottom: -7, width: 12, height: 12, background: accent}} /> : null}
              </div>
              <div style={{position: 'absolute', right: 42, top: 78, width: 300, height: 270, background: '#252a42', padding: '28px 24px', display: 'flex', alignItems: 'flex-end', gap: 22}}>
                {bars.map((height, index) => {
                  const grow = reveal(frame, 32 + index * 8, 22);
                  return <div key={height} style={{height: `${height * 100 * grow}%`, flex: 1, background: PALETTE[index + 1]}} />;
                })}
                <div style={{position: 'absolute', inset: -8, border: `2px solid ${accent}`, opacity: chartSelected ? 1 : reveal(frame, 62, 14) * 0.3, boxShadow: chartSelected ? `0 0 24px ${accent}55` : 'none'}}>
                  {[[0, 0], [50, 0], [100, 0], [0, 100], [50, 100], [100, 100]].map(([x, y]) => <span key={`${x}-${y}`} style={{position: 'absolute', left: `${x}%`, top: `${y}%`, width: 10, height: 10, background: '#fff', border: `2px solid ${accent}`, transform: 'translate(-50%, -50%)'}} />)}
                </div>
              </div>
              <div style={{position: 'absolute', left: 34, bottom: 36, padding: '8px 10px', fontSize: 18, fontWeight: 800, border: footerSelected ? `2px solid ${accent}` : '2px solid transparent'}}>形状 · 图表 · 连接线 · 全部可编辑</div>
              <div style={{position: 'absolute', right: 42, bottom: 42, width: 110, height: 5, background: accent}} />
              {imageLocked ? (
                <div style={{position: 'absolute', inset: 0, background: 'rgba(20,22,30,0.82)', display: 'grid', placeItems: 'center'}}>
                  <div style={{display: 'flex', alignItems: 'center', gap: 18, padding: '18px 26px', border: '2px solid #ff5f7a', color: '#fff', fontSize: 25, fontWeight: 950}}>
                    <SemanticIcon icon="image" color="#ff5f7a" size={34} />整页只是一张图片 · 无法编辑
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
      <div style={{marginTop: 34, textAlign: 'center', fontSize: 32, fontWeight: 900, color: '#fff', ...enterStyle(reveal(frame, 68, 18), 20)}}>
        交付的是<span style={{color: accent}}>能改的 PPT</span>
      </div>
    </AbsoluteFill>
  );
};

const IllustrationVisual: React.FC<{frame: number; accent: string; activeBeat?: SkillShowcaseBeat}> = ({frame, accent, activeBeat}) => {
  const keyword = activeBeat?.keyword ?? '';
  const focusedNode = keyword === '一个判断' ? 1 : keyword === '图文对不上' ? 0 : keyword === '纯白手绘' || keyword === '一看就懂' ? 2 : -1;
  const breakFocus = ['两个断点', '图文对不上'].includes(keyword);
  return (
  <AbsoluteFill style={{padding: '285px 58px 285px'}}>
    <div style={{marginTop: 70, height: 760, background: '#fffefa', borderRadius: 8, color: '#202020', padding: '42px 42px 36px', position: 'relative', transform: `rotate(${interpolate(reveal(frame, 8, 18), [0, 1], [-1.6, -0.35])}deg)`, opacity: reveal(frame, 6, 18), boxShadow: '0 30px 80px rgba(0,0,0,0.42)'}}>
      <div style={{fontSize: 23, color: '#d64a54', fontWeight: 900}}>为什么文章写完，没有结果？</div>
      <div style={{fontSize: 18, marginTop: 8, color: '#6d6d6d'}}>不是内容不够，而是中间断了两次。</div>
      <div style={{position: 'absolute', left: 56, right: 56, top: 240, height: 5, background: '#222', transform: 'rotate(-0.5deg)'}} />
      {[{x: 70, label: '素材', note: '写之前'}, {x: 355, label: '正文', note: '写作中'}, {x: 690, label: '承接', note: '写完后'}].map((node, index) => (
        <div key={node.label} style={{position: 'absolute', left: node.x, top: 186, width: 150, textAlign: 'center', opacity: reveal(frame, 22 + index * 12, 14), transform: `scale(${focusedNode === index ? 1.12 : 1})`}}>
          <div style={{height: 102, border: `4px solid ${focusedNode === index ? accent : '#222'}`, borderRadius: index === 1 ? '50%' : 6, display: 'grid', placeItems: 'center', background: index === 1 ? '#fff4b8' : '#fff', fontSize: 24, fontWeight: 950, transform: `rotate(${index === 0 ? -2 : index === 2 ? 2 : 0}deg)`, boxShadow: focusedNode === index ? `0 0 24px ${accent}66` : 'none'}}>{node.label}</div>
          <div style={{marginTop: 18, color: '#777', fontSize: 16}}>{node.note}</div>
        </div>
      ))}
      {[260, 595].map((x, index) => (
        <div key={x} style={{position: 'absolute', left: x, top: 210, width: 76, textAlign: 'center', opacity: reveal(frame, 38 + index * 18, 12), transform: `scale(${breakFocus ? 1.15 : 1})`}}>
          <div style={{height: 68, borderLeft: `5px dashed ${accent}`, transform: 'rotate(18deg)'}} />
          <div style={{color: accent, fontSize: 20, fontWeight: 950}}>断点 {index + 1}</div>
        </div>
      ))}
      <div style={{position: 'absolute', left: 70, right: 70, bottom: 84, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24}}>
        <div style={{border: '3px solid #202020', padding: '20px 22px', fontSize: 20, fontWeight: 850, transform: 'rotate(1deg)', opacity: reveal(frame, 64, 14)}}>先把素材变成判断</div>
        <div style={{border: '3px solid #202020', padding: '20px 22px', fontSize: 20, fontWeight: 850, transform: 'rotate(-1deg)', opacity: reveal(frame, 72, 14)}}>再给结论接上行动</div>
      </div>
    </div>
    <div style={{marginTop: 38, color: '#fff', textAlign: 'center', fontSize: 31, fontWeight: 900, ...enterStyle(reveal(frame, 82, 18), 20)}}>
      读懂正文，再画成<span style={{color: accent}}>一看就懂</span>的图
    </div>
  </AbsoluteFill>
  );
};

const HyperFramesVisual: React.FC<{frame: number; accent: string; activeBeat?: SkillShowcaseBeat}> = ({frame, accent, activeBeat}) => {
  const html = '<main><h1>Ship it.</h1></main>';
  const count = Math.round(interpolate(frame, [147, 200], [0, html.length], clamp));
  const loadedSkills = Math.round(interpolate(frame, [253, 310], [0, 24], clamp));
  const keyword = activeBeat?.keyword ?? '';
  const previewIcon: SkillIconKey = keyword === '专为 Agent' ? 'bot' : keyword === 'AI 变视频' ? 'wand-sparkles' : 'play';
  return (
    <AbsoluteFill style={{padding: '290px 70px 285px'}}>
      <div style={{marginTop: 46, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18}}>
        <div style={{height: 470, border: '1px solid rgba(255,255,255,0.14)', borderRadius: 8, background: '#0b1118', overflow: 'hidden', ...enterStyle(reveal(frame, 8, 18), 26)}}>
          <div style={{height: 48, padding: '0 18px', display: 'flex', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', fontFamily: MONO, fontSize: 14, color: 'rgba(255,255,255,0.45)'}}>scene.html</div>
          <div style={{padding: '26px 22px', fontFamily: MONO, fontSize: 21, lineHeight: 1.65, color: accent}}>{html.slice(0, count)}<span style={{color: '#fff', opacity: frame % 20 < 12 ? 1 : 0}}>▌</span></div>
        </div>
        <div style={{height: 470, border: `1px solid ${accent}75`, borderRadius: 8, background: `linear-gradient(145deg, ${accent}22, #131827 62%)`, position: 'relative', overflow: 'hidden', ...enterStyle(reveal(frame, 18, 18), 26)}}>
          <div style={{position: 'absolute', top: 24, left: 24, color: 'rgba(255,255,255,0.48)', fontSize: 15, fontWeight: 900}}>PREVIEW / FRAME {Math.round(frame)}</div>
          <div style={{position: 'absolute', inset: 0, display: 'grid', placeItems: 'center'}}>
            <div style={{width: 96, height: 96, borderRadius: '50%', border: `3px solid ${accent}`, display: 'grid', placeItems: 'center', boxShadow: `0 0 34px ${accent}44`, transform: `scale(${keyword === 'AI 变视频' ? 1.12 : 1})`}}><SemanticIcon icon={previewIcon} color={accent} size={42} /></div>
          </div>
          <div style={{position: 'absolute', left: 24, right: 24, bottom: 22, fontSize: 25, color: '#fff', fontWeight: 950}}>Ship it.</div>
        </div>
      </div>
      <div style={{marginTop: 30, display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 9, ...enterStyle(reveal(frame, 48, 18), 22)}}>
        {Array.from({length: 24}).map((_, index) => (
          <div key={index} style={{height: 52, border: `1px solid ${index < loadedSkills ? accent : 'rgba(255,255,255,0.13)'}`, background: index < loadedSkills ? `${accent}22` : 'rgba(255,255,255,0.025)', display: 'grid', placeItems: 'center', color: index < loadedSkills ? '#fff' : 'rgba(255,255,255,0.34)', boxShadow: index === loadedSkills - 1 ? `0 0 18px ${accent}55` : 'none', fontSize: 13}}>{String(index + 1).padStart(2, '0')}</div>
        ))}
      </div>
      <div style={{marginTop: 42, textAlign: 'center', fontSize: 32, fontWeight: 900, color: '#fff', ...enterStyle(reveal(frame, 72, 18), 18)}}>
        HTML 变视频 · <span style={{color: accent}}>20+ Skills 按需加载</span>
      </div>
    </AbsoluteFill>
  );
};

const UiVisual: React.FC<{frame: number; accent: string; activeBeat?: SkillShowcaseBeat}> = ({frame, accent, activeBeat}) => {
  const before = reveal(frame, 8, 18);
  const after = reveal(frame, 34, 20);
  const keyword = activeBeat?.keyword ?? '';
  const tokens: Array<{label: string; icon: SkillIconKey; keywords: string[]}> = [
    {label: 'TYPE', icon: 'type', keywords: ['排版']},
    {label: 'SPACE', icon: 'ruler', keywords: ['留白']},
    {label: 'COLOR', icon: 'swatch-book', keywords: ['配色', '设计立场']},
    {label: 'SYSTEM', icon: 'component', keywords: ['不是模板', '能用的设计']},
  ];
  return (
    <AbsoluteFill style={{padding: '285px 54px 285px'}}>
      <div style={{marginTop: 62, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18}}>
        <div style={{...enterStyle(before, 28)}}>
          <div style={{fontSize: 18, color: '#ff6d86', fontWeight: 900, marginBottom: 14}}>BEFORE · AI 塑料味</div>
          <div style={{height: 660, borderRadius: 8, background: 'linear-gradient(145deg, #7c3aed, #2563eb)', padding: 26, display: 'flex', flexDirection: 'column', gap: 18}}>
            <div style={{height: 38, width: '58%', background: 'rgba(255,255,255,0.88)', borderRadius: 20}} />
            <div style={{height: 180, borderRadius: 24, background: 'rgba(255,255,255,0.22)', border: '1px solid rgba(255,255,255,0.4)'}} />
            {[0, 1, 2].map((item) => <div key={item} style={{height: 90, borderRadius: 22, background: 'rgba(255,255,255,0.18)'}} />)}
            <div style={{height: 56, marginTop: 'auto', borderRadius: 28, background: '#fff', color: '#6d28d9', display: 'grid', placeItems: 'center', fontSize: 18, fontWeight: 900}}>Get Started</div>
          </div>
        </div>
        <div style={{...enterStyle(after, 28)}}>
          <div style={{fontSize: 18, color: accent, fontWeight: 900, marginBottom: 14}}>AFTER · 可上线设计</div>
          <div style={{height: 660, borderRadius: 8, background: '#f1efe8', color: '#151515', padding: '30px 28px', display: 'flex', flexDirection: 'column'}}>
            <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13, fontWeight: 900}}><span>ATELIER / 24</span><span>MENU</span></div>
            <div style={{marginTop: 78, fontSize: 49, lineHeight: 0.98, fontWeight: 950}}>Coffee for<br />slow mornings.</div>
            <div style={{marginTop: 30, width: 190, height: 5, background: accent}} />
            <div style={{marginTop: 28, fontSize: 16, lineHeight: 1.55, color: '#555'}}>安静、克制、有明确层级。<br />每个元素都有理由。</div>
            <div style={{marginTop: 'auto', height: 210, background: '#1c3028', position: 'relative', overflow: 'hidden'}}>
              <div style={{position: 'absolute', left: 34, bottom: 25, width: 128, height: 128, borderRadius: '50%', border: '16px solid #f3c95b'}} />
              <div style={{position: 'absolute', right: 28, top: 34, fontSize: 13, color: '#fff', fontWeight: 900}}>ROASTED<br />IN SMALL<br />BATCHES</div>
            </div>
          </div>
        </div>
      </div>
      <div style={{marginTop: 22, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8}}>
        {tokens.map((token, tokenIndex) => {
          const phasedToken = keyword === '排版·留白·配色'
            ? frame < 214 ? 0 : frame < 238 ? 1 : 2
            : -1;
          const active = token.keywords.includes(keyword) || tokenIndex === phasedToken;
          return (
            <div key={token.label} style={{height: 54, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, borderTop: `3px solid ${active ? accent : 'rgba(255,255,255,0.12)'}`, background: active ? `${accent}18` : 'rgba(255,255,255,0.025)', color: active ? '#fff' : 'rgba(255,255,255,0.4)', fontSize: 14, fontWeight: 950, transform: `translateY(${active ? -4 : 0}px)`}}>
              <SemanticIcon icon={token.icon} color={accent} size={18} />{token.label}
            </div>
          );
        })}
      </div>
      <div style={{marginTop: 24, textAlign: 'center', fontSize: 30, color: '#fff', fontWeight: 900, ...enterStyle(reveal(frame, 72, 18), 18)}}>
        不是模板，是一整套<span style={{color: accent}}>设计立场</span>
      </div>
    </AbsoluteFill>
  );
};

const OutroVisual: React.FC<{frame: number; accent: string; labels: string[]}> = ({frame, accent, labels}) => (
  <AbsoluteFill style={{padding: '230px 76px 260px', justifyContent: 'center'}}>
    <div style={{display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10, ...enterStyle(reveal(frame, 4, 18), 18)}}>
      {PALETTE.map((color) => <div key={color} style={{height: 7, background: color}} />)}
    </div>
    <div style={{marginTop: 76, color: 'rgba(255,255,255,0.58)', fontSize: 24, lineHeight: 1.6, ...enterStyle(reveal(frame, 14, 18), 24)}}>
      <div>以前：WorkBuddy 只能陪你聊天</div>
      <div>现在：6 个 Skill 让它真的干活</div>
    </div>
    <div style={{marginTop: 54, fontSize: 86, lineHeight: 1.05, color: '#fff', fontWeight: 950, ...enterStyle(reveal(frame, 28, 20), 34)}}>
      装上 <span style={{color: accent}}>Skill</span>，<br />WorkBuddy<br />才算好帮手。
    </div>
    <div style={{display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 54}}>
      {labels.slice(0, 6).map((label, index) => <Chip key={label} color={PALETTE[index]} progress={reveal(frame, 48 + index * 4, 14)} icon={SUMMARY_ICONS[index]} productIcon={SUMMARY_PRODUCT_ICONS[index]} floatSeed={index + 4}>{label}</Chip>)}
    </div>
    <div style={{marginTop: 58, display: 'flex', alignItems: 'center', gap: 22, ...enterStyle(reveal(frame, 78, 18), 22)}}>
      <WorkBuddyMark accent={accent} size={78} />
      <div>
        <div style={{fontSize: 30, color: '#fff', fontWeight: 950}}>评论区打个 “Skill”</div>
        <div style={{fontSize: 21, color: 'rgba(255,255,255,0.5)', marginTop: 7}}>我整理给你</div>
      </div>
    </div>
  </AbsoluteFill>
);

const activeIndexForVariant = (variant: SkillShowcaseVariant) => {
  const map: Record<SkillShowcaseVariant, number> = {
    intro: 0,
    overview: 0,
    coding: 0,
    remotion: 1,
    ppt: 2,
    illustration: 3,
    hyperframes: 4,
    ui: 5,
    outro: 5,
  };
  return map[variant];
};

export const SkillShowcase: React.FC<SkillShowcaseProps> = ({
  variant,
  title,
  subtitle,
  index,
  accent = '#20d9e8',
  secondaryAccent = '#7c67ff',
  bullets = [],
  labels = [],
  beats,
}) => {
  const frame = useCurrentFrame();
  const {width, height, fps} = useVideoConfig();
  const scale = Math.min(width / 1080, height / 1920);
  const active = activeIndexForVariant(variant);
  const resolvedBeats = resolveSkillBeats(variant, beats);
  const activeBeat = resolvedBeats.find((beat) => frame >= beat.startFrame && frame < beat.endFrame);

  const visual = (() => {
    switch (variant) {
      case 'intro': return <IntroVisual frame={frame} accent={accent} labels={labels} />;
      case 'overview': return <OverviewVisual frame={frame} accent={accent} labels={labels} />;
      case 'coding': return <CodingVisual frame={frame} accent={accent} bullets={bullets} activeBeat={activeBeat} />;
      case 'remotion': return <RemotionVisual frame={frame} accent={accent} activeBeat={activeBeat} />;
      case 'ppt': return <PptVisual frame={frame} accent={accent} activeBeat={activeBeat} />;
      case 'illustration': return <IllustrationVisual frame={frame} accent={accent} activeBeat={activeBeat} />;
      case 'hyperframes': return <HyperFramesVisual frame={frame} accent={accent} activeBeat={activeBeat} />;
      case 'ui': return <UiVisual frame={frame} accent={accent} activeBeat={activeBeat} />;
      case 'outro': return <OutroVisual frame={frame} accent={accent} labels={labels} />;
    }
  })();

  const showHeader = !['intro', 'overview', 'outro'].includes(variant);

  return (
    <AbsoluteFill style={{background: '#070a12', overflow: 'hidden', fontFamily: FONT}}>
      <Backdrop accent={accent} secondary={secondaryAccent} frame={frame} />
      <div style={{position: 'absolute', width: 1080, height: 1920, left: '50%', top: '50%', transform: `translate(-50%, -50%) scale(${scale})`}}>
        <DeterministicMotionField frame={frame} fps={fps} accent={accent} secondary={secondaryAccent} beats={resolvedBeats} />
        {showHeader ? <SectionHeader index={index} title={title} subtitle={subtitle} accent={accent} frame={frame} active={active} icon={VARIANT_ICON[variant]} productIcon={VARIANT_PRODUCT_ICON[variant]} /> : null}
        {visual}
        <SemanticBeatOverlay frame={frame} beats={resolvedBeats} accent={accent} />
        {showHeader ? <ChapterTransitionOverlay frame={frame} accent={accent} secondary={secondaryAccent} icon={VARIANT_ICON[variant]} index={index} title={title} /> : null}
      </div>
    </AbsoluteFill>
  );
};
