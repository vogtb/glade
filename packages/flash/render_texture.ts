/**
 * RenderTexture - Abstraction for offscreen render targets.
 *
 * Used by WebGPUHost implementations to render custom WebGPU content
 * that can then be sampled by Flash's rendering pipeline.
 */

import { GPUTextureUsage } from "@glade/core/webgpu";

/**
 * A GPU texture that can be used as a render target and then sampled.
 */
export interface RenderTexture {
  readonly texture: GPUTexture;
  readonly textureView: GPUTextureView;
  readonly width: number;
  readonly height: number;
  readonly format: GPUTextureFormat;

  /**
   * Resize the texture. Destroys the old texture and creates a new one.
   */
  resize(width: number, height: number): void;

  /**
   * Destroy the texture and release GPU resources.
   */
  destroy(): void;
}

class RenderTextureImpl implements RenderTexture {
  private device: GPUDevice;
  private _texture: GPUTexture;
  private _textureView: GPUTextureView;
  private _width: number;
  private _height: number;
  private _format: GPUTextureFormat;

  constructor(device: GPUDevice, width: number, height: number, format: GPUTextureFormat) {
    this.device = device;
    this._width = Math.max(1, Math.floor(width));
    this._height = Math.max(1, Math.floor(height));
    this._format = format;

    const { texture, textureView } = this.createTexture();
    this._texture = texture;
    this._textureView = textureView;
  }

  private createTexture(): { texture: GPUTexture; textureView: GPUTextureView } {
    const texture = this.device.createTexture({
      size: { width: this._width, height: this._height },
      format: this._format,
      usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
    });
    const textureView = texture.createView();
    return { texture, textureView };
  }

  get texture(): GPUTexture {
    return this._texture;
  }

  get textureView(): GPUTextureView {
    return this._textureView;
  }

  get width(): number {
    return this._width;
  }

  get height(): number {
    return this._height;
  }

  get format(): GPUTextureFormat {
    return this._format;
  }

  resize(width: number, height: number): void {
    const newWidth = Math.max(1, Math.floor(width));
    const newHeight = Math.max(1, Math.floor(height));

    if (newWidth === this._width && newHeight === this._height) {
      return;
    }

    this._texture.destroy();
    this._width = newWidth;
    this._height = newHeight;

    const { texture, textureView } = this.createTexture();
    this._texture = texture;
    this._textureView = textureView;
  }

  destroy(): void {
    this._texture.destroy();
  }
}

/**
 * Create a new render texture for offscreen rendering.
 *
 * @param device - The GPU device
 * @param width - Initial width in pixels
 * @param height - Initial height in pixels
 * @param format - Texture format (should match the Flash window format)
 */
export function createRenderTexture(
  device: GPUDevice,
  width: number,
  height: number,
  format: GPUTextureFormat
): RenderTexture {
  return new RenderTextureImpl(device, width, height, format);
}
