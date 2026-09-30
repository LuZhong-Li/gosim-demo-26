import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The backend serves the built frontend on one port; in dev the /api prefix is
// proxied so both servers can run side by side.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: `http://127.0.0.1:${process.env.PORT || 3000}`,
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    globals: true,
  },
});
