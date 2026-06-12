import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

const host = process.env.TAURI_DEV_HOST;
const forgemomentRoot = new URL('../../forgemoment/', import.meta.url);

export default defineConfig({
  plugins: [react({
    exclude: /[\\/]forgemoment[\\/]src[\\/]MediaViewer\.jsx$/,
  })],
  clearScreen: false,
  resolve: {
    alias: [
      { find: /^forgemoment\/styles$/, replacement: fileURLToPath(new URL('src/tokens.css', forgemomentRoot)) },
      { find: /^forgemoment$/, replacement: fileURLToPath(new URL('src/index.js', forgemomentRoot)) },
    ],
  },
  optimizeDeps: {
    exclude: ['forgemoment'],
  },
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? { protocol: 'ws', host, port: 1421 }
      : undefined,
    watch: { ignored: ['**/src-tauri/**'] },
    fs: {
      allow: [
        fileURLToPath(new URL('.', import.meta.url)),
        fileURLToPath(new URL('../../forgemoment', import.meta.url)),
      ],
    },
  },
  envPrefix: ['VITE_', 'TAURI_'],
  build: {
    target: 'esnext',
    minify: 'esbuild',
    sourcemap: true,
  },
});
