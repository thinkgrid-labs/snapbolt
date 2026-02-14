# @think-grid-labs/opti-assets

A high-performance image optimization toolkit.

## Overview
This toolkit provides professional-grade image optimization (resizing and JPEG/WebP encoding) that runs entirely on the client side or in a native build-time environment.

### Packages
- **`@think-grid-labs/opti-assets`**: The core library containing React hooks and WASM bindings.
- **`@think-grid-labs/opti-assets-cli`**: Native CLI for bulk optimization and WASM asset synchronization.

---

## ⚡ Performance & Benefits

- **Butter-Smooth Scrolling**: By shrinking images to the exact size needed in the UI, we drastically reduce browser RAM usage, preventing "jank" and crashes on mobile devices.
- **Ultra-Fast Uploads**: Optimize images *before* they leave the user's device. Reduces bandwidth consumption and speeds up upload times by up to 90%.
- **Zero Server Overhead**: Shift the heavy lifting of image processing to the client side. No more expensive cloud-functions for basic resizing.
- **Privacy First**: Process sensitive images locally without ever sending unoptimized high-res data to your servers.

---

## 1. Library Installation & Set-Up

### Installation
```bash
npm install @think-grid-labs/opti-assets
```

### Essential Step: WASM Synchronization
Because WASM binaries are served as separate files, you must ensure the `.wasm` file is available in your project's `public` (or static) folder so the browser can download it.

#### Option A: Automated (Recommended)
Use our CLI to automatically find and copy the binary from `node_modules` to your target directory:
```bash
npx @think-grid-labs/opti-assets-cli sync ./public
```
*Tip: Add this to your `postinstall` script in `package.json` to keep it synchronized automatically.*

#### Option B: Manual
If you prefer not to use the CLI, manually copy the file:
- **Source**: `node_modules/@think-grid-labs/opti-assets/pkg/opti_assets_bg.wasm`
- **Destination**: `your-project/public/opti_assets_bg.wasm`

---

## 2. Usage Examples

### React Hook
The simplest way to optimize images on the fly. Pass a URL or a Blob.

```tsx
import { useImageOptimizer } from '@think-grid-labs/opti-assets';

const SmartImage = ({ src }) => {
  // src can be a URL string or a File/Blob
  // quality: 0-100 (default: 75)
  // maxWidth: target width in pixels (default: 300)
  const { optimizedUrl, loading, error } = useImageOptimizer(src, 75, 300);

  if (loading) return <div className="spinner" />;
  
  return <img src={optimizedUrl || src} alt="Optimized" />;
};
```

### Vanilla JS / Browser
For custom integrations or non-React environments.

```ts
import init, { optimize_image_sync } from '@think-grid-labs/opti-assets/browser';

async function optimize(bytes) {
  // Ensure the WASM is initialized (path relative to your public root)
  await init('/opti_assets_bg.wasm'); 
  
  // Optimize: returns a Uint8Array
  const optimizedData = optimize_image_sync(bytes, 75, 300);
  
  return new Blob([optimizedData], { type: 'image/jpeg' });
}
```

---

## 3. CLI: @think-grid-labs/opti-assets-cli
Native tool for high-speed local image processing.

### Bulk Optimize
Recursively scan and shrink images in your local `public` folder before deployment:
```bash
npx @think-grid-labs/opti-assets-cli scan ./public
```

### Sync Assets
Synchronize the required WASM binaries to your web project:
```bash
npx @think-grid-labs/opti-assets-cli sync ./public
```
---

## License
MIT
