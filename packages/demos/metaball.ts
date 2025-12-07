import type { WebGPUContext } from "@glade/core";
import { GPUBufferUsage, GPUShaderStage } from "@glade/webgpu";
import type { DemoResources } from "./common";

const VERTEX_SHADER = `
struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) v_uv: vec2f,
}

@vertex
fn main(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
  var output: VertexOutput;

  // Full-screen triangle (covers entire viewport with one triangle)
  var pos: array<vec2f, 3> = array<vec2f, 3>(
    vec2f(-1.0, -1.0),
    vec2f(3.0, -1.0),
    vec2f(-1.0, 3.0)
  );

  output.position = vec4f(pos[vertexIndex], 0.0, 1.0);
  output.v_uv = pos[vertexIndex] * 0.5 + 0.5;
  output.v_uv.y = 1.0 - output.v_uv.y;

  return output;
}
`;

const FRAGMENT_SHADER = `
struct Uniforms {
  u_time: f32,
  _pad: f32,
  u_resolution: vec2f,
  u_mouse: vec2f,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

// Compute metaball field contribution from a single ball
fn metaball(p: vec2f, center: vec2f, radius: f32) -> f32 {
  let d = length(p - center);
  return radius * radius / (d * d + 0.0001);
}

// Compute 2D rotation matrix
fn rotate2d(angle: f32) -> mat2x2f {
  let s = sin(angle);
  let c = cos(angle);
  return mat2x2f(c, -s, s, c);
}

// Hash function for pseudo-random values
fn hash(p: vec2f) -> f32 {
  return fract(sin(dot(p, vec2f(127.1, 311.7))) * 43758.5453);
}

// Simplex-like noise
fn noise(p: vec2f) -> f32 {
  let i = floor(p);
  let f = fract(p);
  let u = f * f * (3.0 - 2.0 * f);

  return mix(
    mix(hash(i + vec2f(0.0, 0.0)), hash(i + vec2f(1.0, 0.0)), u.x),
    mix(hash(i + vec2f(0.0, 1.0)), hash(i + vec2f(1.0, 1.0)), u.x),
    u.y
  );
}

// Fractal Brownian Motion for organic movement
fn fbm(p: vec2f) -> f32 {
  var value = 0.0;
  var amplitude = 0.5;
  var frequency = 1.0;
  var pt = p;

  for (var i = 0; i < 4; i++) {
    value += amplitude * noise(pt * frequency);
    amplitude *= 0.5;
    frequency *= 2.0;
  }

  return value;
}

// Palette function for smooth color gradients
fn palette(t: f32, a: vec3f, b: vec3f, c: vec3f, d: vec3f) -> vec3f {
  return a + b * cos(6.28318 * (c * t + d));
}

@fragment
fn main(@location(0) v_uv: vec2f) -> @location(0) vec4f {
  let aspect = uniforms.u_resolution.x / uniforms.u_resolution.y;
  var uv = v_uv * 2.0 - 1.0;
  uv.x *= aspect;

  // Convert mouse to normalized coords
  var mouseNorm = (uniforms.u_mouse / uniforms.u_resolution) * 2.0 - 1.0;
  mouseNorm.x = mouseNorm.x * aspect;

  let t = uniforms.u_time;

  // Define metaball positions with organic movement
  var field = 0.0;
  let numBalls = 8;

  for (var i = 0; i < numBalls; i++) {
    let fi = f32(i);
    let angle = fi * 0.785398 + t * (0.3 + fi * 0.05);
    let radius = 0.3 + 0.2 * sin(t * 0.5 + fi);

    // Base orbital position
    var center = vec2f(
      cos(angle) * radius,
      sin(angle * 1.3) * radius * 0.8
    );

    // Add noise-based organic movement
    center.x += fbm(vec2f(fi * 10.0, t * 0.3)) * 0.3 - 0.15;
    center.y += fbm(vec2f(fi * 10.0 + 100.0, t * 0.3)) * 0.3 - 0.15;

    // Attraction toward mouse
    let toMouse = mouseNorm - center;
    let mouseDist = length(toMouse);
    center += toMouse * 0.15 / (mouseDist + 0.5);

    // Metaball size varies
    let ballRadius = 0.08 + 0.03 * sin(t * 2.0 + fi * 1.5);

    field += metaball(uv, center, ballRadius);
  }

  // Add a larger central blob that follows mouse more directly
  let centralRadius = 0.12 + 0.02 * sin(t * 1.5);
  field += metaball(uv, mouseNorm * 0.5, centralRadius);

  // Threshold for metaball surface
  let threshold = 1.0;
  let edge = smoothstep(threshold - 0.3, threshold + 0.1, field);

  // Create color based on field strength and position
  let colorT = field * 0.1 + t * 0.1 + length(uv) * 0.2;

  // Vibrant color palette
  let col = palette(
    colorT,
    vec3f(0.5, 0.5, 0.5),
    vec3f(0.5, 0.5, 0.5),
    vec3f(1.0, 1.0, 1.0),
    vec3f(0.0, 0.33, 0.67)
  );

  // Add internal structure/caustics
  let internalPattern = sin(field * 10.0 - t * 3.0) * 0.5 + 0.5;
  let caustics = pow(internalPattern, 3.0) * 0.3;

  // Fresnel-like edge glow
  let edgeGlow = pow(1.0 - abs(field - threshold) / 0.5, 4.0) * 0.5;

  // Combine colors
  var finalColor = col * edge;
  finalColor += vec3f(caustics) * edge;
  finalColor += vec3f(0.2, 0.5, 1.0) * edgeGlow * edge;

  // Background gradient
  let bgGradient = 0.05 + 0.03 * length(uv);
  let bg = vec3f(0.02, 0.02, 0.05) + vec3f(0.0, 0.02, 0.05) * bgGradient;

  // Add subtle background pattern
  let bgPattern = fbm(uv * 3.0 + t * 0.1) * 0.02;
  let bgFinal = bg + bgPattern;

  finalColor = mix(bgFinal, finalColor, edge);

  // Add bloom/glow around metaballs
  let bloom = smoothstep(0.3, 1.0, field) * (1.0 - edge) * 0.3;
  finalColor += col * bloom;

  return vec4f(clamp(finalColor, vec3f(0.0), vec3f(1.0)), 1.0);
}
`;

