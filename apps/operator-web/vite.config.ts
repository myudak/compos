import path from "node:path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { VitePWA } from "vite-plugin-pwa"

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "K-POS Operator",
        short_name: "K-POS",
        description: "Kasir offline-first yang tetap jalan tanpa sinyal dan sync saat terkoneksi",
        theme_color: "#09090b",
        background_color: "#09090b",
        lang: "id",
        display: "standalone",
        start_url: "/",
      },
      workbox: {
        navigateFallback: "/index.html",
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        navigateFallbackDenylist: [
          /^\/entry\//,
          /^\/owner\//,
          /^\/api\//,
          /^\/health$/,
          /^\/metrics$/,
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
