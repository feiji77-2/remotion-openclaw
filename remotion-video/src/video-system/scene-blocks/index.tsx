import React from "react";
import type {VideoProductAsset, VideoProductSceneSpec, VideoProductSpec, VideoProductTone} from "../productSchema";
import {AccentShape, Frame, Grid, MaskReveal, MediaLayer, MotionContainer, SafeArea, Stack, TextLayer, type VideoSystemPalette} from "../primitives";

const paletteForTone = (
  tone: VideoProductTone,
  accent: string,
  secondary: string,
): VideoSystemPalette => {
  if (tone === "editorial") {
    return {background: "#101010", surface: "#f4f0e7", surfaceStrong: "#ffffff", text: "#fffaf0", muted: "rgba(255,250,240,0.72)", accent, secondary};
  }
  if (tone === "commercial") {
    return {background: "#07090f", surface: "#111722", surfaceStrong: "#1b2431", text: "#ffffff", muted: "rgba(255,255,255,0.68)", accent, secondary};
  }
  if (tone === "documentary") {
    return {background: "#0b0d0c", surface: "#171a18", surfaceStrong: "#22251f", text: "#f4f1e8", muted: "rgba(244,241,232,0.66)", accent, secondary};
  }
  if (tone === "restrained") {
    return {background: "#080a0b", surface: "#111416", surfaceStrong: "#191d20", text: "#f5f7f8", muted: "rgba(245,247,248,0.64)", accent, secondary};
  }
  return {background: "#05070d", surface: "#0b1220", surfaceStrong: "#111b2d", text: "#f8fbff", muted: "rgba(248,251,255,0.66)", accent, secondary};
};

const assetForScene = (
  scene: VideoProductSceneSpec,
  assets: Record<string, VideoProductAsset>,
) => {
  const ref = scene.assetRefs.find((item) => item.role === "hero" || item.role === "proof") ?? scene.assetRefs[0];
  return ref ? assets[ref.assetId] : undefined;
};

const sceneEyebrow = (scene: VideoProductSceneSpec) =>
  scene.intent.replace("-", " ").toUpperCase();

const EvidenceList: React.FC<{
  scene: VideoProductSceneSpec;
  palette: VideoSystemPalette;
}> = ({scene, palette}) => {
  const items = scene.emphasis.length
    ? scene.emphasis.map((item) => item.text)
    : scene.message.keywords;
  if (!items.length) return null;
  return (
    <Stack gap={16}>
      {items.slice(0, 4).map((item, index) => (
        <div key={`${item}-${index}`} style={{display: "grid", gridTemplateColumns: "62px 1fr", alignItems: "center", minHeight: 58}}>
          <div style={{fontSize: 18, fontWeight: 950, color: palette.accent}}>
            {String(index + 1).padStart(2, "0")}
          </div>
          <div style={{fontSize: 30, lineHeight: 1.08, fontWeight: 900, color: palette.text}}>
            {item}
          </div>
        </div>
      ))}
    </Stack>
  );
};

const HookScene: React.FC<SceneBlockProps> = ({scene, spec, frame, durationFrames}) => {
  const palette = paletteForTone(spec.visual.tone, spec.visual.accent, spec.visual.secondaryAccent);
  return (
    <Frame palette={palette}>
      <AccentShape palette={palette} variant="halo" style={{right: -160, top: 140}} />
      <AccentShape palette={palette} style={{left: 74, right: 340, top: 156}} />
      <SafeArea mode={scene.layout.safeArea} style={{display: "grid", alignItems: "center"}}>
        <MotionContainer presetIds={scene.motion.presetIds} frame={frame} durationFrames={durationFrames}>
          <TextLayer
            eyebrow={sceneEyebrow(scene)}
            title={scene.message.primary}
            body={scene.message.secondary}
            keywords={scene.message.keywords}
            palette={palette}
            scale="hero"
          />
        </MotionContainer>
      </SafeArea>
    </Frame>
  );
};

