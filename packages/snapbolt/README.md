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

#### Next.js Integration
If you see `Module not found` errors, you need to transpile the package.
1.  **Update `next.config.js` or `next.config.ts`**:
    ```ts
    const nextConfig = {
      transpilePackages: ['@think-grid-labs/snapbolt'],
      // ...
    }
    ```
2.  **Sync WASM to Public**:
    Run this command to copy the WASM file to your public folder so the browser can load it:
    ```bash
    npx @think-grid-labs/snapbolt-cli sync ./public
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
Core supports: **JPEG, JPG, PNG, WebP**.
- Unsupported types (GIF, SVG, TIFF) are **automatically detected** and skipped (returns original URL).

## Troubleshooting

### 1. Image not optimizing (Returns original URL)
- **Check Console**: Look for "Snapbolt: Unsupported Content-Type" warnings.
- **CORS**: If using an external CDN (S3, Cloudinary), ensure it returns `Access-Control-Allow-Origin: *` or your domain. Use `{ crossOrigin: 'anonymous' }`.

### 2. "Module not found" in Next.js
- Ensure `@think-grid-labs/snapbolt` is in `transpilePackages` in `next.config.js`.
- If using `pnpm` workspaces, ensure the package is correctly linked or installed.

### 3. "RuntimeError: memory access out of bounds"
- The image is too large for the WASM memory buffer.
- **Fix**: Use the `width` or `height` prop to downscale the image using the Canvas API *before* sending it to WASM.

## Features
- **Client-Side Optimization**: Zero server cost.
- **Blazing Fast**: Powered by a Rust core.
- **Memory Safe**: Smart pre-resizing.
- **React Ready**: Easy-to-use hooks.

For full documentation, visit our [GitHub Repository](https://github.com/ThinkGrid-Labs/snapbolt).
