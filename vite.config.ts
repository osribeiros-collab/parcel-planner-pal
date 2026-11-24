// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { VitePWA } from "vite-plugin-pwa";

// Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
// @cloudflare/vite-plugin builds from this — wrangler.jsonc main alone is insufficient.
export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    plugins: [
      VitePWA({
        strategies: "generateSW",
        registerType: "autoUpdate",
        injectRegister: null,
        filename: "sw.js",
        devOptions: { enabled: false },
        manifest: false,
        workbox: {
          globDirectory: "dist/client",
          swDest: "dist/client/sw.js",
          globPatterns: ["**/*.{js,css,html,png,svg,ico,webmanifest,woff,woff2,wasm,gz}"],
          maximumFileSizeToCacheInBytes: 12 * 1024 * 1024,
          navigateFallback: null,
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: true,
          runtimeCaching: [
            {
              // HTML navigations: sempre tenta a rede, cai no cache quando offline
              urlPattern: ({ request, url, sameOrigin }) =>
                sameOrigin && request.mode === "navigate" && !url.pathname.startsWith("/~oauth"),
              handler: "NetworkFirst",
              options: {
                cacheName: "harvest-pages",
                networkTimeoutSeconds: 4,
                expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 60 },
              },
            },
            {
              // Assets do build (chunks lazy: pdfjs, jspdf, etc.)
              urlPattern: ({ request, url, sameOrigin }) =>
                sameOrigin && /\/assets\/[^/]+-[A-Za-z0-9_-]{8,}\.[^/]+$/.test(url.pathname) &&
                ["script", "style", "worker", "font", "image"].includes(request.destination),
              handler: "CacheFirst",
              options: {
                cacheName: "harvest-assets",
                expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 365 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
          ],
        },
      }),
    ],
  },
});
