import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ command }) => {
  // Production base path for GitHub Pages.
  // In dev: '/' so localhost:5173 works directly.
  // In build: '/reachinbox-email-scheduler/' for GitHub Pages project path.
  const base = process.env.VITE_BASE_PATH || (command === 'build' ? '/reachinbox-email-scheduler/' : '/');

  return {
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
  };
});
