import {Composition, Folder, registerRoot} from 'remotion';
import {AdaptiveVerification} from './compositions/AdaptiveVerification';
import {DirectorScorePreviewComposition} from './compositions/DirectorScorePreviewComposition';
import IconEmojiCapabilityPreview from './compositions/IconEmojiCapabilityPreview';
import MorfeoStylePreview from './compositions/MorfeoStylePreview';
import {MultiPlatformComparison} from './compositions/MultiPlatformComparison';
import {
  RemotionStoryboardLibrary,
  REMOTION_STORYBOARD_DURATION,
  REMOTION_STORYBOARD_FPS,
  REMOTION_STORYBOARD_HEIGHT,
  REMOTION_STORYBOARD_WIDTH,
} from './compositions/RemotionStoryboardLibrary';
import {SkillVisualLibrary, SKILL_VISUAL_LIBRARY_DURATION} from './compositions/SkillVisualLibrary';
import UltimateElementsLibrary, {ULTIMATE_ELEMENTS_LIBRARY_DURATION} from './compositions/UltimateElementsLibrary';
import {UltimateVideoV2} from './compositions/v2/UltimateVideoV2';
import {calculateUltimateVideoV2Metadata} from './compositions/v2/calculateMetadata';
import {DEFAULT_PROJECT_DURATION, DEFAULT_VIDEO_PROJECT} from './compositions/v2/defaultProject';
import {VideoProjectSchema} from './project/projectSchema';

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="UltimateVideoV2"
      component={UltimateVideoV2}
      durationInFrames={DEFAULT_PROJECT_DURATION}
      fps={30}
      width={1920}
      height={1080}
      schema={VideoProjectSchema}
      defaultProps={DEFAULT_VIDEO_PROJECT}
      calculateMetadata={calculateUltimateVideoV2Metadata}
    />
    <Composition
      id="UltimateVideoV2-Portrait"
      component={UltimateVideoV2}
      durationInFrames={DEFAULT_PROJECT_DURATION}
      fps={30}
      width={1080}
      height={1920}
      schema={VideoProjectSchema}
      defaultProps={{...DEFAULT_VIDEO_PROJECT, render: {...DEFAULT_VIDEO_PROJECT.render, width: 1080, height: 1920, orientation: 'portrait'}}}
      calculateMetadata={calculateUltimateVideoV2Metadata}
    />
    <Folder name="Tools">
      <Composition
        id="UltimateElementsLibrary"
        component={UltimateElementsLibrary}
        durationInFrames={ULTIMATE_ELEMENTS_LIBRARY_DURATION}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition id="IconEmojiCapabilityPreview" component={IconEmojiCapabilityPreview} durationInFrames={1} fps={30} width={1600} height={900} />
      <Composition id="MorfeoStylePreview" component={MorfeoStylePreview} durationInFrames={180} fps={30} width={1600} height={900} />
      <Composition id="DirectorScorePreview" component={DirectorScorePreviewComposition} durationInFrames={210} fps={30} width={1920} height={1080} />
      <Composition id="AdaptiveVerification" component={AdaptiveVerification} durationInFrames={1} fps={30} width={1920} height={1080} />
      <Composition id="MultiPlatformComparison" component={MultiPlatformComparison} durationInFrames={1} fps={30} width={1920} height={1080} />
      <Composition id="SkillVisualLibrary" component={SkillVisualLibrary} durationInFrames={SKILL_VISUAL_LIBRARY_DURATION} fps={30} width={1080} height={1920} defaultProps={{index: 0}} />
      <Composition id="RemotionStoryboardLibrary" component={RemotionStoryboardLibrary} durationInFrames={REMOTION_STORYBOARD_DURATION} fps={REMOTION_STORYBOARD_FPS} width={REMOTION_STORYBOARD_WIDTH} height={REMOTION_STORYBOARD_HEIGHT} defaultProps={{index: 0}} />
    </Folder>
  </>
);

registerRoot(RemotionRoot);
