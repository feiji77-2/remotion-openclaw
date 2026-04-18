#!/usr/bin/env node
/**
 * shots-generator — 智能分镜生成器
 * 输入：自然语言视频主题描述
 * 输出：结构化 shots JSON + 渲染命令
 *
 * 用法：
 *   node scripts/generate-shots.js "一条命令完成视频封面设计，23种场景自动匹配"
 *   node scripts/generate-shots.js --input prompts/demo.txt
 */

const fs = require('fs');
const path = require('path');

// ===== 场景类型库 =====
const SCENE_TYPES = {
  title: {
    weight: 0.9,
    minWords: 1,
    maxWords: 8,
    keywords: ['介绍', '讲解', '揭秘', '一条', '一图', '神器', '必备', '终极', '完全指南'],
  },
  concept: {
    weight: 0.8,
    minWords: 5,
    maxWords: 50,
    keywords: ['概念', '原理', '是什么', '如何', '为什么', '机制', '本质'],
  },
  bullets: {
    weight: 0.9,
    minPoints: 2,
    maxPoints: 7,
    keywords: ['步骤', '方法', '技巧', '要点', '优势', '功能', '支持', '可以', '包括'],
  },
  flowchart: {
    weight: 0.7,
    minSteps: 3,
    maxSteps: 7,
    keywords: ['流程', '步骤', '流水线', '工作流', '过程', '从...到', '依次'],
  },
  terminal: {
    weight: 0.75,
    keywords: ['终端', '命令行', '运行', '执行', 'python', 'node', 'npm', '代码'],
  },
  scenegrid: {
    weight: 0.7,
    minItems: 6,
    maxItems: 25,
    keywords: ['场景', '模板', '样式', '效果', '种类', '多种', '23种', '20种'],
  },
  code: {
    weight: 0.75,
    keywords: ['代码', '示例', '脚本', '函数', '实现', '编写', '编程'],
  },
  countup: {
    weight: 0.8,
    keywords: ['倍', '提升', '速度', '增长', '提高', '支持', '节省', '%', '次'],
  },
  slidein: {
    weight: 0.6,
    keywords: ['强调', '注意', '关键', '核心', '重点'],
  },
  datachart: {
    weight: 0.7,
    keywords: ['数据', '对比', '增长', '占比', '图表', '统计', '分析'],
  },
  dialog: {
    weight: 0.6,
    keywords: ['对话', '问答', '问', '答', '用户', '助手', '聊天'],
  },
  stats: {
    weight: 0.7,
    keywords: ['占比', '比例', '分布', '对比', '指标', 'KPI'],
  },
  timeline: {
    weight: 0.6,
    keywords: ['时间线', '历程', '历史', '阶段', '版本', '演进'],
  },
  wordcloud: {
    weight: 0.65,
    keywords: ['关键词', '核心词', '热词', '概念'],
  },
  image: {
    weight: 0.5,
    keywords: ['截图', '界面', '效果', '案例', '展示'],
  },
  cta: {
    weight: 0.95,
    keywords: ['开始', '试用', '使用', '体验', '点击', '关注', '评论', '获取'],
  },
};

// ===== 分析函数 =====

function analyzePrompt(prompt) {
  const words = prompt.toLowerCase();
  const scores = {};

  for (const [type, config] of Object.entries(SCENE_TYPES)) {
    let score = config.weight;
    const keywordMatches = config.keywords.filter(k => words.includes(k.toLowerCase()));
    score += keywordMatches.length * 0.15;
    scores[type] = Math.min(1, score);
  }

  return scores;
}

function extractNumbers(text) {
  const matches = text.match(/\d+/g);
  return matches ? matches.map(Number) : [];
}

function extractSceneCount(prompt) {
  const nums = extractNumbers(prompt);
  return nums.find(n => n >= 6 && n <= 30) || 9;
}

// ===== Shot 生成器 =====

