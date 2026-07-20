import React from 'react';
import {AbsoluteFill} from 'remotion';
import {PortraitCinematicSkillShowcase} from '../components/ultimate-kit/families/skill-showcase/PortraitCinematicSkillShowcase';
import type {
  HeroTrack,
  HeroTrackKind,
  SkillBeatAction,
  SkillBeatShotPreset,
  SkillIconKey,
  SkillShowcaseVariant,
} from '../components/ultimate-kit/families/skill-showcase/types';
import type {ProductIconKey} from '../components/ultimate-kit/families/skill-showcase/productIcons';
import storyboardContract from '../components/ultimate-kit/families/skill-showcase/storyboardContract.json';

const FONT = '"PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", Inter, system-ui, sans-serif';

type StoryboardBase = {
  id: string;
  title: string;
  subtitle: string;
  caption: string;
  icon: SkillIconKey;
  action: SkillBeatAction;
  accent: string;
  secondaryAccent: string;
  variant: SkillShowcaseVariant;
  productIcon: ProductIconKey;
  evidence: [string, string, string];
};

export type CinematicStoryboard = StoryboardBase & {
  family: 'cinematic';
  shotPreset: SkillBeatShotPreset;
};

export type HeroStoryboard = StoryboardBase & {
  family: 'hero';
  heroKind: HeroTrackKind;
  entityTarget: string;
};

export type RemotionStoryboardItem = CinematicStoryboard | HeroStoryboard;

export const CINEMATIC_STORYBOARDS: CinematicStoryboard[] = [
  {id: 'kinetic-type', title: '动态标题', subtitle: 'Kinetic Type / 动态排版', caption: '先用大字建立当前口播的核心判断', icon: 'type', action: 'spotlight', family: 'cinematic', shotPreset: 'kinetic-type', accent: '#63f0aa', secondaryAccent: '#7e98ff', variant: 'generic', productIcon: 'video-engine', evidence: ['核心词进入', '基线锁定', '结论停留']},
  {id: 'split-wipe', title: '分屏擦除', subtitle: 'Split Wipe / 前后对照', caption: '同一个对象在口播转折处完成前后变化', icon: 'git-compare-arrows', action: 'compare', family: 'cinematic', shotPreset: 'split-wipe', accent: '#63f0aa', secondaryAccent: '#ff7aa8', variant: 'generic', productIcon: 'design-system', evidence: ['旧状态', '擦除边界', '新状态']},
  {id: 'particle-field', title: '粒子聚合', subtitle: 'Particle Field / 信号汇聚', caption: '分散的数据和信号聚合成一个可信结论', icon: 'wand-sparkles', action: 'counter', family: 'cinematic', shotPreset: 'particle-field', accent: '#63f0aa', secondaryAccent: '#ffd166', variant: 'generic', productIcon: 'workflow-tool', evidence: ['数据进入', '粒子聚合', '结果成形']},
  {id: 'orbital-map', title: '环形轨道图', subtitle: 'Orbital Map / 规则关系', caption: '多个规则围绕一个中心指标持续运行', icon: 'focus', action: 'counter', family: 'cinematic', shotPreset: 'orbital-map', accent: '#63f0aa', secondaryAccent: '#48e7f3', variant: 'generic', productIcon: 'design-system', evidence: ['核心指标', '规则轨道', '关系确认']},
  {id: 'ui-scan', title: '界面扫描', subtitle: 'UI Scan / 问题检测', caption: '扫描线跟随讲解移动并高亮真实界面问题', icon: 'scan-line', action: 'trace', family: 'cinematic', shotPreset: 'ui-scan', accent: '#48e7f3', secondaryAccent: '#ff7aa8', variant: 'ui', productIcon: 'ui', evidence: ['界面进入', '扫描移动', '问题标记']},
  {id: 'material-carousel', title: '材质轮播', subtitle: 'Material Carousel / 方向选择', caption: '不同设计方向依次展开，最后锁定目标风格', icon: 'palette', action: 'stack', family: 'cinematic', shotPreset: 'material-carousel', accent: '#ad94ff', secondaryAccent: '#ffd166', variant: 'frontend-design', productIcon: 'frontend-design', evidence: ['方向展开', '材质对比', '风格锁定']},
  {id: 'focus-lock', title: '准星锁定', subtitle: 'Focus Lock / 目标聚焦', caption: '口播说到关键实体时，准星快速追踪并锁定', icon: 'focus', action: 'focus', family: 'cinematic', shotPreset: 'focus-lock', accent: '#63f0aa', secondaryAccent: '#7e98ff', variant: 'generic', productIcon: 'coding-agent', evidence: ['目标出现', '准星追踪', '锁定确认']},
  {id: 'pipeline-flow', title: '管线流动', subtitle: 'Pipeline Flow / 输入到输出', caption: '输入穿过规则节点，最终形成可验证输出', icon: 'route', action: 'trace', family: 'cinematic', shotPreset: 'pipeline-flow', accent: '#48e7f3', secondaryAccent: '#ffd166', variant: 'remotion', productIcon: 'remotion', evidence: ['输入进入', '规则处理', '输出完成']},
  {id: 'token-assembly', title: 'Token 组装', subtitle: 'Token Assembly / 设计系统', caption: '颜色、字体和间距 Token 被装配到真实界面', icon: 'grid-3x3', action: 'stack', family: 'cinematic', shotPreset: 'token-assembly', accent: '#63f0aa', secondaryAccent: '#ffd166', variant: 'ux-pro', productIcon: 'ux-pro', evidence: ['字体 Token', '间距 Token', '颜色 Token']},
  {id: 'surface-morph', title: '界面形变', subtitle: 'Surface Morph / 场景切换', caption: '同一套系统连续变成不同产品界面', icon: 'layout-template', action: 'compare', family: 'cinematic', shotPreset: 'surface-morph', accent: '#7e98ff', secondaryAccent: '#63f0aa', variant: 'cloud-design', productIcon: 'cloud-design', evidence: ['同一系统', '表面形变', '场景复用']},
  {id: 'system-convergence', title: '系统汇聚', subtitle: 'System Convergence / 能力合流', caption: '多个能力节点在收尾口播中汇成完整系统', icon: 'workflow', action: 'burst', family: 'cinematic', shotPreset: 'system-convergence', accent: '#63f0aa', secondaryAccent: '#ad94ff', variant: 'outro', productIcon: 'workbuddy', evidence: ['能力节点', '路径连接', '系统完成']},
];

