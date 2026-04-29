#!/usr/bin/env node
/**
 * deploy-lambda.mjs — Remotion Lambda 部署 + 渲染脚本
 *
 * 用法:
 *   node scripts/deploy-lambda.mjs deploy               部署 site + function
 *   node scripts/deploy-lambda.mjs render [...]         部署并渲染
 *   node scripts/deploy-lambda.mjs status              查看渲染进度
 *   node scripts/deploy-lambda.mjs list-sites           列出已部署 site
 *   node scripts/deploy-lambda.mjs list-functions      列出已部署 function
 *   node scripts/deploy-lambda.mjs regions             列出可用 region
 *   node scripts/deploy-lambda.mjs info                显示保存的部署信息
 *
 * 示例:
 *   node scripts/deploy-lambda.mjs deploy --region us-east-1
 *   node scripts/deploy-lambda.mjs render \
 *     --site gpt55-final-cut \
 *     --props-file projects/gpt55-final-cut/render-props.json \
 *     --composition UltimateSceneTemplate
 */

import { deploySite, deployFunction, getRegions, getSites, getFunctions, getRenderProgress, renderMediaOnLambda } from '@remotion/lambda';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// ---------------------------------------------------------------------------
// Args
// ---------------------------------------------------------------------------

const argv = process.argv.slice(2);
const args = {};

for (let i = 0; i < argv.length; i++) {
  if (argv[i].startsWith('--')) {
    const key = argv[i].replace(/^--/, '');
    const next = argv[i + 1];
    args[key] = (next && !next.startsWith('--')) ? next : true;
    if (args[key] !== true) i++;
  } else if (!argv[i].startsWith('-')) {
    args._ = args._ || [];
    args._.push(argv[i]);
  }
}

const REGION       = args.region       || process.env.REMOTION_LAMBDA_REGION       || 'us-east-1';
const MEMORY       = Number(args.memory || process.env.REMOTION_LAMBDA_MEMORY       || 2048);
const TIMEOUT      = Number(args.timeout || process.env.REMOTION_LAMBDA_TIMEOUT    || 900);
const DISK         = Number(args.disk   || process.env.REMOTION_LAMBDA_DISK       || 2048);
const COMPOSITION  = args.composition  || 'UltimateSceneTemplate';
const PROPS_FILE    = args['props-file'] || null;
const CRF          = Number(args.crf     || 23);
const CONCURRENCY  = Number(args.concurrency || 4);
const PRIVACY      = args.privacy || 'public';
const ENTRY        = args['entry-point'] || './src/Root.tsx';
const OUT_NAME     = args['out-name']    || null;
const FPL          = args['frames-per-lambda'] ? Number(args['frames-per-lambda']) : null;
const FUNC_NAME    = args['function-name'] || null;
const SITE_ARG     = args.site || args['serve-url'] || null;

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function loadProps(filePath) {
  const abs = resolve(ROOT, filePath);
  if (!existsSync(abs)) {
    throw new Error('Props file not found: ' + abs);
  }
  try {
    return JSON.parse(readFileSync(abs, 'utf8'));
  } catch (e) {
    throw new Error('Failed to parse props: ' + e.message);
  }
}

