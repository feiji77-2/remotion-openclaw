import React, {useEffect, useMemo, useState} from 'react';
import type {VideoProject} from '../../project/projectSchema';
import {
  COMPONENT_CATEGORIES,
  COMPONENT_ORIENTATIONS,
  componentPreviewLabel,
  dedupeComponentLibrary,
  inferRecommendedComponentIds,
  isComponentPlayable,
  orientationLabel,
  type ComponentCategory,
  type ComponentLibraryItem,
  type ComponentOrientation,
} from './component-library-model';
import {ComponentMockPreview} from './ComponentPreviewCanvas';
import {sceneTitle} from './scene-labels';

interface ComponentLibraryWorkspaceProps {
  components: ComponentLibraryItem[];
  loading: boolean;
  warning: string | null;
  selectedId: string | null;
  selectedScene: number;
  project: VideoProject;
  writable: boolean;
  saving: boolean;
  onSelect: (id: string) => void;
  onApply: (component: ComponentLibraryItem) => void | Promise<void>;
}

const sourceLabel = (component: ComponentLibraryItem) => component.source === 'project' ? '内置组件' : 'HyperFrames';
const hiddenVariableCount = (component: ComponentLibraryItem) => component.schema.filter((field) => field.hidden).length;
const visibleVariables = (component: ComponentLibraryItem) => component.schema.filter((field) => !field.hidden).slice(0, 8);

const variableDefault = (value: unknown) => {
  if (value == null || value === '') return '默认';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  return String(value).slice(0, 36);
};

const matchesQuery = (component: ComponentLibraryItem, query: string) => {
  if (!query.trim()) return true;
  const needle = query.trim().toLowerCase();
  return [component.label, component.description, component.category, component.sourceId, ...component.tags]
    .join(' ')
    .toLowerCase()
    .includes(needle);
};

type ComponentScope = 'playable' | 'all';

export const ComponentLibraryWorkspace: React.FC<ComponentLibraryWorkspaceProps> = ({
  components,
  loading,
  warning,
  selectedId,
  selectedScene,
  project,
  writable,
  saving,
  onSelect,
  onApply,
}) => {
  const dedupedComponents = useMemo(() => dedupeComponentLibrary(components), [components]);
  const [orientation, setOrientation] = useState<ComponentOrientation>('portrait');
  const [category, setCategory] = useState<ComponentCategory>('推荐');
  const [scope, setScope] = useState<ComponentScope>('playable');
  const [query, setQuery] = useState('');
  const selected = dedupedComponents.find((component) => component.id === selectedId) || dedupedComponents[0] || null;
  const scopedComponents = useMemo(() => scope === 'playable'
    ? dedupedComponents.filter(isComponentPlayable)
    : dedupedComponents, [dedupedComponents, scope]);
  const counts = useMemo(() => ({
    portrait: scopedComponents.filter((component) => component.orientation === 'portrait').length,
    landscape: scopedComponents.filter((component) => component.orientation === 'landscape').length,
  }), [scopedComponents]);
  const allCount = dedupedComponents.length;
  const playableCount = dedupedComponents.filter(isComponentPlayable).length;
  const selectedSceneTitle = project.scenes[selectedScene] ? sceneTitle(project.scenes[selectedScene]) : '当前分镜';
  const visible = scopedComponents
    .filter((component) => component.orientation === orientation)
    .filter((component) => category === '推荐' ? inferRecommendedComponentIds(orientation).includes(component.id) : component.category === category)
    .filter((component) => matchesQuery(component, query));

  useEffect(() => {
    if (!selected || visible.some((component) => component.id === selected.id)) return;
    if (visible[0]) {
      onSelect(visible[0].id);
      return;
    }
    const selectedStillAvailable = scopedComponents.some((component) => component.id === selected.id && component.orientation === orientation);
    if (selectedStillAvailable) return;
    const preferred = scopedComponents.find((component) => component.orientation === orientation && inferRecommendedComponentIds(orientation).includes(component.id))
      || scopedComponents.find((component) => component.orientation === orientation)
      || scopedComponents[0]
      || null;
    if (preferred) onSelect(preferred.id);
  }, [onSelect, orientation, scopedComponents, selected, visible]);

  return <div className="workspace-panel component-workspace">
    <div className="workspace-heading">
      <div><span className="workspace-kicker">组件库 / 素材资产</span><h1>组件库</h1></div>
      <span className="state-chip is-current">{scope === 'playable' ? `${playableCount} 可用` : `${allCount} 全量`}</span>
    </div>
    <p className="workspace-copy">默认只显示可用组件。点击后中间区域显示视频样片或结构预览。</p>
    {warning && <div className="notice notice--neutral">{warning}</div>}
    {loading && <div className="notice notice--neutral">正在同步组件库数据...</div>}
    <section className="component-applybar">
      <div className="component-applybar__copy">
        <small>{selected ? `${sourceLabel(selected)} · ${orientationLabel(selected.orientation)}` : '未选择组件'}</small>
        <strong>{selected ? selected.label : '从下方列表选择一个组件'}</strong>
        <span>{selected ? `${selected.size} · ${componentPreviewLabel(selected)}` : '中间预览区会随选择直接更新'}</span>
      </div>
      <button className="primary-action component-applybar__action" type="button" disabled={!selected || !writable || saving || project.scenes.length === 0} onClick={() => selected && void onApply(selected)}>
        {saving ? '正在应用' : `应用到 ${String(selectedScene + 1).padStart(2, '0')} · ${selectedSceneTitle}`}
      </button>
    </section>

    <section className="component-picker">
      <div className="component-scope-tabs" role="tablist" aria-label="组件范围">
        <button className={scope === 'playable' ? 'is-active' : ''} type="button" onClick={() => setScope('playable')}><strong>可用</strong><span>{playableCount}</span></button>
        <button className={scope === 'all' ? 'is-active' : ''} type="button" onClick={() => setScope('all')}><strong>全量</strong><span>{allCount}</span></button>
      </div>
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
          className={`component-result ${selected?.id === component.id ? 'is-selected' : ''} ${component.previewUrl ? 'is-video' : 'is-structure-only'} ${isComponentPlayable(component) ? '' : 'is-template-only'}`}
          key={component.id}
          onClick={() => onSelect(component.id)}
          type="button"
        >
          <span className="component-result__preview"><ComponentMockPreview component={component} compact /></span>
          <span className="component-result__body">
            <small>{sourceLabel(component)} · {component.category}</small>
            <strong>{component.label}</strong>
            <em>{componentPreviewLabel(component)} · {component.size}</em>
          </span>
        </button>)}
        {!visible.length && <div className="preview-empty-state">{scope === 'playable' ? '这个分类暂时没有可用组件。切到全量可以查看结构草图模板。' : '没有匹配的组件。'}</div>}
      </div>
    </section>

    {selected && <section className="component-schema">
      <div className="scene-edit__section-head"><strong>可编辑变量</strong><span>{visibleVariables(selected).length} 项{hiddenVariableCount(selected) ? ` · 隐藏 ${hiddenVariableCount(selected)} 项` : ''}</span></div>
      <div className="component-schema__list">
        {visibleVariables(selected).map((field) => <div className="component-schema__row" key={field.id}>
          <span><strong>{field.label}</strong><small>{field.id}</small></span>
          <em>{field.type}</em>
          <b>{variableDefault(field.default)}</b>
        </div>)}
        {!visibleVariables(selected).length && <div className="preview-empty-state">这个组件暂时没有暴露可编辑变量。</div>}
      </div>
    </section>}
  </div>;
};
