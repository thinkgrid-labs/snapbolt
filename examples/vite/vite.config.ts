import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    // Exclude snapbolt from pre-bundling so Vite doesn't rewrite the
    // import.meta.url-based WASM path inside the wasm-pack glue code.
    // Without this, the browser receives an HTML 404 page instead of the .wasm binary.
    exclude: ['@thinkgrid/snapbolt'],
  },
});
