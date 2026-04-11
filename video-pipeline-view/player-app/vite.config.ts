import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    host: true,
    fs: {
      allow: [path.resolve(__dirname, '../..')],
    },
    proxy: {
      // 代理 /assets 到 Pipeline API（端口 3001）的 public/assets 目录
      '/assets': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        rewrite: (p) => p,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@openclaw-remotion': path.resolve(__dirname, '../../remotion-video/src'),
    },
  },
  build: {
    target: 'esnext',
    minify: 'esbuild',
  },
  optimizeDeps: {
    include: ['react', 'react-dom', '@remotion/player'],
  },
});
