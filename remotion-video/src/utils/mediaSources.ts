import { staticFile } from 'remotion';

/**
 * Strip leading slashes from an asset path for use with staticFile().
 */
export const normalizeStaticAssetPath = (assetPath: string): string => {
  return assetPath.replace(/^\/+/, '');
};

/**
 * Resolve an audio source URL.
 * Returns remote URLs as-is; static paths are normalized and passed to remotion's staticFile().
 */
export const resolveAudioSource = (src: string): string => {
  return /^https?:\/\//.test(src) ? src : staticFile(normalizeStaticAssetPath(src));
};

/**
 * Resolve a media source URL (image, video, etc.).
 * Returns remote URLs as-is; static paths are normalized and passed to remotion's staticFile().
 */
export const resolveMediaSource = (src: string): string => {
  return /^https?:\/\//.test(src) ? src : staticFile(normalizeStaticAssetPath(src));
};
