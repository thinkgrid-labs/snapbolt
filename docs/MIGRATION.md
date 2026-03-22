# Migrating from next/image to SmartImage

This guide is for developers replacing `next/image` with `SmartImage` — either because you're moving off Vercel, self-hosting Next.js, or switching to a different React framework (Vite, Remix, etc.).

---

## Why migrate?

`next/image` is tightly coupled to Next.js's image optimization infrastructure. On Vercel, that's transparent. Self-hosted, it runs a separate Sharp-based server process tied to your Next.js deployment. Outside Next.js, it doesn't exist at all.

`SmartImage` is a drop-in replacement that routes through your own server (or falls back to WASM in the browser) with no framework dependency.

---

## Setup (replaces `next.config.js` images config)

**Before — next/image domain allowlist:**

```js
// next.config.mjs
const nextConfig = {
  images: {
    domains: ['cdn.example.com', 'images.example.com'],
    // or remotePatterns: [...]
  },
};
export default nextConfig;
```

**After — Snapbolt:**

```js
// next.config.mjs
const nextConfig = {
  transpilePackages: ['@thinkgrid/snapbolt'],
  serverExternalPackages: ['@thinkgrid/snapbolt-cli'],
};
export default nextConfig;
```

```ts
// app/api/image/route.ts
export { GET } from '@thinkgrid/snapbolt/handler';
```

```bash
# .env.local — SSRF protection (equivalent to images.domains)
SNAPBOLT_ALLOWED_DOMAINS=cdn.example.com,images.example.com
```

```tsx
// app/layout.tsx (or a 'use client' Providers wrapper)
import { SnapboltProvider } from '@thinkgrid/snapbolt';

<SnapboltProvider serverUrl="/api">{children}</SnapboltProvider>
```

---

## Prop mapping

| `next/image` prop | `SmartImage` equivalent | Notes |
|---|---|---|
| `src` (string URL) | `src` | Must be an **absolute URL** in server mode (`https://...`) |
| `src` (StaticImageData) | Not supported | Use the `.src` string: `import hero from './hero.jpg'; <SmartImage src={hero.src} />` |
| `alt` | `alt` | Identical |
| `width` | `width` | Identical |
| `height` | `height` | Identical |
| `fill` | `fill` | Identical — parent needs `position: relative` + explicit height |
| `sizes` | `sizes` | Identical |
| `quality` | `quality` | Same range 1–100 |
| `priority` | `priority` | Same effect — `fetchpriority="high"`, `loading="eager"`, `<link rel="preload">` |
| `placeholder="blur"` | `placeholder="blur"` | Same |
| `blurDataURL` | `blurDataURL` | Same base64 format — generate with `npx plaiceholder <url>` |
| `loading` | *(not a prop)* | Controlled by `priority`: `priority` → eager, default → lazy |
| `loader` | `serverUrl` | Per-image URL override; `SnapboltProvider serverUrl` is the global equivalent |
| `unoptimized` | *(remove it)* | Drop `serverUrl` from the provider — SmartImage falls back to WASM mode (no optimization server) |
| `onLoadingComplete` | `onLoad` | `onLoad` fires after the image finishes loading |
| `onError` | `onError` | Identical |
| `style` | `style` | Passed through to the `<img>` element |
| `className` | `className` | Passed through to the `<img>` element |
| `decoding` | *(always `async`)* | SmartImage always sets `decoding="async"` |

---

## Code examples — before and after

### 1. LCP hero image with priority

**Before:**
```tsx
import Image from 'next/image';

<Image
  src="https://cdn.example.com/hero.jpg"
  alt="Hero"
  width={1200}
  height={630}
  priority
  sizes="100vw"
/>
```

**After:**
```tsx
import SmartImage from '@thinkgrid/snapbolt/image';

<SmartImage
  src="https://cdn.example.com/hero.jpg"
  alt="Hero"
  width={1200}
  height={630}
  priority
  sizes="100vw"
/>
```

No change to props. The only requirement is the `src` must be an absolute URL.

---

### 2. Responsive card grid with sizes

**Before:**
```tsx
import Image from 'next/image';

<Image
  src="https://cdn.example.com/card.jpg"
  alt="Card"
  width={600}
  height={400}
  sizes="(max-width: 768px) 100vw, 50vw"
  quality={75}
/>
```

**After:**
```tsx
import SmartImage from '@thinkgrid/snapbolt/image';

<SmartImage
  src="https://cdn.example.com/card.jpg"
  alt="Card"
  width={600}
  height={400}
  sizes="(max-width: 768px) 100vw, 50vw"
  quality={75}
/>
```

Identical. Default breakpoints `[640, 1080, 1920]` match common viewport widths. Override with `breakpoints={[320, 640, 960]}` if needed.

---

### 3. Fill container image

**Before:**
```tsx
import Image from 'next/image';

<div style={{ position: 'relative', height: 400 }}>
  <Image src="https://cdn.example.com/bg.jpg" alt="" fill />
</div>
```

**After:**
```tsx
import SmartImage from '@thinkgrid/snapbolt/image';

<div style={{ position: 'relative', height: 400 }}>
  <SmartImage src="https://cdn.example.com/bg.jpg" alt="" fill />
</div>
```

Identical.

---

### 4. Blur placeholder

**Before:**
```tsx
import Image from 'next/image';

<Image
  src="https://cdn.example.com/photo.jpg"
  alt="Photo"
  width={800}
  height={500}
  placeholder="blur"
  blurDataURL="data:image/jpeg;base64,/9j/4AAQ..."
/>
```

**After:**
```tsx
import SmartImage from '@thinkgrid/snapbolt/image';

<SmartImage
  src="https://cdn.example.com/photo.jpg"
  alt="Photo"
  width={800}
  height={500}
  placeholder="blur"
  blurDataURL="data:image/jpeg;base64,/9j/4AAQ..."
/>
```

Identical props. The transition is a CSS `opacity` fade (0.4s ease).

---

## Key differences to be aware of

- **Absolute URLs required** in server mode. `next/image` accepts local paths (`/hero.jpg`) because it knows your base URL. SmartImage doesn't — use the full `https://yourdomain.com/hero.jpg` or a CDN URL.
- **No `StaticImageData`** support. Next.js's `import hero from './hero.jpg'` returns a typed object with width/height. SmartImage only accepts a plain string URL or a `Blob`/`File`. Use `hero.src` to get the string.
- **`srcset` is built at the component level**, not at the server — SmartImage constructs the URLs directly and the browser fetches the right size. This means the full srcset is in the HTML on first paint (no server round-trip to resolve the URL).
- **WASM fallback when there's no server** — if you remove `serverUrl` from the provider, SmartImage switches to client-side WASM mode automatically. `next/image` would just break.
- **No `images.domains` in `next.config`** — domain allowlisting moves to the `SNAPBOLT_ALLOWED_DOMAINS` environment variable on the server side.

---

## Provider vs `next.config.js images.domains`

| `next.config.js` | Snapbolt equivalent |
|---|---|
| `images.domains: ['cdn.example.com']` | `SNAPBOLT_ALLOWED_DOMAINS=cdn.example.com` in `.env` |
| `images.remotePatterns` | `SNAPBOLT_ALLOWED_DOMAINS` (hostname-level only, no path patterns) |
| `images.qualities: [75, 90]` | `quality` prop per-image or `defaultQuality` on the provider |
| `images.deviceSizes` | `breakpoints` prop on `SmartImage` or `SnapboltProvider` |
| `images.formats: ['image/avif', 'image/webp']` | `defaultFormat="auto"` on `SnapboltProvider` (AVIF via `Accept` header negotiation) |
