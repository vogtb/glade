/**
 * Image rendering system for Flash.
 *
 * Provides polychrome (RGBA) image atlas management and GPU rendering.
 * Inspired by Zed's GPUI polychrome sprite system.
 */

import { GPUBufferUsage, GPUTextureUsage } from "@glade/webgpu";
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
    if (images.length === 0 || !this.bindGroup) return;

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

// ============ PNG Decoder ============

/**
 * Minimal PNG decoder that works without Web APIs.
 * Supports: 8-bit RGB, RGBA, grayscale, grayscale+alpha, indexed color
 * Does NOT support: interlacing, 16-bit depth
 */
export function decodePNG(data: Uint8Array): DecodedImage {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);

  // Validate PNG signature
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  for (let i = 0; i < 8; i++) {
    if (data[i] !== signature[i]) {
      throw new Error("Invalid PNG signature");
    }
  }

  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  let palette: Uint8Array | null = null;
  let transparency: Uint8Array | null = null;
  const compressedChunks: Uint8Array[] = [];

  let offset = 8;
  while (offset < data.length) {
    const length = view.getUint32(offset, false);
    const type = String.fromCharCode(
      data[offset + 4]!,
      data[offset + 5]!,
      data[offset + 6]!,
      data[offset + 7]!
    );
    const chunkData = data.subarray(offset + 8, offset + 8 + length);

    switch (type) {
      case "IHDR":
        width = view.getUint32(offset + 8, false);
        height = view.getUint32(offset + 12, false);
        bitDepth = data[offset + 16]!;
        colorType = data[offset + 17]!;
        if (bitDepth !== 8) {
          throw new Error(`Unsupported bit depth: ${bitDepth}`);
        }
        if (data[offset + 20] !== 0) {
          throw new Error("Interlaced PNGs not supported");
        }
        break;
      case "PLTE":
        palette = new Uint8Array(chunkData);
        break;
      case "tRNS":
        transparency = new Uint8Array(chunkData);
        break;
      case "IDAT":
        compressedChunks.push(new Uint8Array(chunkData));
        break;
      case "IEND":
        break;
    }

    offset += 12 + length;
  }

  // Decompress IDAT chunks
  const totalLength = compressedChunks.reduce((sum, c) => sum + c.length, 0);
  const compressed = new Uint8Array(totalLength);
  let pos = 0;
  for (const chunk of compressedChunks) {
    compressed.set(chunk, pos);
    pos += chunk.length;
  }

  const decompressed = inflate(compressed);

  // Decode filtered scanlines
  const bytesPerPixel = getBytesPerPixel(colorType);
  const scanlineBytes = width * bytesPerPixel + 1;
  const rawPixels = new Uint8Array(width * height * bytesPerPixel);

  for (let y = 0; y < height; y++) {
    const scanlineOffset = y * scanlineBytes;
    const filterType = decompressed[scanlineOffset]!;
    const scanline = decompressed.subarray(
      scanlineOffset + 1,
      scanlineOffset + 1 + width * bytesPerPixel
    );
    const prevScanline =
      y > 0 ? rawPixels.subarray((y - 1) * width * bytesPerPixel, y * width * bytesPerPixel) : null;
    const destOffset = y * width * bytesPerPixel;

    unfilterScanline(filterType, scanline, prevScanline, bytesPerPixel, rawPixels, destOffset);
  }

  // Convert to RGBA
  const rgba = new Uint8Array(width * height * 4);
  convertToRGBA(rawPixels, rgba, width, height, colorType, palette, transparency);

  return { width, height, data: rgba };
}

function getBytesPerPixel(colorType: number): number {
  switch (colorType) {
    case 0:
      return 1; // Grayscale
    case 2:
      return 3; // RGB
    case 3:
      return 1; // Indexed
    case 4:
      return 2; // Grayscale + Alpha
    case 6:
      return 4; // RGBA
    default:
      throw new Error(`Unsupported color type: ${colorType}`);
  }
}

