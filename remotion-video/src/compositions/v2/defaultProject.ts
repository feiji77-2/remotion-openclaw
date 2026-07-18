import {VideoProjectSchema} from '../../project/projectSchema';

export const DEFAULT_VIDEO_PROJECT = VideoProjectSchema.parse({
  schemaVersion: 1,
  projectId: 'mainline-upgrade-demo',
  title: '主链路升级完整样片',
  render: {fps: 30, width: 1920, height: 1080, qualityMode: 'fast', orientation: 'landscape'},
  scenes: [
    {
      id: 'opening',
      family: 'spoken-title',
      durationInFrames: 30,
      payload: {
        title: 'Project JSON 直达成片',
        subtitle: 'Codex 写合同，Remotion 只负责稳定出图和渲染',
        kicker: 'MAINLINE UPGRADE',
        accent: 'cyan',
      },
      assetIds: ['hero-grid'],
      transition: {type: 'slide', durationInFrames: 6},
    },
    {
      id: 'structure-lock',
      family: 'spoken-process',
      durationInFrames: 30,
      payload: {
        steps: [
          {label: '素材体检', detail: '先查输入'},
          {label: '画幅确认', detail: '1080p'},
          {label: '文案冻结', detail: '不漂移'},
          {label: '结构锁', detail: '按 scenes'},
          {label: 'still 验收', detail: '再渲染'},
        ],
        accent: 'amber',
      },
      assetIds: ['optional-missing'],
      transition: {type: 'fade', durationInFrames: 6},
    },
    {
      id: 'before-after',
      family: 'spoken-compare',
      durationInFrames: 30,
      payload: {
        heading: '旧流水线收敛成新主链路',
        items: [
          {label: '旧方式', value: 'Step + Skill + API'},
          {label: '新方式', value: 'JSON + Check + Still'},
        ],
        accent: 'cyan',
      },
      transition: {type: 'slide', durationInFrames: 6},
    },
    {
      id: 'commands',
      family: 'spoken-metric',
      durationInFrames: 30,
      payload: {
        heading: '三条命令就是运行时',
        items: [
          {label: 'Project 合同', value: '1'},
          {label: '固定命令', value: '3'},
          {label: 'Step 依赖', value: '0'},
        ],
        accent: 'green',
      },
      transition: {type: 'fade', durationInFrames: 6},
    },
    {
      id: 'contract-tags',
      family: 'spoken-tags',
      durationInFrames: 30,
      payload: {
        heading: '主合同只保留渲染必需字段',
        items: [
          {label: 'schema', value: 'schemaVersion'},
          {label: 'time', value: 'scenes[]'},
          {label: 'payload', value: 'family payload'},
          {label: 'assets', value: 'assetIds'},
          {label: 'captions', value: 'CaptionTrack'},
          {label: 'audio', value: 'AudioTrack'},
          {label: 'fallback', value: '非关键图不黑屏'},
        ],
        accent: 'purple',
      },
      transition: {type: 'slide', durationInFrames: 6},
    },
    {
      id: 'code-path',
      family: 'spoken-code',
      durationInFrames: 30,
      payload: {
        heading: '实际执行路径',
        items: [
          {label: 'input', value: 'examples/project.json'},
          {label: 'check', value: 'npm run project:check'},
          {label: 'still', value: 'npm run project:still -- --frame 30'},
          {label: 'render', value: 'npm run project:render'},
          {label: 'composition', value: 'UltimateVideoV2'},
        ],
        accent: 'cyan',
      },
      transition: {type: 'fade', durationInFrames: 6},
    },
    {
      id: 'priority',
      family: 'spoken-ranking',
      durationInFrames: 30,
      payload: {
        heading: '现在优先级只看闭环',
        items: [
          {label: '结构锁', value: 'P0'},
          {label: 'still 非黑屏', value: 'P0'},
          {label: 'MP4 可解码', value: 'P1'},
          {label: '4K 与音效', value: 'Later'},
        ],
        accent: 'amber',
      },
      transition: {type: 'slide', durationInFrames: 6},
    },
    {
      id: 'takeaway',
      family: 'spoken-takeaway',
      durationInFrames: 30,
      payload: {
        title: '先稳定出图，再优化视频质量',
        subtitle: '主链路已经变成一个输入、一个编译器、一个 Composition',
        kicker: 'DONE',
        accent: 'green',
      },
      transition: false,
    },
  ],
  captions: [
    {text: '主链路升级后，Codex 只需要写一个 Project JSON。', startMs: 0, endMs: 1000, timestampMs: 0, confidence: 1},
    {text: '先锁素材、画幅、文案和结构，再看 still。', startMs: 1000, endMs: 2000, timestampMs: 1000, confidence: 1},
    {text: '旧的 Step、Skill 和队列协议，不再进入运行时。', startMs: 2000, endMs: 3000, timestampMs: 2000, confidence: 1},
    {text: '三条命令就能完成检查、出图和渲染。', startMs: 3000, endMs: 4000, timestampMs: 3000, confidence: 1},
    {text: '合同里只保留渲染必需的数据。', startMs: 4000, endMs: 5000, timestampMs: 4000, confidence: 1},
    {text: '实际路径就是 JSON、编译器和 UltimateVideoV2。', startMs: 5000, endMs: 6000, timestampMs: 5000, confidence: 1},
    {text: '现在只优先保证闭环，视频质感后面再加。', startMs: 6000, endMs: 7000, timestampMs: 6000, confidence: 1},
    {text: '先稳定出图，再优化视频质量。', startMs: 7000, endMs: 8000, timestampMs: 7000, confidence: 1},
  ],
  audio: {},
  assets: {
    'hero-grid': {kind: 'image', src: 'projects/v2-fixtures/hero-grid.svg', required: true},
    'optional-missing': {kind: 'image', src: 'projects/v2-fixtures/optional-missing.png', required: false},
  },
});

export const DEFAULT_PROJECT_DURATION = DEFAULT_VIDEO_PROJECT.scenes.reduce(
  (total, scene) => total + scene.durationInFrames,
  0,
);
