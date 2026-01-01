/**
 * WebGPU Host System for Glade.
 *
 * This module provides the infrastructure for embedding custom WebGPU rendering
 * within the Glade UI system. It includes:
 * - RenderTexture: Abstraction for offscreen render targets
 * - WebGPUHost: Interface for custom WebGPU rendering
 * - WebGPUHostElement: Glade element for embedding hosts in the layout
 * - HostTexturePipeline: GPU pipeline for rendering host textures
 */

import { GPUBufferUsage, GPUShaderStage, GPUTextureUsage } from "@glade/core/webgpu";
import type { Bounds } from "./types.ts";
import type { HitTestNode } from "./dispatch.ts";
import type { HostTexturePrimitive } from "./scene.ts";
import { PREMULTIPLIED_ALPHA_BLEND } from "./renderer.ts";
import {
  GladeElement,
  type RequestLayoutContext,
  type PrepaintContext,
  type PaintContext,
  type RequestLayoutResult,
} from "./element.ts";

// =============================================================================
// RenderTexture
// =============================================================================

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
 * @param format - Texture format (should match the Glade window format)
 */
export function createRenderTexture(
  device: GPUDevice,
  width: number,
  height: number,
  format: GPUTextureFormat
): RenderTexture {
  return new RenderTextureImpl(device, width, height, format);
}

// =============================================================================
// WebGPUHost Interface
// =============================================================================

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
 * Interface for custom WebGPU rendering within Glade.
 *
 * Implementations render to an offscreen texture which Glade then
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
   * Called each frame before Glade's main render pass.
   * Use the provided command encoder to record render/compute passes.
   *
   * @param input - Frame input state (time, mouse, dimensions)
   * @param encoder - Command encoder to record GPU commands
   */
  render(input: WebGPUHostInput, encoder: GPUCommandEncoder): void;

  /**
   * Get the render texture that Glade will sample.
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

// =============================================================================
// WebGPUHostElement
// =============================================================================

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
 * Element for embedding WebGPU host content within Glade UI.
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
export class WebGPUHostElement extends GladeElement<HostRequestState, HostPrepaintState> {
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

// =============================================================================
// HostTexturePipeline
// =============================================================================

/**
 * WGSL shader for host texture rendering.
 * Supports rounded corners, opacity, clipping, and transforms.
 */
