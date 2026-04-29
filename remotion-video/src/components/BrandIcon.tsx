import React from 'react';
import {RenderIcon} from '../render/iconRegistry';

export type BrandIconName =
  | 'github'
  | 'telegram'
  | 'discord'
  | 'slack'
  | 'whatsapp'
  | 'reddit'
  | 'ollama';

const BRAND_ICON_ALIASES: Record<string, BrandIconName> = {
  gh: 'github',
  github: 'github',
  tg: 'telegram',
  telegram: 'telegram',
  discord: 'discord',
  slack: 'slack',
  wa: 'whatsapp',
  whatsapp: 'whatsapp',
  reddit: 'reddit',
  ollama: 'ollama',
};

const DEFAULT_BRAND_COLORS: Record<BrandIconName, string> = {
  github: '#f8fafc',
  telegram: '#60a5fa',
  discord: '#a78bfa',
  slack: '#f8fafc',
  whatsapp: '#34d399',
  reddit: '#fb7185',
  ollama: '#67e8f9',
};

const resolveBrandName = (brand: string): BrandIconName => {
  const normalized = brand.trim().toLowerCase();
  const resolved = BRAND_ICON_ALIASES[normalized];
  if (!resolved) {
    throw new Error(`Unsupported brand: ${brand}`);
  }

  return resolved;
};

export type BrandIconProps = {
  brand: BrandIconName | string;
  size?: number;
  color?: string;
  secondaryColor?: string;
  style?: React.CSSProperties;
};

export const BrandIcon: React.FC<BrandIconProps> = ({
  brand,
  size = 20,
  color,
  secondaryColor = '#ffffff',
  style,
}) => {
  const resolvedBrand = resolveBrandName(brand);

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        lineHeight: 1,
        ...style,
      }}
    >
      <RenderIcon
        id={resolvedBrand}
        size={size}
        color={color ?? DEFAULT_BRAND_COLORS[resolvedBrand]}
        secondaryColor={secondaryColor}
      />
    </span>
  );
};
