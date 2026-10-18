import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: loadEnv(mode, ".", "PAGES_").PAGES_BASE_PATH || "/",
  build: { chunkSizeWarningLimit: 1600 },
}));
