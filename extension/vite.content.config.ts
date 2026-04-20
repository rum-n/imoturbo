import react from "@vitejs/plugin-react";
import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  publicDir: false,
  build: {
    emptyOutDir: true,
    cssCodeSplit: true,
    rollupOptions: {
      input: {
        content: resolve(__dirname, "src/content/index.tsx")
      },
      output: {
        format: "iife",
        inlineDynamicImports: true,
        entryFileNames: "assets/[name].js",
        assetFileNames: "assets/[name][extname]"
      }
    }
  }
});
