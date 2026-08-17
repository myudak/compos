import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { VitePWA } from "vite-plugin-pwa"

export default defineConfig({
  base: "/owner/",
  server: { port: 5174 },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "COMPOS Owner",
        short_name: "COMPOS Owner",
        description: "Merchant intelligence dengan reporting yang transparan dan terukur.",
        theme_color: "#07090d",
        background_color: "#07090d",
        lang: "id",
        display: "standalone",
        start_url: "/owner/",
        scope: "/owner/",
        icons: [
          {
            src: "brand/compos-icon.png",
            sizes: "1254x1254",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        navigateFallback: "/owner/index.html",
        globPatterns: ["**/*.{js,css,html,png,woff2}"],
        globIgnores: ["brand/compos-sync-without-signal.png"],
      },
    }),
  ],
})
