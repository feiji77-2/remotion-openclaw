/**
 * visual-atoms/index.ts
 *
 * High-value visual primitive components.
 * These are composable atoms — designed to be placed inside family scenes
 * or used as scene backgrounds. They are NOT families themselves.
 *
 * Imported by family components:
 *   import {TextMaskWipe, GodRays, DotGridParallax} from '../visual-atoms';
 */

export {TextMaskWipe, type TextMaskWipeProps, type WipeDirection} from './TextMaskWipe';
export {GodRays, type GodRaysProps} from './GodRays';
export {DotGridParallax, type DotGridParallaxProps} from './DotGridParallax';
export {PerspectiveCard, type PerspectiveCardProps, ParallaxLayer, type ParallaxLayerProps} from './PerspectiveCard';
export {PathDrawLink, type PathDrawLinkProps, type FlowMarkerShape} from './PathDrawLink';
export {RadialGauge, type RadialGaugeProps} from './RadialGauge';
export {GeometryAccent, type GeometryAccentProps, type GeometryAccentVariant} from './GeometryAccent';
