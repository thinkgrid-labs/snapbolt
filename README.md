# @thinkgrid/snapbolt

High-performance image optimization for the modern web — powered by Rust and WebAssembly.

---

## Why Snapbolt?

Every web application that handles images faces the same tradeoff: **image quality versus page speed**. Tools like Next.js Image solve this server-side using Node.js and Sharp, but that approach has real costs:

- **Sharp runs in Node.js** — it spawns native C++ workers and can consume hundreds of megabytes of memory per instance under load.
- **Centralized image servers become bottlenecks** — a single resize endpoint processing thousands of user uploads will eventually saturate, no matter how much you scale.
- **Client uploads are wasteful by default** — users upload a 10MB iPhone photo, your server decodes it, resizes it, re-encodes it, and stores three variants. That's three round trips through Node memory for something a browser can do locally in milliseconds.

Snapbolt is built around a different model:

> **Push image processing to where it belongs — either to the client (via WebAssembly) or to a dedicated, low-memory Rust microservice — so your main application server never touches raw image bytes.**

The core engine is written in Rust with zero unsafe code, compiles to a ~200KB WASM binary, and runs the same logic whether it's executing in a browser, a CLI batch job, or a standalone HTTP server.

---

## The Problem Snapbolt Solves

| Scenario                               | Without Snapbolt                                    | With Snapbolt                                                           |
| -------------------------------------- | --------------------------------------------------- | ----------------------------------------------------------------------- |
| User uploads a 8MB photo               | Server decodes + resizes + re-encodes in Node/Sharp | Browser resizes to 1200px WebP before the upload even starts            |
| 1,000 concurrent image resize requests | Node.js + Sharp peaks at ~2GB RAM                   | Rust microservice handles them in ~80MB with non-blocking async I/O     |
| Build-time asset optimization          | Custom webpack plugins or manual scripts            | `snapbolt-cli scan ./public` — parallel Rayon processing in one command |
| Next.js without a server               | Must use Vercel's paid image CDN                    | WASM hook optimizes images entirely in the browser, zero infra cost     |

---

## Packages

| Package                       | What it does                                                                      |
| ----------------------------- | --------------------------------------------------------------------------------- |
| **`@thinkgrid/snapbolt`**     | React hook + Vanilla JS WASM bindings for client-side optimization                |
| **`@thinkgrid/snapbolt-cli`** | Native Node.js CLI for build-time bulk image conversion                           |
| **`snapbolt-server`**         | Standalone Axum HTTP microservice — a self-hostable alternative to `/_next/image` |

---

## Supported Formats

**Input**: JPEG, PNG, WebP (GIF/SVG/TIFF are skipped automatically by the CLI)

**Output**: WebP (lossy, quality-controlled), JPEG, PNG

> AVIF output is architecturally supported but requires `nasm` to be installed (`brew install nasm` on macOS). Once installed, re-enable the `ravif` + `rgb` dependencies in `packages/core/Cargo.toml`.

---

## 1. Browser / React (`@thinkgrid/snapbolt`)

### Installation

```bash
npm install @thinkgrid/snapbolt
```

### Next.js setup (zero extra steps)

Add two options to `next.config.mjs` — that's it. No file copying, no `postinstall` scripts.

```js
// next.config.mjs
const nextConfig = {
  // Lets Next.js compile the snapbolt ESM package
  transpilePackages: ["@thinkgrid/snapbolt"],

  webpack(config) {
    // Tells webpack to handle the WASM binary automatically.
    // It copies snapbolt_bg.wasm to the build output and rewrites the URL —
    // no manual sync step needed.
    config.experiments = { ...config.experiments, asyncWebAssembly: true };
    return config;
  },
};

export default nextConfig;
```

### Other bundlers (Vite, CRA, etc.)

Vite handles `new URL('...wasm', import.meta.url)` natively — no config needed.

For webpack 5 without Next.js, add the same `asyncWebAssembly` experiment to your `webpack.config.js`.

**Manual fallback** (non-webpack environments or static sites):

```bash
npx @thinkgrid/snapbolt-cli sync ./public
```

