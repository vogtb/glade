/**
 * Rectangle rendering pipeline for Flash.
 *
 * Renders rounded rectangles with optional borders using instanced rendering.
 * Each rectangle is a quad (2 triangles) with instance data for position,
 * size, color, corner radius, and border.
 */

import { GPUBufferUsage } from "@glade/webgpu";
import type { RectPrimitive } from "./scene.ts";
import { PREMULTIPLIED_ALPHA_BLEND } from "./renderer.ts";

/**
 * WGSL shader for rectangle rendering with SDF-based rounded corners.
 */
const RECT_SHADER = /* wgsl */ `
struct Uniforms {
  viewport_size: vec2<f32>,
  scale: f32,
  _padding: f32,
}

struct RectInstance {
  @location(0) pos_size: vec4<f32>,       // x, y, width, height
  @location(1) color: vec4<f32>,           // rgba (premultiplied)
  @location(2) border_color: vec4<f32>,    // rgba (premultiplied)
  @location(3) corner_border: vec4<f32>,   // corner_radius, border_width, z_index, 0
}

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) local_pos: vec2<f32>,           // position relative to rect origin (in pixels)
  @location(1) @interpolate(flat) half_size: vec2<f32>,  // half of rect size (in pixels)
  @location(2) @interpolate(flat) color: vec4<f32>,
  @location(3) @interpolate(flat) border_color: vec4<f32>,
  @location(4) @interpolate(flat) corner_radius: f32,
  @location(5) @interpolate(flat) border_width: f32,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

// Quad vertices (two triangles)
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
  instance: RectInstance,
) -> VertexOutput {
  var out: VertexOutput;

  let quad_pos = QUAD_VERTICES[vertex_index];
  let rect_pos = instance.pos_size.xy;
  let rect_size = instance.pos_size.zw;

  // Calculate world position in logical coordinates
  let world_pos = rect_pos + quad_pos * rect_size;

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
  let z_depth = 1.0 - (instance.corner_border.z / 10000.0);

  out.position = vec4<f32>(clip_pos, z_depth, 1.0);
  // Pass position relative to rect center (not origin)
  // quad_pos goes 0->1, so (quad_pos - 0.5) goes -0.5->0.5
  // Multiply by rect_size and scale to get pixel offset from center in framebuffer coords
  out.local_pos = (quad_pos - vec2<f32>(0.5, 0.5)) * rect_size * uniforms.scale;
  out.half_size = rect_size * 0.5 * uniforms.scale;
  out.color = instance.color;
  out.border_color = instance.border_color;
  out.corner_radius = instance.corner_border.x * uniforms.scale;
  out.border_width = instance.corner_border.y * uniforms.scale;

  return out;
}

// GPUI-style quad SDF (from Zed's Metal shaders)
// p is the position relative to center
// half_size is half the rect dimensions
// corner_radius is the corner radius
fn quad_sdf(p: vec2<f32>, half_size: vec2<f32>, corner_radius: f32) -> f32 {
  // Vector from corner to point
  let corner_to_point = abs(p) - half_size;
  // Offset by corner radius to get distance from inset corner
  let corner_center_to_point = corner_to_point + vec2<f32>(corner_radius, corner_radius);

  // For sharp corners (radius == 0), just use max of corner distances
  if corner_radius == 0.0 {
    return max(corner_to_point.x, corner_to_point.y);
  }

  // Standard rounded box SDF
  // length for outside corners, max for inside
  let dist_to_inset = length(max(corner_center_to_point, vec2<f32>(0.0, 0.0))) +
                      min(max(corner_center_to_point.x, corner_center_to_point.y), 0.0);
  return dist_to_inset - corner_radius;
}

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
  // in.local_pos is position relative to rect center (from vertex shader)
  // in.half_size is half the rect size
  let half_size = in.half_size;

  // Clamp corner radius to max possible (for circles)
  let radius = min(in.corner_radius, min(half_size.x, half_size.y));

  // Compute SDF distance
  let dist = quad_sdf(in.local_pos, half_size, radius);

  // Multi-sample anti-aliasing: sample SDF at 4 points within the pixel
  // This gives much smoother edges than single-sample approaches
  let aa_offset = 0.35; // offset in pixels for subpixel sampling
  let d1 = quad_sdf(in.local_pos + vec2<f32>(-aa_offset, -aa_offset), half_size, radius);
  let d2 = quad_sdf(in.local_pos + vec2<f32>( aa_offset, -aa_offset), half_size, radius);
  let d3 = quad_sdf(in.local_pos + vec2<f32>(-aa_offset,  aa_offset), half_size, radius);
  let d4 = quad_sdf(in.local_pos + vec2<f32>( aa_offset,  aa_offset), half_size, radius);

  // Average the coverage from all 4 samples
  let alpha = (saturate(0.5 - d1) + saturate(0.5 - d2) + saturate(0.5 - d3) + saturate(0.5 - d4)) * 0.25;

  if alpha <= 0.0 {
    discard;
  }

  var final_color = in.color;

  // Border handling with multi-sample AA
  if in.border_width > 0.0 {
    let inner_half_size = half_size - vec2<f32>(in.border_width, in.border_width);
    let inner_radius = max(0.0, radius - in.border_width);
    let id1 = quad_sdf(in.local_pos + vec2<f32>(-aa_offset, -aa_offset), inner_half_size, inner_radius);
    let id2 = quad_sdf(in.local_pos + vec2<f32>( aa_offset, -aa_offset), inner_half_size, inner_radius);
    let id3 = quad_sdf(in.local_pos + vec2<f32>(-aa_offset,  aa_offset), inner_half_size, inner_radius);
    let id4 = quad_sdf(in.local_pos + vec2<f32>( aa_offset,  aa_offset), inner_half_size, inner_radius);
    let border_alpha = (saturate(0.5 + id1) + saturate(0.5 + id2) + saturate(0.5 + id3) + saturate(0.5 + id4)) * 0.25;
    final_color = mix(in.color, in.border_color, border_alpha);
  }

  return vec4<f32>(final_color.rgb, final_color.a * alpha);
}
`;

