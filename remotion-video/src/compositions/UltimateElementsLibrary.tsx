import React, {type CSSProperties} from 'react';
import {AbsoluteFill, Sequence, interpolate, spring, useCurrentFrame} from 'remotion';
import {
  UltimatePlatformOverlay,
  UltimateStage,
  UltimateSubtitleBar,
  resolveUltimateAccent,
  ultimateGlow,
  ultimateKitTokens,
} from '../components/ultimate-kit';

type AccentTone = 'cyan' | 'green' | 'yellow' | 'orange' | 'purple' | 'red';
type GroupKey = 'anchors' | 'narrative' | 'systems' | 'data';
type PanelSize = 'hero' | 'large' | 'medium' | 'small';

type FamilyCard = {
  family: string;
  trigger: string;
  useCase: string;
};

type FamilyGroup = {
  key: GroupKey;
  title: string;
  eyebrow: string;
  accent: AccentTone;
  blurb: string;
  items: FamilyCard[];
};

const kit = ultimateKitTokens;

const SPACE = {
  outer: 112,
  section: 40,
  xl: 32,
  lg: 24,
  md: 20,
  sm: 14,
  xs: 12,
} as const;

const SURFACE = {
  deep: '#05101d',
  deepBlue: '#081a2e',
  ocean: '#0d2a48',
  grid: 'rgba(142, 198, 255, 0.08)',
  line: 'rgba(174, 217, 255, 0.18)',
  glass: 'rgba(11, 23, 39, 0.56)',
  softGlass: 'rgba(12, 26, 46, 0.44)',
  textSoft: 'rgba(228, 239, 255, 0.66)',
};

const FAMILY_GROUPS: FamilyGroup[] = [
  {
    key: 'anchors',
    title: '锚点聚焦',
    eyebrow: 'anchor + focus',
    accent: 'orange',
    blurb: '负责开场、收尾、单点结论和术语解释，是最该少框、少字、强视觉的一组。',
    items: [
      {family: 'hero', trigger: '第一个镜头固定命中', useCase: '封面 / 开场大标题 / 章节起势'},
      {family: 'focus', trigger: '单概念 + 短 visualFocus', useCase: '一屏一个重点 / 关键词定义'},
      {family: 'quote-highlight', trigger: '关键判断 / 金句 / 核心结论', useCase: '大字强调 / 观点压轴'},
      {family: 'glossary-term', trigger: '是什么 / 本质上 / 术语定义', useCase: '概念解释 / 名词拆解'},
      {family: 'cta', trigger: '最后一个镜头固定命中', useCase: '互动收束 / 提问 / 搜索召回'},
    ],
  },
  {
    key: 'narrative',
    title: '叙事表达',
    eyebrow: 'narrative families',
    accent: 'cyan',
    blurb: '拆解观点、推进叙事、做对比反转，是科技讲解里的中段主力位。',
    items: [
      {family: 'feature-rail', trigger: '场景 / 团队 / 痛点 / 案例', useCase: '四卡拆解 / 人物场景 / 能力盘点'},
      {family: 'number-strip', trigger: '很多人觉得 / 不是...而是...', useCase: '认知反转 / 要点条带'},
      {family: 'step-flow', trigger: '第一 / 第二 / 先 / 再 / 最后', useCase: '流程 / 管线 / 工作流'},
      {family: 'timeline', trigger: '发布 / 前脚 / 后脚 / 路线图', useCase: '发布时间线 / 版本演进'},
      {family: 'compare-board', trigger: '旧讲法 vs 当前方案 / comparisons', useCase: '结构化左右对比'},
    ],
  },
  {
    key: 'systems',
    title: '系统证据',
    eyebrow: 'system + proof',
    accent: 'green',
    blurb: '内容进入工程结构、日志、记忆网络、管线链路和来源证明时，这组模板负责拉密度。',
    items: [
      {family: 'terminal', trigger: 'terminal / cli / render / 日志', useCase: '命令行运行 / worker 输出'},
      {family: 'evidence-wall', trigger: 'benchmark / docs / GitHub / 证据', useCase: '来源卡片 / 引用墙 / 证明层'},
      {family: 'architecture-map', trigger: '架构 / 系统 / 模块 / agent', useCase: '模块拓扑 / Agent 结构图'},
      {family: 'memory-graph', trigger: 'memory / context / 检索 / graph', useCase: '知识图谱 / 记忆网络'},
      {family: 'pipeline-flow', trigger: 'pipeline / flow / 链路 / process', useCase: '处理链路 / 数据流管线'},
    ],
  },
  {
    key: 'data',
    title: '数据摘要',
    eyebrow: 'data surfaces',
    accent: 'purple',
    blurb: '数字、标签、基准、实时流和代码事实不再做补充说明，而是独立占据一类版面。',
    items: [
      {family: 'tag-matrix', trigger: 'keywords + dataPoints >= 5', useCase: '能力矩阵 / 标签盘点'},
      {family: 'metrics', trigger: '至少 2 个数字 token', useCase: '时间 / 数量 / 人效结果'},
      {family: 'data-stream', trigger: '实时 / stream / 吞吐 / qps', useCase: '实时数据流 / 信号监控'},
      {family: 'benchmark-chart', trigger: 'benchmark / 跑分 / 双向指标', useCase: '基准图表 / 性能对比'},
      {family: 'code', trigger: 'json / schema / api / 参数', useCase: 'JSON 窗 / 配置窗 / 代码窗'},
    ],
  },
];

