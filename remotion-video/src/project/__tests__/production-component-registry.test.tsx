import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {describe, expect, it} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {
  HeroTrackV2,
  PRODUCTION_COMPONENT_REGISTRY,
  ProductionComponentPreview,
  resolveProductionComponentDescriptor,
} from '../../components/ultimate-kit/families/skill-showcase/HeroTrackV2';
import {PORTRAIT_COLOR_THEME} from '../../components/ultimate-kit/families/skill-showcase/portraitColorTheme';
import {PRODUCTION_COMPONENT_IDS} from '../visualPlan';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

describe('production component registry', () => {
  it('exposes exactly the 29 confirmed production composition templates', () => {
    expect(PRODUCTION_COMPONENT_IDS).toHaveLength(29);
    expect(PRODUCTION_COMPONENT_REGISTRY).toHaveLength(29);
    for (const excluded of ['generic-explainer', 'cause-chain', 'myth-fact', 'rank-list', 'screen-annotate']) {
      expect(PRODUCTION_COMPONENT_IDS).not.toContain(excluded);
      expect(resolveProductionComponentDescriptor(excluded)).toBeNull();
    }
  });

  it('binds every production component id to a real React renderer', () => {
    expect(PRODUCTION_COMPONENT_REGISTRY.map((descriptor) => descriptor.componentId)).toEqual(PRODUCTION_COMPONENT_IDS);
    expect(PRODUCTION_COMPONENT_REGISTRY.every((descriptor) => descriptor.productionReady && typeof descriptor.renderer === 'function')).toBe(true);
    expect(PRODUCTION_COMPONENT_REGISTRY.every((descriptor) => descriptor.rendererId === descriptor.componentId)).toBe(true);
  });

  it.each(PRODUCTION_COMPONENT_IDS)('renders a production preview for %s', (componentId) => {
    expect(resolveProductionComponentDescriptor(componentId)).not.toBeNull();
    const html = renderToStaticMarkup(<ProductionComponentPreview componentId={componentId} />);
    expect(html).toContain(`data-production-component="${componentId}"`);
    expect(html).not.toContain('data-production-fallback');
  });

  it('gives every template a distinct preview composition (no duplicated motion signature)', () => {
    const markups = PRODUCTION_COMPONENT_IDS.map((componentId) =>
      renderToStaticMarkup(<ProductionComponentPreview componentId={componentId} />)
        .split(`data-production-component="${componentId}"`).join('')
        .replace(/>\s*[^<>\s][^<>]*\s*</g, '><'),
    );
    expect(new Set(markups).size).toBe(PRODUCTION_COMPONENT_IDS.length);
  });

  it('keeps production renderers free of sample-specific literals', () => {
    const source = fs.readFileSync(
      path.join(projectRoot, 'components/ultimate-kit/families/skill-showcase/HeroTrackV2.tsx'),
      'utf8',
    );
    const sampleLiterals = [
      '装上',
      '编码原则',
      'PPT Master',
      'HyperFrames',
      '正文配图',
      'codex',
      'WorkBuddy',
      'SkillVideo',
      'SkillCard',
    ];

    for (const literal of sampleLiterals) {
      expect(source).not.toContain(literal);
    }
  });

  it('uses a near-black shared stage instead of a flat blue canvas', () => {
    expect(PORTRAIT_COLOR_THEME.stage).toBe('#03050a');
    expect(PORTRAIT_COLOR_THEME.stageShadow).toBe('#00030a');
    expect(PORTRAIT_COLOR_THEME.stageGrid).toBe('rgba(126, 152, 255, 0.075)');
    expect(PORTRAIT_COLOR_THEME.stageVignette).toBe('rgba(0, 0, 0, 0.68)');
  });

  it('renders the shared production depth environment in component previews', () => {
    const html = renderToStaticMarkup(<ProductionComponentPreview componentId="browser-demo" />);
    expect(html).toContain('data-production-stage="depth"');
    expect(html).toContain('data-stage-grid="low-contrast"');
    expect(html).toContain('data-stage-vignette="cinematic"');
  });

  it('renders director motion grammar above production components', () => {
    const html = renderToStaticMarkup(<HeroTrackV2
      frame={12}
      accent="#48e7f3"
      secondary="#ff7aa8"
      visualSystem={{variant: 'cinematic-tech', pacing: 'balanced', platform: 'portrait'}}
      track={{
        kind: 'overview-matrix',
        captionStartIndex: 0,
        captionEndIndex: 0,
        states: [{
          startFrame: 0,
          endFrame: 90,
          captionStartIndex: 0,
          captionEndIndex: 0,
          label: 'Browser',
          detail: '浏览器打开页面检查 DOM。',
          evidence: ['DOM ready'],
          entityTarget: 'skill-01',
          componentId: 'browser-demo',
          resolution: 'matched',
          lens: {key: 'browser-demo:0', objective: '检查 DOM', actionLabel: '浏览器实操', signal: 'focus', evidenceType: 'DOM 状态'},
          shot: {kind: 'browser-demo', environment: 'Browser + DevTools', target: 'viewport / DOM', evidence: ['DOM ready'], status: 'active'},
          componentProps: {title: 'Browser', detail: '浏览器打开页面检查 DOM。', evidence: ['DOM ready'], status: 'active'},
          director: {
            scenePrimitive: 'editor-canvas-demo',
            layoutSignature: 'portrait:hero-track-v2:hero-title',
            motionPreset: 'focus-lock',
            transitionPreset: 'ambient-fade',
            focusTarget: 'skill-01',
            density: 'high',
          },
        }],
      }}
    />);

    expect(html).toContain('data-production-component="browser-demo"');
    expect(html).toContain('data-director-motion="focus-lock"');
  });
});
