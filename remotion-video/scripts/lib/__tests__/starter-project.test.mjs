// scripts/lib/__tests__/starter-project.test.mjs
// P2: 服务端回归测试 — buildStarterProject 字段映射、边界、非法输入
import {describe, it, expect} from 'vitest';
import {buildStarterProject, buildBrief, buildScriptPack, buildAssetPack} from '../starter-project.mjs';
import {STYLE_ACCENT} from '../production-style-contract.mjs';

const LONG_ENOUGH_SCRIPT = '这是第一句话。这是第二句话用于测试。这是第三句话确保超过二十字。';

describe('buildStarterProject — 字段映射', () => {
  it('schemaVersion 始终为 1', () => {
    const p = buildStarterProject('test', '标题', LONG_ENOUGH_SCRIPT);
    expect(p.schemaVersion).toBe(1);
  });

  it('projectId 等于输入值', () => {
    const p = buildStarterProject('my-project', '标题', LONG_ENOUGH_SCRIPT);
    expect(p.projectId).toBe('my-project');
  });

  it('title 等于输入值', () => {
    const p = buildStarterProject('test', '我的标题', LONG_ENOUGH_SCRIPT);
    expect(p.title).toBe('我的标题');
  });

  it('portrait 默认 → 1080x1920', () => {
    const p = buildStarterProject('test', '标题', LONG_ENOUGH_SCRIPT, 'portrait');
    expect(p.render.width).toBe(1080);
    expect(p.render.height).toBe(1920);
    expect(p.render.orientation).toBe('portrait');
  });

  it('landscape → 1920x1080', () => {
    const p = buildStarterProject('test', '标题', LONG_ENOUGH_SCRIPT, 'landscape');
    expect(p.render.width).toBe(1920);
    expect(p.render.height).toBe(1080);
    expect(p.render.orientation).toBe('landscape');
  });

  it('缺 orientation → 默认 portrait', () => {
    const p = buildStarterProject('test', '标题', LONG_ENOUGH_SCRIPT);
    expect(p.render.orientation).toBe('portrait');
  });

  it('fps 固定为 30', () => {
    const p = buildStarterProject('test', '标题', LONG_ENOUGH_SCRIPT);
    expect(p.render.fps).toBe(30);
  });

  it('captionStyle — cinematic → editorial', () => {
    const p = buildStarterProject('test', '标题', LONG_ENOUGH_SCRIPT, 'portrait', 'cinematic');
    expect(p.render.captionStyle).toBe('editorial');
  });

  it('captionStyle — 非 cinematic → boxed', () => {
    for (const style of ['swiss', 'minimal', 'tech']) {
      const p = buildStarterProject('test', '标题', LONG_ENOUGH_SCRIPT, 'portrait', style);
      expect(p.render.captionStyle).toBe('boxed');
    }
  });
});

describe('buildStarterProject — style → accent 注入', () => {
  it('swiss → cyan primary, purple secondary', () => {
    const p = buildStarterProject('test', '标题', LONG_ENOUGH_SCRIPT, 'portrait', 'swiss');
    expect(p.scenes[0].payload.accent).toBe('cyan');
    expect(p.scenes[1].payload.accent).toBe('purple');
    expect(p.scenes[0].payload.kicker).toBe('SWISS');
  });

  it('tech → green primary, cyan secondary', () => {
    const p = buildStarterProject('test', '标题', LONG_ENOUGH_SCRIPT, 'portrait', 'tech');
    expect(p.scenes[0].payload.accent).toBe('green');
    expect(p.scenes[1].payload.accent).toBe('cyan');
    expect(p.scenes[0].payload.kicker).toBe('TECH');
  });

  it('风格信息出现在 subtitle 中', () => {
    const p = buildStarterProject('test', '标题', LONG_ENOUGH_SCRIPT, 'portrait', 'tech');
    expect(p.scenes[0].payload.subtitle).toContain('科技绿光');
    expect(p.scenes[0].payload.subtitle).toContain('竖屏');
  });
});

describe('buildStarterProject — keywords → tags scene', () => {
  it('有关键字时注入 spoken-tags items', () => {
    const p = buildStarterProject('test', '标题', LONG_ENOUGH_SCRIPT, 'portrait', 'tech', 'AI, 工作流, 自动化');
    const items = p.scenes[1].payload.items;
    expect(items).toHaveLength(3);
    expect(items[0].label).toBe('AI');
    expect(items[0].value).toBe('概念');
    expect(items[1].label).toBe('工作流');
    expect(items[2].label).toBe('自动化');
  });

  it('中文逗号分隔也生效', () => {
    const p = buildStarterProject('test', '标题', LONG_ENOUGH_SCRIPT, 'portrait', 'swiss', 'AI，代码审查，交付闭环');
    const items = p.scenes[1].payload.items;
    expect(items).toHaveLength(3);
    expect(items[0].label).toBe('AI');
    expect(items[1].label).toBe('代码审查');
  });

  it('最多 6 个标签', () => {
    const p = buildStarterProject('test', '标题', LONG_ENOUGH_SCRIPT, 'portrait', 'swiss', 'a,b,c,d,e,f,g,h');
    expect(p.scenes[1].payload.items).toHaveLength(6);
  });

  it('无关键字时 fallback 默认标签', () => {
    const p = buildStarterProject('test', '标题', LONG_ENOUGH_SCRIPT, 'portrait', 'swiss', '');
    const items = p.scenes[1].payload.items;
    expect(items).toHaveLength(4);
    expect(items[0].label).toBe('选题');
  });
});

