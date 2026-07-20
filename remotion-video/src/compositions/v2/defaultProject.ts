import project from "../../../examples/skill-showcase.json";
import { VideoProjectSchema } from "../../project/projectSchema";

export const DEFAULT_VIDEO_PROJECT = VideoProjectSchema.parse(project);

export const DEFAULT_PROJECT_DURATION = DEFAULT_VIDEO_PROJECT.scenes.reduce(
  (total, scene) => total + scene.durationInFrames,
  0,
);
