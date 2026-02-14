# @think-grid-labs/opti-assets

A high-performance image optimization toolkit powered by Rust and WebAssembly.

## Packages
- **`@think-grid-labs/opti-assets`**: Unified library for browser and React apps.
- **`@think-grid-labs/opti-assets-cli`**: Native CLI for bulk build-time optimization.

---

## 1. Library: @think-grid-labs/opti-assets
Client-side optimization with React support.

### Installation
```bash
npm install @think-grid-labs/opti-assets
```

### Usage (React)
```tsx
import { useImageOptimizer } from '@think-grid-labs/opti-assets';

const MyComponent = ({ src }) => {
  const { optimizedUrl, loading } = useImageOptimizer(src, 75, 300);
  return <img src={optimizedUrl || src} alt="Optimized" />;
};
```

### Usage (Vanilla JS / Browser)
```ts
import init, { optimize_image_sync } from '@think-grid-labs/opti-assets/browser';

// 1. First, sync the WASM binary to your public folder:
// npx @think-grid-labs/opti-assets-cli sync ./public

// 2. Then initialize and use:
// await init('/opti_assets_bg.wasm'); 
// const optimized = optimize_image_sync(inputBytes, 75, 300);
```

---

## 2. CLI: @think-grid-labs/opti-assets-cli
Native tool for high-speed local image processing and asset management.

### Installation
```bash
npm install -g @think-grid-labs/opti-assets-cli
```

### Usage

#### Optimize Images (Scan)
Recursively optimize images in a directory:
```bash
opti-assets-cli scan ./public
```

#### Sync WASM (Sync)
Automatically copy the WASM binary from `node_modules` to your project's public folder:
```bash
opti-assets-cli sync ./public
```

## Development
This is a Rust + Node.js monorepo. 
- Core Logic: `packages/core`
- Build all: `npm run build`

## License
MIT