function unfilterScanline(
  filterType: number,
  scanline: Uint8Array,
  prevScanline: Uint8Array | null,
  bytesPerPixel: number,
  dest: Uint8Array,
  destOffset: number
): void {
  const len = scanline.length;

  for (let i = 0; i < len; i++) {
    const x = scanline[i]!;
    const a = i >= bytesPerPixel ? dest[destOffset + i - bytesPerPixel]! : 0;
    const b = prevScanline ? prevScanline[i]! : 0;
    const c = prevScanline && i >= bytesPerPixel ? prevScanline[i - bytesPerPixel]! : 0;

    let value: number;
    switch (filterType) {
      case 0: // None
        value = x;
        break;
      case 1: // Sub
        value = (x + a) & 0xff;
        break;
      case 2: // Up
        value = (x + b) & 0xff;
        break;
      case 3: // Average
        value = (x + Math.floor((a + b) / 2)) & 0xff;
        break;
      case 4: // Paeth
        value = (x + paethPredictor(a, b, c)) & 0xff;
        break;
      default:
        throw new Error(`Unknown filter type: ${filterType}`);
    }

    dest[destOffset + i] = value;
  }
}

function paethPredictor(a: number, b: number, c: number): number {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

function convertToRGBA(
  raw: Uint8Array,
  rgba: Uint8Array,
  width: number,
  height: number,
  colorType: number,
  palette: Uint8Array | null,
  transparency: Uint8Array | null
): void {
  const pixels = width * height;

  switch (colorType) {
    case 0: // Grayscale
      for (let i = 0; i < pixels; i++) {
        const v = raw[i]!;
        const alpha =
          transparency && transparency.length >= 2
            ? transparency[0] === 0 && transparency[1] === v
              ? 0
              : 255
            : 255;
        rgba[i * 4] = v;
        rgba[i * 4 + 1] = v;
        rgba[i * 4 + 2] = v;
        rgba[i * 4 + 3] = alpha;
      }
      break;
    case 2: // RGB
      for (let i = 0; i < pixels; i++) {
        rgba[i * 4] = raw[i * 3]!;
        rgba[i * 4 + 1] = raw[i * 3 + 1]!;
        rgba[i * 4 + 2] = raw[i * 3 + 2]!;
        rgba[i * 4 + 3] = 255;
      }
      break;
    case 3: // Indexed
      if (!palette) throw new Error("Missing palette for indexed PNG");
      for (let i = 0; i < pixels; i++) {
        const idx = raw[i]!;
        rgba[i * 4] = palette[idx * 3]!;
        rgba[i * 4 + 1] = palette[idx * 3 + 1]!;
        rgba[i * 4 + 2] = palette[idx * 3 + 2]!;
        rgba[i * 4 + 3] = transparency && idx < transparency.length ? transparency[idx]! : 255;
      }
      break;
    case 4: // Grayscale + Alpha
      for (let i = 0; i < pixels; i++) {
        const v = raw[i * 2]!;
        rgba[i * 4] = v;
        rgba[i * 4 + 1] = v;
        rgba[i * 4 + 2] = v;
        rgba[i * 4 + 3] = raw[i * 2 + 1]!;
      }
      break;
    case 6: // RGBA
      rgba.set(raw);
      break;
  }
}

// ============ DEFLATE Decompression (zlib) ============

/**
 * Inflate (decompress) zlib-compressed data.
 * Minimal implementation for PNG IDAT chunks.
 */
function inflate(data: Uint8Array): Uint8Array {
  // Skip zlib header (2 bytes) and verify
  if (data.length < 2) throw new Error("Invalid zlib data");

  const cmf = data[0]!;
  const flg = data[1]!;

  if ((cmf & 0x0f) !== 8) throw new Error("Invalid compression method");
  if (((cmf << 8) | flg) % 31 !== 0) throw new Error("Invalid zlib header checksum");

  const hasDict = (flg & 0x20) !== 0;
  if (hasDict) throw new Error("Preset dictionary not supported");

  // Inflate the deflate stream
  return inflateRaw(data.subarray(2, data.length - 4));
}

/**
 * Inflate raw deflate data (no zlib wrapper).
 */
function inflateRaw(data: Uint8Array): Uint8Array {
  const reader = new BitReader(data);
  const output: number[] = [];

  let isFinal = false;
  while (!isFinal) {
    isFinal = reader.readBits(1) === 1;
    const blockType = reader.readBits(2);

    switch (blockType) {
      case 0: // Stored
        inflateStored(reader, output);
        break;
      case 1: // Fixed Huffman
        inflateFixed(reader, output);
        break;
      case 2: // Dynamic Huffman
        inflateDynamic(reader, output);
        break;
      default:
        throw new Error("Invalid block type");
    }
  }

  return new Uint8Array(output);
}

class BitReader {
  private data: Uint8Array;
  private pos = 0;
  private bitPos = 0;

  constructor(data: Uint8Array) {
    this.data = data;
  }

  readBits(n: number): number {
    let value = 0;
    for (let i = 0; i < n; i++) {
      if (this.pos >= this.data.length) throw new Error("Unexpected end of data");
      value |= ((this.data[this.pos]! >> this.bitPos) & 1) << i;
      this.bitPos++;
      if (this.bitPos === 8) {
        this.bitPos = 0;
        this.pos++;
      }
    }
    return value;
  }

  readByte(): number {
    this.alignToByte();
    if (this.pos >= this.data.length) throw new Error("Unexpected end of data");
    return this.data[this.pos++]!;
  }

  alignToByte(): void {
    if (this.bitPos !== 0) {
      this.bitPos = 0;
      this.pos++;
    }
  }

  readBytes(n: number): Uint8Array {
    this.alignToByte();
    const result = this.data.subarray(this.pos, this.pos + n);
    this.pos += n;
    return result;
  }
}

function inflateStored(reader: BitReader, output: number[]): void {
  reader.alignToByte();
  const len = reader.readByte() | (reader.readByte() << 8);
  reader.readByte();
  reader.readByte(); // nlen (complement, skip)

  const bytes = reader.readBytes(len);
  for (let i = 0; i < bytes.length; i++) {
    output.push(bytes[i]!);
  }
}

// Fixed Huffman tables
const FIXED_LITERAL_LENGTHS = new Uint8Array(288);
for (let i = 0; i <= 143; i++) FIXED_LITERAL_LENGTHS[i] = 8;
for (let i = 144; i <= 255; i++) FIXED_LITERAL_LENGTHS[i] = 9;
for (let i = 256; i <= 279; i++) FIXED_LITERAL_LENGTHS[i] = 7;
for (let i = 280; i <= 287; i++) FIXED_LITERAL_LENGTHS[i] = 8;

const FIXED_DISTANCE_LENGTHS = new Uint8Array(32).fill(5);

function inflateFixed(reader: BitReader, output: number[]): void {
  const litTree = buildHuffmanTree(FIXED_LITERAL_LENGTHS);
  const distTree = buildHuffmanTree(FIXED_DISTANCE_LENGTHS);
  inflateWithTrees(reader, output, litTree, distTree);
}

function inflateDynamic(reader: BitReader, output: number[]): void {
  const hlit = reader.readBits(5) + 257;
  const hdist = reader.readBits(5) + 1;
  const hclen = reader.readBits(4) + 4;

  const codeLengthOrder = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15];
  const codeLengths = new Uint8Array(19);
  for (let i = 0; i < hclen; i++) {
    codeLengths[codeLengthOrder[i]!] = reader.readBits(3);
  }

  const codeTree = buildHuffmanTree(codeLengths);
  const allLengths = new Uint8Array(hlit + hdist);

  let i = 0;
  while (i < allLengths.length) {
    const code = decodeSymbol(reader, codeTree);
    if (code < 16) {
      allLengths[i++] = code;
    } else if (code === 16) {
      const repeat = reader.readBits(2) + 3;
      const prev = allLengths[i - 1]!;
      for (let j = 0; j < repeat; j++) allLengths[i++] = prev;
    } else if (code === 17) {
      const repeat = reader.readBits(3) + 3;
      for (let j = 0; j < repeat; j++) allLengths[i++] = 0;
    } else if (code === 18) {
      const repeat = reader.readBits(7) + 11;
      for (let j = 0; j < repeat; j++) allLengths[i++] = 0;
    }
  }

  const litTree = buildHuffmanTree(allLengths.subarray(0, hlit));
  const distTree = buildHuffmanTree(allLengths.subarray(hlit));
  inflateWithTrees(reader, output, litTree, distTree);
}

