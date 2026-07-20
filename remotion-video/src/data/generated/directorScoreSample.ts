/**
 * directorScoreSample.ts — DirectorScore 验证示例
 *
 * 包含 DeepSeek V4 四幕示例（7 秒 / 210 帧 @ 30fps）。
 * 对应结构：
 *   act-01: 同步爆发 (0-1.5s)  → 主标题爆发 + 副标题弹入 + 顶部标签滑入消失
 *   act-02: 模块展开 (1.5-4.0s) → 四胶囊炸开 + 左右交替飞入 + 浮动循环
 *   act-03: 收尾淡出 (4.0-5.0s) → 金句升起 + 导航展开 + 全屏淡出（演示 cameraMode / easing / effectPreset）
 *   act-04: 路径追踪 (5.0-7.0s) → SVG path 描边动画 + 粒子爆发 + 精确摄像机插值
 */

import type {DirectorScore} from '../directorScore';

export const DEEPSEEK_V4_DIRECTOR_SCORE: DirectorScore = {
  id: 'deepseek-v4-hero',
  totalFrames: 210,
  fps: 30,
  directorNotes: '高能、紧凑、信息密度大。总时长5秒，30fps。',
  globalEnergy: {
    perAct: ['explosive', 'high', 'calm'],
    description: '爆发式开头 → 高能展开 → 平静收束',
  },
  acts: [
    // ════════════════════════════════════════════
    // Act 01: 同步爆发 (0-1.5s, 帧 0-45)
    // ════════════════════════════════════════════
    {
      actId: 'act-01',
      label: '同步爆发',
      fromFrame: 0,
      durationInFrames: 45,
      energy: 'explosive',
      shots: [
        {
          shotId: 'shot-01',
          fromFrame: 0,
          durationInFrames: 45,
          archetypeHint: 'burst spread',
          cameraIntentHint: 'reveal',
          dataEventHint: 'burst-spread',
          cameraPath: [
            {atFrame: 0, zoom: 1.0, panX: 0, panY: 0},
            {atFrame: 45, zoom: 1.05, panX: 0, panY: 0, easing: 'ease-out'},
          ],
          cues: [
            {
              elementId: 'main-title',
              type: 'text',
              enterAtFrame: 0,
              enterFrom: 'center',
              enterAnimation: 'burst',
              enterDuration: 20,
              initialScale: 0.5,
              finalScale: 1.0,
              springPreset: 'bouncy',
              zIndex: 10,
              opacityRange: [0, 1],
            },
            {
              elementId: 'subtitle',
              type: 'text',
              enterAtFrame: 9,
              enterFrom: 'bottom',
              enterAnimation: 'spring',
              enterDuration: 15,
              springPreset: 'smooth',
              zIndex: 5,
            },
            {
              elementId: 'top-tag',
              type: 'text',
              enterAtFrame: 0,
              enterFrom: 'top',
              enterAnimation: 'slide',
              enterDuration: 8,
              exitAtFrame: 15,
              exitTo: 'fade',
              exitAnimation: 'fade',
              exitDuration: 6,
              zIndex: 3,
            },
          ],
          timelineMarkers: [
            {atFrame: 0, label: '主标题爆发', type: 'event'},
            {atFrame: 9, label: '副标题弹入', type: 'event'},
            {atFrame: 15, label: '标签开始消失', type: 'emphasis'},
          ],
        },
      ],
    },

    // ════════════════════════════════════════════
    // Act 02: 模块展开 (1.5-4.0s, 帧 45-120)
    // ════════════════════════════════════════════
    {
      actId: 'act-02',
      label: '模块展开',
      fromFrame: 45,
      durationInFrames: 75,
      energy: 'high',
      shots: [
        {
          shotId: 'shot-02',
          fromFrame: 45,
          durationInFrames: 75,
          archetypeHint: 'burst spread',
          cameraIntentHint: 'drift',
          dataEventHint: 'burst-spread',
          cameraPath: [
            {atFrame: 0, zoom: 1.0, panX: 0, panY: 0},
            {atFrame: 30, zoom: 1.0, panX: -30, panY: 0, easing: 'ease-in-out'},
            {atFrame: 60, zoom: 1.0, panX: 30, panY: 0, easing: 'ease-in-out'},
            {atFrame: 75, zoom: 1.0, panX: 0, panY: 0, easing: 'ease-out'},
          ],
          cues: [
            {
              elementId: 'capsule-1',
              type: 'shape',
              enterAtFrame: 0,
              enterFrom: 'center',
              enterAnimation: 'burst',
              enterDuration: 16,
              initialScale: 0.3,
              finalScale: 1.0,
              springPreset: 'bouncy',
              loopAnimation: 'float',
              zIndex: 5,
            },
            {
              elementId: 'capsule-2',
              type: 'shape',
              enterAtFrame: 9,
              enterFrom: 'center',
              enterAnimation: 'burst',
              enterDuration: 16,
              initialScale: 0.3,
              finalScale: 1.0,
              springPreset: 'bouncy',
              loopAnimation: 'float',
              zIndex: 5,
            },
            {
              elementId: 'capsule-3',
              type: 'shape',
              enterAtFrame: 18,
              enterFrom: 'center',
              enterAnimation: 'burst',
              enterDuration: 16,
              initialScale: 0.3,
              finalScale: 1.0,
              springPreset: 'bouncy',
              loopAnimation: 'float',
              zIndex: 5,
            },
            {
              elementId: 'capsule-4',
              type: 'shape',
              enterAtFrame: 27,
              enterFrom: 'center',
              enterAnimation: 'burst',
              enterDuration: 16,
              initialScale: 0.3,
              finalScale: 1.0,
              springPreset: 'bouncy',
              loopAnimation: 'float',
              zIndex: 5,
            },
          ],
          timelineMarkers: [
            {atFrame: 0, label: '胶囊1炸开', type: 'event'},
            {atFrame: 9, label: '胶囊2炸开', type: 'event'},
            {atFrame: 18, label: '胶囊3炸开', type: 'event'},
            {atFrame: 27, label: '胶囊4炸开', type: 'event'},
            {atFrame: 35, label: '全部入位浮动', type: 'emphasis'},
          ],
        },
      ],
    },

    // ════════════════════════════════════════════
    // Act 03: 收尾淡出 (4.0-5.0s, 帧 120-150)
    // 演示：cameraMode='preset'、per-cue easing、effectPreset
    // ════════════════════════════════════════════

    // ════════════════════════════════════════════
    // Act 04: SVG 路径追踪 + burst-particles 效果
    // (5.0-7.0s, 帧 150-210)
    // 演示：path tracing、effectPreset='burst-particles'
    // ════════════════════════════════════════════
    {
      actId: 'act-03',
      label: '收尾',
      fromFrame: 120,
      durationInFrames: 30,
      energy: 'calm',
      shots: [
        {
          shotId: 'shot-03',
          fromFrame: 120,
          durationInFrames: 30,
          cameraMode: 'preset',
          transitionPreset: 'fade',
          archetypeHint: 'drift reveal',
          cameraIntentHint: 'linger',
          dataEventHint: 'settle',
          cameraPath: [
            {atFrame: 0, zoom: 1.0, panX: 0, panY: 0},
            {atFrame: 30, zoom: 1.0, panX: 0, panY: 0},
          ],
          cues: [
            {
              elementId: 'closing-quote',
              type: 'text',
              enterAtFrame: 0,
              enterFrom: 'bottom',
              enterAnimation: 'spring',
              enterDuration: 18,
              easing: 'ease-out',
              effectPreset: 'ghost-title',
              springPreset: 'smooth',
              zIndex: 10,
            },
            {
              elementId: 'nav-bar',
              type: 'container',
              enterAtFrame: 6,
              enterFrom: 'left',
              enterAnimation: 'slide',
              enterDuration: 14,
              easing: 'ease-in-out',
              zIndex: 5,
            },
            {
              elementId: 'footer',
              type: 'text',
              enterAtFrame: 12,
              enterFrom: 'fade',
              enterAnimation: 'fade',
              enterDuration: 10,
              enterEasing: 'ease-in',
              zIndex: 3,
            },
          ],
          timelineMarkers: [
            {atFrame: 0, label: '金句升起', type: 'event'},
            {atFrame: 6, label: '导航展开', type: 'event'},
            {atFrame: 12, label: '底栏淡入', type: 'event'},
            {atFrame: 25, label: '全屏淡出', type: 'transition'},
          ],
        },
      ],
    },

    // ════════════════════════════════════════════
    // Act 04: SVG 路径追踪 + burst-particles 效果
    // (5.0-7.0s, 帧 150-210)
    // 演示：path tracing、effectPreset='burst-particles'
    // ════════════════════════════════════════════
    {
      actId: 'act-04',
      label: '路径追踪',
      fromFrame: 150,
      durationInFrames: 60,
      energy: 'high',
      shots: [
        {
          shotId: 'shot-04',
          fromFrame: 150,
          durationInFrames: 60,
          cameraMode: 'exact',
          archetypeHint: 'lock-on reveal',
          cameraIntentHint: 'pin',
          dataEventHint: 'list-build',
          cameraPath: [
            {atFrame: 0, zoom: 1.0, panX: 0, panY: 0},
            {atFrame: 30, zoom: 1.08, panX: 0, panY: -20, easing: 'ease-in-out'},
            {atFrame: 60, zoom: 1.0, panX: 0, panY: 0, easing: 'ease-out'},
          ],
          cues: [
            {
              elementId: 'trace-line',
              type: 'path',
              enterAtFrame: 0,
              enterFrom: 'fade',
              enterAnimation: 'fade',
              enterDuration: 5,
              renderAs: 'svg',
              pathD: 'M 50 200 Q 150 50 250 200 T 450 200',
              pathColor: '#6366f1',
              pathWidth: 3,
              pathFill: 'none',
              pathDuration: 30,
              pathKeepVisible: true,
              easing: 'ease-in-out',
              zIndex: 1,
            },
            {
              elementId: 'trace-dot',
              type: 'shape',
              enterAtFrame: 0,
              enterFrom: 'center',
              enterAnimation: 'burst',
              enterDuration: 10,
              initialScale: 0.5,
              finalScale: 1.0,
              springPreset: 'bouncy',
              loopAnimation: 'pulse',
              zIndex: 5,
            },
            {
              elementId: 'trace-label',
              type: 'text',
              enterAtFrame: 10,
              enterFrom: 'right',
              enterAnimation: 'slide',
              enterDuration: 12,
              effectPreset: 'burst-particles',
              easing: 'ease-out',
              enterEasing: 'ease-out',
              zIndex: 10,
            },
          ],
          timelineMarkers: [
            {atFrame: 0, label: 'SVG 路径开始追踪', type: 'event'},
            {atFrame: 10, label: '标签飞入 + 粒子爆发', type: 'emphasis'},
            {atFrame: 30, label: '摄像机缓慢推进', type: 'emphasis'},
            {atFrame: 60, label: '全片结束', type: 'transition'},
          ],
        },
      ],
    },
  ],
};

