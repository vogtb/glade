import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

/**
 * Vite plugin to exclude .wasm file references from wasm-pack generated code.
 *
 * The wasm-pack generated JS files contain an async __wbg_init() function that
 * references .wasm files via `new URL("xxx_bg.wasm", import.meta.url)`. Even
 * though we use initSync() with embedded base64 WASM, Vite's static analysis
 * sees this URL reference and bundles the .wasm files as separate assets.
 *
 * This plugin rewrites the URL reference to null, preventing Vite from
 * including the .wasm files in the build output.
 */
function excludeWasmPlugin() {
  return {
    name: "exclude-wasm-files",
    transform(code, id) {
      if (!id.includes("/pkg/") || !id.endsWith(".js")) {
        return null;
      }

      const transformed = code.replace(
        /new URL\(["'][^"']+_bg\.wasm["'],\s*import\.meta\.url\)/g,
        "null"
      );

      return { code: transformed, map: null };
    },
  };
}

export default defineConfig({
  integrations: [react()],
  vite: {
    plugins: [tailwindcss(), excludeWasmPlugin()],
    build: {
      chunkSizeWarningLimit: 5000,
    },
  },
  server: {
    port: 3001,
  },
  build: {
    assets: "assets",
  },
});
