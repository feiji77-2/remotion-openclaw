import React from 'react';
import {ProductionComponentPreview} from '../../components/ultimate-kit/families/skill-showcase/HeroTrackV2';
import type {ComponentCategory, ComponentLibraryItem} from './component-library-model';
import {componentPreviewLabel, orientationLabel} from './component-library-model';

const categoryTone: Record<ComponentCategory, string> = {
  推荐: 'general',
  标题: 'title',
  代码: 'code',
  流程: 'flow',
  对比: 'compare',
  数据: 'data',
  界面: 'ui',
  字幕: 'caption',
  转场: 'transition',
  特效: 'effect',
};

export const ComponentMockPreview: React.FC<{component: ComponentLibraryItem; compact?: boolean}> = ({component, compact = false}) => {
  const visibleTags = component.tags.slice(0, compact ? 2 : 4);
  return <div className={`component-mock is-${categoryTone[component.category]} ${compact ? 'is-compact' : ''}`}>
    <div className="component-mock__shine" />
    <div className="component-mock__top"><span>{component.source === 'project' ? 'REMOTION' : 'HYPERFRAMES'}</span><em>{component.category}</em></div>
    <div className="component-mock__body">
      <strong>{component.label}</strong>
      {!compact && <p>{component.description}</p>}
      <div className="component-mock__visual" aria-hidden="true">
        {component.category === '数据' && <><i style={{height: '42%'}} /><i style={{height: '72%'}} /><i style={{height: '56%'}} /><i style={{height: '88%'}} /></>}
        {component.category === '代码' && <><code>const frame = useCurrentFrame();</code><code>render(component)</code><code>export mp4</code></>}
        {component.category === '流程' && <><b>01</b><b>02</b><b>03</b></>}
        {component.category === '对比' && <><mark>Before</mark><mark>After</mark></>}
        {component.category === '界面' && <><span /><span /><span /></>}
        {(component.category === '标题' || component.category === '字幕' || component.category === '推荐') && <><strong>{component.label.slice(0, compact ? 8 : 14)}</strong><small>{visibleTags.join(' / ') || '可编辑内容'}</small></>}
        {(component.category === '转场' || component.category === '特效') && <><u /><u /><u /></>}
      </div>
    </div>
    {!compact && <div className="component-mock__tags">{visibleTags.map((tag) => <span key={tag}>{tag}</span>)}</div>}
  </div>;
};

export const ComponentPreviewCanvas: React.FC<{component: ComponentLibraryItem | null; projectTitle: string}> = ({component, projectTitle}) => {
  if (!component) {
    return <div className="component-preview-canvas">
      <div className="preview-empty"><div className="preview-empty__message"><strong>选择一个组件</strong><span>组件库会在这里直接播放预览，不打开新页面。</span></div></div>
    </div>;
  }

  return <div className={`component-preview-canvas is-${component.orientation}`}>
    <div className="preview-meta preview-meta--top">
      <span className={`stage-dot ${component.previewUrl ? 'is-ready' : ''}`} />
      <span>{component.previewUrl ? '样片播放中' : componentPreviewLabel(component)}</span>
    </div>
    <div className={`component-preview-frame is-${component.orientation}`}>
      {component.productionReady && component.renderer ? <div className="component-production-preview">
        <ProductionComponentPreview componentId={component.renderer.componentId} />
      </div> : component.previewUrl ? <video
        key={component.id}
        src={component.previewUrl}
        autoPlay
        muted
        loop
        controls
        playsInline
        className="component-preview-video"
      /> : <ComponentMockPreview component={component} />}
    </div>
    <div className="preview-meta preview-meta--bottom">
      <span>{component.label}</span>
      <span>{orientationLabel(component.orientation)} · {component.size} · {component.source === 'project' ? projectTitle : 'HyperFrames'} · {componentPreviewLabel(component)}</span>
    </div>
  </div>;
};
