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

### Usage (Vanilla JS)
```ts
import init, { optimize_image_sync } from '@think-grid-labs/opti-assets/browser';
// ... await init(); optimize_image_sync(bytes, quality, width);
```

---

## 2. CLI: @think-grid-labs/opti-assets-cli
Native tool for high-speed local image processing.

### Installation
```bash
npm install -g @think-grid-labs/opti-assets-cli
```

### Usage
```bash
opti-assets-cli scan ./public
```

## Development
This is a Rust + Node.js monorepo. 
- Core Logic: `packages/core`
- Build all: `npm run build`

## License
MIT