function saveJson(filePath, data) {
  writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function log(label, value) {
  if (value !== undefined) {
    console.log('  ' + label + ': ' + value);
  } else {
    console.log('  ' + label);
  }
}

async function pollProgress(renderId, bucketName, region) {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  let lastPhase = '';

  while (true) {
    try {
      const prog = await getRenderProgress({ renderId, bucketName, region });
      let phase = 'PROCESSING';
      if (prog.fatalErrorEncountered) phase = 'ERROR';
      else if (prog.done) phase = 'DONE';
      else if (prog.quotaExceeded) phase = 'QUOTA_EXCEEDED';
      else phase = String(prog.phase || 'PROCESSING').toUpperCase();

      if (phase !== lastPhase) {
        console.log('  [' + new Date().toISOString() + '] ' + phase);
        lastPhase = phase;
      } else {
        process.stdout.write('. ');
      }

      if (prog.done) {
        console.log('\n\n  Render complete');
        log('Render ID', renderId);
        log('Bucket', bucketName);
        log('Output', prog.outputFile || 'see CloudWatch logs');
        log('CloudWatch', prog.cloudWatchLogs);
        break;
      }
      if (prog.fatalErrorEncountered) {
        console.log('\n\n  Render failed');
        console.log('  ' + JSON.stringify(prog.fatalError));
        break;
      }
      if (prog.quotaExceeded) {
        console.log('\n\n  AWS Lambda quota exceeded');
        break;
      }
    } catch (e) {
      console.log('\n  Poll error: ' + (e.message || String(e)));
    }
    await sleep(5000);
  }
}

// ---------------------------------------------------------------------------
// Deploy
// ---------------------------------------------------------------------------

async function cmdDeploy() {
  console.log('\n--- Deploy ---');
  log('Region', REGION);
  log('Memory', MEMORY + 'MB');
  log('Timeout', TIMEOUT + 's');
  log('Disk', DISK + 'MB');
  log('Privacy', PRIVACY);
  log('Entry', ENTRY);

  console.log('\n--- Step 1/2: Deploy render function ---');
  const funcResult = await deployFunction({
    region: REGION,
    memorySizeInMb: MEMORY,
    timeoutInSeconds: TIMEOUT,
    diskSizeInMb: DISK,
    createCloudWatchLogGroup: true,
    cloudWatchLogRetentionPeriodInDays: 3,
  });
  console.log('  Done. Function: ' + funcResult.functionName);
  log('Already existed', String(funcResult.alreadyExisted));

  console.log('\n--- Step 2/2: Deploy Remotion site ---');
  const siteResult = await deploySite({
    entryPoint: ENTRY,
    region: REGION,
    siteName: args['site-name'] || undefined,
    privacy: PRIVACY,
  });
  console.log('  Done. Site: ' + siteResult.serveUrl);
  log('Site name', siteResult.siteName);
  log('Uploaded files', String(siteResult.stats.uploadedFiles));
  log('Deleted files', String(siteResult.stats.deletedFiles));

  const info = {
    deployedAt: new Date().toISOString(),
    region: REGION,
    functionName: funcResult.functionName,
    serveUrl: siteResult.serveUrl,
    siteName: siteResult.siteName,
    composition: COMPOSITION,
    memory: MEMORY,
    timeout: TIMEOUT,
    disk: DISK,
  };
  saveJson(join(ROOT, '.lambda-deploy-info.json'), info);
  console.log('\n  Saved to .lambda-deploy-info.json');

  console.log('\n--- Next steps ---');
  console.log('  Render:');
  console.log('    node scripts/deploy-lambda.mjs render \\');
  console.log('      --site-name ' + siteResult.siteName + ' \\');
  console.log('      --function-name ' + funcResult.functionName + ' \\');
  console.log('      --composition ' + COMPOSITION + ' \\');
  console.log('      --props-file <project>/render-props.json');
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

async function cmdRender() {
  // Load props
  let inputProps = {};
  if (PROPS_FILE) {
    inputProps = loadProps(PROPS_FILE);
  }

  // Resolve serveUrl and functionName
  let serveUrl = SITE_ARG;
  let functionName = FUNC_NAME;

  const infoPath = join(ROOT, '.lambda-deploy-info.json');
  if (existsSync(infoPath)) {
    const info = JSON.parse(readFileSync(infoPath, 'utf8'));
    if (!serveUrl) {
      serveUrl = info.serveUrl;
      console.log('\n  Using serveUrl from previous deploy: ' + serveUrl);
    }
    if (!functionName) {
      functionName = info.functionName;
      console.log('  Using functionName from previous deploy: ' + functionName);
    }
  }

  if (!serveUrl) {
    console.error('\n  Missing --site (or --serve-url). Run "deploy" first.');
    process.exit(1);
  }
  if (!functionName) {
    // Pick most recent function
    const funcs = await getFunctions({ region: REGION });
    if (funcs.length === 0) {
      console.error('\n  No Remotion functions found in region ' + REGION);
      console.error('  Run "deploy" first.');
      process.exit(1);
    }
    const sorted = [...funcs].sort((a, b) => String(b.LastModified || '').localeCompare(String(a.LastModified || '')));
    console.log('\n  Available functions in ' + REGION + ':');
    sorted.forEach(function(f) {
      console.log('    ' + f.FunctionName + ' (' + f.MemorySize + 'MB, ' + f.Timeout + 's, modified ' + f.LastModified + ')');
    });
    functionName = sorted[0].FunctionName;
    console.log('  Using: ' + functionName);
  }

  // Resolve siteName -> serveUrl if needed
  if (!serveUrl.startsWith('https://')) {
    const sites = await getSites({ region: REGION });
    const found = sites.find(function(s) { return s.SiteName === serveUrl || s.SiteName.indexOf(serveUrl) !== -1; });
    if (!found) {
      console.error('\n  Site not found: ' + serveUrl);
      process.exit(1);
    }
    serveUrl = found.Url;
  }

  console.log('\n--- Lambda Render ---');
  log('Region', REGION);
  log('Site', serveUrl);
  log('Function', functionName);
  log('Composition', COMPOSITION);
  log('CRF', String(CRF));
  log('Concurrency', String(CONCURRENCY));
  if (PROPS_FILE) log('Props file', PROPS_FILE);

  const renderOptions = {
    region: REGION,
    functionName: functionName,
    serveUrl: serveUrl,
    composition: COMPOSITION,
    inputProps: inputProps,
    codec: 'h264',
    crf: CRF,
    concurrency: CONCURRENCY,
    privacy: PRIVACY,
    overwrite: true,
  };
  if (FPL) renderOptions.framesPerLambda = FPL;
  if (OUT_NAME) renderOptions.outName = OUT_NAME;
  if (args['force-width'])  renderOptions.forceWidth  = Number(args['force-width']);
  if (args['force-height']) renderOptions.forceHeight = Number(args['force-height']);
  if (args['force-fps'])    renderOptions.forceFps    = Number(args['force-fps']);
  if (args['frame-range'])  renderOptions.frameRange  = args['frame-range'];
  if (args['every-nth-frame']) renderOptions.everyNthFrame = Number(args['every-nth-frame']);
  if (args.env) {
    const envVars = {};
    args.env.split(',').forEach(function(e) {
      var parts = e.split('=');
      envVars[parts[0].trim()] = parts[1].trim();
    });
    renderOptions.envVariables = envVars;
  }
  if (args.webhook) {
    renderOptions.webhook = { url: args.webhook, secret: args['webhook-secret'] || 'secret' };
  }

  console.log('\n--- Step 1/2: Start render ---');
  const result = await renderMediaOnLambda(renderOptions);
  console.log('  Done. Render ID: ' + result.renderId);
  log('Bucket', result.bucketName);
  log('CloudWatch', result.cloudWatchLogs);

  console.log('\n--- Step 2/2: Monitoring (Ctrl+C to detach) ---');
  await pollProgress(result.renderId, result.bucketName, REGION);

  const renderInfo = {
    renderId: result.renderId,
    bucketName: result.bucketName,
    region: REGION,
    serveUrl: serveUrl,
    functionName: functionName,
    composition: COMPOSITION,
    startedAt: new Date().toISOString(),
    cloudWatchLogs: result.cloudWatchLogs,
    cloudWatchMainLogs: result.cloudWatchMainLogs,
  };
  saveJson(join(ROOT, '.lambda-render-info.json'), renderInfo);
  console.log('\n  Saved to .lambda-render-info.json');
}

// ---------------------------------------------------------------------------
// Status
// ---------------------------------------------------------------------------

async function cmdStatus() {
  const infoPath = join(ROOT, '.lambda-render-info.json');
  if (args._ && args._.length > 0) {
    const renderId = args._[0];
    const bucketName = args.bucket || null;
    if (!bucketName) {
      console.error('  Missing --bucket <bucket-name>');
      process.exit(1);
    }
    await pollProgress(renderId, bucketName, REGION);
    return;
  }
  if (existsSync(infoPath)) {
    const info = JSON.parse(readFileSync(infoPath, 'utf8'));
    console.log('\n--- Saved render info ---');
    Object.keys(info).forEach(function(k) { log(k, info[k]); });
    console.log('');
    await pollProgress(info.renderId, info.bucketName, info.region);
    return;
  }
  console.error('\n  No renderId specified and no saved info.');
  console.error('  Usage: deploy-lambda.mjs status <render-id> --bucket <bucket>');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// List sites
// ---------------------------------------------------------------------------

async function cmdListSites() {
  console.log('\n--- Sites in ' + REGION + ' ---');
  const sites = await getSites({ region: REGION });
  if (sites.length === 0) {
    console.log('  (none)');
  } else {
    sites.forEach(function(s) {
      console.log('  ' + s.SiteName);
      console.log('    URL  : ' + s.Url);
      console.log('    Date: ' + s.Created);
      console.log('');
    });
  }
}

// ---------------------------------------------------------------------------
// List functions
// ---------------------------------------------------------------------------

async function cmdListFunctions() {
  console.log('\n--- Functions in ' + REGION + ' ---');
  const funcs = await getFunctions({ region: REGION });
  if (funcs.length === 0) {
    console.log('  (none)');
  } else {
    funcs.forEach(function(f) {
      console.log('  ' + f.FunctionName);
      console.log('    Memory: ' + f.MemorySize + 'MB  Timeout: ' + f.Timeout + 's');
      console.log('    Last modified: ' + f.LastModified);
      console.log('');
    });
  }
}

// ---------------------------------------------------------------------------
// Regions
// ---------------------------------------------------------------------------

async function cmdRegions() {
  const regions = await getRegions();
  console.log('\n--- Available AWS Regions ---');
  regions.forEach(function(r) { console.log('  ' + r); });
  console.log('\n  Default: ' + REGION);
  console.log('  Override with --region or REMOTION_LAMBDA_REGION');
}

// ---------------------------------------------------------------------------
// Info
// ---------------------------------------------------------------------------

function cmdInfo() {
  const deployPath = join(ROOT, '.lambda-deploy-info.json');
  const renderPath = join(ROOT, '.lambda-render-info.json');
  console.log('\n--- Deployment Info ---');
  if (existsSync(deployPath)) {
    const info = JSON.parse(readFileSync(deployPath, 'utf8'));
    Object.keys(info).forEach(function(k) { log(k, info[k]); });
  } else {
    console.log('  (none — run "deploy" first)');
  }
  console.log('\n--- Render Info ---');
  if (existsSync(renderPath)) {
    const info = JSON.parse(readFileSync(renderPath, 'utf8'));
    Object.keys(info).forEach(function(k) { log(k, info[k]); });
  } else {
    console.log('  (none — run "render" first)');
  }
}

// ---------------------------------------------------------------------------
// Help
// ---------------------------------------------------------------------------

function printHelp() {
  console.log('\nUsage: deploy-lambda.mjs <command>\n');
  console.log('Commands:');
  console.log('  deploy             Deploy site + function (no render)');
  console.log('  render             Deploy and start render');
  console.log('  status [id]        Check render progress');
  console.log('  list-sites         List deployed sites');
  console.log('  list-functions     List deployed functions');
  console.log('  regions            List available AWS regions');
  console.log('  info               Show saved deployment info');
  console.log('');
  console.log('Options:');
  console.log('  --region <r>           AWS region (default: us-east-1)');
  console.log('  --props-file <path>    Path to render-props.json');
  console.log('  --composition <id>     Composition ID (default: UltimateSceneTemplate)');
  console.log('  --site <name|URL>      Site name or serveUrl');
  console.log('  --function-name <name> Lambda function name');
  console.log('  --crf <n>              CRF quality (default: 23)');
  console.log('  --concurrency <n>      Lambda concurrency (default: 4)');
  console.log('  --memory <mb>          Lambda memory (default: 2048)');
  console.log('  --timeout <sec>        Lambda timeout (default: 900)');
  console.log('  --disk <mb>            Ephemeral disk (default: 2048)');
  console.log('  --privacy <pub|priv>   Site privacy (default: public)');
  console.log('  --frames-per-lambda <n> Frames per Lambda call');
  console.log('  --out-name <name>      Output filename in S3');
  console.log('  --entry-point <path>    Remotion entry (default: ./src/Root.tsx)');
  console.log('  --env KEY=val,...      Environment variables');
  console.log('  --webhook <url>        Webhook for completion');
  console.log('  --site-name <name>     Custom site name prefix');
  console.log('');
  console.log('Examples:');
  console.log('  # Deploy function + site');
  console.log('  node scripts/deploy-lambda.mjs deploy --region us-east-1');
  console.log('');
  console.log('  # Render with a project');
  console.log('  node scripts/deploy-lambda.mjs render \\');
  console.log('    --site gpt55-final-cut \\');
  console.log('    --props-file projects/gpt55-final-cut/render-props.json \\');
  console.log('    --composition UltimateSceneTemplate');
  console.log('');
  console.log('  # Check status');
  console.log('  node scripts/deploy-lambda.mjs status');
  console.log('');
  console.log('Env vars: REMOTION_LAMBDA_REGION, REMOTION_LAMBDA_MEMORY,');
  console.log('          REMOTION_LAMBDA_TIMEOUT, REMOTION_LAMBDA_DISK');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const COMMANDS = {
  deploy:          cmdDeploy,
  render:          cmdRender,
  status:          cmdStatus,
  'list-sites':    cmdListSites,
  'list-functions': cmdListFunctions,
  regions:         cmdRegions,
  info:            cmdInfo,
};

async function main() {
  const cmd = args._ && args._[0];
  if (!cmd || cmd === 'help' || cmd === '-h' || cmd === '--help') {
    printHelp();
    process.exit(0);
  }
  const fn = COMMANDS[cmd];
  if (!fn) {
    console.error('Unknown command: ' + cmd);
    console.error('Available: ' + Object.keys(COMMANDS).join(', '));
    process.exit(1);
  }
  try {
    await fn();
  } catch (e) {
    console.error('\nError: ' + (e.message || String(e)));
    if (process.env.DEBUG) console.error(e.stack);
    process.exit(1);
  }
}

main();
