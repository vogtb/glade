/**
 * Main render orchestration for Flash.
 *
 * Coordinates GPU pipelines and renders scenes to the screen.
 */

import { GPUBufferUsage, GPUShaderStage } from "@glade/webgpu";
import type { FlashScene, SceneLayer } from "./scene.ts";
import type { RectPipeline } from "./rect.ts";
import type { ShadowPipeline } from "./shadow.ts";

/**
 * Renderer configuration.
 */
export interface RendererConfig {
  /** Maximum number of rect instances per batch. */
  maxRects?: number;
  /** Maximum number of shadow instances per batch. */
  maxShadows?: number;
  /** Maximum number of glyph instances per batch. */
  maxGlyphs?: number;
  /** Clear color. */
  clearColor?: { r: number; g: number; b: number; a: number };
}

const DEFAULT_CONFIG: Required<RendererConfig> = {
  maxRects: 10000,
  maxShadows: 1000,
  maxGlyphs: 50000,
  clearColor: { r: 0, g: 0, b: 0, a: 1 },
};

/**
 * Main Flash renderer.
 */
export class FlashRenderer {
  private config: Required<RendererConfig>;
  private uniformBuffer: GPUBuffer | null = null;
  private uniformBindGroup: GPUBindGroup | null = null;
  private uniformBindGroupLayout: GPUBindGroupLayout | null = null;

  // Pipelines (initialized lazily)
  private rectPipeline: RectPipeline | null = null;
  private shadowPipeline: ShadowPipeline | null = null;

  constructor(
    private device: GPUDevice,
    private format: GPUTextureFormat,
    config: RendererConfig = {}
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.initializeUniforms();
  }

  /**
   * Initialize uniform buffer and bind group.
   */
  private initializeUniforms(): void {
    // Create uniform buffer for viewport data
    this.uniformBuffer = this.device.createBuffer({
      size: 16, // 4 floats: width, height, scale, padding
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    // Create bind group layout
    this.uniformBindGroupLayout = this.device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
          buffer: { type: "uniform" },
        },
      ],
    });

    // Create bind group
    this.uniformBindGroup = this.device.createBindGroup({
      layout: this.uniformBindGroupLayout,
      entries: [
        {
          binding: 0,
          resource: { buffer: this.uniformBuffer },
        },
      ],
    });
  }

  /**
   * Get the uniform bind group layout for pipelines.
   */
  getUniformBindGroupLayout(): GPUBindGroupLayout {
    return this.uniformBindGroupLayout!;
  }

  /**
   * Set the rect pipeline.
   */
  setRectPipeline(pipeline: RectPipeline): void {
    this.rectPipeline = pipeline;
  }

  /**
   * Set the shadow pipeline.
   */
  setShadowPipeline(pipeline: ShadowPipeline): void {
    this.shadowPipeline = pipeline;
  }

  /**
   * Update viewport uniforms.
   */
  updateViewport(width: number, height: number, scale: number): void {
    const data = new Float32Array([width, height, scale, 0]);
    this.device.queue.writeBuffer(this.uniformBuffer!, 0, data);
  }

  /**
   * Render a scene to a texture view.
   * @param width - Logical width for UI coordinate system
   * @param height - Logical height for UI coordinate system
   * @param framebufferWidth - Optional physical framebuffer width (defaults to width)
   * @param framebufferHeight - Optional physical framebuffer height (defaults to height)
   */
  render(
    scene: FlashScene,
    textureView: GPUTextureView,
    width: number,
    height: number,
    framebufferWidth?: number,
    framebufferHeight?: number
  ): void {
    const fbWidth = framebufferWidth ?? width;
    const fbHeight = framebufferHeight ?? height;

    // Calculate DPR (device pixel ratio) for scaling
    const dprX = fbWidth / width;
    const dprY = fbHeight / height;
    const dpr = Math.max(dprX, dprY);

    // Update viewport uniform with framebuffer size and scale factor
    // The shader will use framebuffer coordinates, and we scale positions by DPR
    this.updateViewport(fbWidth, fbHeight, dpr);

    const encoder = this.device.createCommandEncoder();

    const pass = encoder.beginRenderPass({
      colorAttachments: [
        {
          view: textureView,
          clearValue: this.config.clearColor,
          loadOp: "clear",
          storeOp: "store",
        },
      ],
    });

    // Set viewport to full framebuffer but scale coordinates
    // This ensures we render to the full texture
    pass.setViewport(0, 0, fbWidth, fbHeight, 0, 1);

    // Render each layer
    for (const layer of scene.getLayers()) {
      this.renderLayer(pass, layer);
    }

    pass.end();
    this.device.queue.submit([encoder.finish()]);
  }

  /**
   * Render a single layer.
   */
  private renderLayer(pass: GPURenderPassEncoder, layer: SceneLayer): void {
    // Draw shadows first (they go behind everything)
    if (layer.shadows.length > 0 && this.shadowPipeline) {
      this.shadowPipeline.render(pass, layer.shadows, this.uniformBindGroup!);
    }

    // Draw rectangles
    if (layer.rects.length > 0 && this.rectPipeline) {
      this.rectPipeline.render(pass, layer.rects, this.uniformBindGroup!);
    }

    // TODO: Draw glyphs when text pipeline is implemented
    // TODO: Draw images when image pipeline is implemented
  }

  /**
   * Destroy the renderer and release resources.
   */
  destroy(): void {
    this.uniformBuffer?.destroy();
    this.rectPipeline?.destroy();
    this.shadowPipeline?.destroy();
  }
}

/**
 * Premultiplied alpha blend state for UI rendering.
 */
export const PREMULTIPLIED_ALPHA_BLEND: GPUBlendState = {
  color: {
    srcFactor: "one",
    dstFactor: "one-minus-src-alpha",
    operation: "add",
  },
  alpha: {
    srcFactor: "one",
    dstFactor: "one-minus-src-alpha",
    operation: "add",
  },
};

/**
 * Standard alpha blend state.
 */
export const STANDARD_ALPHA_BLEND: GPUBlendState = {
  color: {
    srcFactor: "src-alpha",
    dstFactor: "one-minus-src-alpha",
    operation: "add",
  },
  alpha: {
    srcFactor: "one",
    dstFactor: "one-minus-src-alpha",
    operation: "add",
  },
};
