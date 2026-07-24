import {readFileSync} from "node:fs";

const catalogUrl = new URL(
  "../../src/components/ultimate-kit/families/skill-showcase/productionComponentCatalog.json",
  import.meta.url,
);

export const productionComponentCatalog = JSON.parse(
  readFileSync(catalogUrl, "utf8"),
);

const INTENT_RULES = [
  {key: "overview", shotKind: "overview-matrix", pattern: /几个\s*[Ss]kill|几个skill|能力矩阵|能力总览|六大|几大 ?[Ss]kill/i},
  {key: "command-execution", shotKind: "terminal-execution", pattern: /终端|命令|npm|pnpm|yarn|shell|CI|执行|构建|安装|运行|stdout|exit code/i},
  {key: "code-change", shotKind: "code-diff", pattern: /diff|git|代码行|源码|文件变更|打开文件|修改(?:代码|文件)|删除(?:旧)?(?:逻辑|代码|文件)|新增(?:代码|缓存|参数)|改一堆|乱改|没让.*动|patch|\bPR\b/i},
  {key: "configuration", shotKind: "config-check", pattern: /配置|JSON|YAML|AGENTS|env|环境变量|规则开关|审计开关|参数|schema/i},
  {key: "evidence-replay", shotKind: "evidence-replay", pattern: /证据回放|证据轨迹|操作实录|复现|逐步定格|回放.*证据/i},
  {key: "radial-explainer", shotKind: "radial-explainer", pattern: /径向拆解|概念.*(?:案例|约束|输出)|拆解|要素|围绕|体系|构成|专门为.*(?:AI|A I|团队|用户).*造|设计.*(?:排版|留白|配色)/i},
  {key: "checklist-progress", shotKind: "checklist-progress", pattern: /清单|逐项|列表|列出|能力集合|一整套|全有规范|按需加载/i},
  {key: "verification", shotKind: "test-report", pattern: /自己验证|验证闭环|验收证据|测试报告|断言|通过|失败|复检|coverage|verify|test/i},
  {key: "metric", shotKind: "metric-highlight", pattern: /\d+(?:[.,]\d+)?\s*(?:K|万|亿|\+|%|条|套|种|个|倍|秒|分钟|小时|天|帧|元|人|次|分|GB|MB).*(?:指标|数据|转化|增长|下降|提升|降低|通过|失败|耗时|延迟|成本|预算|收入|用户|客户|订单|库存|缺货|产量|样本|断言|占比|比例|效率|速度|频率|准确率|完成率)|(?:指标|数据|转化|增长|下降|提升|降低|耗时|延迟|成本|预算|收入|用户|客户|订单|库存|缺货|产量|样本|断言|占比|比例|效率|速度|频率|准确率|完成率).*\d+(?:[.,]\d+)?/i},
  {key: "process-flow", shotKind: "flow-trace", pattern: /流程|链路|输入|输出|追踪|trace|流转|路径|阶段|先.*再/i},
  {key: "code-change", shotKind: "code-diff", pattern: /改一堆|乱改|没让.*动|diff|git|代码行|源码|文件变更|修改(?:代码|文件)|删除(?:旧)?(?:逻辑|代码|文件)|新增(?:代码|缓存|参数)|patch|\bPR\b/i},
  {key: "editor-canvas", shotKind: "editor-canvas", pattern: /导不动.*图片|画布|原生对象|继续改|能编辑|全都能编辑|可编辑|形状|图表|连接线|PPT.*(?:对象|形状|图表|连接线)/i},
  {key: "comparison", shotKind: "before-after", pattern: /写之前.*写完之后|之前.*之后|旧状态.*新状态|旧版.*新版|旧.*新(?!增)|左边|右边|\bVS\b/i},
  {key: "media-compare", shotKind: "media-compare", pattern: /作品对比|媒体对比|截图对比|方案对照|前后页面|一股.*味|装完之后|素材.*没承接|图片.*(?:导不动|对不上)/i},
  {key: "interface-audit", shotKind: "interface-audit", pattern: /页审|页面审|审计|检查器|Inspector|定位|扫描|标红|高亮|按钮|无障碍|A11y|布局错误/i},
  {key: "radial-explainer", shotKind: "radial-explainer", pattern: /专门为.*(?:AI|A I|团队|用户).*造|拆解|要素|围绕|体系|构成|设计.*(?:排版|留白|配色)/i},
  {key: "rule-compare", shotKind: "rule-compare", pattern: /乱猜需求|瞎加抽象|最小改动|无关改动|更靠谱|规则对比|正反对照|错误示范|正确示范|反面教材|坏规则|好规则/i},
  {key: "slide-editor", shotKind: "slide-editor", pattern: /PPT|PowerPoint|幻灯片|演示文稿|slides?|选区|原生对象/i},
  {key: "video-agent", shotKind: "video-agent", pattern: /Hyper ?frames|视频 ?[Aa]gent|HTML.*(?:变成|转|生成).*视频|输入.*预览.*交付/i},
  {key: "design-token", shotKind: "design-compare", pattern: /UI ?skill|设计.*(?:立场|排版|留白|配色)|AI塑料味|装完之后.*能用|设计 ?[Tt]oken|设计令牌|设计变量|字号|字重|圆角/i},
  {key: "article-map", shotKind: "article-map", pattern: /正文.*判断|判断.*(?:配图|图像|插图|插画)|文章.*(?:判断|映射)|观点.*配图|金句|写之前.*写完之后/i},
  {key: "comparison", shotKind: "before-after", pattern: /写之前.*写完之后|之前.*之后|旧状态.*新状态|旧版.*新版|旧.*新(?!增)|左边|右边|\bVS\b/i},
  {key: "media-compare", shotKind: "media-compare", pattern: /作品对比|媒体对比|截图对比|方案对照|前后页面|一股.*味|装完之后/i},
  {key: "product-showcase", shotKind: "product-showcase", pattern: /产品展示|作品展示|案例展示|成片展示|产品页面|刷到的.*视频|页面全是/i},
  {key: "editor-canvas", shotKind: "editor-canvas", pattern: /画布|PPT.*(?:对象|形状|图表|连接线)|原生对象|可编辑|PowerPoint|生成PPT/i},
  {key: "article-illustration", shotKind: "article-illustration", pattern: /正文配图|文章配图|插画|比喻|写文章|配图/i},
  {key: "timeline-story", shotKind: "timeline-story", pattern: /时间线|版本演进|发展历程|阶段演进|第[一二三四五六七八九十\d]+个/i},
  {key: "quote-callout", shotKind: "quote-callout", pattern: /核心观点|一句话|本质|关键判断|不是.*而是|说白了|最大的毛病|真正的好帮手/i},
  {key: "checklist-progress", shotKind: "checklist-progress", pattern: /清单|编码原则|能力集合|逐项|一整套|全有规范|按需加载/i},
  {key: "radial-explainer", shotKind: "radial-explainer", pattern: /拆解|要素|围绕|体系|构成|设计.*(?:排版|留白|配色)/i},
  {key: "overview", shotKind: "overview-matrix", pattern: /总览|全景|一览|能力矩阵|六大|几大 ?[Ss]kill/i},
  {key: "rule-compare", shotKind: "rule-compare", pattern: /规则对比|正反对照|错误示范|正确示范|反面教材|坏规则|好规则/i},
  {key: "code-render", shotKind: "code-render", pattern: /Remotion|代码.*(?:渲染|成片|帧|视频)|React 组件.*视频|渲染管线/i},
  {key: "slide-editor", shotKind: "slide-editor", pattern: /幻灯片|演示文稿|slides?|选区/i},
  {key: "article-map", shotKind: "article-map", pattern: /金句|文章.*(?:判断|映射)|判断.*(?:配图|图像|插图)|观点.*配图/i},
  {key: "video-agent", shotKind: "video-agent", pattern: /视频 ?[Aa]gent|HTML.*(?:转|生成).*视频|输入.*预览.*交付/i},
  {key: "design-token", shotKind: "design-compare", pattern: /设计 ?[Tt]oken|设计令牌|设计变量|字号|字重|圆角/i},
  {key: "system-summary", shotKind: "system-summary", pattern: /收束|汇聚|全家桶|统一系统|能力系统|系统总结/i},
  {key: "evidence-replay", shotKind: "evidence-replay", pattern: /证据回放|证据轨迹|操作实录|复现|逐步定格/i},
  {key: "code-change", shotKind: "code-diff", pattern: /diff|git|代码行|源码|文件变更|修改(?:代码|文件)|删除(?:旧)?(?:逻辑|代码|文件)|新增(?:代码|缓存|参数)|patch|\bPR\b/i},
  {key: "command-execution", shotKind: "terminal-execution", pattern: /终端|命令|npm|pnpm|yarn|shell|CI|执行|构建|安装|运行|stdout|exit code/i},
  {key: "configuration", shotKind: "config-check", pattern: /配置|JSON|YAML|AGENTS|env|环境变量|规则|开关|参数|schema/i},
  {key: "interface-audit", shotKind: "interface-audit", pattern: /审计|检查器|Inspector|定位|扫描|标红|高亮|按钮|无障碍|A11y|布局错误/i},
  {key: "browser-interaction", shotKind: "browser-demo", pattern: /浏览器|DevTools|DOM|页面|viewport|网页|点击|交互|web/i},
  {key: "process-flow", shotKind: "flow-trace", pattern: /流程|链路|输入|输出|追踪|trace|流转|路径|阶段|先.*再/i},
  {key: "verification", shotKind: "test-report", pattern: /测试|断言|通过|失败|回归|复检|coverage|验证|验收|verify|test/i},
  {key: "asset-selection", shotKind: "asset-library", pattern: /素材库|组件库|组件|动画|模板|资源|素材|library|asset/i},
  {key: "system-architecture", shotKind: "system-map", pattern: /系统图|架构|Prompt|Skill|Token|设计系统|模块|关系图|registry|renderer/i},
  {key: "comparison", shotKind: "before-after", pattern: /对比|前后|之前|之后|旧.*新|不是.*而是|左边|右边|\bVS\b|变化|差异/i},
  {key: "metric", shotKind: "metric-highlight", pattern: /\d+(?:[.,]\d+)?\s*(?:K|万|亿|\+|%|条|套|种|个|倍|秒|分钟|帧)/i},
];