interface HuffmanNode {
  value?: number;
  left?: HuffmanNode;
  right?: HuffmanNode;
}

function buildHuffmanTree(lengths: Uint8Array): HuffmanNode {
  const maxBits = Math.max(...lengths);
  const blCount = new Uint16Array(maxBits + 1);
  for (let i = 0; i < lengths.length; i++) {
    const len = lengths[i]!;
    if (len > 0) blCount[len]!++;
  }

  const nextCode = new Uint16Array(maxBits + 1);
  let code = 0;
  for (let bits = 1; bits <= maxBits; bits++) {
    code = (code + blCount[bits - 1]!) << 1;
    nextCode[bits] = code;
  }

  const root: HuffmanNode = {};
  for (let i = 0; i < lengths.length; i++) {
    const len = lengths[i]!;
    if (len === 0) continue;

    const codeVal = nextCode[len]!;
    nextCode[len] = codeVal + 1;

    let node = root;
    for (let bit = len - 1; bit >= 0; bit--) {
      const isRight = (codeVal >> bit) & 1;
      if (isRight) {
        if (!node.right) node.right = {};
        node = node.right;
      } else {
        if (!node.left) node.left = {};
        node = node.left;
      }
    }
    node.value = i;
  }

  return root;
}

function decodeSymbol(reader: BitReader, tree: HuffmanNode): number {
  let node = tree;
  while (node.value === undefined) {
    const bit = reader.readBits(1);
    node = bit ? node.right! : node.left!;
    if (!node) throw new Error("Invalid Huffman code");
  }
  return node.value;
}

