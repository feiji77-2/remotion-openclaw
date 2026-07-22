import type {CreateProjectDraft, NewProjectInput} from './types';

const shortScriptMessage = '至少输入 20 个字，才能生成字幕和初始分镜';

export const validateNewProjectInput = (input: NewProjectInput): Record<string, string> => {
  const errors: Record<string, string> = {};
  if (input.spokenScript.trim().length < 20) errors.spokenScript = shortScriptMessage;
  if (input.title.trim().length > 120) errors.title = '标题最多 120 个字';
  return errors;
};

const deriveTitle = (script: string) => {
  const firstSentence = script.split(/[。！？!?\n]/, 1)[0]?.trim();
  return (firstSentence || script).slice(0, 120);
};

export const buildCreateProjectDraft = (
  input: NewProjectInput,
  entropy: {now: number; random: string} = {
    now: Date.now(),
    random: globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2),
  },
): CreateProjectDraft => {
  const spokenScript = input.spokenScript.trim();
  const suffix = entropy.random.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 12) || 'project';
  return {
    projectId: `video-${entropy.now}-${suffix}`,
    title: input.title.trim() || deriveTitle(spokenScript),
    orientation: 'portrait',
    style: 'cyan-tech',
    spokenScript,
    keywords: '',
  };
};

export const createProjectFieldErrors = (message: string): Record<string, string> => {
  if (/spokenScript|required \(min 20 chars\)/i.test(message)) return {spokenScript: shortScriptMessage};
  if (/已存在|already exists/i.test(message)) return {form: '创建标识发生冲突，请再试一次'};
  return {form: message || '创建失败，请检查本地执行器后重试'};
};
