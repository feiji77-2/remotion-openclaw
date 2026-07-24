import React from "react";
import {AbsoluteFill, Easing, Img, interpolate, staticFile} from "remotion";
import type {VideoProductMotionPresetId} from "../motion/presets";

const clamp = {extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const};

export const VIDEO_SYSTEM_FONT =
  "\"PingFang SC\", \"Microsoft YaHei\", \"Noto Sans CJK SC\", Inter, system-ui, sans-serif";

export type VideoSystemPalette = {
  background: string;
  surface: string;
  surfaceStrong: string;
  text: string;
  muted: string;
  accent: string;
  secondary: string;
};

export const Frame: React.FC<{
  palette: VideoSystemPalette;
  children: React.ReactNode;
}> = ({palette, children}) => (
  <AbsoluteFill style={{background: palette.background, color: palette.text, fontFamily: VIDEO_SYSTEM_FONT, overflow: "hidden"}}>
    <DepthLayer palette={palette} />
    {children}
  </AbsoluteFill>
);

export const SafeArea: React.FC<{
  mode?: "standard" | "caption-heavy" | "full-bleed";
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({mode = "standard", children, style}) => {
  const inset = mode === "full-bleed" ? 0 : mode === "caption-heavy" ? 92 : 74;
  return <div style={{position: "absolute", inset, ...style}}>{children}</div>;
};

export const Stack: React.FC<{
  gap?: number;
  align?: React.CSSProperties["alignItems"];
  justify?: React.CSSProperties["justifyContent"];
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({gap = 20, align = "stretch", justify = "flex-start", children, style}) => (
  <div style={{display: "flex", flexDirection: "column", gap, alignItems: align, justifyContent: justify, ...style}}>
    {children}
  </div>
);

export const Grid: React.FC<{
  columns: string;
  gap?: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({columns, gap = 24, children, style}) => (
  <div style={{display: "grid", gridTemplateColumns: columns, gap, ...style}}>{children}</div>
);

export const TextLayer: React.FC<{
  eyebrow?: string;
  title: string;
  body?: string;
  keywords?: readonly string[];
  palette: VideoSystemPalette;
  align?: React.CSSProperties["textAlign"];
  scale?: "hero" | "display" | "body";
}> = ({eyebrow, title, body, keywords = [], palette, align = "left", scale = "display"}) => {
  const titleSize = scale === "hero" ? 82 : scale === "display" ? 58 : 40;
  return (
    <Stack gap={scale === "body" ? 16 : 24} style={{textAlign: align}}>
      {eyebrow ? (
        <div style={{fontSize: 18, lineHeight: 1, fontWeight: 900, color: palette.accent, textTransform: "uppercase"}}>
          {eyebrow}
        </div>
      ) : null}
      <div style={{fontSize: titleSize, lineHeight: 0.98, fontWeight: 950, letterSpacing: 0, maxWidth: 880}}>
        {title}
      </div>
      {body ? (
        <div style={{fontSize: scale === "body" ? 24 : 29, lineHeight: 1.35, fontWeight: 720, color: palette.muted, maxWidth: 820}}>
          {body}
        </div>
      ) : null}
      {keywords.length ? (
        <div style={{display: "flex", flexWrap: "wrap", gap: 12}}>
          {keywords.slice(0, 6).map((keyword) => (
            <span key={keyword} style={{fontSize: 18, color: palette.text, borderBottom: `2px solid ${palette.accent}`, paddingBottom: 6}}>
              {keyword}
            </span>
          ))}
        </div>
      ) : null}
    </Stack>
  );
};

export const MediaLayer: React.FC<{
  src?: string;
  alt?: string;
  palette: VideoSystemPalette;
  label?: string;
  inspect?: boolean;
}> = ({src, alt, palette, label, inspect = false}) => (
  <div style={{
    position: "relative",
    minHeight: 420,
    border: `1px solid ${palette.accent}55`,
    background: `linear-gradient(135deg, ${palette.surfaceStrong}, ${palette.surface})`,
    boxShadow: `0 32px 90px ${palette.accent}18`,
    overflow: "hidden",
  }}>
    {src ? (
      <Img src={src.startsWith("http") ? src : staticFile(src)} alt={alt} style={{position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover"}} />
    ) : null}
    <div style={{position: "absolute", inset: 0, background: `linear-gradient(180deg, transparent, ${palette.background}88)`}} />
    {inspect ? <div style={{position: "absolute", left: "18%", right: "16%", top: "28%", height: 3, background: palette.accent, boxShadow: `0 0 22px ${palette.accent}`}} /> : null}
    <div style={{position: "absolute", left: 24, right: 24, bottom: 24, color: palette.text, fontSize: 22, fontWeight: 900}}>
      {label ?? alt ?? "Visual Evidence"}
    </div>
  </div>
);

export const AccentShape: React.FC<{
  palette: VideoSystemPalette;
  variant?: "rule" | "corner" | "halo";
  style?: React.CSSProperties;
}> = ({palette, variant = "rule", style}) => {
  if (variant === "halo") {
    return <div style={{position: "absolute", width: 440, height: 440, borderRadius: "50%", background: palette.accent, opacity: 0.12, filter: "blur(90px)", ...style}} />;
  }
  if (variant === "corner") {
    return <div style={{position: "absolute", width: 90, height: 90, borderTop: `4px solid ${palette.accent}`, borderLeft: `4px solid ${palette.accent}`, ...style}} />;
  }
  return <div style={{position: "absolute", height: 3, background: `linear-gradient(90deg, ${palette.accent}, transparent)`, ...style}} />;
};

export const DepthLayer: React.FC<{palette: VideoSystemPalette}> = ({palette}) => (
  <AbsoluteFill style={{pointerEvents: "none"}}>
    <div style={{position: "absolute", inset: 0, background: `radial-gradient(circle at 72% 18%, ${palette.secondary}22, transparent 34%), radial-gradient(circle at 20% 86%, ${palette.accent}20, transparent 38%)`}} />
    <div style={{position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(255,255,255,0.035), transparent 34%, rgba(0,0,0,0.34))"}} />
    <div style={{position: "absolute", inset: 0, opacity: 0.18, backgroundImage: `linear-gradient(${palette.text}12 1px, transparent 1px), linear-gradient(90deg, ${palette.text}12 1px, transparent 1px)`, backgroundSize: "54px 54px"}} />
  </AbsoluteFill>
);

export const MaskReveal: React.FC<{
  progress: number;
  children: React.ReactNode;
  direction?: "left-to-right" | "right-to-left" | "bottom-up";
}> = ({progress, children, direction = "left-to-right"}) => {
  const p = Math.round(Math.max(0, Math.min(1, progress)) * 1000) / 10;
  const clipPath = direction === "right-to-left"
    ? `inset(0 0 0 ${100 - p}%)`
    : direction === "bottom-up"
      ? `inset(${100 - p}% 0 0 0)`
      : `inset(0 ${100 - p}% 0 0)`;
  return <div style={{clipPath}}>{children}</div>;
};

export const MotionContainer: React.FC<{
  presetIds: readonly VideoProductMotionPresetId[];
  frame: number;
  durationFrames: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({presetIds, frame, durationFrames, children, style}) => {
  const presetSet = new Set(presetIds);
  const progress = interpolate(frame, [0, Math.max(1, durationFrames)], [0, 1], {
    ...clamp,
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  const hasPush = presetSet.has("pushIn");
  const hasPull = presetSet.has("pullBack");
  const hasSnap = presetSet.has("snap");
  const hasDrift = presetSet.has("parallaxDrift");
  const hasPanelShift = presetSet.has("panelShift");
  const hasCameraMove = presetSet.has("cameraMove");
  const hasAssetStack = presetSet.has("assetStack");
  const hasDepthShift = presetSet.has("depthShift");
  const hasMaskReveal = presetSet.has("maskReveal");
  const hasClipReveal = presetSet.has("clipReveal");
  const hasDirectionalWipe = presetSet.has("directionalWipe");
  const hasLineWipe = presetSet.has("lineWipe");
  const hasFocusLock = presetSet.has("focusLock") || presetSet.has("screenshotInspect");
  const hasHighlightSweep = presetSet.has("highlightSweep");
  const scale = hasPush
    ? interpolate(progress, [0, 1], [0.965, 1.035], clamp)
    : hasPull
      ? interpolate(progress, [0, 1], [1.06, 0.985], clamp)
      : hasSnap
        ? interpolate(progress, [0, 0.28, 1], [0.92, 1.05, 1], clamp)
        : hasCameraMove
          ? interpolate(progress, [0, 1], [1.045, 1], clamp)
        : 1;
  const translateX = hasDrift
    ? interpolate(progress, [0, 1], [-18, 12], clamp)
    : hasPanelShift
      ? interpolate(progress, [0, 1], [92, 0], clamp)
      : hasCameraMove
        ? interpolate(progress, [0, 1], [-64, 0], clamp)
        : 0;
  const translateY = hasCameraMove
    ? interpolate(progress, [0, 1], [42, 0], clamp)
    : interpolate(progress, [0, 1], [hasDrift ? 18 : 28, 0], clamp);
  const rotate = hasAssetStack ? interpolate(progress, [0, 1], [-3.5, 0], clamp) : 0;
  const opacity = interpolate(progress, [0, 0.82, 1], [0, 1, 1], clamp);
  const revealPercent = Math.round(interpolate(progress, [0, 1], [0, 100], clamp) * 10) / 10;
  const clipPath = hasMaskReveal
    ? `inset(0 ${100 - revealPercent}% 0 0)`
    : hasClipReveal
      ? `inset(${interpolate(progress, [0, 1], [14, 0], clamp)}% ${interpolate(progress, [0, 1], [12, 0], clamp)}%)`
      : undefined;
  const filter = hasDepthShift
    ? `drop-shadow(0 ${Math.round(20 + progress * 22)}px ${Math.round(34 + progress * 34)}px rgba(0,0,0,.36))`
    : undefined;
  return (
    <div
      data-motion-presets={presetIds.join(" ")}
      style={{
        position: "relative",
        opacity,
        transform: `translate3d(${translateX}px, ${translateY}px, 0) scale(${scale}) rotate(${rotate}deg)`,
        transformOrigin: "50% 50%",
        clipPath,
        filter,
        overflow: clipPath ? "hidden" : style?.overflow,
        ...style,
      }}
    >
      {children}
      {hasDirectionalWipe ? (
        <div
          data-motion-overlay="directionalWipe"
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            background: `linear-gradient(90deg, transparent, rgba(255,255,255,.2), transparent)`,
            transform: `translateX(${interpolate(progress, [0, 1], [-120, 120], clamp)}%)`,
            opacity: 0.28,
          }}
        />
      ) : null}
      {hasLineWipe ? (
        <div
          data-motion-overlay="lineWipe"
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: 3,
            background: "currentColor",
            transformOrigin: "left",
            transform: `scaleX(${progress})`,
            opacity: 0.82,
          }}
        />
      ) : null}
      {hasHighlightSweep ? (
        <div
          data-motion-overlay="highlightSweep"
          style={{
            position: "absolute",
            top: "18%",
            bottom: "18%",
            width: "34%",
            left: `${interpolate(progress, [0, 1], [-42, 108], clamp)}%`,
            pointerEvents: "none",
            background: "linear-gradient(90deg, transparent, rgba(255,255,255,.18), transparent)",
            mixBlendMode: "screen",
          }}
        />
      ) : null}
      {hasFocusLock ? (
        <div data-motion-overlay="focusLock" style={{position: "absolute", inset: -10, pointerEvents: "none", opacity: progress}}>
          {[[0, 0], [1, 0], [0, 1], [1, 1]].map(([x, y], index) => (
            <div
              key={index}
              style={{
                position: "absolute",
                left: x ? "auto" : 0,
                right: x ? 0 : "auto",
                top: y ? "auto" : 0,
                bottom: y ? 0 : "auto",
                width: 28,
                height: 28,
                borderTop: y ? undefined : "3px solid currentColor",
                borderBottom: y ? "3px solid currentColor" : undefined,
                borderLeft: x ? undefined : "3px solid currentColor",
                borderRight: x ? "3px solid currentColor" : undefined,
              }}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
};
