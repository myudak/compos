import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { VitePWA } from "vite-plugin-pwa"

export default defineConfig({
  base: "/entry/",
  server: { port: 5174 },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "K-POS Entry",
        short_name: "K-POS Entry",
        description: "Catalog dan inventory workspace untuk merchant K-POS.",
        theme_color: "#071014",
        background_color: "#071014",
        lang: "id",
        display: "standalone",
        start_url: "/entry/",
        scope: "/entry/",
      },
      workbox: {
        navigateFallback: "/entry/index.html",
        navigateFallbackDenylist: [/^\/api\//, /^\/health$/, /^\/metrics$/],
        globPatterns: ["**/*.{js,css,html,woff2}"],
      },
    }),
  ],
})
