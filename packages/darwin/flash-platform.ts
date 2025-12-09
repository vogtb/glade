/**
 * Flash platform implementation for Darwin (macOS via GLFW/Dawn).
 *
 * Bridges a WebGPUContext to Flash's FlashPlatform interface.
 */

import type { WebGPUContext, CursorStyle } from "@glade/core";
import type { FlashPlatform, FlashRenderTarget, Modifiers } from "@glade/flash";
import { coreModsToFlashMods } from "@glade/flash";

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
 */
class DarwinRenderTarget implements FlashRenderTarget {
  private ctx: DarwinWebGPUContextExt;

  constructor(ctx: WebGPUContext) {
    this.ctx = ctx as DarwinWebGPUContextExt;
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
    // Track cursor position since GLFW mouse button events don't include position
    let cursorX = 0;
    let cursorY = 0;

    const cursorCleanup = this.ctx.onCursorMove((event) => {
      cursorX = event.x;
      cursorY = event.y;
    });

    const buttonCleanup = this.ctx.onMouseButton((event) => {
      if (event.action === 1) {
        // Press
        callback(cursorX, cursorY, event.button, coreModsToFlashMods(event.mods));
      }
    });

    return () => {
      cursorCleanup();
      buttonCleanup();
    };
  }

  onMouseUp(callback: (x: number, y: number, button: number, mods: Modifiers) => void): () => void {
    let cursorX = 0;
    let cursorY = 0;

    const cursorCleanup = this.ctx.onCursorMove((event) => {
      cursorX = event.x;
      cursorY = event.y;
    });

    const buttonCleanup = this.ctx.onMouseButton((event) => {
      if (event.action === 0) {
        // Release
        callback(cursorX, cursorY, event.button, coreModsToFlashMods(event.mods));
      }
    });

    return () => {
      cursorCleanup();
      buttonCleanup();
    };
  }

  onMouseMove(callback: (x: number, y: number) => void): () => void {
    return this.ctx.onCursorMove((event) => {
      callback(event.x, event.y);
    });
  }

  onClick(
    callback: (x: number, y: number, clickCount: number, mods: Modifiers) => void
  ): () => void {
    let cursorX = 0;
    let cursorY = 0;
    let lastClickTime = 0;
    let clickCount = 0;
    const DOUBLE_CLICK_TIME = 300;

    const cursorCleanup = this.ctx.onCursorMove((event) => {
      cursorX = event.x;
      cursorY = event.y;
    });

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
        callback(cursorX, cursorY, clickCount, coreModsToFlashMods(event.mods));
      }
    });

    return () => {
      cursorCleanup();
      buttonCleanup();
    };
  }

  onScroll(
    callback: (x: number, y: number, deltaX: number, deltaY: number, mods: Modifiers) => void
  ): () => void {
    let cursorX = 0;
    let cursorY = 0;

    const cursorCleanup = this.ctx.onCursorMove((event) => {
      cursorX = event.x;
      cursorY = event.y;
    });

    const scrollCleanup = this.ctx.onScroll((event) => {
      callback(cursorX, cursorY, event.deltaX, event.deltaY, {
        alt: false,
        ctrl: false,
        meta: false,
        shift: false,
      });
    });

    return () => {
      cursorCleanup();
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
