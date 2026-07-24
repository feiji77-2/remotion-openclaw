import React, {useEffect, useMemo, useState} from 'react';
import {
  COMPONENT_CATEGORIES,
  COMPONENT_ORIENTATIONS,
  inferRecommendedComponentIds,
  orientationLabel,
  type ComponentCategory,
  type CompositionTemplateItem,
  type ComponentOrientation,
} from './component-library-model';
import {ProductionComponentPreview} from '../../components/ultimate-kit/families/skill-showcase/HeroTrackV2';

interface ComponentLibraryWorkspaceProps {
  components: CompositionTemplateItem[];
  loading: boolean;
  warning: string | null;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const matchesQuery = (component: CompositionTemplateItem, query: string) => {
  if (!query.trim()) return true;
  const needle = query.trim().toLowerCase();
  return [component.label, component.description, component.category, component.compositionId,
    ...component.compatibleIntents, ...component.styleCapability]
    .join(' ')
    .toLowerCase()
    .includes(needle);
};

export const ComponentLibraryWorkspace: React.FC<ComponentLibraryWorkspaceProps> = ({
  components,
  loading,
  warning,
  selectedId,
  onSelect,
}) => {
  const [orientation, setOrientation] = useState<ComponentOrientation>('portrait');
  const [category, setCategory] = useState<ComponentCategory>('推荐');
  const [query, setQuery] = useState('');
  const selected = components.find((component) => component.compositionId === selectedId) || components[0] || null;
  const counts = useMemo(() => ({
    portrait: components.filter((component) => component.orientation === 'portrait').length,
    landscape: components.filter((component) => component.orientation === 'landscape').length,
  }), [components]);
  const visible = components
    .filter((component) => component.orientation === orientation)
    .filter((component) => category === '推荐' ? inferRecommendedComponentIds(orientation).includes(component.compositionId) : component.category === category)
    .filter((component) => matchesQuery(component, query));

  useEffect(() => {
    if (!selected || visible.some((component) => component.compositionId === selected.compositionId)) return;
    if (visible[0]) {
      onSelect(visible[0].compositionId);
      return;
    }
    const selectedStillAvailable = components.some((component) => component.compositionId === selected.compositionId && component.orientation === orientation);
    if (selectedStillAvailable) return;
    const preferred = components.find((component) => component.orientation === orientation && inferRecommendedComponentIds(orientation).includes(component.compositionId))
      || components.find((component) => component.orientation === orientation)
      || components[0]
      || null;
    if (preferred) onSelect(preferred.compositionId);
  }, [components, onSelect, orientation, selected, visible]);

  return <div className="workspace-panel component-workspace">
    <div className="workspace-heading">
      <div><span className="workspace-kicker">组件库 / 生产渲染器</span><h1>组件库</h1></div>
      <span className="state-chip is-current">{components.length} 个生产组件</span>
    </div>
    <p className="workspace-copy">仅展示可由生产渲染器直接预览和使用的组件。</p>
    {warning && <div className="notice notice--neutral">{warning}</div>}
    {loading && <div className="notice notice--neutral">正在同步组件库数据...</div>}
    <section className="component-applybar">
      <div className="component-applybar__copy">
        <small>{selected ? `生产组件 · ${orientationLabel(selected.orientation)}` : '未选择组件'}</small>
        <strong>{selected ? selected.label : '从下方列表选择一个组件'}</strong>
        <span>{selected ? `${selected.size} · 生产渲染预览` : '中间预览区会随选择直接更新'}</span>
      </div>
      <button className="primary-action component-applybar__action" type="button" disabled>
        由字幕语义自动匹配
      </button>
    </section>

    <section className="component-picker">
      <div className="component-orientation-tabs" role="tablist" aria-label="画幅选择">
        {COMPONENT_ORIENTATIONS.map((item) => <button
          className={orientation === item ? 'is-active' : ''}
          key={item}
          onClick={() => { setOrientation(item); setCategory('推荐'); }}
          type="button"
        >
          <strong>{orientationLabel(item)}</strong>
          <span>{counts[item]}</span>
        </button>)}
      </div>
      <label className="component-search">
        <span>搜索组件</span>
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="代码、流程、数据、字幕..." />
      </label>
      <div className="component-tabs" role="tablist" aria-label="组件分类">
        {COMPONENT_CATEGORIES.map((item) => <button className={category === item ? 'is-active' : ''} key={item} type="button" onClick={() => setCategory(item)}>{item}</button>)}
      </div>
      <div className="component-results" aria-label="组件列表">
        {visible.map((component) => <button
          className={`component-result ${selected?.compositionId === component.compositionId ? 'is-selected' : ''} is-structure-only`}
          key={component.compositionId}
          onClick={() => onSelect(component.compositionId)}
          type="button"
        >
          <span className="component-result__preview"><ProductionComponentPreview componentId={component.compositionId} /></span>
          <span className="component-result__body">
            <small>生产组件 · {component.category}</small>
            <strong>{component.label}</strong>
            <em>生产渲染预览 · {component.size}</em>
          </span>
        </button>)}
        {!visible.length && <div className="preview-empty-state">没有匹配的生产组件。</div>}
      </div>
    </section>
  </div>;
};
