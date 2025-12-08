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
  @location(4) clip_bounds: vec4<f32>,     // clip_x, clip_y, clip_width, clip_height
  @location(5) clip_params: vec4<f32>,     // clip_corner_radius, has_clip, 0, 0
}

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) @interpolate(flat) rect_origin: vec2<f32>,  // rect origin in framebuffer coords
  @location(1) @interpolate(flat) half_size: vec2<f32>,    // half of rect size (in pixels)
  @location(2) @interpolate(flat) color: vec4<f32>,
  @location(3) @interpolate(flat) border_color: vec4<f32>,
  @location(4) @interpolate(flat) corner_radius: f32,
  @location(5) @interpolate(flat) border_width: f32,
  @location(6) @interpolate(flat) clip_bounds: vec4<f32>,  // in framebuffer coords
  @location(7) @interpolate(flat) clip_corner_radius: f32,
  @location(8) @interpolate(flat) has_clip: f32,
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
  let corner_radius = instance.corner_border.x;

  // Calculate world position in logical coordinates (no expansion)
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
  // Pass the original rect origin (not expanded) in framebuffer coords
  out.rect_origin = rect_pos * uniforms.scale;
  out.half_size = rect_size * 0.5 * uniforms.scale;
  out.color = instance.color;
  out.border_color = instance.border_color;
  out.corner_radius = corner_radius * uniforms.scale;
  out.border_width = instance.corner_border.y * uniforms.scale;

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

// SDF for rounded rectangles (Zed/GPUI style)
// p is the position relative to center
// half_size is half the rect dimensions
// corner_radius is the corner radius (clamped by caller)
fn quad_sdf(p: vec2<f32>, half_size: vec2<f32>, corner_radius: f32) -> f32 {
  // Vector from quad edge to point (in positive quadrant)
  let corner_to_point = abs(p) - half_size;

  // Offset inward by corner radius to find distance from rounded corner center
  let q = corner_to_point + vec2<f32>(corner_radius, corner_radius);

  // For sharp corners (radius == 0), just use max (box SDF)
  if corner_radius == 0.0 {
    return max(corner_to_point.x, corner_to_point.y);
  }

  // Rounded box SDF:
  // - length(max(q, 0)) handles the outside corner (circular part)
  // - min(max(q.x, q.y), 0) handles the inside (flat edges)
  // - subtract corner_radius to get actual distance to the rounded edge
  return length(max(q, vec2<f32>(0.0, 0.0))) + min(max(q.x, q.y), 0.0) - corner_radius;
}

// SDF for clip region (used for rounded clip bounds)
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

  // Compute local position from fragment screen position (like Zed/GPUI)
  // in.position.xy is the fragment's screen position in framebuffer coords
  let point = in.position.xy - in.rect_origin;
  let half_size = in.half_size;
  let local_pos = point - half_size;  // position relative to rect center

  // Clamp corner radius to max possible (for circles)
  let radius = min(in.corner_radius, min(half_size.x, half_size.y));

  // For circles/pills (where radius >= min half_size), inset slightly so edges
  // fall inside the quad bounds for AA at cardinal points
  let min_half = min(half_size.x, half_size.y);
  let is_circle = radius >= min_half - 0.5;
  let aa_inset = select(0.0, 0.5, is_circle);
  let sdf_half_size = half_size - aa_inset;
  let sdf_radius = max(0.0, radius - aa_inset);

  // Compute SDF distance
  let dist = quad_sdf(local_pos, sdf_half_size, sdf_radius);

  // Anti-aliasing using smoothstep for smooth edges
  let alpha = 1.0 - smoothstep(-0.5, 0.5, dist);

  if alpha <= 0.0 {
    discard;
  }

  var final_color = in.color;

  // Border handling
  if in.border_width > 0.0 {
    let inner_half_size = sdf_half_size - vec2<f32>(in.border_width, in.border_width);
    let inner_radius = max(0.0, sdf_radius - in.border_width);
    let inner_dist = quad_sdf(local_pos, inner_half_size, inner_radius);
    let border_alpha = smoothstep(-0.5, 0.5, inner_dist);
    final_color = mix(in.color, in.border_color, border_alpha);
  }

  return final_color * alpha;
}
`;

/**
 * Instance data layout: 24 floats per instance.
 * - pos_size: 4 floats (x, y, width, height)
 * - color: 4 floats (r, g, b, a)
 * - border_color: 4 floats (r, g, b, a)
 * - corner_border: 4 floats (corner_radius, border_width, z_index, 0)
 * - clip_bounds: 4 floats (x, y, width, height)
 * - clip_params: 4 floats (corner_radius, has_clip, 0, 0)
 */
const FLOATS_PER_INSTANCE = 24;
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
              { shaderLocation: 4, offset: 64, format: "float32x4" }, // clip_bounds
              { shaderLocation: 5, offset: 80, format: "float32x4" }, // clip_params
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

      // Debug: log circles (where cornerRadius is very large)
      if (rect.cornerRadius > 100 && rect.width === rect.height) {
        const debugState = this.render as unknown as { loggedCircle?: boolean };
        if (!debugState.loggedCircle) {
          debugState.loggedCircle = true;
          console.log(
            `RectPipeline circle: ${rect.width}x${rect.height}, cornerRadius=${rect.cornerRadius}`
          );
        }
      }

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

      // clip_bounds (x, y, width, height)
      const clip = rect.clipBounds;
      this.instanceData[offset + 16] = clip?.x ?? 0;
      this.instanceData[offset + 17] = clip?.y ?? 0;
      this.instanceData[offset + 18] = clip?.width ?? 0;
      this.instanceData[offset + 19] = clip?.height ?? 0;

      // clip_params (corner_radius, has_clip, 0, 0)
      this.instanceData[offset + 20] = clip?.cornerRadius ?? 0;
      this.instanceData[offset + 21] = clip ? 1.0 : 0.0;
      this.instanceData[offset + 22] = 0;
      this.instanceData[offset + 23] = 0;
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
