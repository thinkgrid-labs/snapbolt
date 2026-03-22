# @thinkgrid/snapbolt

High-performance image optimization for the modern web — powered by Rust and WebAssembly.

> Full usage instructions: **[USAGE.md](./USAGE.md)**

---

## What is Snapbolt?

Snapbolt is an image optimization toolkit with three deployment modes:

| Mode | Package | Best for |
|---|---|---|
| **In-app server** | `@thinkgrid/snapbolt` + `@thinkgrid/snapbolt-cli` | Next.js / Express — optimizes images inside your existing server process |
| **Browser / WASM** | `@thinkgrid/snapbolt` | Vite, CRA, static sites, pre-upload optimization — no server required |
| **Standalone server** | `snapbolt-server` (Rust binary) | Self-hosted image CDN, decoupled from your Node.js app |
| **CLI** | `@thinkgrid/snapbolt-cli` | Build-time bulk conversion, CI/CD pipelines |

---

## Packages

| Package | What it does |
|---|---|
| **`@thinkgrid/snapbolt`** | React `SmartImage` component + `useImageOptimizer` hook + Vanilla JS WASM bindings |
| **`@thinkgrid/snapbolt-cli`** | Native Node.js NAPI addon — powers the in-app server handler and the CLI |
| **`snapbolt-server`** | Standalone Axum HTTP microservice (self-hostable `/_next/image` replacement) |

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
  turbopack: {
    resolveExtensions: ['.tsx', '.ts', '.jsx', '.js', '.mjs', '.json', '.wasm'],
  },
};
export default nextConfig;
```

```ts
// app/api/image/route.ts — one line, zero config
export { GET } from '@thinkgrid/snapbolt/handler';
```

```tsx
// app/layout.tsx
import { SnapboltProvider } from '@thinkgrid/snapbolt';

export default function RootLayout({ children }) {
  return (
    <html><body>
      <SnapboltProvider serverUrl="/api">{children}</SnapboltProvider>
    </body></html>
  );
}
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

## Supported Formats

**Input**: JPEG, PNG, WebP
**Output**: WebP (default), JPEG, PNG

> AVIF output is architecturally supported but disabled by default (requires `nasm`).

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

## License

MIT — [Think Grid Labs](https://github.com/thinkgrid-labs)