function generateShots(prompt, options = {}) {
  const {
    targetDuration = 60,
    fps = 30,
    style = 'cyber',
    accentColor = '#FF6B35',
    bgColor = '#0D0D1A',
  } = options;

  const totalFrames = targetDuration * fps;
  const scores = analyzePrompt(prompt);
  const sceneCount = extractSceneCount(prompt);

  const shots = [];
  let frameOffset = 0;

  // 1. 封面标题 - 始终
  const titleText = extractTitle(prompt);
  shots.push({
    id: 'shot-1',
    type: 'title',
    title: titleText,
    accentWord: detectHighlight(prompt),
    bgColor,
    accentColor,
    durationFrames: Math.round(totalFrames * 0.12),
  });
  frameOffset += shots[0].durationFrames;

  // 2. 概念介绍
  if (scores.concept > 0.5) {
    shots.push({
      id: 'shot-2',
      type: 'concept',
      title: detectConcept(prompt),
      body: generateConceptBody(prompt),
      highlight: extractHighlight(prompt),
      bgColor,
      accentColor,
      durationFrames: Math.round(totalFrames * 0.15),
    });
    frameOffset += shots[shots.length - 1].durationFrames;
  }

  // 3. 流程/步骤
  if (scores.flowchart > 0.6 || scores.bullets > 0.7) {
    const steps = generateSteps(prompt);
    if (steps.length >= 3) {
      shots.push({
        id: `shot-${shots.length + 1}`,
        type: 'flowchart',
        steps,
        bgColor,
        accentColor,
        durationFrames: Math.round(totalFrames * 0.15),
      });
      frameOffset += shots[shots.length - 1].durationFrames;
    } else {
      // fallback to bullets
      shots.push({
        id: `shot-${shots.length + 1}`,
        type: 'bullets',
        title: detectBulletsTitle(prompt),
        points: generatePoints(prompt),
        iconType: 'check',
        bgColor,
        accentColor,
        durationFrames: Math.round(totalFrames * 0.15),
      });
      frameOffset += shots[shots.length - 1].durationFrames;
    }
  }

  // 4. 终端/代码演示
  if (scores.terminal > 0.6 || scores.code > 0.6) {
    const hasCode = scores.code > scores.terminal;
    shots.push({
      id: `shot-${shots.length + 1}`,
      type: hasCode ? 'code' : 'terminal',
      title: hasCode ? '示例代码' : 'terminal',
      code: generateCodeSnippet(prompt),
      language: detectLanguage(prompt),
      outputLines: hasCode ? [] : generateOutputLines(prompt),
      bgColor,
      accentColor,
      durationFrames: Math.round(totalFrames * 0.15),
    });
    frameOffset += shots[shots.length - 1].durationFrames;
  }

  // 5. 场景网格
  if (scores.scenegrid > 0.55) {
    shots.push({
      id: `shot-${shots.length + 1}`,
      type: 'scenegrid',
      items: generateSceneItems(prompt, sceneCount),
      cols: sceneCount <= 9 ? 3 : 5,
      rows: Math.ceil(sceneCount / (sceneCount <= 9 ? 3 : 5)),
      bgColor,
      accentColor,
      durationFrames: Math.round(totalFrames * 0.18),
    });
    frameOffset += shots[shots.length - 1].durationFrames;
  }

  // 6. 数据/统计
  if (scores.countup > 0.65 || scores.stats > 0.65 || scores.datachart > 0.6) {
    const numbers = extractNumbers(prompt);
    if (numbers.length > 0) {
      shots.push({
        id: `shot-${shots.length + 1}`,
        type: 'countup',
        value: numbers[0],
        label: extractDataLabel(prompt),
        suffix: detectUnit(prompt),
        bgColor,
        accentColor,
        durationFrames: Math.round(totalFrames * 0.12),
      });
      frameOffset += shots[shots.length - 1].durationFrames;
    }
  }

  // 7. 对话/问答
  if (scores.dialog > 0.5) {
    shots.push({
      id: `shot-${shots.length + 1}`,
      type: 'dialog',
      messages: generateDialog(prompt),
      bgColor,
      accentColor,
      durationFrames: Math.round(totalFrames * 0.15),
    });
    frameOffset += shots[shots.length - 1].durationFrames;
  }

  // 8. CTA 结尾 - 始终
  const lastDuration = totalFrames - frameOffset;
  shots.push({
    id: `shot-${shots.length + 1}`,
    type: 'cta',
    mainText: extractCTAText(prompt),
    body: '免费开始，无需信用卡',
    ctaText: '立即体验 →',
    bgColor,
    accentColor,
    durationFrames: Math.max(lastDuration, Math.round(totalFrames * 0.1)),
  });

  return shots;
}

// ===== 辅助解析函数 =====

function extractTitle(prompt) {
  const stopWords = ['是什么', '如何', '为什么', '教程', '方法', '技巧', '支持', '功能'];
  let title = prompt;
  for (const sw of stopWords) {
    if (title.includes(sw)) {
      title = title.split(sw)[0].trim();
    }
  }
  return title.slice(0, 20) || prompt.slice(0, 15);
}

