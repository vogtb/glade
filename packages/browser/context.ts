import type { WebGLContext, WebGPUContext, RenderCallback, ContextOptions } from "@glade/core";
import {
  KeyAction,
  MouseButton,
  ModifierKey,
  type KeyCallback,
  type CharCallback,
  type MouseButtonCallback,
  type CursorMoveCallback,
  type ScrollCallback,
  type ResizeCallback,
  type CloseCallback,
  type FocusCallback,
  type CursorEnterCallback,
  type RefreshCallback,
} from "@glade/core/events.ts";

export interface BrowserContextOptions extends ContextOptions {
  canvas?: HTMLCanvasElement;
  attributes?: WebGLContextAttributes;
}

export interface BrowserWebGPUContextOptions extends ContextOptions {
  canvas?: HTMLCanvasElement;
  powerPreference?: GPUPowerPreference;
}

// WebGL context interface
export interface BrowserWebGLContext extends WebGLContext {
  gl: WebGL2RenderingContext;
  canvas: HTMLCanvasElement;
}

// WebGPU context interface
export interface BrowserWebGPUContext extends WebGPUContext {
  canvas: HTMLCanvasElement;
}

/**
 * @deprecated Use BrowserWebGLContext instead
 */
export type BrowserContext = BrowserWebGLContext;

// Creates a WebGL2 context for browser rendering. Automatically appends canvas
// to document.body unless a custom canvas is provided.
export function createWebGLContext(options: BrowserContextOptions = {}): BrowserWebGLContext {
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

  // Helper to convert DOM modifier keys to our bitmask
  function getModifiers(e: KeyboardEvent | MouseEvent): number {
    let mods = 0;
    if (e.shiftKey) mods |= ModifierKey.Shift;
    if (e.ctrlKey) mods |= ModifierKey.Control;
    if (e.altKey) mods |= ModifierKey.Alt;
    if (e.metaKey) mods |= ModifierKey.Super;
    return mods;
  }

  return {
    gl,
    canvas,
    width,
    height,

    destroy() {
      // no-op on browser - page lifecycle handles cleanup.
    },

    onKey(callback: KeyCallback): () => void {
      const handleKeyDown = (e: KeyboardEvent) => {
        callback({
          key: e.keyCode,
          scancode: e.keyCode,
          action: e.repeat ? KeyAction.Repeat : KeyAction.Press,
          mods: getModifiers(e),
        });
      };
      const handleKeyUp = (e: KeyboardEvent) => {
        callback({
          // TODO: I should have paid attention to the deprecated warnings here
          // and used `code` or `key` instead.
          key: e.keyCode,
          scancode: e.keyCode,
          action: KeyAction.Release,
          mods: getModifiers(e),
        });
      };
      canvas.addEventListener("keydown", handleKeyDown);
      canvas.addEventListener("keyup", handleKeyUp);
      return () => {
        canvas.removeEventListener("keydown", handleKeyDown);
        canvas.removeEventListener("keyup", handleKeyUp);
      };
    },

    onChar(callback: CharCallback): () => void {
      const handleKeyPress = (e: KeyboardEvent) => {
        if (e.key.length === 1) {
          callback({
            codepoint: e.key.codePointAt(0) ?? 0,
            char: e.key,
          });
        }
      };
      canvas.addEventListener("keypress", handleKeyPress);
      return () => canvas.removeEventListener("keypress", handleKeyPress);
    },

    onMouseButton(callback: MouseButtonCallback): () => void {
      const handleMouseDown = (e: MouseEvent) => {
        callback({
          button: e.button as MouseButton,
          action: KeyAction.Press,
          mods: getModifiers(e),
        });
      };
      const handleMouseUp = (e: MouseEvent) => {
        callback({
          button: e.button as MouseButton,
          action: KeyAction.Release,
          mods: getModifiers(e),
        });
      };
      canvas.addEventListener("mousedown", handleMouseDown);
      canvas.addEventListener("mouseup", handleMouseUp);
      return () => {
        canvas.removeEventListener("mousedown", handleMouseDown);
        canvas.removeEventListener("mouseup", handleMouseUp);
      };
    },

    onCursorMove(callback: CursorMoveCallback): () => void {
      const handleMouseMove = (e: MouseEvent) => {
        const rect = canvas.getBoundingClientRect();
        callback({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        });
      };
      canvas.addEventListener("mousemove", handleMouseMove);
      return () => canvas.removeEventListener("mousemove", handleMouseMove);
    },

    onScroll(callback: ScrollCallback): () => void {
      const handleWheel = (e: WheelEvent) => {
        callback({
          deltaX: e.deltaX,
          deltaY: e.deltaY,
        });
      };
      canvas.addEventListener("wheel", handleWheel);
      return () => canvas.removeEventListener("wheel", handleWheel);
    },

    onResize(callback: ResizeCallback): () => void {
      const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          callback({
            width: entry.contentRect.width,
            height: entry.contentRect.height,
          });
        }
      });
      observer.observe(canvas);
      return () => observer.disconnect();
    },

    onClose(callback: CloseCallback): () => void {
      const handleBeforeUnload = () => callback();
      window.addEventListener("beforeunload", handleBeforeUnload);
      return () => window.removeEventListener("beforeunload", handleBeforeUnload);
    },

    onFocus(callback: FocusCallback): () => void {
      const handleFocus = () => callback({ focused: true });
      const handleBlur = () => callback({ focused: false });
      canvas.addEventListener("focus", handleFocus);
      canvas.addEventListener("blur", handleBlur);
      return () => {
        canvas.removeEventListener("focus", handleFocus);
        canvas.removeEventListener("blur", handleBlur);
      };
    },

    onCursorEnter(callback: CursorEnterCallback): () => void {
      const handleEnter = () => callback({ entered: true });
      const handleLeave = () => callback({ entered: false });
      canvas.addEventListener("mouseenter", handleEnter);
      canvas.addEventListener("mouseleave", handleLeave);
      return () => {
        canvas.removeEventListener("mouseenter", handleEnter);
        canvas.removeEventListener("mouseleave", handleLeave);
      };
    },

    onRefresh(_callback: RefreshCallback): () => void {
      // Browser handles refresh automatically, no-op
      return () => {};
    },
  };
}

