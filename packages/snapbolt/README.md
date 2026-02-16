# @think-grid-labs/snapbolt

A high-performance image optimization toolkit powered by Rust and WebAssembly.

## Overview
This toolkit provides professional-grade image optimization (resizing and JPEG/WebP encoding) that runs entirely on the client side. No server costs, no API keys.

## Quick Start

### 1. Install
```bash
npm install @think-grid-labs/snapbolt
```

### 2. Setup WASM
You need to make the `.wasm` file available to your browser.
**Option A: Automatic (CLI)**
```bash
npx @think-grid-labs/snapbolt-cli sync ./public
```
**Option B: Manual**
Copy `node_modules/@think-grid-labs/snapbolt/pkg/snapbolt_bg.wasm` to your `public` folder.

### 3. Usage
```tsx
import { useImageOptimizer } from '@think-grid-labs/snapbolt';

const SmartImage = ({ src }) => {
  const { optimizedUrl, loading, error } = useImageOptimizer(src, {
    quality: 80,
    width: 1920, // Check "Memory Safety" below
    cache: true,
  });

  if (loading) return <div className="skeleton" />;
  if (error) return <img src={src} />; // Fallback to original

  return <img src={optimizedUrl || src} alt="Optimized" />;
};
```

## Advanced Configuration

### 1. Cross-Origin Images (S3 / CDN)
**Problem:** Browsers block `fetch()` on cross-origin images by default (CORS).
**Solution:**
1.  **Configure S3/CDN:** Add `Access-Control-Allow-Origin: *` header to your bucket.
2.  **Enable in Snapbolt:**
    ```tsx
    useImageOptimizer(imageUrl, { crossOrigin: 'anonymous' })
    ```

### 2. WASM Loading & Bundlers
If your bundler (Vite, Next.js, Webpack) struggles to find the WASM file, you can explicitly tell Snapbolt where to find it.
```tsx
useImageOptimizer(src, { 
    wasmUrl: '/snapbolt_bg.wasm' // Path to file in public/ folder
})
```

### 3. Memory Safety (Large Images)
Optimizing 4K/8K images in WASM can crash mobile browsers due to memory limits.
**Best Practice:** Always provide a `width` or `height` to downscale the image *before* processing.
```tsx
useImageOptimizer(src, { 
    width: 1200, // Resize to 1200px width (auto height) BEFORE optimizing
})
```

### 4. Caching
Snapbolt automatically caches optimized results in the browser's Cache API (`snapbolt-v1`).
- **Enabled by default.**
- To disable: `useImageOptimizer(src, { cache: false })`

### 5. Supported File Types
Core supports: **JPEG, PNG, WebP**.
- Unsupported types (GIF, SVG, TIFF) are **automatically detected** and skipped (returns original URL).

## Features
- **Client-Side Optimization**: Zero server cost.
- **Blazing Fast**: Powered by a Rust core.
- **Memory Safe**: Smart pre-resizing.
- **React Ready**: Easy-to-use hooks.

For full documentation, visit our [GitHub Repository](https://github.com/ThinkGrid-Labs/snapbolt).
