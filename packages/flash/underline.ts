/**
 * Underline rendering pipeline for Flash.
 *
 * Renders text underlines with support for solid and wavy (spell-check) styles.
 * Uses instanced rendering for efficient batch processing.
 */

import { GPUBufferUsage } from "@glade/webgpu";
import type { UnderlinePrimitive } from "./scene.ts";
import { PREMULTIPLIED_ALPHA_BLEND } from "./renderer.ts";

/**
 * WGSL shader for underline rendering with solid and wavy styles.
 */
const UNDERLINE_SHADER = /* wgsl */ `
struct Uniforms {
  viewport_size: vec2<f32>,
  scale: f32,
  _padding: f32,
}

struct UnderlineInstance {
  @location(0) pos_size: vec4<f32>,       // x, y, width, thickness
  @location(1) color: vec4<f32>,           // rgba (premultiplied)
  @location(2) wave_params: vec4<f32>,     // wavelength, amplitude, is_wavy, z_index
  @location(3) clip_bounds: vec4<f32>,     // clip_x, clip_y, clip_width, clip_height
  @location(4) clip_params: vec4<f32>,     // clip_corner_radius, has_clip, 0, 0
  @location(5) transform_ab: vec4<f32>,    // a, b, tx, has_transform
  @location(6) transform_cd: vec4<f32>,    // c, d, ty, 0
}

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) local_pos: vec2<f32>,       // position relative to underline start
  @location(1) @interpolate(flat) underline_size: vec2<f32>, // width, thickness
  @location(2) @interpolate(flat) color: vec4<f32>,
  @location(3) @interpolate(flat) wave_params: vec2<f32>,  // wavelength, amplitude
  @location(4) @interpolate(flat) is_wavy: f32,
  @location(5) @interpolate(flat) clip_bounds: vec4<f32>,
  @location(6) @interpolate(flat) clip_corner_radius: f32,
  @location(7) @interpolate(flat) has_clip: f32,
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
  instance: UnderlineInstance,
) -> VertexOutput {
  var out: VertexOutput;

  let quad_pos = QUAD_VERTICES[vertex_index];
  let underline_pos = instance.pos_size.xy;
  let underline_size = instance.pos_size.zw; // width, thickness
  let is_wavy = instance.wave_params.z > 0.5;
  let amplitude = instance.wave_params.y;
  let has_transform = instance.transform_ab.w > 0.5;

  // For wavy underlines, expand vertically to accommodate the wave
  var expanded_size = underline_size;
  var expanded_pos = underline_pos;
  if is_wavy {
    // Expand to include wave amplitude above and below
    expanded_size.y = underline_size.y + amplitude * 2.0;
    expanded_pos.y = underline_pos.y - amplitude;
  }

  // Calculate world position
  var world_pos = expanded_pos + quad_pos * expanded_size;

  // Apply transform if present
  if has_transform {
    world_pos = apply_transform(world_pos, instance.transform_ab, instance.transform_cd);
  }

  // Scale to framebuffer coordinates
  let scaled_pos = world_pos * uniforms.scale;

  // Convert to clip space
  let clip_pos = vec2<f32>(
    (scaled_pos.x / uniforms.viewport_size.x) * 2.0 - 1.0,
    1.0 - (scaled_pos.y / uniforms.viewport_size.y) * 2.0
  );

  // Use a smaller z_depth (closer to camera) than rects to ensure underlines are visible
  // Rects use z_depth = 1.0 - (z_index / 10000.0), so we use a baseline of 0.4
  let z_depth = 0.4 - (instance.wave_params.w / 10000.0);

  out.position = vec4<f32>(clip_pos, z_depth, 1.0);
  
  // Local position for fragment shader calculations
  out.local_pos = (quad_pos * expanded_size) * uniforms.scale;
  out.underline_size = underline_size * uniforms.scale;
  out.color = instance.color;
  out.wave_params = instance.wave_params.xy * uniforms.scale;
  out.is_wavy = instance.wave_params.z;

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

// SDF for clip region
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

  let width = in.underline_size.x;
  let thickness = in.underline_size.y;
  let wavelength = in.wave_params.x;
  let amplitude = in.wave_params.y;

  if in.is_wavy > 0.5 {
    // Wavy underline (spell-check style)
    let x = in.local_pos.x;
    let y = in.local_pos.y;
    
    // Center of the wave (middle of expanded region)
    let wave_center_y = amplitude + thickness * 0.5;
    
    // Calculate wave offset at this x position
    let wave_offset = sin(x * 6.28318 / wavelength) * amplitude;
    
    // Distance from fragment to the wave center line
    let wave_y = wave_center_y + wave_offset;
    let dist_to_wave = abs(y - wave_y);
    
    // Anti-aliased thickness
    let half_thickness = thickness * 0.5;
    let alpha = 1.0 - smoothstep(half_thickness - 0.5, half_thickness + 0.5, dist_to_wave);
    
    if alpha <= 0.0 {
      discard;
    }
    
    return in.color * alpha;
  } else {
    // Solid underline - simple rectangle with anti-aliased edges
    let x = in.local_pos.x;
    let y = in.local_pos.y;
    
    // Anti-alias horizontal edges
    let alpha_left = smoothstep(-0.5, 0.5, x);
    let alpha_right = 1.0 - smoothstep(width - 0.5, width + 0.5, x);
    
    // Anti-alias vertical edges
    let alpha_top = smoothstep(-0.5, 0.5, y);
    let alpha_bottom = 1.0 - smoothstep(thickness - 0.5, thickness + 0.5, y);
    
    let alpha = alpha_left * alpha_right * alpha_top * alpha_bottom;
    
    if alpha <= 0.0 {
      discard;
    }
    
    return in.color * alpha;
  }
}
`;

