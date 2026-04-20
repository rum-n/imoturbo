import react from "@vitejs/plugin-react";
import { copyFileSync, mkdirSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "vite";

function copyDirSync(src: string, dest: string) {
  mkdirSync(dest, { recursive: true });
  const files = readdirSync(src);
  files.forEach((file: string) => {
    const srcFile = resolve(src, file);
    const destFile = resolve(dest, file);
    copyFileSync(srcFile, destFile);
  });
}

export default defineConfig({
  publicDir: false,
  plugins: [
    react(),
    {
      name: "copy-extension-manifest",
      writeBundle() {
        copyFileSync(
          resolve(__dirname, "manifest.json"),
          resolve(__dirname, "dist/manifest.json"),
        );
        copyDirSync(
          resolve(__dirname, "public/icons"),
          resolve(__dirname, "dist/public/icons"),
        );
      },
    },
  ],
  build: {
    emptyOutDir: false,
    rollupOptions: {
      input: {
        popup: resolve(__dirname, "src/popup/index.html"),
        background: resolve(__dirname, "src/background/index.ts"),
      },
      output: {
        entryFileNames: "assets/[name].js",
        chunkFileNames: "assets/[name].js",
        assetFileNames: "assets/[name][extname]",
      },
    },
  },
});
