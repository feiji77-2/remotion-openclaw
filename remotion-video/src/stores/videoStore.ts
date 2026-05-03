// Zustand 状态管理 - 视频项目状态

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { TemplateType, VoiceType, SubtitleTrack, RenderStatus } from '../types';

interface VideoProjectState {
  // 项目配置
  projectId: string;
  template: TemplateType;
  script: string;
  voice: VoiceType;
  
  // 渲染状态
  renderStatus: RenderStatus;
  progress: number;
  progressMsg: string;
  
  // 字幕数据
  subtitles: SubtitleTrack | null;
  
  // UI 状态
  isPlaying: boolean;
  currentTime: number;
  
  // Actions
  setProjectId: (id: string) => void;
  setTemplate: (template: TemplateType) => void;
  setScript: (script: string) => void;
  setVoice: (voice: VoiceType) => void;
  setRenderStatus: (status: RenderStatus) => void;
  updateProgress: (progress: number, msg?: string) => void;
  setSubtitles: (track: SubtitleTrack | null) => void;
  setIsPlaying: (playing: boolean) => void;
  setCurrentTime: (time: number) => void;
  resetProject: () => void;
}

const initialState = {
  projectId: '',
  template: 'ultimate' as TemplateType,
  script: '',
  voice: 'qwen-tts' as VoiceType,
  renderStatus: 'pending' as RenderStatus,
  progress: 0,
  progressMsg: '',
  subtitles: null,
  isPlaying: false,
  currentTime: 0,
};

export const useVideoProjectStore = create<VideoProjectState>()(
  persist(
    (set) => ({
      ...initialState,
      
      setProjectId: (id) => set({ projectId: id }),
      setTemplate: (template) => set({ template }),
      setScript: (script) => set({ script }),
      setVoice: (voice) => set({ voice }),
      setRenderStatus: (status) => set({ renderStatus: status }),
      
      updateProgress: (progress, msg) =>
        set((state) => ({
          progress,
          progressMsg: msg ?? state.progressMsg,
        })),
      
      setSubtitles: (track) => set({ subtitles: track }),
      setIsPlaying: (playing) => set({ isPlaying: playing }),
      setCurrentTime: (time) => set({ currentTime: time }),
      
      resetProject: () => set(initialState),
    }),
    {
      name: 'video-project-storage',
      storage: createJSONStorage(() => {
        let timer: ReturnType<typeof setTimeout> | null = null;
        const delegate = localStorage;
        return {
          getItem: (name) => delegate.getItem(name),
          setItem: (name, value) => {
            if (timer) clearTimeout(timer);
            timer = setTimeout(() => delegate.setItem(name, value), 500);
          },
          removeItem: (name) => delegate.removeItem(name),
        };
      }),
      merge: (persistedState, currentState) => ({
        ...currentState,
        ...(persistedState as Partial<VideoProjectState>),
      }),
      partialize: (state) => ({
        projectId: state.projectId,
        template: state.template,
        script: state.script,
        voice: state.voice,
      }),
    }
  )
);

// 快捷访问选择器
export const useProjectConfig = () =>
  useVideoProjectStore((state) => ({
    projectId: state.projectId,
    template: state.template,
    script: state.script,
    voice: state.voice,
  }));

export const useRenderState = () =>
  useVideoProjectStore((state) => ({
    status: state.renderStatus,
    progress: state.progress,
    progressMsg: state.progressMsg,
  }));
