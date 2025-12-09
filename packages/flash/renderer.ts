/**
 * Main render orchestration for Flash.
 *
 * Coordinates GPU pipelines and renders scenes to the screen.
 */

import { GPUBufferUsage, GPUShaderStage, GPUTextureUsage } from "@glade/webgpu";
import type { FlashScene, SceneLayer } from "./scene.ts";
import type { RectPipeline } from "./rect.ts";
import type { ShadowPipeline } from "./shadow.ts";
import type { TextPipeline, TextSystem, GlyphInstance } from "./text.ts";
import type { PathPipeline } from "./path.ts";
import type { UnderlinePipeline } from "./underline.ts";

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

  // Depth buffer for proper z-ordering of instanced draws
  private depthTexture: GPUTexture | null = null;
  private depthTextureView: GPUTextureView | null = null;
  private depthTextureWidth = 0;
  private depthTextureHeight = 0;

  // Pipelines (initialized lazily)
  private rectPipeline: RectPipeline | null = null;
  private shadowPipeline: ShadowPipeline | null = null;
  private textPipeline: TextPipeline | null = null;
  private textSystem: TextSystem | null = null;
  private pathPipeline: PathPipeline | null = null;
  private underlinePipeline: UnderlinePipeline | null = null;

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
   * Set the text pipeline and text system.
   */
  setTextPipeline(pipeline: TextPipeline, textSystem: TextSystem): void {
    this.textPipeline = pipeline;
    this.textSystem = textSystem;
    pipeline.createBindGroup(this.uniformBuffer!);
  }

  /**
   * Get the text system for text rendering.
   */
  getTextSystem(): TextSystem | null {
    return this.textSystem;
  }

  /**
   * Set the path pipeline.
   */
  setPathPipeline(pipeline: PathPipeline): void {
    this.pathPipeline = pipeline;
  }

  /**
   * Set the underline pipeline.
   */
  setUnderlinePipeline(pipeline: UnderlinePipeline): void {
    this.underlinePipeline = pipeline;
  }

  /**
   * Ensure depth texture exists and matches the required size.
   */
  private ensureDepthTexture(width: number, height: number): void {
    if (
      this.depthTexture &&
      this.depthTextureWidth === width &&
      this.depthTextureHeight === height
    ) {
      return;
    }

    // Destroy old texture if it exists
    if (this.depthTexture) {
      this.depthTexture.destroy();
    }

    // Create new depth texture
    this.depthTexture = this.device.createTexture({
      size: { width, height },
      format: "depth24plus",
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });
    this.depthTextureView = this.depthTexture.createView();
    this.depthTextureWidth = width;
    this.depthTextureHeight = height;
  }

  /**
   * Update viewport uniforms.
   */
  updateViewport(width: number, height: number, scale: number): void {
    const data = new Float32Array([width, height, scale, 0]);
    // Debug: log uniform data once
    const uniformDebug = FlashRenderer as unknown as { loggedUniform?: boolean };
    if (!uniformDebug.loggedUniform) {
      uniformDebug.loggedUniform = true;
      console.log(`Uniform data: viewport=${width}x${height}, scale=${scale}`);
    }
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

    // Debug: log once
    const debugKey = `${width}x${height}-${fbWidth}x${fbHeight}`;
    const rendererDebug = FlashRenderer as unknown as { lastDebugKey?: string };
    if (rendererDebug.lastDebugKey !== debugKey) {
      rendererDebug.lastDebugKey = debugKey;
      console.log(`Renderer: logical=${width}x${height}, fb=${fbWidth}x${fbHeight}, dpr=${dpr}`);
    }

    // Update viewport uniform with framebuffer size and scale factor
    // The shader will use framebuffer coordinates, and we scale positions by DPR
    this.updateViewport(fbWidth, fbHeight, dpr);

    // Ensure depth buffer exists and is correct size
    this.ensureDepthTexture(fbWidth, fbHeight);

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
      depthStencilAttachment: {
        view: this.depthTextureView!,
        depthClearValue: 1.0,
        depthLoadOp: "clear",
        depthStoreOp: "store",
      },
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
   * Primitives are rendered type-by-type (shadows, rects, paths, underlines, glyphs)
   * to maintain proper type hierarchy. Within each type, primitives are sorted by
   * draw order for correct depth ordering.
   */
  private renderLayer(pass: GPURenderPassEncoder, layer: SceneLayer): void {
    const byOrder = (a: { order?: number }, b: { order?: number }) =>
      (a.order ?? 0) - (b.order ?? 0);

    // Draw shadows first (they go behind everything)
    if (layer.shadows.length > 0 && this.shadowPipeline) {
      const sorted = layer.shadows.slice().sort(byOrder);
      this.shadowPipeline.render(pass, sorted, this.uniformBindGroup!);
    }

    // Draw rectangles
    if (layer.rects.length > 0 && this.rectPipeline) {
      const sorted = layer.rects.slice().sort(byOrder);
      this.rectPipeline.render(pass, sorted, this.uniformBindGroup!);
    }

    // Draw paths
    if (layer.paths.length > 0 && this.pathPipeline) {
      const sorted = layer.paths.slice().sort(byOrder);
      this.pathPipeline.render(pass, sorted, this.uniformBindGroup!);
    }

    // Draw underlines
    if (layer.underlines.length > 0 && this.underlinePipeline) {
      const sorted = layer.underlines.slice().sort(byOrder);
      this.underlinePipeline.render(pass, sorted, this.uniformBindGroup!);
    }

    // Draw glyphs (text)
    if (layer.glyphs.length > 0 && this.textPipeline) {
      const sorted = layer.glyphs.slice().sort(byOrder);
      this.textPipeline.render(pass, sorted as GlyphInstance[], 0);
    }

    // TODO: Draw images when image pipeline is implemented
  }

  /**
   * Destroy the renderer and release resources.
   */
  destroy(): void {
    this.uniformBuffer?.destroy();
    this.rectPipeline?.destroy();
    this.shadowPipeline?.destroy();
    this.pathPipeline?.destroy();
    this.underlinePipeline?.destroy();
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