const compactText = (value) => String(value ?? "").replace(/\s+/g, " ").trim();

export const resolveSemanticIntent = (captionText, {sceneIndex = 0, sceneCount = 1} = {}) => {
  const text = compactText(captionText);
  const matched = INTENT_RULES.find((rule) => rule.pattern.test(text));
  if (matched) {
    return {
      key: matched.key,
      shotKind: matched.shotKind,
      confidence: 1,
      signals: [matched.key],
      sourceText: text,
    };
  }
  const isOpening = sceneIndex === 0;
  const isConclusion = sceneIndex === Math.max(0, sceneCount - 1) || /最后|总结|结论|所以|因此|本质|核心判断/u.test(text);
  return {
    key: isConclusion ? "conclusion" : isOpening ? "opening" : "concept-explanation",
    shotKind: "concept-explainer",
    confidence: 0.72,
    signals: [isConclusion ? "conclusion" : isOpening ? "opening" : "explanation"],
    sourceText: text,
  };
};

const requiredPathPresent = (value, requiredPath) => {
  const segments = requiredPath.split(".");
  let current = value;
  for (const segment of segments) {
    if (!current || typeof current !== "object" || !(segment in current)) return false;
    current = current[segment];
  }
  return Array.isArray(current) ? current.length > 0 : current !== undefined && current !== null && String(current).trim().length > 0;
};

