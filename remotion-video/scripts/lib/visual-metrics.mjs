import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {inflateSync} from 'node:zlib';
import {productionComponentCatalog} from './semantic-component-resolver.mjs';

export const BLACK_PIXEL_THRESHOLD = Object.freeze({r: 25, g: 30, b: 45});
export const DEFAULT_SAMPLE_SIZE = Object.freeze({width: 135, height: 240});

const PNG_SIGNATURE = '89504e470d0a1a0a';
const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg']);
const PILLOW_METRICS_SCRIPT = String.raw`
import json
import sys
from PIL import Image, ImageFilter

path = sys.argv[1]
sample_width = int(sys.argv[2])
sample_height = int(sys.argv[3])

def rounded(value, digits=6):
    return round(float(value), digits)

def luma(pixel):
    r, g, b = pixel
    return (0.2126 * r) + (0.7152 * g) + (0.0722 * b)

with Image.open(path) as image:
    rgba = image.convert("RGBA")
    base = Image.new("RGBA", rgba.size, (0, 0, 0, 255))
    base.alpha_composite(rgba)
    rgb = base.convert("RGB")

width, height = rgb.size
pixels = list(rgb.getdata())
total_pixels = width * height

black_pixels = 0
brightness_sum = 0.0
brightness_min_pixel = 255.0
brightness_max_pixel = 0.0
for pixel in pixels:
    r, g, b = pixel
    if r < 25 and g < 30 and b < 45:
        black_pixels += 1
    value = luma(pixel)
    brightness_sum += value
    brightness_min_pixel = min(brightness_min_pixel, value)
    brightness_max_pixel = max(brightness_max_pixel, value)

sample_width = max(1, min(width, sample_width))
sample_height = max(1, min(height, sample_height))
sampled_colors = set()
for y in range(sample_height):
    source_y = min(height - 1, int(((y + 0.5) * height) / sample_height))
    for x in range(sample_width):
        source_x = min(width - 1, int(((x + 0.5) * width) / sample_width))
        sampled_colors.add(rgb.getpixel((source_x, source_y)))

edge = rgb.convert("L").filter(ImageFilter.FIND_EDGES)
edge_values = list(edge.getdata())
edge_density = sum(edge_values) / len(edge_values) if edge_values else 0.0

print(json.dumps({
    "decoder": "pillow",
    "width": width,
    "height": height,
    "pixels": total_pixels,
    "blackPixels": black_pixels,
    "blackPixelRatio": rounded(black_pixels / total_pixels),
    "brightnessMean": rounded(brightness_sum / total_pixels, 3),
    "brightnessMinPixel": rounded(brightness_min_pixel, 3),
    "brightnessMaxPixel": rounded(brightness_max_pixel, 3),
    "sampledColorCount": len(sampled_colors),
    "sampledColorGrid": {"width": sample_width, "height": sample_height},
    "edgeDensity": rounded(edge_density, 3),
    "edgeProxy": {
        "method": "PIL.ImageFilter.FIND_EDGES mean luma",
        "value": rounded(edge_density, 3),
        "sampleGrid": {"width": sample_width, "height": sample_height}
    }
}, ensure_ascii=False))
`;

