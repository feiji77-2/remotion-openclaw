import React, {useCallback, useState} from 'react';
import {createProject} from './api';
import {buildCreateProjectDraft, createProjectFieldErrors, validateNewProjectInput} from './new-project-model';
import type {CreateProjectError, CreateProjectResult, NewProjectInput} from './types';

interface NewProjectModalProps { onClose: () => void; onCreated: (result: CreateProjectResult) => void; onError: (message: string) => void; }
const initialInput: NewProjectInput = {title: '', spokenScript: ''};

export const NewProjectModal: React.FC<NewProjectModalProps> = ({onClose, onCreated, onError}) => {
  const [input, setInput] = useState<NewProjectInput>(initialInput);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const update = useCallback(<K extends keyof NewProjectInput>(key: K, value: NewProjectInput[K]) => {
    setInput((current) => ({...current, [key]: value}));
    setErrors((current) => { const next = {...current}; delete next[key]; return next; });
  }, []);
  const validate = useCallback(() => {
    const next = validateNewProjectInput(input);
    setErrors(next); return Object.keys(next).length === 0;
  }, [input]);
  const submit = useCallback(async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const draft = buildCreateProjectDraft(input, {
        now: Date.now(),
        random: Math.random().toString(36).slice(2),
      });
      onCreated(await createProject(draft));
    }
    catch (error) {
      const known = error as CreateProjectError & Error;
      const next = createProjectFieldErrors(known.error || known.message || '创建项目失败');
      setErrors(next); onError(next.form || next.spokenScript || '创建项目失败'); setSubmitting(false);
    }
  }, [input, onCreated, onError, validate]);
  return <div className="modal-backdrop" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="project-modal" role="dialog" aria-modal="true" aria-labelledby="new-project-title">
      <header><span>新生产任务</span><h2 id="new-project-title">新建视频</h2><p>先放入口播文案。创建后可以继续调整内容，再选择风格和生成分镜。</p></header>
      <div className="project-modal__body">
        {errors.form && <div className="notice notice--error">{errors.form}</div>}
        <label className="form-field"><span>口播文案 *</span><textarea autoFocus rows={10} value={input.spokenScript} placeholder="粘贴或输入完整口播文案，至少 20 个字。" onChange={(event) => update('spokenScript', event.target.value)} />{errors.spokenScript ? <em>{errors.spokenScript}</em> : <small>{input.spokenScript.trim().length} 字 / 至少 20 字</small>}</label>
        <label className="form-field"><span>视频标题 <small>可选</small></span><input value={input.title} placeholder="留空时从口播第一句话生成" maxLength={120} onChange={(event) => update('title', event.target.value)} />{errors.title && <em>{errors.title}</em>}</label>
      </div>
      <footer><button className="secondary-action" type="button" onClick={onClose}>取消</button><button className="primary-action project-modal__create" type="button" disabled={submitting} onClick={() => void submit()}>{submitting ? '正在创建' : '创建并进入口播文案'}</button></footer>
    </section>
  </div>;
};
