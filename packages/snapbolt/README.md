# @thinkgrid/snapbolt

React `SmartImage` component and `useImageOptimizer` hook — powered by Rust and WebAssembly.

> Full usage guide: **[USAGE.md](../../USAGE.md)**

---

## When to use this package

| Use case | Setup |
|---|---|
| **Next.js** — server-side optimization inside your app | Install `@thinkgrid/snapbolt` **and** `@thinkgrid/snapbolt-cli`. See [Next.js setup](#nextjs-app-router). |
| **Vite / CRA / static site** — browser WASM, no server | Install `@thinkgrid/snapbolt` only. See [Vite / browser setup](#vite--browser-wasm). |
| **Pre-upload optimization** — compress before upload | Install `@thinkgrid/snapbolt` only. Pass a `File`/`Blob` to `SmartImage` or `useImageOptimizer`. |
| **Self-hosted image server** | Use `snapbolt-server` (Rust binary). Point `SnapboltProvider serverUrl` at it. |

---

## Next.js (App Router)

### Install

```bash
npm install @thinkgrid/snapbolt @thinkgrid/snapbolt-cli
```

### `next.config.mjs`

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@thinkgrid/snapbolt'],
  serverExternalPackages: ['@thinkgrid/snapbolt-cli'],
  turbopack: {
    resolveExtensions: ['.tsx', '.ts', '.jsx', '.js', '.mjs', '.json', '.wasm'],
  },
};
export default nextConfig;
```

### Image API route — `app/api/image/route.ts`

```ts
export { GET } from '@thinkgrid/snapbolt/handler';
```

### Provider — `components/Providers.tsx`

```tsx
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
// app/layout.tsx
import Providers from '@/components/Providers';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html><body><Providers>{children}</Providers></body></html>;
}
```

### Use `SmartImage`

```tsx
import SmartImage from '@thinkgrid/snapbolt/image';

// LCP hero image
<SmartImage src="https://cdn.example.com/hero.jpg" alt="Hero" width={1200} priority />

// Responsive card image
<SmartImage src="https://cdn.example.com/card.jpg" alt="Card" width={600} sizes="50vw" />

// Fill container
<div style={{ position: 'relative', height: 400 }}>
  <SmartImage src="https://cdn.example.com/bg.jpg" alt="" fill />
</div>
```

**Note**: `src` must be an **absolute URL** in server mode. Local `/public` paths are not supported directly.

---

## Vite / Browser WASM

### Install

```bash
npm install @thinkgrid/snapbolt
```

No extra bundler config needed for Vite. For webpack 5, add `experiments: { asyncWebAssembly: true }`.

### React hook

```tsx
import { useImageOptimizer } from '@thinkgrid/snapbolt';

const { optimizedUrl, loading } = useImageOptimizer(src, {
  quality: 80,
  width: 1200,  // always cap width to avoid OOM on large images
});
```

> **Output is always WebP** in browser WASM mode regardless of the `format` option. See [Browser WASM limitations](#browser-wasm-limitations) below.

### Vanilla JS

```ts
import init, { optimize_image_sync } from '@thinkgrid/snapbolt/browser';

await init();
const output = optimize_image_sync(inputBytes, 80);
```

---

## Browser WASM limitations

When running in the browser (`wasm32-unknown-unknown`), Snapbolt can only produce **WebP** output. This is an intentional design choice, not a bug.

| Encoder | Why unavailable in WASM |
|---|---|
| **libwebp** (lossy WebP) | Requires C FFI — cannot link in `wasm32-unknown-unknown` |
| **rav1e / ravif** (AVIF) | Compiles to WASM, but the quantizer settings are broken in single-threaded mode — produces near-lossless output regardless of quality |

**How it works instead:** Snapbolt uses the browser's built-in Canvas API (`canvas.toBlob('image/webp', quality/100)`) for lossy WebP encoding. This is the same approach used by [Squoosh](https://squoosh.app) and [browser-image-compression](https://github.com/Donaldcwl/browser-image-compression).

### What the `format` option controls

| Mode | `format` option |
|---|---|
| **Browser WASM** (`useImageOptimizer`, `SmartImage` with no `serverUrl`) | Ignored — output is always WebP via Canvas |
| **Server mode** (`SmartImage` with `serverUrl`, or Next.js handler) | Fully supported — `avif`, `webp`, `jpeg`, `png`, `auto` |
| **CLI / native** (`snapbolt-cli`, server binary) | Fully supported — uses native Rust encoders with C FFI |

---

## Supported query parameters (server mode)

| Param | Description | Default |
|---|---|---|
| `url` | Absolute URL of the source image | required |
| `w` | Max width in pixels | original |
| `h` | Max height in pixels | original |
| `q` | Quality 1–100 | `80` |
| `fmt` | `webp` \| `jpeg` \| `png` \| `auto` | `webp` |

---

## Troubleshooting

**`Module not found` in Next.js** — Add `transpilePackages: ['@thinkgrid/snapbolt']` to `next.config.mjs`.

**`Unexpected character '▒'`** — Add `serverExternalPackages: ['@thinkgrid/snapbolt-cli']` to `next.config.mjs`.

**`RuntimeError: memory access out of bounds`** — Pass `width` to downscale before WASM processing.

**Blank image in fill mode** — Parent must have `position: relative` and an explicit height.
