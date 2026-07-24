import type {VideoProject} from '../../src/project/projectSchema';

export interface BuildSkillShowcaseProjectOptions {
  scriptText: string;
  captions?: Array<{text: string; startMs: number; endMs: number}>;
  projectId: string;
  title: string;
  voiceSrc?: string;
  projectRoot: string;
  maxScenes?: number;
}

export function buildSkillShowcaseProjectFromScript(options: BuildSkillShowcaseProjectOptions): VideoProject;
