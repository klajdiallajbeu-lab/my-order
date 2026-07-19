import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { visualizer } from "rollup-plugin-visualizer";

export default defineConfig({
  plugins: [
    react(),
    visualizer({
      filename: "dist/stats.html",
      gzipSize: true,
      brotliSize: true,
    }),
  ],

  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {

        manualChunks(id) {
  if (id.includes("node_modules")) {
    if (id.includes("react-dom") || id.includes("/react/") || id.includes("react-router")) {
      return "vendor";
    }
    if (id.includes("axios")) {
      return "vendor";
    }
    if (id.includes("recharts")) {
      return "charts";
    }
    if (id.includes("lucide-react")) {
      return "icons";
    }
    if (id.includes("qz-tray")) {
      return "printer";
    }
  }
},
      },
    },
  },

  server: {
    host: true,
    port: 5173,
    strictPort: true,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:5000",
        changeOrigin: true,
        secure: false,
      },
      "/uploads": {
        target: "http://127.0.0.1:5000",
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
