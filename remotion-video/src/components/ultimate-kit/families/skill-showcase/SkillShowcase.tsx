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
const SAFE = {
  headerTop: 84,
  headerBottom: 210,
  bodyTop: 240,
  bodyBottom: 1050,
  beatTop: 1080,
  beatBottom: 1480,
  captionTop: 1630,
  captionBottom: 1810,
};

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
  impeccable: 'impeccable',
  'frontend-design': 'frontend-design',
  'ux-pro': 'ux-pro',
  'cloud-design': 'cloud-design',
  generic: 'generic-ai',
};

const iconAt = <T,>(items: readonly T[] | undefined, index: number, fallback: readonly T[]): T =>
  items?.[index] ?? fallback[index % fallback.length];

const readableSize = (text: string, large = 108) => {
  const length = text.replace(/\s+/g, '').length;
  if (length > 26) return Math.round(large * 0.48);
  if (length > 18) return Math.round(large * 0.58);
  if (length > 12) return Math.round(large * 0.72);
  return large;
};

const splitLeadLines = (text?: string): string[] => {
  if (!text) return [];
  return text
    .split(/[。；;]\s*/u)
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 2);
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

const BrandMark: React.FC<{accent: string; icon: ProductIconKey; size?: number}> = ({accent, icon, size = 68}) => (
  <ProductIcon icon={icon} accent={accent} size={size} floatSeed={0.2} floatStrength={0.75} />
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

const ProgressRail: React.FC<{active: number; total?: number}> = ({active, total = PALETTE.length}) => (
  <div style={{
    position: 'absolute',
    top: SAFE.headerTop,
    left: 76,
    right: 76,
    display: 'grid',
    gridTemplateColumns: `repeat(${Math.max(1, total)}, 1fr)`,
    gap: 8,
  }}>
    {Array.from({length: Math.max(1, total)}).map((_, index) => {
      const color = PALETTE[index % PALETTE.length];
      return (
        <div key={`rail-${index}`} style={{height: index === active ? 6 : 3, background: color, opacity: index <= active ? 1 : 0.25}} />
      );
    })}
  </div>
);

const SectionHeader: React.FC<{
  index?: string;
  title: string;
  subtitle?: string;
  accent: string;
  frame: number;
  active: number;
  progressTotal?: number;
  icon: SkillIconKey;
  productIcon: ProductIconKey;
}> = ({index, title, subtitle, accent, frame, active, progressTotal, icon, productIcon}) => {
  const p = reveal(frame, 2, 16);
  return (
    <>
      <ProgressRail active={active} total={progressTotal} />
      <div style={{
        position: 'absolute',
        top: 116,
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

const IntroVisual: React.FC<{
  frame: number;
  accent: string;
  labels: string[];
  labelIcons?: SkillIconKey[];
  productIcons?: ProductIconKey[];
  title: string;
  subtitle?: string;
  brandName?: string;
  brandIcon?: ProductIconKey;
  eyebrow?: string;
  headline?: string;
  body?: string;
}> = ({
  frame,
  accent,
  labels,
  labelIcons,
  productIcons,
  title,
  subtitle,
  brandName,
  brandIcon,
  eyebrow,
  headline,
  body,
}) => {
  const p1 = reveal(frame, 4, 18);
  const p2 = reveal(frame, 16, 20);
  const cursor = frame % 24 < 14;
  const resolvedBrandIcon = brandIcon ?? productIcons?.[0] ?? 'workbuddy';
  const brand = brandName ?? title;
  const heroText = headline ?? title;
  const supportText = body ?? subtitle ?? labels.join(' · ');
  const heroSize = readableSize(heroText, 132);
  return (
    <AbsoluteFill style={{padding: '170px 76px 270px', justifyContent: 'center'}}>
      <div style={{display: 'flex', alignItems: 'center', gap: 20, ...enterStyle(p1, 26)}}>
        <BrandMark accent={accent} icon={resolvedBrandIcon} size={64} />
        <div style={{fontSize: 38, fontWeight: 900, color: '#fff'}}>{brand}</div>
        <div style={{marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10}}>
          {(productIcons?.length ? productIcons : SUMMARY_PRODUCT_ICONS).slice(0, 3).map((icon, index) => (
            <ProductIcon key={icon} icon={icon} accent={PALETTE[index]} size={44} glow floatSeed={index + 1} floatDelay={18 + index * 5} floatStrength={0.9} />
          ))}
        </div>
      </div>
      <div style={{marginTop: 118, ...enterStyle(p2, 42)}}>
        <div style={{fontSize: 34, color: 'rgba(255,255,255,0.72)', fontWeight: 700}}>{eyebrow ?? '本片重点'}</div>
        <div style={{display: 'flex', alignItems: 'flex-end', marginTop: 12}}>
          <div style={{fontSize: heroSize, lineHeight: 0.98, fontWeight: 950, color: '#eef3ff', maxWidth: 840}}>{heroText}</div>
          <div style={{width: 10, height: Math.max(82, heroSize * 0.84), marginLeft: 12, background: accent, opacity: cursor ? 1 : 0.18}} />
        </div>
        <div style={{height: 8, width: 360, marginTop: 28, background: `linear-gradient(90deg, ${accent}, #5f7dff, transparent)`}} />
        <div style={{marginTop: 42, fontSize: 34, lineHeight: 1.35, color: '#fff', fontWeight: 800}}>{supportText}</div>
      </div>
      <div style={{display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 82}}>
        {labels.slice(0, 4).map((label, index) => (
          <Chip key={label} color={PALETTE[index]} progress={reveal(frame, 34 + index * 6, 14)} icon={iconAt(labelIcons, index, SUMMARY_ICONS)} productIcon={iconAt(productIcons, index, SUMMARY_PRODUCT_ICONS)} floatSeed={index + 2}>{label}</Chip>
        ))}
      </div>
    </AbsoluteFill>
  );
};

const OverviewVisual: React.FC<{
  frame: number;
  accent: string;
  labels: string[];
  labelIcons?: SkillIconKey[];
  productIcons?: ProductIconKey[];
  title: string;
  subtitle?: string;
  brandName?: string;
  brandIcon?: ProductIconKey;
  eyebrow?: string;
  headline?: string;
  body?: string;
  footer?: string;
}> = ({frame, accent, labels, labelIcons, productIcons, title, subtitle, brandName, brandIcon, eyebrow, headline, body, footer}) => {
  const titleProgress = reveal(frame, 2, 18);
  const displayTitle = headline ?? title;
  const resolvedBrandIcon = brandIcon ?? productIcons?.[0] ?? 'workbuddy';
  const supportText = footer ?? body ?? subtitle ?? '按口播节奏逐段展开。';
  return (
    <AbsoluteFill style={{padding: '210px 76px 280px'}}>
      <div style={{...enterStyle(titleProgress, 28), marginTop: 120}}>
        <div style={{fontSize: 32, color: 'rgba(255,255,255,0.66)', fontWeight: 700}}>{eyebrow ?? '本片会拆的'}</div>
        <div style={{fontSize: readableSize(displayTitle, 92), lineHeight: 1, color: '#fff', fontWeight: 950, marginTop: 14}}>{displayTitle}</div>
      </div>
      <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 72}}>
        {labels.slice(0, 6).map((label, index) => (
          <Chip key={label} color={PALETTE[index]} progress={reveal(frame, 18 + index * 5, 16)} icon={iconAt(labelIcons, index, SUMMARY_ICONS)} productIcon={iconAt(productIcons, index, SUMMARY_PRODUCT_ICONS)} floatSeed={index + 3}>{label}</Chip>
        ))}
      </div>
      <div style={{display: 'flex', alignItems: 'center', gap: 18, marginTop: 'auto', ...enterStyle(reveal(frame, 52, 18), 20)}}>
        <BrandMark accent={accent} icon={resolvedBrandIcon} size={68} />
        <div>
          <div style={{fontSize: 28, fontWeight: 900, color: '#fff'}}>{brandName ?? '视觉计划'}</div>
          <div style={{fontSize: 21, fontWeight: 800, color: 'rgba(255,255,255,0.58)', marginTop: 6}}>{supportText}</div>
        </div>
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

const OutroVisual: React.FC<{
  frame: number;
  accent: string;
  labels: string[];
  labelIcons?: SkillIconKey[];
  productIcons?: ProductIconKey[];
  title: string;
  subtitle?: string;
  brandName?: string;
  brandIcon?: ProductIconKey;
  headline?: string;
  body?: string;
  footer?: string;
  bullets?: string[];
  progressTotal?: number;
}> = ({
  frame,
  accent,
  labels,
  labelIcons,
  productIcons,
  title,
  subtitle,
  brandName,
  brandIcon,
  headline,
  body,
  footer,
  bullets,
  progressTotal,
}) => {
  const heroText = headline ?? title;
  const leadLines = bullets?.length ? bullets.slice(0, 2) : splitLeadLines(body).length ? splitLeadLines(body) : [subtitle ?? '结论已经收束', labels.join(' · ')];
  const resolvedBrandIcon = brandIcon ?? productIcons?.[0] ?? 'workbuddy';
  return (
    <AbsoluteFill style={{padding: '230px 76px 260px', justifyContent: 'center'}}>
      <div style={{display: 'grid', gridTemplateColumns: `repeat(${Math.max(1, progressTotal ?? labels.length ?? PALETTE.length)}, 1fr)`, gap: 10, ...enterStyle(reveal(frame, 4, 18), 18)}}>
        {Array.from({length: Math.max(1, progressTotal ?? labels.length ?? PALETTE.length)}).map((_, index) => <div key={`outro-rail-${index}`} style={{height: 7, background: PALETTE[index % PALETTE.length]}} />)}
      </div>
      <div style={{marginTop: 76, color: 'rgba(255,255,255,0.58)', fontSize: 24, lineHeight: 1.6, ...enterStyle(reveal(frame, 14, 18), 24)}}>
        {leadLines.map((line, index) => <div key={`${line}-${index}`}>{line}</div>)}
      </div>
      <div style={{marginTop: 54, fontSize: readableSize(heroText, 86), lineHeight: 1.05, color: '#fff', fontWeight: 950, ...enterStyle(reveal(frame, 28, 20), 34)}}>
        {heroText}
      </div>
      <div style={{display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 54}}>
        {labels.slice(0, 6).map((label, index) => <Chip key={label} color={PALETTE[index]} progress={reveal(frame, 48 + index * 4, 14)} icon={iconAt(labelIcons, index, SUMMARY_ICONS)} productIcon={iconAt(productIcons, index, SUMMARY_PRODUCT_ICONS)} floatSeed={index + 4}>{label}</Chip>)}
      </div>
      <div style={{marginTop: 58, display: 'flex', alignItems: 'center', gap: 22, ...enterStyle(reveal(frame, 78, 18), 22)}}>
        <ProductIcon icon={resolvedBrandIcon} accent={accent} size={78} floatStrength={0.75} floatSeed={0.2} />
        <div>
          <div style={{fontSize: 30, color: '#fff', fontWeight: 950}}>{footer ?? title}</div>
          <div style={{fontSize: 21, color: 'rgba(255,255,255,0.5)', marginTop: 7}}>{brandName ?? subtitle ?? '按新口播生成新视觉合同'}</div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const ANTI_PATTERNS = ['紫色渐变', '毛玻璃泛滥', '居中堆叠', '圆角卡片', 'Inter 字体'];
const DESIGN_DIRECTIONS = [
  {name: 'Swiss', cn: '极简', color: '#f05a5a', bg: '#15191f'},
  {name: 'Baltic', cn: '粗粝工业', color: '#a9b2bf', bg: '#11161d'},
  {name: 'Nordic', cn: '克制', color: '#7ec8a5', bg: '#101a17'},
  {name: 'Neo', cn: '赛博', color: '#20d9e8', bg: '#0d1324'},
  {name: 'Editorial', cn: '杂志感', color: '#ffcf5a', bg: '#1b1510'},
  {name: 'Utility', cn: '工具感', color: '#7b8cff', bg: '#111427'},
];

const ImpeccableVisual: React.FC<{frame: number; accent: string; secondary: string; activeBeat?: SkillShowcaseBeat}> = ({frame, accent, secondary, activeBeat}) => {
  const keyword = activeBeat?.keyword ?? '';
  const state = activeBeat?.visualState ?? keyword;
  const scanActive = state === 'scan' || keyword.includes('检测') || keyword.includes('标注');
  const rulesActive = state === 'rules' || state === 'metrics' || keyword.includes('37');
  const compareActive = state === 'compare' || keyword.includes('左边') || keyword.includes('Star');
  const scanX = interpolate(frame % 88, [0, 88], [-40, 420]);
  return (
    <AbsoluteFill style={{padding: `${SAFE.bodyTop}px 54px ${1920 - SAFE.bodyBottom}px`}}>
      <div style={{position: 'relative', height: SAFE.bodyBottom - SAFE.bodyTop, marginTop: 8}}>
        <div style={{position: 'absolute', left: 0, right: 0, top: 26, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16}}>
          <div style={{height: 520, border: `2px solid ${accent}82`, borderRadius: 8, background: 'rgba(6,26,18,0.92)', overflow: 'hidden', boxShadow: compareActive ? `0 0 34px ${accent}44` : `0 0 18px ${accent}22`, ...enterStyle(reveal(frame, 8, 22), 24)}}>
            <div style={{height: 58, padding: '0 18px', color: accent, borderBottom: '1px solid rgba(255,255,255,0.08)', fontSize: 18, fontWeight: 950, display: 'flex', alignItems: 'center', gap: 10}}>
              <SemanticIcon icon="scan-search" color={accent} size={20} />左边 · 装上之后
            </div>
            <div style={{position: 'relative', padding: 20, height: 462}}>
              {['Typography', 'Color', 'Layout', 'Glass', 'Center'].map((pattern, i) => {
                const p = reveal(frame, 22 + i * 10, 18);
                const detected = scanActive || rulesActive || compareActive || i < 2;
                return (
                  <div key={pattern} style={{
                    height: 56,
                    marginBottom: 12,
                    borderRadius: 6,
                    border: `1px solid ${detected ? accent : 'rgba(255,255,255,0.1)'}`,
                    background: detected ? `${accent}14` : 'rgba(255,255,255,0.035)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '0 14px',
                    opacity: p,
                    transform: `translateX(${interpolate(p, [0, 1], [22, 0])}px)`,
                  }}>
                    <SemanticIcon icon={detected ? 'circle-check-big' : 'circle-help'} color={detected ? accent : '#657083'} size={18} />
                    <span style={{fontSize: 17, color: detected ? '#f6fff9' : 'rgba(255,255,255,0.42)', fontWeight: 850}}>{ANTI_PATTERNS[i] ?? pattern}</span>
                    {detected ? <span style={{marginLeft: 'auto', color: accent, fontSize: 12, fontWeight: 950}}>LOCKED</span> : null}
                  </div>
                );
              })}
              {scanActive ? (
                <div style={{position: 'absolute', top: 12, bottom: 14, left: scanX, width: 58, background: `linear-gradient(90deg, transparent, ${accent}45, transparent)`, boxShadow: `0 0 24px ${accent}55`, transform: 'skewX(-10deg)'}} />
              ) : null}
            </div>
          </div>

          <div style={{height: 520, border: '1px solid rgba(255,95,145,0.34)', borderRadius: 8, background: 'rgba(18,12,28,0.92)', overflow: 'hidden', boxShadow: compareActive ? '0 0 34px rgba(255,95,145,0.34)' : 'none', ...enterStyle(reveal(frame, 16, 22), 24)}}>
            <div style={{height: 58, padding: '0 18px', color: '#ff6d92', borderBottom: '1px solid rgba(255,255,255,0.08)', fontSize: 18, fontWeight: 950, display: 'flex', alignItems: 'center', gap: 10}}>
              <SemanticIcon icon="shield-alert" color="#ff6d92" size={20} />右边 · 默认 AI 输出
            </div>
            <div style={{padding: 20, background: 'linear-gradient(145deg, rgba(124,58,237,0.34), rgba(37,99,235,0.26))'}}>
              <div style={{height: 28, width: '62%', background: 'rgba(255,255,255,0.86)', borderRadius: 18, margin: '0 auto'}} />
              <div style={{height: 156, borderRadius: 22, background: 'rgba(255,255,255,0.16)', border: '1px solid rgba(255,255,255,0.36)', marginTop: 16}} />
              {[0, 1, 2].map((i) => <div key={i} style={{height: 64, borderRadius: 18, background: 'rgba(255,255,255,0.13)', marginTop: 12}} />)}
              <div style={{height: 44, marginTop: 14, borderRadius: 24, background: '#42e68c', display: 'grid', placeItems: 'center', color: '#06220f', fontSize: 14, fontWeight: 950}}>Get Started</div>
            </div>
          </div>
        </div>

        <div style={{position: 'absolute', left: 74, right: 74, bottom: 36, height: 174, borderTop: `3px solid ${rulesActive ? secondary : accent}`, background: rulesActive ? `${secondary}14` : 'rgba(255,255,255,0.035)', display: 'grid', gridTemplateColumns: '180px 1fr', alignItems: 'center', padding: '0 34px', boxShadow: rulesActive ? `0 0 38px ${secondary}33` : 'none', ...enterStyle(reveal(frame, 42, 22), 18)}}>
          <div style={{fontSize: rulesActive ? 92 : 68, lineHeight: 0.9, color: rulesActive ? secondary : accent, fontWeight: 950}}>{keyword.includes('22') || keyword.includes('Star') ? '22K' : '37/8'}</div>
          <div>
            <div style={{fontSize: 30, color: '#fff', fontWeight: 950}}>{keyword.includes('22') || keyword.includes('Star') ? 'AI 辅助设计必装' : '37 条规则 · 8 个类别'}</div>
            <div style={{fontSize: 19, color: 'rgba(255,255,255,0.58)', marginTop: 10, fontWeight: 800}}>命名问题、实时检测、标注反模式</div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const FrontendDesignVisual: React.FC<{frame: number; accent: string; secondary: string; activeBeat?: SkillShowcaseBeat}> = ({frame, accent, secondary, activeBeat}) => {
  const keyword = activeBeat?.keyword ?? '';
  const state = activeBeat?.visualState ?? keyword;
  const spokenDirections = ['Swiss', 'Baltic', 'Nordic', 'Neo'];
  const activeDirection = DESIGN_DIRECTIONS.findIndex((direction) => keyword.includes(direction.name) || state === direction.name.toLowerCase());
  const showRules = state === 'rules' || keyword.includes('禁用') || keyword.includes('清单') || keyword.includes('雷区');
  const showCompare = state === 'compare' || keyword.includes('左边') || keyword.includes('结果');
  return (
    <AbsoluteFill style={{padding: `${SAFE.bodyTop}px 54px ${1920 - SAFE.bodyBottom}px`}}>
      <div style={{position: 'relative', height: SAFE.bodyBottom - SAFE.bodyTop, marginTop: 4}}>
        <div style={{position: 'absolute', left: 0, top: 20, width: 260, height: 260, borderRadius: '50%', border: `3px solid ${accent}`, display: 'grid', placeItems: 'center', background: `${accent}12`, boxShadow: `0 0 40px ${accent}33`, ...enterStyle(reveal(frame, 8, 22), 22)}}>
          <div style={{textAlign: 'center'}}>
            <div style={{fontSize: 104, lineHeight: 0.82, color: accent, fontWeight: 950}}>6</div>
            <div style={{fontSize: 20, color: '#fff', marginTop: 16, fontWeight: 950}}>审美方向</div>
          </div>
        </div>

        <div style={{position: 'absolute', left: 306, right: 0, top: 12, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12}}>
          {DESIGN_DIRECTIONS.map((direction, i) => {
          const mentioned = spokenDirections.includes(direction.name);
          const active = activeDirection === i || (keyword.includes('六种') && mentioned);
          const p = reveal(frame, 20 + i * 6, 18);
          return (
            <div key={direction.name} style={{
              height: 154,
              borderRadius: 8,
              border: `2px solid ${active ? direction.color : 'rgba(255,255,255,0.11)'}`,
              background: direction.bg,
              padding: 16,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              opacity: p,
              boxShadow: active ? `0 0 28px ${direction.color}4f` : 'none',
              transform: `translateY(${interpolate(p, [0, 1], [18, 0])}px) scale(${active ? 1.035 : 1})`,
            }}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <span style={{fontSize: 12, color: direction.color, fontWeight: 950}}>{String(i + 1).padStart(2, '0')}</span>
                {mentioned ? <span style={{height: 8, width: 8, borderRadius: '50%', background: direction.color, boxShadow: `0 0 12px ${direction.color}`}} /> : null}
              </div>
              <div>
                <div style={{fontSize: 24, color: '#fff', fontWeight: 950}}>{direction.name}</div>
                <div style={{fontSize: 15, color: 'rgba(255,255,255,0.58)', marginTop: 6, fontWeight: 800}}>{direction.cn}</div>
                <div style={{height: 3, width: active ? 76 : 36, background: direction.color, marginTop: 12}} />
              </div>
            </div>
          );
        })}
        </div>

        <div style={{position: 'absolute', left: 0, right: 0, bottom: showCompare ? 150 : 36, border: `1px solid ${showRules ? accent : 'rgba(255,255,255,0.12)'}`, borderRadius: 8, background: showRules ? `${accent}13` : 'rgba(255,255,255,0.035)', padding: '18px 22px', boxShadow: showRules ? `0 0 30px ${accent}28` : 'none', ...enterStyle(reveal(frame, 58, 22), 18)}}>
          <div style={{fontSize: 17, color: '#fff', fontWeight: 950, marginBottom: 12}}>反模式清单 · 源头规避</div>
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10}}>
          {['禁用 Inter 字体', '禁用紫色渐变', '禁用居中堆叠'].map((rule, i) => {
            const crossed = showRules || showCompare;
            return (
              <div key={rule} style={{height: 54, padding: '0 14px', borderRadius: 4, border: '1px solid rgba(255,95,120,0.44)', background: crossed ? 'rgba(255,50,60,0.16)' : 'rgba(255,255,255,0.035)', display: 'flex', alignItems: 'center', gap: 8, opacity: reveal(frame, 66 + i * 6, 16)}}>
                <span style={{color: '#ff5f7a', fontSize: 16}}>⊘</span>
                <span style={{color: crossed ? '#fff' : 'rgba(255,255,255,0.5)', fontSize: 16, fontWeight: crossed ? 800 : 400, textDecoration: crossed ? 'line-through' : 'none'}}>{rule}</span>
              </div>
            );
          })}
          </div>
        </div>

        {showCompare ? (
          <div style={{position: 'absolute', left: 0, right: 0, bottom: 36, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, ...enterStyle(reveal(frame, 86, 20), 16)}}>
            <div style={{height: 96, background: `${accent}18`, borderRadius: 6, padding: '16px 18px', borderLeft: `5px solid ${accent}`}}>
              <div style={{fontSize: 13, color: accent, fontWeight: 950}}>左边 · 装上之后</div>
              <div style={{fontSize: 24, color: '#fff', fontWeight: 950, marginTop: 8}}>主动锚定 · 稳定输出</div>
            </div>
            <div style={{height: 96, background: 'rgba(45,36,50,0.58)', borderRadius: 6, padding: '16px 18px', borderRight: '5px solid #ff5f7a'}}>
              <div style={{fontSize: 13, color: '#ff7b96', fontWeight: 950}}>右边 · 默认输出</div>
              <div style={{fontSize: 24, color: 'rgba(255,255,255,0.54)', marginTop: 8, fontWeight: 850}}>平均审美 · 没记忆点</div>
            </div>
          </div>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};

const UxProVisual: React.FC<{frame: number; accent: string; activeBeat?: SkillShowcaseBeat}> = ({frame, accent, activeBeat}) => {
  const keyword = activeBeat?.keyword ?? '';
  const state = activeBeat?.visualState ?? keyword;
  const metrics = [
    {value: '161', label: '配色方案', desc: '按行业划分', color: '#45e28d'},
    {value: '67', label: 'UI 风格', desc: '覆盖主流场景', color: '#5f7dff'},
    {value: '57', label: '字体搭配', desc: '精选推荐方案', color: '#ffc44d'},
    {value: '99', label: 'UX 原则', desc: '可执行指导', color: '#ff5f91'},
  ];
  const activeMetric = metrics.findIndex((metric) => keyword.includes(metric.value));
  const showSystem = state === 'system-output' || keyword.includes('颜色') || keyword.includes('WCAG') || keyword.includes('输出');
  const showDecision = state === 'decision' || keyword.includes('决策') || keyword.includes('行业立场');
  return (
    <AbsoluteFill style={{padding: `${SAFE.bodyTop}px 54px ${1920 - SAFE.bodyBottom}px`}}>
      <div style={{position: 'relative', height: SAFE.bodyBottom - SAFE.bodyTop, marginTop: 4}}>
        <div style={{position: 'absolute', left: 0, top: 28, width: 426, bottom: 28}}>
          <div style={{fontSize: 17, color: accent, fontWeight: 950, ...enterStyle(reveal(frame, 8, 20), 18)}}>内置决策数据库</div>
          <div style={{marginTop: 16, display: 'flex', flexDirection: 'column', gap: 11}}>
        {metrics.map((m, i) => {
          const p = reveal(frame, 16 + i * 9, 20);
          const highlighted = activeMetric === i || keyword.includes('161') || state === 'metrics';
          return (
            <div key={m.label} style={{...enterStyle(p, 22), height: 114, border: `1px solid ${highlighted ? m.color : 'rgba(255,255,255,0.1)'}`, borderRadius: 8, background: highlighted ? `${m.color}16` : 'rgba(255,255,255,0.035)', padding: '16px 18px', display: 'grid', gridTemplateColumns: '112px 1fr', alignItems: 'center', boxShadow: highlighted ? `0 0 24px ${m.color}38` : 'none', transform: `${enterStyle(p, 22).transform} translateX(${highlighted ? 8 : 0}px)`}}>
              <div style={{fontSize: 56, lineHeight: 0.9, fontWeight: 950, color: m.color}}>{m.value}</div>
              <div>
                <div style={{fontSize: 21, color: '#fff', fontWeight: 950}}>{m.label}</div>
                <div style={{fontSize: 15, color: 'rgba(255,255,255,0.5)', marginTop: 5, fontWeight: 800}}>{m.desc}</div>
              </div>
            </div>
          );
        })}
          </div>
      </div>

        <div style={{position: 'absolute', left: 456, right: 0, top: 30, height: 322, borderRadius: 8, border: `1px solid ${showSystem ? accent : 'rgba(255,255,255,0.12)'}`, background: showSystem ? `${accent}12` : 'rgba(255,255,255,0.035)', padding: '24px 26px', boxShadow: showSystem ? `0 0 32px ${accent}33` : 'none', ...enterStyle(reveal(frame, 36, 20), 22)}}>
          <div style={{fontSize: 17, color: '#fff', fontWeight: 950}}>告诉它你在做什么产品</div>
          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 18}}>
          {[{label: '官网', icon: 'panel-top', color: '#45e28d'}, {label: '工具', icon: 'component', color: '#5f7dff'}, {label: '作品集', icon: 'image', color: '#ffc44d'}, {label: '后台', icon: 'layout-template', color: '#9a7cff'}].map((item, i) => (
            <div key={item.label} style={{height: 70, borderRadius: 6, border: `1px solid ${item.color}66`, background: `${item.color}12`, color: '#fff', fontSize: 21, fontWeight: 950, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, opacity: reveal(frame, 50 + i * 5, 16)}}>
              <SemanticIcon icon={item.icon as SkillIconKey} color={item.color} size={20} />{item.label}
            </div>
          ))}
          </div>
          <div style={{height: 5, width: showSystem ? 270 : 110, marginTop: 28, background: `linear-gradient(90deg, ${accent}, transparent)`}} />
        </div>

        <div style={{position: 'absolute', left: 456, right: 0, bottom: 34, height: 344, borderRadius: 8, border: `1px solid ${showDecision ? '#ffcf5a' : `${accent}55`}`, background: showDecision ? 'rgba(255,196,77,0.11)' : 'rgba(255,255,255,0.035)', padding: '22px 26px', ...enterStyle(reveal(frame, 70, 22), 20)}}>
          <div style={{fontSize: 15, color: '#ffcf5a', fontWeight: 950}}>SYSTEM OUTPUT</div>
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginTop: 18}}>
            {['颜色', '字体', '间距', 'WCAG'].map((token, i) => (
              <div key={token} style={{height: 74, display: 'grid', placeItems: 'center', background: `${PALETTE[i]}18`, borderTop: `3px solid ${PALETTE[i]}`, color: '#fff', fontSize: 18, fontWeight: 950, opacity: showSystem || showDecision ? 1 : 0.42}}>{token}</div>
            ))}
          </div>
          <div style={{marginTop: 30, fontSize: 38, lineHeight: 1.08, color: '#fff', fontWeight: 950}}>
            {showDecision ? '不是建议，是决策' : '一次输出设计系统'}
          </div>
          <div style={{fontSize: 20, color: 'rgba(255,255,255,0.56)', marginTop: 12, fontWeight: 800}}>每个场景都有规则和反模式</div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const CloudDesignVisual: React.FC<{frame: number; accent: string; activeBeat?: SkillShowcaseBeat}> = ({frame, accent, activeBeat}) => {
  const keyword = activeBeat?.keyword ?? '';
  const state = activeBeat?.visualState ?? keyword;
  const brands: Array<{name: string; style: string; color: string}> = [
    {name: 'Stripe', style: '极简兼融感', color: '#635bff'},
    {name: 'Linear', style: '工程美学', color: '#5e6ad2'},
    {name: 'Versa', style: '极致黑白', color: '#f6f6f6'},
    {name: 'Recast', style: '精密渐变', color: '#9a7cff'},
  ];
  const activeBrand = brands.findIndex((brand) => keyword.includes(brand.name));
  const showRelay = state === 'brand-relay' || activeBrand >= 0 || keyword.includes('Linear');
  const showTokens = state === 'tokens' || keyword.includes('Token') || keyword.includes('模板');
  const showCompare = state === 'compare' || keyword.includes('左边') || keyword.includes('Prompt') || keyword.includes('立场');
  return (
    <AbsoluteFill style={{padding: `${SAFE.bodyTop}px 54px ${1920 - SAFE.bodyBottom}px`}}>
      <div style={{position: 'relative', height: SAFE.bodyBottom - SAFE.bodyTop, marginTop: 4}}>
        <div style={{position: 'absolute', left: 0, top: 24, width: 248, height: 248, display: 'grid', placeItems: 'center', border: `2px solid ${accent}`, background: `${accent}12`, boxShadow: `0 0 40px ${accent}33`, ...enterStyle(reveal(frame, 8, 22), 20)}}>
          <div style={{textAlign: 'center'}}>
            <div style={{fontSize: 92, color: accent, lineHeight: 0.86, fontWeight: 950}}>68</div>
            <div style={{fontSize: 19, color: '#fff', marginTop: 14, fontWeight: 950}}>品牌设计系统</div>
          </div>
        </div>

        <div style={{position: 'absolute', left: 292, right: 0, top: 28, height: 230, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, ...enterStyle(reveal(frame, 20, 22), 18)}}>
        {brands.map((brand, i) => {
          const p = reveal(frame, 30 + i * 8, 18);
          const isFocused = activeBrand === i || (showRelay && activeBrand < 0);
          return (
            <div key={brand.name} style={{...enterStyle(p, 16), height: 178, borderRadius: 8, border: `2px solid ${isFocused ? brand.color : 'rgba(255,255,255,0.11)'}`, background: isFocused ? `${brand.color}18` : 'rgba(255,255,255,0.035)', padding: 14, boxShadow: isFocused ? `0 0 28px ${brand.color}44` : 'none'}}>
              <div style={{width: 62, height: 62, borderRadius: 8, display: 'grid', placeItems: 'center', background: `${brand.color}22`, border: `1px solid ${brand.color}88`, color: brand.color === '#f6f6f6' ? '#fff' : brand.color, fontSize: 28, fontWeight: 950}}>{brand.name[0]}</div>
              <div style={{fontSize: 23, color: '#fff', fontWeight: 950, marginTop: 20}}>{brand.name}</div>
              <div style={{fontSize: 14, color: 'rgba(255,255,255,0.55)', marginTop: 6, fontWeight: 800}}>{brand.style}</div>
              <div style={{height: 3, width: isFocused ? 78 : 34, background: brand.color, marginTop: 13}} />
            </div>
          );
        })}
        </div>

        <div style={{position: 'absolute', left: 88, right: 88, top: 292, height: 166, borderRadius: 8, border: `1px solid ${showTokens ? accent : 'rgba(255,255,255,0.12)'}`, background: showTokens ? `${accent}12` : 'rgba(255,255,255,0.035)', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, padding: 16, boxShadow: showTokens ? `0 0 28px ${accent}33` : 'none', ...enterStyle(reveal(frame, 54, 22), 18)}}>
          {['Token 定义', '排版层级', '视觉规则'].map((token, i) => (
            <div key={token} style={{display: 'grid', placeItems: 'center', borderTop: `4px solid ${PALETTE[(i + 1) % PALETTE.length]}`, background: 'rgba(255,255,255,0.04)', color: '#fff', fontSize: 21, fontWeight: 950, opacity: showTokens || showCompare ? 1 : 0.46}}>{token}</div>
          ))}
        </div>

        <div style={{position: 'absolute', left: 0, right: 0, bottom: 34, height: 252, display: 'grid', gridTemplateColumns: '1fr 74px 1fr', alignItems: 'center', gap: 14, opacity: showCompare ? 1 : 0.45, ...enterStyle(reveal(frame, 76, 22), 16)}}>
          <div style={{height: 176, borderRadius: 8, background: `${accent}16`, borderLeft: `5px solid ${accent}`, padding: '22px 24px'}}>
            <div style={{fontSize: 14, color: accent, fontWeight: 950}}>左边 · Stripe Design MD</div>
            <div style={{fontSize: 31, lineHeight: 1.1, color: '#fff', fontWeight: 950, marginTop: 20}}>定价页继承品牌 Token</div>
          </div>
          <div style={{height: 74, display: 'grid', placeItems: 'center', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.16)', color: 'rgba(255,255,255,0.54)', fontSize: 18, fontWeight: 950}}>VS</div>
          <div style={{height: 176, borderRadius: 8, background: 'rgba(36,20,34,0.74)', borderRight: '5px solid #ff5f91', padding: '22px 24px'}}>
            <div style={{fontSize: 14, color: '#ff7b9e', fontWeight: 950}}>右边 · 普通 AI</div>
            <div style={{fontSize: 31, lineHeight: 1.1, color: 'rgba(255,255,255,0.62)', fontWeight: 900, marginTop: 20}}>通用卡片，没有品牌立场</div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const compactLabel = (text: string, fallback: string) => {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (!cleaned) return fallback;
  return cleaned.length > 28 ? `${cleaned.slice(0, 26)}...` : cleaned;
};

const numberCardsFrom = (values: string[]) => {
  const cards = values.flatMap((value) => {
    const matches = [...value.matchAll(/(\d+(?:[.,]\d+)?\s*(?:K|万|亿|\+|%|条|套|种|个)?)/gi)];
    return matches.map((match) => ({
      value: match[1].trim(),
      label: value.replace(match[1], '').replace(/[，。,.、:：]/g, '').trim() || '关键指标',
    }));
  });
  return cards.length ? cards.slice(0, 4) : [
    {value: '01', label: values[0] ?? '锁定问题'},
    {value: '02', label: values[1] ?? '生成结构'},
    {value: '03', label: values[2] ?? '完成交付'},
  ];
};

const GenericVisual: React.FC<{
  frame: number;
  accent: string;
  secondary: string;
  visualMode?: SkillShowcaseProps['visualMode'];
  title: string;
  subtitle?: string;
  headline?: string;
  body?: string;
  footer?: string;
  bullets: string[];
  labels: string[];
  labelIcons?: SkillIconKey[];
  productIcons?: ProductIconKey[];
  activeBeat?: SkillShowcaseBeat;
  productIcon: ProductIconKey;
}> = ({
  frame,
  accent,
  secondary,
  visualMode = 'grid',
  title,
  subtitle,
  headline,
  body,
  footer,
  bullets,
  labels,
  labelIcons,
  productIcons,
  activeBeat,
  productIcon,
}) => {
  const activeKeyword = activeBeat?.keyword ?? '';
  const contentItems = (labels.length ? labels : bullets.length ? bullets : [headline, title, subtitle, body].filter(Boolean) as string[])
    .map((item, index) => compactLabel(item, `要点 ${index + 1}`))
    .slice(0, 6);
  const lead = headline ?? title;
  const support = body ?? subtitle ?? footer ?? contentItems.join(' · ');

  if (visualMode === 'hero' || visualMode === 'quote') {
    const heroSize = readableSize(lead, visualMode === 'quote' ? 92 : 104);
    return (
      <AbsoluteFill style={{padding: '310px 76px 285px', justifyContent: 'center'}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 18, ...enterStyle(reveal(frame, 8, 18), 26)}}>
          <ProductIcon icon={productIcon} accent={accent} size={78} floatSeed={1.2} />
          <div>
            <div style={{fontSize: 20, color: accent, fontWeight: 950}}>VOICE GENERATED VISUAL</div>
            <div style={{fontSize: 26, color: 'rgba(255,255,255,0.58)', marginTop: 6, fontWeight: 800}}>{subtitle ?? '按当前口播生成'}</div>
          </div>
        </div>
        <div style={{marginTop: 62, fontSize: heroSize, lineHeight: 1.04, color: '#fff', fontWeight: 950, ...enterStyle(reveal(frame, 22, 20), 36)}}>
          {lead}
        </div>
        <div style={{height: 8, width: 430, marginTop: 34, background: `linear-gradient(90deg, ${accent}, ${secondary}, transparent)`, ...enterStyle(reveal(frame, 34, 16), 18)}} />
        <div style={{marginTop: 42, fontSize: 32, lineHeight: 1.42, color: 'rgba(255,255,255,0.78)', fontWeight: 800, ...enterStyle(reveal(frame, 42, 18), 24)}}>
          {support}
        </div>
      </AbsoluteFill>
    );
  }

  if (visualMode === 'compare') {
    const left = compactLabel(bullets[0] ?? activeBeat?.evidence?.[0] ?? '旧方式', '旧方式');
    const right = compactLabel(bullets[1] ?? activeBeat?.evidence?.[1] ?? '新判断', '新判断');
    const rows = contentItems.slice(2, 6);
    return (
      <AbsoluteFill style={{padding: '300px 62px 285px'}}>
        <div style={{marginTop: 74, display: 'grid', gridTemplateColumns: '1fr 92px 1fr', alignItems: 'center', gap: 14, ...enterStyle(reveal(frame, 8, 18), 24)}}>
          <div style={{height: 360, border: '1px solid rgba(255,95,122,0.42)', background: 'rgba(38,12,22,0.78)', padding: 26, display: 'flex', flexDirection: 'column', justifyContent: 'center'}}>
            <div style={{fontSize: 18, color: '#ff6b82', fontWeight: 950}}>BEFORE</div>
            <div style={{fontSize: 40, lineHeight: 1.16, color: '#fff', fontWeight: 950, marginTop: 18}}>{left}</div>
          </div>
          <div style={{height: 92, display: 'grid', placeItems: 'center', borderRadius: '50%', background: `${accent}1c`, color: accent, fontSize: 20, fontWeight: 950, border: `2px solid ${accent}`}}>VS</div>
          <div style={{height: 360, border: `1px solid ${accent}88`, background: `${accent}15`, padding: 26, display: 'flex', flexDirection: 'column', justifyContent: 'center', boxShadow: `0 0 38px ${accent}22`}}>
            <div style={{fontSize: 18, color: accent, fontWeight: 950}}>AFTER</div>
            <div style={{fontSize: 40, lineHeight: 1.16, color: '#fff', fontWeight: 950, marginTop: 18}}>{right}</div>
          </div>
        </div>
        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 24}}>
          {rows.map((item, index) => <Chip key={item} color={PALETTE[(index + 2) % PALETTE.length]} progress={reveal(frame, 34 + index * 5, 14)} icon={iconAt(labelIcons, index + 2, SUMMARY_ICONS)} productIcon={iconAt(productIcons, index + 2, SUMMARY_PRODUCT_ICONS)} floatSeed={index + 6}>{item}</Chip>)}
        </div>
      </AbsoluteFill>
    );
  }

  if (visualMode === 'process') {
    const steps = contentItems.length ? contentItems : ['输入', '处理', '输出'];
    return (
      <AbsoluteFill style={{padding: '300px 76px 285px'}}>
        <div style={{marginTop: 54, position: 'relative'}}>
          <div style={{position: 'absolute', left: 46, top: 40, bottom: 40, width: 3, background: `linear-gradient(180deg, ${accent}, ${secondary})`, opacity: 0.64}} />
          {steps.slice(0, 5).map((step, index) => {
            const p = reveal(frame, 10 + index * 12, 18);
            const active = activeKeyword && step.includes(activeKeyword);
            return (
              <div key={step} style={{display: 'grid', gridTemplateColumns: '94px 1fr', gap: 18, alignItems: 'center', marginBottom: 22, ...enterStyle(p, 24)}}>
                <div style={{width: 94, height: 94, borderRadius: 8, display: 'grid', placeItems: 'center', background: active ? `${accent}28` : 'rgba(255,255,255,0.055)', border: `2px solid ${active ? accent : 'rgba(255,255,255,0.12)'}`, boxShadow: active ? `0 0 28px ${accent}44` : 'none'}}>
                  <SemanticIcon icon={iconAt(labelIcons, index, SUMMARY_ICONS)} color={accent} size={35} />
                </div>
                <div style={{minHeight: 94, padding: '18px 22px', background: active ? `${accent}16` : 'rgba(255,255,255,0.04)', border: `1px solid ${active ? accent : 'rgba(255,255,255,0.09)'}`}}>
                  <div style={{fontSize: 16, color: accent, fontWeight: 950}}>STEP {String(index + 1).padStart(2, '0')}</div>
                  <div style={{fontSize: 32, color: '#fff', fontWeight: 950, marginTop: 6}}>{step}</div>
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    );
  }

  if (visualMode === 'metrics') {
    const cards = numberCardsFrom([title, subtitle, headline, body, ...bullets, ...labels].filter(Boolean) as string[]);
    return (
      <AbsoluteFill style={{padding: '310px 60px 285px'}}>
        <div style={{marginTop: 56, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16}}>
          {cards.map((card, index) => {
            const color = PALETTE[index % PALETTE.length];
            const active = activeKeyword && (card.value.includes(activeKeyword) || card.label.includes(activeKeyword));
            return (
              <div key={`${card.value}-${index}`} style={{height: 220, borderRadius: 8, border: `1px solid ${active ? color : 'rgba(255,255,255,0.12)'}`, background: active ? `${color}1c` : 'rgba(255,255,255,0.045)', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', boxShadow: active ? `0 0 30px ${color}44` : 'none', ...enterStyle(reveal(frame, 10 + index * 8, 18), 24)}}>
                <div style={{fontSize: 70, lineHeight: 0.9, color, fontWeight: 950}}>{card.value}</div>
                <div style={{fontSize: 24, color: '#fff', fontWeight: 900, marginTop: 16, textAlign: 'center'}}>{compactLabel(card.label, '关键指标')}</div>
              </div>
            );
          })}
        </div>
        <div style={{marginTop: 34, fontSize: 31, lineHeight: 1.38, color: 'rgba(255,255,255,0.76)', textAlign: 'center', fontWeight: 850, ...enterStyle(reveal(frame, 58, 18), 20)}}>{support}</div>
      </AbsoluteFill>
    );
  }

  return (
    <AbsoluteFill style={{padding: '300px 62px 285px'}}>
      <div style={{marginTop: 54, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14}}>
        {contentItems.map((item, index) => {
          const color = PALETTE[index % PALETTE.length];
          const active = activeKeyword && item.includes(activeKeyword);
          return (
            <div key={item} style={{height: 172, borderRadius: 8, border: `1px solid ${active ? color : 'rgba(255,255,255,0.11)'}`, background: active ? `${color}1b` : 'rgba(255,255,255,0.042)', padding: 20, display: 'flex', alignItems: 'center', gap: 16, boxShadow: active ? `0 0 26px ${color}33` : 'none', ...enterStyle(reveal(frame, 8 + index * 7, 16), 24)}}>
              <ProductIcon icon={iconAt(productIcons, index, SUMMARY_PRODUCT_ICONS)} accent={color} size={54} glow floatSeed={index + 4} />
              <div>
                <div style={{fontSize: 15, color, fontWeight: 950}}>POINT {String(index + 1).padStart(2, '0')}</div>
                <div style={{fontSize: 28, lineHeight: 1.18, color: '#fff', fontWeight: 950, marginTop: 8}}>{item}</div>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{marginTop: 34, padding: '20px 22px', borderTop: `3px solid ${accent}`, background: `${accent}10`, color: 'rgba(255,255,255,0.78)', fontSize: 27, lineHeight: 1.34, fontWeight: 850, ...enterStyle(reveal(frame, 58, 18), 18)}}>
        {support}
      </div>
    </AbsoluteFill>
  );
};

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
    impeccable: 1,
    'frontend-design': 2,
    'ux-pro': 3,
    'cloud-design': 4,
    generic: 0,
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
  labelIcons,
  productIcon,
  productIcons,
  brandName,
  brandIcon,
  eyebrow,
  headline,
  body,
  footer,
  progressIndex,
  progressTotal,
  visualMode,
  beats,
}) => {
  const frame = useCurrentFrame();
  const {width, height, fps} = useVideoConfig();
  const scale = Math.min(width / 1080, height / 1920);
  const active = progressIndex ?? activeIndexForVariant(variant);
  const resolvedProductIcon = productIcon ?? VARIANT_PRODUCT_ICON[variant];
  const resolvedBeats = resolveSkillBeats(variant, beats);
  const activeBeat = resolvedBeats.find((beat) => frame >= beat.startFrame && frame < beat.endFrame);

  const visual = (() => {
    switch (variant) {
      case 'intro': return <IntroVisual frame={frame} accent={accent} labels={labels} labelIcons={labelIcons} productIcons={productIcons} title={title} subtitle={subtitle} brandName={brandName} brandIcon={brandIcon} eyebrow={eyebrow} headline={headline} body={body} />;
      case 'overview': return <OverviewVisual frame={frame} accent={accent} labels={labels} labelIcons={labelIcons} productIcons={productIcons} title={title} subtitle={subtitle} brandName={brandName} brandIcon={brandIcon} eyebrow={eyebrow} headline={headline} body={body} footer={footer} />;
      case 'coding': return <CodingVisual frame={frame} accent={accent} bullets={bullets} activeBeat={activeBeat} />;
      case 'remotion': return <RemotionVisual frame={frame} accent={accent} activeBeat={activeBeat} />;
      case 'ppt': return <PptVisual frame={frame} accent={accent} activeBeat={activeBeat} />;
      case 'illustration': return <IllustrationVisual frame={frame} accent={accent} activeBeat={activeBeat} />;
      case 'hyperframes': return <HyperFramesVisual frame={frame} accent={accent} activeBeat={activeBeat} />;
      case 'ui': return <UiVisual frame={frame} accent={accent} activeBeat={activeBeat} />;
      case 'outro': return <OutroVisual frame={frame} accent={accent} labels={labels} labelIcons={labelIcons} productIcons={productIcons} title={title} subtitle={subtitle} brandName={brandName} brandIcon={brandIcon} headline={headline} body={body} footer={footer} bullets={bullets} progressTotal={progressTotal} />;
      case 'impeccable': return <ImpeccableVisual frame={frame} accent={accent} secondary={secondaryAccent} activeBeat={activeBeat} />;
      case 'frontend-design': return <FrontendDesignVisual frame={frame} accent={accent} secondary={secondaryAccent} activeBeat={activeBeat} />;
      case 'ux-pro': return <UxProVisual frame={frame} accent={accent} activeBeat={activeBeat} />;
      case 'cloud-design': return <CloudDesignVisual frame={frame} accent={accent} activeBeat={activeBeat} />;
      case 'generic': return <GenericVisual frame={frame} accent={accent} secondary={secondaryAccent} visualMode={visualMode} title={title} subtitle={subtitle} headline={headline} body={body} footer={footer} bullets={bullets} labels={labels} labelIcons={labelIcons} productIcons={productIcons} activeBeat={activeBeat} productIcon={resolvedProductIcon} />;
    }
  })();

  const showHeader = !['intro', 'overview', 'outro'].includes(variant);

  return (
    <AbsoluteFill style={{background: '#070a12', overflow: 'hidden', fontFamily: FONT}}>
      <Backdrop accent={accent} secondary={secondaryAccent} frame={frame} />
      <div style={{position: 'absolute', width: 1080, height: 1920, left: '50%', top: '50%', transform: `translate(-50%, -50%) scale(${scale})`}}>
        <DeterministicMotionField frame={frame} fps={fps} accent={accent} secondary={secondaryAccent} beats={resolvedBeats} />
        {showHeader ? <SectionHeader index={index} title={title} subtitle={subtitle} accent={accent} frame={frame} active={active} progressTotal={progressTotal} icon={VARIANT_ICON[variant]} productIcon={resolvedProductIcon} /> : null}
        {visual}
        <SemanticBeatOverlay frame={frame} beats={resolvedBeats} accent={accent} />
        {showHeader ? <ChapterTransitionOverlay frame={frame} accent={accent} secondary={secondaryAccent} icon={VARIANT_ICON[variant]} index={index} title={title} /> : null}
      </div>
    </AbsoluteFill>
  );
};
