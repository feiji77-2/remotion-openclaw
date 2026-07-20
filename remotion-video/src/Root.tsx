import { Composition, registerRoot } from "remotion";
import {
  RemotionStoryboardLibrary,
  REMOTION_STORYBOARD_DURATION,
  REMOTION_STORYBOARD_FPS,
  REMOTION_STORYBOARD_HEIGHT,
  REMOTION_STORYBOARD_WIDTH,
} from "./compositions/RemotionStoryboardLibrary";
import { UltimateVideoV2 } from "./compositions/v2/UltimateVideoV2";
import { calculateUltimateVideoV2Metadata } from "./compositions/v2/calculateMetadata";
import {
  DEFAULT_PROJECT_DURATION,
  DEFAULT_VIDEO_PROJECT,
} from "./compositions/v2/defaultProject";
import { VideoProjectSchema } from "./project/projectSchema";

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="UltimateVideoV2"
      component={UltimateVideoV2}
      durationInFrames={DEFAULT_PROJECT_DURATION}
      fps={30}
      width={1080}
      height={1920}
      schema={VideoProjectSchema}
      defaultProps={DEFAULT_VIDEO_PROJECT}
      calculateMetadata={calculateUltimateVideoV2Metadata}
    />
    <Composition
      id="RemotionStoryboardLibrary"
      component={RemotionStoryboardLibrary}
      durationInFrames={REMOTION_STORYBOARD_DURATION}
      fps={REMOTION_STORYBOARD_FPS}
      width={REMOTION_STORYBOARD_WIDTH}
      height={REMOTION_STORYBOARD_HEIGHT}
      defaultProps={{ index: 0 }}
    />
  </>
);

registerRoot(RemotionRoot);
