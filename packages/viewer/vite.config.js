import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { resolve } from 'path';

export default defineConfig({
  plugins: [svelte()],
  server: {
    port: 5174,
    strictPort: true,
    clearScreen: false,
    proxy: {
      '/api': 'https://zender-directory.fly.dev',
    },
  },
  preview: {
    host: true,
    port: 4173,
    proxy: {
      '/api': 'https://zender-directory.fly.dev',
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        miniplayer: resolve(__dirname, 'miniplayer.html'),
      },
    },
  },
});