const StatementScene: React.FC<SceneBlockProps> = ({scene, spec, frame, durationFrames}) => {
  const palette = paletteForTone(spec.visual.tone, spec.visual.accent, spec.visual.secondaryAccent);
  return (
    <Frame palette={palette}>
      <SafeArea mode={scene.layout.safeArea} style={{display: "grid", alignItems: "center"}}>
        <Grid columns="1fr 0.7fr" gap={42} style={{alignItems: "center"}}>
          <MotionContainer presetIds={scene.motion.presetIds} frame={frame} durationFrames={durationFrames}>
            <TextLayer eyebrow={sceneEyebrow(scene)} title={scene.message.primary} body={scene.message.secondary} keywords={scene.message.keywords} palette={palette} />
          </MotionContainer>
          <EvidenceList scene={scene} palette={palette} />
        </Grid>
      </SafeArea>
    </Frame>
  );
};

const EvidenceScene: React.FC<SceneBlockProps> = ({scene, spec, frame, durationFrames}) => {
  const palette = paletteForTone(spec.visual.tone, spec.visual.accent, spec.visual.secondaryAccent);
  const asset = assetForScene(scene, spec.assets);
  return (
    <Frame palette={palette}>
      <SafeArea mode={scene.layout.safeArea} style={{display: "grid", alignItems: "center"}}>
        <Grid columns="0.86fr 1fr" gap={36} style={{alignItems: "center"}}>
          <MotionContainer presetIds={scene.motion.presetIds} frame={frame} durationFrames={durationFrames}>
            <MediaLayer src={asset?.src} alt={asset?.alt} label={scene.message.keywords[0] ?? scene.medium} palette={palette} inspect={scene.medium === "screenshot"} />
          </MotionContainer>
          <Stack gap={28}>
            <TextLayer eyebrow={sceneEyebrow(scene)} title={scene.message.primary} body={scene.message.secondary} palette={palette} scale="body" />
            <EvidenceList scene={scene} palette={palette} />
          </Stack>
        </Grid>
      </SafeArea>
    </Frame>
  );
};

const ContrastScene: React.FC<SceneBlockProps> = ({scene, spec, frame, durationFrames}) => {
  const palette = paletteForTone(spec.visual.tone, spec.visual.accent, spec.visual.secondaryAccent);
  const left = scene.emphasis[0]?.text ?? scene.message.keywords[0] ?? "Before";
  const right = scene.emphasis[1]?.text ?? scene.message.keywords[1] ?? "After";
  return (
    <Frame palette={palette}>
      <SafeArea mode={scene.layout.safeArea} style={{display: "grid", alignItems: "center"}}>
        <Stack gap={42}>
          <TextLayer eyebrow={sceneEyebrow(scene)} title={scene.message.primary} body={scene.message.secondary} palette={palette} align="center" />
          <MotionContainer presetIds={scene.motion.presetIds} frame={frame} durationFrames={durationFrames}>
            <Grid columns="1fr 84px 1fr" gap={22} style={{alignItems: "center"}}>
              <div style={{minHeight: 220, padding: 34, borderLeft: `5px solid ${palette.secondary}`, background: palette.surface, fontSize: 34, lineHeight: 1.08, fontWeight: 900}}>{left}</div>
              <div style={{textAlign: "center", color: palette.muted, fontWeight: 950}}>VS</div>
              <div style={{minHeight: 220, padding: 34, borderRight: `5px solid ${palette.accent}`, background: palette.surfaceStrong, fontSize: 34, lineHeight: 1.08, fontWeight: 900}}>{right}</div>
            </Grid>
          </MotionContainer>
        </Stack>
      </SafeArea>
    </Frame>
  );
};

const ProcessScene: React.FC<SceneBlockProps> = ({scene, spec, frame, durationFrames}) => {
  const palette = paletteForTone(spec.visual.tone, spec.visual.accent, spec.visual.secondaryAccent);
  const steps = scene.message.keywords.length ? scene.message.keywords : scene.emphasis.map((item) => item.text);
  return (
    <Frame palette={palette}>
      <SafeArea mode={scene.layout.safeArea} style={{display: "grid", alignItems: "center"}}>
        <Grid columns="0.7fr 1fr" gap={52} style={{alignItems: "center"}}>
          <TextLayer eyebrow={sceneEyebrow(scene)} title={scene.message.primary} body={scene.message.secondary} palette={palette} scale="body" />
          <MotionContainer presetIds={scene.motion.presetIds} frame={frame} durationFrames={durationFrames}>
            <Stack gap={22}>
              {steps.slice(0, 5).map((step, index) => (
                <div key={step} style={{display: "grid", gridTemplateColumns: "70px 1fr", gap: 18, alignItems: "center"}}>
                  <div style={{height: 70, display: "grid", placeItems: "center", color: palette.background, background: index === 0 ? palette.accent : palette.text, fontWeight: 950}}>
                    {index + 1}
                  </div>
                  <div style={{fontSize: 30, fontWeight: 900, color: palette.text, borderBottom: `1px solid ${palette.text}22`, paddingBottom: 18}}>{step}</div>
                </div>
              ))}
            </Stack>
          </MotionContainer>
        </Grid>
      </SafeArea>
    </Frame>
  );
};

