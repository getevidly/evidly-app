import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Vite's __vitePreload helper is a virtual module shared by every
          // dynamic import. Left unassigned, Rollup co-located it inside
          // vendor-pdf, so the entry chunk statically imported that 580 kB
          // chunk just to get the helper - dragging jspdf onto the critical
          // path of every page. Giving it its own tiny chunk keeps it out.
          if (id.includes('vite/preload-helper')) return 'vendor-preload';
          // Core React runtime
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/') || id.includes('node_modules/react-router')) {
            return 'vendor-react';
          }
          // Supabase client
          if (id.includes('node_modules/@supabase/')) return 'vendor-supabase';
          // Charts
          if (id.includes('node_modules/recharts/') || id.includes('node_modules/d3-')) return 'vendor-charts';
          // PDF / document generation (jspdf + html2canvas)
          if (id.includes('node_modules/jspdf') || id.includes('node_modules/html2canvas')) return 'vendor-pdf';
          // Sonner toast library
          if (id.includes('node_modules/sonner')) return 'vendor-sonner';
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
