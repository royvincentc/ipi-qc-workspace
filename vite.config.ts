import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  cacheDir: './.vite',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: process.env.VITE_HOST || '127.0.0.1',
    watch: {
      ignored: ['**/private/**', '**/.data/**', '**/preview/**', '**/node_modules/**'],
    },
    proxy: {
      '/api': 'http://127.0.0.1:3001',
    },
  },
});
