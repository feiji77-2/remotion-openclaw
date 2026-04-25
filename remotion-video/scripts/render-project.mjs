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

const getUltimateDurationInFrames = (config) => {
  const scenes = Array.isArray(config?.scenes) ? config.scenes : [];
  return scenes.reduce((sum, scene) => {
    return sum + Math.max(1, Math.round(Number(scene?.durationInFrames) || 1));
  }, 0);
};

const stageRenderPropsFile = async (projectRoot, projectId, renderProps, compositionId) => {
  const propsJson = JSON.stringify(renderProps);
  const hash = crypto.createHash('sha1').update(propsJson).digest('hex').slice(0, 12);
  const relativePath = `/runtime/render-props/${projectId}-${compositionId.toLowerCase()}-${hash}.json`;
  const absolutePath = path.join(projectRoot, 'public', relativePath.replace(/^\//, ''));
  await writeJson(absolutePath, renderProps);

  const defaultDuration = compositionId === 'UltimateSceneTemplate'
    ? getUltimateDurationInFrames(renderProps?.config)
    : Number(renderProps?.durationInFrames) || 0;

  return {
    propsFile: relativePath,
    durationInFrames: Math.max(1, Math.round(defaultDuration || 1)),
    renderFps: Number(renderProps?.renderFps) || 30,
    renderWidth: Number(renderProps?.renderWidth) || (compositionId === 'UltimateSceneTemplate' ? 1920 : 1080),
    renderHeight: Number(renderProps?.renderHeight) || (compositionId === 'UltimateSceneTemplate' ? 1080 : 1920),
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
  const projectId = String(props.projectId || 'project-render').trim() || 'project-render';
  const packageVersion = typeof props.packageVersion === 'string' ? props.packageVersion.trim() : '';
  const versionSuffix = sanitizeVersionForFileName(packageVersion);
  const shouldUseUltimate = (
    String(props.compositionId || '').trim() === 'UltimateSceneTemplate'
      || props.renderTemplate === 'ultimate'
      || props.template === 'ultimate'
      || (props.config && Array.isArray(props.config.scenes))
  );
  const compositionId = shouldUseUltimate ? 'UltimateSceneTemplate' : 'OpenClawVideo';
  const outputPath = outputArg
    ? path.resolve(process.cwd(), outputArg)
    : path.resolve(process.cwd(), 'out', `${projectId}${versionSuffix ? `-v${versionSuffix}` : ''}.mp4`);
  const hasCustomPort = hasCliFlag(passthroughArgs, '--port');
  const renderPort = hasCustomPort
    ? null
    : String(process.env.REMOTION_RENDER_PORT || '3010').trim() || '3010';

  await fs.mkdir(path.dirname(outputPath), {recursive: true});

  const renderProps = compositionId === 'UltimateSceneTemplate'
    ? {
        config: props.config,
        packageVersion: packageVersion || null,
        voiceFile: typeof props.voiceFile === 'string' ? props.voiceFile : null,
        audioSegments: Array.isArray(props.audioSegments) ? props.audioSegments : null,
      }
    : props;

  if (compositionId === 'UltimateSceneTemplate' && (!props.config || !Array.isArray(props.config.scenes))) {
    console.error('[render-project] Missing Ultimate config.scenes in render props.');
    process.exit(1);
  }

  const inlineProps = await stageRenderPropsFile(PROJECT_ROOT, projectId, renderProps, compositionId);

  const launch = resolveRemotionLaunch(PROJECT_ROOT);
  const remotionArgs = [
    'render',
    'src/Root.tsx',
    compositionId,
    outputPath,
    '--props',
    JSON.stringify(inlineProps),
  ];
  const preferredRender = buildPreferredRemotionFlags({existingArgs: passthroughArgs});

  remotionArgs.push(...preferredRender.flags);

  if (renderPort) {
    remotionArgs.push('--port', renderPort);
  }

  remotionArgs.push(...passthroughArgs);

    process.stdout.write(
      [
      `[render-project] projectId=${projectId}`,
      packageVersion ? `[render-project] package-version=${packageVersion}` : '',
      `[render-project] composition=${compositionId}`,
      `[render-project] output=${outputPath}`,
      `[render-project] props-file=${inlineProps.propsFile}`,
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
