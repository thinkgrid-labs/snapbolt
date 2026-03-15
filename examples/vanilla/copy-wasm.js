// Copies snapbolt_bg.wasm to the project root so index.html can load it.
// Runs automatically after npm install via the postinstall script.
const fs = require('fs');
const path = require('path');

const src = path.join(
  __dirname,
  'node_modules',
  '@think-grid-labs',
  'snapbolt',
  'pkg',
  'snapbolt_bg.wasm'
);

const dest = path.join(__dirname, 'snapbolt_bg.wasm');

if (fs.existsSync(src)) {
  fs.copyFileSync(src, dest);
  console.log('snapbolt: copied snapbolt_bg.wasm to project root');
} else {
  console.warn('snapbolt: WASM binary not found at', src);
  console.warn('Run: npx @think-grid-labs/snapbolt-cli sync .');
}
