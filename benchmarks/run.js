// Run from the repo root: node benchmarks/run.js ./your-images-dir
// Measures per-image optimization time and size savings using @thinkgrid/snapbolt-cli.
//
// Usage:
//   node benchmarks/run.js                   # scans ./public if it exists
//   node benchmarks/run.js ./path/to/images  # scan a specific directory
//   node benchmarks/run.js --help            # show help

'use strict';

const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');

// ── Help ─────────────────────────────────────────────────────────────────────

if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log(`
Snapbolt benchmark — measures per-image optimization time and size savings.

Usage:
  node benchmarks/run.js [directory]

Arguments:
  directory   Path to a directory containing JPEG/PNG images.
              Defaults to ./public if it exists, otherwise ./examples.

Options:
  --help, -h  Show this message.

Output:
  A table showing original size, optimized size, savings %, and encode time
  for each image, followed by a summary totals row.

Example:
  node benchmarks/run.js ./assets/images
`);
    process.exit(0);
}

// ── Load the native addon ────────────────────────────────────────────────────

let optimizeImage;
try {
    // Try the workspace package first (running from repo root)
    ({ optimizeImage } = require('../packages/cli'));
} catch {
    try {
        ({ optimizeImage } = require('@thinkgrid/snapbolt-cli'));
    } catch {
        console.error(
            'Error: @thinkgrid/snapbolt-cli is not installed.\n' +
            'Run: npm install @thinkgrid/snapbolt-cli\n' +
            'Or run this script from the repo root where packages/cli is available.'
        );
        process.exit(1);
    }
}

// ── Resolve target directory ─────────────────────────────────────────────────

const targetArg = process.argv[2];
let targetDir;

if (targetArg && !targetArg.startsWith('--')) {
    targetDir = path.resolve(targetArg);
} else if (fs.existsSync(path.resolve('public'))) {
    targetDir = path.resolve('public');
} else if (fs.existsSync(path.resolve('examples'))) {
    targetDir = path.resolve('examples');
} else {
    console.error(
        'No image directory found.\n' +
        'Usage: node benchmarks/run.js ./path/to/images'
    );
    process.exit(1);
}

if (!fs.existsSync(targetDir)) {
    console.error(`Directory not found: ${targetDir}`);
    process.exit(1);
}

// ── Collect image files (recursive) ──────────────────────────────────────────

const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png']);

function collectImages(dir, results = []) {
    let entries;
    try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
        return results;
    }
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            collectImages(fullPath, results);
        } else if (entry.isFile()) {
            const ext = path.extname(entry.name).toLowerCase();
            if (IMAGE_EXTS.has(ext)) {
                results.push(fullPath);
            }
        }
    }
    return results;
}

const images = collectImages(targetDir);

if (images.length === 0) {
    console.log(`No JPEG or PNG images found in: ${targetDir}`);
    process.exit(0);
}

// ── Run benchmarks ────────────────────────────────────────────────────────────

const QUALITY = 80;
const COL = { file: 36, orig: 10, opt: 10, savings: 9, time: 10 };

function padEnd(str, len) { return String(str).padEnd(len); }
function padStart(str, len) { return String(str).padStart(len); }
function fmtBytes(n) {
    if (n >= 1024 * 1024) return (n / (1024 * 1024)).toFixed(1) + ' MB';
    if (n >= 1024) return (n / 1024).toFixed(0) + ' KB';
    return n + ' B';
}
function fmtPct(orig, opt) {
    const pct = ((orig - opt) / orig) * 100;
    return pct.toFixed(1) + '%';
}

const header = [
    padEnd('File', COL.file),
    padStart('Original', COL.orig),
    padStart('Optimized', COL.opt),
    padStart('Savings', COL.savings),
    padStart('Time (ms)', COL.time),
].join('  ');

const divider = '-'.repeat(header.length);

console.log(`\nSnapbolt benchmark — quality=${QUALITY}, WebP output`);
console.log(`Directory: ${targetDir}`);
console.log(`\n${divider}`);
console.log(header);
console.log(divider);

let totalOrig = 0;
let totalOpt = 0;
let totalTime = 0;
let skipped = 0;

for (const imgPath of images) {
    const relPath = path.relative(targetDir, imgPath);
    const displayName = relPath.length > COL.file - 1
        ? '…' + relPath.slice(-(COL.file - 2))
        : relPath;

    let inputBuffer;
    try {
        inputBuffer = fs.readFileSync(imgPath);
    } catch (err) {
        console.log(`  [skip] ${relPath} — cannot read: ${err.message}`);
        skipped++;
        continue;
    }

    const origSize = inputBuffer.length;

    const t0 = performance.now();
    let outputBuffer;
    try {
        outputBuffer = optimizeImage(inputBuffer, QUALITY);
    } catch (err) {
        console.log(`  [skip] ${relPath} — optimize failed: ${err.message}`);
        skipped++;
        continue;
    }
    const elapsed = (performance.now() - t0).toFixed(1);

    const optSize = outputBuffer.length;
    totalOrig += origSize;
    totalOpt += optSize;
    totalTime += parseFloat(elapsed);

    console.log([
        padEnd(displayName, COL.file),
        padStart(fmtBytes(origSize), COL.orig),
        padStart(fmtBytes(optSize), COL.opt),
        padStart(fmtPct(origSize, optSize), COL.savings),
        padStart(elapsed + ' ms', COL.time),
    ].join('  '));
}

// ── Summary ───────────────────────────────────────────────────────────────────

console.log(divider);

const processed = images.length - skipped;
if (processed > 0) {
    console.log([
        padEnd(`TOTAL (${processed} images)`, COL.file),
        padStart(fmtBytes(totalOrig), COL.orig),
        padStart(fmtBytes(totalOpt), COL.opt),
        padStart(fmtPct(totalOrig, totalOpt), COL.savings),
        padStart((totalTime / processed).toFixed(1) + ' ms avg', COL.time),
    ].join('  '));
}

if (skipped > 0) {
    console.log(`\n${skipped} file(s) skipped due to errors.`);
}

console.log();
