import React, {useEffect, useState} from 'react';
import type {VideoProject} from '../../project/projectSchema';
import type {SceneStillsManifest} from './types';
import {sceneKeywords, scenePurpose, sceneTitle} from './scene-labels';
import {
  COMPONENT_CATEGORIES,
  LOCAL_SCENE_COMPONENTS,
  resolveLocalSceneComponent,
  type ComponentCategory,
} from './component-library-model';

type Scene = VideoProject['scenes'][number];

interface SceneEditWorkspaceProps {
  project: VideoProject;
  selectedScene: number;
  sceneStills: SceneStillsManifest | null;
  fps: number;
  writable: boolean;
  saving: boolean;
  busy: boolean;
  runnerOnline: boolean;
  onSaveScene: (sceneIndex: number, payload: Record<string, unknown>) => void | Promise<void>;
  onRenderSceneStills: () => void;
  trace?: React.ReactNode;
  allowStillRender?: boolean;
}

const backgroundPresets = [
  {id: 'warm-grid', label: '暖色网格'},
  {id: 'apple-glass', label: '玻璃工作台'},
  {id: 'code-surface', label: '代码背景'},
  {id: 'clean-paper', label: '干净纸面'},
];

const recordOf = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
const stringOf = (value: unknown, fallback = '') => typeof value === 'string' ? value : fallback;
const splitKeywords = (value: string) => [...new Set(value.split(/[,，、/\\s]+/).map((item) => item.trim()).filter(Boolean))].slice(0, 8);
const trimTo = (value: string, max: number) => value.trim().slice(0, max);

const inferComponentId = (scene: Scene) => {
  const editor = recordOf(scene.payload.sceneEditor);
  const rendererComponentId = stringOf(editor.rendererComponentId);
  if (resolveLocalSceneComponent(rendererComponentId)) return rendererComponentId;
  const explicit = stringOf(editor.componentId);
  if (resolveLocalSceneComponent(explicit)) return explicit;
  const variant = stringOf(scene.payload.variant);
  const visualMode = stringOf(scene.payload.visualMode);
  if (variant === 'remotion' || variant === 'coding') return 'code-panel';
  if (visualMode === 'compare') return 'compare-split';
  if (visualMode === 'process') return 'process-steps';
  if (visualMode === 'metrics') return 'data-proof';
  if (variant === 'ui' || variant === 'frontend-design' || variant === 'ux-pro') return 'product-surface';
  if (visualMode === 'grid' || variant === 'overview') return 'keyword-matrix';
  return 'hero-title';
};

const captionForScene = (project: VideoProject, scene: Scene) => {
  const range = scene.captionRange;
  if (!range) return '';
  return project.captions.slice(range.startIndex, range.endIndex + 1).map((caption) => caption.text).join('');
};

const buildInitialState = (project: VideoProject, scene: Scene) => {
  const editor = recordOf(scene.payload.sceneEditor);
  const description = stringOf(scene.payload.subtitle, stringOf(scene.payload.body, scenePurpose(scene)));
  return {
    componentId: inferComponentId(scene),
    backgroundPreset: stringOf(editor.backgroundPreset, 'warm-grid'),
    title: sceneTitle(scene),
    description,
    keywords: sceneKeywords(scene).join('，'),
    caption: stringOf(scene.payload.footer, captionForScene(project, scene)),
    accent: stringOf(scene.payload.accent, '#d9642a'),
  };
};