const LENGTH_EXTRA_BITS = [
  0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0,
];
const LENGTH_BASE = [
  3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59, 67, 83, 99, 115, 131,
  163, 195, 227, 258,
];
const DISTANCE_EXTRA_BITS = [
  0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13,
];
const DISTANCE_BASE = [
  1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513, 769, 1025, 1537, 2049,
  3073, 4097, 6145, 8193, 12289, 16385, 24577,
];

function inflateWithTrees(
  reader: BitReader,
  output: number[],
  litTree: HuffmanNode,
  distTree: HuffmanNode
): void {
  while (true) {
    const lit = decodeSymbol(reader, litTree);

    if (lit < 256) {
      output.push(lit);
    } else if (lit === 256) {
      break;
    } else {
      const lengthCode = lit - 257;
      const length = LENGTH_BASE[lengthCode]! + reader.readBits(LENGTH_EXTRA_BITS[lengthCode]!);

      const distCode = decodeSymbol(reader, distTree);
      const distance = DISTANCE_BASE[distCode]! + reader.readBits(DISTANCE_EXTRA_BITS[distCode]!);

      const start = output.length - distance;
      for (let i = 0; i < length; i++) {
        output.push(output[start + i]!);
      }
    }
  }
}

// ============ JPEG Decoder ============

/**
 * Minimal baseline JPEG decoder that works without Web APIs.
 * Supports: Baseline DCT (SOF0), YCbCr color space, 4:4:4 and 4:2:0 subsampling
 * Does NOT support: Progressive JPEG, CMYK, arithmetic coding
 */
export function decodeJPEG(data: Uint8Array): DecodedImage {
  const jpeg = new JPEGDecoder(data);
  return jpeg.decode();
}

