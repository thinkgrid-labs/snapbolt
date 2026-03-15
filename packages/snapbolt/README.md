# @think-grid-labs/snapbolt

A high-performance image optimization toolkit powered by Rust and WebAssembly.

Optimize images at request time inside your existing server, in the browser via WASM, or in bulk from the terminal — no external services or API keys required.

---

## Next.js

Server-side optimization runs inside your Next.js process. No separate Rust server needed.

### Install

```bash
npm install @think-grid-labs/snapbolt @think-grid-labs/snapbolt-cli
```

`snapbolt-cli` is a prebuilt native addon (`.node` binary) that does the heavy lifting on the server. No Rust toolchain required.

### Configure `next.config.mjs`

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Lets Next.js compile the snapbolt ESM package
  transpilePackages: ['@think-grid-labs/snapbolt'],

  // Keeps the native NAPI addon (.node binary) out of the bundle.
  // Do NOT add @think-grid-labs/snapbolt here — Turbopack rejects a package in both lists.
  serverExternalPackages: ['@think-grid-labs/snapbolt-cli'],

  // Turbopack (next dev — the default in Next.js 15).
  // WASM is supported natively. resolveExtensions must be non-empty to suppress
  // the "Webpack is configured while Turbopack is not" warning.
  turbopack: {
    resolveExtensions: ['.tsx', '.ts', '.jsx', '.js', '.mjs', '.json', '.wasm'],
  },
};

export default nextConfig;
```

### Add the image route

Create `app/api/image/route.ts`:

```ts
export { GET } from '@think-grid-labs/snapbolt/handler';
```

That's it — this single line adds a `/api/image?url=...&w=...&q=...&fmt=...` endpoint to your app.

### Wrap your app with `SnapboltProvider`

In `app/layout.tsx`:

```tsx
import { SnapboltProvider } from '@think-grid-labs/snapbolt';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        <SnapboltProvider serverUrl="/api">
          {children}
        </SnapboltProvider>
      </body>
    </html>
  );
}
```

### Use `SmartImage`

```tsx
import { SmartImage } from '@think-grid-labs/snapbolt/image';

// Basic — responsive, quality-controlled
<SmartImage src="/photo.jpg" width={800} height={600} quality={80} alt="Photo" />

// Fill parent container
<div style={{ position: 'relative', width: '100%', height: 400 }}>
  <SmartImage src="/hero.jpg" fill quality={75} alt="Hero" />
</div>
```

`SmartImage` automatically routes through the `/api/image` endpoint in server mode, so the browser receives a real HTTP URL — fully crawlable by search engines.

### Supported query parameters

| Param | Description | Default |
|-------|-------------|---------|
| `url` | Absolute URL of the source image | required |
| `w` | Max width in pixels | original |
| `h` | Max height in pixels | original |
| `q` | Quality 1–100 | `80` |
| `fmt` | `webp` \| `jpeg` \| `png` \| `auto` | `webp` |

`fmt=auto` selects AVIF or WebP based on the browser's `Accept` header.

---

## Vite / Vanilla JS

Client-side optimization runs entirely in the browser via WASM — no server required.

### Install

```bash
npm install @think-grid-labs/snapbolt
```

Vite handles `.wasm` files natively. No extra config needed.

### Copy the WASM file

```bash
npx @think-grid-labs/snapbolt-cli sync ./public
```

This copies `snapbolt_bg.wasm` to your `public/` folder so the browser can load it.

### React hook

```tsx
import { useImageOptimizer } from '@think-grid-labs/snapbolt';

function MyImage({ src }) {
  const { optimizedUrl, loading, error } = useImageOptimizer(src, {
    quality: 80,
    width: 1200, // downscale before WASM to avoid memory issues on mobile
    cache: true,
  });

  if (loading) return <div className="skeleton" />;
  if (error) return <img src={src} alt="" />;

  return <img src={optimizedUrl || src} alt="Optimized" />;
}
```

### Vanilla JS

```js
import init, { optimize_image_sync } from '@think-grid-labs/snapbolt/browser';

await init('/snapbolt_bg.wasm');

const response = await fetch('/photo.jpg');
const input = new Uint8Array(await response.arrayBuffer());
const output = optimize_image_sync(input, 80); // (bytes, quality)

const blob = new Blob([output], { type: 'image/webp' });
const url = URL.createObjectURL(blob);
```

### Cross-origin images (S3 / CDN)

Browsers block `fetch()` on cross-origin images by default.

1. Add `Access-Control-Allow-Origin: *` to your S3 bucket or CDN.
2. Pass `crossOrigin` to the hook:

```tsx
useImageOptimizer(src, { crossOrigin: 'anonymous' })
```

### Memory safety

Processing 4K+ images in WASM can crash mobile browsers. Always pass a `width` to downscale before optimization:

```tsx
useImageOptimizer(src, { width: 1200 })
```

### Caching

Results are cached in the browser's Cache API (`snapbolt-v1`) by default. To disable:

```tsx
useImageOptimizer(src, { cache: false })
```

### Supported formats

Input: **JPEG, PNG, WebP**. GIF, SVG, and other unsupported types are skipped — the original URL is returned unchanged.

---

## CLI / Terminal

Bulk-optimize images at build time or in CI without writing any code.

### No install required

```bash
npx @think-grid-labs/snapbolt-cli <command>
```

Or install globally:

```bash
npm install -g @think-grid-labs/snapbolt-cli
```

### Commands

**Scan and convert a folder:**

```bash
npx @think-grid-labs/snapbolt-cli scan ./public
```

Converts all JPEG/PNG images to WebP in place. Originals are preserved.

**Sync WASM file to public folder:**

```bash
npx @think-grid-labs/snapbolt-cli sync ./public
```

Copies `snapbolt_bg.wasm` from `node_modules` to your public directory. Run this after install or when upgrading snapbolt.

---

## Troubleshooting

**`Module not found: Package path ./handler is not exported`**
Rebuild the local package (`npm run build` in `packages/snapbolt`) or ensure you're on snapbolt ≥ 0.1.7.

**`Module parse failed: Unexpected character '�'`**
Webpack is trying to bundle the native `.node` addon. Add `serverExternalPackages` and the `config.externals.push()` call to `next.config.mjs` as shown above.

**`Module not found` in Next.js (transpile error)**
Ensure `transpilePackages: ['@think-grid-labs/snapbolt']` is in your `next.config.mjs`.

**`RuntimeError: memory access out of bounds`**
The image is too large for WASM memory. Pass a `width` option to downscale before processing.

**Blank image in fill mode**
The parent container must have `position: relative` and an explicit height.
