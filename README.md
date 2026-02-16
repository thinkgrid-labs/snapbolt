# @think-grid-labs/snapbolt

A high-performance image optimization toolkit.

## Overview
This toolkit provides professional-grade image optimization (resizing and JPEG/WebP encoding) that runs entirely on the client side or in a native build-time environment.

### Packages
- **`@think-grid-labs/snapbolt`**: The core library containing React hooks and WASM bindings.
- **`@think-grid-labs/snapbolt-cli`**: Native CLI for bulk optimization and WASM asset synchronization.

---

## ⚡ Performance & Benefits

- **Butter-Smooth Scrolling**: By shrinking images to the exact size needed in the UI, we drastically reduce browser RAM usage, preventing "jank" and crashes on mobile devices.
- **Ultra-Fast Uploads**: Optimize images *before* they leave the user's device. Reduces bandwidth consumption and speeds up upload times by up to 90%.
- **Zero Server Overhead**: Shift the heavy lifting of image processing to the client side. No more expensive cloud-functions for basic resizing.
- **Privacy First**: Process sensitive images locally without ever sending unoptimized high-res data to your servers.

## Supported Formats
**JPEG, JPG, PNG, WebP** (GIF/SVG/TIFF skipped automatically).

---

## 1. Library Installation & Set-Up

### Installation
```bash
npm install @think-grid-labs/snapbolt
```

### Essential Step: WASM Synchronization
Because WASM binaries are served as separate files, you must ensure the `.wasm` file is available in your project's `public` (or static) folder so the browser can download it.

#### Option A: Automated (Recommended)
Use our CLI to automatically find and copy the binary from `node_modules` to your target directory:
```bash
npx @think-grid-labs/snapbolt-cli sync ./public
```
*Tip: Add this to your `postinstall` script in `package.json` to keep it synchronized automatically.*

#### Option B: Manual
If you prefer not to use the CLI, manually copy the file:
- **Source**: `node_modules/@think-grid-labs/snapbolt/pkg/snapbolt_bg.wasm`
- **Destination**: `your-project/public/snapbolt_bg.wasm`

### Next.js Integration
If you are using Next.js and see `Module not found` errors:
1.  **Transpile the Package**:
    Update `next.config.js` or `next.config.ts`:
    ```ts
    const nextConfig = {
      transpilePackages: ['@think-grid-labs/snapbolt'],
      // ...
    }
    ```
2.  **Sync WASM**: Ensure the `.wasm` file is in your `public` folder (see above).

---

## 2. Usage Examples

### React Hook
The simplest way to optimize images on the fly. Pass a URL or a Blob.

```tsx
import { useImageOptimizer } from '@think-grid-labs/snapbolt';

const SmartImage = ({ src }) => {
  // src can be a URL string or a File/Blob
  // quality: 0-100 (default: 75)
  // maxWidth: target width in pixels (default: 300)
  const { optimizedUrl, loading, error } = useImageOptimizer(src, 75, 300);

  if (loading) return <div className="spinner" />;
  
  return <img src={optimizedUrl || src} alt="Optimized" />;
};
```

### User Upload Example (Pre-Upload Optimization)
Optimize a file on the client side before sending it to your server to save bandwidth and storage.

```tsx
import { useImageOptimizer } from '@think-grid-labs/snapbolt';

const UploadForm = () => {
  const [file, setFile] = useState<File | null>(null);
  const { optimizedBlob, loading } = useImageOptimizer(file, 80, 1200);

  const handleUpload = async () => {
    if (!optimizedBlob) return;

    const formData = new FormData();
    // Send the tiny optimized version instead of the massive original!
    formData.append('image', optimizedBlob, 'image.jpg');

    await fetch('/api/upload', { method: 'POST', body: formData });
  };

  return (
    <div>
      <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
      <button onClick={handleUpload} disabled={loading || !optimizedBlob}>
        {loading ? 'Optimizing...' : 'Upload Tiny Image'}
      </button>
    </div>
  );
};
```

