import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1000, // 将警告阈值调大到 1000kb
    rollupOptions: {
      output: {
        manualChunks: {
          // 将第三方库拆分成单独的 chunk，利用浏览器缓存
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'xyflow': ['@xyflow/react'],
          'pixi': ['pixi.js'],
        },
      },
    },
  },
});
