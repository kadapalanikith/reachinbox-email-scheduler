import { defineConfig } from 'vite';
// Vite configuration with Tailwind PostCSS support
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
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
});
