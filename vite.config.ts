import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // 'base' needs to be relative for GitHub Pages to find assets correctly
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  }
  // We removed "publicDir" here so Vite automatically looks for the "public" folder you created
});