import {LOCAL_SAVE_KEY, LOCAL_SAVE_TTL_MS} from './pipelineConstants';
import type {PersistedPipelineSnapshot} from './pipelineTypes';

const SCHEMA_VERSION = 1;

/** Returns parsed snapshot or null if missing / expired / version-mismatched. */
export function readPersistedPipelineSnapshot(): PersistedPipelineSnapshot | null {
  try {
    const raw = window.localStorage.getItem(LOCAL_SAVE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as PersistedPipelineSnapshot;

    // TTL check
    const savedAt = Number(parsed?.savedAt || 0);
    if (!savedAt || Date.now() - savedAt > LOCAL_SAVE_TTL_MS) {
      window.localStorage.removeItem(LOCAL_SAVE_KEY);
      return null;
    }

    // Schema version migration: if version is missing or lower, discard stale shape.
    const version = Number(parsed.schemaVersion ?? 0);
    if (version < SCHEMA_VERSION) {
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
    const toSave: PersistedPipelineSnapshot = {
      ...snapshot,
      schemaVersion: SCHEMA_VERSION,
    };
    window.localStorage.setItem(LOCAL_SAVE_KEY, JSON.stringify(toSave));
  } catch {
    window.localStorage.removeItem(LOCAL_SAVE_KEY);
  }
}