/**
 * Instance data layout: 28 floats per instance.
 * - pos_size: 4 floats (x, y, width, thickness)
 * - color: 4 floats (r, g, b, a)
 * - wave_params: 4 floats (wavelength, amplitude, is_wavy, z_index)
 * - clip_bounds: 4 floats (x, y, width, height)
 * - clip_params: 4 floats (corner_radius, has_clip, 0, 0)
 * - transform_ab: 4 floats (a, b, tx, has_transform)
 * - transform_cd: 4 floats (c, d, ty, 0)
 */
const FLOATS_PER_INSTANCE = 28;
const BYTES_PER_INSTANCE = FLOATS_PER_INSTANCE * 4;

/**
 * Default wave parameters for wavy underlines.
 */
const DEFAULT_WAVELENGTH = 4;
const DEFAULT_AMPLITUDE = 1;

/**
 * Underline rendering pipeline.
 */
export class UnderlinePipeline {
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

    this.instanceBuffer = device.createBuffer({
      size: this.instanceData.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });

    const shaderModule = device.createShaderModule({
      code: UNDERLINE_SHADER,
    });

    const pipelineLayout = device.createPipelineLayout({
      bindGroupLayouts: [uniformBindGroupLayout],
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
              { shaderLocation: 1, offset: 16, format: "float32x4" }, // color
              { shaderLocation: 2, offset: 32, format: "float32x4" }, // wave_params
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
   * Render underlines.
   */
  render(
    pass: GPURenderPassEncoder,
    underlines: UnderlinePrimitive[],
    uniformBindGroup: GPUBindGroup
  ): void {
    if (underlines.length === 0) return;

    const count = Math.min(underlines.length, this.maxInstances);

    for (let i = 0; i < count; i++) {
      const underline = underlines[i]!;
      const offset = i * FLOATS_PER_INSTANCE;

      // pos_size
      this.instanceData[offset + 0] = underline.x;
      this.instanceData[offset + 1] = underline.y;
      this.instanceData[offset + 2] = underline.width;
      this.instanceData[offset + 3] = underline.thickness;

      // color (premultiply alpha)
      const a = underline.color.a;
      this.instanceData[offset + 4] = underline.color.r * a;
      this.instanceData[offset + 5] = underline.color.g * a;
      this.instanceData[offset + 6] = underline.color.b * a;
      this.instanceData[offset + 7] = a;

      // wave_params
      const isWavy = underline.style === "wavy" ? 1.0 : 0.0;
      const wavelength = underline.wavelength ?? DEFAULT_WAVELENGTH;
      const amplitude = underline.amplitude ?? DEFAULT_AMPLITUDE;
      this.instanceData[offset + 8] = wavelength;
      this.instanceData[offset + 9] = amplitude;
      this.instanceData[offset + 10] = isWavy;
      this.instanceData[offset + 11] = underline.order ?? i; // z_index from global draw order

      // clip_bounds
      const clip = underline.clipBounds;
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
      const transform = underline.transform;
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
      count * FLOATS_PER_INSTANCE
    );

    pass.setPipeline(this.pipeline);
    pass.setBindGroup(0, uniformBindGroup);
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