const SHOWCASE_BANDS: Array<{
  title: string;
  eyebrow: string;
  blurb: string;
  accent: AccentTone;
  families: string[];
}> = [
  {
    title: '叙事主力带',
    eyebrow: 'primary narrative lane',
    blurb: '2 到 3 分钟科技讲解，最常见的四个中段主力位。',
    accent: 'cyan',
    families: ['timeline', 'feature-rail', 'compare-board', 'step-flow'],
  },
  {
    title: '系统证明带',
    eyebrow: 'system + proof lane',
    blurb: '当内容需要像工程工作台一样可信，这一组负责补结构和证据。',
    accent: 'green',
    families: ['terminal', 'memory-graph', 'architecture-map', 'pipeline-flow'],
  },
  {
    title: '数据强化带',
    eyebrow: 'data + emphasis lane',
    blurb: '跑分、实时流、结果指标和关键判断，适合做压轴强化。',
    accent: 'purple',
    families: ['benchmark-chart', 'data-stream', 'metrics', 'quote-highlight'],
  },
];

const CONTROL_RULES: Array<{
  title: string;
  body: string;
  accent: AccentTone;
}> = [
  {
    title: '直接写 family',
    body: '最强控制。只要你已经知道这屏必须长什么样，直接手写 family，不要再赌自动命中。',
    accent: 'orange',
  },
  {
    title: '喂结构化数据',
    body: 'compare-board 给 comparisons，timeline 给节点，architecture-map 给模块，metrics 给纯数字结果。',
    accent: 'cyan',
  },
  {
    title: '用强信号文案引导',
    body: '很多人觉得 -> number-strip；旧讲法 vs 当前方案 -> compare-board；前脚 / 后脚 -> timeline。',
    accent: 'green',
  },
  {
    title: '短视频先看配额',
    body: '6 镜头视频只有 4 个中段位。重点是 4 个中段位尽量 4 个不同模板，不是乱铺满屏。',
    accent: 'purple',
  },
];

const THEFT_CASES: Array<{
  title: string;
  body: string;
  accent: AccentTone;
}> = [
  {
    title: 'feature-rail 很容易被更强结构信号抢走',
    body: '当文案同时出现强反转、对比结构、纯数字结果时，叙事模板会先被更高优先级规则吃掉。',
    accent: 'cyan',
  },
  {
    title: '视觉词不该反向影响 family',
    body: 'family 应该由内容意图决定，而不是被 prompt 里的某些视觉热词牵着跑。',
    accent: 'orange',
  },
  {
    title: '中段镜头看整条片子，不再只看单屏',
    body: '现在是先拿候选池，再按整条视频的多样性去分配，不再是谁先匹配就永远霸屏。',
    accent: 'purple',
  },
];

const FLAT_FAMILIES = FAMILY_GROUPS.flatMap((group) =>
  group.items.map((item, index) => ({
    ...item,
    groupKey: group.key,
    groupTitle: group.title,
    accent: group.accent,
    slot: index + 1,
  })),
);

const FAMILY_ACCENT_MAP = Object.fromEntries(
  FLAT_FAMILIES.map((item) => [item.family, item.accent]),
) as Record<string, AccentTone>;

const PRIORITY_LANE = [
  'terminal',
  'data-stream',
  'benchmark-chart',
  'timeline',
  'compare-board',
  'number-strip',
  'evidence-wall',
  'code',
  'memory-graph',
  'architecture-map',
  'pipeline-flow',
  'step-flow',
  'feature-rail',
];

const buildReveal = (frame: number, delay = 0) =>
  spring({
    fps: 30,
    frame: Math.max(0, frame - delay),
    config: {damping: 18, stiffness: 110},
  });

const alphaHex = (value: number) => Math.round(value * 255).toString(16).padStart(2, '0');

const panelMetrics: Record<PanelSize, {radius: number; padding: string}> = {
  hero: {radius: 40, padding: '34px 34px 30px'},
  large: {radius: 32, padding: '28px 28px 24px'},
  medium: {radius: 26, padding: '22px 22px 18px'},
  small: {radius: 20, padding: '16px 16px 14px'},
};

const glassPanelStyle = (accent: AccentTone, size: PanelSize = 'medium', glow = 0.22): CSSProperties => {
  const color = resolveUltimateAccent(accent);
  const metrics = panelMetrics[size];
  return {
    borderRadius: metrics.radius,
    padding: metrics.padding,
    border: `1px solid ${color}${alphaHex(0.22)}`,
    background: `
      linear-gradient(180deg, rgba(255,255,255,0.12), rgba(255,255,255,0.02)),
      linear-gradient(145deg, ${color}${alphaHex(0.16)}, ${SURFACE.softGlass})
    `,
    backdropFilter: 'blur(24px) saturate(135%)',
    WebkitBackdropFilter: 'blur(24px) saturate(135%)',
    boxShadow: `
      inset 0 1px 0 rgba(255,255,255,0.12),
      0 24px 64px rgba(2, 8, 18, 0.38),
      ${ultimateGlow(color, glow)}
    `,
    overflow: 'hidden',
  };
};

const entryStyle = (progress: number, distance = 26, scaleFrom = 0.985): CSSProperties => ({
  opacity: progress,
  transform: `translateY(${interpolate(progress, [0, 1], [distance, 0])}px) scale(${interpolate(progress, [0, 1], [scaleFrom, 1])})`,
});

const WorkbenchBackdrop: React.FC<{accent?: AccentTone}> = ({accent = 'cyan'}) => {
  const color = resolveUltimateAccent(accent);
  return (
    <AbsoluteFill
      style={{
        background: `
          radial-gradient(circle at 14% 16%, ${color}${alphaHex(0.18)}, transparent 24%),
          radial-gradient(circle at 85% 14%, rgba(96, 232, 255, 0.14), transparent 22%),
          radial-gradient(circle at 76% 84%, rgba(85, 140, 255, 0.16), transparent 28%),
          linear-gradient(155deg, ${SURFACE.deep} 0%, ${SURFACE.deepBlue} 48%, ${SURFACE.ocean} 100%)
        `,
      }}
    >
      <AbsoluteFill
        style={{
          opacity: 0.82,
          backgroundImage: `
            linear-gradient(${SURFACE.grid} 1px, transparent 1px),
            linear-gradient(90deg, ${SURFACE.grid} 1px, transparent 1px)
          `,
          backgroundSize: '88px 88px',
          maskImage: 'linear-gradient(180deg, rgba(0,0,0,0.84), rgba(0,0,0,0.48))',
        }}
      />
      <AbsoluteFill
        style={{
          background: `
            linear-gradient(180deg, rgba(255,255,255,0.05), transparent 20%, transparent 78%, rgba(255,255,255,0.03)),
            radial-gradient(circle at 50% -20%, rgba(255,255,255,0.1), transparent 42%)
          `,
        }}
      />
    </AbsoluteFill>
  );
};

