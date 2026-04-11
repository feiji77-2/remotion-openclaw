import {registerRoot} from 'remotion';
import {Composition} from 'remotion';
import {OpenClawVideo} from './OpenClawVideo';
import {FPS, TOTAL_DURATION_SEC, VIDEO_HEIGHT, VIDEO_WIDTH} from './data/storyboard';
import type {SRTSubtitle} from './components/SRTParser';

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

registerRoot((passedProps: VideoProps) => {
  const props: VideoProps = { ...DEFAULT_PROPS, ...passedProps };
  return (
    <>
      <Composition
        id="OpenClawVideo"
        component={OpenClawVideo as React.FC<Record<string, unknown>>}
        durationInFrames={TOTAL_DURATION_SEC * FPS}
        fps={FPS}
        width={VIDEO_WIDTH}
        height={VIDEO_HEIGHT}
        calculateMetadata={({props: metadataProps}: {props: VideoProps}) => {
          return {
            durationInFrames: resolvePositiveInt(metadataProps.durationInFrames, TOTAL_DURATION_SEC * FPS),
            fps: resolvePositiveInt(metadataProps.renderFps, FPS),
            width: resolvePositiveInt(metadataProps.renderWidth, VIDEO_WIDTH),
            height: resolvePositiveInt(metadataProps.renderHeight, VIDEO_HEIGHT),
          };
        }}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        defaultProps={props as any}
      />
    </>
  );
});
