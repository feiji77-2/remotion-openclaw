#!/usr/bin/env node

import crypto from 'node:crypto';
import {existsSync} from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(SCRIPT_DIR, '..');
const require = createRequire(import.meta.url);
const {
  buildPreferredRemotionFlags,
} = require('./render-defaults.js');

const hasCliFlag = (args, flag) => {
  return args.some((arg, index) => {
    return arg === flag || arg.startsWith(`${flag}=`) || (index > 0 && args[index - 1] === flag);
  });
};

const stripCliFlag = (args, flag) => {
  const output = [];

  for (let index = 0; index < args.length; index += 1) {
    const current = args[index];
    if (current === flag) {
      continue;
    }
    output.push(current);
  }

  return output;
};

const loadJson = async (filePath) => {
  const content = await fs.readFile(filePath, 'utf8');
  return JSON.parse(content);
};

const sanitizeVersionForFileName = (value) => {
  const normalized = String(value || '').trim().replace(/[^0-9A-Za-z._-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  return normalized || '';
};

const writeJson = async (filePath, data) => {
  await fs.mkdir(path.dirname(filePath), {recursive: true});
  await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
};

const SANDBOX_HINTS = [
  'MachPortRendezvousServer',
  'Permission denied (1100)',
  'Failed to launch the browser process',
  'Sandbox(Signal(6))',
];

const resolveRemotionLaunch = (cwd) => {
  const bundledCli = path.join(cwd, 'node_modules', '@remotion', 'cli', 'remotion-cli.js');
  const binaryShim = path.join(cwd, 'node_modules', '.bin', 'remotion');

  if (existsSync(bundledCli)) {
    return {
      command: process.execPath,
      argsPrefix: [bundledCli],
      displayCommand: `${process.execPath} ${bundledCli}`,
    };
  }

  if (existsSync(binaryShim)) {
    return {
      command: binaryShim,
      argsPrefix: [],
      displayCommand: binaryShim,
    };
  }

  return {
    command: 'npx',
    argsPrefix: ['remotion'],
    displayCommand: 'npx remotion',
  };
};

const DEFAULT_TRANSITION_DURATION = 12;

const resolveSceneTransition = (projectTransition, sceneTransition) => {
  if (sceneTransition === false) {
    return false;
  }

  if (projectTransition === false && !sceneTransition) {
    return false;
  }

  return {
    durationInFrames: DEFAULT_TRANSITION_DURATION,
    ...(projectTransition === false ? {} : projectTransition ?? {}),
    ...(sceneTransition ?? {}),
  };
};

const getIncomingTransitionDurationInFrames = (previousScene, scene) => {
  if (!previousScene || !scene?.transition) {
    return 0;
  }

  const requestedDuration = Number(
    scene.transition.durationInFrames ?? DEFAULT_TRANSITION_DURATION,
  );

  if (!Number.isFinite(requestedDuration) || requestedDuration <= 0) {
    return 0;
  }

  const previousDuration = Math.max(1, Math.round(Number(previousScene.durationInFrames) || 1));
  const currentDuration = Math.max(1, Math.round(Number(scene.durationInFrames) || 1));
  const maxOverlap = Math.max(0, Math.min(previousDuration, currentDuration) - 1);

  return Math.min(Math.round(requestedDuration), maxOverlap);
};

const getUltimateDurationInFrames = (config) => {
  const scenes = Array.isArray(config?.scenes) ? config.scenes : [];
  const normalizedScenes = scenes.map((scene) => ({
    ...scene,
    durationInFrames: Math.max(1, Math.round(Number(scene?.durationInFrames) || 1)),
    transition: resolveSceneTransition(config?.defaultTransition, scene?.transition),
  }));

  const summedDuration = normalizedScenes.reduce((sum, scene) => {
    return sum + scene.durationInFrames;
  }, 0);

  const overlapDuration = normalizedScenes.reduce((sum, scene, index) => {
    const previousScene = index > 0 ? normalizedScenes[index - 1] : null;
    return sum + getIncomingTransitionDurationInFrames(previousScene, scene);
  }, 0);

  return Math.max(1, summedDuration - overlapDuration);
};

const stageRenderPropsFile = async (projectRoot, projectId, renderProps, compositionId) => {
  const propsJson = JSON.stringify(renderProps);
  const hash = crypto.createHash('sha1').update(propsJson).digest('hex').slice(0, 12);
  const relativePath = `/runtime/render-props/${projectId}-${compositionId.toLowerCase()}-${hash}.json`;
  const absolutePath = path.join(projectRoot, 'public', relativePath.replace(/^\//, ''));
  await writeJson(absolutePath, renderProps);

  const defaultDuration = getUltimateDurationInFrames(renderProps?.config);

  return {
    propsFile: relativePath,
    durationInFrames: Math.max(1, Math.round(defaultDuration || 1)),
    renderFps: Number(renderProps?.renderFps) || 30,
    renderWidth: Number(renderProps?.renderWidth) || 1920,
    renderHeight: Number(renderProps?.renderHeight) || 1080,
    template: renderProps?.template,
    packageVersion: typeof renderProps?.packageVersion === 'string' ? renderProps.packageVersion : null,
    projectId,
  };
};

async function main() {
  const inputArg = process.argv[2];
  const rawOutputArg = process.argv[3];
  const hasExplicitOutputArg = typeof rawOutputArg === 'string' && rawOutputArg.length > 0 && !rawOutputArg.startsWith('--');
  const outputArg = hasExplicitOutputArg ? rawOutputArg : null;
  const passthroughArgs = process.argv.slice(hasExplicitOutputArg ? 4 : 3);

  if (!inputArg) {
    console.error('Usage: node scripts/render-project.mjs <render-props-json> [output-path] [...remotion-flags]');
    process.exit(1);
  }

  const propsPath = path.resolve(process.cwd(), inputArg);
  const props = await loadJson(propsPath);
  const inlinePropsMode = (
    String(process.env.RENDER_PROJECT_INLINE_PROPS || '').trim() === '1'
    || hasCliFlag(passthroughArgs, '--inline-props')
  );
  const cleanedPassthroughArgs = stripCliFlag(passthroughArgs, '--inline-props');
  const projectId = String(props.projectId || 'project-render').trim() || 'project-render';
  const packageVersion = typeof props.packageVersion === 'string' ? props.packageVersion.trim() : '';
  const versionSuffix = sanitizeVersionForFileName(packageVersion);
  const compositionId = 'UltimateSceneTemplate';
  const outputPath = outputArg
    ? path.resolve(process.cwd(), outputArg)
    : path.resolve(process.cwd(), 'out', `${projectId}${versionSuffix ? `-v${versionSuffix}` : ''}.mp4`);
  const hasCustomPort = hasCliFlag(cleanedPassthroughArgs, '--port');
  const envRenderPort = String(process.env.REMOTION_RENDER_PORT || '').trim();
  const renderPort = hasCustomPort
    ? null
    : (envRenderPort || null);

  await fs.mkdir(path.dirname(outputPath), {recursive: true});

  const renderProps = {
    config: props.config,
    packageVersion: packageVersion || null,
    voiceFile: typeof props.voiceFile === 'string' ? props.voiceFile : null,
    audioSegments: Array.isArray(props.audioSegments) ? props.audioSegments : null,
    subtitleData: Array.isArray(props.subtitleData) ? props.subtitleData : null,
    renderFps: Number(props.renderFps) || 30,
    renderWidth: Number(props.renderWidth) || 1920,
    renderHeight: Number(props.renderHeight) || 1080,
    template: 'ultimate',
  };

  if (!props.config || !Array.isArray(props.config.scenes)) {
    console.error('[render-project] Missing Ultimate config.scenes in render props.');
    process.exit(1);
  }

  const inlineProps = inlinePropsMode
    ? {
        propsJson: renderProps,
        propsFile: null,
        durationInFrames: Math.max(1, getUltimateDurationInFrames(renderProps?.config)),
        renderFps: Number(renderProps?.renderFps) || 30,
        renderWidth: Number(renderProps?.renderWidth) || 1920,
        renderHeight: Number(renderProps?.renderHeight) || 1080,
        template: renderProps?.template,
        packageVersion: typeof renderProps?.packageVersion === 'string' ? renderProps.packageVersion : null,
        projectId,
      }
    : await stageRenderPropsFile(PROJECT_ROOT, projectId, renderProps, compositionId);

  const launch = resolveRemotionLaunch(PROJECT_ROOT);
  const remotionArgs = [
    'render',
    'src/Root.tsx',
    compositionId,
    outputPath,
    '--props',
    JSON.stringify(
      inlinePropsMode
        ? inlineProps.propsJson
        : inlineProps,
    ),
  ];
  const preferredRender = buildPreferredRemotionFlags({existingArgs: cleanedPassthroughArgs});

  remotionArgs.push(...preferredRender.flags);

  if (renderPort) {
    remotionArgs.push('--port', renderPort);
  }

  remotionArgs.push(...cleanedPassthroughArgs);

  process.stdout.write(
    [
      `[render-project] projectId=${projectId}`,
      packageVersion ? `[render-project] package-version=${packageVersion}` : '',
      `[render-project] composition=${compositionId}`,
      `[render-project] output=${outputPath}`,
      inlinePropsMode
        ? '[render-project] props-mode=inline'
        : `[render-project] props-file=${inlineProps.propsFile}`,
      `[render-project] cli=${launch.displayCommand}`,
      `[render-project] browser=${preferredRender.browserExecutable ?? 'auto-download'}`,
      renderPort ? `[render-project] port=${renderPort}` : '',
      preferredRender.chromeMode ? `[render-project] chrome-mode=${preferredRender.chromeMode}` : '',
      preferredRender.gl ? `[render-project] gl=${preferredRender.gl}` : '',
      preferredRender.hardwareAcceleration
        ? `[render-project] hardware-acceleration=${preferredRender.hardwareAcceleration}`
        : '',
    ].filter(Boolean).join('\n') + '\n',
  );

  let stderrBuffer = '';

  const child = spawn(launch.command, [...launch.argsPrefix, ...remotionArgs], {
    cwd: PROJECT_ROOT,
    stdio: ['ignore', 'inherit', 'pipe'],
    shell: false,
  });

  child.stderr.on('data', (chunk) => {
    const text = chunk.toString();
    stderrBuffer += text;
    process.stderr.write(text);
  });

  child.on('exit', (code) => {
    if (code && SANDBOX_HINTS.some((hint) => stderrBuffer.includes(hint))) {
      process.stderr.write(
        [
          '',
          '[render-project] Detected browser launch failure before Remotion could render frames.',
          '[render-project] This usually means the current execution environment is blocking Chromium/Chrome startup.',
          `[render-project] Retry in a normal macOS Terminal with: npm run project:render -- ${inputArg} ${outputArg ?? ''}`.trim(),
        ].join('\n') + '\n',
      );
    }

    process.exit(code ?? 1);
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
