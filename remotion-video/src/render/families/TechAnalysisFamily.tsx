import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import type {NormalizedTechAnalysisContent} from '../familySchemas';
import {
  POSTER_ANALYSIS_TOP,
  POSTER_CHART_TOP,
  POSTER_CONCLUSION_BOTTOM,
  POSTER_HERO_TOP_COMPACT,
  POSTER_SIDE_PADDING,
  POSTER_SIGNAL_TOP,
  POSTER_WIDE_PADDING,
} from '../layoutRhythm';

interface TechAnalysisFamilyProps {
  startFrame: number;
  durationFrames: number;
  bgColor: string;
  content: NormalizedTechAnalysisContent;
}

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

const splitHeadline = (value: string) => {
  const parts = value.split(/[\s/]+/).filter(Boolean);
  if (parts.length >= 2) {
    const mid = Math.ceil(parts.length / 2);
    return [parts.slice(0, mid).join(' '), parts.slice(mid).join(' ')];
  }

  return [value];
};

const TopSignal: React.FC<{label: string}> = ({label}) => {
  return (
    <div
      style={{
        position: 'absolute',
        top: POSTER_SIGNAL_TOP,
        left: POSTER_SIDE_PADDING,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <div
        style={{
          width: 54,
          height: 2,
          borderRadius: 999,
          background: 'linear-gradient(90deg, rgba(0,212,255,0.9), rgba(0,212,255,0))',
        }}
      />
      <div
        style={{
          fontSize: 19,
          fontWeight: 600,
          color: 'rgba(233,242,255,0.54)',
          letterSpacing: 3,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </div>
    </div>
  );
};

const ProblemStage: React.FC<{relFrame: number; content: NormalizedTechAnalysisContent}> = ({
  relFrame,
  content,
}) => {
  const summaryOpacity = clamp01((relFrame - content.template.beats.summaryStart) / 26);

  return (
    <div
      style={{
        position: 'absolute',
        left: POSTER_SIDE_PADDING,
        right: POSTER_SIDE_PADDING,
        top: POSTER_ANALYSIS_TOP,
        display: 'flex',
        flexDirection: 'column',
        gap: 30,
      }}
    >
      {content.problemItems.map((problem, index) => {
        const itemFrame = Math.max(0, relFrame - index * content.template.beats.problemStagger);
        const progress = clamp01(itemFrame / 28);
        const translateX = interpolate(progress, [0, 1], [-60, 0]);
        const opacity = interpolate(progress, [0, 0.3, 1], [0, 0.4, 1]);
        const numberScale = interpolate(progress, [0, 1], [0.78, 1]);

        return (
          <div
            key={problem.label}
            style={{
              display: 'grid',
              gridTemplateColumns: '88px 1fr',
              alignItems: 'center',
              columnGap: 26,
              transform: `translateX(${translateX}px)`,
              opacity,
            }}
          >
            <div
              style={{
                fontSize: 62,
                fontWeight: 800,
                color: `${problem.color}aa`,
                fontFamily: "'SF Mono', monospace",
                transform: `scale(${numberScale})`,
                transformOrigin: 'left center',
              }}
            >
              0{index + 1}
            </div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}
            >
              <div
                style={{
                  width: 160,
                  height: 2,
                  borderRadius: 999,
                  background: `linear-gradient(90deg, ${problem.color}, rgba(255,255,255,0))`,
                }}
              />
              <div
                style={{
                  fontSize: 46,
                  fontWeight: 700,
                  color: '#edf5ff',
                  lineHeight: 1.08,
                  letterSpacing: -1.2,
                }}
              >
                {problem.label}
              </div>
            </div>
          </div>
        );
      })}
      <div
        style={{
          marginTop: 16,
          opacity: summaryOpacity,
          transform: `translateY(${interpolate(summaryOpacity, [0, 1], [26, 0])}px)`,
        }}
      >
        <div
          style={{
            fontSize: 24,
            fontWeight: 600,
            color: 'rgba(255,255,255,0.42)',
            letterSpacing: 2,
          }}
        >
          ROOT CAUSE
        </div>
        <div
          style={{
            marginTop: 8,
            fontSize: 54,
            fontWeight: 800,
            color: '#ffffff',
            lineHeight: 1.08,
            letterSpacing: -1.8,
            maxWidth: 860,
          }}
        >
          {content.summaryLabel}
        </div>
      </div>
    </div>
  );
};

const FormulaStage: React.FC<{relFrame: number; content: NormalizedTechAnalysisContent}> = ({
  relFrame,
  content,
}) => {
  const progress = clamp01((relFrame - content.template.beats.formulaStart) / 48);
  const formulaColor = content.template.series[0].color;
  const lines = splitHeadline(content.formulaText);

  return (
    <div
      style={{
        position: 'absolute',
        left: POSTER_SIDE_PADDING,
        right: POSTER_SIDE_PADDING,
        top: POSTER_HERO_TOP_COMPACT,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        opacity: interpolate(progress, [0, 0.2, 1], [0, 0.6, 1]),
        transform: `translateY(${interpolate(progress, [0, 1], [32, 0])}px) scale(${interpolate(
          progress,
          [0, 1],
          [0.92, 1],
        )})`,
      }}
    >
      <div
        style={{
          fontSize: 30,
          color: 'rgba(237,245,255,0.56)',
          textAlign: 'center',
          lineHeight: 1.35,
        }}
      >
        {content.formulaIntro}
      </div>
      <div
        style={{
          marginTop: 32,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 4,
        }}
      >
        {lines.map((line) => (
          <div
            key={line}
            style={{
              fontSize: line.length <= 6 ? 176 : 132,
              fontWeight: 900,
              color: formulaColor,
              lineHeight: 0.94,
              letterSpacing: -6,
              textShadow: `0 0 44px ${formulaColor}66`,
              fontFamily: "'SF Mono', monospace",
            }}
          >
            {line}
          </div>
        ))}
      </div>
      <div
        style={{
          marginTop: 26,
          width: 340,
          height: 3,
          borderRadius: 999,
          background: `linear-gradient(90deg, rgba(255,255,255,0), ${formulaColor}, rgba(255,255,255,0))`,
        }}
      />
      <div
        style={{
          marginTop: 22,
          fontSize: 28,
          color: 'rgba(237,245,255,0.78)',
          textAlign: 'center',
          lineHeight: 1.4,
          maxWidth: 820,
        }}
      >
        {content.formulaSubline}
      </div>
    </div>
  );
};

const ChartStage: React.FC<{relFrame: number; content: NormalizedTechAnalysisContent}> = ({
  relFrame,
  content,
}) => {
  const progress = clamp01((relFrame - content.template.beats.chartStart) / 72);
  const chartWidth = 944;
  const chartHeight = 620;
  const paddingX = 82;
  const paddingTop = 84;
  const paddingBottom = 96;
  const plotWidth = chartWidth - paddingX * 2;
  const plotHeight = chartHeight - paddingTop - paddingBottom;

  const buildPath = (points: {x: number; y: number}[]) => {
    return points
      .map((point, index) => {
        const px = paddingX + (point.x / 100) * plotWidth;
        const py = paddingTop + plotHeight - (point.y / 100) * plotHeight;
        return `${index === 0 ? 'M' : 'L'} ${px.toFixed(1)} ${py.toFixed(1)}`;
      })
      .join(' ');
  };

  const buildVisiblePath = (points: {x: number; y: number}[]) => {
    const visible = points.filter((point) => point.x / 100 <= progress);
    if (visible.length < 2) {
      return '';
    }

    return buildPath(visible);
  };

  return (
    <div
      style={{
        position: 'absolute',
        left: POSTER_WIDE_PADDING,
        right: POSTER_WIDE_PADDING,
        top: POSTER_CHART_TOP,
        opacity: interpolate(progress, [0, 0.2, 1], [0, 0.35, 1]),
        transform: `translateY(${interpolate(progress, [0, 1], [24, 0])}px)`,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          marginBottom: 24,
        }}
      >
        <div>
          <div
            style={{
              marginTop: 0,
              fontSize: 56,
              fontWeight: 800,
              color: '#f3f8ff',
              lineHeight: 1,
              letterSpacing: -1.8,
            }}
          >
            上下文越长，成本分叉越大
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            gap: 28,
            alignItems: 'center',
          }}
        >
          {(content.legend.length > 0 ? content.legend : content.template.series).slice(0, 2).map((item) => (
            <div
              key={item.label}
              style={{
                display: 'flex',
                gap: 10,
                alignItems: 'center',
                color: item.color,
                fontSize: 20,
                fontWeight: 700,
              }}
            >
              <span style={{fontSize: 24}}>●</span>
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div
        style={{
          position: 'relative',
          width: chartWidth,
          height: chartHeight,
        }}
      >
        <svg width={chartWidth} height={chartHeight}>
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = paddingTop + plotHeight * ratio;
            return (
              <line
                key={ratio}
                x1={paddingX}
                y1={y}
                x2={paddingX + plotWidth}
                y2={y}
                stroke="rgba(255,255,255,0.08)"
                strokeWidth={1}
              />
            );
          })}
          <line
            x1={paddingX}
            y1={paddingTop}
            x2={paddingX}
            y2={paddingTop + plotHeight}
            stroke="rgba(255,255,255,0.22)"
            strokeWidth={2}
          />
          <line
            x1={paddingX}
            y1={paddingTop + plotHeight}
            x2={paddingX + plotWidth}
            y2={paddingTop + plotHeight}
            stroke="rgba(255,255,255,0.22)"
            strokeWidth={2}
          />
          {content.template.series.map((series) => {
            const visiblePath = buildVisiblePath(series.points);
            if (!visiblePath) {
              return null;
            }

            return (
              <path
                key={series.label}
                d={visiblePath}
                fill="none"
                stroke={series.color}
                strokeWidth={8}
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{filter: `drop-shadow(0 0 18px ${series.color}66)`}}
              />
            );
          })}
        </svg>

        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 38,
            color: 'rgba(237,245,255,0.44)',
            fontSize: 16,
            letterSpacing: 1.5,
          }}
        >
          {content.yAxisLabel}
        </div>

        {content.metrics.slice(0, 3).map((metric, index) => {
          const itemProgress = clamp01((relFrame - (content.template.beats.chartStart + 28 + index * 20)) / 26);
          return (
            <div
              key={metric.label}
              style={{
                position: 'absolute',
                left: metric.x,
                top: metric.y,
                opacity: itemProgress,
                transform: `translateY(${interpolate(itemProgress, [0, 1], [18, 0])}px)`,
              }}
            >
              <div
                style={{
                  fontSize: 17,
                  color: 'rgba(237,245,255,0.46)',
                  letterSpacing: 0.4,
                }}
              >
                {metric.label}
              </div>
              <div
                style={{
                  marginTop: 4,
                  fontSize: 46,
                  fontWeight: 900,
                  color: metric.color,
                  lineHeight: 0.95,
                  textShadow: `0 0 18px ${metric.color}44`,
                  fontFamily: "'SF Mono', monospace",
                }}
              >
                {metric.value}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const ConclusionStage: React.FC<{relFrame: number; content: NormalizedTechAnalysisContent}> = ({
  relFrame,
  content,
}) => {
  const progress = clamp01((relFrame - content.template.beats.conclusionStart) / 30);
  const accent = content.template.series[1].color;

  return (
    <div
      style={{
        position: 'absolute',
        left: POSTER_SIDE_PADDING,
        right: POSTER_SIDE_PADDING,
        bottom: POSTER_CONCLUSION_BOTTOM,
        opacity: progress,
        transform: `translateY(${interpolate(progress, [0, 1], [22, 0])}px)`,
      }}
    >
      <div
        style={{
          width: 66,
          height: 2,
          borderRadius: 999,
          background: `linear-gradient(90deg, ${accent}, rgba(255,255,255,0))`,
        }}
      />
      <div
        style={{
          marginTop: 14,
          fontSize: 20,
          fontWeight: 600,
          color: accent,
          letterSpacing: 2,
        }}
      >
        {content.conclusionLabel}
      </div>
      <div
        style={{
          marginTop: 8,
          fontSize: 44,
          fontWeight: 800,
          color: '#f3f8ff',
          lineHeight: 1.12,
          letterSpacing: -1.3,
        }}
      >
        {content.conclusionLines.join('，')}
      </div>
      <div
        style={{
          marginTop: 14,
          fontSize: 20,
          color: 'rgba(177,255,214,0.82)',
          letterSpacing: 0.2,
        }}
      >
        {content.conclusionFootnote}
      </div>
    </div>
  );
};

export const TechAnalysisFamily: React.FC<TechAnalysisFamilyProps> = ({
  startFrame,
  durationFrames,
  bgColor,
  content,
}) => {
  const frame = useCurrentFrame();
  const relFrame = Math.max(0, frame);
  const beats = content.template.beats;
  const showProblems = relFrame < beats.formulaStart;
  const showFormula = relFrame >= beats.formulaStart && relFrame < beats.chartStart;
  const showChart = relFrame >= beats.chartStart;

  return (
    <AbsoluteFill style={{background: bgColor}}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(circle at 68% 28%, rgba(0,212,255,0.12), transparent 34%)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(circle at 18% 78%, rgba(255,68,68,0.08), transparent 28%)',
        }}
      />

      <TopSignal label={content.topLabel} />

      {showProblems ? <ProblemStage relFrame={relFrame} content={content} /> : null}
      {showFormula ? <FormulaStage relFrame={relFrame} content={content} /> : null}
      {showChart ? (
        <>
          <ChartStage relFrame={relFrame} content={content} />
          <ConclusionStage relFrame={relFrame} content={content} />
        </>
      ) : null}
    </AbsoluteFill>
  );
};

export default TechAnalysisFamily;
