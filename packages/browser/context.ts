import type { GLContext, RenderCallback, ContextOptions } from "@glade/core";
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
