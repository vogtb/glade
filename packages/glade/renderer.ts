/**
 * Main render orchestration for Glade. Coordinates GPU pipelines and renders
 * scenes to the screen.
 */

import { GPUBufferUsage, GPUShaderStage, GPUTextureUsage } from "@glade/core/webgpu";
import { log } from "@glade/logging";

import type { HostTexturePipeline } from "./host.ts";
import type { ImageInstance, ImagePipeline } from "./image.ts";
import type { PathPipeline } from "./path.ts";
import type { RectPipeline } from "./rect.ts";
import type { GladeScene, PrimitiveBatch } from "./scene.ts";
import type { ShadowPipeline } from "./shadow.ts";
import type { GlyphInstance, TextPipeline, TextSystem } from "./text.ts";
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
  /** MSAA sample count: 1 (off), 4, or 8. Defaults to 1. */
  msaaSampleCount?: number;
}

const DEFAULT_CONFIG: Required<RendererConfig> = {
  maxRects: 10000,
  maxShadows: 1000,
  maxGlyphs: 50000,
  clearColor: { r: 0, g: 0, b: 0, a: 1 },
  msaaSampleCount: 1,
};

/**
 * Main Glade renderer.
 */
export class GladeRenderer {
  private config: Required<RendererConfig>;
  private uniformBuffer: GPUBuffer | null = null;
  private uniformBindGroup: GPUBindGroup | null = null;
  private uniformBindGroupLayout: GPUBindGroupLayout | null = null;

  // MSAA configuration
  private sampleCount: number = 1;

  // Depth buffer for proper z-ordering of instanced draws
  private depthTexture: GPUTexture | null = null;
  private depthTextureView: GPUTextureView | null = null;
  private depthTextureWidth = 0;
  private depthTextureHeight = 0;

  // MSAA color buffer (only when sampleCount > 1)
  private msaaColorTexture: GPUTexture | null = null;
  private msaaColorTextureView: GPUTextureView | null = null;
  private msaaColorWidth = 0;
  private msaaColorHeight = 0;

  // Pipelines (initialized lazily)
  private rectPipeline: RectPipeline | null = null;
  private shadowPipeline: ShadowPipeline | null = null;
  private textPipeline: TextPipeline | null = null;
  private textSystem: TextSystem | null = null;
  private pathPipeline: PathPipeline | null = null;
  private underlinePipeline: UnderlinePipeline | null = null;
  private imagePipeline: ImagePipeline | null = null;
  private hostTexturePipeline: HostTexturePipeline | null = null;

  constructor(
    private device: GPUDevice,
    private format: GPUTextureFormat,
    config: RendererConfig = {}
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.sampleCount = this.normalizeSampleCount(this.config.msaaSampleCount);
    this.initializeUniforms();
  }

  private normalizeSampleCount(requested: number): number {
    if (!requested || requested <= 1) {
      return 1;
    }
    if (requested >= 8) {
      return 8;
    }
    if (requested >= 4) {
      return 4;
    }
    return 1;
  }

  /**
   * Get the MSAA sample count for pipeline creation.
   */
  getSampleCount(): number {
    return this.sampleCount;
  }