/**
 * @deprecated Use createWebGLContext instead
 */
export const createContext = createWebGLContext;

/**
 * Creates a WebGPU context for browser rendering.
 * This is async because WebGPU adapter/device creation is asynchronous.
 */
export async function createWebGPUContext(
  options: BrowserWebGPUContextOptions = {}
): Promise<BrowserWebGPUContext> {
  const canvas = options.canvas ?? document.createElement("canvas");
  const width = options.width ?? 800;
  const height = options.height ?? 600;

  canvas.width = width;
  canvas.height = height;

  if (!options.canvas) {
    document.body.appendChild(canvas);
  }

  // Check for WebGPU support
  if (!navigator.gpu) {
    throw new Error("WebGPU is not supported in this browser");
  }

  const gpu = navigator.gpu;

  // Request adapter
  const adapter = await gpu.requestAdapter({
    powerPreference: options.powerPreference,
  });
  if (!adapter) {
    throw new Error("Failed to get WebGPU adapter");
  }

  // Request device
  const device = await adapter.requestDevice();
  const queue = device.queue;

  // Get canvas context
  const context = canvas.getContext("webgpu");
  if (!context) {
    throw new Error("Failed to get WebGPU canvas context");
  }

  // Configure the context
  const format = gpu.getPreferredCanvasFormat();
  context.configure({
    device,
    format,
    alphaMode: "opaque",
  });

  // Helper to convert DOM modifier keys to our bitmask
  function getModifiers(e: KeyboardEvent | MouseEvent): number {
    let mods = 0;
    if (e.shiftKey) mods |= ModifierKey.Shift;
    if (e.ctrlKey) mods |= ModifierKey.Control;
    if (e.altKey) mods |= ModifierKey.Alt;
    if (e.metaKey) mods |= ModifierKey.Super;
    return mods;
  }

  return {
    gpu,
    adapter,
    device,
    queue,
    context,
    canvas,
    width,
    height,

    destroy() {
      device.destroy();
    },

    onKey(callback: KeyCallback): () => void {
      const handleKeyDown = (e: KeyboardEvent) => {
        callback({
          key: e.keyCode,
          scancode: e.keyCode,
          action: e.repeat ? KeyAction.Repeat : KeyAction.Press,
          mods: getModifiers(e),
        });
      };
      const handleKeyUp = (e: KeyboardEvent) => {
        callback({
          key: e.keyCode,
          scancode: e.keyCode,
          action: KeyAction.Release,
          mods: getModifiers(e),
        });
      };
      canvas.addEventListener("keydown", handleKeyDown);
      canvas.addEventListener("keyup", handleKeyUp);
      return () => {
        canvas.removeEventListener("keydown", handleKeyDown);
        canvas.removeEventListener("keyup", handleKeyUp);
      };
    },

    onChar(callback: CharCallback): () => void {
      const handleKeyPress = (e: KeyboardEvent) => {
        if (e.key.length === 1) {
          callback({
            codepoint: e.key.codePointAt(0) ?? 0,
            char: e.key,
          });
        }
      };
      canvas.addEventListener("keypress", handleKeyPress);
      return () => canvas.removeEventListener("keypress", handleKeyPress);
    },

    onMouseButton(callback: MouseButtonCallback): () => void {
      const handleMouseDown = (e: MouseEvent) => {
        callback({
          button: e.button as MouseButton,
          action: KeyAction.Press,
          mods: getModifiers(e),
        });
      };
      const handleMouseUp = (e: MouseEvent) => {
        callback({
          button: e.button as MouseButton,
          action: KeyAction.Release,
          mods: getModifiers(e),
        });
      };
      canvas.addEventListener("mousedown", handleMouseDown);
      canvas.addEventListener("mouseup", handleMouseUp);
      return () => {
        canvas.removeEventListener("mousedown", handleMouseDown);
        canvas.removeEventListener("mouseup", handleMouseUp);
      };
    },

    onCursorMove(callback: CursorMoveCallback): () => void {
      const handleMouseMove = (e: MouseEvent) => {
        const rect = canvas.getBoundingClientRect();
        callback({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        });
      };
      canvas.addEventListener("mousemove", handleMouseMove);
      return () => canvas.removeEventListener("mousemove", handleMouseMove);
    },

    onScroll(callback: ScrollCallback): () => void {
      const handleWheel = (e: WheelEvent) => {
        callback({
          deltaX: e.deltaX,
          deltaY: e.deltaY,
        });
      };
      canvas.addEventListener("wheel", handleWheel);
      return () => canvas.removeEventListener("wheel", handleWheel);
    },

    onResize(callback: ResizeCallback): () => void {
      const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          callback({
            width: entry.contentRect.width,
            height: entry.contentRect.height,
          });
        }
      });
      observer.observe(canvas);
      return () => observer.disconnect();
    },

    onClose(callback: CloseCallback): () => void {
      const handleBeforeUnload = () => callback();
      window.addEventListener("beforeunload", handleBeforeUnload);
      return () => window.removeEventListener("beforeunload", handleBeforeUnload);
    },

    onFocus(callback: FocusCallback): () => void {
      const handleFocus = () => callback({ focused: true });
      const handleBlur = () => callback({ focused: false });
      canvas.addEventListener("focus", handleFocus);
      canvas.addEventListener("blur", handleBlur);
      return () => {
        canvas.removeEventListener("focus", handleFocus);
        canvas.removeEventListener("blur", handleBlur);
      };
    },

    onCursorEnter(callback: CursorEnterCallback): () => void {
      const handleEnter = () => callback({ entered: true });
      const handleLeave = () => callback({ entered: false });
      canvas.addEventListener("mouseenter", handleEnter);
      canvas.addEventListener("mouseleave", handleLeave);
      return () => {
        canvas.removeEventListener("mouseenter", handleEnter);
        canvas.removeEventListener("mouseleave", handleLeave);
      };
    },

    onRefresh(_callback: RefreshCallback): () => void {
      // Browser handles refresh automatically, no-op
      return () => {};
    },
  };
}

/**
 * Render loop for browser WebGL context.
 * Time values are normalized to seconds to match darwin behavior.
 */
export function runWebGLRenderLoop(ctx: BrowserWebGLContext, callback: RenderCallback): void {
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

/**
 * @deprecated Use runWebGLRenderLoop instead
 */
export const runRenderLoop = runWebGLRenderLoop;

/**
 * Render loop for browser WebGPU context.
 * Time values are normalized to seconds to match darwin behavior.
 */
export function runWebGPURenderLoop(ctx: BrowserWebGPUContext, callback: RenderCallback): void {
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