/**
 * scoreToSequences 预期输出（参考）：
 *
 * SequenceConfig[4]
 * [0] from:0,  dur:45  ← shot-01 (relative to act-01 fromFrame=0)
 *     children:
 *       [0] from:0,  dur:45,  elementId: 'main-title'   (0 + 20=20 enter, no exit, remainder 25)
 *       [1] from:9,  dur:36,  elementId: 'subtitle'     (9 + 15=24 enter, no exit, remainder 21)
 *       [2] from:0,  dur:21,  elementId: 'top-tag'      (enters 0-8, exits 15-21)
 * [1] from:0,  dur:75  ← shot-02 (relative to act-02 fromFrame=45)
 *     children:
 *       [0] from:0,  dur:75,  elementId: 'capsule-1'
 *       [1] from:9,  dur:66,  elementId: 'capsule-2'
 *       [2] from:18, dur:57,  elementId: 'capsule-3'
 *       [3] from:27, dur:48,  elementId: 'capsule-4'
 * [2] from:0,  dur:30  ← shot-03 (cameraMode='preset', transitionPreset='fade')
 *     children:
 *       [0] from:0,  dur:30,  elementId: 'closing-quote'   (easing:ease-out, effectPreset:ghost-title)
 *       [1] from:6,  dur:24,  elementId: 'nav-bar'         (easing:ease-in-out)
 *       [2] from:12, dur:18,  elementId: 'footer'          (enterEasing:ease-in)
 * [3] from:0,  dur:60  ← shot-04 (cameraMode='exact')
 *     children:
 *       [0] from:0,  dur:60,  elementId: 'trace-line'      (pathD, easing:ease-in-out)
 *       [1] from:0,  dur:60,  elementId: 'trace-dot'       (loopAnimation:pulse)
 *       [2] from:10, dur:50,  elementId: 'trace-label'     (effectPreset:burst-particles)
 */
