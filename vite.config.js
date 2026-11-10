import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// In development, Vite serves the screens on port 5173 and forwards
// every /api request to our small server on port 8787.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { "/api": "http://localhost:8787" },
  },
});
