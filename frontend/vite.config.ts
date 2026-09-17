import { defineConfig } from 'vite';

// Dev-only proxy so relative /api/* calls reach the backend (which serves
// the frontend from the same origin in production, avoiding the need for
// CORS handling altogether).
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
