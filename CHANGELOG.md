# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.3.0] - 2026-03-22

### Added

- **Web Worker offloading** — WASM encoding now runs off the main thread via a dedicated module Worker (`optimizer.worker.ts`), with automatic fallback to main-thread execution in SSR/Node.js environments. Eliminates jank on encode-heavy pages.
- **`workerBridge.ts` singleton** — shared Worker instance across all `useImageOptimizer` hook invocations; input buffers transferred as `Transferable` (zero-copy) to avoid doubling memory on large images.
- **SIMD128 WASM optimization** — `target-feature=+simd128` applied via `.cargo/config.toml` scoped to `wasm32-unknown-unknown` only. ~2× faster encoding on Chrome 91+, Firefox 89+, Safari 16.4+.
- **Docker multi-stage build** for `snapbolt-server` (`packages/server/Dockerfile`) — Alpine-based, statically linked via musl, final image ~15 MB. No OpenSSL dependency.
- **macOS Intel (x64) CLI binary** — `@thinkgrid/snapbolt-cli-darwin-x64` now listed in `optionalDependencies`; npm installs the correct binary automatically on Intel Macs.
- **Comprehensive test suite** — 37 TypeScript unit tests across `useImageOptimizer`, `SmartImage`, and `workerBridge`; additional Rust unit tests for `snapbolt-core` (resize variants, quality boundaries, AVIF error, format coverage) and `snapbolt-cli` (directory scanning, subdirectory recursion, non-image skipping, valid PNG → WebP output).
- **`tsconfig.test.json`** — separate TypeScript config for test files with `node` types and `webworker` lib, scoped to `src/**/*.test.*`.
- **`vitest.config.ts`** — explicit Vitest config with `jsdom` environment and `tsconfig.test.json` reference.
- **`benchmarks/run.js`** — Node.js benchmark script; measures per-image optimization time and size savings using `@thinkgrid/snapbolt-cli`.

### Fixed

- **`SmartImage` preload link cleanup** — changed `document.head.removeChild(link)` to `link.remove()` in the priority `useEffect` cleanup. Prevents `NotFoundError` (DOM code 8) when test cleanup order is non-deterministic.
- **CI `macos-13` removed** — GitHub deprecated the `macos-13` runner. Both `ci.yml` and `release.yml` now cross-compile `darwin-x64` from `macos-latest` (ARM64) by passing `--target x86_64-apple-darwin` to `napi build`.
- **TypeScript build error** — `"webworker"` added to `tsconfig.json` `lib` array, resolving `Cannot find name 'DedicatedWorkerGlobalScope'` (`TS2304`) in CI `build:ts` step.

### Changed

- `tsconfig.json` `lib` array expanded: `["dom", "dom.iterable", "esnext", "webworker"]`
- CI `cli` job matrix converted from simple `os` list to explicit `include` entries with `target` fields, matching the release workflow.

---

## [0.2.1] - 2026-02-15

### Fixed

- **CLI `optionalDependencies` missing** — `packages/cli/package.json` was not listing any platform sub-packages, so `npm install @thinkgrid/snapbolt-cli` never downloaded the native `.node` binary on any platform. Added all 18 platform entries. Most visibly affected macOS Intel users.
- **GitHub Actions release workflow** — `build-cli` matrix was only building `darwin-arm64` (`macos-latest`). Added explicit `darwin-x64` matrix entry targeting `x86_64-apple-darwin`.
- **Scope rename** — all package names updated from `@think-grid-labs/*` to `@thinkgrid/*` across `package.json` files, import paths, and documentation.

---

## [0.2.0] - 2026-01-20

### Added

- **`SmartImage` React component** with two rendering modes:
  - *Server mode* — builds `src`, `srcset` (responsive), and `sizes` URLs pointing at snapbolt-server or the Next.js handler
  - *WASM mode* — falls back to client-side encoding when no `serverUrl` is configured; shows shimmer skeleton while encoding
- **`SnapboltProvider`** context — `serverUrl`, `defaultQuality`, `defaultFormat`, `breakpoints` props
- **`fill` prop** — absolute positioning + `object-fit: cover`, mirroring `next/image`'s fill behaviour
- **Blur placeholder** — `placeholder="blur"` + `blurDataURL` with CSS fade-out transition after the main image loads
- **`priority` prop** — sets `fetchpriority="high"`, `loading="eager"`, and injects `<link rel="preload">` into `document.head` for LCP images
- **Per-image `serverUrl` override** — bypasses the provider value for a single `SmartImage` instance
- **`snapbolt-server`** standalone Axum HTTP microservice:
  - `GET /image?url=&w=&h=&q=&fmt=` endpoint
  - moka LRU in-memory cache (configurable size)
  - SSRF protection via `ALLOWED_DOMAINS` env var
  - Content-Negotiation: serves AVIF when `Accept: image/avif` is present, otherwise WebP
  - `GET /health` endpoint
- **Next.js API route handler** — `export { GET } from '@thinkgrid/snapbolt/handler'`; one-line integration with no config required
- **`useImageOptimizer` hook** improvements — `cache` option (Cache API, default `true`), `crossOrigin` option, `width`/`height` canvas resize before encoding

### Changed

- `useImageOptimizer` now accepts an options object as the second argument in addition to a plain quality number: `useImageOptimizer(src, { quality: 80, width: 1200 })`

---

## [0.1.0] - 2025-12-01

### Added

- **`snapbolt-core`** Rust crate — `optimize_buffer()` supporting WebP output (native `libwebp-sys` in native builds, pure-Rust `image` crate encoder in WASM), JPEG, and PNG; Lanczos3 resize
- **`snapbolt-cli`** NAPI addon — `optimizeImage(buffer, quality?, width?, height?, format?)` and `optimizeDirectory(path)` Node.js exports; Rayon parallel directory processing
- **WASM build** via `wasm-pack` targeting `wasm32-unknown-unknown`; exports `optimize_image_sync(bytes, quality)` and `default` init function
- **`useImageOptimizer` hook** (initial version) — URL string source only; fetch → WASM encode → `blob:` URL
- **Monorepo structure** — `packages/core`, `packages/cli`, `packages/snapbolt`, `packages/server` with npm workspaces
- **GitHub Actions** — CI (`ci.yml`) and release (`release.yml`) workflows