function detectHighlight(prompt) {
  const patterns = [
    { regex: /"([^"]+)"/, extract: m => m },
    { regex: /『([^』]+)』/, extract: m => m },
    { regex: /「([^」]+)」/, extract: m => m },
  ];
  for (const p of patterns) {
    const m = prompt.match(p.regex);
    if (m) return p.extract(m[1]);
  }
  const numbers = extractNumbers(prompt);
  if (numbers.length > 0) return `${numbers[0]}种场景`;
  return '全自动';
}

function detectConcept(prompt) {
  if (prompt.includes('是什么')) return '核心概念';
  if (prompt.includes('如何')) return '工作原理';
  if (prompt.includes('为什么')) return '为什么选择';
  return '核心要点';
}

function generateConceptBody(prompt) {
  if (prompt.includes('AI') || prompt.includes('人工智能')) {
    return '基于人工智能技术，自动理解内容并匹配最佳呈现方案';
  }
  if (prompt.includes('视频') || prompt.includes('封面')) {
    return '上传文案，自动生成匹配场景的视频封面，支持多种风格';
  }
  return '一键生成专业级视觉内容，大幅提升创作效率';
}

function extractHighlight(prompt) {
  const nums = extractNumbers(prompt);
  if (nums.length > 0) return `提升${nums[0]}倍`;
  return '全自动';
}

function generateSteps(prompt) {
  if (prompt.includes('视频')) {
    return [
      { label: '输入文案', icon: '✍️', desc: '输入视频主题' },
      { label: 'AI分析', icon: '🤖', desc: '理解内容意图' },
      { label: '场景匹配', icon: '🎯', desc: '选择最佳模板' },
      { label: '渲染输出', icon: '⚡', desc: '生成最终视频' },
      { label: '一键发布', icon: '🚀', desc: '多平台分发' },
    ];
  }
  if (prompt.includes('代码') || prompt.includes('编程')) {
    return [
      { label: '编写代码', icon: '📝' },
      { label: '运行测试', icon: '🧪' },
      { label: '自动修复', icon: '🔧' },
      { label: '部署上线', icon: '🚀' },
    ];
  }
  return [
    { label: '输入', icon: '📥' },
    { label: '处理', icon: '⚙️' },
    { label: '输出', icon: '📤' },
  ];
}

function generatePoints(prompt) {
  if (prompt.includes('优势') || prompt.includes('特点')) {
    return ['全自动处理', '无需手动调整', '多场景支持', '实时预览'];
  }
  if (prompt.includes('功能')) {
    return ['智能识别', '自动匹配', '批量处理', '多格式导出'];
  }
  return ['简单易用', '高效快速', '效果专业', '免费使用'];
}

function detectBulletsTitle(prompt) {
  if (prompt.includes('优势')) return '核心优势';
  if (prompt.includes('功能')) return '主要功能';
  if (prompt.includes('特点')) return '产品特点';
  return '关键要点';
}

function generateCodeSnippet(prompt) {
  if (prompt.includes('python')) {
    return `from video.pipeline import Generator

gen = Generator()
result = gen.create_video(
    prompt="${prompt.slice(0, 30)}...",
    style="auto",
    duration=60
)
result.render()`;
  }
  if (prompt.includes('node') || prompt.includes('npm')) {
    return `import { VideoPipeline } from 'video-gen';

const pipeline = new VideoPipeline();
await pipeline.generate({
  prompt: '${prompt.slice(0, 30)}...',
  format: 'mp4'
});`;
  }
  return `# 运行命令
video-gen generate --prompt "${prompt.slice(0, 40)}..."
# 自动分析 + 生成 + 渲染
Done in 3.2s`;
}

function detectLanguage(prompt) {
  if (prompt.includes('python')) return 'python';
  if (prompt.includes('javascript') || prompt.includes('node')) return 'javascript';
  if (prompt.includes('go')) return 'go';
  if (prompt.includes('rust')) return 'rust';
  return 'bash';
}

function generateOutputLines(prompt) {
  const lines = [
    '> Analyzing prompt...',
    '> Detected intent: video_generation',
    '> Matching scenes: 23 found',
    '> Selected: scene_17 (code_terminal)',
    '> Rendering: 1080x1920 @30fps',
  ];
  const nums = extractNumbers(prompt);
  if (nums.length > 0) {
    lines.push(`> Processing: ${nums[0]} items...`);
  }
  lines.push('> Done. Output: out/video.mp4');
  return lines;
}

