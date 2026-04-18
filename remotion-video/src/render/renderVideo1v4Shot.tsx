import { getVideo1v4ShotContent } from '../data/contentManifest_v4h';
import { renderShotContent } from './shotRenderRegistry';
import type { ShotTheme } from './types';

export interface RenderVideo1v4ShotOptions {
  shotId: string;
  theme: ShotTheme;
  startFrame?: number;
  durationFrames?: number;
}

export const renderVideo1v4Shot = ({
  shotId,
  theme,
  startFrame = 0,
  durationFrames = 0,
}: RenderVideo1v4ShotOptions) => {
  return renderShotContent({
    content: getVideo1v4ShotContent(shotId),
    theme,
    startFrame,
    durationFrames,
  });
};
