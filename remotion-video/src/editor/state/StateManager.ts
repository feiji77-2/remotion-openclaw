/**
 * StateManager — 参照 designcombo 架构
 * 负责 Timeline 状态管理与序列化
 */
import type {
  CaptionWord,
  IDesign,
  ITrack,
  ITrackItem,
  ITransition,
  IBackground,
  ITimelineScaleState,
  ITimelineScrollState,
} from '../types';

// 唯一 ID 生成器
export function generateId(prefix = ''): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < 10; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return prefix ? `${prefix}_${id}` : id;
}

// 默认空项目
export function createEmptyDesign(): IDesign {
  return {
    id: generateId('proj'),
    name: 'Untitled Video',
    fps: 30,
    width: 1080,
    height: 1920,
    duration: 6240, // 208s × 30fps
    tracks: [],
    trackItemIds: [],
    trackItemsMap: {},
    transitionsMap: {},
    background: { type: 'color', value: '#0c0c0e' },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// 从 shots 数据创建 IDesign
export function designFromShots(
  shots: Array<{
    id: string;
    shotIndex: number;
    title: string;
    narration: string;
    durationFrames: number;
    voiceFile?: string;
    subtitleWords?: Array<{ word: string; start: number; end: number }>;
    imageUrl?: string;
  }>,
  options: {
    fps?: number;
    width?: number;
    height?: number;
    voiceBaseUrl?: string;
    background?: IBackground;
  } = {}
): IDesign {
  const fps = options.fps ?? 30;
  const width = options.width ?? 1080;
  const height = options.height ?? 1920;
  const bg = options.background ?? { type: 'color', value: '#0c0c0e' };

  const tracks: ITrack[] = [
    {
      id: generateId('track'),
      name: 'Video',
      type: 'video',
      items: [],
      accepts: ['video', 'image'],
      magnetic: false,
      static: false,
      height: 80,
    },
    {
      id: generateId('track'),
      name: 'Voiceover',
      type: 'voiceover',
      items: [],
      accepts: ['audio', 'voiceover'],
      magnetic: false,
      static: false,
      height: 60,
    },
    {
      id: generateId('track'),
      name: 'Captions',
      type: 'caption',
      items: [],
      accepts: ['caption', 'text'],
      magnetic: false,
      static: false,
      height: 60,
    },
  ];

  const trackItemsMap: Record<string, ITrackItem> = {};
  const trackItemIds: string[] = [];
  const transitionsMap: Record<string, ITransition> = {};

  let currentFrame = 0;

  const [videoTrack, voiceTrack, captionTrack] = tracks;

  for (const shot of shots) {
    const { id, durationFrames, narration, voiceFile, subtitleWords, imageUrl } = shot;

    // 视频/图片轨道
    const videoItemId = generateId('item');
    const videoItem: ITrackItem = {
      id: videoItemId,
      name: imageUrl ? `Shot ${shot.shotIndex} (image)` : `Shot ${shot.shotIndex}`,
      type: imageUrl ? 'image' : 'video',
      trackId: videoTrack.id,
      start: currentFrame,
      duration: durationFrames,
      details: imageUrl
        ? {
            type: 'image',
            src: imageUrl,
            width,
            height,
            opacity: 100,
            borderRadius: 0,
            borderWidth: 0,
            borderColor: '#000000',
            boxShadow: { color: '#000000', x: 0, y: 0, blur: 0 },
            top: '0px',
            left: '0px',
            transform: 'none',
            blur: 0,
            brightness: 100,
            flipX: false,
            flipY: false,
            rotate: '0deg',
            visibility: 'visible',
            trim: { from: 0, to: durationFrames },
            display: { from: currentFrame, duration: durationFrames },
            duration: durationFrames,
          }
        : {
            // 纯色块（无实际视频文件时用色块占位）
            type: 'video',
            src: '',
            width,
            height,
            opacity: 100,
            volume: 100,
            borderRadius: 0,
            borderWidth: 0,
            borderColor: '#000000',
            boxShadow: { color: '#000000', x: 0, y: 0, blur: 0 },
            top: '0px',
            left: '0px',
            transform: 'none',
            blur: 0,
            brightness: 100,
            flipX: false,
            flipY: false,
            rotate: '0deg',
            visibility: 'visible',
            trim: { from: 0, to: durationFrames },
            playbackRate: 1,
            display: { from: currentFrame, duration: durationFrames },
            duration: durationFrames,
            isMain: true,
          },
    };

    trackItemsMap[videoItemId] = videoItem;
    videoTrack.items.push(videoItemId);
    trackItemIds.push(videoItemId);

    // 配音轨道
    if (voiceFile || narration) {
      const audioItemId = generateId('item');
      const audioItem: ITrackItem = {
        id: audioItemId,
        name: `Voice ${shot.shotIndex}`,
        type: voiceFile ? 'voiceover' : 'audio',
        trackId: voiceTrack.id,
        start: currentFrame,
        duration: durationFrames,
        details: {
          type: voiceFile ? 'voiceover' : 'audio',
          src: voiceFile ?? '',
          name: `Shot ${shot.shotIndex} voiceover`,
          volume: 100,
          opacity: 100,
          trim: { from: 0, to: durationFrames },
          display: { from: currentFrame, duration: durationFrames },
          duration: durationFrames,
          playbackRate: 1,
          scriptText: narration,
          speed: 1.0,
        },
      };
      trackItemsMap[audioItemId] = audioItem;
      voiceTrack.items.push(audioItemId);
      trackItemIds.push(audioItemId);
    }

    // 字幕轨道
    if (subtitleWords && subtitleWords.length > 0) {
      const captionItemId = generateId('item');
      const captionItem: ITrackItem = {
        id: captionItemId,
        name: `Caption ${shot.shotIndex}`,
        type: 'caption',
        trackId: captionTrack.id,
        start: currentFrame,
        duration: durationFrames,
        details: {
          type: 'caption',
          text: subtitleWords.map((w) => w.word).join(' '),
          appearedColor: '#FFFFFF',
          activeColor: '#50FF12',
          activeFillColor: '#7E12FF',
          color: '#DADADA',
          backgroundColor: 'transparent',
          borderColor: '#000000',
          borderWidth: 5,
          fontSize: 64,
          fontFamily: 'theboldfont',
          fontUrl: '',
          textAlign: 'center',
          linesPerCaption: 1,
          words: subtitleWords.map<CaptionWord>((word) => ({
            ...word,
            confidence: 1,
            is_keyword: false,
          })),
          fontWeight: 'normal',
          fontStyle: 'normal',
          textDecoration: 'none',
          lineHeight: 'normal',
          letterSpacing: 'normal',
          wordSpacing: 'normal',
          border: 'none',
          textShadow: 'none',
          opacity: 100,
          wordWrap: 'normal',
          wordBreak: 'normal',
          WebkitTextStrokeColor: '#ffffff',
          WebkitTextStrokeWidth: '0px',
          top: `${Math.floor((height * 75) / 100)}px`,
          left: `${Math.floor((width - 800) / 2)}px`,
          transform: 'none',
          skewX: 0,
          skewY: 0,
          height: 80,
          boxShadow: { color: '#000000', x: 0, y: 4, blur: 8 },
          blur: 0,
          brightness: 100,
          flipX: false,
          flipY: false,
          rotate: '0deg',
          visibility: 'visible',
          trim: { from: 0, to: durationFrames },
          display: { from: currentFrame, duration: durationFrames },
          duration: durationFrames,
        },
      };
      trackItemsMap[captionItemId] = captionItem;
      captionTrack.items.push(captionItemId);
      trackItemIds.push(captionItemId);
    }

    currentFrame += durationFrames;
  }

  const totalDuration = currentFrame;

  return {
    id: generateId('proj'),
    name: 'OpenClaw Video',
    fps,
    width,
    height,
    duration: totalDuration,
    tracks,
    trackItemIds,
    trackItemsMap,
    transitionsMap,
    background: bg,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

type Listener = (state: IDesign) => void;

type HistoryListener = (payload: any) => void;

export class StateManager {
  private state: IDesign;
  private listeners: Set<Listener> = new Set();
  private history: IDesign[] = [];
  private historyIndex = -1;
  private maxHistory = 50;
  private _historyListeners: Map<string, Set<HistoryListener>> = new Map();

  constructor(initial?: Partial<IDesign>) {
    this.state = createEmptyDesign();
    if (initial) {
      this.state = { ...this.state, ...initial };
    }
  }

  // ── Event Emitter ──
  subscribeEvent(event: string, listener: HistoryListener): () => void {
    if (!this._historyListeners.has(event)) {
      this._historyListeners.set(event, new Set());
    }
    this._historyListeners.get(event)!.add(listener);
    return () => this.unsubscribeEvent(event, listener);
  }

  unsubscribeEvent(event: string, listener: HistoryListener): void {
    this._historyListeners.get(event)?.delete(listener);
  }

  private _emit(event: string, payload?: any): void {
    this._historyListeners.get(event)?.forEach((fn) => fn(payload));
  }

  // ── Getters ──
  getState(): IDesign {
    return this.state;
  }

  getTrackItems(): ITrackItem[] {
    return Object.values(this.state.trackItemsMap);
  }

  getTrackById(id: string): ITrack | undefined {
    return this.state.tracks.find((t) => t.id === id);
  }

  getItemById(id: string): ITrackItem | undefined {
    return this.state.trackItemsMap[id];
  }

  // ── State Mutations ──
  setState(partial: Partial<IDesign>) {
    this.state = { ...this.state, ...partial, updatedAt: new Date().toISOString() };
    this.notify();
  }

  addTrack(track: ITrack) {
    this.state = {
      ...this.state,
      tracks: [...this.state.tracks, track],
    };
    this.pushHistory();
    this.notify();
  }

  removeTrack(trackId: string) {
    const track = this.getTrackById(trackId);
    if (!track) return;

    // 移除所有子项目
    const newItemsMap = { ...this.state.trackItemsMap };
    for (const itemId of track.items) {
      delete newItemsMap[itemId];
    }

    this.state = {
      ...this.state,
      tracks: this.state.tracks.filter((t) => t.id !== trackId),
      trackItemsMap: newItemsMap,
      trackItemIds: this.state.trackItemIds.filter((id) => !track.items.includes(id)),
    };
    this.pushHistory();
    this.notify();
  }

  addTrackItem(item: ITrackItem, trackId: string) {
    const track = this.getTrackById(trackId);
    if (!track) return;

    this.state = {
      ...this.state,
      trackItemsMap: { ...this.state.trackItemsMap, [item.id]: item },
      trackItemIds: [...this.state.trackItemIds, item.id],
      tracks: this.state.tracks.map((t) =>
        t.id === trackId ? { ...t, items: [...t.items, item.id] } : t
      ),
    };
    this.pushHistory();
    this.notify();
  }

  updateTrackItem(id: string, updates: Partial<ITrackItem>) {
    const existing = this.state.trackItemsMap[id];
    if (!existing) return;

    this.state = {
      ...this.state,
      trackItemsMap: {
        ...this.state.trackItemsMap,
        [id]: { ...existing, ...updates },
      },
    };
    this.notify();
  }

  removeTrackItem(itemId: string) {
    const item = this.state.trackItemsMap[itemId];
    if (!item) return;

    const newItemsMap = { ...this.state.trackItemsMap };
    delete newItemsMap[itemId];

    this.state = {
      ...this.state,
      trackItemsMap: newItemsMap,
      trackItemIds: this.state.trackItemIds.filter((id) => id !== itemId),
      tracks: this.state.tracks.map((t) =>
        t.id === item.trackId ? { ...t, items: t.items.filter((i) => i !== itemId) } : t
      ),
    };
    this.pushHistory();
    this.notify();
  }

  setBackground(bg: IBackground) {
    this.state = { ...this.state, background: bg };
    this.notify();
  }

  setDuration(duration: number) {
    this.state = { ...this.state, duration };
    this.notify();
  }

  resize(width: number, height: number) {
    this.state = { ...this.state, width, height };
    this.notify();
  }

  // ── History ──
  private pushHistory() {
    // 截断当前位置之后的历史
    this.history = this.history.slice(0, this.historyIndex + 1);
    this.history.push(JSON.parse(JSON.stringify(this.state)));
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }
    this.historyIndex = this.history.length - 1;
  }

  undo(): boolean {
    if (this.historyIndex <= 0) return false;
    this._emit('before', this.state);
    this.historyIndex--;
    this.state = JSON.parse(JSON.stringify(this.history[this.historyIndex]));
    this._emit('change', this.state);
    this._emit('history-change', { canUndo: this.canUndo(), canRedo: this.canRedo() });
    return true;
  }

  redo(): boolean {
    if (this.historyIndex >= this.history.length - 1) return false;
    this._emit('before', this.state);
    this.historyIndex++;
    this.state = JSON.parse(JSON.stringify(this.history[this.historyIndex]));
    this._emit('change', this.state);
    this._emit('history-change', { canUndo: this.canUndo(), canRedo: this.canRedo() });
    return true;
  }

  canUndo(): boolean {
    return this.historyIndex > 0;
  }

  canRedo(): boolean {
    return this.historyIndex < this.history.length - 1;
  }

  // ── Serialization ──
  toJSON(): IDesign {
    return JSON.parse(JSON.stringify(this.state));
  }

  loadFromJSON(data: IDesign) {
    this.state = JSON.parse(JSON.stringify(data));
    this.history = [this.state];
    this.historyIndex = 0;
    this.notify();
  }

  // ── Listeners ──
  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }
}

// 单例导出（全局编辑器状态）
let globalManager: StateManager | null = null;

export function getGlobalStateManager(): StateManager {
  if (!globalManager) {
    globalManager = new StateManager();
  }
  return globalManager;
}