export const HERO_STORYBOARDS: HeroStoryboard[] = [
  {id: 'overview-matrix', title: 'Skill 能力矩阵', subtitle: 'Overview Matrix / 总览构图', caption: '这是我现在一直在用的几个 Skill', icon: 'blocks', action: 'stack', family: 'hero', heroKind: 'overview-matrix', entityTarget: 'skill-02', accent: '#48e7f3', secondaryAccent: '#63f0aa', variant: 'overview', productIcon: 'workbuddy', evidence: ['六项能力', '当前项高亮', '统一验证入口']},
  {id: 'rule-compare', title: '编码规则对照', subtitle: 'Rule Compare / 双栏验证', caption: 'AI 会先把假设讲清楚，只做最小改动', icon: 'shield-check', action: 'compare', family: 'hero', heroKind: 'rule-compare', entityTarget: 'good-rule-02', accent: '#63f0aa', secondaryAccent: '#ff7aa8', variant: 'coding', productIcon: 'coding', evidence: ['讲清假设', '最小改动', '自己验证']},
  {id: 'code-render', title: '代码转视频', subtitle: 'Code Render / 帧渲染轨道', caption: 'React 组件会按 Frames 时间轴渲染成 MP4', icon: 'code', action: 'trace', family: 'hero', heroKind: 'code-render', entityTarget: 'frame-track', accent: '#63f0aa', secondaryAccent: '#7e98ff', variant: 'remotion', productIcon: 'remotion', evidence: ['React 组件', 'Frames 时间轴', 'MP4 输出']},
  {id: 'slide-editor', title: 'PPT 原生对象', subtitle: 'Slide Editor / 可编辑画布', caption: '生成的图表和文本仍然能在 PowerPoint 里编辑', icon: 'presentation', action: 'focus', family: 'hero', heroKind: 'slide-editor', entityTarget: 'chart-object', accent: '#ffd166', secondaryAccent: '#ff7aa8', variant: 'ppt', productIcon: 'ppt', evidence: ['文本对象', '图形对象', '图表对象']},
  {id: 'article-map', title: '正文关系图', subtitle: 'Article Map / 内容承接', caption: '素材、正文和承接关系被画成一张清楚的图', icon: 'route', action: 'trace', family: 'hero', heroKind: 'article-map', entityTarget: 'article-bridge', accent: '#ff7aa8', secondaryAccent: '#ffd166', variant: 'illustration', productIcon: 'illustration', evidence: ['素材证据', '正文观点', '承接结论']},
  {id: 'video-agent', title: '视频 Agent', subtitle: 'Video Agent / HTML 到成片', caption: '写一段 HTML，Agent 就能执行并生成视频画面', icon: 'clapperboard', action: 'trace', family: 'hero', heroKind: 'video-agent', entityTarget: 'render-preview', accent: '#7e98ff', secondaryAccent: '#48e7f3', variant: 'hyperframes', productIcon: 'hyperframes', evidence: ['HTML 输入', 'Agent 执行', '视频预览']},
  {id: 'design-compare', title: 'UI 设计对比', subtitle: 'Design Compare / Token 依据', caption: '排版、留白、配色都有明确的设计规范', icon: 'palette', action: 'compare', family: 'hero', heroKind: 'design-compare', entityTarget: 'space-token', accent: '#63f0aa', secondaryAccent: '#ffd166', variant: 'ui', productIcon: 'ui', evidence: ['字体规范', '间距规范', '颜色系统']},
  {id: 'system-summary', title: '能力系统图', subtitle: 'System Summary / 六项汇聚', caption: '六个 Skill 最后都接入 WorkBuddy 的能力系统', icon: 'workflow', action: 'burst', family: 'hero', heroKind: 'system-summary', entityTarget: 'skill-remotion', accent: '#63f0aa', secondaryAccent: '#ad94ff', variant: 'outro', productIcon: 'workbuddy', evidence: ['六个 Skill', '连接关系', '统一系统']},
  {id: 'generic-explainer', title: '通用技术解释', subtitle: 'Generic Explainer / 输入规则结果', caption: '未来的新口播也能落到输入、规则和结果三个技术实体', icon: 'panels-top-left', action: 'focus', family: 'hero', heroKind: 'generic-explainer', entityTarget: 'rule-node', accent: '#48e7f3', secondaryAccent: '#7e98ff', variant: 'generic', productIcon: 'workflow-tool', evidence: ['口播输入', '规则处理', '结果证据']},
];

