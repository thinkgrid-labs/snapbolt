# Snapbolt — Usage Guide

- [Next.js (App Router)](#nextjs-app-router)
- [Vite / Vanilla JS (browser WASM)](#vite--vanilla-js-browser-wasm)
- [Pre-upload optimization](#pre-upload-optimization)
- [Standalone Rust server](#standalone-rust-server-snapbolt-server)
- [CLI — bulk build-time conversion](#cli--bulk-build-time-conversion)
- [SmartImage prop reference](#smartimage-prop-reference)
- [SnapboltProvider config reference](#snapboltprovider-config-reference)
- [Troubleshooting](#troubleshooting)

---

## Next.js (App Router)

Snapbolt runs image optimization inside your Next.js process via a native NAPI addon. No separate server needed.

### 1. Install

```bash
npm install @thinkgrid/snapbolt @thinkgrid/snapbolt-cli
```

`@thinkgrid/snapbolt-cli` is a prebuilt native binary (`.node` file). No Rust toolchain required. npm automatically installs the right binary for your platform via `optionalDependencies`.

**Supported platforms**: macOS arm64 (Apple Silicon), macOS x64 (Intel), Linux x64 (glibc/musl), Linux arm64, Windows x64.

### 2. Configure `next.config.mjs`

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Lets Next.js/Turbopack compile the snapbolt ESM package on the client
  transpilePackages: ['@thinkgrid/snapbolt'],

  // Keeps the native .node binary out of the bundle.
  // Do NOT add @thinkgrid/snapbolt here — Turbopack rejects a package in both lists.
  serverExternalPackages: ['@thinkgrid/snapbolt-cli'],

  // Turbopack config (next dev default in Next.js 15).
  // WASM is supported natively. resolveExtensions suppresses the
  // "Webpack is configured while Turbopack is not" warning.
  turbopack: {
    resolveExtensions: ['.tsx', '.ts', '.jsx', '.js', '.mjs', '.json', '.wasm'],
  },
};

export default nextConfig;
```

> **Webpack (next build)**: Turbopack is only for `next dev`. The production build uses webpack, which is handled correctly by `serverExternalPackages` — no extra config needed.

### 3. Add the image API route

Create `app/api/image/route.ts`:

```ts
// Zero-config image optimization endpoint.
// SmartImage builds all URLs pointing here automatically.
export { GET } from '@thinkgrid/snapbolt/handler';
```

This adds a `/api/image?url=...&w=...&q=...&fmt=...` endpoint to your app.

**Environment variables (optional):**

| Variable | Description |
|---|---|
| `SNAPBOLT_ALLOWED_DOMAINS` | Comma-separated allowlist of domains for SSRF protection. Example: `cdn.example.com,images.example.com`. When unset, all domains are allowed (dev only — **set this in production**). |

### 4. Wrap your app with `SnapboltProvider`

`SnapboltProvider` is a client component (`'use client'`). If your layout is a server component, put the provider in a separate file.

**Option A — layout is already a client component:**

```tsx
// app/layout.tsx
import { SnapboltProvider } from '@thinkgrid/snapbolt';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SnapboltProvider serverUrl="/api" defaultQuality={80}>
          {children}
        </SnapboltProvider>
      </body>
    </html>
  );
}
```

**Option B — layout is a server component (recommended for Next.js App Router):**

```tsx
// components/Providers.tsx
'use client';
import { SnapboltProvider } from '@thinkgrid/snapbolt';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SnapboltProvider serverUrl="/api" defaultQuality={80}>
      {children}
    </SnapboltProvider>
  );
}
```

```tsx
// app/layout.tsx  (server component)
import Providers from '@/components/Providers';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

### 5. Use `SmartImage`

```tsx
import SmartImage from '@thinkgrid/snapbolt/image';
// or: import { SmartImage } from '@thinkgrid/snapbolt/image';

// LCP hero image — priority adds fetchpriority="high" + <link rel="preload">
<SmartImage
  src="https://cdn.example.com/hero.jpg"
  alt="Hero"
  width={1200}
  height={630}
  priority
  sizes="100vw"
/>

// Lazy-loaded responsive image
<SmartImage
  src="https://cdn.example.com/card.jpg"
  alt="Card image"
  width={600}
  quality={75}
  sizes="(max-width: 768px) 100vw, 50vw"
/>

// Fill parent container — like next/image fill
<div style={{ position: 'relative', height: 400 }}>
  <SmartImage src="https://cdn.example.com/bg.jpg" alt="" fill />
</div>

// Blur placeholder while loading
<SmartImage
  src="https://cdn.example.com/photo.jpg"
  alt="Photo"
  width={800}
  height={500}
  placeholder="blur"
  blurDataURL="data:image/jpeg;base64,/9j/4AAQ..."
/>
```

**Important**: `src` must be an **absolute URL** when using server mode. Local paths like `/hero.jpg` will not work — use `https://yourdomain.com/hero.jpg` or serve them through a CDN.

---

## Vite / Vanilla JS (browser WASM)

No server required. Images are optimized entirely in the browser via a ~200KB Rust/WASM module.

### 1. Install

```bash
npm install @thinkgrid/snapbolt
```

Vite handles `.wasm` files natively — no extra config needed.

For webpack 5 (without Next.js), add to `webpack.config.js`:

```js
experiments: { asyncWebAssembly: true }
```

### 2. React hook

```tsx
import { useImageOptimizer } from '@thinkgrid/snapbolt';

function OptimizedImage({ src }: { src: string }) {
  const { optimizedUrl, loading, error } = useImageOptimizer(src, {
    quality: 80,
    width: 1200,  // downscale before WASM — avoids OOM on mobile for large images
    cache: true,  // caches result in Cache API (default: true)
  });

  if (loading) return <div className="skeleton" />;
  if (error) return <img src={src} alt="" />;  // fallback to original

  return <img src={optimizedUrl!} alt="Optimized" />;
}
```

### 3. SmartImage component (WASM fallback mode)

When no `serverUrl` is set on `SnapboltProvider`, `SmartImage` automatically falls back to WASM mode:

```tsx
import { SnapboltProvider } from '@thinkgrid/snapbolt';
import SmartImage from '@thinkgrid/snapbolt/image';

// No serverUrl → uses WASM mode
<SnapboltProvider defaultQuality={80}>
  <SmartImage src={blobOrUrl} alt="Image" width={800} />
</SnapboltProvider>
```

### 4. Vanilla JS / TypeScript

```ts
import init, { optimize_image_sync } from '@thinkgrid/snapbolt/browser';

await init(); // loads the WASM module

const response = await fetch('/photo.jpg');
const input = new Uint8Array(await response.arrayBuffer());
const output = optimize_image_sync(input, 80); // (bytes, quality 1-100)

const blob = new Blob([output], { type: 'image/webp' });
const url = URL.createObjectURL(blob);
```

If you need to serve the WASM file from a custom path (CDN, non-root public dir):

```bash
# Copy WASM binary to your public folder
npx @thinkgrid/snapbolt-cli sync ./public
```

Then pass the path explicitly:

```ts
await init('/snapbolt_bg.wasm');
// or via hook:
useImageOptimizer(src, { wasmUrl: '/snapbolt_bg.wasm' })
```

### Cross-origin images (S3, CDN)

Browsers block `fetch()` on cross-origin images by default.

1. Add `Access-Control-Allow-Origin: *` to your S3 bucket or CDN CORS config.
2. Pass `crossOrigin` to the hook:

```tsx
useImageOptimizer(src, { crossOrigin: 'anonymous' })
```

---

## Pre-upload optimization

Compress user photos in the browser before they leave the device. Works with `File` or `Blob` objects.

```tsx
import { useImageOptimizer } from '@thinkgrid/snapbolt';
import { useState } from 'react';

function UploadForm() {
  const [file, setFile] = useState<File | null>(null);
  const { optimizedUrl, loading } = useImageOptimizer(file, {
    quality: 80,
    width: 1200,  // always cap width before upload
  });

  const handleUpload = async () => {
    if (!optimizedUrl) return;
    const resp = await fetch(optimizedUrl);
    const blob = await resp.blob();

    const form = new FormData();
    form.append('image', blob, 'photo.webp');
    await fetch('/api/upload', { method: 'POST', body: form });
  };

  return (
    <div>
      <input
        type="file"
        accept="image/*"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
      />
      <button onClick={handleUpload} disabled={loading || !optimizedUrl}>
        {loading ? 'Optimizing…' : 'Upload'}
      </button>
    </div>
  );
}
```

This also works with `SmartImage` when `src` is a `Blob` or `File` — it always uses WASM mode regardless of `serverUrl`.

---

## Standalone Rust server (`snapbolt-server`)

A self-hostable Axum HTTP microservice — an alternative to `/_next/image` that can serve any frontend.

### Run with Docker (recommended)

```bash
# Build from repo root
docker build -f packages/server/Dockerfile -t snapbolt-server .

docker run -p 3000:3000 \
  -e ALLOWED_DOMAINS=example.com,cdn.example.com \
  snapbolt-server
```

### Run from source

```bash
cargo build --release -p snapbolt-server

ALLOWED_DOMAINS=example.com,cdn.example.com \
PORT=3000 \
cargo run --release -p snapbolt-server
```

### Endpoint

```
GET /image?url=<encoded-url>&w=<width>&h=<height>&q=<quality>&fmt=<format>
```

| Param | Description | Default |
|---|---|---|
| `url` | Source image URL (must match `ALLOWED_DOMAINS`) | required |
| `w` | Target width in pixels | original |
| `h` | Target height in pixels | original |
| `q` | Quality 1–100 | `80` |
| `fmt` | `webp` \| `jpeg` \| `png` \| `auto` | `auto` |

`fmt=auto` negotiates from the `Accept` header (`image/webp` preferred).

### Point `SnapboltProvider` at the server

```tsx
<SnapboltProvider serverUrl="https://images.yourapp.com">
  {children}
</SnapboltProvider>
```

### Environment variables

| Variable | Description | Default |
|---|---|---|
| `PORT` | Listening port | `3000` |
| `ALLOWED_DOMAINS` | Comma-separated domain allowlist (SSRF protection) | open (logs warning) |
| `CACHE_MAX_BYTES` | In-memory LRU cache size in bytes | `524288000` (500 MB) |
| `DEFAULT_QUALITY` | Quality when `q` param is absent | `80` |

---

## CLI — bulk build-time conversion

### Bulk optimize images

Recursively converts all JPEG/PNG in a directory to WebP:

```bash
npx @thinkgrid/snapbolt-cli scan ./public
```

Originals are preserved. Useful as a CI/CD build step.

### Sync WASM binary

Copies `snapbolt_bg.wasm` from `node_modules` to your static folder:

```bash
npx @thinkgrid/snapbolt-cli sync ./public
```

Run this after install or on upgrades if you're manually serving the WASM file.

**Automate with postinstall:**

```json
"scripts": {
  "postinstall": "snapbolt-cli sync ./public"
}
```

---

## `SmartImage` prop reference

| Prop | Type | Default | Description |
|---|---|---|---|
| `src` | `string \| Blob` | required | Image URL (must be absolute in server mode) or a `File`/`Blob` |
| `alt` | `string` | required | Alt text |
| `width` | `number` | — | Width in px — prevents CLS |
| `height` | `number` | — | Height in px — prevents CLS |
| `quality` | `number` | `80` | Output quality 1–100 |
| `format` | `'webp' \| 'jpeg' \| 'png' \| 'auto'` | `'auto'` | Output format |
| `priority` | `boolean` | `false` | LCP image — adds `fetchpriority="high"`, `loading="eager"`, and a `<link rel="preload">` |
| `sizes` | `string` | `'100vw'` | CSS `sizes` attribute for responsive `srcset` |
| `placeholder` | `'blur' \| 'empty'` | `'empty'` | Show blur overlay while loading |
| `blurDataURL` | `string` | — | Base64 tiny image for the blur placeholder |
| `fill` | `boolean` | `false` | Fill parent container (parent needs `position: relative` + explicit height) |
| `serverUrl` | `string` | — | Override the global server URL for this image only |
| `breakpoints` | `number[]` | `[640, 1080, 1920]` | Widths used to generate the `srcset` |
| `onLoad` | `() => void` | — | Called when the image finishes loading |
| `onError` | `() => void` | — | Called when the image fails to load |

---

## `SnapboltProvider` config reference

```tsx
<SnapboltProvider
  serverUrl="/api"                   // base URL for the image handler
  defaultQuality={80}                // default quality for all SmartImage instances
  defaultFormat="auto"               // default output format
  breakpoints={[640, 1080, 1920]}    // default srcset widths
>
```

When `serverUrl` is not set, all `SmartImage` instances fall back to WASM mode.

---

## Troubleshooting

**`Module not found: Package path ./handler is not exported`**
Ensure you're on `@thinkgrid/snapbolt` ≥ 0.2.0 and the package is built (`npm run build` in `packages/snapbolt`).

**`Module parse failed: Unexpected character '▒'`**
Webpack is trying to bundle the native `.node` addon. Add `serverExternalPackages: ['@thinkgrid/snapbolt-cli']` to `next.config.mjs`.

**`Module not found` in Next.js**
Ensure `transpilePackages: ['@thinkgrid/snapbolt']` is set in `next.config.mjs`.

**`[snapbolt] @thinkgrid/snapbolt-cli is not installed`**
Run `npm install @thinkgrid/snapbolt-cli`. Required for server-side optimization and the image handler.

**macOS Intel (x64) — native addon not loading**
Make sure you're on `@thinkgrid/snapbolt-cli` ≥ 0.2.1. Earlier versions were missing the `optionalDependencies` entry that tells npm to download the `darwin-x64` binary automatically. After upgrading, run `npm install` again.

**`RuntimeError: memory access out of bounds` (WASM mode)**
The image is too large for the WASM memory budget. Pass `width` to downscale before processing:
```tsx
useImageOptimizer(src, { width: 1200 })
```

**Blank image in `fill` mode**
The parent container must have `position: relative` and an explicit `height`.

**CORS — images from S3/CDN not loading in WASM mode**
1. Add `Access-Control-Allow-Origin: *` to the remote server.
2. Pass `crossOrigin: 'anonymous'` to `useImageOptimizer`.

**Images not serving in server mode (403)**
Set `SNAPBOLT_ALLOWED_DOMAINS` to include the hostname of your image source.
