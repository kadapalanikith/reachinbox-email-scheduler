import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Production base path for GitHub Pages.
// Set VITE_BASE_PATH env to override (e.g. '/' for custom domain).
// For repo: reachinbox-email-scheduler → base = '/reachinbox-email-scheduler/'
const base = process.env.VITE_BASE_PATH || '/reachinbox-email-scheduler/';

export default defineConfig({
  plugins: [react()],
  base,
  server: {
    port: 5173,
    proxy: {
      // Dev only: proxies /api and /admin/queues to local backend
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/admin/queues': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          axios: ['axios'],
        },
      },
    },
  },
});
