/**
 * Glade platform implementation for MacOS (macOS via GLFW/Dawn).
 *
 * Bridges a WebGPUContext to Glade's GladePlatform interface.
 */

import type { WebGPUContext, CursorStyle, Clipboard, CharEvent, TextInputEvent } from "@glade/core";
import type { GladePlatform, GladeRenderTarget, Modifiers, DecodedImageData } from "@glade/glade";
import { coreModsToGladeMods } from "@glade/glade";
import { decodePNG, decodeJPEG } from "./image";

/**
 * MacOS platform implementation for Glade.
 */
class MacOSGladePlatform implements GladePlatform {
  readonly runtime = "macos" as const;
  readonly clipboard: Clipboard;

  private ctx: WebGPUContext;
  private animationFrameId = 0;
  private animationFrameCallbacks = new Map<number, (time: number) => void>();

  constructor(ctx: WebGPUContext) {
    this.ctx = ctx;
    this.clipboard = ctx.clipboard;
  }

  async requestAdapter(): Promise<GPUAdapter | null> {
    return this.ctx.adapter;
  }

  async requestDevice(): Promise<GPUDevice> {
    return this.ctx.device;
  }

  getPreferredCanvasFormat(): GPUTextureFormat {
    return this.ctx.format;
  }

  createRenderTarget(_options: {
    width: number;
    height: number;
    title?: string;
  }): GladeRenderTarget {
    return new MacOSRenderTarget(this.ctx);
  }

  now(): number {
    return performance.now();
  }

  requestAnimationFrame(callback: (time: number) => void): number {
    const id = ++this.animationFrameId;
    this.animationFrameCallbacks.set(id, callback);
    return id;
  }

  cancelAnimationFrame(id: number): void {
    this.animationFrameCallbacks.delete(id);
  }

  /**
   * Tick the platform - should be called from the render loop.
   * Processes pending animation frame callbacks.
   */
  tick(time: number): void {
    const callbacks = Array.from(this.animationFrameCallbacks.entries());
    this.animationFrameCallbacks.clear();
    for (const [, callback] of callbacks) {
      callback(time);
    }
  }

  async decodeImage(data: Uint8Array): Promise<DecodedImageData> {
    if (isPNG(data)) {
      return decodePNG(data);
    } else if (isJPEG(data)) {
      return decodeJPEG(data);
    }
    throw new Error("Unsupported image format");
  }

  openUrl(url: string): void {
    Bun.spawn(["open", url]);
  }
}

function isPNG(data: Uint8Array): boolean {
  return (
    data.length >= 8 && data[0] === 0x89 && data[1] === 0x50 && data[2] === 0x4e && data[3] === 0x47
  );
}

function isJPEG(data: Uint8Array): boolean {
  return data.length >= 2 && data[0] === 0xff && data[1] === 0xd8;
}

/**
 * Extended context type with window dimensions.
 */
interface MacOSWebGPUContextExt extends WebGPUContext {
  windowWidth?: number;
  windowHeight?: number;
}

/**
 * Render target for MacOS/GLFW.
 *
 * Note: GLFW only allows one callback per event type per window.
 * We use a single shared cursor position tracker and dispatch to multiple listeners.
 */
class MacOSRenderTarget implements GladeRenderTarget {
  private ctx: MacOSWebGPUContextExt;

  private cursorX = 0;
  private cursorY = 0;
  private cursorCallbackRegistered = false;
  private cursorMoveListeners: Array<(x: number, y: number) => void> = [];

  // Mouse button tracking - GLFW only allows one callback, so we multiplex
  private mouseButtonCallbackRegistered = false;
  private mouseDownListeners: Array<
    (x: number, y: number, button: number, mods: Modifiers) => void
  > = [];
  private mouseUpListeners: Array<(x: number, y: number, button: number, mods: Modifiers) => void> =
    [];
  private clickState = {
    lastClickTime: 0,
    clickCount: 0,
  };
  private clickListeners: Array<
    (x: number, y: number, clickCount: number, mods: Modifiers) => void
  > = [];

  constructor(ctx: WebGPUContext) {
    this.ctx = ctx as MacOSWebGPUContextExt;
  }

  private ensureCursorTracking(): void {
    if (this.cursorCallbackRegistered) {
      return;
    }
    this.cursorCallbackRegistered = true;

    this.ctx.onCursorMove((event) => {
      this.cursorX = event.x;
      this.cursorY = event.y;
      for (const listener of this.cursorMoveListeners) {
        listener(event.x, event.y);
      }
    });
  }

  private ensureMouseButtonTracking(): void {
    if (this.mouseButtonCallbackRegistered) {
      return;
    }
    this.mouseButtonCallbackRegistered = true;

    this.ctx.onMouseButton((event) => {
      const mods = coreModsToGladeMods(event.mods);

      if (event.action === 1) {
        // Press
        for (const listener of this.mouseDownListeners) {
          listener(this.cursorX, this.cursorY, event.button, mods);
        }
      } else if (event.action === 0) {
        // Release
        for (const listener of this.mouseUpListeners) {
          listener(this.cursorX, this.cursorY, event.button, mods);
        }

        // Handle click (only for left button)
        if (event.button === 0) {
          const now = performance.now();
          const DOUBLE_CLICK_TIME = 300;
          if (now - this.clickState.lastClickTime < DOUBLE_CLICK_TIME) {
            this.clickState.clickCount++;
          } else {
            this.clickState.clickCount = 1;
          }
          this.clickState.lastClickTime = now;

          for (const listener of this.clickListeners) {
            listener(this.cursorX, this.cursorY, this.clickState.clickCount, mods);
          }
        }
      }
    });
  }

