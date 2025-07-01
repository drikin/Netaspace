import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

export default defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer(),
          ),
        ]
      : []),
  ],
  logLevel: 'info',
  server: {
    host: '0.0.0.0', // Listen on all interfaces for Docker
    port: 3000,
    strictPort: false,
    hmr: {
      port: 3000,
      host: 'localhost' // HMR should connect to localhost from the browser
    },
    watch: {
      usePolling: true, // Enable polling for Docker volumes
      interval: 100
    },
    allowedHosts: [
      'localhost',
      '127.0.0.1',
      '501f69cc-2328-4443-a1ab-fedf538f9e9b-00-2dnq4o7yktcm.kirk.replit.dev',
      '.replit.dev', // Allow all replit.dev subdomains
    ],
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
});
