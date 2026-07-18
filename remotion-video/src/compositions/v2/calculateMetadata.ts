import type {CalculateMetadataFunction} from 'remotion';
import {compileProject} from '../../project/compileProject';
import {formatProjectPath, ProjectValidationError, VideoProjectSchema} from '../../project/projectSchema';
import type {UltimateVideoV2Props} from './UltimateVideoV2';

export const calculateUltimateVideoV2Metadata: CalculateMetadataFunction<UltimateVideoV2Props> = async ({props}) => {
  const parsed = VideoProjectSchema.safeParse(props);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const projectId = typeof props?.projectId === 'string' ? props.projectId : 'unknown';
    throw new ProjectValidationError(
      'INPUT_INVALID',
      formatProjectPath(issue.path),
      `projectId=${projectId}; ${issue.message}`,
    );
  }

  const compiledProject = compileProject(parsed.data);
  return {
    durationInFrames: compiledProject.durationInFrames,
    fps: compiledProject.fps,
    width: compiledProject.width,
    height: compiledProject.height,
    defaultOutName: `${compiledProject.projectId}.mp4`,
    props: {...parsed.data, compiledProject},
  };
};