export const REMOTION_STORYBOARD_LIBRARY: RemotionStoryboardItem[] = [
  ...CINEMATIC_STORYBOARDS,
  ...HERO_STORYBOARDS,
];

const contractIds = [...storyboardContract.catalog.motion, ...storyboardContract.catalog.hero];
const libraryIds = REMOTION_STORYBOARD_LIBRARY.map((item) => item.id);
if (JSON.stringify(libraryIds) !== JSON.stringify(contractIds)) {
  throw new Error('RemotionStoryboardLibrary must match storyboardContract.json');
}

export const REMOTION_STORYBOARD_DURATION = storyboardContract.composition.durationInFrames;
export const REMOTION_STORYBOARD_REVIEW_FRAME = storyboardContract.composition.reviewFrame;
export const REMOTION_STORYBOARD_WIDTH = storyboardContract.composition.width;
export const REMOTION_STORYBOARD_HEIGHT = storyboardContract.composition.height;
export const REMOTION_STORYBOARD_FPS = storyboardContract.composition.fps;

const heroTrackFor = (item: HeroStoryboard): HeroTrack => ({
  kind: item.heroKind,
  captionStartIndex: 0,
  captionEndIndex: 0,
  states: [{
    startFrame: 0,
    endFrame: REMOTION_STORYBOARD_DURATION,
    captionStartIndex: 0,
    captionEndIndex: 0,
    label: item.title,
    detail: item.subtitle,
    evidence: item.evidence,
    entityTarget: item.entityTarget,
  }],
});

export type RemotionStoryboardLibraryProps = {index?: number};

export const RemotionStoryboardLibrary: React.FC<RemotionStoryboardLibraryProps> = ({index = 0}) => {
  const safeIndex = ((Math.floor(index) % REMOTION_STORYBOARD_LIBRARY.length) + REMOTION_STORYBOARD_LIBRARY.length) % REMOTION_STORYBOARD_LIBRARY.length;
  const item = REMOTION_STORYBOARD_LIBRARY[safeIndex];
  const beat = {
    startFrame: 0,
    endFrame: REMOTION_STORYBOARD_DURATION,
    keyword: item.title,
    detail: item.subtitle,
    evidence: item.evidence,
    icon: item.icon,
    action: item.action,
    shotPreset: item.family === 'cinematic' ? item.shotPreset : undefined,
    value: item.action === 'counter' ? '37' : undefined,
  };

  return (
    <AbsoluteFill style={{fontFamily: FONT}}>
      <PortraitCinematicSkillShowcase
        variant={item.variant}
        title={item.title}
        subtitle={item.subtitle}
        index={`${String(safeIndex + 1).padStart(2, '0')} / ${REMOTION_STORYBOARD_LIBRARY.length}`}
        accent={item.accent}
        secondaryAccent={item.secondaryAccent}
        productIcon={item.productIcon}
        brandName={item.family === 'cinematic' ? 'REMOTION MOTION LIBRARY' : 'REMOTION HERO LIBRARY'}
        progressIndex={safeIndex}
        progressTotal={REMOTION_STORYBOARD_LIBRARY.length}
        heroStyle={item.family === 'cinematic' ? 'cinematic' : 'hero-track-v2'}
        heroTrack={item.family === 'hero' ? heroTrackFor(item) : undefined}
        beats={[beat]}
      />
      <div style={{
        position: 'absolute',
        left: 92,
        right: 92,
        top: storyboardContract.zones.caption.top,
        height: storyboardContract.zones.caption.bottom - storyboardContract.zones.caption.top,
        display: 'grid',
        placeItems: 'center',
        color: '#fff',
        fontSize: item.caption.length > 28 ? 27 : 31,
        lineHeight: 1.38,
        fontWeight: 850,
        textAlign: 'center',
        textShadow: '0 3px 18px rgba(0,0,0,.78)',
      }}>
        {item.caption}
      </div>
    </AbsoluteFill>
  );
};