  setClearColor(color: { r: number; g: number; b: number; a: number }): void {
    this.config.clearColor = color;
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
   * Set the image pipeline.
   */
  setImagePipeline(pipeline: ImagePipeline): void {
    this.imagePipeline = pipeline;
    pipeline.createBindGroup(this.uniformBuffer!);
  }

  /**
   * Set the host texture pipeline.
   */
  setHostTexturePipeline(pipeline: HostTexturePipeline): void {
    this.hostTexturePipeline = pipeline;
    pipeline.setUniformBuffer(this.uniformBuffer!);
  }

  /**
   * Ensure depth texture exists and matches the required size and sample count.
   */
  private ensureDepthTexture(width: number, height: number): void {
    if (
      this.depthTexture &&
      this.depthTextureWidth === width &&
      this.depthTextureHeight === height
    ) {
      return;
    }

    if (this.depthTexture) {
      this.depthTexture.destroy();
    }

    this.depthTexture = this.device.createTexture({
      size: { width, height },
      format: "depth24plus",
      sampleCount: this.sampleCount,
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });
    this.depthTextureView = this.depthTexture.createView();
    this.depthTextureWidth = width;
    this.depthTextureHeight = height;
  }

  /**
   * Ensure MSAA color texture exists when sampleCount > 1.
   */
  private ensureMsaaColorTexture(width: number, height: number): void {
    if (this.sampleCount === 1) {
      if (this.msaaColorTexture) {
        this.msaaColorTexture.destroy();
        this.msaaColorTexture = null;
        this.msaaColorTextureView = null;
        this.msaaColorWidth = 0;
        this.msaaColorHeight = 0;
      }
      return;
    }

    if (this.msaaColorTexture && this.msaaColorWidth === width && this.msaaColorHeight === height) {
      return;
    }

    if (this.msaaColorTexture) {
      this.msaaColorTexture.destroy();
    }

    this.msaaColorTexture = this.device.createTexture({
      size: { width, height },
      format: this.format,
      sampleCount: this.sampleCount,
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });
    this.msaaColorTextureView = this.msaaColorTexture.createView();
    this.msaaColorWidth = width;
    this.msaaColorHeight = height;
  }

  /**
   * Update viewport uniforms.
   */
  updateViewport(width: number, height: number, scale: number): void {
    const data = new Float32Array([width, height, scale, 0]);
    // Debug: log uniform data once
    const uniformDebug = GladeRenderer as unknown as { loggedUniform?: boolean };
    if (!uniformDebug.loggedUniform) {
      uniformDebug.loggedUniform = true;
      log.info(`uniform data: viewport=${width}x${height}, scale=${scale}`);
    }
    this.device.queue.writeBuffer(this.uniformBuffer!, 0, data);
  }

  /**
   * Render a scene to a texture view.
   * @param width - Logical width for UI coordinate system
   * @param height - Logical height for UI coordinate system
   * @param framebufferWidth - Optional physical framebuffer width
   *        (defaults to width)
   * @param framebufferHeight - Optional physical framebuffer height
   *        (defaults to height)
   */
  render(
    scene: GladeScene,
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
    const rendererDebug = GladeRenderer as unknown as { lastDebugKey?: string };
    if (rendererDebug.lastDebugKey !== debugKey) {
      rendererDebug.lastDebugKey = debugKey;
      log.info(`logical=${width}x${height}, fb=${fbWidth}x${fbHeight}, dpr=${dpr}`);
    }

    // Update viewport uniform with framebuffer size and scale factor. The
    // shader will use framebuffer coordinates, and we scale positions by DPR.
    this.updateViewport(fbWidth, fbHeight, dpr);

    // Ensure depth and MSAA color textures exist
    this.ensureDepthTexture(fbWidth, fbHeight);
    this.ensureMsaaColorTexture(fbWidth, fbHeight);

    const encoder = this.device.createCommandEncoder();

    const useMSAA = this.sampleCount > 1;

    const colorAttachment: GPURenderPassColorAttachment = useMSAA
      ? {
          view: this.msaaColorTextureView!,
          resolveTarget: textureView,
          clearValue: this.config.clearColor,
          loadOp: "clear",
          storeOp: "discard",
        }
      : {
          view: textureView,
          clearValue: this.config.clearColor,
          loadOp: "clear",
          storeOp: "store",
        };

    const pass = encoder.beginRenderPass({
      colorAttachments: [colorAttachment],
      depthStencilAttachment: {
        view: this.depthTextureView!,
        depthClearValue: 1.0,
        depthLoadOp: "clear",
        depthStoreOp: "store",
      },
    });

    // Set viewport to full framebuffer but scale coordinates. This ensures we
    // render to the full texture
    pass.setViewport(0, 0, fbWidth, fbHeight, 0, 1);

    // Reset all pipeline offsets for interleaved rendering
    this.shadowPipeline?.beginFrame();
    this.rectPipeline?.beginFrame();
    this.pathPipeline?.beginFrame();
    this.underlinePipeline?.beginFrame();
    this.textPipeline?.beginFrame();
    this.imagePipeline?.beginFrame();
    this.hostTexturePipeline?.beginFrame();

    // Render primitives in draw order using batch iteration. This ensures
    // correct layering for overlays: a dialog backdrop (rect) will
    // render AFTER main UI content if its draw order is higher.
    const batchIterator = scene.createBatchIterator();
    let batch: PrimitiveBatch | null;

    while ((batch = batchIterator.next()) !== null) {
      this.renderBatch(pass, batch);
    }

    pass.end();
    this.device.queue.submit([encoder.finish()]);
  }

  /**
   * Render a single batch of primitives.
   */
  private renderBatch(pass: GPURenderPassEncoder, batch: PrimitiveBatch): void {
    switch (batch.type) {
      case "shadows":
        if (this.shadowPipeline && batch.primitives.length > 0) {
          this.shadowPipeline.renderBatch(pass, batch.primitives, this.uniformBindGroup!);
        }
        break;
      case "rects":
        if (this.rectPipeline && batch.primitives.length > 0) {
          this.rectPipeline.renderBatch(pass, batch.primitives, this.uniformBindGroup!);
        }
        break;
      case "paths":
        if (this.pathPipeline && batch.primitives.length > 0) {
          this.pathPipeline.renderBatch(pass, batch.primitives, this.uniformBindGroup!);
        }
        break;
      case "underlines":
        if (this.underlinePipeline && batch.primitives.length > 0) {
          this.underlinePipeline.renderBatch(pass, batch.primitives, this.uniformBindGroup!);
        }
        break;
      case "glyphs":
        if (this.textPipeline && batch.primitives.length > 0) {
          this.textPipeline.renderBatch(pass, batch.primitives as GlyphInstance[]);
        }
        break;
      case "images":
        if (this.imagePipeline && batch.primitives.length > 0) {
          this.imagePipeline.renderBatch(pass, batch.primitives as ImageInstance[]);
        }
        break;
      case "hostTextures":
        if (this.hostTexturePipeline && batch.primitives.length > 0) {
          this.hostTexturePipeline.renderBatch(pass, batch.primitives);
        }
        break;
    }
  }

  /**
   * Destroy the renderer and release resources.
   */
  destroy(): void {
    this.uniformBuffer?.destroy();
    this.depthTexture?.destroy();
    this.msaaColorTexture?.destroy();
    this.rectPipeline?.destroy();
    this.shadowPipeline?.destroy();
    this.pathPipeline?.destroy();
    this.underlinePipeline?.destroy();
    this.imagePipeline?.destroy();
    this.hostTexturePipeline?.destroy();
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
