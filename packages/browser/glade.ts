/**
 * Glade platform implementation for Browser.
 *
 * Bridges a WebGPUContext to Glade's GladePlatform interface.
 */

import type { CharEvent, Clipboard, CursorStyle, TextInputEvent, WebGPUContext } from "@glade/core";
import type { DecodedImageData, GladePlatform, GladeRenderTarget, Modifiers } from "@glade/glade";
import { coreModsToGladeMods } from "@glade/glade";

/**
 * Browser platform implementation for Glade.
 */
class BrowserGladePlatform implements GladePlatform {
  readonly runtime = "browser" as const;
  readonly clipboard: Clipboard;

  private ctx: WebGPUContext;

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
    return new BrowserRenderTarget(this.ctx);
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

  async decodeImage(data: Uint8Array): Promise<DecodedImageData> {
    const blob = new Blob([data]);
    const imageBitmap = await createImageBitmap(blob);

    const canvas = new OffscreenCanvas(imageBitmap.width, imageBitmap.height);
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(imageBitmap, 0, 0);

    const imageData = ctx.getImageData(0, 0, imageBitmap.width, imageBitmap.height);
    imageBitmap.close();

    return {
      width: imageData.width,
      height: imageData.height,
      data: new Uint8Array(imageData.data.buffer),
    };
  }

  openUrl(url: string): void {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

/**
 * Extended context type with canvas element.
 */
interface BrowserWebGPUContextExt extends WebGPUContext {
  canvas?: HTMLCanvasElement;
}

/**
 * Render target for Browser.
 */
class BrowserRenderTarget implements GladeRenderTarget {
  private ctx: BrowserWebGPUContextExt;

  constructor(ctx: WebGPUContext) {
    this.ctx = ctx as BrowserWebGPUContextExt;
  }

  get width(): number {
    // Use canvas clientWidth if available, else framebuffer / dpr
    if (this.ctx.canvas) {
      return this.ctx.canvas.clientWidth;
    }
    return this.ctx.width / this.devicePixelRatio;
  }

  get height(): number {
    if (this.ctx.canvas) {
      return this.ctx.canvas.clientHeight;
    }
    return this.ctx.height / this.devicePixelRatio;
  }

  get devicePixelRatio(): number {
    return typeof window !== "undefined" ? window.devicePixelRatio : 1;
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

  resize(_width: number, _height: number): void {
    // Dimensions are queried dynamically from canvas/ctx
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
        callback(cursorX, cursorY, event.button, coreModsToGladeMods(event.mods));
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
        callback(cursorX, cursorY, event.button, coreModsToGladeMods(event.mods));
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
        callback(cursorX, cursorY, clickCount, coreModsToGladeMods(event.mods));
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

  setTitle(title: string): void {
    this.ctx.setTitle(title);
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
 * Create a Glade platform from an existing WebGPU context.
 */
export function createGladePlatform(ctx: WebGPUContext): GladePlatform {
  return new BrowserGladePlatform(ctx);
}
