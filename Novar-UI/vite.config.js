// Vite config for the NOVAAR frontend.
// In local dev the dev server proxies API traffic to the FastAPI backend on :8000.
// In production VITE_API_BASE_URL (set at build time) points at the deployed API.

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/upload": "http://localhost:8000",
      "/chat": "http://localhost:8000",
      "/sessions": "http://localhost:8000",
      "/health": "http://localhost:8000",
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});