const ProductRevealScene: React.FC<SceneBlockProps> = ({scene, spec, frame, durationFrames}) => {
  const palette = paletteForTone(spec.visual.tone, spec.visual.accent, spec.visual.secondaryAccent);
  const asset = assetForScene(scene, spec.assets);
  return (
    <Frame palette={palette}>
      <SafeArea mode="full-bleed">
        <MotionContainer presetIds={scene.motion.presetIds} frame={frame} durationFrames={durationFrames} style={{height: "100%"}}>
          <MediaLayer src={asset?.src} alt={asset?.alt} label={scene.message.primary} palette={palette} inspect={scene.medium === "product"} />
        </MotionContainer>
        <div style={{position: "absolute", left: 74, right: 74, bottom: 112}}>
          <TextLayer eyebrow={sceneEyebrow(scene)} title={scene.message.primary} body={scene.message.secondary} keywords={scene.message.keywords} palette={palette} />
        </div>
      </SafeArea>
    </Frame>
  );
};

const QuoteScene: React.FC<SceneBlockProps> = ({scene, spec, frame, durationFrames}) => {
  const palette = paletteForTone(spec.visual.tone, spec.visual.accent, spec.visual.secondaryAccent);
  return (
    <Frame palette={palette}>
      <SafeArea mode={scene.layout.safeArea} style={{display: "grid", placeItems: "center"}}>
        <MaskReveal progress={Math.min(1, frame / Math.max(1, durationFrames * 0.45))} direction="left-to-right">
          <div style={{fontSize: 62, lineHeight: 1.04, fontWeight: 920, maxWidth: 860, textAlign: "center"}}>
            {scene.message.primary}
          </div>
        </MaskReveal>
        {scene.message.secondary ? <div style={{marginTop: 34, fontSize: 24, color: palette.muted, fontWeight: 800}}>{scene.message.secondary}</div> : null}
      </SafeArea>
    </Frame>
  );
};

const SummaryScene: React.FC<SceneBlockProps> = ({scene, spec, frame, durationFrames}) => {
  const palette = paletteForTone(spec.visual.tone, spec.visual.accent, spec.visual.secondaryAccent);
  return (
    <Frame palette={palette}>
      <SafeArea mode={scene.layout.safeArea} style={{display: "grid", alignItems: "center"}}>
        <MotionContainer presetIds={scene.motion.presetIds} frame={frame} durationFrames={durationFrames}>
          <Stack gap={34} align="center" style={{textAlign: "center"}}>
            <TextLayer eyebrow={sceneEyebrow(scene)} title={scene.message.primary} body={scene.message.secondary} keywords={scene.message.keywords} palette={palette} align="center" scale="hero" />
            <AccentShape palette={palette} style={{position: "relative", width: 520}} />
          </Stack>
        </MotionContainer>
      </SafeArea>
    </Frame>
  );
};

export type SceneBlockProps = {
  scene: VideoProductSceneSpec;
  spec: VideoProductSpec;
  frame: number;
  durationFrames: number;
};

export const SceneBlock: React.FC<SceneBlockProps> = (props) => {
  if (props.scene.block === "HookScene") return <HookScene {...props} />;
  if (props.scene.block === "EvidenceScene") return <EvidenceScene {...props} />;
  if (props.scene.block === "ContrastScene") return <ContrastScene {...props} />;
  if (props.scene.block === "ProcessScene") return <ProcessScene {...props} />;
  if (props.scene.block === "ProductRevealScene") return <ProductRevealScene {...props} />;
  if (props.scene.block === "QuoteScene") return <QuoteScene {...props} />;
  if (props.scene.block === "SummaryScene") return <SummaryScene {...props} />;
  return <StatementScene {...props} />;
};
