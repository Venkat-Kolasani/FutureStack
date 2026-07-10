import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { crx } from '@crxjs/vite-plugin';
import manifest from './manifest.json';

export default defineConfig({
  plugins: [
    react(),
    crx({ manifest }),
  ],
  build: {
    rollupOptions: {
      input: {
        content: 'src/content.js',
        background: 'src/background.js',
      },
      output: {
        entryFileNames: (chunk) => {
          if (chunk.name === 'content') return 'src/content.js';
          if (chunk.name === 'background') return 'src/background.js';
          return '[name].js';
        },
      },
    },
  },
});