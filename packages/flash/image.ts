/**
 * Image rendering system for Flash.
 *
 * Provides polychrome (RGBA) image atlas management and GPU rendering.
 * Inspired by Zed's GPUI polychrome sprite system.
 */

import { GPUBufferUsage, GPUTextureUsage } from "@glade/core/webgpu";
import type { TransformationMatrix } from "./types.ts";
import type { ClipBounds } from "./scene.ts";
import { PREMULTIPLIED_ALPHA_BLEND } from "./renderer.ts";

/**
 * Unique identifier for an image in the atlas.
 */
export type ImageId = number & { readonly __imageIdBrand: unique symbol };

/**
 * Decoded image data ready for GPU upload.
 */
export interface DecodedImage {
  width: number;
  height: number;
  /** RGBA pixel data (4 bytes per pixel, premultiplied alpha) */
  data: Uint8Array;
}

/**
 * Image tile in the atlas - tracks location and dimensions.
 */
export interface ImageTile {
  imageId: ImageId;
  atlasX: number;
  atlasY: number;
  width: number;
  height: number;
}

/**
 * Image instance for GPU rendering.
 */
export interface ImageInstance {
  /** Screen bounds for the image */
  x: number;
  y: number;
  width: number;
  height: number;
  /** Atlas coordinates (normalized 0-1) */
  atlasX: number;
  atlasY: number;
  atlasWidth: number;
  atlasHeight: number;
  /** Corner radius for rounded images */
  cornerRadius: number;
  /** Opacity (0-1) */
  opacity: number;
  /** Whether to render as grayscale */
  grayscale: number;
  /** Clip bounds */
  clipBounds?: ClipBounds;
  /** Transform matrix */
  transform?: TransformationMatrix;
  /** Draw order */
  order?: number;
}

/**
 * Configuration for the image atlas.
 */
export interface ImageAtlasConfig {
  width: number;
  height: number;
  padding: number;
}

const DEFAULT_ATLAS_CONFIG: ImageAtlasConfig = {
  width: 4096,
  height: 4096,
  padding: 2,
};

/**
 * Image atlas for caching RGBA images.
 *
 * Uses a simple row-based packing algorithm similar to GlyphAtlas.
 * Supports polychrome (full color) images with optional opacity.
 */
export class ImageAtlas {
  private texture: GPUTexture;
  private textureView: GPUTextureView;
  private config: ImageAtlasConfig;

  private imageCache: Map<ImageId, ImageTile> = new Map();
  private currentX = 0;
  private currentY = 0;
  private rowHeight = 0;
  private nextImageId = 1;

  constructor(
    private device: GPUDevice,
    config: Partial<ImageAtlasConfig> = {}
  ) {
    this.config = { ...DEFAULT_ATLAS_CONFIG, ...config };

    this.texture = device.createTexture({
      size: { width: this.config.width, height: this.config.height },
      format: "rgba8unorm",
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
    });
    this.textureView = this.texture.createView();
  }

  /**
   * Get the atlas texture view for binding.
   */
  getTextureView(): GPUTextureView {
    return this.textureView;
  }

  /**
   * Get atlas dimensions.
   */
  getSize(): { width: number; height: number } {
    return { width: this.config.width, height: this.config.height };
  }

  /**
   * Upload an image to the atlas and return its tile.
   * Returns existing tile if image was already uploaded.
   */
  uploadImage(image: DecodedImage): ImageTile {
    const imageId = this.nextImageId++ as ImageId;

    const atlasPos = this.allocate(image.width, image.height);
    if (!atlasPos) {
      this.clear();
      const retryPos = this.allocate(image.width, image.height);
      if (!retryPos) {
        throw new Error(`Image too large for atlas: ${image.width}x${image.height}`);
      }
      return this.uploadAndCache(imageId, retryPos, image);
    }

    return this.uploadAndCache(imageId, atlasPos, image);
  }

  /**
   * Get a cached image tile by ID.
   */
  getTile(imageId: ImageId): ImageTile | undefined {
    return this.imageCache.get(imageId);
  }

  private uploadAndCache(
    imageId: ImageId,
    pos: { x: number; y: number },
    image: DecodedImage
  ): ImageTile {
    this.device.queue.writeTexture(
      { texture: this.texture, origin: { x: pos.x, y: pos.y } },
      image.data,
      { bytesPerRow: image.width * 4, rowsPerImage: image.height },
      { width: image.width, height: image.height }
    );

    const tile: ImageTile = {
      imageId,
      atlasX: pos.x,
      atlasY: pos.y,
      width: image.width,
      height: image.height,
    };

    this.imageCache.set(imageId, tile);
    return tile;
  }