class JPEGDecoder {
  private data: Uint8Array;
  private pos = 0;
  private width = 0;
  private height = 0;
  private components: JPEGComponent[] = [];
  private quantTables: (Int32Array | null)[] = [null, null, null, null];
  private huffmanDC: (HuffmanTable | null)[] = [null, null, null, null];
  private huffmanAC: (HuffmanTable | null)[] = [null, null, null, null];
  private mcuWidth = 0;
  private mcuHeight = 0;
  private mcusPerRow = 0;
  private mcusPerCol = 0;
  private restartInterval = 0;

  constructor(data: Uint8Array) {
    this.data = data;
  }

  decode(): DecodedImage {
    this.parseMarkers();
    const imageData = this.decodeImageData();
    return { width: this.width, height: this.height, data: imageData };
  }

  private readUint8(): number {
    return this.data[this.pos++]!;
  }

  private readUint16(): number {
    const val = (this.data[this.pos]! << 8) | this.data[this.pos + 1]!;
    this.pos += 2;
    return val;
  }

  private parseMarkers(): void {
    if (this.readUint8() !== 0xff || this.readUint8() !== 0xd8) {
      throw new Error("Invalid JPEG: missing SOI marker");
    }

    while (this.pos < this.data.length) {
      if (this.readUint8() !== 0xff) continue;

      let marker = this.readUint8();
      while (marker === 0xff) marker = this.readUint8();

      if (marker === 0xd9) break; // EOI
      if (marker === 0xd8) continue; // SOI
      if (marker === 0x00) continue; // Stuffed byte

      if (marker >= 0xd0 && marker <= 0xd7) continue; // RST markers

      const length = this.readUint16() - 2;
      const segmentEnd = this.pos + length;

      switch (marker) {
        case 0xc0: // SOF0 - Baseline DCT
          this.parseSOF(segmentEnd);
          break;
        case 0xc4: // DHT - Define Huffman Table
          this.parseDHT(segmentEnd);
          break;
        case 0xdb: // DQT - Define Quantization Table
          this.parseDQT(segmentEnd);
          break;
        case 0xdd: // DRI - Define Restart Interval
          this.restartInterval = this.readUint16();
          break;
        case 0xda: // SOS - Start of Scan
          this.parseSOS();
          return; // Image data follows
        case 0xe0: // APP0 (JFIF)
        case 0xe1: // APP1 (EXIF)
        case 0xe2:
        case 0xfe: // COM
          this.pos = segmentEnd;
          break;
        default:
          this.pos = segmentEnd;
          break;
      }
    }
  }

  private parseSOF(end: number): void {
    const precision = this.readUint8();
    if (precision !== 8) throw new Error(`Unsupported bit depth: ${precision}`);

    this.height = this.readUint16();
    this.width = this.readUint16();
    const numComponents = this.readUint8();

    let maxH = 1,
      maxV = 1;
    this.components = [];

    for (let i = 0; i < numComponents; i++) {
      const id = this.readUint8();
      const sampling = this.readUint8();
      const h = sampling >> 4;
      const v = sampling & 0x0f;
      const qTableId = this.readUint8();

      maxH = Math.max(maxH, h);
      maxV = Math.max(maxV, v);

      this.components.push({ id, h, v, qTableId, dcPred: 0, blocks: [] });
    }

    this.mcuWidth = maxH * 8;
    this.mcuHeight = maxV * 8;
    this.mcusPerRow = Math.ceil(this.width / this.mcuWidth);
    this.mcusPerCol = Math.ceil(this.height / this.mcuHeight);

    for (const comp of this.components) {
      comp.blocksPerMcuH = comp.h;
      comp.blocksPerMcuV = comp.v;
    }

    this.pos = end;
  }

  private parseDQT(end: number): void {
    while (this.pos < end) {
      const info = this.readUint8();
      const precision = info >> 4;
      const tableId = info & 0x0f;

      const table = new Int32Array(64);
      if (precision === 0) {
        for (let i = 0; i < 64; i++) {
          table[ZIGZAG[i]!] = this.readUint8();
        }
      } else {
        for (let i = 0; i < 64; i++) {
          table[ZIGZAG[i]!] = this.readUint16();
        }
      }
      this.quantTables[tableId] = table;
    }
  }