const HOST_TEXTURE_SHADER = /* wgsl */ `
struct Uniforms {
  viewport_size: vec2<f32>,
  scale: f32,
  _padding: f32,
}

struct HostTextureInstance {
  @location(0) pos_size: vec4<f32>,       // x, y, width, height
  @location(1) params: vec4<f32>,         // corner_radius, opacity, z_index, 0
  @location(2) clip_bounds: vec4<f32>,    // clip_x, clip_y, clip_width, clip_height
  @location(3) clip_params: vec4<f32>,    // clip_corner_radius, has_clip, 0, 0
  @location(4) transform_ab: vec4<f32>,   // a, b, tx, has_transform
  @location(5) transform_cd: vec4<f32>,   // c, d, ty, 0
}

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) uv: vec2<f32>,
  @location(1) @interpolate(flat) rect_origin: vec2<f32>,
  @location(2) @interpolate(flat) half_size: vec2<f32>,
  @location(3) @interpolate(flat) corner_radius: f32,
  @location(4) @interpolate(flat) opacity: f32,
  @location(5) @interpolate(flat) clip_bounds: vec4<f32>,
  @location(6) @interpolate(flat) clip_corner_radius: f32,
  @location(7) @interpolate(flat) has_clip: f32,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var host_texture: texture_2d<f32>;
@group(0) @binding(2) var host_sampler: sampler;

var<private> QUAD_VERTICES: array<vec2<f32>, 6> = array<vec2<f32>, 6>(
  vec2<f32>(0.0, 0.0),
  vec2<f32>(1.0, 0.0),
  vec2<f32>(0.0, 1.0),
  vec2<f32>(1.0, 0.0),
  vec2<f32>(1.0, 1.0),
  vec2<f32>(0.0, 1.0),
);

fn apply_transform(pos: vec2<f32>, transform_ab: vec4<f32>, transform_cd: vec4<f32>) -> vec2<f32> {
  let a = transform_ab.x;
  let b = transform_ab.y;
  let tx = transform_ab.z;
  let c = transform_cd.x;
  let d = transform_cd.y;
  let ty = transform_cd.z;
  return vec2<f32>(
    a * pos.x + b * pos.y + tx,
    c * pos.x + d * pos.y + ty
  );
}

@vertex
fn vs_main(
  @builtin(vertex_index) vertex_index: u32,
  instance: HostTextureInstance,
) -> VertexOutput {
  var out: VertexOutput;

  let quad_pos = QUAD_VERTICES[vertex_index];
  let rect_pos = instance.pos_size.xy;
  let rect_size = instance.pos_size.zw;
  let has_transform = instance.transform_ab.w > 0.5;

  var world_pos = rect_pos + quad_pos * rect_size;

  if has_transform {
    world_pos = apply_transform(world_pos, instance.transform_ab, instance.transform_cd);
  }

  let scaled_pos = world_pos * uniforms.scale;

  let clip_pos = vec2<f32>(
    (scaled_pos.x / uniforms.viewport_size.x) * 2.0 - 1.0,
    1.0 - (scaled_pos.y / uniforms.viewport_size.y) * 2.0
  );

  // Normalize z_index to 0-1 range (max ~2M to handle stacking contexts with zIndex * 10000)
  let z_depth = 1.0 - (instance.params.z / 2000000.0);
  out.position = vec4<f32>(clip_pos, z_depth, 1.0);

  // UV coordinates (0-1 range, no atlas offset)
  out.uv = quad_pos;

  var origin = rect_pos;
  if has_transform {
    origin = apply_transform(rect_pos, instance.transform_ab, instance.transform_cd);
  }
  out.rect_origin = origin * uniforms.scale;
  out.half_size = rect_size * 0.5 * uniforms.scale;
  out.corner_radius = instance.params.x * uniforms.scale;
  out.opacity = instance.params.y;

  out.clip_bounds = vec4<f32>(
    instance.clip_bounds.x * uniforms.scale,
    instance.clip_bounds.y * uniforms.scale,
    instance.clip_bounds.z * uniforms.scale,
    instance.clip_bounds.w * uniforms.scale
  );
  out.clip_corner_radius = instance.clip_params.x * uniforms.scale;
  out.has_clip = instance.clip_params.y;

  return out;
}

fn quad_sdf(p: vec2<f32>, half_size: vec2<f32>, corner_radius: f32) -> f32 {
  let corner_to_point = abs(p) - half_size;
  let q = corner_to_point + vec2<f32>(corner_radius, corner_radius);
  if corner_radius == 0.0 {
    return max(corner_to_point.x, corner_to_point.y);
  }
  return length(max(q, vec2<f32>(0.0, 0.0))) + min(max(q.x, q.y), 0.0) - corner_radius;
}

fn clip_sdf(pos: vec2<f32>, clip_bounds: vec4<f32>, corner_radius: f32) -> f32 {
  let clip_origin = clip_bounds.xy;
  let clip_size = clip_bounds.zw;
  let clip_half_size = clip_size * 0.5;
  let clip_center = clip_origin + clip_half_size;
  let local_pos = pos - clip_center;
  return quad_sdf(local_pos, clip_half_size, corner_radius);
}

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
  // Apply clip bounds if present
  if in.has_clip > 0.5 {
    let frag_pos = in.position.xy;
    let clip_dist = clip_sdf(frag_pos, in.clip_bounds, in.clip_corner_radius);
    if clip_dist > 0.0 {
      discard;
    }
  }

  // Sample host texture
  var color = textureSample(host_texture, host_sampler, in.uv);

  // Apply rounded corners using SDF
  let point = in.position.xy - in.rect_origin;
  let half_size = in.half_size;
  let local_pos = point - half_size;
  let radius = min(in.corner_radius, min(half_size.x, half_size.y));
  let dist = quad_sdf(local_pos, half_size, radius);
  let alpha = 1.0 - smoothstep(-0.5, 0.5, dist);

  if alpha <= 0.0 {
    discard;
  }

  // Apply opacity
  color.a *= in.opacity * alpha;

  // Premultiply alpha for blending
  color = vec4<f32>(color.rgb * color.a, color.a);

  return color;
}
`;

/**
 * Instance data layout: 24 floats per instance.
 * - pos_size: 4 floats (x, y, width, height)
 * - params: 4 floats (corner_radius, opacity, z_index, 0)
 * - clip_bounds: 4 floats (x, y, width, height)
 * - clip_params: 4 floats (corner_radius, has_clip, 0, 0)
 * - transform_ab: 4 floats (a, b, tx, has_transform)
 * - transform_cd: 4 floats (c, d, ty, 0)
 */
const FLOATS_PER_INSTANCE = 24;
const BYTES_PER_INSTANCE = FLOATS_PER_INSTANCE * 4;

