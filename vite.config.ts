import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  base: "/app-lectorComics/",
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "apple-touch-icon.png"],
      manifest: {
        id: "/app-lectorComics/",
        lang: "es",
        orientation: "any",
        name: "Lector Comics",
        short_name: "Lector",
        description: "PWA personal para leer comics en iPhone, Android, tablets y web.",
        categories: ["books", "entertainment"],
        prefer_related_applications: false,
        theme_color: "#202425",
        background_color: "#f4f6f2",
        display: "standalone",
        display_override: ["standalone", "minimal-ui", "browser"],
        start_url: "/app-lectorComics/",
        scope: "/app-lectorComics/",
        icons: [
          {
            src: "/app-lectorComics/pwa-192.png",
            sizes: "192x192",
            type: "image/png"
          },
          {
            src: "/app-lectorComics/pwa-512.png",
            sizes: "512x512",
            type: "image/png"
          },
          {
            src: "/app-lectorComics/maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable"
          }
        ]
      }
    })
  ],
  server: {
    host: true,
    port: 4173
  }
});