Then pass the WASM path to the hook:

```ts
useImageOptimizer(src, { wasmUrl: "/snapbolt_bg.wasm" });
```

---

### React Hook

```tsx
import { useImageOptimizer } from "@thinkgrid/snapbolt";

const SmartImage = ({ src }: { src: string }) => {
  const { optimizedUrl, loading, error } = useImageOptimizer(src, {
    quality: 75, // 0–100, default 80
    width: 800, // max width, preserves aspect ratio
  });

  if (loading) return <div className="skeleton" />;

  return <img src={optimizedUrl ?? src} alt="" />;
};
```

### Pre-Upload Optimization

Shrink images on the client before they leave the device. No server CPU, no bandwidth waste.

```tsx
import { useImageOptimizer } from "@thinkgrid/snapbolt";
import { useState } from "react";

const UploadForm = () => {
  const [file, setFile] = useState<File | null>(null);
  const { optimizedUrl, loading } = useImageOptimizer(file, {
    quality: 80,
    width: 1200,
  });

  const handleUpload = async () => {
    if (!optimizedUrl) return;

    // Convert the optimized blob: URL back to a Blob for the FormData
    const resp = await fetch(optimizedUrl);
    const blob = await resp.blob();

    const formData = new FormData();
    formData.append("image", blob, "photo.webp");

    await fetch("/api/upload", { method: "POST", body: formData });
  };

  return (
    <div>
      <input
        type="file"
        accept="image/*"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
      />
      <button onClick={handleUpload} disabled={loading || !optimizedUrl}>
        {loading ? "Optimizing…" : "Upload"}
      </button>
    </div>
  );
};
```

### Vanilla JS / Browser

```ts
import init, { optimize_image_sync } from "@thinkgrid/snapbolt/browser";

async function optimizeToWebP(bytes: Uint8Array, quality = 75): Promise<Blob> {
  await init("/snapbolt_bg.wasm");
  const optimized = optimize_image_sync(bytes, quality);
  return new Blob([optimized], { type: "image/webp" });
}
```

---

## 2. HTTP Microservice (`snapbolt-server`)

A standalone Axum server that exposes an image optimization endpoint — a self-hostable replacement for `/_next/image`. Built entirely in Rust, it handles thousands of concurrent requests with a fraction of the memory footprint of Node.js + Sharp.

### Run

```bash
# Build
cargo build --release -p snapbolt-server

# Run
ALLOWED_DOMAINS=yourdomain.com,cdn.yourdomain.com \
PORT=3000 \
cargo run --release -p snapbolt-server
```

### Endpoint

```
GET /image?url=<encoded-url>&w=<width>&h=<height>&q=<quality>&fmt=<format>
```

| Param | Description                                      | Default  |
| ----- | ------------------------------------------------ | -------- |
| `url` | Source image URL (must be in `ALLOWED_DOMAINS`)  | required |
| `w`   | Target width in pixels (preserves aspect ratio)  | original |
| `h`   | Target height in pixels (preserves aspect ratio) | original |
| `q`   | Quality 1–100                                    | 80       |
| `fmt` | `webp` \| `jpeg` \| `png` \| `auto`              | `auto`   |

When `fmt=auto`, the format is negotiated from the request's `Accept` header (`image/webp` is preferred).

**Examples:**

```bash
# Resize to 800px wide, 75% quality WebP
curl "http://localhost:3000/image?url=https://example.com/photo.jpg&w=800&q=75&fmt=webp" -o out.webp

# Format negotiated from Accept header
curl "http://localhost:3000/image?url=https://example.com/photo.jpg" \
  -H "Accept: image/webp,image/jpeg" -o out.webp

# Health check
curl http://localhost:3000/health
# → {"status":"ok"}
```

### Response Headers

Every image response includes:

```
Content-Type:  image/webp
ETag:          "a3f2b1c4d5e6f7a8"
Cache-Control: public, max-age=31536000, immutable
X-Cache:       HIT | MISS
```

### Configuration

