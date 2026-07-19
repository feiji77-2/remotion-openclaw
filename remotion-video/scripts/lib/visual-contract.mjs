import {existsSync, readFileSync} from 'node:fs';
import path from 'node:path';

const GOLDEN_PROJECT_ID = 'workbuddy-six-skills-showcase';

const INTRO_OUTRO_VARIANTS = new Set(['intro', 'overview', 'outro']);
const REQUIRED_GOLDEN_NARRATION_TERMS = [
  'WorkBuddy',
  'PPT Master',
  'HyperFrames',
  '正文配图',
];

const STALE_GOLDEN_TERMS = [
  'WorkBuddy',
  '编码原则',
  'Karpathy',
  'Remotion',
  'PPT Master',
  '小黑',
  '正文配图',
  'HyperFrames',
  'UI Skill',
  '好帮手',
];

const FORBIDDEN_COMPONENT_LITERALS = [
  '它才算真正的好帮手',
  '我一直在用的',
  '今天，一次分享给你',
  '装上 <span',
];

const PRODUCT_ICON_ROOT = 'public/projects/skill-showcase/product-icons';
const FPS = 30;

const collectStrings = (value, output = []) => {
  if (typeof value === 'string') {
    const text = value.trim();
    if (text) output.push(text);
    return output;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => collectStrings(item, output));
    return output;
  }
  if (value && typeof value === 'object') {
    Object.values(value).forEach((item) => collectStrings(item, output));
  }
  return output;
};

const hasText = (haystack, needle) => haystack.toLocaleLowerCase().includes(needle.toLocaleLowerCase());

const asArray = (value) => Array.isArray(value) ? value : [];

const frameForMs = (ms) => Math.round(ms / 1000 * FPS);