  private parseDHT(end: number): void {
    while (this.pos < end) {
      const info = this.readUint8();
      const tableClass = info >> 4; // 0=DC, 1=AC
      const tableId = info & 0x0f;

      const codeLengths = new Uint8Array(16);
      let totalCodes = 0;
      for (let i = 0; i < 16; i++) {
        codeLengths[i] = this.readUint8();
        totalCodes += codeLengths[i]!;
      }

      const values = new Uint8Array(totalCodes);
      for (let i = 0; i < totalCodes; i++) {
        values[i] = this.readUint8();
      }

      const table = buildHuffmanTableJPEG(codeLengths, values);
      if (tableClass === 0) {
        this.huffmanDC[tableId] = table;
      } else {
        this.huffmanAC[tableId] = table;
      }
    }
  }

  private parseSOS(): void {
    const numComponents = this.readUint8();
    for (let i = 0; i < numComponents; i++) {
      const id = this.readUint8();
      const tables = this.readUint8();
      const comp = this.components.find((c) => c.id === id);
      if (comp) {
        comp.dcTableId = tables >> 4;
        comp.acTableId = tables & 0x0f;
      }
    }
    this.pos += 3; // Skip Ss, Se, Ah/Al
  }

  private decodeImageData(): Uint8Array {
    const reader = new JPEGBitReader(this.data, this.pos);
    const rgba = new Uint8Array(this.width * this.height * 4);

    const totalMcus = this.mcusPerRow * this.mcusPerCol;

    for (const comp of this.components) {
      const blocksH = comp.blocksPerMcuH ?? 1;
      const blocksV = comp.blocksPerMcuV ?? 1;
      comp.blocks = new Array(totalMcus * blocksH * blocksV);
      for (let i = 0; i < comp.blocks.length; i++) {
        comp.blocks[i] = new Int32Array(64);
      }
    }

    let mcusBeforeRestart = this.restartInterval;

    for (let mcuIdx = 0; mcuIdx < totalMcus; mcuIdx++) {
      if (this.restartInterval > 0 && mcusBeforeRestart === 0) {
        reader.skipToNextMarker();
        for (const comp of this.components) {
          comp.dcPred = 0;
        }
        mcusBeforeRestart = this.restartInterval;
      }

      for (const comp of this.components) {
        const blocksH = comp.blocksPerMcuH ?? 1;
        const blocksV = comp.blocksPerMcuV ?? 1;

        for (let v = 0; v < blocksV; v++) {
          for (let h = 0; h < blocksH; h++) {
            const blockIdx = mcuIdx * blocksH * blocksV + v * blocksH + h;
            this.decodeBlock(reader, comp, comp.blocks![blockIdx]!);
          }
        }
      }

      if (this.restartInterval > 0) {
        mcusBeforeRestart--;
      }
    }

    this.convertToRGBA(rgba);
    return rgba;
  }

  private decodeBlock(reader: JPEGBitReader, comp: JPEGComponent, block: Int32Array): void {
    const dcTable = this.huffmanDC[comp.dcTableId ?? 0]!;
    const acTable = this.huffmanAC[comp.acTableId ?? 0]!;
    const qTable = this.quantTables[comp.qTableId]!;

    block.fill(0);

    const dcLength = decodeHuffman(reader, dcTable);
    if (dcLength > 0) {
      const dcValue = reader.readBits(dcLength);
      comp.dcPred += extend(dcValue, dcLength);
    }
    block[0] = comp.dcPred * qTable[0]!;

    let k = 1;
    while (k < 64) {
      const symbol = decodeHuffman(reader, acTable);
      if (symbol === 0) break; // EOB

      const run = symbol >> 4;
      const size = symbol & 0x0f;

      k += run;
      if (k >= 64) break;

      if (size > 0) {
        const value = reader.readBits(size);
        block[ZIGZAG[k]!] = extend(value, size) * qTable[ZIGZAG[k]!]!;
      }
      k++;
    }

    idct(block);
  }

