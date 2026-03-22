import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite supports .wasm imports natively — no extra plugins needed.
export default defineConfig({
  plugins: [react()],
});
