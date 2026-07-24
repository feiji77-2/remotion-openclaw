import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe, expect, it} from 'vitest';
import {ScriptWorkspace} from '../ScriptWorkspace';
import type {DraftScript} from '../types';

const draft: DraftScript = {
  topic: '测试视频',
  hook: '这是开场口播',
  viewpoint: '这是核心观点',
  pain: '',
  solution: '',
  selectedTitle: '测试视频',
  titles: ['测试视频'],
  script: '这是一段足够长的口播文案，保存时只能写入内容合同。',
  keywords: '测试',
};

describe('script workspace responsibility', () => {
  it('offers save-only copy without storyboard or speech side effects', () => {
    const html = renderToStaticMarkup(React.createElement(ScriptWorkspace, {
      draft,
      dirty: true,
      writable: true,
      saving: false,
      onSetDraft: () => undefined,
      onSave: () => undefined,
    }));

    expect(html).toContain('保存口播稿');
    expect(html).toContain('不会自动合成语音或生成分镜');
    expect(html).not.toContain('保存并更新分镜');
    expect(html).not.toContain('合成语音并生成分镜');
  });

  it('keeps an undersized narration unsaveable with an explicit reason', () => {
    const html = renderToStaticMarkup(React.createElement(ScriptWorkspace, {
      draft: {...draft, script: '太短'},
      dirty: true,
      writable: true,
      saving: false,
      onSetDraft: () => undefined,
      onSave: () => undefined,
    }));

    expect(html).toContain('口播稿至少需要 20 个字符');
    expect(html).toContain('口播稿内容不足');
    expect(html).toContain('disabled');
  });
});
