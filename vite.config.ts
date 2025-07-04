import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  build: {
    // Code splitting optimization
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunk for large libraries
          vendor: ['react', 'react-dom'],
          // Supabase chunk
          supabase: ['@supabase/supabase-js'],
          // Date utilities chunk
          dateUtils: ['date-fns'],
          // Icons chunk
          icons: ['lucide-react']
        }
      }
    },
    // Enable compression
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    }
  },
  server: {
    // Enable compression for dev server
    headers: {
      'Cache-Control': 'public, max-age=31536000'
    }
  }
});