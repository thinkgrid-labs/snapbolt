# @think-grid-labs/opti-assets

A high-performance image optimization toolkit.
Supports both **local build-time** optimization (via Node.js/NAPI) and **in-browser run-time** optimization (via WebAssembly).

## "Why do I need this?"

Images are the heaviest part of the modern web. Managing them is a pain:
-   **Static Assets**: Large PNGs checked into git bloat your repository and slow down deployments.
-   **Dynamic Assets**: Users upload 10MB photos that kill your users' bandwidth and your server costs.
-   **Complex Tooling**: You need one tool for webpack, another for your backend, and another for the browser.

## The Solution: One Core to Rule Them All

`@think-grid-labs/opti-assets` solves both problems with a single, high-performance core:

1.  **Build-Time (CLI)**: Crush your `public/` folder images before deploying using our native Node.js binary. (Zero runtime cost).
2.  **Run-Time (Browser)**: Optimize user uploads *instantly* in the browser using WebAssembly. (Zero server cost).

This is a monorepo containing:
-   `packages/core`: Shared Rust image logic.
-   `packages/cli`: (NAPI) Node.js CLI tool.
-   `packages/browser`: (Wasm) In-browser optimization library.
-   `packages/react`: React hooks wrapper for the browser library.

## Usage

### CLI
Scan your public folder and optimize images to WebP:

```bash
npx @think-grid-labs/opti-assets-cli scan ./public
```

### Vanilla JS (Browser)
For non-React apps or building your own wrapper:

```bash
npm install @think-grid-labs/opti-assets-browser
```

```javascript
import init, { optimize_image_sync } from '@think-grid-labs/opti-assets-browser';

async function optimize(file) {
    await init(); // Initialize Wasm
    
    const buffer = new Uint8Array(await file.arrayBuffer());
    const optimizedBuffer = optimize_image_sync(buffer, 80.0); // Quality 0-100
    
    return new Blob([optimizedBuffer], { type: 'image/webp' });
}
```

### React Hook
Optimize remote images on the fly:

```bash
npm install @think-grid-labs/opti-assets-react
```

```tsx
import { useImageOptimizer } from '@think-grid-labs/opti-assets-react';

const MyComponent = () => {
    // Pass a URL or a Blob/File
    const { optimizedUrl, loading, error } = useImageOptimizer('https://example.com/huge-image.jpg');

    if (loading) return <div>Loading...</div>;
    if (error) return <div>Error: {error}</div>;

    return <img src={optimizedUrl!} alt="Optimized" />;
};
```
