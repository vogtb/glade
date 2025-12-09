/**
 * Shadow rendering pipeline for Flash.
 *
 * Renders soft shadows using Gaussian blur approximation via SDF.
 * Shadows are rendered before rectangles so they appear behind content.
 */

import { GPUBufferUsage } from "@glade/core/webgpu";
import type { ShadowPrimitive } from "./scene.ts";
import { PREMULTIPLIED_ALPHA_BLEND } from "./renderer.ts";

/**
 * WGSL shader for shadow rendering with Gaussian blur approximation.
 */
const SHADOW_SHADER = /* wgsl */ `
struct Uniforms {
  viewport_size: vec2<f32>,
  scale: f32,
  _padding: f32,
}

struct ShadowInstance {
  @location(0) pos_size: vec4<f32>,       // x, y, width, height (after offset)
  @location(1) color: vec4<f32>,           // rgba (premultiplied)
  @location(2) params: vec4<f32>,          // corner_radius, blur, z_index, 0
  @location(3) clip_bounds: vec4<f32>,     // clip_x, clip_y, clip_width, clip_height
  @location(4) clip_params: vec4<f32>,     // clip_corner_radius, has_clip, 0, 0
  @location(5) transform_ab: vec4<f32>,    // a, b, tx, has_transform
  @location(6) transform_cd: vec4<f32>,    // c, d, ty, 0
}

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) local_pos: vec2<f32>,
  @location(1) rect_size: vec2<f32>,
  @location(2) color: vec4<f32>,
  @location(3) corner_radius: f32,
  @location(4) blur: f32,
  @location(5) @interpolate(flat) clip_bounds: vec4<f32>,
  @location(6) @interpolate(flat) clip_corner_radius: f32,
  @location(7) @interpolate(flat) has_clip: f32,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

// Quad vertices (two triangles) - expanded to include blur spread
var<private> QUAD_VERTICES: array<vec2<f32>, 6> = array<vec2<f32>, 6>(
  vec2<f32>(0.0, 0.0),
  vec2<f32>(1.0, 0.0),
  vec2<f32>(0.0, 1.0),
  vec2<f32>(1.0, 0.0),
  vec2<f32>(1.0, 1.0),
  vec2<f32>(0.0, 1.0),
);

// Apply 2D affine transform to a point
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
  instance: ShadowInstance,
) -> VertexOutput {
  var out: VertexOutput;

  let quad_pos = QUAD_VERTICES[vertex_index];
  let blur = instance.params.y;
  let has_transform = instance.transform_ab.w > 0.5;

  // Expand the quad to include blur spread (3x blur for smooth falloff)
  let spread = blur * 3.0;
  let expanded_pos = instance.pos_size.xy - vec2<f32>(spread);
  let expanded_size = instance.pos_size.zw + vec2<f32>(spread * 2.0);

  // Calculate world position in logical coordinates
  var world_pos = expanded_pos + quad_pos * expanded_size;

  // Apply transform if present
  if has_transform {
    world_pos = apply_transform(world_pos, instance.transform_ab, instance.transform_cd);
  }

  // Scale from logical to framebuffer coordinates using DPR (scale factor)
  let scaled_pos = world_pos * uniforms.scale;

  // Convert to clip space (-1 to 1)
  // viewport_size is now framebuffer size
  let clip_pos = vec2<f32>(
    (scaled_pos.x / uniforms.viewport_size.x) * 2.0 - 1.0,
    1.0 - (scaled_pos.y / uniforms.viewport_size.y) * 2.0
  );

  // Use z_index for depth ordering (higher z_index = closer to camera = smaller depth value)
  // Normalize z_index to 0-1 range (assuming max 10000 instances)
  let z_depth = 1.0 - (instance.params.z / 10000.0);

  out.position = vec4<f32>(clip_pos, z_depth, 1.0);
  // Local position relative to original rect (can be negative due to spread)
  // Scale to framebuffer coordinates for proper SDF calculations
  out.local_pos = (quad_pos * expanded_size - vec2<f32>(spread)) * uniforms.scale;
  out.rect_size = instance.pos_size.zw * uniforms.scale;
  out.color = instance.color;
  out.corner_radius = instance.params.x * uniforms.scale;
  out.blur = blur * uniforms.scale;

  // Pass clip bounds scaled to framebuffer coordinates
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

// Signed distance function for rounded rectangle
fn sdf_rounded_rect(pos: vec2<f32>, size: vec2<f32>, radius: f32) -> f32 {
  let half_size = size * 0.5;
  let center_pos = pos - half_size;
  let q = abs(center_pos) - half_size + vec2<f32>(radius);
  return min(max(q.x, q.y), 0.0) + length(max(q, vec2<f32>(0.0))) - radius;
}

// Approximate Gaussian using erf
fn erf_approx(x: f32) -> f32 {
  // Approximation of error function
  let a1 = 0.254829592;
  let a2 = -0.284496736;
  let a3 = 1.421413741;
  let a4 = -1.453152027;
  let a5 = 1.061405429;
  let p = 0.3275911;

  let sign_x = sign(x);
  let abs_x = abs(x);
  let t = 1.0 / (1.0 + p * abs_x);
  let y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * exp(-abs_x * abs_x);

  return sign_x * y;
}

// Gaussian blur for shadow using SDF
fn shadow_alpha(dist: f32, blur: f32) -> f32 {
  if blur <= 0.0 {
    return select(0.0, 1.0, dist <= 0.0);
  }

  // Use erf for Gaussian integration
  let sigma = blur / 2.0;
  return 0.5 - 0.5 * erf_approx(dist / (sigma * sqrt(2.0)));
}

// SDF for clip region (used for rounded clip bounds)
fn clip_sdf(pos: vec2<f32>, clip_bounds: vec4<f32>, corner_radius: f32) -> f32 {
  let clip_origin = clip_bounds.xy;
  let clip_size = clip_bounds.zw;
  let clip_half_size = clip_size * 0.5;
  let clip_center = clip_origin + clip_half_size;
  let local_pos = pos - clip_center;
  let q = abs(local_pos) - clip_half_size + vec2<f32>(corner_radius);
  return min(max(q.x, q.y), 0.0) + length(max(q, vec2<f32>(0.0))) - corner_radius;
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

  let radius = min(in.corner_radius, min(in.rect_size.x, in.rect_size.y) * 0.5);
  let dist = sdf_rounded_rect(in.local_pos, in.rect_size, radius);

  let alpha = shadow_alpha(dist, in.blur);

  if alpha <= 0.001 {
    discard;
  }

  return vec4<f32>(in.color.rgb, in.color.a * alpha);
}
`;

