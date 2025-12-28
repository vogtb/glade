/**
 * Host texture rendering pipeline for Flash.
 *
 * Renders textures from WebGPU hosts (custom rendering) into the Flash UI.
 * Unlike ImagePipeline which uses an atlas, this pipeline binds individual
 * textures and caches bind groups per unique texture view.
 */

import { GPUBufferUsage, GPUShaderStage } from "@glade/core/webgpu";
import type { HostTexturePrimitive } from "./scene.ts";
import { PREMULTIPLIED_ALPHA_BLEND } from "./renderer.ts";

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

  let z_depth = 1.0 - (instance.params.z / 10000.0);
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
 * Cached bind group for a texture view.
 */
interface TextureBindGroupEntry {
  textureView: GPUTextureView;
  bindGroup: GPUBindGroup;
}

/**
 * Host texture rendering pipeline.
 *
 * Unlike ImagePipeline which uses an atlas, this pipeline renders
 * individual textures from WebGPU hosts. It caches bind groups per
 * unique texture view to avoid recreation each frame.
 */
export class HostTexturePipeline {
  private pipeline: GPURenderPipeline;
  private instanceBuffer: GPUBuffer;
  private instanceData: Float32Array;
  private maxInstances: number;
  private bindGroupLayout: GPUBindGroupLayout;
  private sampler: GPUSampler;
  private uniformBuffer: GPUBuffer | null = null;

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
   * Render host texture primitives.
   * Groups primitives by texture view for efficient rendering.
   */
  render(pass: GPURenderPassEncoder, hostTextures: HostTexturePrimitive[]): void {
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

      const count = Math.min(primitives.length, this.maxInstances);

      for (let i = 0; i < count; i++) {
        const ht = primitives[i]!;
        const offset = i * FLOATS_PER_INSTANCE;

        // pos_size
        this.instanceData[offset + 0] = ht.x;
        this.instanceData[offset + 1] = ht.y;
        this.instanceData[offset + 2] = ht.width;
        this.instanceData[offset + 3] = ht.height;

        // params
        this.instanceData[offset + 4] = ht.cornerRadius;
        this.instanceData[offset + 5] = ht.opacity;
        this.instanceData[offset + 6] = ht.order ?? i;
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

      this.device.queue.writeBuffer(
        this.instanceBuffer,
        0,
        this.instanceData,
        0,
        count * FLOATS_PER_INSTANCE
      );

      pass.setBindGroup(0, bindGroup);
      pass.setVertexBuffer(0, this.instanceBuffer);
      pass.draw(6, count);
    }
  }

  /**
   * Destroy the pipeline and release resources.
   */
  destroy(): void {
    this.instanceBuffer.destroy();
    this.bindGroupCache.clear();
  }
}