/**
 * Host texture rendering pipeline.
 *
 * Unlike ImagePipeline which uses an atlas, this pipeline renders
 * individual textures from WebGPU hosts. It caches bind groups per
 * unique texture view to avoid recreation each frame.
 *
 * Supports interleaved batch rendering where renderBatch() can be called
 * multiple times per frame. Call beginFrame() at the start of each frame
 * to reset the instance buffer offset.
 */
export class HostTexturePipeline {
  private pipeline: GPURenderPipeline;
  private instanceBuffer: GPUBuffer;
  private instanceData: Float32Array;
  private maxInstances: number;
  private bindGroupLayout: GPUBindGroupLayout;
  private sampler: GPUSampler;
  private uniformBuffer: GPUBuffer | null = null;

  /** Current offset in the instance buffer for interleaved rendering. */
  private currentOffset = 0;

  // Cache bind groups per texture view
  private bindGroupCache: Map<GPUTextureView, GPUBindGroup> = new Map();

  constructor(
    private device: GPUDevice,
    format: GPUTextureFormat,
    maxInstances: number = 100,
    private sampleCount: number = 1
  ) {
    this.maxInstances = maxInstances;
    this.instanceData = new Float32Array(maxInstances * FLOATS_PER_INSTANCE);

    this.instanceBuffer = device.createBuffer({
      size: this.instanceData.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });

    this.sampler = device.createSampler({
      magFilter: "linear",
      minFilter: "linear",
    });

    this.bindGroupLayout = device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
          buffer: { type: "uniform" },
        },
        {
          binding: 1,
          visibility: GPUShaderStage.FRAGMENT,
          texture: { sampleType: "float" },
        },
        {
          binding: 2,
          visibility: GPUShaderStage.FRAGMENT,
          sampler: { type: "filtering" },
        },
      ],
    });

    const shaderModule = device.createShaderModule({
      code: HOST_TEXTURE_SHADER,
    });

    const pipelineLayout = device.createPipelineLayout({
      bindGroupLayouts: [this.bindGroupLayout],
    });

    this.pipeline = device.createRenderPipeline({
      layout: pipelineLayout,
      vertex: {
        module: shaderModule,
        entryPoint: "vs_main",
        buffers: [
          {
            arrayStride: BYTES_PER_INSTANCE,
            stepMode: "instance",
            attributes: [
              { shaderLocation: 0, offset: 0, format: "float32x4" }, // pos_size
              { shaderLocation: 1, offset: 16, format: "float32x4" }, // params
              { shaderLocation: 2, offset: 32, format: "float32x4" }, // clip_bounds
              { shaderLocation: 3, offset: 48, format: "float32x4" }, // clip_params
              { shaderLocation: 4, offset: 64, format: "float32x4" }, // transform_ab
              { shaderLocation: 5, offset: 80, format: "float32x4" }, // transform_cd
            ],
          },
        ],
      },
      fragment: {
        module: shaderModule,
        entryPoint: "fs_main",
        targets: [
          {
            format,
            blend: PREMULTIPLIED_ALPHA_BLEND,
          },
        ],
      },
      primitive: {
        topology: "triangle-list",
      },
      depthStencil: {
        format: "depth24plus",
        depthWriteEnabled: true,
        depthCompare: "less",
      },
      multisample: {
        count: this.sampleCount,
      },
    });
  }

  /**
   * Set the uniform buffer for viewport data.
   */
  setUniformBuffer(uniformBuffer: GPUBuffer): void {
    this.uniformBuffer = uniformBuffer;
    // Clear bind group cache when uniform buffer changes
    this.bindGroupCache.clear();
  }

  /**
   * Get or create a bind group for a texture view.
   */
  private getBindGroup(textureView: GPUTextureView): GPUBindGroup | null {
    if (!this.uniformBuffer) {
      return null;
    }

    let bindGroup = this.bindGroupCache.get(textureView);
    if (!bindGroup) {
      bindGroup = this.device.createBindGroup({
        layout: this.bindGroupLayout,
        entries: [
          { binding: 0, resource: { buffer: this.uniformBuffer } },
          { binding: 1, resource: textureView },
          { binding: 2, resource: this.sampler },
        ],
      });
      this.bindGroupCache.set(textureView, bindGroup);
    }
    return bindGroup;
  }

  /**
   * Clear the bind group cache.
   * Call this when textures are recreated (e.g., on resize).
   */
  clearBindGroupCache(): void {
    this.bindGroupCache.clear();
  }

  /**
   * Remove a specific texture view from the cache.
   */
  removeFromCache(textureView: GPUTextureView): void {
    this.bindGroupCache.delete(textureView);
  }

  /**
   * Reset the instance buffer offset for a new frame.
   * Must be called before the first renderBatch() call each frame.
   */
  beginFrame(): void {
    this.currentOffset = 0;
  }

  /**
   * Render a batch of host texture primitives at the current buffer offset.
   * Can be called multiple times per frame for interleaved rendering.
   *
   * Note: Unlike other pipelines, host textures must be grouped by texture view
   * since each texture requires a different bind group. This method handles
   * a batch that may contain multiple textures.
   */
  renderBatch(pass: GPURenderPassEncoder, hostTextures: HostTexturePrimitive[]): void {
    if (hostTextures.length === 0 || !this.uniformBuffer) {
      return;
    }

    pass.setPipeline(this.pipeline);

    // Group primitives by texture view
    const byTexture = new Map<GPUTextureView, HostTexturePrimitive[]>();
    for (const ht of hostTextures) {
      const list = byTexture.get(ht.textureView);
      if (list) {
        list.push(ht);
      } else {
        byTexture.set(ht.textureView, [ht]);
      }
    }

    // Render each texture group
    for (const [textureView, primitives] of byTexture) {
      const bindGroup = this.getBindGroup(textureView);
      if (!bindGroup) {
        continue;
      }

      // Check available space
      const available = this.maxInstances - this.currentOffset;
      const count = Math.min(primitives.length, available);

      if (count <= 0) {
        console.warn(
          `HostTexturePipeline: buffer full (${this.currentOffset}/${this.maxInstances}), skipping ${primitives.length} host textures`
        );
        continue;
      }

      if (count < primitives.length) {
        console.warn(
          `HostTexturePipeline: buffer nearly full, rendering ${count}/${primitives.length} host textures`
        );
      }

      const startOffset = this.currentOffset;

      for (let i = 0; i < count; i++) {
        const ht = primitives[i]!;
        const offset = (startOffset + i) * FLOATS_PER_INSTANCE;

        // pos_size
        this.instanceData[offset + 0] = ht.x;
        this.instanceData[offset + 1] = ht.y;
        this.instanceData[offset + 2] = ht.width;
        this.instanceData[offset + 3] = ht.height;

        // params
        this.instanceData[offset + 4] = ht.cornerRadius;
        this.instanceData[offset + 5] = ht.opacity;
        this.instanceData[offset + 6] = ht.order ?? startOffset + i;
        this.instanceData[offset + 7] = 0;

        // clip_bounds
        const clip = ht.clipBounds;
        this.instanceData[offset + 8] = clip?.x ?? 0;
        this.instanceData[offset + 9] = clip?.y ?? 0;
        this.instanceData[offset + 10] = clip?.width ?? 0;
        this.instanceData[offset + 11] = clip?.height ?? 0;

        // clip_params
        this.instanceData[offset + 12] = clip?.cornerRadius ?? 0;
        this.instanceData[offset + 13] = clip ? 1.0 : 0.0;
        this.instanceData[offset + 14] = 0;
        this.instanceData[offset + 15] = 0;

        // transform_ab
        const transform = ht.transform;
        this.instanceData[offset + 16] = transform?.a ?? 1;
        this.instanceData[offset + 17] = transform?.b ?? 0;
        this.instanceData[offset + 18] = transform?.tx ?? 0;
        this.instanceData[offset + 19] = transform ? 1.0 : 0.0;

        // transform_cd
        this.instanceData[offset + 20] = transform?.c ?? 0;
        this.instanceData[offset + 21] = transform?.d ?? 1;
        this.instanceData[offset + 22] = transform?.ty ?? 0;
        this.instanceData[offset + 23] = 0;
      }

      // Upload at offset
      const uploadOffsetBytes = startOffset * BYTES_PER_INSTANCE;
      const uploadSizeFloats = count * FLOATS_PER_INSTANCE;

      this.device.queue.writeBuffer(
        this.instanceBuffer,
        uploadOffsetBytes,
        this.instanceData,
        startOffset * FLOATS_PER_INSTANCE,
        uploadSizeFloats
      );

      // Draw from offset
      pass.setBindGroup(0, bindGroup);
      pass.setVertexBuffer(0, this.instanceBuffer);
      pass.draw(6, count, 0, startOffset);

      // Advance offset for next batch
      this.currentOffset += count;
    }
  }

  /**
   * Legacy render method for backwards compatibility.
   * Renders all host textures in a single call, resetting the buffer first.
   * Prefer using beginFrame() + renderBatch() for interleaved rendering.
   */
  render(pass: GPURenderPassEncoder, hostTextures: HostTexturePrimitive[]): void {
    this.beginFrame();
    this.renderBatch(pass, hostTextures);
  }

  /**
   * Destroy the pipeline and release resources.
   */
  destroy(): void {
    this.instanceBuffer.destroy();
    this.bindGroupCache.clear();
  }
}
