import { defineConfig } from 'vite';
import legacy from '@vitejs/plugin-legacy';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const gameRoot = path.resolve(__dirname, 'game');
const distRoot = path.resolve(__dirname, 'dist');

function copyDirSync(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDirSync(from, to);
    else fs.copyFileSync(from, to);
  }
}

/**
 * Classic (non-module) scripts live under game/js and are referenced by defer tags.
 * Vite does not emit them into dist — copy after bundle so preview / itch work.
 * Also keep web manifest at dist root so icon paths resolve to ./ART/...
 */
function classicDistAssetsPlugin() {
  return {
    name: 'classic-dist-assets',
    closeBundle() {
      const jsSrc = path.join(gameRoot, 'js');
      const jsDest = path.join(distRoot, 'js');
      if (!fs.existsSync(jsSrc)) {
        console.warn('[classic-dist-assets] game/js missing — skip');
        return;
      }
      fs.rmSync(jsDest, { recursive: true, force: true });
      copyDirSync(jsSrc, jsDest);
      console.log('[classic-dist-assets] copied game/js → dist/js');

      const manifestSrc = path.join(gameRoot, 'manifest.json');
      if (fs.existsSync(manifestSrc)) {
        fs.copyFileSync(manifestSrc, path.join(distRoot, 'manifest.json'));
      }

      const indexPath = path.join(distRoot, 'index.html');
      if (!fs.existsSync(indexPath)) return;
      let html = fs.readFileSync(indexPath, 'utf8');
      html = html.replace(
        /href="\.\/assets\/manifest-[^"]+\.json"/,
        'href="./manifest.json"',
      );
      html = html.replace(
        /href="\.\/assets\/Title%20art-[^"]+\.png"/,
        'href="./ART/Title%20art.png"',
      );
      fs.writeFileSync(indexPath, html);
      console.log('[classic-dist-assets] fixed manifest + favicon paths in dist/index.html');
    },
  };
}

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
    open: true,
  },

  // Plugins
  plugins: [
    // Legacy browser support
    legacy({
      targets: ['defaults', 'not IE 11'],
    }),
    classicDistAssetsPlugin(),
  ],

  // CSS configuration
  css: {
    devSourcemap: true,
  },

  // Optimize dependencies
  optimizeDeps: {
    include: ['workbox-window'],
  },

  // Define global constants (__DEV__ for classic scripts that cannot use import.meta)
  define: {
    __VERSION__: JSON.stringify(process.env.npm_package_version),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    __DEV__: JSON.stringify(process.env.NODE_ENV !== 'production'),
  },
});
