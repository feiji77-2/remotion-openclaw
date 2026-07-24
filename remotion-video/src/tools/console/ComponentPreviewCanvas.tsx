import React from 'react';
import {ProductionComponentPreview} from '../../components/ultimate-kit/families/skill-showcase/HeroTrackV2';
import {orientationLabel} from './component-library-model';
import type {CompositionTemplateItem} from './component-library-model';

export const ComponentPreviewCanvas: React.FC<{component: CompositionTemplateItem | null; projectTitle: string}> = ({component, projectTitle}) => {
  if (!component) {
    return <div className="component-preview-canvas">
      <div className="preview-empty"><div className="preview-empty__message"><strong>选择一个组件</strong><span>组件库会在这里直接显示生产渲染预览。</span></div></div>
    </div>;
  }

  return <div className={`component-preview-canvas is-${component.orientation}`}>
    <div className="preview-meta preview-meta--top">
      <span className="stage-dot is-ready" />
      <span>生产渲染预览</span>
    </div>
    <div className={`component-preview-frame is-${component.orientation}`}>
      <div className="component-production-preview">
        <ProductionComponentPreview componentId={component.compositionId} />
      </div>
    </div>
    <div className="preview-meta preview-meta--bottom">
      <span>{component.label}</span>
      <span>{orientationLabel(component.orientation)} · {component.size} · {projectTitle} · 生产渲染器</span>
    </div>
  </div>;
};