export const resolveProductionComponent = ({intent, shot, lens, orientation = "portrait"}) => {
  const compatible = productionComponentCatalog.components.filter((component) =>
    component.productionReady
    && component.orientation === orientation
    && component.compatibleIntents.includes(intent.key)
    && component.compatibleShotKinds.includes(shot.kind),
  );
  const descriptor = compatible[0] ?? null;
  if (!descriptor) {
    return {
      componentId: "production-fallback",
      descriptor: null,
      resolution: "error",
      diagnostics: [{
        level: "error",
        code: "visual.component.unmatched",
        message: `No production component matches intent=${intent.key}, shot=${shot.kind}, orientation=${orientation}`,
      }],
    };
  }
  const missing = descriptor.requiredData.filter((path) => !requiredPathPresent({shot, lens}, path));
  if (missing.length > 0) {
    return {
      componentId: "production-fallback",
      descriptor: null,
      resolution: "error",
      diagnostics: missing.map((path) => ({
        level: "error",
        code: "visual.component.data-missing",
        message: `${descriptor.componentId} requires ${path}`,
      })),
    };
  }
  return {
    componentId: descriptor.componentId,
    descriptor,
    resolution: "matched",
    diagnostics: [],
  };
};

export const assertProductionComponentCatalog = () => {
  const ids = new Set();
  for (const descriptor of productionComponentCatalog.components) {
    if (!descriptor.componentId || ids.has(descriptor.componentId)) {
      throw new Error(`[PRODUCTION_COMPONENT_CATALOG_INVALID] duplicate or empty componentId: ${descriptor.componentId}`);
    }
    ids.add(descriptor.componentId);
    if (!descriptor.rendererId || !descriptor.productionReady) {
      throw new Error(`[PRODUCTION_COMPONENT_CATALOG_INVALID] ${descriptor.componentId} is not a production descriptor`);
    }
    if (!descriptor.compatibleIntents.length || !descriptor.compatibleShotKinds.length || !descriptor.requiredData.length) {
      throw new Error(`[PRODUCTION_COMPONENT_CATALOG_INVALID] ${descriptor.componentId} has an incomplete compatibility contract`);
    }
  }
  return productionComponentCatalog;
};

assertProductionComponentCatalog();
