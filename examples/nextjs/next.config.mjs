/** @type {import('next').NextConfig} */
const nextConfig = {
  // Lets Next.js/Turbopack compile the snapbolt ESM package on the client.
  transpilePackages: ['@think-grid-labs/snapbolt'],

  // Keeps the native NAPI addon (.node binary) out of the bundle for both
  // Turbopack (dev) and webpack (next build). snapbolt itself is NOT listed here —
  // Turbopack rejects a package in both transpilePackages and serverExternalPackages.
  serverExternalPackages: ['@think-grid-labs/snapbolt-cli'],

  // Turbopack (next dev — the default in Next.js 15).
  // WASM is supported natively. resolveExtensions is set to suppress the
  // "Webpack is configured while Turbopack is not" warning when no webpack() fn exists.
  turbopack: {
    resolveExtensions: ['.tsx', '.ts', '.jsx', '.js', '.mjs', '.json', '.wasm'],
  },
};

export default nextConfig;
