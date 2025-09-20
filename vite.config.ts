import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    server: {
      port: 3000,
      open: true,
      host: true,
      cors: true,
      allowedHosts: true,
    },
    define: {
      'process.env': {},
    },
    build: {
      sourcemap: false,
      outDir: 'dist',
    },
  };
});


