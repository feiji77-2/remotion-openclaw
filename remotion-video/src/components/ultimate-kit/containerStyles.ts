/**
 * containerStyles.ts — Shared card/panel container styles for family components
 *
 * Provides consistent semi-transparent card/panel backgrounds behind text content
 * to improve readability and visual structure.
 *
 * Each function returns a React.CSSProperties object. Pass accent color + optional
 * density/padding adaptives for dynamic sizing.
 */

import type {CSSProperties} from 'react';
import {ultimateKitTokens, ultimateGlow} from './tokens';
import type {AdaptiveIntent} from '../../types/director';

const kit = ultimateKitTokens;

export interface ContainerAdaptive {
  density?: AdaptiveIntent['density'];
  contrast?: AdaptiveIntent['contrast'];
}

/**
 * Glass card panel — the standard container for text content blocks.
 * Semi-transparent dark bg with accent border, subtle glow, and rounded corners.
 */
export function glassPanelStyle(
  accentColor: string,
  adaptive?: ContainerAdaptive,
  options?: {paddingScale?: number; radius?: 'md' | 'lg' | 'xl'; intense?: boolean},
): CSSProperties {
  const padScale = adaptive?.density?.padding ?? 1;
  const radiusMap = {md: kit.radius.md, lg: kit.radius.lg, xl: kit.radius.xl};
  const radius = radiusMap[options?.radius ?? 'lg'];
  const basePadding = options?.intense ? 28 : 22;

  return {
    borderRadius: radius,
    border: `1px solid ${accentColor}28`,
    background: `linear-gradient(160deg, ${accentColor}10 0%, ${kit.colors.panelSoft} 100%)`,
    boxShadow: `${ultimateGlow(accentColor, 0.08)}, inset 0 1px 0 ${accentColor}10`,
    padding: `${Math.round(basePadding * padScale)}px ${Math.round((basePadding + 6) * padScale)}px`,
    backdropFilter: 'blur(4px)',
    WebkitBackdropFilter: 'blur(4px)',
  };
}

/**
 * Compact content card — smaller padding, subtler border for secondary text.
 */
export function contentCardStyle(
  accentColor: string,
  adaptive?: ContainerAdaptive,
): CSSProperties {
  const padScale = adaptive?.density?.padding ?? 1;
  return {
    borderRadius: kit.radius.md,
    border: `1px solid ${accentColor}18`,
    background: `linear-gradient(135deg, ${accentColor}08, rgba(9, 12, 22, 0.72))`,
    padding: `${Math.round(16 * padScale)}px ${Math.round(20 * padScale)}px`,
  };
}

/**
 * Inline tag/chip container — for small label-like containers.
 */
export function chipPanelStyle(
  accentColor: string,
  adaptive?: ContainerAdaptive,
): CSSProperties {
  const padScale = adaptive?.density?.padding ?? 1;
  return {
    borderRadius: kit.radius.pill,
    border: `1px solid ${accentColor}20`,
    background: `${accentColor}0a`,
    padding: `${Math.round(8 * padScale)}px ${Math.round(14 * padScale)}px`,
  };
}

export default glassPanelStyle;
