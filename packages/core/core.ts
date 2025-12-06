// Re-export all event types
export * from "./events.ts";

import type { EventTarget } from "./events.ts";

/**
 * Platform-agnostic WebGL context interface. The gl property is the standard
 * WebGL2RenderingContext interface.
 */
export interface WebGLContext extends EventTarget {
  gl: WebGL2RenderingContext;
  width: number;
  height: number;
  destroy(): void;
}

/**
 * @deprecated Use WebGLContext instead
 */
export type GLContext = WebGLContext;

/**
 * Platform-agnostic WebGPU context interface. Provides access to the standard
 * WebGPU API (GPUDevice, GPUQueue, etc.) in a cross-platform manner.
 */
export interface WebGPUContext extends EventTarget {
  gpu: GPU;
  adapter: GPUAdapter;
  device: GPUDevice;
  queue: GPUQueue;
  context: GPUCanvasContext;
  width: number;
  height: number;
  destroy(): void;
}

/**
 * Render callback signature.
 * @param time - Current time in seconds
 * @param deltaTime - Time since last frame in seconds
 * @returns false to stop the render loop, or void/true to continue
 */
export type RenderCallback = (time: number, deltaTime: number) => boolean | void;

/**
 * Function that runs a render loop with the given callback.
 */
export type RenderLoopRunner = (callback: RenderCallback) => void;

/**
 * Common context creation options.
 */
export interface ContextOptions {
  width?: number;
  height?: number;
  // window title (only used on native platforms)
  title?: string;
}
