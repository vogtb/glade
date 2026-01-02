import { log } from "@glade/logging";
import { watch } from "fs";
import { spawn } from "bun";

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

async function buildJS(): Promise<boolean> {
  const start = performance.now();
  try {
    // Use --root to resolve packages from source, not node_modules symlinks.
    // This allows Bun macros to be processed correctly (macros don't run from node_modules).
    const result = await Bun.build({
      entrypoints: ["./src/main.tsx"],
      outdir: "./dist",
      naming: "[dir]/main.[ext]",
      sourcemap: "inline",
      root: import.meta.dir + "/..",
    });
    if (!result.success) {
      for (const msg of result.logs) {
        log.error(msg.message);
      }
      return false;
    }
    const duration = (performance.now() - start).toFixed(0);
    log.info(`built JS in ${duration}ms`);
    return true;
  } catch (err) {
    log.error("JS build failed:", err);
    return false;
  }
}

async function buildCSS(): Promise<boolean> {
  const start = performance.now();
  try {
    const proc = spawn({
      cmd: [
        "bunx",
        "-p",
        "@tailwindcss/cli",
        "tailwindcss",
        "-i",
        "./src/main.css",
        "-o",
        "./dist/website/src/main.css",
      ],
      cwd: import.meta.dir,
      stdout: "pipe",
      stderr: "pipe",
    });
    const exitCode = await proc.exited;
    if (exitCode !== 0) {
      const stderr = await new Response(proc.stderr).text();
      log.error("CSS build failed:", stderr);
      return false;
    }
    const duration = (performance.now() - start).toFixed(0);
    log.info(`built CSS in ${duration}ms`);
    return true;
  } catch (err) {
    log.error("CSS build failed:", err);
    return false;
  }
}

async function build(): Promise<void> {
  await Promise.all([buildJS(), buildCSS()]);
}

// Initial build
log.info("starting initial build...");
await build();

// Start server
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

log.info(`dev server running at http://localhost:${server.port}`);

// Watch for changes
let rebuildTimeout: Timer | null = null;
const DEBOUNCE_MS = 100;

function scheduleRebuild(changedFile: string): void {
  if (rebuildTimeout) {
    clearTimeout(rebuildTimeout);
  }
  rebuildTimeout = setTimeout(async () => {
    rebuildTimeout = null;
    log.info(`file changed: ${changedFile}`);
    if (changedFile.endsWith(".css")) {
      await buildCSS();
    } else {
      await build();
    }
  }, DEBOUNCE_MS);
}

// Watch src directory
const srcWatcher = watch(import.meta.dir + "/src", { recursive: true }, (_event, filename) => {
  if (filename) {
    scheduleRebuild(filename);
  }
});

// Watch workspace packages that might change
const packagesDir = import.meta.dir + "/..";
const packagesToWatch = ["demos", "glade", "platform", "browser", "core"];

for (const pkg of packagesToWatch) {
  try {
    watch(`${packagesDir}/${pkg}`, { recursive: true }, (_event, filename) => {
      if (filename && (filename.endsWith(".ts") || filename.endsWith(".tsx"))) {
        scheduleRebuild(`${pkg}/${filename}`);
      }
    });
  } catch {
    // Package might not exist, ignore
  }
}

log.info("watching for changes...");

// Keep process alive
process.on("SIGINT", () => {
  log.info("shutting down...");
  srcWatcher.close();
  server.stop();
  process.exit(0);
});
