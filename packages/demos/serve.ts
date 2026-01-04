import { log } from "@glade/glade";
import { join } from "path";

const ASSETS_DIR = join(import.meta.dir, "../../assets");

const server = Bun.serve({
  port: 3000,
  async fetch(req) {
    const url = new URL(req.url);
    let path = url.pathname;

    if (path === "/") {
      path = "/index.html";
    }

    // Serve font files from assets directory
    if (path.startsWith("/fonts/") && path.endsWith(".ttf")) {
      const fontName = path.slice("/fonts/".length);
      const fontFile = Bun.file(join(ASSETS_DIR, fontName));
      if (await fontFile.exists()) {
        return new Response(fontFile, {
          headers: { "Content-Type": "font/ttf" },
        });
      }
      return new Response("Font Not Found", { status: 404 });
    }

    const file = Bun.file(import.meta.dir + path);

    if (await file.exists()) {
      return new Response(file);
    }

    return new Response("Not Found", { status: 404 });
  },
});

log.info(`server running at http://localhost:${server.port}`);