describe('buildStarterProject — 字幕分割', () => {
  it('按中文标点切句', () => {
    const p = buildStarterProject('test', '标题', '第一句。第二句！第三句？');
    expect(p.captions).toHaveLength(3);
    expect(p.captions[0].text).toBe('第一句');
    expect(p.captions[1].text).toBe('第二句');
    expect(p.captions[2].text).toBe('第三句');
  });

  it('按换行切句', () => {
    const p = buildStarterProject('test', '标题', '第一行\n第二行\n第三行');
    expect(p.captions).toHaveLength(3);
    expect(p.captions[0].text).toBe('第一行');
  });

  it('过滤太短的（<2 字）', () => {
    const p = buildStarterProject('test', '标题', '好。这是第二句。嗯。');
    expect(p.captions).toHaveLength(1);
    expect(p.captions[0].text).toBe('这是第二句');
  });

  it('caption 时间区间递增且不重叠', () => {
    const p = buildStarterProject('test', '标题', '第一句。第二句。第三句。');
    expect(p.captions[0].startMs).toBe(0);
    expect(p.captions[0].endMs).toBe(5000);
    expect(p.captions[1].startMs).toBe(5000);
    expect(p.captions[1].endMs).toBe(10000);
    expect(p.captions[2].startMs).toBe(10000);
  });

  it('timestampMs 等于 startMs', () => {
    const p = buildStarterProject('test', '标题', '第一句。第二句。');
    expect(p.captions[0].timestampMs).toBe(0);
    expect(p.captions[1].timestampMs).toBe(5000);
  });

  it('confidence 始终为 1', () => {
    const p = buildStarterProject('test', '标题', '第一句。');
    expect(p.captions[0].confidence).toBe(1);
  });
});

describe('buildStarterProject — 场景结构', () => {
  it('总是 3 个场景', () => {
    const p = buildStarterProject('test', '标题', LONG_ENOUGH_SCRIPT);
    expect(p.scenes).toHaveLength(3);
  });

  it('场景顺序：opening → keywords → takeaway', () => {
    const p = buildStarterProject('test', '标题', LONG_ENOUGH_SCRIPT);
    expect(p.scenes[0].id).toBe('opening');
    expect(p.scenes[0].family).toBe('spoken-title');
    expect(p.scenes[1].id).toBe('keywords');
    expect(p.scenes[1].family).toBe('spoken-tags');
    expect(p.scenes[2].id).toBe('takeaway');
    expect(p.scenes[2].family).toBe('spoken-takeaway');
  });

  it('最后一段 transition 为 false', () => {
    const p = buildStarterProject('test', '标题', LONG_ENOUGH_SCRIPT);
    expect(p.scenes[2].transition).toBe(false);
  });

  it('前两段有 transition', () => {
    const p = buildStarterProject('test', '标题', LONG_ENOUGH_SCRIPT);
    expect(p.scenes[0].transition).toEqual({type: 'slide', durationInFrames: 6});
    expect(p.scenes[1].transition).toEqual({type: 'fade', durationInFrames: 6});
  });

  it('总帧数 = 210', () => {
    const p = buildStarterProject('test', '标题', LONG_ENOUGH_SCRIPT);
    const total = p.scenes.reduce((t, s) => t + s.durationInFrames, 0);
    expect(total).toBe(210);
  });
});

describe('STYLE_ACCENT — 字典完整性', () => {
  it('4 个 style 全部定义', () => {
    expect(Object.keys(STYLE_ACCENT)).toHaveLength(4);
    for (const key of ['swiss', 'minimal', 'cinematic', 'tech']) {
      expect(STYLE_ACCENT[key]).toBeDefined();
      expect(STYLE_ACCENT[key].primary).toBeTruthy();
      expect(STYLE_ACCENT[key].secondary).toBeTruthy();
      expect(STYLE_ACCENT[key].palette).toBeTruthy();
    }
  });
});

describe('buildBrief / buildScriptPack / buildAssetPack — 辅助合同', () => {
  it('buildBrief 使用 STYLE_ACCENT palette', () => {
    const brief = buildBrief('test', '标题', 'landscape', 'tech');
    expect(brief.visualStyle.palette).toBe('科技绿光');
    expect(brief.format.width).toBe(1920);
    expect(brief.format.height).toBe(1080);
    expect(brief.tone).toBe('技术布道');
  });

  it('buildScriptPack 包含 spokenScript 和 keywords', () => {
    const sp = buildScriptPack('test', '标题', '这是口播稿...', 'AI, Remotion');
    expect(sp.spokenScript).toBe('这是口播稿...');
    expect(sp.keywords).toBe('AI, Remotion');
  });

  it('buildAssetPack 的 publicPathPrefix 包含 projectId', () => {
    const ap = buildAssetPack('my-video');
    expect(ap.publicPathPrefix).toBe('projects/my-video');
  });
});
