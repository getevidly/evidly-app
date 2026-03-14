import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, '../../src'),
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/') || id.includes('node_modules/react-router')) return 'vendor-react';
          if (id.includes('node_modules/@supabase/')) return 'vendor-supabase';
          if (id.includes('node_modules/recharts/') || id.includes('node_modules/d3-')) return 'vendor-charts';
          if (id.includes('node_modules/sonner')) return 'vendor-sonner';
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
  optimizeDeps: { exclude: ['lucide-react'] },
});
