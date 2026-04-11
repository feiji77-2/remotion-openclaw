import React, {useMemo, useState} from 'react';
import {usePipelineOrchestrator} from './app/usePipelineOrchestrator';
import {usePreviewPlayback} from './app/usePreviewPlayback';
import {StepWorkspace} from './components/steps/StepWorkspace';
import {STEP_LIST} from './workflow/steps';

const App: React.FC = () => {
  const {
    activeStep,
    activeStepMeta,
    activeStepStatusClass,
    activeStepStatusLabel,
    activeStepSummary,
    apiBase,
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
    setPreviewRatio,
    setSelectedShotId,
    setTitleKeywords,
    skillCatalog,
    shotsState,
    showToast,
    statusClass,
    statusLabel,
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
  const {
    currentFrame,
    formatTimecode,
    hoverFrame,
    isPlaying,
    onTimelineHoverMove,
    onTimelinePointer,
    setCurrentFrame,
    setHoverFrame,
    setIsPlaying,
    timelineMarks,
    timelineTrackRef,
  } = usePreviewPlayback({
    fps: projectState.fps,
    totalFrames,
    resetKey: playbackResetKey,
  });
  const projectBuildStatusClass = useMemo(() => {
    if (pipelineState.projectBuild?.buildStatus === 'ready') return 'is-done';
    if (pipelineState.projectBuild?.buildStatus === 'missing' || pipelineState.projectBuild?.buildStatus === 'error') return 'is-error';
    return 'is-idle';
  }, [pipelineState.projectBuild?.buildStatus]);
  const projectBuildStatusLabel = useMemo(() => {
    if (pipelineState.projectBuild?.buildStatus === 'ready') return '就绪';
    if (pipelineState.projectBuild?.buildStatus === 'missing') return '缺失';
    if (pipelineState.projectBuild?.buildStatus === 'error') return '错误';
    return '待生成';
  }, [pipelineState.projectBuild?.buildStatus]);

  return (
    <div className="workflow-app">
      <div className="mac-window">
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
              <input
                value={apiBase}
                onChange={(e) => setApiBase(e.target.value)}
                className="mac-input mac-api"
                placeholder="API Base"
              />
              <button className="mac-btn" type="button" onClick={() => showToast('导出设置面板（示意）')}>导出设置</button>
              <button className={`mac-btn mac-btn-primary ${busyAll ? 'is-loading' : ''}`} onClick={runAll} disabled={busyAll} type="button">
                {busyAll ? '执行中' : '一键执行'}
              </button>
            </div>
          </div>
        </header>

        <div className="mac-layout">
          <aside className="mac-panel mac-left">
            <section className="mac-group">
              <div className="mac-group-title">流程步骤</div>
              <div className="mac-step-list">
                {STEP_LIST.map((step) => {
                  const stepIndex = STEP_LIST.findIndex((s) => s.id === step.id);
                  const blockedBy = stepIndex > 0
                    ? STEP_LIST.slice(0, stepIndex).find((prevStep) => !stepConfirmed[prevStep.id])
                    : null;
                  const isLoading = Boolean(stepLoading[step.id]);
                  const isConfirmed = Boolean(stepConfirmed[step.id]);
                  const isGenerated = Boolean(stepDone[step.id]);
                  const isSkillDirty = Boolean(stepSkillDirty[step.id]);
                  const isRenderStep = step.id === 8;
                  const badgeLabel = isRenderStep
                    ? isLoading
                      ? '生成中'
                      : renderStepHasError
                        ? '失败'
                        : renderStepIsRunning
                          ? '渲染中'
                          : renderMediaReady
                            ? '结果可用'
                            : renderStepConfigured
                              ? '待渲染'
                              : blockedBy
                                ? '锁定'
                                : '待生成'
                    : isSkillDirty
                      ? '待更新'
                    : isLoading
                      ? '生成中'
                      : isConfirmed
                        ? '已确认'
                        : isGenerated
                          ? '待确认'
                          : blockedBy
                            ? '锁定'
                            : '待生成';

                  return (
                    <button
                      key={step.id}
                      className={`mac-step ${activeStep === step.id ? 'active' : ''} ${(isConfirmed || (isRenderStep && renderMediaReady)) ? 'is-confirmed' : ''} ${blockedBy && !isGenerated ? 'is-blocked' : ''} ${isSkillDirty ? 'is-stale' : ''}`}
                      onClick={() => {
                        void handleStepSelect(step.id);
                      }}
                      disabled={isLoading}
                      type="button"
                      title={blockedBy ? `请先确认 Step ${blockedBy.id} · ${blockedBy.label}` : undefined}
                    >
                      <div className="mac-step-line">
                        <span>Step {step.id} · {step.label}</span>
                        <span className={`mac-step-badge ${isRenderStep
                          ? renderStepHasError
                            ? 'is-error'
                            : renderStepIsRunning
                            ? 'is-generating'
                            : renderMediaReady
                              ? 'is-confirmed'
                              : renderStepConfigured
                                ? 'done'
                                : blockedBy
                                  ? 'is-blocked'
                                  : ''
                          : isSkillDirty
                            ? 'is-warning'
                          : isLoading
                            ? 'is-generating'
                            : isConfirmed
                              ? 'is-confirmed'
                              : isGenerated
                                ? 'done'
                                : blockedBy
                                  ? 'is-blocked'
                                  : ''}`}>
                          {badgeLabel}
                        </span>
                      </div>
                      <small>{step.hint}</small>
                      <div className="mac-step-output-preview">{getStepPreview(step.id)}</div>
                    </button>
                  );
                })}
              </div>
            </section>

          </aside>

          <main className="mac-center">
            <section className={`mac-preview-shell ${previewMode === 'planning' ? 'is-planning' : 'is-media'}`}>
              <div className={`mac-preview-window ${previewMode === 'planning' ? 'is-planning' : 'is-media'}`}>
                {previewMode === 'planning' ? (
                  <div className="mac-step-context-strip">
                    <p className="mac-step-context-copy">{activeStepSummary}</p>
                    <div className="mac-step-context-actions">
                      <span className={`mac-status-pill ${activeStepStatusClass}`}>
                        {activeStepStatusLabel}
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
                    <div className="mac-preview-head">
                      <div className="mac-group-title">预览</div>
                      <div className="mac-timecode">{formatTimecode(currentFrame)} / {formatTimecode(totalFrames)}</div>
                    </div>

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
                          <path d="M12 3L4 7.5V16.5L12 21L20 16.5V7.5L12 3Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/>
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

                    <div className="mac-preview-stage">
                      <div className="mac-preview-stage-meta">
                        <span>当前步骤：{activeStepMeta.label}</span>
                        <span>当前镜头：{selectedShot?.title || '未选择'}</span>
                        <span>主标题：{selectedTitle?.title || '待确认'}</span>
                        <span>配音引擎：{pipelineState.voice?.engine || 'chattts'}</span>
                      </div>
                    </div>
                  </>
                )}

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
                    onGenerateStep={() => {
                      void generateStep(activeStep, {trigger: 'manual'});
                    }}
                    onApplyTitleKeywords={() => {
                      void applyTitleKeywords();
                    }}
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
                    onSubmitRender={() => {
                      void submitRender();
                    }}
                  />
                </div>

                {previewMode === 'media' ? (
                  <div className="mac-preview-controls">
                    <button className="mac-btn" type="button" onClick={() => setCurrentFrame((f) => Math.max(0, f - 1))}>⏮</button>
                    <button className="mac-btn" type="button" onClick={() => setIsPlaying((v) => !v)}>{isPlaying ? '⏸ 暂停' : '▶ 播放'}</button>
                    <button className="mac-btn" type="button" onClick={() => setCurrentFrame((f) => Math.min(totalFrames - 1, f + 1))}>⏭</button>
                    {activeStep !== 8 ? (
                      <span className={`mac-status-pill ${stepConfirmed[activeStep] ? 'is-done' : stepDone[activeStep] ? 'is-running' : 'is-idle'}`}>
                        {stepConfirmed[activeStep] ? '当前已确认' : stepDone[activeStep] ? '待确认' : '待生成'}
                      </span>
                    ) : null}
                    {nextStepId ? (
                      <button className="mac-btn mac-btn-primary" type="button" onClick={goNextStep}>
                        下一步
                      </button>
                    ) : null}
                    <div className="mac-segmented">
                      <button className={previewRatio === 'landscape' ? 'active' : ''} onClick={() => setPreviewRatio('landscape')} type="button">横屏 16:9</button>
                      <button className={previewRatio === 'portrait' ? 'active' : ''} onClick={() => setPreviewRatio('portrait')} type="button">竖屏 9:16</button>
                    </div>
                  </div>
                ) : null}
              </div>
            </section>
          </main>

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
                    className={`mac-skill-card ${currentStepSkillId === skill.skillId ? 'is-current' : ''} ${skill.status !== 'ready' ? 'is-error' : ''}`}
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
                  <p className="mac-war-room-copy">{currentStepResolvedSkill.displaySummary || currentStepResolvedSkill.description}</p>
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
                        currentStepEvaluation?.status === 'PASS'
                          ? 'is-done'
                          : currentStepEvaluation?.status === 'PASS_WARN'
                            ? 'is-warning'
                            : currentStepEvaluation?.status
                              ? 'is-error'
                              : 'is-idle'
                      }`}>
                        {currentStepEvaluation?.score ? `${currentStepEvaluation.status} · ${currentStepEvaluation.score}` : '待评估'}
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
                <div>分镜图：<span className={`mac-status-pill ${statusClass(imageStatus)} ${(imageStatus === 'running' || imageStatus === 'pending') ? 'is-animated' : ''}`}>{statusLabel(imageStatus)}</span></div>
                <div>产出：{imageCount} 张</div>
              </div>
              <div className="mac-job-card">
                <div>配音：<span className={`mac-status-pill ${statusClass(voiceJobStatus)} ${(voiceJobStatus === 'running' || voiceJobStatus === 'pending') ? 'is-animated' : ''}`}>{statusLabel(voiceJobStatus)}</span></div>
                <div className="mac-progress"><span className={(voiceJobStatus === 'running' || voiceJobStatus === 'pending') ? 'is-animated' : ''} style={{width: `${voiceProgress}%`}} /></div>
                <small>{voiceResult?.engineName || voiceResult?.engine || voiceJobId || '-'}</small>
              </div>
              <div className="mac-job-card">
                <div>Step 7：<span className={`mac-status-pill ${projectBuildStatusClass}`}>{projectBuildStatusLabel}</span></div>
                <div>产物：{pipelineState.projectBuild?.compositionId || 'OpenClawVideo'}</div>
                <small>{pipelineState.projectBuild?.stylePreset || pipelineState.projectBuild?.projectPath || '-'}</small>
              </div>
              <div className="mac-job-card">
                <div>渲染：<span className={`mac-status-pill ${statusClass(renderJobStatus)} ${(renderJobStatus === 'running' || renderJobStatus === 'pending') ? 'is-animated' : ''}`}>{statusLabel(renderJobStatus)}</span></div>
                <div className="mac-progress"><span className={(renderJobStatus === 'running' || renderJobStatus === 'pending') ? 'is-animated' : ''} style={{width: `${renderProgress}%`}} /></div>
                <small>{renderResult?.outputFileName || renderResult?.outputSizeLabel || renderJobId || '-'}</small>
              </div>
            </section>
          </aside>
        </div>

        <section className="mac-timeline-shell">
          <div className="mac-timeline-ruler" ref={timelineTrackRef} onClick={onTimelinePointer} role="presentation">
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
            <div className={`mac-track-row ${collapsedTracks.v1 ? 'collapsed' : ''}`}>
              <div className="mac-track-header">
                <button
                  type="button"
                  className="mac-track-toggle"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCollapsedTracks((prev) => ({...prev, v1: !prev.v1}));
                  }}
                >
                  {collapsedTracks.v1 ? '▸' : '▾'}
                </button>
                <div>
                  <strong>V1</strong>
                  <small>视频轨</small>
                </div>
              </div>
              <div className="mac-track-lane">
                {shotsState.map((shot, idx) => {
                  const leftFrame = shotsState.slice(0, idx).reduce((sum, s) => sum + Math.round(s.durationSeconds * projectState.fps), 0);
                  const widthFrame = Math.round(shot.durationSeconds * projectState.fps);
                  const left = (leftFrame / totalFrames) * 100;
                  const width = (widthFrame / totalFrames) * 100;

                  return (
                    <button
                      key={shot.id}
                      className={`mac-sequence-block mac-seq-video ${selectedShotId === shot.id ? 'active' : ''}`}
                      style={{left: `${left}%`, width: `${Math.max(width, 6)}%`}}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedShotId(shot.id);
                      }}
                      type="button"
                    >
                      {shot.title}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className={`mac-track-row ${collapsedTracks.g1 ? 'collapsed' : ''}`}>
              <div className="mac-track-header">
                <button
                  type="button"
                  className="mac-track-toggle"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCollapsedTracks((prev) => ({...prev, g1: !prev.g1}));
                  }}
                >
                  {collapsedTracks.g1 ? '▸' : '▾'}
                </button>
                <div>
                  <strong>G1</strong>
                  <small>图形轨</small>
                </div>
              </div>
              <div className="mac-track-lane">
                {shotsState.slice(0, Math.max(1, Math.ceil(shotsState.length / 2))).map((shot, idx) => {
                  const leftFrame = shotsState.slice(0, idx).reduce((sum, s) => sum + Math.round(s.durationSeconds * projectState.fps), 0);
                  const widthFrame = Math.round(shot.durationSeconds * projectState.fps * 0.75);
                  const left = (leftFrame / totalFrames) * 100;
                  const width = (widthFrame / totalFrames) * 100;

                  return (
                    <button
                      key={`g-${shot.id}`}
                      className="mac-sequence-block mac-seq-graphic"
                      style={{left: `${left}%`, width: `${Math.max(width, 6)}%`}}
                      type="button"
                    >
                      字幕-{idx + 1}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className={`mac-track-row ${collapsedTracks.a1 ? 'collapsed' : ''}`}>
              <div className="mac-track-header">
                <button
                  type="button"
                  className="mac-track-toggle"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCollapsedTracks((prev) => ({...prev, a1: !prev.a1}));
                  }}
                >
                  {collapsedTracks.a1 ? '▸' : '▾'}
                </button>
                <div>
                  <strong>A1</strong>
                  <small>音频轨</small>
                </div>
              </div>
              <div className="mac-track-lane">
                <button
                  className="mac-sequence-block mac-seq-audio"
                  style={{left: '0%', width: `${Math.max((Math.round(totalFrames * 0.92) / totalFrames) * 100, 8)}%`}}
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
      {toast ? <div className="mac-toast">{toast}</div> : null}
    </div>
  );
};

export default App;
