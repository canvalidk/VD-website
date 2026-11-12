import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  // The Workshop's trace doer talks to the local VDfirst bridge (workbench_server.py). Development only:
  // the bridge checks the Host header, so the proxy presents the bridge's own address.
  // The bridge accepts pages on ports 5173 and 5174 only, so the dev server keeps to 5173.
  server: { port: 5173, strictPort: true, proxy: { '/api/workbench': { target: 'http://127.0.0.1:8765', changeOrigin: true } } },
});
