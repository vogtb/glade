/**
 * Platform abstraction types for Glade. These interfaces define the contract
 * between the Glade framework and platform-specific implementations (browser,
 * macOS).
 */

import type { Clipboard } from "./clipboard.ts";
import type {
  CharEvent,
  CompositionEvent,
  CursorStyle,
  KeyEvent,
  TextInputEvent,
} from "./events.ts";
import type { ColorSchemeProvider } from "./theme.ts";
import type { RenderCallback } from "./webgpu.ts";

/**
 * Modifier key state.
 */
export interface Modifiers {
  shift: boolean;
  ctrl: boolean;
  alt: boolean;
  meta: boolean;
}

/**
 * Convert core modifier bitmask to Modifiers object.
 */
export function coreModsToGladeMods(mods: number): Modifiers {
  return {
    shift: (mods & 0x01) !== 0,
    ctrl: (mods & 0x02) !== 0,
    alt: (mods & 0x04) !== 0,
    meta: (mods & 0x08) !== 0,
  };
}

/**
 * Decoded image data ready for GPU upload.
 */
export interface DecodedImageData {
  width: number;
  height: number;
  data: Uint8Array;
}

export type GladePlatformRuntime = "browser" | "macos";

export type TitleBarStyle = "standard" | "transparent" | "controlled";

/**
 * Platform interface for window operations. This abstracts browser vs native
 * differences.
 */
export interface GladePlatform {
  readonly runtime: GladePlatformRuntime;
  readonly clipboard: Clipboard;
  readonly colorSchemeProvider: ColorSchemeProvider;

  requestAdapter(): Promise<GPUAdapter | null>;
  requestDevice(): Promise<GPUDevice>;
  getPreferredCanvasFormat(): GPUTextureFormat;

  createRenderTarget(options: { width: number; height: number; title?: string }): GladeRenderTarget;

  now(): number;
  requestAnimationFrame(callback: (time: number) => void): number;
  cancelAnimationFrame(id: number): void;

  decodeImage(data: Uint8Array): Promise<DecodedImageData>;

  openUrl(url: string): void;

  runRenderLoop(callback: RenderCallback): void;
}

/**
 * Platform-specific render target, which is essentially the window, but it
 * may not be in the future. It's also confusing to call it a window, when
 * it's really an abstraction of the things a window provides.
 */
export interface GladeRenderTarget {
  readonly width: number;
  readonly height: number;
  readonly devicePixelRatio: number;

  configure(device: GPUDevice, format: GPUTextureFormat): void;
  getCurrentTexture(): GPUTexture;
  present(): void;

  resize(width: number, height: number): void;
  destroy(): void;

  onMouseDown?(
    callback: (x: number, y: number, button: number, mods: Modifiers) => void
  ): () => void;
  onMouseUp?(callback: (x: number, y: number, button: number, mods: Modifiers) => void): () => void;
  onMouseMove?(callback: (x: number, y: number) => void): () => void;
  onClick?(
    callback: (x: number, y: number, clickCount: number, mods: Modifiers) => void
  ): () => void;
  onScroll?(
    callback: (x: number, y: number, deltaX: number, deltaY: number, mods: Modifiers) => void
  ): () => void;
  onResize?(callback: (width: number, height: number) => void): () => void;
  onKey?(callback: (event: KeyEvent) => void): () => void;
  onChar?(callback: (event: CharEvent) => void): () => void;
  onCompositionStart?(callback: (event: CompositionEvent) => void): () => void;
  onCompositionUpdate?(callback: (event: CompositionEvent) => void): () => void;
  onCompositionEnd?(callback: (event: CompositionEvent) => void): () => void;
  onTextInput?(callback: (event: TextInputEvent) => void): () => void;

  setCursor?(style: CursorStyle): void;
  setTitle?(title: string): void;

  onClose?(callback: () => void): () => void;
  onFocus?(callback: (focused: boolean) => void): () => void;
  onCursorEnter?(callback: (entered: boolean) => void): () => void;
  onRefresh?(callback: () => void): () => void;
}
