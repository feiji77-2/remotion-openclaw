import type {WipeDirection} from '../visual-atoms';
import type {UltimateSceneGrammar} from './types';

const REVEAL_DIRECTION_ALIAS: Record<string, WipeDirection> = {
  center: 'center',
  'center-outward': 'center',
  'center-out': 'center',
  left: 'left',
  'left-to-right': 'left',
  right: 'right',
  'right-to-left': 'right',
  up: 'up',
  'bottom-to-top': 'up',
  down: 'down',
  'top-to-bottom': 'down',
};

export const resolveTextRevealDirection = (
  grammar: UltimateSceneGrammar | undefined,
  fallback: WipeDirection,
): WipeDirection => {
  const raw = String(grammar?.revealDirection || '').trim().toLowerCase();
  if (!raw) {
    return fallback;
  }

  return REVEAL_DIRECTION_ALIAS[raw] ?? fallback;
};
