import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {PortraitCinematicSkillShowcase} from '../components/ultimate-kit/families/skill-showcase/PortraitCinematicSkillShowcase';
import type {SkillBeatAction, SkillBeatHeroPreset, SkillBeatShotPreset, SkillIconKey} from '../components/ultimate-kit/families/skill-showcase/types';

type VisualPreview = {
  id: string;
  title: string;
  subtitle: string;
  icon: SkillIconKey;
  action: SkillBeatAction;
  family: 'cinematic' | 'tech-explainer';
  shotPreset?: SkillBeatShotPreset;
  heroPreset?: SkillBeatHeroPreset;
};

/**
 * A permanent visual-library composition. It keeps inactive reusable visual
 * components inspectable without wiring them into a production Project first.
 */
export const SKILL_VISUAL_LIBRARY: VisualPreview[] = [
  {id: 'kinetic-type', title: '动态标题', subtitle: '大字与语义击打', icon: 'focus', action: 'spotlight', family: 'cinematic', shotPreset: 'kinetic-type'},
  {id: 'split-wipe', title: '分屏擦除', subtitle: '同一对象的前后变化', icon: 'git-compare-arrows', action: 'compare', family: 'cinematic', shotPreset: 'split-wipe'},
  {id: 'particle-field', title: '粒子聚合', subtitle: '数据和信号汇聚成结论', icon: 'wand-sparkles', action: 'counter', family: 'cinematic', shotPreset: 'particle-field'},
  {id: 'orbital-map', title: '环形轨道图', subtitle: '多条规则围绕核心指标', icon: 'focus', action: 'counter', family: 'cinematic', shotPreset: 'orbital-map'},
  {id: 'ui-scan', title: '界面扫描', subtitle: '扫描线发现并标记问题', icon: 'scan-line', action: 'trace', family: 'cinematic', shotPreset: 'ui-scan'},
  {id: 'material-carousel', title: '材质轮播', subtitle: '不同视觉方向展开对照', icon: 'palette', action: 'stack', family: 'cinematic', shotPreset: 'material-carousel'},
  {id: 'focus-lock', title: '准星锁定', subtitle: '追踪并锚定目标风格', icon: 'focus', action: 'focus', family: 'cinematic', shotPreset: 'focus-lock'},
  {id: 'pipeline-flow', title: '管线流动', subtitle: '输入穿过规则门再输出', icon: 'route', action: 'trace', family: 'cinematic', shotPreset: 'pipeline-flow'},
  {id: 'token-assembly', title: 'Token 组装', subtitle: '颜色、字体、间距流入界面', icon: 'grid-3x3', action: 'stack', family: 'cinematic', shotPreset: 'token-assembly'},
  {id: 'surface-morph', title: '界面形变', subtitle: '同一系统连续变成不同产品', icon: 'layout-template', action: 'compare', family: 'cinematic', shotPreset: 'surface-morph'},
  {id: 'system-convergence', title: '系统汇聚', subtitle: '多个能力节点最终汇成系统', icon: 'workflow', action: 'burst', family: 'cinematic', shotPreset: 'system-convergence'},
  {id: 'browser-demo', title: '浏览器演示', subtitle: '操作界面与实时预览', icon: 'panels-top-left', action: 'focus', family: 'tech-explainer', heroPreset: 'browser-demo'},
  {id: 'terminal-run', title: '终端执行', subtitle: '命令、日志与执行结果', icon: 'terminal', action: 'trace', family: 'tech-explainer', heroPreset: 'terminal-run'},
  {id: 'code-diff', title: '代码差异', subtitle: '默认配置被可验证规则替换', icon: 'code', action: 'compare', family: 'tech-explainer', heroPreset: 'code-diff'},
  {id: 'config-inspector', title: '配置检查器', subtitle: '逐项读取并确认配置', icon: 'swatch-book', action: 'focus', family: 'tech-explainer', heroPreset: 'config-inspector'},
  {id: 'ui-audit', title: 'UI 审查', subtitle: '检测界面问题并逐项标记', icon: 'scan-search', action: 'trace', family: 'tech-explainer', heroPreset: 'ui-audit'},
  {id: 'workflow-trace', title: '工作流追踪', subtitle: '数据在每个节点留下证据', icon: 'route', action: 'trace', family: 'tech-explainer', heroPreset: 'workflow-trace'},
  {id: 'test-report', title: '测试报告', subtitle: '合同、字幕与安全区统一验收', icon: 'badge-check', action: 'counter', family: 'tech-explainer', heroPreset: 'test-report'},
  {id: 'asset-gallery', title: '素材图库', subtitle: '可复用风格与资产集合', icon: 'grid-3x3', action: 'stack', family: 'tech-explainer', heroPreset: 'asset-gallery'},
  {id: 'system-map', title: '系统关系图', subtitle: '输入、规则、渲染、输出相连', icon: 'workflow', action: 'burst', family: 'tech-explainer', heroPreset: 'system-map'},
  {id: 'before-after', title: '前后对照', subtitle: '默认结果与 Skill 结果对比', icon: 'git-compare-arrows', action: 'compare', family: 'tech-explainer', heroPreset: 'before-after'},
];

export const SKILL_VISUAL_LIBRARY_DURATION = 120;

export const SkillVisualLibrary: React.FC<{index?: number}> = ({index = 0}) => {
  const frame = useCurrentFrame();
  const item = SKILL_VISUAL_LIBRARY[((Math.floor(index) % SKILL_VISUAL_LIBRARY.length) + SKILL_VISUAL_LIBRARY.length) % SKILL_VISUAL_LIBRARY.length];
  const beat = {
    startFrame: 0,
    endFrame: SKILL_VISUAL_LIBRARY_DURATION,
    keyword: item.title,
    detail: item.subtitle,
    evidence: ['语义匹配', '状态推进', '结果确认'],
    icon: item.icon,
    action: item.action,
    shotPreset: item.shotPreset,
    heroPreset: item.heroPreset,
    value: item.action === 'counter' ? '37' : undefined,
  };
  return <AbsoluteFill>
    <PortraitCinematicSkillShowcase
      variant="generic"
      title={item.title}
      subtitle={item.subtitle}
      index={`${String(index + 1).padStart(2, '0')} / 21`}
      accent={item.family === 'cinematic' ? '#63f0aa' : '#7e98ff'}
      secondaryAccent={item.family === 'cinematic' ? '#ffd166' : '#48e7f3'}
      brandName={item.family === 'cinematic' ? 'CINEMATIC VISUAL LIBRARY' : 'TECH EXPLAINER LIBRARY'}
      progressIndex={index}
      progressTotal={SKILL_VISUAL_LIBRARY.length}
      heroStyle={item.family}
      beats={[beat]}
      body={`frame ${frame}`}
    />
  </AbsoluteFill>;
};
