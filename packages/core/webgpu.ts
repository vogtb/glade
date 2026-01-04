/**
 * WebGPU constants and utilities for cross-platform usage.
 *
 * In browser environments, these constants are available as globals (GPUBufferUsage, GPUShaderStage).
 * In native environments (Dawn), these globals don't exist, so we provide them here.
 */

import type { Clipboard } from "./clipboard";
import type { EventTarget } from "./events";

/**
 * Buffer usage flags for GPUBufferDescriptor.usage
 * @see https://www.w3.org/TR/webgpu/#buffer-usage
 */
export const GPUBufferUsage = {
  MAP_READ: 0x0001,
  MAP_WRITE: 0x0002,
  COPY_SRC: 0x0004,
  COPY_DST: 0x0008,
  INDEX: 0x0010,
  VERTEX: 0x0020,
  UNIFORM: 0x0040,
  STORAGE: 0x0080,
  INDIRECT: 0x0100,
  QUERY_RESOLVE: 0x0200,
} as const;

/**
 * Shader stage flags for GPUBindGroupLayoutEntry.visibility
 * @see https://www.w3.org/TR/webgpu/#shader-stage
 */
export const GPUShaderStage = {
  VERTEX: 0x1,
  FRAGMENT: 0x2,
  COMPUTE: 0x4,
} as const;

/**
 * Texture usage flags for GPUTextureDescriptor.usage
 * @see https://www.w3.org/TR/webgpu/#texture-usage
 */
export const GPUTextureUsage = {
  COPY_SRC: 0x01,
  COPY_DST: 0x02,
  TEXTURE_BINDING: 0x04,
  STORAGE_BINDING: 0x08,
  RENDER_ATTACHMENT: 0x10,
} as const;

/**
 * Map mode flags for GPUBuffer.mapAsync
 * @see https://www.w3.org/TR/webgpu/#buffer-mapping
 */
export const GPUMapMode = {
  READ: 0x0001,
  WRITE: 0x0002,
} as const;

/**
 * Color write flags for GPUColorTargetState.writeMask
 * @see https://www.w3.org/TR/webgpu/#color-target-state
 */
export const GPUColorWrite = {
  RED: 0x1,
  GREEN: 0x2,
  BLUE: 0x4,
  ALPHA: 0x8,
  ALL: 0xf,
} as const;

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
  format: GPUTextureFormat;
  clipboard: Clipboard;
  width: number;
  height: number;
  destroy(): void;
  setTitle(title: string): void;
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
  // macOS-only title bar style (ignored on browser)
  titleBarStyle?: "standard" | "transparent" | "controlled";
}