  private convertToRGBA(rgba: Uint8Array): void {
    const yComp = this.components[0]!;
    const cbComp = this.components.length > 1 ? this.components[1]! : null;
    const crComp = this.components.length > 2 ? this.components[2]! : null;

    for (let py = 0; py < this.height; py++) {
      for (let px = 0; px < this.width; px++) {
        const y = this.getSample(yComp, px, py);

        let r: number, g: number, b: number;
        if (cbComp && crComp) {
          const cb = this.getSample(cbComp, px, py) - 128;
          const cr = this.getSample(crComp, px, py) - 128;

          r = y + 1.402 * cr;
          g = y - 0.344136 * cb - 0.714136 * cr;
          b = y + 1.772 * cb;
        } else {
          r = g = b = y;
        }

        const idx = (py * this.width + px) * 4;
        rgba[idx] = clamp(Math.round(r), 0, 255);
        rgba[idx + 1] = clamp(Math.round(g), 0, 255);
        rgba[idx + 2] = clamp(Math.round(b), 0, 255);
        rgba[idx + 3] = 255;
      }
    }
  }

  private getSample(comp: JPEGComponent, px: number, py: number): number {
    const scaleX = (comp.h * 8 * this.mcusPerRow) / this.width;
    const scaleY = (comp.v * 8 * this.mcusPerCol) / this.height;

    const fx = px * scaleX;
    const fy = py * scaleY;

    const x0 = Math.floor(fx);
    const y0 = Math.floor(fy);
    const x1 = Math.min(x0 + 1, comp.h * 8 * this.mcusPerRow - 1);
    const y1 = Math.min(y0 + 1, comp.v * 8 * this.mcusPerCol - 1);

    const dx = fx - x0;
    const dy = fy - y0;

    const s00 = this.getBlockSample(comp, x0, y0);
    const s10 = this.getBlockSample(comp, x1, y0);
    const s01 = this.getBlockSample(comp, x0, y1);
    const s11 = this.getBlockSample(comp, x1, y1);

    const top = s00 + (s10 - s00) * dx;
    const bottom = s01 + (s11 - s01) * dx;
    return top + (bottom - top) * dy + 128;
  }

  private getBlockSample(comp: JPEGComponent, x: number, y: number): number {
    const blocksH = comp.blocksPerMcuH ?? 1;
    const blocksV = comp.blocksPerMcuV ?? 1;
    const compWidth = blocksH * 8;
    const compHeight = blocksV * 8;

    const mcuX = Math.floor(x / compWidth);
    const mcuY = Math.floor(y / compHeight);
    const mcuIdx = mcuY * this.mcusPerRow + mcuX;

    const localX = x % compWidth;
    const localY = y % compHeight;

    const blockH = Math.floor(localX / 8);
    const blockV = Math.floor(localY / 8);
    const blockIdx = mcuIdx * blocksH * blocksV + blockV * blocksH + blockH;

    const sampleX = localX % 8;
    const sampleY = localY % 8;

    if (blockIdx >= 0 && blockIdx < comp.blocks!.length) {
      return comp.blocks![blockIdx]![sampleY * 8 + sampleX]!;
    }
    return 0;
  }
}

interface JPEGComponent {
  id: number;
  h: number;
  v: number;
  qTableId: number;
  dcTableId?: number;
  acTableId?: number;
  dcPred: number;
  blocksPerMcuH?: number;
  blocksPerMcuV?: number;
  blocks?: Int32Array[];
}

interface HuffmanTable {
  maxCode: Int32Array;
  valPtr: Int32Array;
  values: Uint8Array;
  minCode: Int32Array;
}

