import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // 'base' should ideally be '/repo-name/' for GitHub Pages, 
  // but './' works for most relative path deployments
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
  publicDir: '.', // This allows files in root (like henderson.png) to be copied to dist
});