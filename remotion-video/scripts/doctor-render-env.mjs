#!/usr/bin/env node

import {spawn} from 'node:child_process';
import {detectPreferredBrowserExecutable, getBrowserCandidates} from './browser-paths.mjs';

const candidates = getBrowserCandidates();
const configuredBrowser = detectPreferredBrowserExecutable();
const preferredBrowser = configuredBrowser || candidates[0] || null;

const run = (command, args, timeoutMs = 10000) => {
  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';
    const child = spawn(command, args, {
      cwd: process.cwd(),
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: false,
    });

    const timeout = setTimeout(() => {
      child.kill('SIGKILL');
      resolve({ok: false, timedOut: true, code: null, signal: 'SIGKILL', stdout, stderr});
    }, timeoutMs);

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('exit', (code, signal) => {
      clearTimeout(timeout);
      resolve({ok: code === 0, timedOut: false, code, signal, stdout, stderr});
    });

    child.on('error', (error) => {
      clearTimeout(timeout);
      stderr += String(error?.message || error);
      resolve({ok: false, timedOut: false, code: null, signal: null, stdout, stderr});
    });
  });
};

async function main() {
  process.stdout.write(`Detected browsers:\n${candidates.map((item) => `- ${item}`).join('\n') || '- none'}\n`);

  if (!preferredBrowser) {
    process.stderr.write('No local browser executable found. Install Chrome/Chromium or set REMOTION_BROWSER_EXECUTABLE.\n');
    process.exit(1);
  }

  process.stdout.write(
    configuredBrowser
      ? `\nTesting configured browser:\n- ${preferredBrowser}\n`
      : `\nTesting first available browser candidate (set REMOTION_BROWSER_EXECUTABLE to make this explicit):\n- ${preferredBrowser}\n`,
  );

  const result = await run(preferredBrowser, [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--disable-breakpad',
    '--disable-crash-reporter',
    '--dump-dom',
    'about:blank',
  ]);

  process.stdout.write(`\nResult:\n${JSON.stringify(result, null, 2)}\n`);

  if (result.ok) {
    process.stdout.write('\nRender environment looks healthy for browser startup.\n');
    process.exit(0);
  }

  const combined = `${result.stdout}\n${result.stderr}`;
  if (
    /MachPortRendezvousServer|Permission denied \(1100\)|Sandbox\(Signal\(6\)\)/.test(combined) ||
    result.signal === 'SIGABRT'
  ) {
    process.stderr.write('\nDiagnosis: the current execution environment is blocking Chromium/Chrome startup before Remotion can render.\n');
  } else {
    process.stderr.write('\nDiagnosis: browser startup failed, but not with the known Codex sandbox signature. Inspect stderr above.\n');
  }

  process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