const compactMeaningText = (value) => String(value ?? '')
  .replace(/\s+/g, '')
  .replace(/[，。！？、；：,.!?;:《》「」“”"'`~()[\]{}<>|/\\-]/g, '')
  .toLocaleLowerCase();

const sourceTextIsCoveredByNarration = (sourceText, narrationText) => {
  const source = compactMeaningText(sourceText);
  const narration = compactMeaningText(narrationText);
  if (source.length < 4 || narration.length < 4) return false;
  if (narration.includes(source)) return true;
  const anchors = [
    source.slice(0, Math.min(36, source.length)),
    source.slice(Math.max(0, Math.floor(source.length / 2) - 18), Math.min(source.length, Math.floor(source.length / 2) + 18)),
    source.slice(Math.max(0, source.length - 36)),
  ].filter((anchor) => anchor.length >= 4);
  return anchors.some((anchor) => narration.includes(anchor));
};

const captionTextForRange = (captions, startIndex, endIndex) => captions
  .slice(startIndex, endIndex + 1)
  .map((caption) => caption.text)
  .join('');

const keywordIsCoveredByCaption = (beat, captionText) => {
  const keyword = compactMeaningText(beat.keyword);
  if (keyword.length < 2) return true;
  const caption = compactMeaningText(captionText);
  if (caption.includes(keyword)) return true;
  const semantic = compactMeaningText([
    beat.detail,
    beat.visualState,
    ...(Array.isArray(beat.evidence) ? beat.evidence : []),
  ].filter(Boolean).join(''));
  if (semantic.includes(keyword)) return true;
  if (keyword.length >= 4) {
    const left = keyword.slice(0, Math.ceil(keyword.length / 2));
    const right = keyword.slice(Math.floor(keyword.length / 2));
    return caption.includes(left) || caption.includes(right);
  }
  return false;
};

const isGoldenNarration = (project, narrationText) => (
  project?.projectId === GOLDEN_PROJECT_ID
  && REQUIRED_GOLDEN_NARRATION_TERMS.every((term) => hasText(narrationText, term))
);

const assertProductIconExists = (projectRoot, iconId, pathLabel, errors) => {
  if (!iconId) return;
  const iconPath = path.join(projectRoot, PRODUCT_ICON_ROOT, `${iconId}.svg`);
  if (!existsSync(iconPath)) {
    errors.push(`${pathLabel}: product icon asset missing at ${path.relative(projectRoot, iconPath)}`);
  }
};

const layoutSignatureForScene = (scene) => {
  const payload = scene?.payload ?? {};
  if (typeof payload.layoutSignature === 'string' && payload.layoutSignature.trim()) {
    return payload.layoutSignature.trim();
  }
  if (typeof payload.variant === 'string' && payload.variant !== 'generic') {
    return `variant:${payload.variant}`;
  }
  if (typeof payload.visualMode === 'string' && payload.visualMode.trim()) {
    return `visual:${payload.visualMode}`;
  }
  return `family:${scene?.family ?? 'unknown'}`;
};

const checkSceneCaptionRange = (scene, sceneIndex, captions, errors) => {
  const range = scene?.captionRange;
  if (!range) {
    errors.push(`scenes[${sceneIndex}]: non-golden skill-showcase scene must declare captionRange`);
    return null;
  }
  if (!Number.isInteger(range.startIndex) || !Number.isInteger(range.endIndex) || range.endIndex < range.startIndex) {
    errors.push(`scenes[${sceneIndex}].captionRange: startIndex/endIndex must be ascending integer caption indexes`);
    return null;
  }
  const startCaption = captions[range.startIndex];
  const endCaption = captions[range.endIndex];
  if (!startCaption || !endCaption) {
    errors.push(`scenes[${sceneIndex}].captionRange: points outside captions`);
    return null;
  }
  const expectedDuration = frameForMs(endCaption.endMs) - frameForMs(startCaption.startMs);
  if (Math.abs(expectedDuration - scene.durationInFrames) > 1) {
    errors.push(`scenes[${sceneIndex}].durationInFrames: must match captionRange within 1 frame; expected ${expectedDuration}, received ${scene.durationInFrames}`);
  }
  return range;
};

const checkBeats = (scene, sceneIndex, errors, {captions = [], requireCaptionBinding = false} = {}) => {
  const beats = asArray(scene?.payload?.beats);
  if (beats.length === 0) {
    errors.push(`scenes[${sceneIndex}]: skill-showcase scene must declare beats`);
    return;
  }
  if (beats[0]?.startFrame > 30) {
    errors.push(`scenes[${sceneIndex}]: first beat must start within the first second`);
  }
  if (beats.at(-1)?.endFrame !== scene.durationInFrames) {
    errors.push(`scenes[${sceneIndex}]: last beat must end at scene.durationInFrames`);
  }
  let previousEnd = null;
  beats.forEach((beat, beatIndex) => {
    if (!Number.isInteger(beat.startFrame) || !Number.isInteger(beat.endFrame)) {
      errors.push(`scenes[${sceneIndex}].payload.beats[${beatIndex}]: beat frames must be integers`);
    }
    if (beat.endFrame <= beat.startFrame) {
      errors.push(`scenes[${sceneIndex}].payload.beats[${beatIndex}]: beat endFrame must be after startFrame`);
    }
    if (beat.endFrame > scene.durationInFrames) {
      errors.push(`scenes[${sceneIndex}].payload.beats[${beatIndex}]: beat exceeds scene duration`);
    }
    if (previousEnd !== null && beat.startFrame - previousEnd > 6) {
      errors.push(`scenes[${sceneIndex}].payload.beats[${beatIndex}]: visible beat gap exceeds 6 frames`);
    }
    if (requireCaptionBinding) {
      if (!Number.isInteger(beat.captionStartIndex) || !Number.isInteger(beat.captionEndIndex)) {
        errors.push(`scenes[${sceneIndex}].payload.beats[${beatIndex}]: captionStartIndex/captionEndIndex are required`);
      } else if (beat.captionEndIndex < beat.captionStartIndex) {
        errors.push(`scenes[${sceneIndex}].payload.beats[${beatIndex}]: caption indexes must be ascending`);
      } else {
        const sceneRange = scene.captionRange;
        if (sceneRange && (beat.captionStartIndex < sceneRange.startIndex || beat.captionEndIndex > sceneRange.endIndex)) {
          errors.push(`scenes[${sceneIndex}].payload.beats[${beatIndex}]: caption range must stay inside scene captionRange`);
        }
        const startCaption = captions[beat.captionStartIndex];
        const endCaption = captions[beat.captionEndIndex];
        if (!startCaption || !endCaption) {
          errors.push(`scenes[${sceneIndex}].payload.beats[${beatIndex}]: caption indexes point outside captions`);
        } else if (sceneRange && captions[sceneRange.startIndex]) {
          const sceneStartFrame = frameForMs(captions[sceneRange.startIndex].startMs);
          const expectedStart = frameForMs(startCaption.startMs) - sceneStartFrame;
          const expectedEnd = frameForMs(endCaption.endMs) - sceneStartFrame;
          if (Math.abs(expectedStart - beat.startFrame) > 1) {
            errors.push(`scenes[${sceneIndex}].payload.beats[${beatIndex}].startFrame: must match bound caption within 1 frame`);
          }
          if (Math.abs(expectedEnd - beat.endFrame) > 1) {
            errors.push(`scenes[${sceneIndex}].payload.beats[${beatIndex}].endFrame: must match bound caption within 1 frame`);
          }
          const captionText = captionTextForRange(captions, beat.captionStartIndex, beat.captionEndIndex);
          if (!keywordIsCoveredByCaption(beat, captionText)) {
            errors.push(`scenes[${sceneIndex}].payload.beats[${beatIndex}].keyword: "${beat.keyword}" is not present in its bound caption range or explicit beat summary`);
          }
        }
      }
      if (!beat.visualState) errors.push(`scenes[${sceneIndex}].payload.beats[${beatIndex}].visualState is required`);
      if (!beat.motionPreset) errors.push(`scenes[${sceneIndex}].payload.beats[${beatIndex}].motionPreset is required`);
      if (!beat.placement) errors.push(`scenes[${sceneIndex}].payload.beats[${beatIndex}].placement is required`);
    }
    previousEnd = beat.endFrame;
  });
};

export const checkVisualContract = (project, {projectRoot = process.cwd()} = {}) => {
  const errors = [];
  const warnings = [];
  const scenes = asArray(project?.scenes);
  const captions = asArray(project?.captions);
  const skillScenes = scenes.filter((scene) => scene?.family === 'skill-showcase');
  if (skillScenes.length === 0) return {ok: true, errors, warnings, checkedScenes: 0};

  const narrationText = collectStrings([project?.title, project?.captions]).join('\n');
  const isGolden = isGoldenNarration(project, narrationText);
  const visualText = collectStrings(skillScenes.map((scene) => scene.payload)).join('\n');

  if (project?.projectId === GOLDEN_PROJECT_ID && !isGolden) {
    errors.push(`projectId=${GOLDEN_PROJECT_ID} is reserved for the WorkBuddy golden sample; changed narration must use a new projectId and regenerated scenes`);
  }

  let previousRange = null;
  const layoutSignatures = [];
  skillScenes.forEach((scene, sceneIndex) => {
    const payload = scene.payload ?? {};
    layoutSignatures.push(layoutSignatureForScene(scene));
    const range = !isGolden ? checkSceneCaptionRange(scene, sceneIndex, captions, errors) : scene.captionRange ?? null;
    if (!isGolden && range) {
      if (previousRange && range.startIndex !== previousRange.endIndex + 1) {
        errors.push(`scenes[${sceneIndex}].captionRange: non-golden skill-showcase captionRanges must be continuous`);
      }
      previousRange = range;
    }
    checkBeats(scene, sceneIndex, errors, {captions, requireCaptionBinding: !isGolden});
    assertProductIconExists(projectRoot, payload.productIcon, `scenes[${sceneIndex}].payload.productIcon`, errors);
    assertProductIconExists(projectRoot, payload.brandIcon, `scenes[${sceneIndex}].payload.brandIcon`, errors);
    asArray(payload.productIcons).forEach((icon, iconIndex) => {
      assertProductIconExists(projectRoot, icon, `scenes[${sceneIndex}].payload.productIcons[${iconIndex}]`, errors);
    });

    if (!isGolden && INTRO_OUTRO_VARIANTS.has(payload.variant)) {
      if (!payload.brandName) errors.push(`scenes[${sceneIndex}].payload.brandName is required for reusable intro/overview/outro scenes`);
      if (!payload.headline && !payload.body) errors.push(`scenes[${sceneIndex}].payload.headline or body is required for reusable intro/overview/outro scenes`);
      if (asArray(payload.labels).length > 0 && asArray(payload.labelIcons).length < asArray(payload.labels).length) {
        errors.push(`scenes[${sceneIndex}].payload.labelIcons must cover every label`);
      }
      if (asArray(payload.labels).length > 0 && asArray(payload.productIcons).length < asArray(payload.labels).length) {
        errors.push(`scenes[${sceneIndex}].payload.productIcons must cover every label`);
      }
    }

    if (!isGolden) {
      if (payload.variant === 'generic' && !payload.visualMode) {
        errors.push(`scenes[${sceneIndex}].payload.visualMode is required for generic scenes`);
      }
      if (!payload.sourceText || compactMeaningText(payload.sourceText).length < 4) {
        errors.push(`scenes[${sceneIndex}].payload.sourceText is required for changed-script skill-showcase scenes`);
      } else if (asArray(project?.captions).length > 0 && !sourceTextIsCoveredByNarration(payload.sourceText, narrationText)) {
        errors.push(`scenes[${sceneIndex}].payload.sourceText is not covered by current captions; regenerate scene payload after changing voiceover`);
      }
      if (!INTRO_OUTRO_VARIANTS.has(payload.variant)) {
        if (!payload.productIcon) errors.push(`scenes[${sceneIndex}].payload.productIcon is required for reusable body scenes`);
        if (!Number.isInteger(payload.progressIndex) || !Number.isInteger(payload.progressTotal)) {
          errors.push(`scenes[${sceneIndex}].payload.progressIndex/progressTotal are required for reusable body scenes`);
        }
      }
    }
  });

  if (!isGolden) {
    for (let index = 2; index < layoutSignatures.length; index += 1) {
      const current = layoutSignatures[index];
      if (current === layoutSignatures[index - 1] && current === layoutSignatures[index - 2]) {
        errors.push(`scenes[${index - 2}..${index}]: three consecutive skill-showcase scenes reuse the same body layout: ${current}`);
      }
    }
  }

  if (!isGolden) {
    for (const term of STALE_GOLDEN_TERMS) {
      if (hasText(visualText, term) && !hasText(narrationText, term)) {
        errors.push(`visual payload contains stale golden-sample term not present in narration: ${term}`);
      }
    }
  }

  const componentPath = path.join(projectRoot, 'src/components/ultimate-kit/families/skill-showcase/SkillShowcase.tsx');
  if (existsSync(componentPath)) {
    const source = readFileSync(componentPath, 'utf8');
    for (const literal of FORBIDDEN_COMPONENT_LITERALS) {
      if (source.includes(literal)) {
        errors.push(`SkillShowcase.tsx contains non-data-driven legacy literal: ${literal}`);
      }
    }
  } else {
    warnings.push('SkillShowcase.tsx was not found; skipped source literal audit');
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    checkedScenes: skillScenes.length,
  };
};

export const assertVisualContract = (project, options = {}) => {
  const result = checkVisualContract(project, options);
  if (!result.ok) {
    throw new Error(`[VISUAL_CONTRACT_INVALID]\n${result.errors.map((error) => `- ${error}`).join('\n')}`);
  }
  return result;
};