const SectionHeading: React.FC<{
  eyebrow: string;
  title: string;
  body: string;
  accent?: AccentTone;
  hero?: boolean;
  align?: 'left' | 'center';
}> = ({eyebrow, title, body, accent = 'cyan', hero = false, align = 'left'}) => {
  const color = resolveUltimateAccent(accent);
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: SPACE.sm,
        alignItems: align === 'center' ? 'center' : 'flex-start',
        textAlign: align,
      }}
    >
      <div
        style={{
          padding: '8px 14px',
          borderRadius: 999,
          border: `1px solid ${color}${alphaHex(0.26)}`,
          background: `${color}${alphaHex(0.12)}`,
          color,
          fontSize: 14,
          letterSpacing: 2.6,
          textTransform: 'uppercase',
          fontWeight: 700,
        }}
      >
        {eyebrow}
      </div>
      <div
        style={{
          fontFamily: kit.fonts.display,
          fontSize: hero ? 92 : align === 'center' ? 78 : 72,
          lineHeight: hero ? 0.95 : 0.98,
          letterSpacing: hero ? -1.5 : -1,
          maxWidth: align === 'center' ? 1220 : hero ? 840 : 820,
          textWrap: 'balance',
        }}
      >
        {title}
      </div>
      <div
        style={{
          fontSize: hero ? 25 : 22,
          lineHeight: 1.58,
          color: kit.colors.textMuted,
          maxWidth: align === 'center' ? 1160 : hero ? 760 : 820,
        }}
      >
        {body}
      </div>
    </div>
  );
};

const MetricCard: React.FC<{
  value: string;
  label: string;
  accent: AccentTone;
}> = ({value, label, accent}) => {
  const color = resolveUltimateAccent(accent);
  return (
    <div style={{...glassPanelStyle(accent, 'medium', 0.16), minWidth: 220}}>
      <div style={{fontFamily: kit.fonts.display, fontSize: 56, lineHeight: 0.92, color}}>{value}</div>
      <div style={{fontSize: 16, color: SURFACE.textSoft, textTransform: 'uppercase', letterSpacing: 2.2, marginTop: 8}}>
        {label}
      </div>
    </div>
  );
};

const FamilyChip: React.FC<{
  label: string;
  accent: AccentTone;
  active?: boolean;
}> = ({label, accent, active = false}) => {
  const color = resolveUltimateAccent(accent);
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: active ? 44 : 38,
        padding: active ? '10px 16px' : '8px 14px',
        borderRadius: 999,
        border: `1px solid ${color}${alphaHex(active ? 0.34 : 0.2)}`,
        background: active ? `${color}${alphaHex(0.16)}` : 'rgba(8, 18, 32, 0.4)',
        color: active ? '#fff' : color,
        fontSize: active ? 18 : 16,
        fontWeight: 800,
        letterSpacing: 0.2,
      }}
    >
      {label}
    </div>
  );
};

const HeatTile: React.FC<{
  family: string;
  accent: AccentTone;
  groupTitle: string;
  slot: number;
  emphasis?: boolean;
  compact?: boolean;
}> = ({family, accent, groupTitle, slot, emphasis = false, compact = false}) => {
  const color = resolveUltimateAccent(accent);
  return (
    <div
      style={{
        ...glassPanelStyle(accent, emphasis ? 'medium' : 'small', emphasis ? 0.14 : 0.1),
        minHeight: compact ? (emphasis ? 112 : 96) : emphasis ? 124 : 108,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        background: `
          linear-gradient(180deg, rgba(255,255,255,0.12), rgba(255,255,255,0.02)),
          linear-gradient(140deg, ${color}${alphaHex(emphasis ? 0.18 : 0.12)}, rgba(10, 22, 38, 0.58))
        `,
      }}
      >
      <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8}}>
        <div style={{fontSize: compact ? 11 : 12, letterSpacing: compact ? 1.8 : 2.2, color: SURFACE.textSoft, textTransform: 'uppercase'}}>
          {groupTitle}
        </div>
        <div style={{fontSize: compact ? 13 : 14, color: `${color}${alphaHex(0.92)}`}}>{String(slot).padStart(2, '0')}</div>
      </div>
      <div style={{fontWeight: 800, fontSize: compact ? (emphasis ? 20 : 17) : emphasis ? 22 : 18, lineHeight: 1.08, letterSpacing: -0.2}}>
        {family}
      </div>
      <div style={{display: 'flex', alignItems: 'center', gap: 8, marginTop: compact ? 8 : 10}}>
        <div
          style={{
            width: compact ? (emphasis ? 38 : 28) : emphasis ? 44 : 34,
            height: 4,
            borderRadius: 999,
            background: color,
            boxShadow: ultimateGlow(color, 0.22),
          }}
        />
        <div style={{fontSize: compact ? 11 : 12, color: SURFACE.textSoft}}>scene family</div>
      </div>
    </div>
  );
};

const FamilyHeatGrid: React.FC<{
  featuredFamilies?: string[];
  compact?: boolean;
}> = ({featuredFamilies = [], compact = false}) => {
  const columns = FLAT_FAMILIES.length > 15 ? 5 : 7;
  return (
    <div style={{display: 'grid', gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, gap: SPACE.xs}}>
      {FLAT_FAMILIES.map((item) => (
        <HeatTile
          key={item.family}
          family={item.family}
          accent={item.accent}
          groupTitle={item.groupTitle}
          slot={item.slot}
          emphasis={featuredFamilies.includes(item.family)}
          compact={compact}
        />
      ))}
    </div>
  );
};

