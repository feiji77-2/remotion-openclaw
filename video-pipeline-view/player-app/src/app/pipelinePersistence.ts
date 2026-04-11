import {LOCAL_SAVE_KEY, LOCAL_SAVE_TTL_MS} from './pipelineConstants';
import type {PersistedPipelineSnapshot} from './pipelineTypes';

export function readPersistedPipelineSnapshot(): PersistedPipelineSnapshot | null {
  try {
    const raw = window.localStorage.getItem(LOCAL_SAVE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as PersistedPipelineSnapshot;
    const savedAt = Number(parsed?.savedAt || 0);
    const now = Date.now();

    if (!savedAt || now - savedAt > LOCAL_SAVE_TTL_MS) {
      window.localStorage.removeItem(LOCAL_SAVE_KEY);
      return null;
    }

    return parsed;
  } catch {
    window.localStorage.removeItem(LOCAL_SAVE_KEY);
    return null;
  }
}

export function writePersistedPipelineSnapshot(snapshot: PersistedPipelineSnapshot) {
  try {
    window.localStorage.setItem(LOCAL_SAVE_KEY, JSON.stringify(snapshot));
  } catch {
    window.localStorage.removeItem(LOCAL_SAVE_KEY);
  }
}
