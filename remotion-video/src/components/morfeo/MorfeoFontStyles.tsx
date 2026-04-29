import React, {useEffect, useMemo} from 'react';
import {cancelRender, continueRender, delayRender} from 'remotion';
import {MORFEO_FONTS} from './morfeoTokens';

const FONT_IMPORT_ID = 'morfeo-font-import';
const FONT_CSS = '@import url("https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Instrument+Serif:ital@0;1&display=swap");';

const ensureFontStyleTag = () => {
  if (typeof document === 'undefined') {
    return;
  }

  if (document.getElementById(FONT_IMPORT_ID)) {
    return;
  }

  const style = document.createElement('style');
  style.id = FONT_IMPORT_ID;
  style.textContent = FONT_CSS;
  document.head.appendChild(style);
};

export const MorfeoFontStyles: React.FC = () => {
  const handle = useMemo(() => delayRender('Load Morfeo fonts'), []);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        ensureFontStyleTag();

        if (typeof document === 'undefined' || !('fonts' in document)) {
          continueRender(handle);
          return;
        }

        await Promise.all([
          document.fonts.load(`italic 400 64px ${MORFEO_FONTS.displayName}`),
          document.fonts.load(`500 24px ${MORFEO_FONTS.uiName}`),
        ]);

        if (!cancelled) {
          continueRender(handle);
        }
      } catch (error) {
        if (!cancelled) {
          cancelRender(error);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [handle]);

  return null;
};
