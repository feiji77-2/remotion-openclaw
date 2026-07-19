// src/tools/console/StyleCard.tsx
// Stage C: 视觉风格卡片选择器 — 2x2 网格，色块预览 + 选中高亮
import React from 'react';
import {theme} from './theme';
import type {StylePreset} from '../../styles/video-gen/style-presets';

// ─── 常量 ──────────────────────────────────────────────────────────────

const GAP = 10;
const CARD_WIDTH = 'calc(50% - 5px)'; // 2列网格，gap 10px 分摊

// ─── 样式工厂 ──────────────────────────────────────────────────────────

const gridStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: GAP,
};

const cardBase: React.CSSProperties = {
  width: CARD_WIDTH,
  background: theme.bg.surface,
  border: `1px solid ${theme.border.default}`,
  borderRadius: theme.radius.lg,
  padding: '12px 14px',
  cursor: 'pointer',
  transition: theme.transition,
  boxSizing: 'border-box',
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  userSelect: 'none' as const,
};

const cardSelectedOverrides: React.CSSProperties = {
  border: `1.5px solid ${theme.accent.blue}`,
  background: `${theme.accent.blue}11`,
  boxShadow: `0 0 12px ${theme.accent.blue}22, inset 0 0 0 1px ${theme.accent.blue}22`,
  transform: 'scale(1.02)',
};

const cardHoverOverrides: React.CSSProperties = {
  border: `1px solid ${theme.border.accent}`,
  background: theme.bg.hover,
};

const cardHeaderStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
};

const iconStyle: React.CSSProperties = {
  fontSize: 18,
  lineHeight: 1,
  flexShrink: 0,
};

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: theme.text.primary,
  lineHeight: 1.2,
};

const descriptionStyle: React.CSSProperties = {
  fontSize: 8,
  color: theme.text.muted,
  lineHeight: 1.35,
  minHeight: 20, // 预留两行高度
};

const swatchRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: 4,
  height: 6,
  borderRadius: 3,
  overflow: 'hidden',
};

const swatchStyle = (color: string, flex: number): React.CSSProperties => ({
  flex,
  background: color,
  borderRadius: 2,
});

const checkMarkStyle: React.CSSProperties = {
  width: 16,
  height: 16,
  borderRadius: '50%',
  background: theme.accent.blue,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 9,
  color: '#fff',
  fontWeight: 700,
  flexShrink: 0,
  lineHeight: 1,
};

// ─── 单卡片子组件 ──────────────────────────────────────────────────────

interface StyleCardItemProps {
  preset: StylePreset;
  selected: boolean;
  onSelect: () => void;
}

const StyleCardItem: React.FC<StyleCardItemProps> = ({preset, selected, onSelect}) => {
  const [hovered, setHovered] = React.useState(false);

  const mergedStyle: React.CSSProperties = {
    ...cardBase,
    ...(hovered && !selected ? cardHoverOverrides : {}),
    ...(selected ? cardSelectedOverrides : {}),
  };

  return (
    <div
      style={mergedStyle}
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      role="radio"
      aria-checked={selected}
      aria-label={preset.label}
    >
      {/* Header: icon + label + checkmark */}
      <div style={cardHeaderStyle}>
        <span style={iconStyle}>{preset.icon}</span>
        <span style={labelStyle}>{preset.label}</span>
        <div style={{flex: 1}} />
        {selected && (
          <div style={checkMarkStyle}>✓</div>
        )}
      </div>

      {/* Description */}
      <div style={descriptionStyle}>{preset.description}</div>

      {/* Color swatch: primary / secondary gradient mini-bar */}
      <div style={swatchRowStyle}>
        <div style={swatchStyle(preset.palette.primary, 3)} />
        <div style={swatchStyle(preset.palette.secondary, 2)} />
        <div style={swatchStyle(preset.palette.surface, 1)} />
      </div>
    </div>
  );
};

// ─── 主组件 ────────────────────────────────────────────────────────────

interface StyleCardProps {
  presets: StylePreset[];
  selected: string;
  onSelect: (id: string) => void;
}

/**
 * StyleCard — 视觉卡片风格选择器
 *
 * 2x2 网格布局，每张卡片展示：
 *   - emoji 图标 + 中文名称
 *   - 一句话描述
 *   - primary/secondary 色块渐变预览条
 *   - 选中态：蓝色边框 + 微缩放 + 内光晕 + ✓ 标记
 */
export const StyleCard: React.FC<StyleCardProps> = ({presets, selected, onSelect}) => {
  return (
    <div style={gridStyle} role="radiogroup" aria-label="视频风格选择">
      {presets.map((preset) => (
        <StyleCardItem
          key={preset.id}
          preset={preset}
          selected={preset.id === selected}
          onSelect={() => onSelect(preset.id)}
        />
      ))}
    </div>
  );
};
