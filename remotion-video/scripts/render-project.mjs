#!/usr/bin/env node

import {existsSync} from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {detectPreferredBrowserExecutable, resolveChromeMode} from './browser-paths.mjs';

const hasCliFlag = (args, flag) => {
  return args.some((arg, index) => {
    return arg === flag || arg.startsWith(`${flag}=`) || (index > 0 && args[index - 1] === flag);
  });
};

const loadJson = async (filePath) => {
  const content = await fs.readFile(filePath, 'utf8');
  return JSON.parse(content);
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

async function main() {
  const inputArg = process.argv[2];
  const outputArg = process.argv[3];
  const passthroughArgs = process.argv.slice(4);

  if (!inputArg) {
    console.error('Usage: node scripts/render-project.mjs <render-props-json> [output-path] [...remotion-flags]');
    process.exit(1);
  }

  const propsPath = path.resolve(process.cwd(), inputArg);
  const props = await loadJson(propsPath);
  const projectId = String(props.projectId || 'project-render').trim() || 'project-render';
  const shouldUseUltimate = (
    String(props.compositionId || '').trim() === 'UltimateSceneTemplate'
      || props.renderTemplate === 'ultimate'
      || props.template === 'ultimate'
      || (props.config && Array.isArray(props.config.scenes))
  );
  const compositionId = shouldUseUltimate ? 'UltimateSceneTemplate' : 'OpenClawVideo';
  const outputPath = outputArg
    ? path.resolve(process.cwd(), outputArg)
    : path.resolve(process.cwd(), 'out', `${projectId}.mp4`);
  const requestedBrowserExecutable = String(process.env.REMOTION_BROWSER_EXECUTABLE || '').trim();
  const browserExecutable = detectPreferredBrowserExecutable();
  const chromeMode = resolveChromeMode(browserExecutable);
  const hasCustomPort = hasCliFlag(passthroughArgs, '--port');
  const renderPort = hasCustomPort
    ? null
    : String(process.env.REMOTION_RENDER_PORT || '3010').trim() || '3010';

  await fs.mkdir(path.dirname(outputPath), {recursive: true});

  const renderProps = compositionId === 'UltimateSceneTemplate'
    ? {
        config: props.config,
        voiceFile: typeof props.voiceFile === 'string' ? props.voiceFile : null,
        audioSegments: Array.isArray(props.audioSegments) ? props.audioSegments : null,
      }
    : props;

  if (compositionId === 'UltimateSceneTemplate' && (!props.config || !Array.isArray(props.config.scenes))) {
    console.error('[render-project] Missing Ultimate config.scenes in render props.');
    process.exit(1);
  }

  const launch = resolveRemotionLaunch(process.cwd());
  const remotionArgs = [
    'render',
    'src/Root.tsx',
    compositionId,
    outputPath,
    '--props',
    JSON.stringify(renderProps),
  ];

  if (browserExecutable) {
    remotionArgs.push('--browser-executable', browserExecutable);
  }

  if (chromeMode) {
    remotionArgs.push('--chrome-mode', chromeMode);
  }

  if (renderPort) {
    remotionArgs.push('--port', renderPort);
  }

  remotionArgs.push(...passthroughArgs);

    process.stdout.write(
      [
      `[render-project] projectId=${projectId}`,
      `[render-project] composition=${compositionId}`,
      `[render-project] output=${outputPath}`,
      `[render-project] cli=${launch.displayCommand}`,
      `[render-project] browser=${browserExecutable ?? 'auto-download'}`,
      renderPort ? `[render-project] port=${renderPort}` : '',
      chromeMode ? `[render-project] chrome-mode=${chromeMode}` : '',
      requestedBrowserExecutable && !browserExecutable
        ? '[render-project] ignored system browser path and using Remotion-managed browser (set REMOTION_ALLOW_SYSTEM_BROWSER=1 to force it)'
        : '',
    ].filter(Boolean).join('\n') + '\n',
  );

  let stderrBuffer = '';

  const child = spawn(launch.command, [...launch.argsPrefix, ...remotionArgs], {
    cwd: process.cwd(),
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
