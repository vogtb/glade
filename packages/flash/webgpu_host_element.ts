/**
 * WebGPU Host Element for Flash.
 *
 * Embeds custom WebGPU rendering within Flash's layout system.
 * Each host renders to its own texture, which Flash then samples
 * and displays as part of its render pass.
 */

import type { Bounds } from "./types.ts";
import type { LayoutId } from "./layout.ts";
import type { HitTestNode } from "./dispatch.ts";
import {
  FlashElement,
  type RequestLayoutContext,
  type PrepaintContext,
  type PaintContext,
  type RequestLayoutResult,
} from "./element.ts";
import type { WebGPUHost, WebGPUHostInput } from "./webgpu_host.ts";

/**
 * Request layout state for WebGPUHostElement.
 */
interface HostRequestState {
  width: number;
  height: number;
}

/**
 * Prepaint state for WebGPUHostElement.
 */
interface HostPrepaintState {
  bounds: Bounds;
  input: WebGPUHostInput;
}

/**
 * Element for embedding WebGPU host content within Flash UI.
 *
 * Usage:
 * ```typescript
 * const galaxyHost = createGalaxyHost(device, format, 400, 300);
 *
 * div().children_(
 *   webgpuHost(galaxyHost, 400, 300)
 *     .rounded(12)
 *     .opacity(0.95)
 * );
 * ```
 */
export class WebGPUHostElement extends FlashElement<HostRequestState, HostPrepaintState> {
  private cornerRadiusValue = 0;
  private opacityValue = 1;

  constructor(
    private host: WebGPUHost,
    private displayWidth: number,
    private displayHeight: number
  ) {
    super();
  }

  /**
   * Set the corner radius for rounded display.
   */
  rounded(radius: number): this {
    this.cornerRadiusValue = radius;
    return this;
  }

  /**
   * Set the opacity (0-1).
   */
  opacity(value: number): this {
    this.opacityValue = value;
    return this;
  }

  /**
   * Set the display width.
   */
  width(w: number): this {
    this.displayWidth = w;
    return this;
  }

  /**
   * Set the display height.
   */
  height(h: number): this {
    this.displayHeight = h;
    return this;
  }

  /**
   * Set both width and height.
   */
  size(w: number, h: number): this {
    this.displayWidth = w;
    this.displayHeight = h;
    return this;
  }

  requestLayout(cx: RequestLayoutContext): RequestLayoutResult<HostRequestState> {
    const layoutId = cx.requestLayout(
      {
        width: this.displayWidth,
        height: this.displayHeight,
      },
      []
    );

    return {
      layoutId,
      requestState: {
        width: this.displayWidth,
        height: this.displayHeight,
      },
    };
  }

  prepaint(
    cx: PrepaintContext,
    bounds: Bounds,
    _requestState: HostRequestState
  ): HostPrepaintState {
    const window = cx.getWindow();

    // Resize texture if needed
    const texture = this.host.getTexture();
    const targetWidth = Math.floor(bounds.width);
    const targetHeight = Math.floor(bounds.height);

    if (texture.width !== targetWidth || texture.height !== targetHeight) {
      // Clear cache for old texture before resizing
      window.clearHostTextureCache();
      this.host.resize(targetWidth, targetHeight);
    }

    // Compute local mouse coordinates
    const mousePos = window.getMousePosition();
    const localMouseX = mousePos.x - bounds.x;
    const localMouseY = mousePos.y - bounds.y;

    // Build input for this frame
    const now = performance.now();
    const input: WebGPUHostInput = {
      time: now / 1000,
      deltaTime: 1 / 60, // Assume 60fps for now
      mouseX: localMouseX,
      mouseY: localMouseY,
      mouseDown: window.isMouseDown(),
      width: bounds.width,
      height: bounds.height,
    };

    // Schedule host render
    window.scheduleHostRender(this.host, input);

    return { bounds, input };
  }

  paint(cx: PaintContext, bounds: Bounds, _prepaintState: HostPrepaintState): void {
    const texture = this.host.getTexture();
    cx.paintHostTexture(texture.textureView, bounds, {
      cornerRadius: this.cornerRadiusValue,
      opacity: this.opacityValue,
    });
  }

  hitTest(_bounds: Bounds, _childBounds: Bounds[]): HitTestNode | null {
    // WebGPU hosts don't participate in hit testing by default
    return null;
  }
}

/**
 * Factory function to create a WebGPU host element.
 *
 * @param host - The WebGPU host that provides custom rendering
 * @param width - Initial display width
 * @param height - Initial display height
 */
export function webgpuHost(host: WebGPUHost, width: number, height: number): WebGPUHostElement {
  return new WebGPUHostElement(host, width, height);
}
