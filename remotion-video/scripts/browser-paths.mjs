import {createRequire} from 'node:module';

const require = createRequire(import.meta.url);
const renderDefaults = require('./render-defaults.js');

export const getBrowserCandidates = renderDefaults.getBrowserCandidates;
export const detectPreferredBrowserExecutable = renderDefaults.detectPreferredBrowserExecutable;
export const resolveChromeMode = renderDefaults.resolveChromeMode;
export const resolvePreferredOpenGlRenderer = renderDefaults.resolvePreferredOpenGlRenderer;
export const resolvePreferredHardwareAcceleration = renderDefaults.resolvePreferredHardwareAcceleration;