const getPagedItems = <T,>(items: T[], page: number, pageSize: number): T[] => {
  const maxStart = Math.max(0, items.length - pageSize);
  const start = Math.min(page * 2, maxStart);
  return items.slice(start, start + pageSize);
};

const AtlasLegendStrip: React.FC = () => {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '0.72fr 1.28fr',
        gap: SPACE.md,
        alignItems: 'center',
        paddingTop: SPACE.md,
        borderTop: `1px solid ${SURFACE.line}`,
      }}
    >
      <div style={{display: 'flex', flexDirection: 'column', gap: 8}}>
        <div style={{fontSize: 13, letterSpacing: 2.4, textTransform: 'uppercase', color: SURFACE.textSoft}}>
          reading order
        </div>
        <div style={{fontWeight: 800, fontSize: 21, lineHeight: 1.18}}>先看总量，再看右侧聚焦组。</div>
        <div style={{fontSize: 15, lineHeight: 1.5, color: SURFACE.textSoft}}>
          固定四类配色，不再靠一堆说明卡去理解模板归属。
        </div>
      </div>
      <div style={{display: 'flex', justifyContent: 'flex-end', flexWrap: 'wrap', gap: 10}}>
        {FAMILY_GROUPS.map((group) => (
          <FamilyChip key={group.key} label={`${group.title} ${group.items.length}`} accent={group.accent} />
        ))}
      </div>
    </div>
  );
};

