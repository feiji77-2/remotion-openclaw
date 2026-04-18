import fs from 'node:fs';

const BROWSER_CANDIDATES = [
  '/Applications/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
];

export const getBrowserCandidates = () => {
  return BROWSER_CANDIDATES.filter((candidate) => fs.existsSync(candidate));
};

const isManagedBrowserExecutable = (browserExecutable) => {
  return /Chrome for Testing|chrome-headless-shell|headless_shell/.test(browserExecutable);
};

export const detectPreferredBrowserExecutable = () => {
  const fromEnv = String(process.env.REMOTION_BROWSER_EXECUTABLE || '').trim();
  if (fromEnv) {
    if (process.env.REMOTION_ALLOW_SYSTEM_BROWSER === '1' || isManagedBrowserExecutable(fromEnv)) {
      return fromEnv;
    }

    return null;
  }

  return null;
};

export const resolveChromeMode = (browserExecutable) => {
  const explicitMode = String(process.env.REMOTION_CHROME_MODE || '').trim();
  if (explicitMode) {
    return explicitMode;
  }

  if (!browserExecutable) {
    return null;
  }

  return /Google Chrome(?: for Testing)?/.test(browserExecutable) ? 'chrome-for-testing' : null;
};
