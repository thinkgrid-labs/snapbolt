# @think-grid-labs/opti-assets-cli

Native CLI tool for high-speed local image processing and asset management.

## Installation
```bash
npm install -g @think-grid-labs/opti-assets-cli
```

## Commands

### 1. Sync WASM Binary
If you are using `@think-grid-labs/opti-assets` in a web project, use this to copy the required WASM binary to your public folder:
```bash
opti-assets-cli sync ./public
```

### 2. Bulk Optimize (Scan)
Recursively scan and shrink images (PNG/JPG) in your local folder:
```bash
opti-assets-cli scan ./public
```

## Why use this?
- **Native Performance**: Built with Rust for maximum speed.
- **Developer Productivity**: Automates the complex setup of WASM binaries in Next.js/Vite projects.

For full documentation, visit our [GitHub Repository](https://github.com/ThinkGrid-Labs/opti-assets).
