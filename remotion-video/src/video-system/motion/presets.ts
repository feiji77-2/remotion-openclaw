export const VIDEO_PRODUCT_MOTION_PRESET_IDS = [
  "maskReveal",
  "clipReveal",
  "lineWipe",
  "typeReveal",
  "pushIn",
  "pullBack",
  "parallaxDrift",
  "depthShift",
  "pulse",
  "snap",
  "focusLock",
  "highlightSweep",
  "matchCut",
  "directionalWipe",
  "panelShift",
  "cameraMove",
  "kineticCaption",
  "staggeredWords",
  "numberCount",
  "quoteBuild",
  "imageScan",
  "screenshotInspect",
  "productOrbit",
  "assetStack",
] as const;

export type VideoProductMotionPresetId = typeof VIDEO_PRODUCT_MOTION_PRESET_IDS[number];

export type MotionPresetFamily =
  | "reveal"
  | "spatial"
  | "emphasis"
  | "transition"
  | "text"
  | "media";

export type MotionPresetParameter =
  | {
      type: "number";
      default: number;
      min?: number;
      max?: number;
      unit?: "frames" | "px" | "percent" | "deg" | "scale";
    }
  | {
      type: "string";
      default: string;
    }
  | {
      type: "boolean";
      default: boolean;
    }
  | {
      type: "enum";
      default: string;
      values: readonly string[];
    };

export type MotionPresetDefinition = {
  id: VideoProductMotionPresetId;
  family: MotionPresetFamily;
  use: string;
  params: Record<string, MotionPresetParameter>;
  durationFrames: number;
  easing: "linear" | "easeOutQuart" | "easeInOutCubic" | "easeInOutSine" | "backOut" | "spring";
  composeWith: readonly VideoProductMotionPresetId[];
  avoidWhen: string;
};

export const VIDEO_PRODUCT_MOTION_PRESETS: Record<
  VideoProductMotionPresetId,
  MotionPresetDefinition
