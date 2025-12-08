/**
 * Shadow rendering pipeline for Flash.
 *
 * Renders soft shadows using Gaussian blur approximation via SDF.
 * Shadows are rendered before rectangles so they appear behind content.
 */

import { GPUBufferUsage } from "@glade/webgpu";
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
}

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) local_pos: vec2<f32>,
  @location(1) rect_size: vec2<f32>,
  @location(2) color: vec4<f32>,
  @location(3) corner_radius: f32,
  @location(4) blur: f32,
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

@vertex
fn vs_main(
  @builtin(vertex_index) vertex_index: u32,
  instance: ShadowInstance,
) -> VertexOutput {
  var out: VertexOutput;

  let quad_pos = QUAD_VERTICES[vertex_index];
  let blur = instance.params.y;

  // Expand the quad to include blur spread (3x blur for smooth falloff)
  let spread = blur * 3.0;
  let expanded_pos = instance.pos_size.xy - vec2<f32>(spread);
  let expanded_size = instance.pos_size.zw + vec2<f32>(spread * 2.0);

  // Calculate world position in logical coordinates
  let world_pos = expanded_pos + quad_pos * expanded_size;

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

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
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
 * Instance data layout: 12 floats per instance.
 */
const FLOATS_PER_INSTANCE = 12;
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
      this.instanceData[offset + 10] = i; // z_index = instance order (later = on top)
      this.instanceData[offset + 11] = 0;
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