export const SceneEditWorkspace: React.FC<SceneEditWorkspaceProps> = ({
  project,
  selectedScene,
  sceneStills,
  fps,
  writable,
  saving,
  busy,
  runnerOnline,
  onSaveScene,
  onRenderSceneStills,
  trace,
  allowStillRender = false,
}) => {
  const sceneIndex = project.scenes.length > 0 ? Math.min(Math.max(selectedScene, 0), project.scenes.length - 1) : 0;
  const scene = project.scenes[sceneIndex];
  const [category, setCategory] = useState<ComponentCategory>('推荐');
  const [draft, setDraft] = useState(() => scene ? buildInitialState(project, scene) : {
    componentId: 'hero-title',
    backgroundPreset: 'warm-grid',
    title: '',
    description: '',
    keywords: '',
    caption: '',
    accent: '#d9642a',
  });

  useEffect(() => {
    if (scene) setDraft(buildInitialState(project, scene));
    setCategory('推荐');
  }, [project, scene]);

  if (!scene) {
    return <div className="preview-empty-state">保存并更新分镜后，这里会显示当前分镜的编辑项。</div>;
  }

  const selectedTemplate = resolveLocalSceneComponent(draft.componentId) || LOCAL_SCENE_COMPONENTS[0];
  const visibleTemplates = LOCAL_SCENE_COMPONENTS.filter((item) => category === '推荐' ? ['keyword-matrix', 'code-panel', 'process-steps', 'compare-split'].includes(item.id) : item.category === category);
  const duration = (scene.durationInFrames / fps).toFixed(1);

  const saveDraft = () => {
    const keywords = splitKeywords(draft.keywords);
    const description = trimTo(draft.description, 120);
    const caption = trimTo(draft.caption, 120);
    const nextPayload = {
      ...scene.payload,
      variant: selectedTemplate.renderer.variant,
      visualMode: selectedTemplate.renderer.visualMode,
      heroStyle: selectedTemplate.renderer.heroStyle,
      title: trimTo(draft.title, 80) || sceneTitle(scene),
      subtitle: description || undefined,
      body: description || undefined,
      footer: caption || undefined,
      labels: keywords.length > 0 ? keywords : sceneKeywords(scene),
      accent: trimTo(draft.accent, 32) || '#d9642a',
      layoutSignature: `editor:${selectedTemplate.id}:${draft.backgroundPreset}`,
      sceneEditor: {
        componentId: selectedTemplate.id,
        source: selectedTemplate.source,
        sourceComponentId: selectedTemplate.sourceId,
        rendererComponentId: selectedTemplate.renderer.componentId,
        componentLabel: selectedTemplate.label,
        componentCategory: selectedTemplate.category,
        orientation: selectedTemplate.orientation,
        backgroundPreset: draft.backgroundPreset,
        blocks: ['background', 'component', 'caption'],
        updatedAt: new Date().toISOString(),
      },
    };
    void onSaveScene(sceneIndex, nextPayload);
  };

  return <section className="scene-edit" aria-label="当前分镜二次编辑">
    {!writable && <div className="notice notice--neutral">样例项目为只读。新建视频后可以保存当前分镜修改。</div>}
    <div className="scene-edit__summary">
      <div>
        <small>{String(sceneIndex + 1).padStart(2, '0')} / {duration}s</small>
        <strong>{sceneTitle(scene)}</strong>
        <span>{scenePurpose(scene)}</span>
      </div>
    </div>

    <div className="scene-edit__section">
      <div className="scene-edit__section-head"><strong>主体组件</strong><span>{selectedTemplate.label}</span></div>
      <div className="component-tabs" role="tablist" aria-label="组件分类">
        {COMPONENT_CATEGORIES.slice(0, 7).map((item) => <button className={category === item ? 'is-active' : ''} key={item} type="button" onClick={() => setCategory(item)}>{item}</button>)}
      </div>
      <div className="component-library">
        {visibleTemplates.map((item) => <button className={`component-option ${draft.componentId === item.id ? 'is-selected' : ''}`} key={item.id} type="button" onClick={() => setDraft((current) => ({...current, componentId: item.id}))}>
          <strong>{item.label}</strong>
          <span>{item.description}</span>
        </button>)}
      </div>
    </div>

    <div className="scene-edit__section">
      <div className="scene-edit__section-head"><strong>内容</strong><span>当前分镜</span></div>
      <label className="scene-edit__field"><span>标题</span><input value={draft.title} maxLength={80} disabled={!writable || saving} onChange={(event) => setDraft((current) => ({...current, title: event.target.value}))} /></label>
      <label className="scene-edit__field"><span>说明</span><textarea rows={3} value={draft.description} maxLength={120} disabled={!writable || saving} onChange={(event) => setDraft((current) => ({...current, description: event.target.value}))} /></label>
      <label className="scene-edit__field"><span>关键词</span><input value={draft.keywords} disabled={!writable || saving} placeholder="record，render，skill" onChange={(event) => setDraft((current) => ({...current, keywords: event.target.value}))} /></label>
    </div>

    <div className="scene-edit__section scene-edit__section--compact">
      <label className="scene-edit__field"><span>背景</span><select value={draft.backgroundPreset} disabled={!writable || saving} onChange={(event) => setDraft((current) => ({...current, backgroundPreset: event.target.value}))}>{backgroundPresets.map((item) => <option value={item.id} key={item.id}>{item.label}</option>)}</select></label>
      <label className="scene-edit__field"><span>主色</span><input value={draft.accent} disabled={!writable || saving} onChange={(event) => setDraft((current) => ({...current, accent: event.target.value}))} /></label>
    </div>

    <div className="scene-edit__section">
      <label className="scene-edit__field"><span>字幕说明</span><textarea rows={2} value={draft.caption} maxLength={120} disabled={!writable || saving} onChange={(event) => setDraft((current) => ({...current, caption: event.target.value}))} /></label>
    </div>

    <div className="scene-edit__actions">
      <button className="secondary-action" type="button" disabled={!writable || saving} onClick={saveDraft}>{saving ? '正在保存' : '保存修改'}</button>
      {allowStillRender && <button className="primary-action" type="button" disabled={!runnerOnline || busy || project.scenes.length === 0} onClick={onRenderSceneStills}>{busy ? <><i className="action-spinner" aria-hidden="true" />正在渲染关键帧</> : sceneStills ? '重渲染关键帧' : '渲染关键帧'}</button>}
    </div>
    {trace}
  </section>;
};
