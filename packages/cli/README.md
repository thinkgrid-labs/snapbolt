# @thinkgrid/snapbolt-cli

Native Node.js NAPI addon for high-speed image optimization — powers both the in-app Next.js handler and the CLI.

> Full usage guide: **[USAGE.md](../../USAGE.md)**

---

## Platform support

npm automatically downloads the right prebuilt binary for your platform via `optionalDependencies`. No Rust toolchain required.

| Platform | Binary |
|---|---|
| macOS Apple Silicon (arm64) | `snapbolt-cli.darwin-arm64.node` |
| macOS Intel (x64) | `snapbolt-cli.darwin-x64.node` |
| Linux x64 glibc | `snapbolt-cli.linux-x64-gnu.node` |
| Linux x64 musl (Alpine) | `snapbolt-cli.linux-x64-musl.node` |
| Linux arm64 glibc | `snapbolt-cli.linux-arm64-gnu.node` |
| Linux arm64 musl | `snapbolt-cli.linux-arm64-musl.node` |
| Windows x64 | `snapbolt-cli.win32-x64-msvc.node` |

---

## Usage in Next.js

See [packages/snapbolt](../snapbolt/README.md) for the full Next.js setup. In short:

```bash
npm install @thinkgrid/snapbolt @thinkgrid/snapbolt-cli
```

```ts
// app/api/image/route.ts
export { GET } from '@thinkgrid/snapbolt/handler';
```

The handler loads `@thinkgrid/snapbolt-cli` at runtime (not bundled) to process images.

---

## CLI commands

### Global install

```bash
npm install -g @thinkgrid/snapbolt-cli
```

### Bulk optimize images

Recursively converts all JPEG/PNG in a directory to WebP:

```bash
snapbolt-cli scan ./public
# or without global install:
npx @thinkgrid/snapbolt-cli scan ./public
```

### Sync WASM binary

Copies `snapbolt_bg.wasm` from `node_modules` to your public folder (needed for browser WASM mode):

```bash
snapbolt-cli sync ./public
```

**Automate with postinstall:**

```json
"scripts": {
  "postinstall": "snapbolt-cli sync ./public"
}
```

---

## Troubleshooting

**Binary not loading on macOS Intel** — Upgrade to `@thinkgrid/snapbolt-cli` ≥ 0.2.1 and run `npm install` again. Earlier versions were missing the `optionalDependencies` entry for `darwin-x64`.

**`Failed to load native binding`** — Run `npm install` to trigger the optional dependency resolution for your platform.
