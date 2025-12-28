/**
 * WebGPUHost - Interface for custom WebGPU rendering within Flash.
 *
 * Implement this interface to embed raw WebGPU content (shaders, compute passes)
 * as a component in the Flash layout system.
 */

import type { RenderTexture } from "./render_texture.ts";

/**
 * Input state passed to WebGPU hosts each frame.
 */
export interface WebGPUHostInput {
  /** Current time in seconds since start */
  time: number;
  /** Time since last frame in seconds */
  deltaTime: number;
  /** Mouse X position in local coordinates (0 to width) */
  mouseX: number;
  /** Mouse Y position in local coordinates (0 to height) */
  mouseY: number;
  /** Whether mouse button is currently pressed */
  mouseDown: boolean;
  /** Current width in pixels */
  width: number;
  /** Current height in pixels */
  height: number;
}

/**
 * Interface for custom WebGPU rendering within Flash.
 *
 * Implementations render to an offscreen texture which Flash then
 * composites into the UI.
 */
export interface WebGPUHost {
  /**
   * Called when the element bounds change.
   * Implementations should resize their render texture.
   */
  resize(width: number, height: number): void;

  /**
   * Render to the offscreen texture.
   *
   * Called each frame before Flash's main render pass.
   * Use the provided command encoder to record render/compute passes.
   *
   * @param input - Frame input state (time, mouse, dimensions)
   * @param encoder - Command encoder to record GPU commands
   */
  render(input: WebGPUHostInput, encoder: GPUCommandEncoder): void;

  /**
   * Get the render texture that Flash will sample.
   */
  getTexture(): RenderTexture;

  /**
   * Cleanup GPU resources.
   * Called when the element is removed from the UI.
   */
  destroy(): void;
}

/**
 * Factory function type for creating WebGPU hosts.
 */
export type WebGPUHostFactory = (
  device: GPUDevice,
  format: GPUTextureFormat,
  initialWidth: number,
  initialHeight: number
) => WebGPUHost;
