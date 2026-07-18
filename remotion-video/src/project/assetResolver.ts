import type {VideoProject} from './projectSchema';
import {ProjectValidationError} from './projectSchema';

export type ProjectDiagnostic = {
  level: 'info' | 'warning';
  code: string;
  message: string;
  path: string;
};

export type CompiledAsset = {
  id: string;
  kind: 'image' | 'audio' | 'video' | 'font' | 'json';
  src: string;
  source: 'public' | 'remote';
  available: boolean;
  required: boolean;
};

const SAFE_PUBLIC_PATH = /^(?!\/)(?!.*(?:^|\/)\.\.(?:\/|$))[A-Za-z0-9._~!$&'()+,;=@%\-/]+$/;

const validateSource = (assetId: string, src: string) => {
  if (/^https:\/\//i.test(src)) return 'remote' as const;
  if (/^[a-z]+:\/\//i.test(src)) {
    throw new ProjectValidationError('ASSET_INVALID', `assets.${assetId}.src`, 'remote assets must use https');
  }
  if (!SAFE_PUBLIC_PATH.test(src) || src.startsWith('public/')) {
    throw new ProjectValidationError(
      'ASSET_INVALID',
      `assets.${assetId}.src`,
      'local assets must use a safe path relative to public/ without a public/ prefix',
    );
  }
  return 'public' as const;
};

export const resolveProjectAsset = (
  project: VideoProject,
  assetId: string,
  path: string,
  diagnostics: ProjectDiagnostic[],
  expectedKind?: CompiledAsset['kind'],
): CompiledAsset | null => {
  const asset = project.assets[assetId];
  if (!asset) {
    diagnostics.push({
      level: 'warning',
      code: 'asset.missing',
      message: `Asset ${assetId} is unavailable; a fallback will be rendered`,
      path,
    });
    return null;
  }

  const source = validateSource(assetId, asset.src);
  if (expectedKind && asset.kind !== expectedKind) {
    throw new ProjectValidationError(
      'ASSET_KIND_INVALID',
      path,
      `expected ${expectedKind}, received ${asset.kind}`,
    );
  }

  return {
    id: assetId,
    kind: asset.kind,
    src: asset.src,
    source,
    available: true,
    required: asset.required,
  };
};

export const missingVisualAsset = (assetId: string): CompiledAsset => ({
  id: assetId,
  kind: 'image',
  src: assetId,
  source: 'public',
  available: false,
  required: false,
});