  /**
   * Allocate space in the atlas for an image.
   */
  private allocate(width: number, height: number): { x: number; y: number } | null {
    const padding = this.config.padding;
    const paddedWidth = width + padding;
    const paddedHeight = height + padding;

    if (this.currentX + paddedWidth > this.config.width) {
      this.currentX = 0;
      this.currentY += this.rowHeight + padding;
      this.rowHeight = 0;
    }

    if (this.currentY + paddedHeight > this.config.height) {
      return null;
    }

    const x = this.currentX;
    const y = this.currentY;

    this.currentX += paddedWidth;
    this.rowHeight = Math.max(this.rowHeight, paddedHeight);

    return { x, y };
  }

  /**
   * Clear the atlas and reset allocation.
   */
  clear(): void {
    this.imageCache.clear();
    this.currentX = 0;
    this.currentY = 0;
    this.rowHeight = 0;
  }

  /**
   * Destroy the atlas and release GPU resources.
   */
  destroy(): void {
    this.texture.destroy();
  }
}

/**
 * WGSL shader for image/polychrome sprite rendering.
 * Supports rounded corners, opacity, grayscale, clipping, and transforms.
 */
const IMAGE_SHADER = /* wgsl */ `
struct Uniforms {
  viewport_size: vec2<f32>,
  scale: f32,
  _padding: f32,
}

struct ImageInstance {
  @location(0) pos_size: vec4<f32>,       // x, y, width, height
  @location(1) atlas_rect: vec4<f32>,     // atlas_x, atlas_y, atlas_width, atlas_height (normalized)
  @location(2) params: vec4<f32>,         // corner_radius, opacity, grayscale, z_index
  @location(3) clip_bounds: vec4<f32>,    // clip_x, clip_y, clip_width, clip_height
  @location(4) clip_params: vec4<f32>,    // clip_corner_radius, has_clip, 0, 0
  @location(5) transform_ab: vec4<f32>,   // a, b, tx, has_transform
  @location(6) transform_cd: vec4<f32>,   // c, d, ty, 0
}

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) uv: vec2<f32>,
  @location(1) @interpolate(flat) rect_origin: vec2<f32>,
  @location(2) @interpolate(flat) half_size: vec2<f32>,
  @location(3) @interpolate(flat) corner_radius: f32,
  @location(4) @interpolate(flat) opacity: f32,
  @location(5) @interpolate(flat) grayscale: f32,
  @location(6) @interpolate(flat) clip_bounds: vec4<f32>,
  @location(7) @interpolate(flat) clip_corner_radius: f32,
  @location(8) @interpolate(flat) has_clip: f32,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var image_texture: texture_2d<f32>;
@group(0) @binding(2) var image_sampler: sampler;

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
  instance: ImageInstance,
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

  let z_depth = 1.0 - (instance.params.w / 10000.0);
  out.position = vec4<f32>(clip_pos, z_depth, 1.0);

  out.uv = instance.atlas_rect.xy + quad_pos * instance.atlas_rect.zw;

  var origin = rect_pos;
  if has_transform {
    origin = apply_transform(rect_pos, instance.transform_ab, instance.transform_cd);
  }
  out.rect_origin = origin * uniforms.scale;
  out.half_size = rect_size * 0.5 * uniforms.scale;
  out.corner_radius = instance.params.x * uniforms.scale;
  out.opacity = instance.params.y;
  out.grayscale = instance.params.z;

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

  // Sample image texture
  var color = textureSample(image_texture, image_sampler, in.uv);

  // Apply grayscale if requested
  if in.grayscale > 0.5 {
    let gray = 0.2126 * color.r + 0.7152 * color.g + 0.0722 * color.b;
    color = vec4<f32>(gray, gray, gray, color.a);
  }

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
 * Instance data layout: 28 floats per instance.
 * - pos_size: 4 floats (x, y, width, height)
 * - atlas_rect: 4 floats (atlas_x, atlas_y, atlas_width, atlas_height)
 * - params: 4 floats (corner_radius, opacity, grayscale, z_index)
 * - clip_bounds: 4 floats (x, y, width, height)
 * - clip_params: 4 floats (corner_radius, has_clip, 0, 0)
 * - transform_ab: 4 floats (a, b, tx, has_transform)
 * - transform_cd: 4 floats (c, d, ty, 0)
 */
const FLOATS_PER_IMAGE = 28;
const BYTES_PER_IMAGE = FLOATS_PER_IMAGE * 4;

/**
 * Image rendering pipeline using instanced rendering.
 */
export class ImagePipeline {
  private pipeline: GPURenderPipeline;
  private instanceBuffer: GPUBuffer;
  private instanceData: Float32Array;
  private maxInstances: number;
  private bindGroupLayout: GPUBindGroupLayout;
  private bindGroup: GPUBindGroup | null = null;
  private sampler: GPUSampler;

  constructor(
    private device: GPUDevice,
    format: GPUTextureFormat,
    private imageAtlas: ImageAtlas,
    maxInstances: number = 10000
  ) {
    this.maxInstances = maxInstances;
    this.instanceData = new Float32Array(maxInstances * FLOATS_PER_IMAGE);

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
      code: IMAGE_SHADER,
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
            arrayStride: BYTES_PER_IMAGE,
            stepMode: "instance",
            attributes: [
              { shaderLocation: 0, offset: 0, format: "float32x4" }, // pos_size
              { shaderLocation: 1, offset: 16, format: "float32x4" }, // atlas_rect
              { shaderLocation: 2, offset: 32, format: "float32x4" }, // params
              { shaderLocation: 3, offset: 48, format: "float32x4" }, // clip_bounds
              { shaderLocation: 4, offset: 64, format: "float32x4" }, // clip_params
              { shaderLocation: 5, offset: 80, format: "float32x4" }, // transform_ab
              { shaderLocation: 6, offset: 96, format: "float32x4" }, // transform_cd
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
    });
  }

  /**
   * Create bind group with the given uniform buffer.
   */
  createBindGroup(uniformBuffer: GPUBuffer): void {
    this.bindGroup = this.device.createBindGroup({
      layout: this.bindGroupLayout,
      entries: [
        { binding: 0, resource: { buffer: uniformBuffer } },
        { binding: 1, resource: this.imageAtlas.getTextureView() },
        { binding: 2, resource: this.sampler },
      ],
    });
  }

  /**
   * Render image instances.
   */
  render(pass: GPURenderPassEncoder, images: ImageInstance[]): void {
    if (images.length === 0 || !this.bindGroup) {
      return;
    }

    const count = Math.min(images.length, this.maxInstances);

    for (let i = 0; i < count; i++) {
      const img = images[i]!;
      const offset = i * FLOATS_PER_IMAGE;

      // pos_size
      this.instanceData[offset + 0] = img.x;
      this.instanceData[offset + 1] = img.y;
      this.instanceData[offset + 2] = img.width;
      this.instanceData[offset + 3] = img.height;

      // atlas_rect
      this.instanceData[offset + 4] = img.atlasX;
      this.instanceData[offset + 5] = img.atlasY;
      this.instanceData[offset + 6] = img.atlasWidth;
      this.instanceData[offset + 7] = img.atlasHeight;

      // params
      this.instanceData[offset + 8] = img.cornerRadius;
      this.instanceData[offset + 9] = img.opacity;
      this.instanceData[offset + 10] = img.grayscale;
      this.instanceData[offset + 11] = img.order ?? i;

      // clip_bounds
      const clip = img.clipBounds;
      this.instanceData[offset + 12] = clip?.x ?? 0;
      this.instanceData[offset + 13] = clip?.y ?? 0;
      this.instanceData[offset + 14] = clip?.width ?? 0;
      this.instanceData[offset + 15] = clip?.height ?? 0;

      // clip_params
      this.instanceData[offset + 16] = clip?.cornerRadius ?? 0;
      this.instanceData[offset + 17] = clip ? 1.0 : 0.0;
      this.instanceData[offset + 18] = 0;
      this.instanceData[offset + 19] = 0;

      // transform_ab
      const transform = img.transform;
      this.instanceData[offset + 20] = transform?.a ?? 1;
      this.instanceData[offset + 21] = transform?.b ?? 0;
      this.instanceData[offset + 22] = transform?.tx ?? 0;
      this.instanceData[offset + 23] = transform ? 1.0 : 0.0;

      // transform_cd
      this.instanceData[offset + 24] = transform?.c ?? 0;
      this.instanceData[offset + 25] = transform?.d ?? 1;
      this.instanceData[offset + 26] = transform?.ty ?? 0;
      this.instanceData[offset + 27] = 0;
    }

    this.device.queue.writeBuffer(
      this.instanceBuffer,
      0,
      this.instanceData,
      0,
      count * FLOATS_PER_IMAGE
    );

    pass.setPipeline(this.pipeline);
    pass.setBindGroup(0, this.bindGroup);
    pass.setVertexBuffer(0, this.instanceBuffer);
    pass.draw(6, count);
  }

  /**
   * Destroy the pipeline and release resources.
   */
  destroy(): void {
    this.instanceBuffer.destroy();
  }
}

const GPUShaderStage = {
  VERTEX: 1,
  FRAGMENT: 2,
  COMPUTE: 4,
} as const;
