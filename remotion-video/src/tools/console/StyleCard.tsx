import React from 'react';
import type {StylePreset, StylePresetId} from '../../styles/video-gen/style-presets';
import {STYLE_SAMPLES} from './style-samples';

interface StyleCardProps {
  presets: StylePreset[];
  candidate: StylePresetId | null;
  applied: StylePresetId;
  onSelect: (id: StylePresetId) => void;
  disabled?: boolean;
}

export const StyleCard: React.FC<StyleCardProps> = ({presets, candidate, applied, onSelect, disabled = false}) => {
  return <div className="style-grid" role="radiogroup" aria-label="视频风格选择">
    {STYLE_SAMPLES.map((sample) => {
      const preset = presets.find((item) => item.id === sample.presetId);
      if (!preset) return null;
      const isCandidate = preset.id === candidate;
      const isApplied = preset.id === applied;
      return <button
        className={`style-option ${isCandidate ? 'is-selected' : ''}`}
        key={preset.id}
        type="button"
        role="radio"
        aria-checked={isCandidate}
        aria-label={`${preset.label}${isApplied ? '，当前已应用' : ''}`}
        disabled={disabled}
        onClick={() => onSelect(preset.id)}
      >
        <span className="style-option__media" style={{
          '--style-primary': preset.palette.primary,
          '--style-secondary': preset.palette.secondary,
          '--style-surface': preset.palette.surface,
        } as React.CSSProperties}>
          <span className="style-option__visual" aria-hidden="true"><i /><i /><i /></span>
          <em className="style-option__play">{isCandidate ? '候选风格' : isApplied ? '已应用' : '视觉规则'}</em>
        </span>
        <span className="style-option__content">
          <strong>{preset.label}</strong>
          {isApplied && <small>当前已应用</small>}
          <span>{sample.summary}</span>
          <span className="style-option__swatches" aria-hidden="true">
            <i style={{background: preset.palette.primary}} /><i style={{background: preset.palette.secondary}} /><i style={{background: preset.palette.surface}} />
          </span>
        </span>
      </button>;
    })}
  </div>;
};