/**
 * Instance data layout: 28 floats per instance.
 * - pos_size: 4 floats (x, y, width, height)
 * - color: 4 floats (r, g, b, a)
 * - params: 4 floats (corner_radius, blur, z_index, 0)
 * - clip_bounds: 4 floats (x, y, width, height)
 * - clip_params: 4 floats (corner_radius, has_clip, 0, 0)
 * - transform_ab: 4 floats (a, b, tx, has_transform)
 * - transform_cd: 4 floats (c, d, ty, 0)
 */
const FLOATS_PER_INSTANCE = 28;
const BYTES_PER_INSTANCE = FLOATS_PER_INSTANCE * 4;

/**
 * Shadow rendering pipeline.
 */
export class ShadowPipeline {
  private pipeline: GPURenderPipeline;
  private instanceBuffer: GPUBuffer;
  private instanceData: Float32Array;
  private maxInstances: number;

  constructor(
    private device: GPUDevice,
    format: GPUTextureFormat,
    uniformBindGroupLayout: GPUBindGroupLayout,
    maxInstances: number = 1000
  ) {
    this.maxInstances = maxInstances;
    this.instanceData = new Float32Array(maxInstances * FLOATS_PER_INSTANCE);

    // Create instance buffer
    this.instanceBuffer = device.createBuffer({
      size: this.instanceData.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });

    // Create shader module
    const shaderModule = device.createShaderModule({
      code: SHADOW_SHADER,
    });

    // Create pipeline layout
    const pipelineLayout = device.createPipelineLayout({
      bindGroupLayouts: [uniformBindGroupLayout],
    });

    // Create render pipeline
    this.pipeline = device.createRenderPipeline({
      layout: pipelineLayout,
      vertex: {
        module: shaderModule,
        entryPoint: "vs_main",
        buffers: [
          {
            // Instance buffer
            arrayStride: BYTES_PER_INSTANCE,
            stepMode: "instance",
            attributes: [
              { shaderLocation: 0, offset: 0, format: "float32x4" }, // pos_size
              { shaderLocation: 1, offset: 16, format: "float32x4" }, // color
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
   * Render shadows.
   */
  render(
    pass: GPURenderPassEncoder,
    shadows: ShadowPrimitive[],
    uniformBindGroup: GPUBindGroup
  ): void {
    if (shadows.length === 0) return;

    const count = Math.min(shadows.length, this.maxInstances);

    // Fill instance data
    for (let i = 0; i < count; i++) {
      const shadow = shadows[i]!;
      const offset = i * FLOATS_PER_INSTANCE;

      // pos_size (apply shadow offset)
      this.instanceData[offset + 0] = shadow.x + shadow.offsetX;
      this.instanceData[offset + 1] = shadow.y + shadow.offsetY;
      this.instanceData[offset + 2] = shadow.width;
      this.instanceData[offset + 3] = shadow.height;

      // color (premultiply alpha)
      const a = shadow.color.a;
      this.instanceData[offset + 4] = shadow.color.r * a;
      this.instanceData[offset + 5] = shadow.color.g * a;
      this.instanceData[offset + 6] = shadow.color.b * a;
      this.instanceData[offset + 7] = a;

      // params (corner_radius, blur, z_index, 0)
      this.instanceData[offset + 8] = shadow.cornerRadius;
      this.instanceData[offset + 9] = shadow.blur;
      this.instanceData[offset + 10] = shadow.order ?? i; // z_index from global draw order
      this.instanceData[offset + 11] = 0;

      // clip_bounds (x, y, width, height)
      const clip = shadow.clipBounds;
      this.instanceData[offset + 12] = clip?.x ?? 0;
      this.instanceData[offset + 13] = clip?.y ?? 0;
      this.instanceData[offset + 14] = clip?.width ?? 0;
      this.instanceData[offset + 15] = clip?.height ?? 0;

      // clip_params (corner_radius, has_clip, 0, 0)
      this.instanceData[offset + 16] = clip?.cornerRadius ?? 0;
      this.instanceData[offset + 17] = clip ? 1.0 : 0.0;
      this.instanceData[offset + 18] = 0;
      this.instanceData[offset + 19] = 0;

      // transform_ab (a, b, tx, has_transform)
      const transform = shadow.transform;
      this.instanceData[offset + 20] = transform?.a ?? 1;
      this.instanceData[offset + 21] = transform?.b ?? 0;
      this.instanceData[offset + 22] = transform?.tx ?? 0;
      this.instanceData[offset + 23] = transform ? 1.0 : 0.0;

      // transform_cd (c, d, ty, 0)
      this.instanceData[offset + 24] = transform?.c ?? 0;
      this.instanceData[offset + 25] = transform?.d ?? 1;
      this.instanceData[offset + 26] = transform?.ty ?? 0;
      this.instanceData[offset + 27] = 0;
    }

    // Upload instance data
    this.device.queue.writeBuffer(
      this.instanceBuffer,
      0,
      this.instanceData,
      0,
      count * FLOATS_PER_INSTANCE
    );

    // Draw
    pass.setPipeline(this.pipeline);
    pass.setBindGroup(0, uniformBindGroup);
    pass.setVertexBuffer(0, this.instanceBuffer);
    pass.draw(6, count); // 6 vertices per quad, `count` instances
  }

  /**
   * Destroy the pipeline and release resources.
   */
  destroy(): void {
    this.instanceBuffer.destroy();
  }
}