| Env Var           | Description                                        | Default              |
| ----------------- | -------------------------------------------------- | -------------------- |
| `PORT`            | Listening port                                     | `3000`               |
| `ALLOWED_DOMAINS` | Comma-separated domain allowlist (SSRF protection) | open (warn)          |
| `CACHE_MAX_BYTES` | In-memory cache capacity in bytes                  | `524288000` (500 MB) |
| `DEFAULT_QUALITY` | Quality when `q` is not specified                  | `80`                 |

> **Security**: Set `ALLOWED_DOMAINS` in production. If unset, the server logs a warning and allows all domains (useful for local development only).

### Comparison with Next.js Image

| Feature                         | Next.js `/_next/image`  | `snapbolt-server`               |
| ------------------------------- | ----------------------- | ------------------------------- |
| WebP output                     | ✅ via Sharp            | ✅ via libwebp (lossy)          |
| Resize with Lanczos             | ✅                      | ✅                              |
| HTTP caching (ETag + immutable) | ✅                      | ✅                              |
| In-process LRU cache            | ✅                      | ✅ moka (byte-weighted, 1h TTL) |
| SSRF protection                 | ✅ `remotePatterns`     | ✅ `ALLOWED_DOMAINS`            |
| Content negotiation (`Accept`)  | ✅                      | ✅                              |
| Memory model                    | Node.js + Sharp (~high) | Rust async (~low)               |
| Deployable as a single binary   | ❌                      | ✅ ~15MB                        |
| Requires Node.js runtime        | ✅                      | ❌                              |

---

## 3. CLI (`@thinkgrid/snapbolt-cli`)

Native Node.js addon for build-time image processing using Rayon parallel workers.

### Bulk Optimize

Recursively converts all JPEG/PNG images in a directory to WebP before deployment:

```bash
npx @thinkgrid/snapbolt-cli scan ./public
```

### Sync WASM Assets

Copies the WASM binary from `node_modules` to your static folder:

```bash
npx @thinkgrid/snapbolt-cli sync ./public
```

---

## Common Use Cases

**Zero-overhead user uploads** — Resize and compress on the client before uploading. A 10MB iPhone photo becomes a 200KB WebP before a single byte leaves the device.

**Self-hosted image CDN** — Deploy `snapbolt-server` behind a CDN. Serve optimally sized, cached images to any client without managing a Node.js process.

**Privacy-sensitive applications** — Medical imaging, secure messaging, legal document platforms — raw image bytes never leave the user's device.

**Local-first / offline apps** — Web3 DApps, PWAs, and IPFS applications that have no server-side processing can still deliver optimized images via WASM.

**CI/CD asset pipeline** — Run `snapbolt-cli scan` as a build step to convert and compress all static assets before they ship to production.

---

## Troubleshooting

### CORS (images from CDN/S3 not optimizing)

1. Verify the remote server returns `Access-Control-Allow-Origin`.
2. Pass `{ crossOrigin: 'anonymous' }` to `useImageOptimizer`.

### `Module not found` in Next.js

Add `transpilePackages: ['@thinkgrid/snapbolt']` to `next.config.js`.

### WASM not loading

Ensure `snapbolt_bg.wasm` is in your `public` folder and your bundler is not trying to process it. Run `npx @thinkgrid/snapbolt-cli sync ./public` to copy it.

---

## Roadmap

### Short-term

- [ ] SIMD-optimized WASM build for 2× faster encoding on modern browsers
- [ ] Blur-up placeholder generation (Base64 tiny thumbnails for instant-load UX)
- [ ] Web Worker offloading to keep the main thread at 60fps during optimization
- [ ] AVIF output support (requires `nasm` — see note above)

### Mid-term

- [ ] Smart cropping with saliency detection (keep faces/subjects centered)
- [ ] `snapbolt-server` Docker image and Helm chart
- [ ] Vite plugin for build-time image optimization

### Long-term

- [ ] Cloudflare Workers / Vercel Edge deployment templates
- [ ] Video thumbnail extraction via WebCodecs
- [ ] Watermarking and custom filter pipeline

---

## License

MIT — [Think Grid Labs](https://github.com/thinkgrid-labs)