const round = (value, digits = 6) => {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

const lumaFor = (r, g, b) => (0.2126 * r) + (0.7152 * g) + (0.0722 * b);

const paethPredictor = (a, b, c) => {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
};

export const decodePngBuffer = (buffer) => {
  if (buffer.subarray(0, 8).toString('hex') !== PNG_SIGNATURE) {
    throw new Error('[PNG_INVALID] missing PNG signature');
  }

  let offset = 8;
  let width = null;
  let height = null;
  let bitDepth = null;
  let colorType = null;
  let interlaceMethod = null;
  const idatChunks = [];

  while (offset < buffer.length) {
    if (offset + 8 > buffer.length) throw new Error('[PNG_INVALID] truncated chunk header');
    const length = buffer.readUInt32BE(offset);
    const type = buffer.subarray(offset + 4, offset + 8).toString('ascii');
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    if (dataEnd + 4 > buffer.length) throw new Error(`[PNG_INVALID] truncated ${type} chunk`);
    const data = buffer.subarray(dataStart, dataEnd);
    offset = dataEnd + 4;

    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
      interlaceMethod = data[12];
    } else if (type === 'IDAT') {
      idatChunks.push(data);
    } else if (type === 'IEND') {
      break;
    }
  }

  if (!width || !height) throw new Error('[PNG_INVALID] missing IHDR dimensions');
  if (bitDepth !== 8) throw new Error(`[PNG_UNSUPPORTED] only 8-bit PNG files are supported, received bitDepth=${bitDepth}`);
  if (interlaceMethod !== 0) throw new Error('[PNG_UNSUPPORTED] interlaced PNG files are not supported');

  const channelsByColorType = new Map([
    [0, 1],
    [2, 3],
    [4, 2],
    [6, 4],
  ]);
  const channels = channelsByColorType.get(colorType);
  if (!channels) throw new Error(`[PNG_UNSUPPORTED] colorType=${colorType} is not supported`);

  const bytesPerPixel = channels;
  const scanlineLength = width * channels;
  const inflated = inflateSync(Buffer.concat(idatChunks));
  const expectedLength = (scanlineLength + 1) * height;
  if (inflated.length < expectedLength) {
    throw new Error(`[PNG_INVALID] inflated data is shorter than expected (${inflated.length} < ${expectedLength})`);
  }

  const reconstructed = Buffer.alloc(scanlineLength * height);
  let inputOffset = 0;
  for (let y = 0; y < height; y += 1) {
    const filter = inflated[inputOffset];
    inputOffset += 1;
    const outputOffset = y * scanlineLength;
    for (let x = 0; x < scanlineLength; x += 1) {
      const raw = inflated[inputOffset + x];
      const left = x >= bytesPerPixel ? reconstructed[outputOffset + x - bytesPerPixel] : 0;
      const up = y > 0 ? reconstructed[outputOffset - scanlineLength + x] : 0;
      const upLeft = y > 0 && x >= bytesPerPixel
        ? reconstructed[outputOffset - scanlineLength + x - bytesPerPixel]
        : 0;

      let predictor = 0;
      if (filter === 1) predictor = left;
      else if (filter === 2) predictor = up;
      else if (filter === 3) predictor = Math.floor((left + up) / 2);
      else if (filter === 4) predictor = paethPredictor(left, up, upLeft);
      else if (filter !== 0) throw new Error(`[PNG_UNSUPPORTED] filter=${filter} is not supported`);

      reconstructed[outputOffset + x] = (raw + predictor) & 0xff;
    }
    inputOffset += scanlineLength;
  }

  const rgba = new Uint8Array(width * height * 4);
  for (let pixel = 0; pixel < width * height; pixel += 1) {
    const source = pixel * channels;
    const target = pixel * 4;
    if (colorType === 0) {
      const value = reconstructed[source];
      rgba[target] = value;
      rgba[target + 1] = value;
      rgba[target + 2] = value;
      rgba[target + 3] = 255;
    } else if (colorType === 2) {
      rgba[target] = reconstructed[source];
      rgba[target + 1] = reconstructed[source + 1];
      rgba[target + 2] = reconstructed[source + 2];
      rgba[target + 3] = 255;
    } else if (colorType === 4) {
      const alpha = reconstructed[source + 1] / 255;
      const value = Math.round(reconstructed[source] * alpha);
      rgba[target] = value;
      rgba[target + 1] = value;
      rgba[target + 2] = value;
      rgba[target + 3] = reconstructed[source + 1];
    } else {
      const alpha = reconstructed[source + 3] / 255;
      rgba[target] = Math.round(reconstructed[source] * alpha);
      rgba[target + 1] = Math.round(reconstructed[source + 1] * alpha);
      rgba[target + 2] = Math.round(reconstructed[source + 2] * alpha);
      rgba[target + 3] = reconstructed[source + 3];
    }
  }

  return {width, height, rgba, decoder: 'png'};
};