> = {
  maskReveal: {
    id: "maskReveal",
    family: "reveal",
    use: "Reveal a hero claim or media surface through a motivated matte instead of a generic opacity fade.",
    params: {
      direction: {type: "enum", default: "left-to-right", values: ["left-to-right", "right-to-left", "bottom-up"]},
      featherPx: {type: "number", default: 18, min: 0, max: 80, unit: "px"},
    },
    durationFrames: 28,
    easing: "easeOutQuart",
    composeWith: ["kineticCaption", "pushIn", "highlightSweep"],
    avoidWhen: "Avoid on tiny chips or repeated list items; the mask should reveal a meaningful surface.",
  },
  clipReveal: {
    id: "clipReveal",
    family: "reveal",
    use: "Expose dense information in a bounded frame while preserving spatial continuity.",
    params: {
      insetPercent: {type: "number", default: 18, min: 0, max: 70, unit: "percent"},
      origin: {type: "enum", default: "center", values: ["center", "top", "bottom", "left", "right"]},
    },
    durationFrames: 24,
    easing: "easeOutQuart",
    composeWith: ["screenshotInspect", "depthShift"],
    avoidWhen: "Avoid on scenes whose main point is already established by a full-bleed media reveal.",
  },
  lineWipe: {
    id: "lineWipe",
    family: "reveal",
    use: "Draw attention to a transition, claim boundary, or comparison split with a directional line.",
    params: {
      strokePx: {type: "number", default: 3, min: 1, max: 12, unit: "px"},
      direction: {type: "enum", default: "horizontal", values: ["horizontal", "vertical", "diagonal"]},
    },
    durationFrames: 20,
    easing: "easeInOutCubic",
    composeWith: ["directionalWipe", "focusLock"],
    avoidWhen: "Avoid when the scene has no clear boundary or direction of travel.",
  },
  typeReveal: {
    id: "typeReveal",
    family: "reveal",
    use: "Build short technical terms or quotes as text input, not as generic subtitle motion.",
    params: {
      charactersPerBeat: {type: "number", default: 4, min: 1, max: 12},
      cursor: {type: "boolean", default: true},
    },
    durationFrames: 34,
    easing: "linear",
    composeWith: ["quoteBuild", "focusLock"],
    avoidWhen: "Avoid for long spoken paragraphs; use staggeredWords for sentence rhythm.",
  },
  pushIn: {
    id: "pushIn",
    family: "spatial",
    use: "Move the camera toward the current proof or product surface as confidence increases.",
    params: {
      scaleFrom: {type: "number", default: 0.965, min: 0.9, max: 1, unit: "scale"},
      scaleTo: {type: "number", default: 1.035, min: 1, max: 1.12, unit: "scale"},
    },
    durationFrames: 64,
    easing: "easeInOutCubic",
    composeWith: ["maskReveal", "screenshotInspect", "kineticCaption"],
    avoidWhen: "Avoid if another spatial preset is already controlling the same layer.",
  },
  pullBack: {
    id: "pullBack",
    family: "spatial",
    use: "Reveal system context after a close inspection or dense detail.",
    params: {
      scaleFrom: {type: "number", default: 1.06, min: 1, max: 1.18, unit: "scale"},
      scaleTo: {type: "number", default: 0.985, min: 0.92, max: 1, unit: "scale"},
    },
    durationFrames: 72,
    easing: "easeInOutCubic",
    composeWith: ["assetStack", "quoteBuild"],
    avoidWhen: "Avoid in hook scenes where the first frame needs immediate clarity.",
  },
  parallaxDrift: {
    id: "parallaxDrift",
    family: "spatial",
    use: "Create subtle depth between background, media, and text layers during quiet exposition.",
    params: {
      xPx: {type: "number", default: 18, min: -80, max: 80, unit: "px"},
      yPx: {type: "number", default: -10, min: -80, max: 80, unit: "px"},
    },
    durationFrames: 90,
    easing: "easeInOutSine",
    composeWith: ["staggeredWords", "imageScan"],
    avoidWhen: "Avoid in punchy montage sections where drift will feel like lag.",
  },
  depthShift: {
    id: "depthShift",
    family: "spatial",
    use: "Shift focus from background context to foreground proof with z-depth and shadow change.",
    params: {
      depthPx: {type: "number", default: 36, min: 0, max: 120, unit: "px"},
      blurPx: {type: "number", default: 2, min: 0, max: 12, unit: "px"},
    },
    durationFrames: 46,
    easing: "easeOutQuart",
    composeWith: ["clipReveal", "focusLock"],
    avoidWhen: "Avoid if the scene has only a single flat text layer.",
  },
  pulse: {
    id: "pulse",
    family: "emphasis",
    use: "Give one numeric or status element a restrained heartbeat at the moment it becomes important.",
    params: {
      scale: {type: "number", default: 1.035, min: 1, max: 1.12, unit: "scale"},
      repeats: {type: "number", default: 1, min: 1, max: 3},
    },
    durationFrames: 18,
    easing: "easeInOutSine",
    composeWith: ["numberCount", "highlightSweep"],
    avoidWhen: "Avoid on every bullet; overuse makes the system feel like a social template.",
  },
  snap: {
    id: "snap",
    family: "emphasis",
    use: "Land a short conclusion or contrast with a physical overshoot.",
    params: {
      overshoot: {type: "number", default: 0.08, min: 0, max: 0.2, unit: "scale"},
      settleFrames: {type: "number", default: 10, min: 4, max: 24, unit: "frames"},
    },
    durationFrames: 16,
    easing: "backOut",
    composeWith: ["kineticCaption", "lineWipe"],
    avoidWhen: "Avoid for sensitive documentary tone or quiet explanatory pacing.",
  },
  focusLock: {
    id: "focusLock",
    family: "emphasis",
    use: "Attach focus brackets to a real target such as a screenshot region, product detail, or claim.",
    params: {
      paddingPx: {type: "number", default: 12, min: 0, max: 40, unit: "px"},
      cornerPx: {type: "number", default: 26, min: 8, max: 80, unit: "px"},
    },
    durationFrames: 22,
    easing: "easeOutQuart",
    composeWith: ["screenshotInspect", "depthShift", "typeReveal"],
    avoidWhen: "Avoid when the target is not a concrete visual entity.",
  },
  highlightSweep: {
    id: "highlightSweep",
    family: "emphasis",
    use: "Sweep a narrow highlight across a phrase, metric, or CTA to mark final emphasis.",
    params: {
      widthPercent: {type: "number", default: 34, min: 10, max: 80, unit: "percent"},
      opacity: {type: "number", default: 0.48, min: 0.1, max: 0.9},
    },
    durationFrames: 26,
    easing: "easeInOutCubic",
    composeWith: ["maskReveal", "pulse", "staggeredWords"],
    avoidWhen: "Avoid on low-contrast backgrounds where it reduces readability.",
  },
  matchCut: {
    id: "matchCut",
    family: "transition",
    use: "Cut between scenes by matching the outgoing focal shape to the incoming focal shape.",
    params: {
      overlapFrames: {type: "number", default: 8, min: 0, max: 20, unit: "frames"},
      matchTarget: {type: "enum", default: "center", values: ["center", "edge", "media", "text"]},
    },
    durationFrames: 18,
    easing: "easeInOutCubic",
    composeWith: ["pushIn", "clipReveal"],
    avoidWhen: "Avoid when consecutive scenes have unrelated focal geometry.",
  },
  directionalWipe: {
    id: "directionalWipe",
    family: "transition",
    use: "Carry the previous scene's motion direction into the next scene.",
    params: {
      direction: {type: "enum", default: "up", values: ["up", "down", "left", "right"]},
      bandPercent: {type: "number", default: 22, min: 8, max: 60, unit: "percent"},
    },
    durationFrames: 24,
    easing: "easeInOutCubic",
    composeWith: ["lineWipe", "panelShift"],
    avoidWhen: "Avoid when the next scene starts with a static quote or quiet documentary moment.",
  },
  panelShift: {
    id: "panelShift",
    family: "transition",
    use: "Shift structured layout regions without resetting the whole stage.",
    params: {
      distancePx: {type: "number", default: 120, min: 24, max: 360, unit: "px"},
      axis: {type: "enum", default: "x", values: ["x", "y"]},
    },
    durationFrames: 30,
    easing: "easeOutQuart",
    composeWith: ["directionalWipe", "assetStack"],
    avoidWhen: "Avoid if the layout does not preserve at least one continuing panel.",
  },
  cameraMove: {
    id: "cameraMove",
    family: "transition",
    use: "Connect two scenes by moving the virtual camera rather than swapping cards.",
    params: {
      xPx: {type: "number", default: 90, min: -240, max: 240, unit: "px"},
      yPx: {type: "number", default: -70, min: -240, max: 240, unit: "px"},
      zoom: {type: "number", default: 1.04, min: 0.95, max: 1.16, unit: "scale"},
    },
    durationFrames: 40,
    easing: "easeInOutCubic",
    composeWith: ["parallaxDrift", "depthShift"],
    avoidWhen: "Avoid when scene copy changes too abruptly for spatial continuity.",
  },
  kineticCaption: {
    id: "kineticCaption",
    family: "text",
    use: "Treat the main caption as designed typography with line, scale, and emphasis choreography.",
    params: {
      maxLines: {type: "number", default: 3, min: 1, max: 5},
      emphasisScale: {type: "number", default: 1.08, min: 1, max: 1.2, unit: "scale"},
    },
    durationFrames: 32,
    easing: "easeOutQuart",
    composeWith: ["maskReveal", "snap", "highlightSweep"],
    avoidWhen: "Avoid for secondary captions or body copy where hierarchy should stay quiet.",
  },
  staggeredWords: {
    id: "staggeredWords",
    family: "text",
    use: "Introduce a phrase by word groups so the viewer reads in the same order as the narration.",
    params: {
      stepFrames: {type: "number", default: 3, min: 1, max: 8, unit: "frames"},
      maxWords: {type: "number", default: 16, min: 4, max: 28},
    },
    durationFrames: 38,
    easing: "easeOutQuart",
    composeWith: ["parallaxDrift", "highlightSweep"],
    avoidWhen: "Avoid for numbers, code, or product UI labels that should lock immediately.",
  },
  numberCount: {
    id: "numberCount",
    family: "text",
    use: "Animate a measured value as proof, not as decoration.",
    params: {
      from: {type: "number", default: 0},
      suffix: {type: "string", default: "%"},
    },
    durationFrames: 36,
    easing: "easeOutQuart",
    composeWith: ["pulse", "focusLock"],
    avoidWhen: "Avoid if the number is not a real metric or claim evidence.",
  },
  quoteBuild: {
    id: "quoteBuild",
    family: "text",
    use: "Build a quote or founder line with measured pauses and a final attribution lockup.",
    params: {
      lineDelayFrames: {type: "number", default: 8, min: 0, max: 24, unit: "frames"},
      attribution: {type: "boolean", default: true},
    },
    durationFrames: 52,
    easing: "easeInOutCubic",
    composeWith: ["typeReveal", "pullBack"],
    avoidWhen: "Avoid for generic marketing slogans without a source or speaker.",
  },
  imageScan: {
    id: "imageScan",
    family: "media",
    use: "Move across an image or visual proof to make inspection feel intentional.",
    params: {
      travelPercent: {type: "number", default: 8, min: 0, max: 18, unit: "percent"},
      direction: {type: "enum", default: "horizontal", values: ["horizontal", "vertical"]},
    },
    durationFrames: 76,
    easing: "easeInOutSine",
    composeWith: ["parallaxDrift", "focusLock"],
    avoidWhen: "Avoid on decorative images that do not contain inspectable information.",
  },
  screenshotInspect: {
    id: "screenshotInspect",
    family: "media",
    use: "Zoom and bracket an interface area while the narration names the evidence.",
    params: {
      zoom: {type: "number", default: 1.08, min: 1, max: 1.28, unit: "scale"},
      target: {type: "string", default: "primary-region"},
    },
    durationFrames: 68,
    easing: "easeInOutCubic",
    composeWith: ["focusLock", "clipReveal", "pushIn"],
    avoidWhen: "Avoid when no screenshot or interface-like asset exists.",
  },
  productOrbit: {
    id: "productOrbit",
    family: "media",
    use: "Move product surfaces around a central claim to express ecosystem or capability range.",
    params: {
      radiusPx: {type: "number", default: 120, min: 40, max: 260, unit: "px"},
      rotationDeg: {type: "number", default: 9, min: -24, max: 24, unit: "deg"},
    },
    durationFrames: 88,
    easing: "easeInOutSine",
    composeWith: ["depthShift", "assetStack"],
    avoidWhen: "Avoid for serious proof scenes where orbital motion would weaken credibility.",
  },
  assetStack: {
    id: "assetStack",
    family: "media",
    use: "Layer multiple assets into a compact evidence stack without turning them into generic cards.",
    params: {
      spreadPx: {type: "number", default: 34, min: 8, max: 96, unit: "px"},
      rotationDeg: {type: "number", default: 4, min: 0, max: 14, unit: "deg"},
    },
    durationFrames: 54,
    easing: "easeOutQuart",
    composeWith: ["pullBack", "panelShift", "productOrbit"],
    avoidWhen: "Avoid when only one asset exists; use screenshotInspect or imageScan instead.",
  },
};

export const videoProductMotionPresetDefinitions = VIDEO_PRODUCT_MOTION_PRESET_IDS.map(
  (id) => VIDEO_PRODUCT_MOTION_PRESETS[id],
);

export const resolveVideoProductMotionPreset = (id: string) =>
  VIDEO_PRODUCT_MOTION_PRESETS[id as VideoProductMotionPresetId] ?? null;
