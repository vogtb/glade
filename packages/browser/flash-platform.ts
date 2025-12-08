/**
 * Flash platform implementation for Browser.
 *
 * Bridges a WebGPUContext to Flash's FlashPlatform interface.
 */

import type { WebGPUContext, CursorStyle } from "@glade/core";
import type { FlashPlatform, FlashRenderTarget, Modifiers } from "@glade/flash";
import { coreModsToFlashMods } from "@glade/flash";

/**
 * Browser platform implementation for Flash.
 */
class BrowserFlashPlatform implements FlashPlatform {
  readonly runtime = "browser" as const;

  private ctx: WebGPUContext;

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

  createRenderTarget(options: {
    width: number;
    height: number;
    title?: string;
  }): FlashRenderTarget {
    const ctx = this.ctx;
    const ctxAny = ctx as {
      windowWidth?: number;
      windowHeight?: number;
    };
    const width = ctxAny.windowWidth ?? options.width;
    const height = ctxAny.windowHeight ?? options.height;
    const dpr = typeof window !== "undefined" ? window.devicePixelRatio : 1;

    return new BrowserRenderTarget(ctx, width, height, dpr);
  }

  now(): number {
    return performance.now();
  }

  requestAnimationFrame(callback: (time: number) => void): number {
    return window.requestAnimationFrame(callback);
  }

  cancelAnimationFrame(id: number): void {
    window.cancelAnimationFrame(id);
  }
}

/**
 * Render target for Browser.
 */
class BrowserRenderTarget implements FlashRenderTarget {
  private ctx: WebGPUContext;
  private _width: number;
  private _height: number;
  private _dpr: number;

  constructor(ctx: WebGPUContext, width: number, height: number, dpr: number) {
    this.ctx = ctx;
    this._width = width;
    this._height = height;
    this._dpr = dpr;
  }

  get width(): number {
    return this._width;
  }

  get height(): number {
    return this._height;
  }

  get devicePixelRatio(): number {
    return this._dpr;
  }

  configure(_device: GPUDevice, _format: GPUTextureFormat): void {
    // Already configured by createWebGPUContext
  }

  getCurrentTexture(): GPUTexture {
    return this.ctx.context.getCurrentTexture();
  }

  present(): void {
    // Browser handles presentation automatically
  }

  resize(width: number, height: number): void {
    this._width = width;
    this._height = height;
  }

  destroy(): void {
    // Handled by parent context
  }

  onMouseDown(
    callback: (x: number, y: number, button: number, mods: Modifiers) => void
  ): () => void {
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
}

/**
 * Create a Flash platform from an existing WebGPU context.
 */
export function createFlashPlatform(ctx: WebGPUContext): FlashPlatform {
  return new BrowserFlashPlatform(ctx);
}