/**
 * Instance data layout: 16 floats per instance.
 */
const FLOATS_PER_INSTANCE = 16;
const BYTES_PER_INSTANCE = FLOATS_PER_INSTANCE * 4;

/**
 * Rectangle rendering pipeline.
 */
export class RectPipeline {
  private pipeline: GPURenderPipeline;
  private instanceBuffer: GPUBuffer;
  private instanceData: Float32Array;
  private maxInstances: number;

  constructor(
    private device: GPUDevice,
    format: GPUTextureFormat,
    uniformBindGroupLayout: GPUBindGroupLayout,
    maxInstances: number = 10000
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
      code: RECT_SHADER,
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
              { shaderLocation: 2, offset: 32, format: "float32x4" }, // border_color
              { shaderLocation: 3, offset: 48, format: "float32x4" }, // corner_border
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
   * Render rectangles.
   */
  render(pass: GPURenderPassEncoder, rects: RectPrimitive[], uniformBindGroup: GPUBindGroup): void {
    if (rects.length === 0) return;

    const count = Math.min(rects.length, this.maxInstances);

    // Fill instance data
    for (let i = 0; i < count; i++) {
      const rect = rects[i]!;
      const offset = i * FLOATS_PER_INSTANCE;

      // pos_size
      this.instanceData[offset + 0] = rect.x;
      this.instanceData[offset + 1] = rect.y;
      this.instanceData[offset + 2] = rect.width;
      this.instanceData[offset + 3] = rect.height;

      // color (premultiply alpha)
      const a = rect.color.a;
      this.instanceData[offset + 4] = rect.color.r * a;
      this.instanceData[offset + 5] = rect.color.g * a;
      this.instanceData[offset + 6] = rect.color.b * a;
      this.instanceData[offset + 7] = a;

      // border_color (premultiply alpha)
      const ba = rect.borderColor.a;
      this.instanceData[offset + 8] = rect.borderColor.r * ba;
      this.instanceData[offset + 9] = rect.borderColor.g * ba;
      this.instanceData[offset + 10] = rect.borderColor.b * ba;
      this.instanceData[offset + 11] = ba;

      // corner_border (corner_radius, border_width, z_index, 0)
      this.instanceData[offset + 12] = rect.cornerRadius;
      this.instanceData[offset + 13] = rect.borderWidth;
      this.instanceData[offset + 14] = i; // z_index = instance order (later = on top)
      this.instanceData[offset + 15] = 0;
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
