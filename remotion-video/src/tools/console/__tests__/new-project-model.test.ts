import {describe, expect, it} from 'vitest';
import {
  buildCreateProjectDraft,
  createProjectFieldErrors,
  validateNewProjectInput,
} from '../new-project-model';

describe('new project input', () => {
  it('requires a production-ready spoken script without requiring a title', () => {
    expect(validateNewProjectInput({title: '', spokenScript: '太短'})).toEqual({
      spokenScript: '至少输入 20 个字，才能生成字幕和初始分镜',
    });
    expect(validateNewProjectInput({
      title: '',
      spokenScript: '这是一段超过二十个字的正式口播文案，可以直接创建一个新的视频项目。',
    })).toEqual({});
  });

  it('builds the hidden production fields and a safe unique project id', () => {
    const result = buildCreateProjectDraft(
      {title: '  内容生产方法  ', spokenScript: '  这是一段超过二十个字的正式口播文案，可以直接创建一个新的视频项目。  '},
      {now: 1784640000000, random: 'A9_x'},
    );

    expect(result).toEqual({
      projectId: 'video-1784640000000-a9-x',
      title: '内容生产方法',
      orientation: 'portrait',
      style: 'cyan-tech',
      spokenScript: '这是一段超过二十个字的正式口播文案，可以直接创建一个新的视频项目。',
      keywords: '',
    });
  });

  it('derives a creator-facing title when the optional title is blank', () => {
    const result = buildCreateProjectDraft(
      {title: ' ', spokenScript: '第一句话说明这期视频的主题。后面继续补充足够长度，确保能够创建项目。'},
      {now: 1784640000000, random: 'abc'},
    );

    expect(result.title).toBe('第一句话说明这期视频的主题');
  });
});

describe('new project errors', () => {
  it('keeps short-script and duplicate-project failures in creator language', () => {
    expect(createProjectFieldErrors('spokenScript is required (min 20 chars)')).toEqual({
      spokenScript: '至少输入 20 个字，才能生成字幕和初始分镜',
    });
    expect(createProjectFieldErrors('项目 video-1-abc 已存在')).toEqual({
      form: '创建标识发生冲突，请再试一次',
    });
  });
});