const ZIGZAG = new Uint8Array([
  0, 1, 8, 16, 9, 2, 3, 10, 17, 24, 32, 25, 18, 11, 4, 5, 12, 19, 26, 33, 40, 48, 41, 34, 27, 20,
  13, 6, 7, 14, 21, 28, 35, 42, 49, 56, 57, 50, 43, 36, 29, 22, 15, 23, 30, 37, 44, 51, 58, 59, 52,
  45, 38, 31, 39, 46, 53, 60, 61, 54, 47, 55, 62, 63,
]);

function buildHuffmanTableJPEG(codeLengths: Uint8Array, values: Uint8Array): HuffmanTable {
  const maxCode = new Int32Array(17);
  const valPtr = new Int32Array(17);
  const minCode = new Int32Array(17);

  let code = 0;
  let valIdx = 0;

  for (let len = 1; len <= 16; len++) {
    valPtr[len] = valIdx;
    minCode[len] = code;

    const count = codeLengths[len - 1]!;
    if (count > 0) {
      maxCode[len] = code + count - 1;
      code += count;
      valIdx += count;
    } else {
      maxCode[len] = -1;
    }
    code <<= 1;
  }

  return { maxCode, valPtr, values, minCode };
}

function decodeHuffman(reader: JPEGBitReader, table: HuffmanTable): number {
  let code = 0;
  for (let len = 1; len <= 16; len++) {
    code = (code << 1) | reader.readBit();
    if (code <= table.maxCode[len]!) {
      const idx = table.valPtr[len]! + (code - table.minCode[len]!);
      return table.values[idx]!;
    }
  }
  throw new Error("Invalid Huffman code");
}

function extend(value: number, bits: number): number {
  const vt = 1 << (bits - 1);
  return value < vt ? value - (1 << bits) + 1 : value;
}

function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

class JPEGBitReader {
  private data: Uint8Array;
  private pos: number;
  private bitBuffer = 0;
  private bitsInBuffer = 0;

  constructor(data: Uint8Array, startPos: number) {
    this.data = data;
    this.pos = startPos;
  }

  readBit(): number {
    if (this.bitsInBuffer === 0) {
      this.fillBuffer();
    }
    this.bitsInBuffer--;
    return (this.bitBuffer >> this.bitsInBuffer) & 1;
  }

  readBits(n: number): number {
    let value = 0;
    for (let i = 0; i < n; i++) {
      value = (value << 1) | this.readBit();
    }
    return value;
  }

  skipToNextMarker(): void {
    this.bitsInBuffer = 0;
    while (this.pos < this.data.length - 1) {
      if (this.data[this.pos]! === 0xff && this.data[this.pos + 1]! !== 0x00) {
        this.pos += 2;
        return;
      }
      this.pos++;
    }
  }

  private fillBuffer(): void {
    if (this.pos >= this.data.length) {
      this.bitBuffer = 0;
      this.bitsInBuffer = 8;
      return;
    }
    let byte = this.data[this.pos++]!;
    if (byte === 0xff) {
      const next = this.pos < this.data.length ? this.data[this.pos++]! : 0;
      if (next !== 0x00) {
        this.pos -= 2;
        byte = 0;
      }
    }
    this.bitBuffer = byte;
    this.bitsInBuffer = 8;
  }
}

const C = new Float64Array(8);
for (let i = 0; i < 8; i++) {
  C[i] = i === 0 ? 1 / Math.sqrt(2) : 1;
}

const COS_TABLE = new Float64Array(64);
for (let u = 0; u < 8; u++) {
  for (let x = 0; x < 8; x++) {
    COS_TABLE[u * 8 + x] = Math.cos(((2 * x + 1) * u * Math.PI) / 16);
  }
}

function idct(block: Int32Array): void {
  const result = new Float64Array(64);

  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      let sum = 0;
      for (let v = 0; v < 8; v++) {
        for (let u = 0; u < 8; u++) {
          sum += C[u]! * C[v]! * block[v * 8 + u]! * COS_TABLE[u * 8 + x]! * COS_TABLE[v * 8 + y]!;
        }
      }
      result[y * 8 + x] = sum / 4;
    }
  }

  for (let i = 0; i < 64; i++) {
    block[i] = Math.round(result[i]!);
  }
}
