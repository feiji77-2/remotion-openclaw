import {registerRoot} from 'remotion';
import {Composition} from 'remotion';
import {OpenClawVideo} from './OpenClawVideo';
import {FPS, TOTAL_DURATION_SEC, VIDEO_HEIGHT, VIDEO_WIDTH} from './data/storyboard';
import type {SRTSubtitle} from './components/SRTParser';
import Video1v4 from './compositions/Video1v4';
import {SEGMENTS, TRANSITION_FRAMES} from './data/segments_meta_v4h';

export type AudioSegmentProps = {
  src: string;
  startFrame: number;
  durationInFrames: number;
};

export type RenderShotProps = {
  id: string;
  title?: string;
  narration?: string;
  durationSeconds?: number;
  imageUrl?: string | null;
  posterMode?: boolean;
  promptZh?: string;
  visualSummaryZh?: string;
  visualFocusZh?: string;
  comparisonSummaryZh?: string;
  mood?: string;
  style?: string;
  keywords?: string[];
  dataPoints?: string[];
};

export type CaptionWordTimingProps = {
  text: string;
  startFrame: number;
  endFrame: number;
  startMs?: number;
  endMs?: number;
  confidence?: number;
  isKeyword?: boolean;
};

export type SubtitleCueProps = SRTSubtitle & {
  words?: CaptionWordTimingProps[] | null;
};

export type CaptionStyleProps = {
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string | number;
  fontStyle?: string;
  color?: string;
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  textAlign?: 'left' | 'center' | 'right';
  textShadow?: string;
  strokeColor?: string;
  strokeWidth?: string;
  lineHeight?: string;
  letterSpacing?: string;
  wordSpacing?: string;
  linesPerCaption?: number;
  wordWrap?: string;
  wordBreak?: string;
  opacity?: number;
  top?: string;
  left?: string;
  height?: number;
  width?: number;
  appearedColor?: string;
  activeColor?: string;
  activeFillColor?: string;
  boxShadow?: {
    color?: string;
    x?: number;
    y?: number;
    blur?: number;
  } | null;
  transform?: string;
  blur?: number;
  brightness?: number;
};

export type CaptionStyleSegmentProps = {
  startFrame: number;
  endFrame: number;
  style: CaptionStyleProps;
};

/**
 * 视频组件接收的外部 props
 * 通过 `npx remotion render ... --props='{"template":"caption"}'` 传入
 */
export type VideoTheme = 'tech-dark' | 'minimal-light' | 'neon';

export type VideoProps = {
  subtitleFile?: string;
  subtitleStyle?: 'caption' | 'bottom';
  template?: 'caption' | 'split' | 'fullscreen' | 'card-draw';
  theme?: VideoTheme;
  typewriter?: boolean;
  useBundledShotAudio?: boolean;
  projectId?: string;
  voiceFile?: string;
  quality?: 'low' | 'medium' | 'high';
  subtitleData?: SubtitleCueProps[] | null;
  subtitleText?: string;
  audioSegments?: AudioSegmentProps[] | null;
  shots?: RenderShotProps[] | null;
  captionStyleSegments?: CaptionStyleSegmentProps[] | null;
  durationInFrames?: number;
  renderFps?: number;
  renderWidth?: number;
  renderHeight?: number;
  // 抽卡模板专用 props
  cardSeed?: number;
  cardCount?: number;
};

const DEFAULT_PROPS: VideoProps = {
  template: 'caption',
  subtitleStyle: 'caption',
  theme: 'tech-dark',
  typewriter: true,
  projectId: 'default',
  quality: 'high',
};

const resolvePositiveInt = (value: number | undefined, fallback: number) => {
  return Number.isFinite(value) && Number(value) > 0 ? Math.round(Number(value)) : fallback;
};

const ROOT_DURATION_IN_FRAMES = resolvePositiveInt(TOTAL_DURATION_SEC * FPS, FPS);

// Video1v4 总帧数：从合同计算
const VIDEO1V4_TOTAL_FRAMES = SEGMENTS.length > 0
  ? SEGMENTS[SEGMENTS.length - 1].start + SEGMENTS[SEGMENTS.length - 1].frames + TRANSITION_FRAMES
  : 7169;

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* OpenClaw 通用模板 */}
      <Composition
        id="OpenClawVideo"
        component={OpenClawVideo as React.FC<Record<string, unknown>>}
        durationInFrames={ROOT_DURATION_IN_FRAMES}
        fps={FPS}
        width={VIDEO_WIDTH}
        height={VIDEO_HEIGHT}
        calculateMetadata={({props: metadataProps}: {props: VideoProps}) => {
          const resolvedProps: VideoProps = {
            ...DEFAULT_PROPS,
            ...(metadataProps ?? {}),
          };

          return {
            durationInFrames: resolvePositiveInt(resolvedProps.durationInFrames, ROOT_DURATION_IN_FRAMES),
            fps: resolvePositiveInt(resolvedProps.renderFps, FPS),
            width: resolvePositiveInt(resolvedProps.renderWidth, VIDEO_WIDTH),
            height: resolvePositiveInt(resolvedProps.renderHeight, VIDEO_HEIGHT),
          };
        }}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        defaultProps={DEFAULT_PROPS as any}
      />
      {/* Video1v4 生产合同（video-gen 迁移） */}
      <Composition
        id="Video1v4"
        component={Video1v4}
        durationInFrames={VIDEO1V4_TOTAL_FRAMES}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={{directorPresetId: 'clean-tiktok'}}
      />
    </>
  );
};

registerRoot(RemotionRoot);
