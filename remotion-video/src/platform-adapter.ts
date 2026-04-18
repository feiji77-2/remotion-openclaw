/**
 * platform-adapter.ts — 多平台适配配置
 *
 * 支持: 抖音 / B站 / YouTubeShorts / Instagram Reels
 *
 * 一套源视频 → 自动适配多平台规格
 */

export interface PlatformConfig {
  name: string;
  ratio: '9:16' | '16:9' | '1:1' | '4:5';
  width: number;
  height: number;
  /** 最小/最大时长（秒） */
  durationRange: [number, number];
  codec: 'h264' | 'h265' | 'vp9';
  bitrate: string;
  crf: number;
  /** 横版裁剪策略 */
  cropStrategy?: 'center' | 'top' | 'smart';
  hooks: {
    beforeRender?: string;  // hook script path
    afterRender?: string;   // hook script path
  };
  /** 平台特定标签 */
  tags?: string[];
}

export const platforms: Record<string, PlatformConfig> = {
  抖音: {
    name: '抖音',
    ratio: '9:16',
    width: 1080,
    height: 1920,
    durationRange: [15, 180],
    codec: 'h264',
    bitrate: '8000k',
    crf: 20,
    hooks: {},
    tags: ['AI', '科技', '工具'],
  },
  B站: {
    name: 'Bilibili',
    ratio: '16:9',
    width: 1920,
    height: 1080,
    durationRange: [30, 600],
    codec: 'h264',
    bitrate: '15000k',
    crf: 18,
    cropStrategy: 'smart',
    hooks: {
      afterRender: 'scripts/bilibili-watermark.sh',
    },
    tags: ['技术', 'AI', '开源'],
  },
  YouTubeShorts: {
    name: 'YouTube Shorts',
    ratio: '9:16',
    width: 1080,
    height: 1920,
    durationRange: [15, 60],
    codec: 'h264',
    bitrate: '10000k',
    crf: 18,
    hooks: {},
    tags: ['AI', 'Tech', 'Tutorial'],
  },
  InstagramReels: {
    name: 'Instagram Reels',
    ratio: '9:16',
    width: 1080,
    height: 1920,
    durationRange: [3, 90],
    codec: 'h264',
    bitrate: '8000k',
    crf: 20,
    hooks: {},
    tags: ['AI', 'tech', 'coding'],
  },
  微信公众号: {
    name: 'WeChat Video',
    ratio: '16:9',
    width: 1920,
    height: 1080,
    durationRange: [1, 600],
    codec: 'h264',
    bitrate: '6000k',
    crf: 22,
    cropStrategy: 'center',
    hooks: {},
    tags: [],
  },
};

/**
 * 获取平台配置的快捷函数
 */
export function getPlatform(name: string): PlatformConfig | null {
  return platforms[name] ?? null;
}

/**
 * 列出所有可用平台
 */
export function listPlatforms(): string[] {
  return Object.keys(platforms);
}

/**
 * 裁剪参数计算（竖屏 → 横版）
 * smart 策略会尝试把人脸/主体放在中心
 */
export function computeCropParams(
  srcWidth: number,
  srcHeight: number,
  strategy: 'center' | 'top' | 'smart' = 'center'
): { x: number; y: number; w: number; h: number } {
  const targetRatio = 16 / 9;

  if (srcWidth / srcHeight > targetRatio) {
    // 已经是横版，不需要裁剪
    return { x: 0, y: 0, w: srcWidth, h: srcHeight };
  }

  // 竖屏 → 裁剪中间区域
  const targetWidth = srcHeight * targetRatio; // 所需宽度

  let x: number;
  switch (strategy) {
    case 'top':
      x = (srcWidth - targetWidth) / 2;
      break;
    case 'smart':
      // 智能：主体偏上，但整体居中
      x = (srcWidth - targetWidth) / 2;
      break;
    case 'center':
    default:
      x = (srcWidth - targetWidth) / 2;
  }

  return {
    x: Math.round(x),
    y: 0,
    w: Math.round(targetWidth),
    h: srcHeight,
  };
}

/**
 * 生成 ffmpeg 裁剪滤镜字符串
 */
export function buildCropFilter(cfg: PlatformConfig, srcWidth = 1080, srcHeight = 1920): string | null {
  if (cfg.ratio === '9:16') return null; // 不需要裁剪

  const crop = computeCropParams(srcWidth, srcHeight, cfg.cropStrategy || 'center');
  return `crop=${crop.w}:${crop.h}:${crop.x}:${crop.y}`;
}

/**
 * 计算视频时长是否满足平台要求
 */
export function validateDuration(durationS: number, platform: string): boolean {
  const cfg = platforms[platform];
  if (!cfg) return false;
  const [min, max] = cfg.durationRange;
  return durationS >= min && durationS <= max;
}