### Vanilla JS / Browser
For custom integrations or non-React environments.

```ts
import init, { optimize_image_sync } from '@think-grid-labs/snapbolt/browser';

async function optimize(bytes) {
  // Ensure the WASM is initialized (path relative to your public root)
  await init('/snapbolt_bg.wasm'); 
  
  // Optimize: returns a Uint8Array
  const optimizedData = optimize_image_sync(bytes, 75, 300);
  
  return new Blob([optimizedData], { type: 'image/jpeg' });
}
```

---

---

## 🎯 Common Use Cases

### 1. Zero-Cost User Uploads
Resize high-res images (e.g., 5MB Avatars, KYC docs) on the client **before** uploading.
- **Benefit**: 99% bandwidth saving on uploads. Zero server CPU usage.

### 2. Decentralized & Local-First Apps
Perfect for Web3 DApps, IPFS, or PWAs where you don't have a centralized backend to optimize images.
- **Benefit**: Professional optimization running entirely in the browser.

### 3. Real-Time "Optimistic" Previews
Instantly generate highly optimized `blob:` URLs for CMS or blog editors while the real upload happens in the background.
- **Benefit**: The UI feels instant and responsive.

### 4. Privacy-Focused Applications
Process sensitive images locally (Medical, Secure Messaging) without ever sending unencrypted high-res data to a third-party cloud.

### 5. Mobile Data Saver
Downscale 4K images to 1080p WebP before display or upload to save battery and data for users on spotty connections.

---

## 3. CLI: @think-grid-labs/snapbolt-cli
Native tool for high-speed local image processing.

### Bulk Optimize
Recursively scan and shrink images in your local `public` folder before deployment:
```bash
npx @think-grid-labs/snapbolt-cli scan ./public
```

### Sync Assets
Synchronize the required WASM binaries to your web project:
```bash
npx @think-grid-labs/snapbolt-cli sync ./public
```
---

---

## Troubleshooting

### CORS Issues (Images not loading/optimizing)
If your images come from a CDN/S3 and are not optimizing:
1.  **Check Headers**: The server MUST return `Access-Control-Allow-Origin`.
2.  **Enable Mode**: Pass `{ crossOrigin: 'anonymous' }` to `useImageOptimizer`.

### Next.js Integration
If you see `Module not found`:
- Add `transpilePackages: ['@think-grid-labs/snapbolt']` to `next.config.js`.

---

## 🗺️ Roadmap

We are committed to making `@think-grid-labs/snapbolt` the gold standard for decentralized image optimization.

### 🟢 Short-Term (Stable & Fast)
- [ ] **SIMD Support**: Optimize WASM binaries with SIMD for 2x faster processing on modern browsers.
- [ ] **Blur-up Helpers**: Generate tiny (4x4) Base64 placeholders automatically for "Instant-Load" UI patterns.
- [ ] **Automatic Quality**: Content-aware optimization that keeps text sharp while compressing textures harder.
- [ ] **Advanced Config Props**: Support for passing custom `image-wasm` config directly to hooks and components.

### 🟡 Mid-Term (Feature Expansion)
- [ ] **AVIF Encoding**: Implementation of AVIF for even better compression ratios.
- [ ] **Smart Cropping**: AI-powered saliency detection to ensure the most important part of the subject is always centered.
- [ ] **Web Worker Orchestration**: Offload processing to background threads automatically to keep the UI at 60fps.

### 🔴 Long-Term (Ecosystem)
- [ ] **Plugin System**: Watermarking, custom filters, and edge-function templates.
- [ ] **Framework Natives**: Deep integration with Next.js Server Components and Vite build-time hooks.
- [ ] **Video Processing**: Client-side video thumbnail extraction and lightweight transcoding (WebCodecs).
- [ ] **Edge Deployment**: Pre-built templates for Cloudflare Workers and Vercel Edge.

---

## License
MIT
