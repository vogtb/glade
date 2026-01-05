const PORT = 3001;

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
};

function getMimeType(path: string): string {
  const ext = path.substring(path.lastIndexOf("."));
  return MIME_TYPES[ext] ?? "application/octet-stream";
}

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    let path = url.pathname;

    if (path === "/") {
      path = "/index.html";
    }

    // Try dist directory first for built assets
    let file = Bun.file(import.meta.dir + "/dist" + path);
    if (await file.exists()) {
      return new Response(file, {
        headers: { "Content-Type": getMimeType(path) },
      });
    }

    // Fall back to root for index.html
    file = Bun.file(import.meta.dir + path);
    if (await file.exists()) {
      return new Response(file, {
        headers: { "Content-Type": getMimeType(path) },
      });
    }

    return new Response("Not Found", { status: 404 });
  },
});

console.info(`website server running at http://localhost:${server.port}`);