  get width(): number {
    // Use window dimensions if available, else fall back to framebuffer / dpr
    return this.ctx.windowWidth ?? this.ctx.width / this.devicePixelRatio;
  }

  get height(): number {
    return this.ctx.windowHeight ?? this.ctx.height / this.devicePixelRatio;
  }

  get devicePixelRatio(): number {
    // Compute DPR from framebuffer size vs window size
    if (this.ctx.windowWidth && this.ctx.windowWidth > 0) {
      return this.ctx.width / this.ctx.windowWidth;
    }
    return 1;
  }

  configure(_device: GPUDevice, _format: GPUTextureFormat): void {
    // Already configured by createWebGPUContext
  }

  getCurrentTexture(): GPUTexture {
    return this.ctx.context.getCurrentTexture();
  }

  present(): void {
    const context = this.ctx.context as unknown as { present?: () => void };
    if (context.present) {
      context.present();
    }
  }

  resize(_width: number, _height: number): void {
    // Dimensions are queried dynamically from ctx
  }

  destroy(): void {
    // Handled by parent context
  }

  onMouseDown(
    callback: (x: number, y: number, button: number, mods: Modifiers) => void
  ): () => void {
    this.ensureCursorTracking();
    this.ensureMouseButtonTracking();
    this.mouseDownListeners.push(callback);

    return () => {
      const idx = this.mouseDownListeners.indexOf(callback);
      if (idx >= 0) {
        this.mouseDownListeners.splice(idx, 1);
      }
    };
  }

  onMouseUp(callback: (x: number, y: number, button: number, mods: Modifiers) => void): () => void {
    this.ensureCursorTracking();
    this.ensureMouseButtonTracking();
    this.mouseUpListeners.push(callback);

    return () => {
      const idx = this.mouseUpListeners.indexOf(callback);
      if (idx >= 0) {
        this.mouseUpListeners.splice(idx, 1);
      }
    };
  }

  onMouseMove(callback: (x: number, y: number) => void): () => void {
    this.ensureCursorTracking();
    this.cursorMoveListeners.push(callback);

    return () => {
      const idx = this.cursorMoveListeners.indexOf(callback);
      if (idx >= 0) {
        this.cursorMoveListeners.splice(idx, 1);
      }
    };
  }

  onClick(
    callback: (x: number, y: number, clickCount: number, mods: Modifiers) => void
  ): () => void {
    this.ensureCursorTracking();
    this.ensureMouseButtonTracking();
    this.clickListeners.push(callback);

    return () => {
      const idx = this.clickListeners.indexOf(callback);
      if (idx >= 0) {
        this.clickListeners.splice(idx, 1);
      }
    };
  }

  onScroll(
    callback: (x: number, y: number, deltaX: number, deltaY: number, mods: Modifiers) => void
  ): () => void {
    this.ensureCursorTracking();

    const scrollCleanup = this.ctx.onScroll((event) => {
      callback(this.cursorX, this.cursorY, event.deltaX, event.deltaY, {
        alt: false,
        ctrl: false,
        meta: false,
        shift: false,
      });
    });

    return () => {
      scrollCleanup();
    };
  }

  setCursor(style: CursorStyle): void {
    this.ctx.setCursor(style);
  }

  onResize(callback: (width: number, height: number) => void): () => void {
    return this.ctx.onResize((event) => {
      // onResize gives framebuffer size, convert to logical
      const dpr = this.devicePixelRatio;
      callback(event.width / dpr, event.height / dpr);
    });
  }

  onKey(callback: (event: import("@glade/core").KeyEvent) => void): () => void {
    return this.ctx.onKey((event) => {
      callback(event);
    });
  }

  onChar(callback: (event: CharEvent) => void): () => void {
    return this.ctx.onChar((event) => {
      callback(event);
    });
  }

  onTextInput(callback: (event: TextInputEvent) => void): () => void {
    return this.ctx.onTextInput((event) => {
      callback(event);
    });
  }

  onCompositionStart(
    callback: (event: import("@glade/core").CompositionEvent) => void
  ): () => void {
    return this.ctx.onCompositionStart((event) => {
      callback(event);
    });
  }

  onCompositionUpdate(
    callback: (event: import("@glade/core").CompositionEvent) => void
  ): () => void {
    return this.ctx.onCompositionUpdate((event) => {
      callback(event);
    });
  }

  onCompositionEnd(callback: (event: import("@glade/core").CompositionEvent) => void): () => void {
    return this.ctx.onCompositionEnd((event) => {
      callback(event);
    });
  }

  onClose(callback: () => void): () => void {
    return this.ctx.onClose(() => {
      callback();
    });
  }

  onFocus(callback: (focused: boolean) => void): () => void {
    return this.ctx.onFocus((event) => {
      callback(event.focused);
    });
  }

  onCursorEnter(callback: (entered: boolean) => void): () => void {
    return this.ctx.onCursorEnter((event) => {
      callback(event.entered);
    });
  }

  onRefresh(callback: () => void): () => void {
    return this.ctx.onRefresh(() => {
      callback();
    });
  }
}

/**
 * Extended platform interface with tick method for render loop integration.
 */
export interface MacOSGladePlatformInstance extends GladePlatform {
  tick(time: number): void;
}

/**
 * Create a Glade platform from an existing WebGPU context.
 */
export function createGladePlatform(ctx: WebGPUContext): MacOSGladePlatformInstance {
  return new MacOSGladePlatform(ctx);
}
