import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        intro: resolve(__dirname, 'intro.html'),
        game: resolve(__dirname, 'game.html'),
      },
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
