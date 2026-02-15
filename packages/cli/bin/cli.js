#!/usr/bin/env node

const { optimizeDirectory } = require('../index');
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const command = args[0];

if (!command || command === '--help' || command === '-h') {
    console.log(`
@think-grid-labs/snapbolt-cli v${require('../package.json').version}

Usage:
  snapbolt-cli scan <dir>    - Recursively optimize images in a directory
  snapbolt-cli sync <dir>    - Sync WASM binary to your public folder
  `);
    process.exit(0);
}

if (command === 'scan') {
    const targetDir = args[1] || '.';
    console.log(`🚀 Optimizing images in ${path.resolve(targetDir)}...`);
    const count = optimizeDirectory(targetDir);
    console.log(`✅ Done! Optimized ${count} images.`);
} else if (command === 'sync') {
    const targetDir = args[1];
    if (!targetDir) {
        console.error('❌ Error: Please specify a target directory (e.g., ./public)');
        process.exit(1);
    }

    try {
        // 1. Resolve the path to the WASM package
        const wasmPkgPath = path.dirname(require.resolve('@think-grid-labs/snapbolt/package.json', { paths: [process.cwd(), __dirname] }));
        const wasmSource = path.join(wasmPkgPath, 'pkg', 'snapbolt_bg.wasm');

        if (!fs.existsSync(wasmSource)) {
            throw new Error(`WASM binary not found at ${wasmSource}`);
        }

        // 2. Ensure target exists
        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }

        // 3. Copy file
        const dest = path.join(targetDir, 'snapbolt_bg.wasm');
        fs.copyFileSync(wasmSource, dest);

        console.log(`✅ Successfully synced WASM binary to: ${dest}`);
        console.log(`💡 Note: Ensure your hook points to this location in production.`);

    } catch (err) {
        console.error(`❌ Error: ${err.message}`);
        console.log('\nTip: Make sure @think-grid-labs/snapbolt is installed in your project.');
        process.exit(1);
    }
} else {
    console.error(`❌ Unknown command: ${command}`);
    process.exit(1);
}
