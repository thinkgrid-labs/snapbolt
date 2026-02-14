# @think-grid-labs/opti-assets

A high-performance image optimization toolkit powered by Rust and WebAssembly.

## Overview
This toolkit provides professional-grade image optimization (resizing and JPEG/WebP encoding) that runs entirely on the client side.

## Quick Start

### 1. Install
```bash
npm install @think-grid-labs/opti-assets
```

### 2. Sync WASM Binary
You must ensure the `.wasm` file is available in your project's `public` folder:
```bash
npx @think-grid-labs/opti-assets-cli sync ./public
```

### 3. Use with React
```tsx
import { useImageOptimizer } from '@think-grid-labs/opti-assets';

const SmartImage = ({ src }) => {
  const { optimizedUrl, loading } = useImageOptimizer(src, 75, 300);
  return <img src={optimizedUrl || src} alt="Optimized" />;
};
```

## Features
- **Client-Side Optimization**: Zero server cost.
- **Blazing Fast**: Powered by a Rust core.
- **React Ready**: Easy-to-use hooks.

For full documentation, visit our [GitHub Repository](https://github.com/ThinkGrid-Labs/opti-assets).