export function initMetaballDemo(ctx: WebGPUContext, format: GPUTextureFormat): DemoResources {
  const { device } = ctx;

  // Metaballs use a full-screen triangle, no vertex buffers needed for geometry
  // But we still need dummy buffers to satisfy the DemoResources interface
  const dummyPositions = new Float32Array([0, 0]);
  const dummyColors = new Float32Array([1, 1, 1]);

  const positionBuffer = device.createBuffer({
    size: dummyPositions.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(positionBuffer, 0, dummyPositions);

  const colorBuffer = device.createBuffer({
    size: dummyColors.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(colorBuffer, 0, dummyColors);

  const uniformBuffer = device.createBuffer({
    size: 32,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const bindGroupLayout = device.createBindGroupLayout({
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
        buffer: { type: "uniform" },
      },
    ],
  });

  const pipelineLayout = device.createPipelineLayout({
    bindGroupLayouts: [bindGroupLayout],
  });

  const vertexModule = device.createShaderModule({ code: VERTEX_SHADER });
  const fragmentModule = device.createShaderModule({ code: FRAGMENT_SHADER });

  const pipeline = device.createRenderPipeline({
    layout: pipelineLayout,
    vertex: {
      module: vertexModule,
      entryPoint: "main",
      buffers: [], // No vertex buffers - positions generated from vertex index
    },
    fragment: {
      module: fragmentModule,
      entryPoint: "main",
      targets: [{ format }],
    },
    primitive: { topology: "triangle-list" },
  });

  const bindGroup = device.createBindGroup({
    layout: bindGroupLayout,
    entries: [{ binding: 0, resource: { buffer: uniformBuffer } }],
  });

  return {
    pipeline,
    positionBuffer,
    colorBuffer,
    indexBuffer: null,
    uniformBuffer,
    bindGroup,
    indexCount: 0,
    vertexCount: 3, // Single full-screen triangle
    instanceCount: 1,
    useInstancing: true, // Use draw() path
  };
}
