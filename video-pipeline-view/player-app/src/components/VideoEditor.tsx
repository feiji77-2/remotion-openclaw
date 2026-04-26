import React from 'react';
import {Player} from '@remotion/player';
import {OpenClawVideo} from '@openclaw-remotion/OpenClawVideo';
import {FPS, TOTAL_DURATION_SEC, VIDEO_HEIGHT, VIDEO_WIDTH} from '@openclaw-remotion/data/storyboard';
import {useVideoProjectStore} from '@openclaw-remotion/stores/videoStore';
import type {TemplateType} from '@openclaw-remotion/types';

const TEMPLATES: { value: TemplateType; label: string }[] = [
  { value: 'caption', label: '字幕模板' },
  { value: 'split', label: '分屏模板' },
  { value: 'fullscreen', label: '全屏模板' },
];

export const VideoEditor: React.FC = () => {
  const {
    projectId,
    template,
    script,
    voice,
    progress,
    progressMsg,
    renderStatus,
    setTemplate,
    setScript,
    setVoice,
  } = useVideoProjectStore();

  return (
    <div className="min-h-screen bg-background-dark">
      {/* 顶部导航 */}
      <header className="glass-dark px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-text-primary">
          OpenClaw 视频编辑器 v3.0
        </h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-text-secondary">
            Remotion 4.0.445 + React 19
          </span>
          <span className="text-sm text-text-secondary/70">
            {projectId || '未命名项目'}
          </span>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        {/* 视频预览区 */}
        <section className="mb-8">
          <div className="video-container aspect-video max-w-4xl mx-auto">
            <Player
              component={OpenClawVideo}
              compositionWidth={VIDEO_WIDTH}
              compositionHeight={VIDEO_HEIGHT}
              fps={FPS}
              durationInFrames={TOTAL_DURATION_SEC * FPS}
              inputProps={{template}}
              style={{
                width: '100%',
                height: '100%',
              }}
              loop
              clickToPlay
              controls
            />
          </div>
        </section>

        {/* 进度条 */}
        {renderStatus === 'processing' && (
          <section className="mb-8 max-w-4xl mx-auto">
            <div className="flex items-center gap-4 mb-2">
              <span className="text-sm text-text-secondary">{progressMsg}</span>
              <span className="text-sm text-primary font-medium">{progress}%</span>
            </div>
            <div className="timeline">
              <div 
                className="timeline-progress progress-shine"
                style={{ width: `${progress}%` }}
              />
            </div>
          </section>
        )}

        {/* 配置面板 */}
        <section className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 模板选择 */}
          <div className="glass rounded-xl p-6">
            <h2 className="text-lg font-medium mb-4">视频模板</h2>
            <div className="grid grid-cols-3 gap-3">
              {TEMPLATES.map((tmpl) => (
                <button
                  key={tmpl.value}
                  onClick={() => setTemplate(tmpl.value)}
                  className={`px-4 py-3 rounded-lg transition-all ${
                    template === tmpl.value
                      ? 'bg-primary text-white'
                      : 'bg-background-card text-text-secondary hover:bg-white/5'
                  }`}
                >
                  {tmpl.label}
                </button>
              ))}
            </div>
          </div>

          {/* 语音选择 */}
          <div className="glass rounded-xl p-6">
            <h2 className="text-lg font-medium mb-4">配音引擎</h2>
            <div className="grid grid-cols-1 gap-3">
              <button
                onClick={() => setVoice('qwen-tts')}
                className={`px-4 py-3 rounded-lg transition-all ${
                  voice === 'qwen-tts'
                    ? 'bg-primary text-white'
                    : 'bg-background-card text-text-secondary hover:bg-white/5'
                }`}
              >
                阿里千问 TTS
              </button>
            </div>
          </div>

          {/* 脚本编辑 */}
          <div className="glass rounded-xl p-6 md:col-span-2">
            <h2 className="text-lg font-medium mb-4">视频脚本</h2>
            <textarea
              value={script}
              onChange={(e) => setScript(e.target.value)}
              placeholder="输入视频脚本内容..."
              className="w-full h-40 px-4 py-3 rounded-lg bg-background-card text-text-primary placeholder-text-muted resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </section>

        {/* 操作按钮 */}
        <section className="max-w-4xl mx-auto mt-8 flex justify-center gap-4">
          <button className="btn-secondary">
            保存项目
          </button>
          <button className="btn-primary">
            开始渲染
          </button>
        </section>
      </main>
    </div>
  );
};

export default VideoEditor;