function generateSceneItems(prompt, count) {
  const sceneNames = [
    '封面设计', '代码界面', '终端演示', '数据图表', '流程图',
    '对比图', '词云', '时间线', '对话界面', '统计面板',
    '产品截图', '获奖界面', '用户评价', '趋势图', '地图',
    '视频封面', 'Banner', 'Logo展示', 'App界面', '后台面板',
    '排行榜', '日历', '仪表盘', '邮件界面', '聊天界面',
  ];
  return sceneNames.slice(0, Math.min(count, sceneNames.length));
}

function extractDataLabel(prompt) {
  if (prompt.includes('倍')) return '效率提升';
  if (prompt.includes('%')) return '成功率';
  if (prompt.includes('秒')) return '处理速度';
  if (prompt.includes('次')) return '使用次数';
  return '关键指标';
}

function detectUnit(prompt) {
  if (prompt.includes('倍')) return 'x';
  if (prompt.includes('%')) return '%';
  if (prompt.includes('倍')) return 'x';
  return 'x';
}

function generateDialog(prompt) {
  return [
    { role: 'user', content: `帮我${prompt.slice(0, 20)}` },
    { role: 'assistant', content: '好的，正在分析你的需求...\n已理解，正在生成最佳方案' },
    { role: 'user', content: '需要多久？' },
    { role: 'assistant', content: '预计30秒内完成\n正在渲染中...' },
  ];
}

function extractCTAText(prompt) {
  if (prompt.includes('视频')) return '立即生成视频';
  if (prompt.includes('设计') || prompt.includes('封面')) return '立即开始设计';
  if (prompt.includes('代码')) return '开始编程';
  return '立即体验';
}

// ===== 主逻辑 =====

function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log('Usage: node generate-shots.js "你的视频主题描述" [options]');
    console.log('');
    console.log('Options:');
    console.log('  --duration N    目标时长（秒），默认60');
    console.log('  --fps N         帧率，默认30');
    console.log('  --style NAME   配色风格（cyber/gradient/darkBiz/cyberpunk/minimal）');
    console.log('  --accent HEX   强调色（如 #FF6B35）');
    console.log('  --bg HEX       背景色（如 #0D0D1A）');
    console.log('  --input FILE   从文件读取prompt');
    console.log('  --shots-only   只输出shots JSON，不输出命令');
    console.log('');
    console.log('Examples:');
    console.log('  node generate-shots.js "一条命令完成视频封面设计"');
    console.log('  node generate-shots.js "AI写作神器" --style gradient --duration 45');
    process.exit(0);
  }

  let prompt = '';
  const options = { targetDuration: 60, fps: 30 };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--duration':
        options.targetDuration = parseInt(args[++i], 10);
        break;
      case '--fps':
        options.fps = parseInt(args[++i], 10);
        break;
      case '--style':
        options.style = args[++i];
        break;
      case '--accent':
        options.accentColor = args[++i];
        break;
      case '--bg':
        options.bgColor = args[++i];
        break;
      case '--input':
        prompt = fs.readFileSync(args[++i], 'utf-8').trim();
        break;
      default:
        if (!args[i].startsWith('--')) prompt = args[i];
    }
  }

  if (!prompt) {
    console.error('Error: 请提供视频主题描述');
    console.error('使用 --help 查看用法');
    process.exit(1);
  }

  const shots = generateShots(prompt, options);
  const totalFrames = shots.reduce((sum, s) => sum + s.durationFrames, 0);
  const actualDuration = (totalFrames / options.fps).toFixed(1);

  // 输出 shots JSON
  const output = {
    status: 'ok',
    prompt,
    options,
    shots,
    summary: {
      totalShots: shots.length,
      totalFrames,
      actualDuration: `${actualDuration}s`,
      estimatedFileSize: `${Math.round(actualDuration * 0.15)}MB (crf=20, 1080p)`,
    },
  };

  console.log('\n📋 Shots JSON:');
  console.log(JSON.stringify(output, null, 2));

  if (!args.includes('--shots-only')) {
    console.log('\n🎬 渲染命令:');
    console.log(`npx remotion render src/Root.tsx Video out/video.mp4 --crf=20 --fps=${options.fps}`);
    console.log(`\n或预览:`);
    console.log(`npx remotion preview src/Root.tsx`);
  }
}

main();
