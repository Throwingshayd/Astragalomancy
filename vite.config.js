import { defineConfig } from 'vite';
import legacy from '@vitejs/plugin-legacy';

export default defineConfig({
  root: 'game',
  base: './',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    assetsDir: 'assets',
    sourcemap: false,
  },
  
  // Development server configuration
  server: {
    port: 3000,
    // Listen on all interfaces (Cursor port forwarding, LAN, WSL, cloud VM)
    host: true, // 0.0.0.0 + IPv6 (::1) for localhost
    // Do not auto-open a browser on the remote VM — use Ports / http://localhost:3000 locally
    open: false,
    cors: true,
    strictPort: true,
    allowedHosts: true,
    // HMR: keep websocket on the same port users forward (avoids blank page / "won't load")
    hmr: {
      host: 'localhost',
      port: 3000,
      clientPort: 3000,
      protocol: 'ws',
    },
  },
  
  // Preview server configuration
  preview: {
    port: 4173,
    open: true
  },
  
  // Plugins
  plugins: [
    // Legacy browser support
    legacy({
      targets: ['defaults', 'not IE 11']
    })
  ],
  
  // CSS configuration
  css: {
    devSourcemap: true
  },
  
  // Optimize dependencies
  optimizeDeps: {
    include: ['workbox-window']
  },
  
  // Define global constants (__DEV__ for classic scripts that cannot use import.meta)
  define: {
    __VERSION__: JSON.stringify(process.env.npm_package_version),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    __DEV__: JSON.stringify(process.env.NODE_ENV !== 'production'),
  }
});

