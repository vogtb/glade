/**
 * Flash platform implementation for Darwin (macOS via GLFW/Dawn).
 *
 * Bridges a WebGPUContext to Flash's FlashPlatform interface.
 */

import type { WebGPUContext, CursorStyle } from "@glade/core";
import type { FlashPlatform, FlashRenderTarget, Modifiers, DecodedImageData } from "@glade/flash";
import { coreModsToFlashMods } from "@glade/flash";
import { decodePNG, decodeJPEG } from "./image";

/**
 * Darwin platform implementation for Flash.
 */
class DarwinFlashPlatform implements FlashPlatform {
  readonly runtime = "darwin" as const;

  private ctx: WebGPUContext;
  private animationFrameId = 0;
  private animationFrameCallbacks = new Map<number, (time: number) => void>();

  constructor(ctx: WebGPUContext) {
    this.ctx = ctx;
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
  }): FlashRenderTarget {
    return new DarwinRenderTarget(this.ctx);
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
interface DarwinWebGPUContextExt extends WebGPUContext {
  windowWidth?: number;
  windowHeight?: number;
}

/**
 * Render target for Darwin/GLFW.
 *
 * Note: GLFW only allows one callback per event type per window.
 * We use a single shared cursor position tracker and dispatch to multiple listeners.
 */
class DarwinRenderTarget implements FlashRenderTarget {
  private ctx: DarwinWebGPUContextExt;

  private cursorX = 0;
  private cursorY = 0;
  private cursorCallbackRegistered = false;
  private cursorMoveListeners: Array<(x: number, y: number) => void> = [];

  constructor(ctx: WebGPUContext) {
    this.ctx = ctx as DarwinWebGPUContextExt;
  }

  private ensureCursorTracking(): void {
    if (this.cursorCallbackRegistered) return;
    this.cursorCallbackRegistered = true;

    this.ctx.onCursorMove((event) => {
      this.cursorX = event.x;
      this.cursorY = event.y;
      for (const listener of this.cursorMoveListeners) {
        listener(event.x, event.y);
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

    const buttonCleanup = this.ctx.onMouseButton((event) => {
      if (event.action === 1) {
        // Press
        callback(this.cursorX, this.cursorY, event.button, coreModsToFlashMods(event.mods));
      }
    });

    return () => {
      buttonCleanup();
    };
  }

  onMouseUp(callback: (x: number, y: number, button: number, mods: Modifiers) => void): () => void {
    this.ensureCursorTracking();

    const buttonCleanup = this.ctx.onMouseButton((event) => {
      if (event.action === 0) {
        // Release
        callback(this.cursorX, this.cursorY, event.button, coreModsToFlashMods(event.mods));
      }
    });

    return () => {
      buttonCleanup();
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

    let lastClickTime = 0;
    let clickCount = 0;
    const DOUBLE_CLICK_TIME = 300;

    const buttonCleanup = this.ctx.onMouseButton((event) => {
      if (event.action === 0 && event.button === 0) {
        // Release left button
        const now = performance.now();
        if (now - lastClickTime < DOUBLE_CLICK_TIME) {
          clickCount++;
        } else {
          clickCount = 1;
        }
        lastClickTime = now;
        callback(this.cursorX, this.cursorY, clickCount, coreModsToFlashMods(event.mods));
      }
    });

    return () => {
      buttonCleanup();
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
}

/**
 * Extended platform interface with tick method for render loop integration.
 */
export interface DarwinFlashPlatformInstance extends FlashPlatform {
  tick(time: number): void;
}

/**
 * Create a Flash platform from an existing WebGPU context.
 */
export function createFlashPlatform(ctx: WebGPUContext): DarwinFlashPlatformInstance {
  return new DarwinFlashPlatform(ctx);
}
