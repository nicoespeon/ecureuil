import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // Silent update: the new service worker takes over at once, the open page keeps running,
    // and the next launch loads the new version (docs/research/vite-plugin-pwa.md).
    VitePWA({
      registerType: "autoUpdate",
      // The rounded type offline too: its Latin subset, the one French text ever asks for.
      workbox: { globPatterns: ["**/*.{js,css,html}", "**/nunito-latin-wght-normal-*.woff2"] },
      includeAssets: ["favicon.ico", "favicon.svg", "apple-touch-icon-180x180.png"],
      manifest: {
        name: "Écureuil",
        short_name: "Écureuil",
        description: "La liste de courses du foyer, rangée dans l'ordre des rayons.",
        lang: "fr",
        display: "standalone",
        theme_color: "#fcf2e4",
        background_color: "#fef3c7",
        icons: [
          { src: "pwa-64x64.png", sizes: "64x64", type: "image/png" },
          { src: "pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512x512.png", sizes: "512x512", type: "image/png" },
          {
            src: "maskable-icon-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
    }),
  ],
  test: {
    environment: "happy-dom",
    setupFiles: ["./src/test-setup.ts"],
    restoreMocks: true,
  },
});