const AtlasFocusPanel: React.FC<{
  frame: number;
}> = ({frame}) => {
  const groupCycle = 30;
  const activeGroupIndex = Math.floor(frame / groupCycle) % FAMILY_GROUPS.length;
  const activeGroup = FAMILY_GROUPS[activeGroupIndex];
  const activeGroupFrame = frame % groupCycle;
  const detailPage = activeGroupFrame >= 16 ? 1 : 0;
  const visibleItems = getPagedItems(activeGroup.items, detailPage, 3);
  const color = resolveUltimateAccent(activeGroup.accent);

  return (
    <div style={{...glassPanelStyle(activeGroup.accent, 'large', 0.16), height: '100%', display: 'flex', flexDirection: 'column', gap: SPACE.md}}>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: SPACE.md}}>
        <div>
          <div style={{fontSize: 13, letterSpacing: 2.6, textTransform: 'uppercase', color}}>group spotlight</div>
          <div style={{fontFamily: kit.fonts.display, fontSize: 46, lineHeight: 0.94, marginTop: 12}}>
            {activeGroup.title}
          </div>
        </div>
        <div style={{display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8}}>
          <div style={{fontSize: 13, letterSpacing: 2.6, textTransform: 'uppercase', color: SURFACE.textSoft}}>
            {String(activeGroupIndex + 1).padStart(2, '0')} / {String(FAMILY_GROUPS.length).padStart(2, '0')}
          </div>
          <FamilyChip label={`page ${detailPage + 1} / 2`} accent={activeGroup.accent} active />
        </div>
      </div>

      <div style={{display: 'flex', flexWrap: 'wrap', gap: 10}}>
        {FAMILY_GROUPS.map((group, index) => (
          <FamilyChip key={group.key} label={group.title} accent={group.accent} active={index === activeGroupIndex} />
        ))}
      </div>

      <div style={{display: 'grid', gridTemplateColumns: '0.76fr 1.24fr', gap: SPACE.lg, alignItems: 'start'}}>
        <div style={{display: 'flex', flexDirection: 'column', gap: 12}}>
          <div style={{fontSize: 14, letterSpacing: 2.4, textTransform: 'uppercase', color}}>{activeGroup.eyebrow}</div>
          <div style={{fontSize: 19, lineHeight: 1.6, color: kit.colors.textMuted}}>{activeGroup.blurb}</div>
          <div style={{display: 'flex', flexWrap: 'wrap', gap: 10, paddingTop: 6}}>
            {visibleItems.map((item) => (
              <FamilyChip key={item.family} label={item.family} accent={activeGroup.accent} active />
            ))}
          </div>
        </div>

        <div style={{display: 'flex', flexDirection: 'column', gap: 18}}>
          {visibleItems.map((item, index) => {
            const tileIndex = detailPage * 2 + index + 1;
            return (
              <div
                key={`${activeGroup.key}-${item.family}`}
                style={{
                  paddingTop: index === 0 ? 0 : 18,
                  borderTop: index === 0 ? 'none' : `1px solid ${color}${alphaHex(0.12)}`,
                  display: 'grid',
                  gridTemplateColumns: '56px 1fr',
                  gap: SPACE.sm,
                  alignItems: 'start',
                }}
              >
                <div style={{fontFamily: kit.fonts.display, fontSize: 34, lineHeight: 0.92, color}}>
                  {String(tileIndex).padStart(2, '0')}
                </div>
                <div>
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: SPACE.sm}}>
                    <div style={{fontWeight: 800, fontSize: 24, lineHeight: 1.08}}>{item.family}</div>
                    <div style={{fontSize: 12, letterSpacing: 2, color: SURFACE.textSoft, textTransform: 'uppercase'}}>
                      trigger + use
                    </div>
                  </div>
                  <div style={{fontSize: 17, lineHeight: 1.48, color, marginTop: 8}}>{item.trigger}</div>
                  <div style={{fontSize: 15, lineHeight: 1.56, color: SURFACE.textSoft, marginTop: 6}}>{item.useCase}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: SPACE.md,
          paddingTop: SPACE.sm,
          borderTop: `1px solid ${color}${alphaHex(0.12)}`,
        }}
      >
        <div style={{fontSize: 15, lineHeight: 1.5, color: SURFACE.textSoft}}>
          Atlas 页只保留 3 个焦点: 标题、热力总表、聚焦浏览器。
        </div>
        <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
          {[0, 1].map((page) => (
            <div
              key={page}
              style={{
                width: page === detailPage ? 28 : 10,
                height: 10,
                borderRadius: 999,
                background: page === detailPage ? color : `${color}${alphaHex(0.26)}`,
                boxShadow: page === detailPage ? ultimateGlow(color, 0.14) : 'none',
                transition: 'all 180ms ease-out',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

const PriorityTile: React.FC<{
  family: string;
  index: number;
}> = ({family, index}) => {
  const accent = FAMILY_ACCENT_MAP[family] ?? 'cyan';
  const color = resolveUltimateAccent(accent);
  return (
    <div style={{...glassPanelStyle(accent, 'small', 0.1), minHeight: 88}}>
      <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10}}>
        <div style={{fontWeight: 800, fontSize: 18}}>{family}</div>
        <div style={{fontSize: 12, letterSpacing: 2.4, color: SURFACE.textSoft}}>{String(index + 1).padStart(2, '0')}</div>
      </div>
      <div style={{fontSize: 13, lineHeight: 1.45, color: SURFACE.textSoft, marginTop: 8}}>
        {index < 4 ? '高优先级强信号' : index < 8 ? '中段主力竞争区' : '补位与兜底'}
      </div>
      <div style={{width: '100%', height: 4, borderRadius: 999, background: `${color}${alphaHex(0.8)}`, marginTop: 12}} />
    </div>
  );
};

const WorkbenchShell: React.FC<{
  accent?: AccentTone;
  warm?: boolean;
  brand: string;
  account: string;
  searchLabel: string;
  watermark: string;
  subtitle: string;
  children: React.ReactNode;
}> = ({accent = 'cyan', warm = false, brand, account, searchLabel, watermark, subtitle, children}) => {
  return (
    <UltimateStage warm={warm} showGrid={false}>
      <WorkbenchBackdrop accent={accent} />
      <UltimatePlatformOverlay brand={brand} account={account} searchLabel={searchLabel} watermark={watermark} />
      <AbsoluteFill style={{padding: `${SPACE.outer - 8}px ${SPACE.outer}px 96px`, zIndex: 1}}>{children}</AbsoluteFill>
      <UltimateSubtitleBar text={subtitle} />
    </UltimateStage>
  );
};

const CoverScene: React.FC = () => {
  const frame = useCurrentFrame();
  const revealA = buildReveal(frame, 0);
  const revealB = buildReveal(frame, 10);
  const revealC = buildReveal(frame, 20);
  const drift = Math.sin(frame * 0.026) * 6;

  return (
    <WorkbenchShell
      accent="cyan"
      warm={false}
      brand="OpenClaw"
      account="@elements-atlas"
      searchLabel="Ultimate scene families / hit rules / control surface"
      watermark="Atlas"
      subtitle="总览页 / 科技蓝工作台 / 20 family heat grid + planning system"
    >
      <div style={{display: 'grid', gridTemplateColumns: '1.02fr 0.98fr', gap: SPACE.lg, height: '100%'}}>
        <div style={{display: 'flex', flexDirection: 'column', justifyContent: 'space-between', ...entryStyle(revealA, 34, 0.98)}}>
          <SectionHeading
            hero
            eyebrow="ultimate elements atlas"
            title="20 个模板，也不该再被做成一堆同尺寸卡片。"
            body="这一版把元素页改成真正的工作台：主色收敛到科技蓝，结构按锚点 / 叙事 / 系统 / 数据分层，先看总量，再看命中，再看控制。"
            accent="cyan"
          />

          <div style={{display: 'flex', gap: SPACE.md, flexWrap: 'wrap'}}>
            <MetricCard value="20" label="usable families" accent="cyan" />
            <MetricCard value="4" label="middle slots in 6 shots" accent="orange" />
            <MetricCard value="V2" label="candidate pool planner" accent="green" />
          </div>
        </div>

        <div
          style={{
            ...glassPanelStyle('cyan', 'hero', 0.18),
            ...entryStyle(revealB, 28, 0.986),
            display: 'flex',
            flexDirection: 'column',
            gap: SPACE.md,
            transform: `${entryStyle(revealB, 28, 0.986).transform} translateY(${drift}px)`,
          }}
        >
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: SPACE.md}}>
            <div>
              <div style={{fontSize: 13, letterSpacing: 2.6, textTransform: 'uppercase', color: SURFACE.textSoft}}>
                family heat map
              </div>
              <div style={{fontFamily: kit.fonts.display, fontSize: 72, lineHeight: 0.92, marginTop: 10}}>20</div>
              <div style={{fontSize: 20, lineHeight: 1.52, color: kit.colors.textMuted, maxWidth: 420, marginTop: 12}}>
                用 4 x 5 热力网格先看完整素材库，再进入命中逻辑，而不是继续让用户在轮播组件里盲找模板。
              </div>
            </div>
            <div style={{display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-end'}}>
              {FAMILY_GROUPS.map((group) => (
                <FamilyChip key={group.key} label={`${group.title} ${group.items.length}`} accent={group.accent} />
              ))}
            </div>
          </div>

          <div style={{...entryStyle(revealC, 20, 0.992)}}>
            <FamilyHeatGrid featuredFamilies={['hero', 'timeline', 'memory-graph', 'data-stream', 'benchmark-chart', 'cta']} />
          </div>
        </div>
      </div>
    </WorkbenchShell>
  );
};

const AtlasScene: React.FC = () => {
  const frame = useCurrentFrame();
  const revealA = buildReveal(frame, 0);
  const revealB = buildReveal(frame, 10);
  const revealC = buildReveal(frame, 20);

  return (
    <WorkbenchShell
      accent="cyan"
      brand="OpenClaw"
      account="@elements-atlas"
      searchLabel="20 families grouped by production role"
      watermark="Atlas"
      subtitle="模板总表 / 4x5 热力图 + 4 类工作带 / varied panel sizing"
    >
      <div style={{display: 'flex', flexDirection: 'column', gap: SPACE.lg, height: '100%'}}>
        <div style={entryStyle(revealA, 32, 0.986)}>
          <SectionHeading
            eyebrow="family atlas"
            title="先看总表，再逐类展开。"
            body="这一页只保留 3 个焦点: 标题、热力总表、聚焦浏览器。"
            accent="cyan"
          />
        </div>

        <div style={{display: 'grid', gridTemplateColumns: '1.08fr 0.92fr', gap: SPACE.lg, flex: 1}}>
          <div style={{...glassPanelStyle('cyan', 'large', 0.16), ...entryStyle(revealB, 26, 0.988), display: 'flex', flexDirection: 'column', gap: SPACE.lg}}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: SPACE.md}}>
              <div>
                <div style={{fontSize: 13, letterSpacing: 2.6, textTransform: 'uppercase', color: SURFACE.textSoft}}>
                  all families at a glance
                </div>
                <div style={{fontFamily: kit.fonts.display, fontSize: 54, lineHeight: 0.96, marginTop: 10}}>
                  4 x 5 热力总览
                </div>
              </div>
              <div style={{fontSize: 17, lineHeight: 1.46, color: SURFACE.textSoft, maxWidth: 300, textAlign: 'right'}}>
                固定色按类分配，压掉不必要的随机混色和解释负担。
              </div>
            </div>
            <FamilyHeatGrid compact featuredFamilies={['hero', 'timeline', 'terminal', 'memory-graph', 'benchmark-chart', 'cta']} />
            <AtlasLegendStrip />
          </div>

          <div style={{...entryStyle(revealC, 22, 0.992)}}>
            <AtlasFocusPanel frame={frame} />
          </div>
        </div>
      </div>
    </WorkbenchShell>
  );
};

const PlannerScene: React.FC = () => {
  const frame = useCurrentFrame();
  const revealA = buildReveal(frame, 0);
  const revealB = buildReveal(frame, 8);
  const revealC = buildReveal(frame, 18);

  return (
    <WorkbenchShell
      accent="green"
      brand="OpenClaw"
      account="@planner-v2"
      searchLabel="candidate pool -> global planner -> final scene lineup"
      watermark="Planner"
      subtitle="命中逻辑 / candidate pool + global planner / unified rhythm"
    >
      <div style={{display: 'flex', flexDirection: 'column', gap: SPACE.section, height: '100%'}}>
        <div style={entryStyle(revealA, 28, 0.988)}>
          <SectionHeading
            eyebrow="hit planner"
            title="中段镜头现在先拿候选池，再从整条片子里做全局分配。"
            body="这一步才是避免重复的关键。系统先收每个镜头的可用模板，再从全片视角优先做中段去重、避免连撞、最后才微调首选偏差。"
            accent="green"
          />
        </div>

        <div style={{display: 'grid', gridTemplateColumns: '1.08fr 0.92fr', gap: SPACE.lg, flex: 1}}>
          <div style={{...glassPanelStyle('green', 'hero', 0.16), ...entryStyle(revealB, 24, 0.992), display: 'flex', flexDirection: 'column', gap: SPACE.lg}}>
            <div style={{display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: SPACE.sm}}>
              {[
                ['01', '内容意图', '先看 narration / type / comparisons / dataPoints'],
                ['02', '候选模板', '每个镜头先收集自己的可用 family'],
                ['03', '全局规划', '优先让中段镜头尽量不重复'],
                ['04', '最终落位', '最后才决定每一屏真正用哪个模板'],
              ].map(([index, title, body]) => (
                <div key={index} style={{...glassPanelStyle('cyan', 'medium', 0.08), minHeight: 188}}>
                  <div style={{fontFamily: kit.fonts.display, fontSize: 34, lineHeight: 0.92, color: resolveUltimateAccent('cyan')}}>{index}</div>
                  <div style={{fontWeight: 800, fontSize: 22, marginTop: 12}}>{title}</div>
                  <div style={{fontSize: 15, lineHeight: 1.5, color: SURFACE.textSoft, marginTop: 10}}>{body}</div>
                </div>
              ))}
            </div>

            <div>
              <div style={{fontSize: 13, letterSpacing: 2.6, textTransform: 'uppercase', color: SURFACE.textSoft}}>
                current middle-scene priority lane
              </div>
              <div style={{display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: SPACE.sm, marginTop: SPACE.sm}}>
                {PRIORITY_LANE.map((family, index) => (
                  <PriorityTile key={family} family={family} index={index} />
                ))}
              </div>
            </div>
          </div>

          <div style={{display: 'grid', gridTemplateRows: '1fr auto', gap: SPACE.md, ...entryStyle(revealC, 18, 0.995)}}>
            <div style={{...glassPanelStyle('orange', 'large', 0.16), display: 'flex', flexDirection: 'column', gap: SPACE.md}}>
              <div>
                <div style={{fontSize: 13, letterSpacing: 2.4, textTransform: 'uppercase', color: resolveUltimateAccent('orange')}}>
                  short-video quota
                </div>
                <div style={{fontFamily: kit.fonts.display, fontSize: 64, lineHeight: 0.92, marginTop: 10}}>6 镜头 = 4 个中段位</div>
                <div style={{fontSize: 21, lineHeight: 1.54, color: kit.colors.textMuted, marginTop: 14}}>
                  短视频真正要优化的是中段 4 屏的结构利用率，而不是幻想一条视频把 20 个模板全用一遍。
                </div>
              </div>

              <div style={{display: 'flex', flexDirection: 'column', gap: SPACE.xs}}>
                {['hero', 'timeline', 'feature-rail', 'compare-board', 'metrics', 'cta'].map((family, index) => {
                  const accent = FAMILY_ACCENT_MAP[family] ?? 'cyan';
                  return (
                    <div
                      key={family}
                      style={{
                        ...glassPanelStyle(accent, index === 0 || index === 5 ? 'medium' : 'small', 0.1),
                        display: 'grid',
                        gridTemplateColumns: '56px 1fr auto',
                        alignItems: 'center',
                        gap: SPACE.sm,
                        minHeight: 72,
                      }}
                    >
                      <div style={{fontSize: 14, letterSpacing: 2.2, color: SURFACE.textSoft}}>{String(index + 1).padStart(2, '0')}</div>
                      <div>
                        <div style={{fontWeight: 800, fontSize: 20}}>{family}</div>
                        <div style={{fontSize: 14, color: SURFACE.textSoft, marginTop: 4}}>
                          {index === 0 ? '固定开场' : index === 5 ? '固定收尾' : '中段位尽量不重复'}
                        </div>
                      </div>
                      <FamilyChip label={index === 0 || index === 5 ? 'locked' : 'middle'} accent={accent} />
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{...glassPanelStyle('cyan', 'medium', 0.1)}}>
              <div style={{fontWeight: 800, fontSize: 20}}>规划目标</div>
              <div style={{fontSize: 16, lineHeight: 1.5, color: SURFACE.textSoft, marginTop: 10}}>
                1. 中段优先多样化 2. 尽量减少重复模板 3. 尽量避免相邻镜头重复 4. 最后才少量偏离首选模板
              </div>
            </div>
          </div>
        </div>
      </div>
    </WorkbenchShell>
  );
};

const GalleryScene: React.FC = () => {
  const frame = useCurrentFrame();
  const revealA = buildReveal(frame, 0);
  const revealB = buildReveal(frame, 10);

  return (
    <WorkbenchShell
      accent="purple"
      brand="OpenClaw"
      account="@gallery-band"
      searchLabel="high-frequency families for AI explainer videos"
      watermark="Gallery"
      subtitle="高频模板带 / larger hierarchy + fixed palette by category"
    >
      <div style={{display: 'flex', flexDirection: 'column', gap: SPACE.section, height: '100%'}}>
        <div style={entryStyle(revealA, 30, 0.988)}>
          <SectionHeading
            eyebrow="template bands"
            title="2 到 3 分钟技术型视频，不是所有模板权重都一样。"
            body="这页把高频主力位、系统证明位、数据强化位拆成三条工作带。先学会主力模板，再用系统与数据模块补密度，出片会更稳。"
            accent="purple"
          />
        </div>

        <div style={{display: 'grid', gridTemplateColumns: '1.16fr 0.84fr', gap: SPACE.lg, flex: 1, ...entryStyle(revealB, 22, 0.994)}}>
          <div style={{display: 'grid', gridTemplateRows: '1fr 0.9fr', gap: SPACE.md}}>
            {SHOWCASE_BANDS.slice(0, 2).map((band, index) => (
              <div key={band.title} style={{...glassPanelStyle(band.accent, index === 0 ? 'hero' : 'large', 0.16), display: 'grid', gridTemplateColumns: '0.84fr 1.16fr', gap: SPACE.md}}>
                <div>
                  <div style={{fontSize: 13, letterSpacing: 2.6, textTransform: 'uppercase', color: resolveUltimateAccent(band.accent)}}>
                    {band.eyebrow}
                  </div>
                  <div style={{fontFamily: kit.fonts.display, fontSize: index === 0 ? 52 : 44, lineHeight: 0.96, marginTop: 10}}>
                    {band.title}
                  </div>
                  <div style={{fontSize: 18, lineHeight: 1.56, color: kit.colors.textMuted, marginTop: 12}}>{band.blurb}</div>
                </div>
                <div style={{display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: SPACE.sm}}>
                  {band.families.map((family) => (
                    <div key={family} style={{...glassPanelStyle(band.accent, 'small', 0.08), minHeight: 128}}>
                      <div style={{fontWeight: 800, fontSize: 20}}>{family}</div>
                      <div style={{fontSize: 14, lineHeight: 1.46, color: SURFACE.textSoft, marginTop: 8}}>
                        {family === 'timeline' && '时间推进 / 发布线 / 路线图'}
                        {family === 'feature-rail' && '场景卡 / 人物卡 / 痛点位'}
                        {family === 'compare-board' && '左右双栏对照 / 旧 vs 新'}
                        {family === 'step-flow' && '流程推进 / 多步骤解释'}
                        {family === 'terminal' && '命令输出 / 运行态'}
                        {family === 'memory-graph' && '知识图谱 / 记忆网络'}
                        {family === 'architecture-map' && '系统结构 / agent 拓扑'}
                        {family === 'pipeline-flow' && '处理链路 / 数据流向'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div style={{display: 'grid', gridTemplateRows: '1fr auto', gap: SPACE.md}}>
            <div style={{...glassPanelStyle(SHOWCASE_BANDS[2].accent, 'large', 0.16)}}>
              <div style={{fontSize: 13, letterSpacing: 2.6, textTransform: 'uppercase', color: resolveUltimateAccent(SHOWCASE_BANDS[2].accent)}}>
                {SHOWCASE_BANDS[2].eyebrow}
              </div>
              <div style={{fontFamily: kit.fonts.display, fontSize: 46, lineHeight: 0.96, marginTop: 10}}>
                {SHOWCASE_BANDS[2].title}
              </div>
              <div style={{fontSize: 18, lineHeight: 1.56, color: kit.colors.textMuted, marginTop: 12}}>
                {SHOWCASE_BANDS[2].blurb}
              </div>

              <div style={{display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: SPACE.sm, marginTop: SPACE.md}}>
                {SHOWCASE_BANDS[2].families.map((family) => (
                  <div key={family} style={{...glassPanelStyle(SHOWCASE_BANDS[2].accent, 'small', 0.08), minHeight: 116}}>
                    <div style={{fontWeight: 800, fontSize: 18}}>{family}</div>
                    <div style={{fontSize: 14, lineHeight: 1.46, color: SURFACE.textSoft, marginTop: 8}}>
                      {family === 'benchmark-chart' && '基准图表 / 性能对比'}
                      {family === 'data-stream' && '实时吞吐 / 信号监控'}
                      {family === 'metrics' && '数字结果 / 提效结论 / 时间成本'}
                      {family === 'quote-highlight' && '大字判断 / 金句压轴'}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{...glassPanelStyle('cyan', 'medium', 0.1)}}>
              <div style={{fontWeight: 800, fontSize: 20}}>推荐中段配方</div>
              <div style={{display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 14}}>
                <FamilyChip label="timeline" accent="cyan" active />
                <FamilyChip label="feature-rail" accent="cyan" active />
                <FamilyChip label="benchmark-chart" accent="purple" active />
                <FamilyChip label="compare-board" accent="cyan" active />
              </div>
            </div>
          </div>
        </div>
      </div>
    </WorkbenchShell>
  );
};

const ControlScene: React.FC = () => {
  const frame = useCurrentFrame();
  const revealA = buildReveal(frame, 0);
  const revealB = buildReveal(frame, 10);
  const revealC = buildReveal(frame, 18);

  return (
    <WorkbenchShell
      accent="orange"
      warm
      brand="OpenClaw"
      account="@control-surface"
      searchLabel="force hits / avoid steals / design the middle slots"
      watermark="Control"
      subtitle="控制台 / force hit + avoid steals / practical operating view"
    >
      <div style={{display: 'flex', flexDirection: 'column', gap: SPACE.section, height: '100%'}}>
        <div style={entryStyle(revealA, 28, 0.988)}>
          <SectionHeading
            eyebrow="control surface"
            title="页面再好看，最后也得落回命中控制。"
            body="真正做工作页，不是展示模板名字，而是把最稳的控制方式、最常见的误伤路径和短视频配额逻辑一次讲清楚。"
            accent="orange"
          />
        </div>

        <div style={{display: 'grid', gridTemplateColumns: '1.04fr 0.96fr', gap: SPACE.lg, flex: 1}}>
          <div style={{display: 'grid', gridTemplateRows: '1fr auto', gap: SPACE.md, ...entryStyle(revealB, 22, 0.992)}}>
            <div style={{...glassPanelStyle('orange', 'hero', 0.16), display: 'flex', flexDirection: 'column', gap: SPACE.sm}}>
              <div style={{fontSize: 13, letterSpacing: 2.6, textTransform: 'uppercase', color: resolveUltimateAccent('orange')}}>
                force a hit
              </div>
              {CONTROL_RULES.map((rule) => (
                <div key={rule.title} style={{...glassPanelStyle(rule.accent, rule.title === '直接写 family' ? 'medium' : 'small', 0.08), minHeight: rule.title === '直接写 family' ? 128 : 112}}>
                  <div style={{fontWeight: 800, fontSize: 22, color: resolveUltimateAccent(rule.accent)}}>{rule.title}</div>
                  <div style={{fontSize: 16, lineHeight: 1.54, color: SURFACE.textSoft, marginTop: 10}}>{rule.body}</div>
                </div>
              ))}
            </div>

            <div style={{...glassPanelStyle('cyan', 'medium', 0.1)}}>
            <div style={{fontWeight: 800, fontSize: 20}}>6 镜头短视频的正确目标</div>
            <div style={{fontSize: 18, lineHeight: 1.54, color: kit.colors.textMuted, marginTop: 10}}>
                <span style={{fontFamily: kit.fonts.mono}}>hero -&gt; 4 个尽量不同的中段模板 -&gt; cta</span>
                。短视频要优化的是配额利用率，不是幻想把 20 个模板塞满一条视频。
              </div>
            </div>
          </div>

          <div style={{display: 'grid', gridTemplateRows: '1fr auto', gap: SPACE.md, ...entryStyle(revealC, 18, 0.995)}}>
            <div style={{...glassPanelStyle('purple', 'large', 0.14), display: 'flex', flexDirection: 'column', gap: SPACE.sm}}>
              <div style={{fontSize: 13, letterSpacing: 2.6, textTransform: 'uppercase', color: resolveUltimateAccent('purple')}}>
                what steals templates
              </div>
              {THEFT_CASES.map((item) => (
                <div key={item.title} style={{...glassPanelStyle(item.accent, 'small', 0.08), minHeight: 116}}>
                  <div style={{fontWeight: 800, fontSize: 20, color: resolveUltimateAccent(item.accent)}}>{item.title}</div>
                  <div style={{fontSize: 15, lineHeight: 1.52, color: SURFACE.textSoft, marginTop: 8}}>{item.body}</div>
                </div>
              ))}
            </div>

            <div style={{...glassPanelStyle('green', 'medium', 0.12), display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: SPACE.sm}}>
              {['timeline', 'feature-rail', 'compare-board', 'metrics'].map((family) => (
                <div key={family} style={{...glassPanelStyle(FAMILY_ACCENT_MAP[family] ?? 'cyan', 'small', 0.08), minHeight: 92}}>
                  <div style={{fontWeight: 800, fontSize: 17}}>{family}</div>
                  <div style={{fontSize: 13, color: SURFACE.textSoft, marginTop: 8}}>中段推荐位</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </WorkbenchShell>
  );
};

export const ULTIMATE_ELEMENTS_LIBRARY_DURATION = 624;

export const UltimateElementsLibrary: React.FC = () => {
  return (
    <>
      <Sequence from={0} durationInFrames={108}>
        <CoverScene />
      </Sequence>
      <Sequence from={108} durationInFrames={132}>
        <AtlasScene />
      </Sequence>
      <Sequence from={240} durationInFrames={132}>
        <PlannerScene />
      </Sequence>
      <Sequence from={372} durationInFrames={120}>
        <GalleryScene />
      </Sequence>
      <Sequence from={492} durationInFrames={132}>
        <ControlScene />
      </Sequence>
    </>
  );
};

export default UltimateElementsLibrary;
