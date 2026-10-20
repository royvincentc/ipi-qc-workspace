import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
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