const decodeViaFfmpeg = (filePath) => {
  const result = spawnSync('ffmpeg', [
    '-v',
    'error',
    '-i',
    filePath,
    '-frames:v',
    '1',
    '-f',
    'image2pipe',
    '-vcodec',
    'png',
    '-',
  ], {
    encoding: null,
    maxBuffer: 128 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (result.error) {
    throw new Error(`[IMAGE_UNSUPPORTED] ${filePath}: ffmpeg decode failed: ${result.error.message}`);
  }
  if (result.status !== 0 || result.stdout.length === 0) {
    const stderr = result.stderr.toString('utf8').trim();
    throw new Error(`[IMAGE_UNSUPPORTED] ${filePath}: ffmpeg decode failed${stderr ? `: ${stderr}` : ''}`);
  }
  return {...decodePngBuffer(result.stdout), decoder: 'ffmpeg-png'};
};

export const decodeImageFile = (filePath) => {
  const buffer = fs.readFileSync(filePath);
  if (buffer.subarray(0, 8).toString('hex') === PNG_SIGNATURE) {
    return decodePngBuffer(buffer);
  }
  return decodeViaFfmpeg(filePath);
};

const measureImageFileViaPillow = (filePath, sampleSize) => {
  const sampleWidth = Math.max(1, Number(sampleSize.width) || DEFAULT_SAMPLE_SIZE.width);
  const sampleHeight = Math.max(1, Number(sampleSize.height) || DEFAULT_SAMPLE_SIZE.height);
  const result = spawnSync('python3', [
    '-c',
    PILLOW_METRICS_SCRIPT,
    filePath,
    String(sampleWidth),
    String(sampleHeight),
  ], {
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || '[PILLOW_METRICS_FAILED]');
  }
  return JSON.parse(result.stdout);
};

export const collectImageFiles = (inputPath) => {
  const absolutePath = path.resolve(inputPath);
  const stat = fs.statSync(absolutePath);
  if (stat.isFile()) {
    return IMAGE_EXTENSIONS.has(path.extname(absolutePath).toLowerCase()) ? [absolutePath] : [];
  }
  if (!stat.isDirectory()) return [];

  const results = [];
  const visit = (directory) => {
    for (const entry of fs.readdirSync(directory, {withFileTypes: true})) {
      if (entry.name.startsWith('.')) continue;
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(entryPath);
      else if (entry.isFile() && IMAGE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
        results.push(entryPath);
      }
    }
  };
  visit(absolutePath);
  return results.sort((left, right) => left.localeCompare(right));
};

export const measureImagePixels = (image, options = {}) => {
  const sampleSize = options.sampleSize ?? DEFAULT_SAMPLE_SIZE;
  const sampleWidth = Math.max(1, Math.min(image.width, Number(sampleSize.width) || DEFAULT_SAMPLE_SIZE.width));
  const sampleHeight = Math.max(1, Math.min(image.height, Number(sampleSize.height) || DEFAULT_SAMPLE_SIZE.height));
  const totalPixels = image.width * image.height;

  let blackPixels = 0;
  let brightnessSum = 0;
  let brightnessMinPixel = 255;
  let brightnessMaxPixel = 0;

  for (let pixel = 0; pixel < totalPixels; pixel += 1) {
    const offset = pixel * 4;
    const r = image.rgba[offset];
    const g = image.rgba[offset + 1];
    const b = image.rgba[offset + 2];
    if (r < BLACK_PIXEL_THRESHOLD.r && g < BLACK_PIXEL_THRESHOLD.g && b < BLACK_PIXEL_THRESHOLD.b) {
      blackPixels += 1;
    }
    const luma = lumaFor(r, g, b);
    brightnessSum += luma;
    brightnessMinPixel = Math.min(brightnessMinPixel, luma);
    brightnessMaxPixel = Math.max(brightnessMaxPixel, luma);
  }

  const sampledColors = new Set();
  const sampledLumas = new Float64Array(sampleWidth * sampleHeight);
  for (let y = 0; y < sampleHeight; y += 1) {
    const sourceY = Math.min(image.height - 1, Math.floor(((y + 0.5) * image.height) / sampleHeight));
    for (let x = 0; x < sampleWidth; x += 1) {
      const sourceX = Math.min(image.width - 1, Math.floor(((x + 0.5) * image.width) / sampleWidth));
      const sourceOffset = ((sourceY * image.width) + sourceX) * 4;
      const r = image.rgba[sourceOffset];
      const g = image.rgba[sourceOffset + 1];
      const b = image.rgba[sourceOffset + 2];
      sampledColors.add(`${r},${g},${b}`);
      sampledLumas[(y * sampleWidth) + x] = lumaFor(r, g, b);
    }
  }

  let edgeSum = 0;
  let edgeSamples = 0;
  for (let y = 0; y < sampleHeight; y += 1) {
    for (let x = 0; x < sampleWidth; x += 1) {
      const index = (y * sampleWidth) + x;
      const current = sampledLumas[index];
      const horizontal = x > 0 ? Math.abs(current - sampledLumas[index - 1]) : 0;
      const vertical = y > 0 ? Math.abs(current - sampledLumas[index - sampleWidth]) : 0;
      if (x > 0 || y > 0) {
        edgeSum += Math.max(horizontal, vertical);
        edgeSamples += 1;
      }
    }
  }

  const edgeDensity = edgeSamples > 0 ? edgeSum / edgeSamples : 0;
  const brightnessMean = brightnessSum / totalPixels;
  return {
    width: image.width,
    height: image.height,
    pixels: totalPixels,
    blackPixels,
    blackPixelRatio: round(blackPixels / totalPixels),
    brightnessMean: round(brightnessMean, 3),
    brightnessMinPixel: round(brightnessMinPixel, 3),
    brightnessMaxPixel: round(brightnessMaxPixel, 3),
    sampledColorCount: sampledColors.size,
    sampledColorGrid: {width: sampleWidth, height: sampleHeight},
    edgeDensity: round(edgeDensity, 3),
    edgeProxy: {
      method: 'mean max adjacent luma delta on sampled grid',
      value: round(edgeDensity, 3),
      sampleGrid: {width: sampleWidth, height: sampleHeight},
    },
  };
};

export const measureImageFile = (filePath, options = {}) => {
  const sampleSize = options.sampleSize ?? DEFAULT_SAMPLE_SIZE;
  try {
    return {
      path: filePath,
      ...measureImageFileViaPillow(filePath, sampleSize),
    };
  } catch (error) {
    if (options.requirePillow) throw error;
  }
  const decoded = decodeImageFile(filePath);
  return {
    path: filePath,
    decoder: decoded.decoder,
    ...measureImagePixels(decoded, {sampleSize}),
  };
};

const meanBy = (items, selector) => {
  if (items.length === 0) return 0;
  return items.reduce((total, item) => total + selector(item), 0) / items.length;
};

export const aggregateImageMetrics = (images) => {
  if (images.length === 0) {
    return {
      count: 0,
      blackPixelRatio: null,
      edgeDensity: null,
      sampledColorCount: null,
      brightness: null,
    };
  }

  const brightnessMeans = images.map((image) => image.brightnessMean);
  const minBrightness = Math.min(...brightnessMeans);
  const maxBrightness = Math.max(...brightnessMeans);

  return {
    count: images.length,
    blackPixelRatio: {
      min: round(Math.min(...images.map((image) => image.blackPixelRatio))),
      max: round(Math.max(...images.map((image) => image.blackPixelRatio))),
      mean: round(meanBy(images, (image) => image.blackPixelRatio)),
    },
    edgeDensity: {
      min: round(Math.min(...images.map((image) => image.edgeDensity)), 3),
      max: round(Math.max(...images.map((image) => image.edgeDensity)), 3),
      mean: round(meanBy(images, (image) => image.edgeDensity), 3),
    },
    sampledColorCount: {
      min: Math.min(...images.map((image) => image.sampledColorCount)),
      max: Math.max(...images.map((image) => image.sampledColorCount)),
      mean: round(meanBy(images, (image) => image.sampledColorCount), 3),
    },
    brightness: {
      minFrameMean: round(minBrightness, 3),
      maxFrameMean: round(maxBrightness, 3),
      swing: round(maxBrightness - minBrightness, 3),
    },
  };
};

const layoutSignatureForScene = (scene) => {
  const payload = scene?.payload ?? {};
  if (typeof payload.layoutSignature === 'string' && payload.layoutSignature.trim()) {
    return payload.layoutSignature.trim();
  }
  if (typeof payload.variant === 'string' && payload.variant.trim() && payload.variant !== 'generic') {
    return `variant:${payload.variant.trim()}`;
  }
  if (typeof payload.visualMode === 'string' && payload.visualMode.trim()) {
    return `visual:${payload.visualMode.trim()}`;
  }
  return `family:${scene?.family ?? 'unknown'}`;
};

const sortedUsage = (usage) =>
  [...usage.entries()]
    .map(([id, count]) => ({id, count}))
    .sort((left, right) => right.count - left.count || left.id.localeCompare(right.id));

const maxRunLength = (values) => {
  let maxRun = 0;
  let previous = null;
  let currentRun = 0;
  for (const value of values) {
    if (value === previous) currentRun += 1;
    else currentRun = 1;
    previous = value;
    maxRun = Math.max(maxRun, currentRun);
  }
  return maxRun;
};

const collectTemplateIds = (project) => {
  const visualPlanEntries = Array.isArray(project?.visualPlan?.entries) ? project.visualPlan.entries : [];
  if (visualPlanEntries.length > 0) {
    return {
      source: 'visualPlan.entries',
      entries: visualPlanEntries.map((entry) => ({
        id: entry.id ?? null,
        sceneId: entry.sceneId ?? null,
        componentId: entry.componentId ?? null,
        resolution: entry.resolution ?? null,
        shotKind: entry.shot?.kind ?? null,
      })),
    };
  }

  const heroStates = [];
  for (const scene of Array.isArray(project?.scenes) ? project.scenes : []) {
    for (const state of Array.isArray(scene?.payload?.heroTrack?.states) ? scene.payload.heroTrack.states : []) {
      heroStates.push({
        id: state.visualPlanEntryId ?? null,
        sceneId: scene.id ?? null,
        componentId: state.componentId ?? null,
        resolution: state.resolution ?? null,
        shotKind: state.shot?.kind ?? null,
      });
    }
  }
  return {source: heroStates.length > 0 ? 'payload.heroTrack.states' : 'none', entries: heroStates};
};

const collectDirectorEntries = (project) => {
  const visualPlanEntries = Array.isArray(project?.visualPlan?.entries) ? project.visualPlan.entries : [];
  if (visualPlanEntries.length > 0) {
    return {
      source: 'visualPlan.entries',
      entries: visualPlanEntries.map((entry) => ({
        id: entry.id ?? null,
        sceneId: entry.sceneId ?? null,
        ...entry.director,
      })).filter((entry) => entry.scenePrimitive || entry.motionPreset || entry.transitionPreset),
    };
  }

  const directorEntries = [];
  for (const scene of Array.isArray(project?.scenes) ? project.scenes : []) {
    for (const state of Array.isArray(scene?.payload?.heroTrack?.states) ? scene.payload.heroTrack.states : []) {
      if (!state?.director) continue;
      directorEntries.push({
        id: state.visualPlanEntryId ?? null,
        sceneId: scene.id ?? null,
        ...state.director,
      });
    }
  }
  return {source: directorEntries.length > 0 ? 'payload.heroTrack.states' : 'none', entries: directorEntries};
};

export const measureProject = (project) => {
  const scenes = Array.isArray(project?.scenes) ? project.scenes : [];
  const layoutSignatures = scenes.map(layoutSignatureForScene);
  const layoutUsage = new Map();
  layoutSignatures.forEach((signature) => layoutUsage.set(signature, (layoutUsage.get(signature) ?? 0) + 1));

  const {source, entries} = collectTemplateIds(project);
  const componentIds = entries.map((entry) => entry.componentId).filter(Boolean);
  const templateUsage = new Map();
  componentIds.forEach((componentId) => templateUsage.set(componentId, (templateUsage.get(componentId) ?? 0) + 1));

  const productionComponentIds = new Set(
    productionComponentCatalog.components
      .filter((descriptor) => descriptor.productionReady)
      .map((descriptor) => descriptor.componentId),
  );
  const unresolvedEntries = entries.filter((entry) => entry.resolution && entry.resolution !== 'matched');
  const nonProductionEntries = entries.filter((entry) => entry.componentId && !productionComponentIds.has(entry.componentId));
  const directorSource = collectDirectorEntries(project);
  const scenePrimitives = directorSource.entries.map((entry) => entry.scenePrimitive).filter(Boolean);
  const motionPresets = directorSource.entries.map((entry) => entry.motionPreset).filter(Boolean);
  const transitionPresets = directorSource.entries.map((entry) => entry.transitionPreset).filter(Boolean);
  const scenePrimitiveUsage = new Map();
  const motionPresetUsage = new Map();
  const transitionPresetUsage = new Map();
  scenePrimitives.forEach((id) => scenePrimitiveUsage.set(id, (scenePrimitiveUsage.get(id) ?? 0) + 1));
  motionPresets.forEach((id) => motionPresetUsage.set(id, (motionPresetUsage.get(id) ?? 0) + 1));
  transitionPresets.forEach((id) => transitionPresetUsage.set(id, (transitionPresetUsage.get(id) ?? 0) + 1));

  return {
    projectId: project?.projectId ?? null,
    title: project?.title ?? null,
    visualSystem: project?.visualSystem ?? null,
    sceneCount: scenes.length,
    layoutSignatures: {
      uniqueCount: layoutUsage.size,
      maxRun: maxRunLength(layoutSignatures),
      usage: sortedUsage(layoutUsage),
    },
    templateUsage: {
      source,
      totalEntries: entries.length,
      uniqueCount: templateUsage.size,
      catalogProductionCount: productionComponentIds.size,
      uniqueProductionCoverageRatio: productionComponentIds.size > 0
        ? round([...templateUsage.keys()].filter((id) => productionComponentIds.has(id)).length / productionComponentIds.size)
        : null,
      maxRun: maxRunLength(componentIds),
      usage: sortedUsage(templateUsage),
      unresolvedEntries: unresolvedEntries.map((entry) => entry.id).filter(Boolean),
      nonProductionEntries: nonProductionEntries.map((entry) => ({
        id: entry.id,
        componentId: entry.componentId,
      })),
      genericExplainerCount: templateUsage.get('generic-explainer') ?? 0,
    },
    directorGrammar: {
      source: directorSource.source,
      totalEntries: directorSource.entries.length,
      scenePrimitives: {
        uniqueCount: scenePrimitiveUsage.size,
        maxRun: maxRunLength(scenePrimitives),
        usage: sortedUsage(scenePrimitiveUsage),
      },
      motionPresets: {
        uniqueCount: motionPresetUsage.size,
        maxRun: maxRunLength(motionPresets),
        usage: sortedUsage(motionPresetUsage),
      },
      transitionPresets: {
        uniqueCount: transitionPresetUsage.size,
        maxRun: maxRunLength(transitionPresets),
        usage: sortedUsage(transitionPresetUsage),
      },
    },
  };
};

export const buildVisualMetricsReport = ({imagePaths = [], project = null, sampleSize = DEFAULT_SAMPLE_SIZE} = {}) => {
  const imageMetrics = imagePaths.map((imagePath) => measureImageFile(imagePath, {sampleSize}));
  return {
    ok: true,
    schemaVersion: 1,
    formulas: {
      blackPixelRatio: `pixels where r<${BLACK_PIXEL_THRESHOLD.r}, g<${BLACK_PIXEL_THRESHOLD.g}, b<${BLACK_PIXEL_THRESHOLD.b} divided by total pixels`,
      edgeDensity: 'Pillow ImageFilter.FIND_EDGES mean luma; JS adjacent-luma edge proxy is used only when Pillow is unavailable',
      sampledColorCount: `unique RGB triples sampled on a ${DEFAULT_SAMPLE_SIZE.width}x${DEFAULT_SAMPLE_SIZE.height} grid, clamped to image dimensions`,
      brightnessSwing: 'max(frame mean luma) - min(frame mean luma) across decoded input images',
      projectLayoutSignature: 'scene.payload.layoutSignature, then variant/visualMode/family fallback',
      projectTemplateUsage: 'project.visualPlan.entries componentId counts, falling back to payload.heroTrack.states when visualPlan is absent',
      projectDirectorGrammar: 'project.visualPlan.entries[].director scenePrimitive/motionPreset/transitionPreset counts, falling back to payload.heroTrack.states',
    },
    images: {
      count: imageMetrics.length,
      aggregate: aggregateImageMetrics(imageMetrics),
      items: imageMetrics,
    },
    project: project ? measureProject(project) : null,
  };
};
