#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {measureVideoProductSpec} from "./lib/video-product-metrics.mjs";

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);

const usage = () => {
  console.error("Usage: node scripts/video-product-metrics.mjs <video-product.json> [--out report.json] [--strict]");
};

const valueFor = (flag, fallback = null) => {
  const direct = args.find((arg) => arg.startsWith(`${flag}=`));
  if (direct) return direct.slice(flag.length + 1);
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : fallback;
};

if (args.includes("--help") || args.includes("-h")) {
  usage();
  process.exit(0);
}

const input = args.find((arg) => !arg.startsWith("--"));
if (!input) {
  usage();
  process.exit(1);
}

const inputPath = path.resolve(PROJECT_ROOT, input);
const spec = JSON.parse(fs.readFileSync(inputPath, "utf8"));
const report = {
  ...measureVideoProductSpec(spec),
  inputs: {spec: path.relative(PROJECT_ROOT, inputPath).split(path.sep).join("/")},
};
const output = `${JSON.stringify(report, null, 2)}\n`;
const outPath = valueFor("--out");
if (outPath) {
  const resolvedOut = path.resolve(PROJECT_ROOT, outPath);
  fs.mkdirSync(path.dirname(resolvedOut), {recursive: true});
  fs.writeFileSync(resolvedOut, output, "utf8");
  console.log(JSON.stringify({
    ok: report.ok,
    report: path.relative(PROJECT_ROOT, resolvedOut).split(path.sep).join("/"),
    errors: report.errors.length,
    warnings: report.warnings.length,
  }, null, 2));
} else {
  process.stdout.write(output);
}

if (args.includes("--strict") && !report.ok) {
  process.exitCode = 1;
}
