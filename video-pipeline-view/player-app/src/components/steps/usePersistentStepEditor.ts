import {useEffect, useRef, useState} from 'react';

interface PersistedEditorState<T> {
  editing: boolean;
  draft: T | null;
}

export function usePersistentStepEditor<T>(storageKey: string) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<T | null>(null);
  const hydratedRef = useRef(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) {
        return;
      }

      const parsed = JSON.parse(raw) as PersistedEditorState<T> | null;
      if (parsed?.editing) {
        setEditing(true);
      }
      if (parsed && 'draft' in parsed) {
        setDraft(parsed.draft ?? null);
      }
    } catch {
      window.localStorage.removeItem(storageKey);
    } finally {
      hydratedRef.current = true;
    }
  }, [storageKey]);

  useEffect(() => {
    if (!hydratedRef.current) {
      return;
    }

    try {
      if (!editing || draft == null) {
        window.localStorage.removeItem(storageKey);
        return;
      }

      window.localStorage.setItem(
        storageKey,
        JSON.stringify({
          editing,
          draft,
        } satisfies PersistedEditorState<T>),
      );
    } catch {
      // ignore localStorage errors
    }
  }, [draft, editing, storageKey]);

  const clearEditor = () => {
    setEditing(false);
    setDraft(null);
    try {
      window.localStorage.removeItem(storageKey);
    } catch {
      // ignore localStorage errors
    }
  };

  return {
    editing,
    setEditing,
    draft,
    setDraft,
    clearEditor,
  };
}
