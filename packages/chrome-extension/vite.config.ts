import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { copyFileSync, existsSync, mkdirSync } from 'fs';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'copy-assets',
      closeBundle() {
        // Ensure dist directory exists
        if (!existsSync('dist')) {
          mkdirSync('dist', { recursive: true });
        }
        
        // Copy all icon files
        const icons = [
          'icon16.png', 'icon48.png', 'icon128.png',
          'icon16-gray.png', 'icon48-gray.png', 'icon128-gray.png',
          'manifest.json'
        ];
        
        icons.forEach(icon => {
          const src = resolve(__dirname, 'public', icon);
          const dest = resolve(__dirname, 'dist', icon);
          if (existsSync(src)) {
            copyFileSync(src, dest);
            console.log(`Copied ${icon} to dist`);
          }
        });
      }
    }
  ],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'popup.html'),
        content: resolve(__dirname, 'src/content/index.ts'),
        background: resolve(__dirname, 'src/background/index.ts'),
        'content/page-script': resolve(__dirname, 'src/content/page-script.js'),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'popup') return '[name].js';
          if (chunkInfo.name === 'content/page-script') return 'content/page-script.js';
          return `${chunkInfo.name}/index.js`;
        },
        chunkFileNames: '[name]-[hash].js',
        assetFileNames: '[name][extname]',
      },
    },
  },
});