import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { VitePWA } from "vite-plugin-pwa"

export default defineConfig({
  base: "/owner/",
  server: { port: 5175 },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "K-POS Owner",
        short_name: "K-POS Owner",
        description: "Control room merchant untuk reporting dan exception workflow.",
        theme_color: "#07090d",
        background_color: "#07090d",
        lang: "id",
        display: "standalone",
        start_url: "/owner/",
        scope: "/owner/",
      },
      workbox: {
        navigateFallback: "/owner/index.html",
        globPatterns: ["**/*.{js,css,html,png,woff2}"],
        navigateFallbackDenylist: [/^\/api\//, /^\/health$/, /^\/metrics$/],
      },
    }),
  ],
})
