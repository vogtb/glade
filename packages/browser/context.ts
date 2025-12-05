import type { GLContext, RenderCallback, ContextOptions } from "@bun-gui/core";

export interface BrowserContextOptions extends ContextOptions {
  canvas?: HTMLCanvasElement;
  attributes?: WebGLContextAttributes;
}

export interface BrowserContext extends GLContext {
  gl: WebGL2RenderingContext;
  canvas: HTMLCanvasElement;
}

// Creates a WebGL2 context for browser rendering. Automatically appends canvas
// to document.body unless a custom canvas is provided.
export function createContext(options: BrowserContextOptions = {}): BrowserContext {
  const canvas = options.canvas ?? document.createElement("canvas");
  const width = options.width ?? 800;
  const height = options.height ?? 600;

  canvas.width = width;
  canvas.height = height;

  if (!options.canvas) {
    document.body.appendChild(canvas);
  }

  const gl = canvas.getContext("webgl2", options.attributes);
  if (!gl) {
    throw new Error("Failed to get WebGL2 context");
  }

  gl.viewport(0, 0, width, height);

  return {
    gl,
    canvas,
    width,
    height,
    destroy() {
      // no-op on browser - page lifecycle handles cleanup.
      // only have this here for compatibility, so we're not writing
      // platform specific code in our app
    },
  };
}

// Simple render loop for browser. Time values are normalized to seconds to match darwin behavior.
export function runRenderLoop(ctx: BrowserContext, callback: RenderCallback): void {
  let lastTime = 0;

  function frame(timeMs: number) {
    // Convert milliseconds to seconds to match darwin
    const time = timeMs / 1000;
    const deltaTime = lastTime ? time - lastTime : 0;
    lastTime = time;

    const shouldContinue = callback(time, deltaTime);
    if (shouldContinue !== false) {
      requestAnimationFrame(frame);
    }
  }

  requestAnimationFrame(frame);
}
