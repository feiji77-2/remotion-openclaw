import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {usePipelineOrchestrator} from './app/usePipelineOrchestrator';
import {usePreviewPlayback} from './app/usePreviewPlayback';
import {computeStepBadgeClass, computeStepBadgeLabel, useBuildStatus, useStepStatus} from './app/useStepStatus';
import {STEP_LIST} from './workflow/steps';
import {StepWorkspace} from './components/steps';

const App: React.FC = () => {
  const {
    activeStep,
    activeStepMeta,
    apiBase,
    apiKey,
    appliedTitleKeywords,
    applyTitleKeywords,
    backfillVoiceDurations,
    busyAll,
    confirmCurrentStep,
    errorMsg,
    generateStep,
    generateStoryboardImages,
    getStepPreview,
    goNextStep,
    handleSelectTitle,
    handleStepSelect,
    hasPendingTitleKeywords,
    currentSkillOverride,
    currentStepEvaluation,
    currentStepResolvedSkill,
    currentStepSkillId,
    imageCount,
    imageStatus,
    nextStepId,
    pipelineState,
    playbackResetKey,
    previewMode,
    previewRatio,
    projectState,
    renderJobId,
    renderJobStatus,
    renderMediaReady,
    renderProgress,
    renderResult,
    renderStepConfigured,
    renderStepHasError,
    renderStepIsRunning,
    runAll,
    selectedShot,
    selectedShotId,
    selectedTitle,
    selectedTitleId,
    setApiBase,
    setApiKey,
    setPreviewRatio,
    setSelectedShotId,
    setSkillError,
    setTitleKeywords,
    skillCatalog,
    shotsState,
    showToast,
    skillError,
    stepConfirmed,
    stepDone,
    stepSkillDirty,
    stepLoading,
    submitRender,
    submitVoice,
    titleKeywords,
    toast,
    totalFrames,
    updateAnalysisState,
    updateCopyState,
    updatePromptsState,
    updateRenderState,
    updateStepSkill,
    updateShotsState,
    updateTitlesState,
    updateVoiceState,
    voiceAssetPreviews,
    voiceJobId,
    voiceJobStatus,
    voiceManifestUrl,
    voiceProgress,
    voiceResult,
  } = usePipelineOrchestrator();

  const [collapsedTracks, setCollapsedTracks] = useState({v1: false, g1: false, a1: false});
  const appRef = useRef<HTMLDivElement>(null);

  const {currentFrame, formatTimecode, hoverFrame, isPlaying, onTimelineHoverMove,
    onTimelinePointer, setCurrentFrame, setHoverFrame, setIsPlaying, timelineMarks,
    timelineTrackRef} = usePreviewPlayback({
    fps: projectState.fps,
    totalFrames,
    resetKey: playbackResetKey,
  });

  const buildStatus = useBuildStatus(pipelineState.projectBuild);

  const activeStepStatus = useStepStatus({
    stepConfirmed,
    stepDone,
    stepSkillDirty,
    stepId: activeStep,
  });

  const pipelineStatus = useMemo(() => {
    if (imageStatus === 'error' || voiceJobStatus === 'error' || renderJobStatus === 'error') {
      return {className: 'is-error', label: '错误'};
    }
    if (imageStatus === 'running' || voiceJobStatus === 'running' || renderJobStatus === 'running' ||
        imageStatus === 'pending' || voiceJobStatus === 'pending' || renderJobStatus === 'pending') {
      return {className: 'is-running', label: '运行中'};
    }
    if (imageStatus === 'done' && voiceJobStatus === 'done' && renderJobStatus === 'done') {
      return {className: 'is-done', label: '完成'};
    }
    return {className: 'is-idle', label: '空闲'};
  }, [imageStatus, voiceJobStatus, renderJobStatus]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (previewMode !== 'media') return;
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      return;
    }

    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        setCurrentFrame((f) => Math.max(0, f - (e.shiftKey ? 10 : 1)));
        break;
      case 'ArrowRight':
        e.preventDefault();
        setCurrentFrame((f) => Math.min(totalFrames - 1, f + (e.shiftKey ? 10 : 1)));
        break;
      case ' ':
        e.preventDefault();
        setIsPlaying((v) => !v);
        break;
      case 'Home':
        e.preventDefault();
        setCurrentFrame(0);
        break;
      case 'End':
        e.preventDefault();
        setCurrentFrame(totalFrames - 1);
        break;
      case 'Escape':
        e.preventDefault();
        setIsPlaying(false);
        break;
    }
  }, [previewMode, totalFrames, setCurrentFrame, setIsPlaying]);

  useEffect(() => {
    const app = appRef.current;
    if (app) {
      app.addEventListener('keydown', handleKeyDown as EventListener);
      return () => app.removeEventListener('keydown', handleKeyDown as EventListener);
    }
  }, [handleKeyDown]);

  // ── Step list rendering ───────────────────────────────────────────────────

  const stepList = useMemo(() => {
    return STEP_LIST.map((step) => {
      const stepIndex = STEP_LIST.findIndex((s) => s.id === step.id);
      const blockedBy = stepIndex > 0
        ? STEP_LIST.slice(0, stepIndex).find((prev) => !stepConfirmed[prev.id]) ?? null
        : null;
      const isLoading = Boolean(stepLoading[step.id]);
      const isConfirmed = Boolean(stepConfirmed[step.id]);
      const isGenerated = Boolean(stepDone[step.id]);
      const isSkillDirty = Boolean(stepSkillDirty[step.id]);
      const isRenderStep = step.id === 8;

      const badgeLabel = computeStepBadgeLabel({
        stepId: step.id,
        isRenderStep,
        isLoading,
        isConfirmed,
        isGenerated,
        isSkillDirty,
        blockedBy,
        renderStepHasError,
        renderStepIsRunning,
        renderMediaReady,
        renderStepConfigured,
      });

      const badgeClass = computeStepBadgeClass({
        stepId: step.id,
        isRenderStep,
        isLoading,
        isConfirmed,
        isGenerated,
        isSkillDirty,
        blockedBy,
        renderStepHasError,
        renderStepIsRunning,
        renderMediaReady,
        renderStepConfigured,
      });

      return {
        step,
        blockedBy,
        isLoading,
        isConfirmed,
        isGenerated,
        isSkillDirty,
        isRenderStep,
        badgeLabel,
        badgeClass,
      };
    });
  }, [stepConfirmed, stepDone, stepLoading, stepSkillDirty, renderStepHasError,
      renderStepIsRunning, renderMediaReady, renderStepConfigured]);

  // ── Timeline shot blocks ──────────────────────────────────────────────────

  const shotBlocks = useMemo(() => {
    let leftFrame = 0;
    return shotsState.map((shot, idx) => {
      const widthFrame = Math.round(shot.durationSeconds * projectState.fps);
      const left = (leftFrame / totalFrames) * 100;
      const width = (widthFrame / totalFrames) * 100;
      leftFrame += widthFrame;
      return {shot, left, width, idx};
    });
  }, [shotsState, projectState.fps, totalFrames]);

  const graphicBlocks = useMemo(() => {
    let leftFrame = 0;
    return shotsState.slice(0, Math.max(1, Math.ceil(shotsState.length / 2))).map((shot, idx) => {
      const widthFrame = Math.round(shot.durationSeconds * projectState.fps * 0.75);
      const left = (leftFrame / totalFrames) * 100;
      const width = (widthFrame / totalFrames) * 100;
      leftFrame += widthFrame;
      return {shot, left, width, idx};
    });
  }, [shotsState, projectState.fps, totalFrames]);

  const audioBlockWidth = useMemo(() => {
    return Math.max((Math.round(totalFrames * 0.92) / totalFrames) * 100, 8);
  }, [totalFrames]);

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="workflow-app" ref={appRef} tabIndex={-1}>
      <div className="mac-window">
        {/* ── Title bar ── */}
        <header className="mac-titlebar">
          <div className="mac-window-controls" aria-hidden>
            <span className="mac-dot mac-dot-red" />
            <span className="mac-dot mac-dot-yellow" />
            <span className="mac-dot mac-dot-green" />
          </div>

          <div className="mac-toolbar-main">
            <div className="mac-project-title">
              <strong>{projectState.name === '未命名项目' ? 'Remotion Video Project' : projectState.name}</strong>
              <small>{projectState.width}×{projectState.height} · {projectState.fps}fps</small>
            </div>

            <div className="mac-toolbar-actions">
              <label htmlFor="api-base-input" className="sr-only">API Base</label>
              <input id="api-base-input" value={apiBase} onChange={(e) => setApiBase(e.target.value)}
                className="mac-input mac-api" placeholder="API Base" />
              <label htmlFor="api-key-input" className="sr-only">API Key</label>
              <input id="api-key-input" value={apiKey} onChange={(e) => setApiKey(e.target.value)}
                className="mac-input mac-api" placeholder="API Key" type="password" />
              <button className="mac-btn" type="button" onClick={() => showToast('导出设置面板（示意）')}>
                导出设置
              </button>
              <button
                className={`mac-btn mac-btn-primary ${busyAll ? 'is-loading' : ''}`}
                onClick={runAll}
                disabled={busyAll}
                type="button"
              >
                {busyAll ? '执行中' : '一键执行'}
              </button>
            </div>
          </div>
        </header>

        {/* ── Main 3-column layout ── */}
        <div className="mac-layout">

          {/* ── Left: Step list ── */}
          <aside className="mac-panel mac-left">
            <section className="mac-group">
              <div className="mac-group-title">流程步骤</div>
              <div className="mac-step-list">
                {stepList.map(({step, blockedBy, isConfirmed, badgeLabel, badgeClass}) => (
                  <button
                    key={step.id}
                    className={`mac-step ${activeStep === step.id ? 'active' : ''} ${
                      (isConfirmed || (step.id === 8 && renderMediaReady)) ? 'is-confirmed' : ''
                    } ${blockedBy && !stepDone[step.id] ? 'is-blocked' : ''} ${
                      stepSkillDirty[step.id] ? 'is-stale' : ''
                    }`}
                    onClick={() => { void handleStepSelect(step.id); }}
                    disabled={Boolean(stepLoading[step.id])}
                    type="button"
                    title={blockedBy ? `请先确认 Step ${blockedBy.id} · ${blockedBy.label}` : undefined}
                  >
                    <div className="mac-step-line">
                      <span>Step {step.id} · {step.label}</span>
                      <span className={`mac-step-badge ${badgeClass}`}>{badgeLabel}</span>
                    </div>
                    <small>{step.hint}</small>
                    <div className="mac-step-output-preview">{getStepPreview(step.id)}</div>
                  </button>
                ))}
              </div>
            </section>
          </aside>

          {/* ── Center: Preview + Step editor ── */}
          <main className="mac-center">
            <section className={`mac-preview-shell ${previewMode === 'planning' ? 'is-planning' : 'is-media'}`}>
              <div className={`mac-preview-window ${previewMode === 'planning' ? 'is-planning' : 'is-media'}`}>

                {/* Planning strip (steps 1-5, 7) */}
                {previewMode === 'planning' ? (
                  <div className="mac-step-context-strip">
                    <p className="mac-step-context-copy">{getStepPreview(activeStep)}</p>
                    <div className="mac-step-context-actions">
                      <span className={`mac-status-pill ${activeStepStatus.className}`}>
                        {activeStepStatus.label}
                      </span>
                      {nextStepId ? (
                        <button className="mac-btn mac-btn-primary" type="button" onClick={goNextStep}>
                          下一步
                        </button>
                      ) : null}
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Media header */}
                    <div className="mac-preview-head">
                      <div className="mac-group-title">预览</div>
                      <div className="mac-timecode">
                        {formatTimecode(currentFrame)} / {formatTimecode(totalFrames)}
                      </div>
                    </div>

                    {/* Viewport */}
                    <div className="mac-preview-viewport">
                      <a
                        className="mac-preview-plugin-link"
                        href="https://chromewebstore.google.com/search/ai%20assistant"
                        target="_blank"
                        rel="noreferrer"
                        title="打开浏览器 AI 插件商店"
                        aria-label="打开浏览器 AI 插件商店"
                      >
                        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                          <path d="M12 3L4 7.5V16.5L12 21L20 16.5V7.5L12 3Z" stroke="currentColor"
                            strokeWidth="1.7" strokeLinejoin="round"/>
                          <path d="M8.5 11.5H15.5M12 8V15" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
                        </svg>
                      </a>
                      <div className={`mac-preview-canvas ${previewRatio === 'portrait' ? 'is-portrait' : 'is-landscape'}`}>
                        <div className="mac-preview-overlay">
                          <h3>{activeStepMeta.label}</h3>
                          <p>{selectedShot?.title || '未选择镜头'}</p>
                          {isPlaying ? <span className="mac-playing-pill">正在播放</span> : null}
                        </div>
                      </div>
                    </div>

                    {/* Stage meta */}
                    <div className="mac-preview-stage">
                      <div className="mac-preview-stage-meta">
                        <span>当前步骤：{activeStepMeta.label}</span>
                        <span>当前镜头：{selectedShot?.title || '未选择'}</span>
                        <span>主标题：{selectedTitle?.title || '待确认'}</span>
                        <span>配音引擎：{pipelineState.voice?.engine || 'qwen-tts'}</span>
                      </div>
                      <div className="mac-preview-keyboard-hints" aria-hidden="true">
                        <kbd>←</kbd><kbd>→</kbd> 帧 | <kbd>Space</kbd> 播放 | <kbd>Home</kbd><kbd>End</kbd> 首尾
                      </div>
                    </div>
                  </>
                )}

                {/* Step workspace */}
                <div className={`mac-step-shell ${previewMode === 'planning' ? 'is-planning' : ''}`}>
                  <StepWorkspace
                    step={activeStepMeta}
                    stepId={activeStep}
                    titleKeywords={titleKeywords}
                    appliedTitleKeywords={appliedTitleKeywords}
                    hasPendingTitleKeywords={hasPendingTitleKeywords}
                    onTitleKeywordsChange={setTitleKeywords}
                    shots={shotsState}
                    pipelineState={pipelineState}
                    selectedTitleId={selectedTitleId}
                    loading={Boolean(stepLoading[activeStep])}
                    confirmed={Boolean(stepConfirmed[activeStep])}
                    skillDirty={Boolean(stepSkillDirty[activeStep])}
                    voiceStatus={voiceJobStatus}
                    voiceJobId={voiceJobId}
                    voiceProgress={voiceProgress}
                    voiceResult={voiceResult}
                    voiceManifestUrl={voiceManifestUrl}
                    voiceAssets={voiceAssetPreviews}
                    onBackfillVoiceDurations={backfillVoiceDurations}
                    renderStatus={renderJobStatus}
                    renderJobId={renderJobId}
                    renderProgress={renderProgress}
                    renderResult={renderResult}
                    stepEvaluation={currentStepEvaluation}
                    imageStatus={imageStatus}
                    imageCount={imageCount}
                    onGenerateStep={() => { void generateStep(activeStep, {trigger: 'manual'}); }}
                    onApplyTitleKeywords={() => { void applyTitleKeywords(); }}
                    onConfirmStep={confirmCurrentStep}
                    onUpdateStepSkill={updateStepSkill}
                    onSelectTitle={handleSelectTitle}
                    onUpdateAnalysis={updateAnalysisState}
                    onUpdateTitles={updateTitlesState}
                    onUpdateCopy={updateCopyState}
                    onUpdateShots={updateShotsState}
                    onUpdatePrompts={updatePromptsState}
                    onUpdateVoice={updateVoiceState}
                    onUpdateRender={updateRenderState}
                    onGenerateImages={generateStoryboardImages}
                    onSubmitVoice={submitVoice}
                    onSubmitRender={() => { void submitRender(); }}
                  />
                </div>

                {/* Media controls (steps 6, 8) */}
                {previewMode === 'media' ? (
                  <div className="mac-preview-controls">
                    <button className="mac-btn" type="button"
                      onClick={() => setCurrentFrame((f) => Math.max(0, f - 1))}
                      aria-label="后退一帧">⏮</button>
                    <button className="mac-btn" type="button"
                      onClick={() => setIsPlaying((v) => !v)}
                      aria-label={isPlaying ? '暂停播放' : '开始播放'}>
                      {isPlaying ? '⏸ 暂停' : '▶ 播放'}
                    </button>
                    <button className="mac-btn" type="button"
                      onClick={() => setCurrentFrame((f) => Math.min(totalFrames - 1, f + 1))}
                      aria-label="前进一帧">⏭</button>
                    {activeStep !== 8 ? (
                      <span className={`mac-status-pill ${
                        stepConfirmed[activeStep] ? 'is-done' : stepDone[activeStep] ? 'is-running' : 'is-idle'
                      }`}>
                        {stepConfirmed[activeStep] ? '当前已确认' : stepDone[activeStep] ? '待确认' : '待生成'}
                      </span>
                    ) : null}
                    {nextStepId ? (
                      <button className="mac-btn mac-btn-primary" type="button" onClick={goNextStep}>
                        下一步
                      </button>
                    ) : null}
                    <div className="mac-segmented">
                      <button className={previewRatio === 'landscape' ? 'active' : ''}
                        onClick={() => setPreviewRatio('landscape')} type="button">横屏 16:9</button>
                      <button className={previewRatio === 'portrait' ? 'active' : ''}
                        onClick={() => setPreviewRatio('portrait')} type="button">竖屏 9:16</button>
                    </div>
                  </div>
                ) : null}
              </div>
            </section>
          </main>

          {/* ── Right: Skill library + current step + job status ── */}
          <aside className="mac-panel mac-right">
            <section className="mac-group mac-war-room-panel">
              <div className="mac-war-room-head">
                <div className="mac-group-title">Skill 库</div>
                <strong>当前 Step 作战台</strong>
              </div>
              <div className="mac-skill-library">
                {skillCatalog.map((skill) => (
                  <div
                    key={skill.skillId}
                    className={`mac-skill-card ${
                      currentStepSkillId === skill.skillId ? 'is-current' : ''
                    } ${skill.status !== 'ready' ? 'is-error' : ''}`}
                  >
                    <div className="mac-skill-card-head">
                      <span className="mac-skill-card-title">{skill.name || skill.skillId}</span>
                      <span className={`mac-status-pill ${skill.status === 'ready' ? 'is-done' : 'is-error'}`}>
                        {skill.status === 'ready' ? '已接入' : '异常'}
                      </span>
                    </div>
                    <small>{skill.stepLabel || 'Meta Skill'}</small>
                    <p>{skill.displaySummary || skill.description}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="mac-group mac-war-room-current">
              <div className="mac-war-room-head">
                <div className="mac-group-title">当前 Step Skill</div>
                <strong>{currentStepResolvedSkill?.name || '等待 Skill 真源'}</strong>
              </div>
              {currentStepResolvedSkill ? (
                <>
                  <p className="mac-war-room-copy">
                    {currentStepResolvedSkill.displaySummary || currentStepResolvedSkill.description}
                  </p>
                  <div className="mac-war-room-meta-grid">
                    <div className="mac-war-room-meta">
                      <span>核心目标</span>
                      <strong>{currentStepResolvedSkill.defaults?.goal || '待解析'}</strong>
                    </div>
                    <div className="mac-war-room-meta">
                      <span>覆盖状态</span>
                      <strong>
                        {currentSkillOverride && currentSkillOverride.count > 0
                          ? `已偏离默认 ${currentSkillOverride.count} 项`
                          : '未偏离默认'}
                      </strong>
                    </div>
                  </div>
                  {currentStepResolvedSkill.inputs?.length ? (
                    <div className="mac-war-room-section">
                      <span className="mac-war-room-section-title">输入要求</span>
                      <div className="mac-war-room-badges">
                        {currentStepResolvedSkill.inputs.slice(0, 6).map((item) => (
                          <span key={item} className="mac-war-room-badge">{item}</span>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  {currentStepResolvedSkill.outputs?.length ? (
                    <div className="mac-war-room-section">
                      <span className="mac-war-room-section-title">输出结构</span>
                      <div className="mac-war-room-badges">
                        {currentStepResolvedSkill.outputs.slice(0, 6).map((item) => (
                          <span key={item} className="mac-war-room-badge is-output">{item}</span>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  {currentStepResolvedSkill.constraints?.length ? (
                    <div className="mac-war-room-section">
                      <span className="mac-war-room-section-title">关键约束</span>
                      <ul className="mac-war-room-list">
                        {currentStepResolvedSkill.constraints.slice(0, 3).map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  <div className="mac-war-room-eval">
                    <div className="mac-war-room-eval-head">
                      <span className="mac-war-room-section-title">Eval 提示</span>
                      <span className={`mac-status-pill ${
                        currentStepEvaluation?.status === 'PASS' ? 'is-done'
                          : currentStepEvaluation?.status === 'PASS_WARN' ? 'is-warning'
                          : currentStepEvaluation?.status ? 'is-error'
                          : 'is-idle'
                      }`}>
                        {currentStepEvaluation?.score
                          ? `${currentStepEvaluation.status} · ${currentStepEvaluation.score}`
                          : '待评估'}
                      </span>
                    </div>
                    {currentStepEvaluation?.issues?.length ? (
                      <div className="mac-war-room-badges">
                        {currentStepEvaluation.issues.map((item) => (
                          <span key={item} className="mac-war-room-badge is-issue">{item}</span>
                        ))}
                      </div>
                    ) : (
                      <p className="mac-war-room-copy">当前 eval 首版只做提示，不阻断确认和推进。</p>
                    )}
                    {currentStepEvaluation?.suggestions?.length ? (
                      <ul className="mac-war-room-list">
                        {currentStepEvaluation.suggestions.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                </>
              ) : (
                <p className="mac-war-room-copy">正在读取当前 Step 的 skill 真源摘要。</p>
              )}
            </section>

            <section className="mac-group mac-war-room-status">
              <div className="mac-group-title">任务状态</div>
              <div className="mac-job-card">
                <div>
                  分镜图：<span className={`mac-status-pill ${pipelineStatus.className}`}>
                    {pipelineStatus.label}
                  </span>
                </div>
                <div>产出：{imageCount} 张</div>
              </div>
              <div className="mac-job-card">
                <div>
                  配音：<span className={`mac-status-pill ${
                    voiceJobStatus === 'running' || voiceJobStatus === 'pending' ? 'is-animated' : ''
                  } ${voiceJobStatus === 'done' ? 'is-done' : voiceJobStatus === 'error' ? 'is-error' : 'is-idle'}`}>
                    {voiceJobStatus === 'running' || voiceJobStatus === 'pending' ? '运行中'
                      : voiceJobStatus === 'done' ? '完成' : voiceJobStatus === 'error' ? '错误' : '空闲'}
                  </span>
                </div>
                <div className="mac-progress">
                  <span className={voiceJobStatus === 'running' || voiceJobStatus === 'pending' ? 'is-animated' : ''}
                    style={{width: `${voiceProgress}%`}} />
                </div>
                <small>{voiceResult?.engineName || voiceResult?.engine || voiceJobId || '-'}</small>
              </div>
              <div className="mac-job-card">
                <div>
                  Step 7：<span className={`mac-status-pill ${buildStatus.className}`}>
                    {buildStatus.label}
                  </span>
                </div>
                <div>产物：{pipelineState.projectBuild?.compositionId || 'OpenClawVideo'}</div>
                <small>{pipelineState.projectBuild?.stylePreset || pipelineState.projectBuild?.projectPath || '-'}</small>
              </div>
              <div className="mac-job-card">
                <div>
                  渲染：<span className={`mac-status-pill ${
                    renderJobStatus === 'running' || renderJobStatus === 'pending' ? 'is-animated' : ''
                  } ${renderJobStatus === 'done' ? 'is-done' : renderJobStatus === 'error' ? 'is-error' : 'is-idle'}`}>
                    {renderJobStatus === 'running' || renderJobStatus === 'pending' ? '运行中'
                      : renderJobStatus === 'done' ? '完成' : renderJobStatus === 'error' ? '错误' : '空闲'}
                  </span>
                </div>
                <div className="mac-progress">
                  <span className={renderJobStatus === 'running' || renderJobStatus === 'pending' ? 'is-animated' : ''}
                    style={{width: `${renderProgress}%`}} />
                </div>
                <small>{renderResult?.outputFileName || renderResult?.outputSizeLabel || renderJobId || '-'}</small>
              </div>
            </section>
          </aside>
        </div>

        {/* ── Timeline ── */}
        <section className="mac-timeline-shell" aria-label="视频时间轴">
          <div
            className="mac-timeline-ruler"
            ref={timelineTrackRef}
            onClick={onTimelinePointer}
            role="slider"
            aria-label="播放头位置"
            aria-valuemin={0}
            aria-valuemax={totalFrames}
            aria-valuenow={currentFrame}
            aria-valuetext={`第 ${currentFrame} 帧，共 ${totalFrames} 帧`}
            tabIndex={0}
          >
            {timelineMarks.map((mark) => (
              <div key={mark.frame} className="mac-tick" style={{left: `${mark.left}%`}}>
                <span>{mark.frame}</span>
              </div>
            ))}
            <div className="mac-playhead" style={{left: `${(currentFrame / totalFrames) * 100}%`}}>
              <span className="mac-playhead-label">F{currentFrame}</span>
            </div>
          </div>

          <div
            className="mac-track-board"
            onClick={onTimelinePointer}
            onMouseMove={onTimelineHoverMove}
            onMouseLeave={() => setHoverFrame(null)}
            role="presentation"
          >
            {/* V1 — video track */}
            <div className={`mac-track-row ${collapsedTracks.v1 ? 'collapsed' : ''}`}>
              <div className="mac-track-header">
                <button type="button" className="mac-track-toggle"
                  onClick={(e) => { e.stopPropagation(); setCollapsedTracks((p) => ({...p, v1: !p.v1})); }}>
                  {collapsedTracks.v1 ? '▸' : '▾'}
                </button>
                <div><strong>V1</strong><small>视频轨</small></div>
              </div>
              <div className="mac-track-lane">
                {shotBlocks.map(({shot, left, width}) => (
                  <button
                    key={shot.id}
                    className={`mac-sequence-block mac-seq-video ${
                      selectedShotId === shot.id ? 'active' : ''
                    }`}
                    style={{left: `${left}%`, width: `${Math.max(width, 6)}%`}}
                    onClick={(e) => { e.stopPropagation(); setSelectedShotId(shot.id); }}
                    type="button"
                  >
                    {shot.title}
                  </button>
                ))}
              </div>
            </div>

            {/* G1 — graphics track */}
            <div className={`mac-track-row ${collapsedTracks.g1 ? 'collapsed' : ''}`}>
              <div className="mac-track-header">
                <button type="button" className="mac-track-toggle"
                  onClick={(e) => { e.stopPropagation(); setCollapsedTracks((p) => ({...p, g1: !p.g1})); }}>
                  {collapsedTracks.g1 ? '▸' : '▾'}
                </button>
                <div><strong>G1</strong><small>图形轨</small></div>
              </div>
              <div className="mac-track-lane">
                {graphicBlocks.map(({left, width, idx}) => (
                  <button
                    key={`g-${idx}`}
                    className="mac-sequence-block mac-seq-graphic"
                    style={{left: `${left}%`, width: `${Math.max(width, 6)}%`}}
                    type="button"
                  >
                    字幕-{idx + 1}
                  </button>
                ))}
              </div>
            </div>

            {/* A1 — audio track */}
            <div className={`mac-track-row ${collapsedTracks.a1 ? 'collapsed' : ''}`}>
              <div className="mac-track-header">
                <button type="button" className="mac-track-toggle"
                  onClick={(e) => { e.stopPropagation(); setCollapsedTracks((p) => ({...p, a1: !p.a1})); }}>
                  {collapsedTracks.a1 ? '▸' : '▾'}
                </button>
                <div><strong>A1</strong><small>音频轨</small></div>
              </div>
              <div className="mac-track-lane">
                <button
                  className="mac-sequence-block mac-seq-audio"
                  style={{left: '0%', width: `${audioBlockWidth}%`}}
                  type="button"
                >
                  Voiceover Main Track
                </button>
              </div>
            </div>

            {hoverFrame !== null ? (
              <div className="mac-blade" style={{left: `${(hoverFrame / totalFrames) * 100}%`}}>
                <span>✂︎ {hoverFrame}</span>
              </div>
            ) : null}
          </div>
        </section>
      </div>

      {errorMsg ? <div className="mac-alert">错误：{errorMsg}</div> : null}
      {skillError ? (
        <div className="mac-alert" style={{background: '#fff3e0', color: '#b54708', border: '1px solid #ffd6a5'}}>
          <span>{skillError}</span>
          <button onClick={() => setSkillError(null)} style={{marginLeft: 12, background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#b54708'}}>×</button>
        </div>
      ) : null}
      {toast ? <div className="mac-toast">{toast}</div> : null}
    </div>
  );
};

export default App;
