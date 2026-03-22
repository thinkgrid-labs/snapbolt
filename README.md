[![npm version](https://img.shields.io/npm/v/@thinkgrid/snapbolt?color=crimson&label=snapbolt)](https://www.npmjs.com/package/@thinkgrid/snapbolt) [![CI](https://img.shields.io/github/actions/workflow/status/thinkgrid-labs/snapbolt/ci.yml?label=CI)](https://github.com/thinkgrid-labs/snapbolt/actions/workflows/ci.yml) [![Bundle size](https://img.shields.io/bundlephobia/minzip/@thinkgrid/snapbolt?label=bundle)](https://bundlephobia.com/package/@thinkgrid/snapbolt) [![License](https://img.shields.io/npm/l/@thinkgrid/snapbolt)](./LICENSE)

# @thinkgrid/snapbolt

High-performance image optimization for any React app — no Vercel required. Powered by Rust and WebAssembly.

> Full usage instructions: **[USAGE.md](./USAGE.md)**

---

## Why Snapbolt?

| Feature | next/image | sharp | Snapbolt |
|---|:---:|:---:|:---:|
| Works outside Next.js / Vercel | ✗ | ✓ | ✓ |
| Browser WASM fallback (no server) | ✗ | ✗ | ✓ |
| Drop-in `SmartImage` component | ✓ | ✗ | ✓ |
| Pre-upload optimization (Blob / File) | ✗ | ✗ | ✓ |
| Self-hosted image CDN server | ✗ | ✗ | ✓ |

**next/image is excellent — if you're on Vercel. Snapbolt is for everyone else.**

---

## Which mode is right for me?

```
Are you using Next.js (self-hosted or Vercel)?
└─ Yes → Use in-app mode (snapbolt-cli handler)  ← fastest, no extra server

Do you need browser-side optimization (pre-upload, offline)?
└─ Yes → Use WASM mode (@thinkgrid/snapbolt)     ← ~200 KB WASM, no server needed

Do you need a standalone image CDN?
└─ Yes → Use snapbolt-server (Docker)            ← serves any frontend

Batch-convert images at build time?
└─ Yes → Use the CLI                             ← npx @thinkgrid/snapbolt-cli scan ./public
```

---

## Performance

| Image | Original | After Snapbolt | Savings |
|---|---|---|---|
| JPEG hero photo | 2.0 MB | ~420 KB | 79% |
| PNG illustration | 890 KB | ~210 KB | 76% |
| WebP thumbnail | 95 KB | ~38 KB | 60% |

Tested with `quality=80`, WebP output. Results vary by image content. Run `node benchmarks/run.js ./your-images` to measure your own.

---

## Quick Start

### Next.js (App Router)

```bash
npm install @thinkgrid/snapbolt @thinkgrid/snapbolt-cli
```

```js
// next.config.mjs
const nextConfig = {
  transpilePackages: ['@thinkgrid/snapbolt'],
  serverExternalPackages: ['@thinkgrid/snapbolt-cli'],
};
export default nextConfig;
```

```ts
// app/api/image/route.ts — one line, zero config
export { GET } from '@thinkgrid/snapbolt/handler';
```

```tsx
import SmartImage from '@thinkgrid/snapbolt/image';

<SmartImage src="https://cdn.example.com/hero.jpg" alt="Hero" width={1200} priority />
```

See [USAGE.md → Next.js](./USAGE.md#nextjs-app-router) for the full walkthrough.

---

### Vite / React (browser WASM, no server)

```bash
npm install @thinkgrid/snapbolt
```

```tsx
import { useImageOptimizer } from '@thinkgrid/snapbolt';

const { optimizedUrl, loading } = useImageOptimizer(src, { quality: 80, width: 1200 });
```

See [USAGE.md → Vite / Vanilla JS](./USAGE.md#vite--vanilla-js-browser-wasm) for the full walkthrough.

---

### CLI (build-time bulk optimization)

```bash
npx @thinkgrid/snapbolt-cli scan ./public   # convert all JPEG/PNG → WebP
npx @thinkgrid/snapbolt-cli sync ./public   # copy WASM binary to public folder
```

---

## Try it in the browser

[![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/thinkgrid-labs/snapbolt/tree/main/examples/vite)

Open the Vite demo in your browser — no install needed.

---

## What's Shipped

- [x] `SmartImage` component — `src`, `srcset`, `sizes`, `priority`, `fill`, blur placeholder
- [x] `useImageOptimizer` hook — WASM encoding off the main thread via Web Worker (fallback: main thread)
- [x] SIMD128-optimized WASM build — ~2× faster encoding on modern browsers
- [x] In-app Next.js handler — `export { GET } from '@thinkgrid/snapbolt/handler'`
- [x] Standalone `snapbolt-server` (Axum) with Docker image
- [x] CLI bulk conversion — `snapbolt-cli scan ./public`
- [x] AVIF parsing wired — encoding disabled pending `nasm` (see `packages/core/Cargo.toml`)

## Roadmap

### Near-term
- [ ] AVIF encoding — enable `ravif` + `rgb` in `packages/core/Cargo.toml` once `nasm` is in CI
- [ ] Vite plugin — build-time image conversion as a first-class Vite integration
- [ ] Cloudflare Workers / Vercel Edge export — edge-compatible handler alongside the Next.js one

### Later
- [ ] `snapbolt-server` Helm chart for Kubernetes deployments

---

## Contributing

PRs welcome. For bugs, open an issue — include your OS, Node version, and the error output.

---

## License

MIT — [Think Grid Labs](https://github.com/thinkgrid-labs)
