import {registerRoot} from 'remotion';
import {Composition} from 'remotion';
import {FPS, TOTAL_DURATION_SEC, VIDEO_HEIGHT, VIDEO_WIDTH} from './data/storyboard';
import type {SRTSubtitle} from './components/SRTParser';
import FileBackedOpenClawVideo from './compositions/FileBackedOpenClawVideo';
import FileBackedUltimateSceneTemplate from './compositions/FileBackedUltimateSceneTemplate';
import UltimateElementsLibrary, {ULTIMATE_ELEMENTS_LIBRARY_DURATION} from './compositions/UltimateElementsLibrary';
import {type UltimateProjectConfig, getUltimateProjectDuration} from './components/ultimate-kit';
import {ULTIMATE_SCENE_DEMO} from './data/ultimateSceneDemo';

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
  sceneIntent?: string;
  evidenceAnchor?: string;
  storyboardCueZh?: string;
  scriptBlockId?: string;
  scriptBlockLabel?: string;
  scriptSourceText?: string;
  scriptExcerpt?: string;
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
  propsFile?: string | null;
  subtitleFile?: string;
  subtitleStyle?: 'caption' | 'bottom';
  template?: 'caption' | 'split' | 'fullscreen' | 'card-draw' | 'ultimate';
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

export type UltimateSceneCompositionProps = {
  propsFile?: string | null;
  config?: UltimateProjectConfig;
  voiceFile?: string | null;
  audioSegments?: AudioSegmentProps[] | null;
  durationInFrames?: number;
  renderFps?: number;
  renderWidth?: number;
  renderHeight?: number;
};

type OpenClawCompositionProps = VideoProps & {
  propsFile?: string | null;
};

const DEFAULT_PROPS: OpenClawCompositionProps = {
  propsFile: null,
  template: 'caption',
  subtitleStyle: 'caption',
  theme: 'tech-dark',
  typewriter: true,
  projectId: 'default',
  quality: 'high',
};

const DEFAULT_ULTIMATE_PROPS: UltimateSceneCompositionProps = {
  propsFile: null,
  config: ULTIMATE_SCENE_DEMO,
  voiceFile: null,
  audioSegments: null,
};

const resolvePositiveInt = (value: number | undefined, fallback: number) => {
  return Number.isFinite(value) && Number(value) > 0 ? Math.round(Number(value)) : fallback;
};

const ROOT_DURATION_IN_FRAMES = resolvePositiveInt(TOTAL_DURATION_SEC * FPS, FPS);

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* OpenClaw 通用模板 */}
      <Composition
        id="OpenClawVideo"
        component={FileBackedOpenClawVideo}
        durationInFrames={ROOT_DURATION_IN_FRAMES}
        fps={FPS}
        width={VIDEO_WIDTH}
        height={VIDEO_HEIGHT}
        calculateMetadata={({props: metadataProps}: {props: OpenClawCompositionProps}) => {
          const resolvedProps: OpenClawCompositionProps = {
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
        defaultProps={DEFAULT_PROPS}
      />
      <Composition
        id="UltimateElementsLibrary"
        component={UltimateElementsLibrary}
        durationInFrames={ULTIMATE_ELEMENTS_LIBRARY_DURATION}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="UltimateSceneTemplate"
        component={FileBackedUltimateSceneTemplate}
        durationInFrames={getUltimateProjectDuration(ULTIMATE_SCENE_DEMO)}
        fps={30}
        width={1920}
        height={1080}
        calculateMetadata={({props}: {props: UltimateSceneCompositionProps}) => {
          const resolvedConfig = props?.config ?? ULTIMATE_SCENE_DEMO;
          const durationInFrames = props?.durationInFrames
            ? resolvePositiveInt(props.durationInFrames, getUltimateProjectDuration(resolvedConfig))
            : getUltimateProjectDuration(resolvedConfig);

          return {
            durationInFrames,
            fps: resolvePositiveInt(props?.renderFps, 30),
            width: resolvePositiveInt(props?.renderWidth, 1920),
            height: resolvePositiveInt(props?.renderHeight, 1080),
          };
        }}
        defaultProps={DEFAULT_ULTIMATE_PROPS}
      />
    </>
  );
};

registerRoot(RemotionRoot);
