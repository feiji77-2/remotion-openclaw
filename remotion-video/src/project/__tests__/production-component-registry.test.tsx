import {describe, expect, it} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {
  PRODUCTION_COMPONENT_REGISTRY,
  ProductionComponentPreview,
  resolveProductionComponentDescriptor,
} from '../../components/ultimate-kit/families/skill-showcase/HeroTrackV2';
import {PRODUCTION_COMPONENT_IDS} from '../visualPlan';

describe('production component registry', () => {
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
});
