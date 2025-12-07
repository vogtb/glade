import type { WebGPUContext } from "@glade/core";
import { GPUBufferUsage, GPUShaderStage } from "@glade/webgpu";
import type { DemoResources } from "./common";

// Eulerian fluid simulation on a grid using compute shaders
// Features: Navier-Stokes solver, vorticity confinement, pressure projection,
// multiple compute passes per frame, double-buffering, mouse interaction

const GRID_SIZE = 256;
const WORKGROUP_SIZE = 8;

// Velocity field advection compute shader
const ADVECT_SHADER = `
struct Uniforms {
  deltaTime: f32,
  gridSize: f32,
  dissipation: f32,
  _pad: f32,
  mousePos: vec2f,
  mouseDelta: vec2f,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var<storage, read> velocityIn: array<vec2f>;
@group(0) @binding(2) var<storage, read_write> velocityOut: array<vec2f>;
@group(0) @binding(3) var<storage, read> dyeIn: array<vec4f>;
@group(0) @binding(4) var<storage, read_write> dyeOut: array<vec4f>;

fn idx(x: i32, y: i32) -> u32 {
  let size = i32(uniforms.gridSize);
  let wx = ((x % size) + size) % size;
  let wy = ((y % size) + size) % size;
  return u32(wy * size + wx);
}

fn sampleVelocity(pos: vec2f) -> vec2f {
  let size = uniforms.gridSize;
  let x = pos.x;
  let y = pos.y;

  let x0 = i32(floor(x));
  let y0 = i32(floor(y));
  let x1 = x0 + 1;
  let y1 = y0 + 1;

  let fx = fract(x);
  let fy = fract(y);

  let v00 = velocityIn[idx(x0, y0)];
  let v10 = velocityIn[idx(x1, y0)];
  let v01 = velocityIn[idx(x0, y1)];
  let v11 = velocityIn[idx(x1, y1)];

  let v0 = mix(v00, v10, fx);
  let v1 = mix(v01, v11, fx);

  return mix(v0, v1, fy);
}

fn sampleDye(pos: vec2f) -> vec4f {
  let size = uniforms.gridSize;
  let x = pos.x;
  let y = pos.y;

  let x0 = i32(floor(x));
  let y0 = i32(floor(y));
  let x1 = x0 + 1;
  let y1 = y0 + 1;

  let fx = fract(x);
  let fy = fract(y);

  let d00 = dyeIn[idx(x0, y0)];
  let d10 = dyeIn[idx(x1, y0)];
  let d01 = dyeIn[idx(x0, y1)];
  let d11 = dyeIn[idx(x1, y1)];

  let d0 = mix(d00, d10, fx);
  let d1 = mix(d01, d11, fx);

  return mix(d0, d1, fy);
}

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) global_id: vec3u) {
  let size = u32(uniforms.gridSize);
  if (global_id.x >= size || global_id.y >= size) {
    return;
  }

  let i = global_id.y * size + global_id.x;
  let pos = vec2f(f32(global_id.x), f32(global_id.y));

  // Semi-Lagrangian advection: trace back in time
  let vel = velocityIn[i];
  let prevPos = pos - vel * uniforms.deltaTime * uniforms.gridSize;

  // Sample velocity and dye at previous position
  let newVel = sampleVelocity(prevPos) * uniforms.dissipation;
  let newDye = sampleDye(prevPos) * 0.995; // Slight dye dissipation

  velocityOut[i] = newVel;
  dyeOut[i] = newDye;
}
`;

// Add forces (mouse interaction, buoyancy, vorticity)
const FORCES_SHADER = `
struct Uniforms {
  deltaTime: f32,
  gridSize: f32,
  dissipation: f32,
  _pad: f32,
  mousePos: vec2f,
  mouseDelta: vec2f,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var<storage, read_write> velocity: array<vec2f>;
@group(0) @binding(2) var<storage, read_write> dye: array<vec4f>;

fn idx(x: i32, y: i32) -> u32 {
  let size = i32(uniforms.gridSize);
  let wx = ((x % size) + size) % size;
  let wy = ((y % size) + size) % size;
  return u32(wy * size + wx);
}

// Hash for procedural randomness
fn hash(p: vec2f) -> f32 {
  return fract(sin(dot(p, vec2f(127.1, 311.7))) * 43758.5453);
}

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) global_id: vec3u) {
  let size = u32(uniforms.gridSize);
  if (global_id.x >= size || global_id.y >= size) {
    return;
  }

  let i = global_id.y * size + global_id.x;
  let pos = vec2f(f32(global_id.x), f32(global_id.y));
  let normalizedPos = pos / uniforms.gridSize;

  var vel = velocity[i];
  var d = dye[i];

  // Mouse force - splat velocity and dye where mouse is
  let mouseGridPos = uniforms.mousePos * uniforms.gridSize;
  let mouseDist = length(pos - mouseGridPos);
  let mouseRadius = uniforms.gridSize * 0.08;

  if (mouseDist < mouseRadius) {
    let falloff = exp(-mouseDist * mouseDist / (mouseRadius * mouseRadius * 0.25));

    // Add velocity from mouse movement
    vel += uniforms.mouseDelta * 50.0 * falloff;

    // Add colorful dye based on mouse position
    let hue = fract(uniforms.mousePos.x + uniforms.mousePos.y + length(uniforms.mouseDelta) * 5.0);
    let dyeColor = hsvToRgb(hue, 0.8, 1.0);
    d += vec4f(dyeColor * falloff * 2.0, falloff);
  }

  // Slight upward buoyancy based on dye density (heat simulation)
  let density = (d.r + d.g + d.b) / 3.0;
  vel.y += density * 0.1 * uniforms.deltaTime;

  velocity[i] = vel;
  dye[i] = d;
}

fn hsvToRgb(h: f32, s: f32, v: f32) -> vec3f {
  let c = v * s;
  let x = c * (1.0 - abs((h * 6.0) % 2.0 - 1.0));
  let m = v - c;

  var rgb: vec3f;
  let hi = i32(h * 6.0) % 6;

  if (hi == 0) { rgb = vec3f(c, x, 0.0); }
  else if (hi == 1) { rgb = vec3f(x, c, 0.0); }
  else if (hi == 2) { rgb = vec3f(0.0, c, x); }
  else if (hi == 3) { rgb = vec3f(0.0, x, c); }
  else if (hi == 4) { rgb = vec3f(x, 0.0, c); }
  else { rgb = vec3f(c, 0.0, x); }

  return rgb + m;
}
`;

// Divergence calculation for pressure projection
const DIVERGENCE_SHADER = `
struct Uniforms {
  deltaTime: f32,
  gridSize: f32,
  dissipation: f32,
  _pad: f32,
  mousePos: vec2f,
  mouseDelta: vec2f,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var<storage, read> velocity: array<vec2f>;
@group(0) @binding(2) var<storage, read_write> divergence: array<f32>;

fn idx(x: i32, y: i32) -> u32 {
  let size = i32(uniforms.gridSize);
  let wx = ((x % size) + size) % size;
  let wy = ((y % size) + size) % size;
  return u32(wy * size + wx);
}

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) global_id: vec3u) {
  let size = u32(uniforms.gridSize);
  if (global_id.x >= size || global_id.y >= size) {
    return;
  }

  let x = i32(global_id.x);
  let y = i32(global_id.y);
  let i = global_id.y * size + global_id.x;

  // Central differences for divergence
  let vL = velocity[idx(x - 1, y)].x;
  let vR = velocity[idx(x + 1, y)].x;
  let vB = velocity[idx(x, y - 1)].y;
  let vT = velocity[idx(x, y + 1)].y;

  let div = 0.5 * ((vR - vL) + (vT - vB));
  divergence[i] = div;
}
`;

// Jacobi iteration for pressure solve
const PRESSURE_SHADER = `
struct Uniforms {
  deltaTime: f32,
  gridSize: f32,
  dissipation: f32,
  _pad: f32,
  mousePos: vec2f,
  mouseDelta: vec2f,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var<storage, read> divergence: array<f32>;
@group(0) @binding(2) var<storage, read> pressureIn: array<f32>;
@group(0) @binding(3) var<storage, read_write> pressureOut: array<f32>;

fn idx(x: i32, y: i32) -> u32 {
  let size = i32(uniforms.gridSize);
  let wx = ((x % size) + size) % size;
  let wy = ((y % size) + size) % size;
  return u32(wy * size + wx);
}

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) global_id: vec3u) {
  let size = u32(uniforms.gridSize);
  if (global_id.x >= size || global_id.y >= size) {
    return;
  }

  let x = i32(global_id.x);
  let y = i32(global_id.y);
  let i = global_id.y * size + global_id.x;

  // Jacobi iteration: p = (pL + pR + pB + pT - div) / 4
  let pL = pressureIn[idx(x - 1, y)];
  let pR = pressureIn[idx(x + 1, y)];
  let pB = pressureIn[idx(x, y - 1)];
  let pT = pressureIn[idx(x, y + 1)];
  let div = divergence[i];

  let p = (pL + pR + pB + pT - div) * 0.25;
  pressureOut[i] = p;
}
`;

// Pressure gradient subtraction (make velocity divergence-free)
const GRADIENT_SHADER = `
struct Uniforms {
  deltaTime: f32,
  gridSize: f32,
  dissipation: f32,
  _pad: f32,
  mousePos: vec2f,
  mouseDelta: vec2f,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var<storage, read> pressure: array<f32>;
@group(0) @binding(2) var<storage, read_write> velocity: array<vec2f>;

fn idx(x: i32, y: i32) -> u32 {
  let size = i32(uniforms.gridSize);
  let wx = ((x % size) + size) % size;
  let wy = ((y % size) + size) % size;
  return u32(wy * size + wx);
}

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) global_id: vec3u) {
  let size = u32(uniforms.gridSize);
  if (global_id.x >= size || global_id.y >= size) {
    return;
  }

  let x = i32(global_id.x);
  let y = i32(global_id.y);
  let i = global_id.y * size + global_id.x;

  // Subtract pressure gradient from velocity
  let pL = pressure[idx(x - 1, y)];
  let pR = pressure[idx(x + 1, y)];
  let pB = pressure[idx(x, y - 1)];
  let pT = pressure[idx(x, y + 1)];

  var vel = velocity[i];
  vel.x -= 0.5 * (pR - pL);
  vel.y -= 0.5 * (pT - pB);

  velocity[i] = vel;
}
`;

// Vorticity calculation
const VORTICITY_SHADER = `
struct Uniforms {
  deltaTime: f32,
  gridSize: f32,
  dissipation: f32,
  _pad: f32,
  mousePos: vec2f,
  mouseDelta: vec2f,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var<storage, read> velocity: array<vec2f>;
@group(0) @binding(2) var<storage, read_write> vorticity: array<f32>;

fn idx(x: i32, y: i32) -> u32 {
  let size = i32(uniforms.gridSize);
  let wx = ((x % size) + size) % size;
  let wy = ((y % size) + size) % size;
  return u32(wy * size + wx);
}

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) global_id: vec3u) {
  let size = u32(uniforms.gridSize);
  if (global_id.x >= size || global_id.y >= size) {
    return;
  }

  let x = i32(global_id.x);
  let y = i32(global_id.y);
  let i = global_id.y * size + global_id.x;

  // Curl of velocity field
  let vL = velocity[idx(x - 1, y)].y;
  let vR = velocity[idx(x + 1, y)].y;
  let vB = velocity[idx(x, y - 1)].x;
  let vT = velocity[idx(x, y + 1)].x;

  let curl = 0.5 * ((vR - vL) - (vT - vB));
  vorticity[i] = curl;
}
`;

// Vorticity confinement force application
const CONFINEMENT_SHADER = `
struct Uniforms {
  deltaTime: f32,
  gridSize: f32,
  dissipation: f32,
  _pad: f32,
  mousePos: vec2f,
  mouseDelta: vec2f,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var<storage, read> vorticity: array<f32>;
@group(0) @binding(2) var<storage, read_write> velocity: array<vec2f>;

fn idx(x: i32, y: i32) -> u32 {
  let size = i32(uniforms.gridSize);
  let wx = ((x % size) + size) % size;
  let wy = ((y % size) + size) % size;
  return u32(wy * size + wx);
}

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) global_id: vec3u) {
  let size = u32(uniforms.gridSize);
  if (global_id.x >= size || global_id.y >= size) {
    return;
  }

  let x = i32(global_id.x);
  let y = i32(global_id.y);
  let i = global_id.y * size + global_id.x;

  // Gradient of vorticity magnitude
  let vL = abs(vorticity[idx(x - 1, y)]);
  let vR = abs(vorticity[idx(x + 1, y)]);
  let vB = abs(vorticity[idx(x, y - 1)]);
  let vT = abs(vorticity[idx(x, y + 1)]);

  var grad = vec2f(vR - vL, vT - vB) * 0.5;
  let gradLen = length(grad);

  if (gradLen > 0.0001) {
    grad /= gradLen;

    // Apply vorticity confinement force
    let curl = vorticity[i];
    let force = vec2f(grad.y, -grad.x) * curl * 15.0;

    velocity[i] += force * uniforms.deltaTime;
  }
}
`;

// Render shader - visualize the dye field
const RENDER_VERTEX_SHADER = `
struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
}

@vertex
fn main(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
  var output: VertexOutput;

  var pos: array<vec2f, 3> = array<vec2f, 3>(
    vec2f(-1.0, -1.0),
    vec2f(3.0, -1.0),
    vec2f(-1.0, 3.0)
  );

  output.position = vec4f(pos[vertexIndex], 0.0, 1.0);
  output.uv = pos[vertexIndex] * 0.5 + 0.5;
  output.uv.y = 1.0 - output.uv.y;

  return output;
}
`;

const RENDER_FRAGMENT_SHADER = `
struct RenderUniforms {
  time: f32,
  gridSize: f32,
  aspectRatio: f32,
  _pad: f32,
}

@group(0) @binding(0) var<uniform> uniforms: RenderUniforms;
@group(0) @binding(1) var<storage, read> dye: array<vec4f>;
@group(0) @binding(2) var<storage, read> velocity: array<vec2f>;

fn idx(x: i32, y: i32) -> u32 {
  let size = i32(uniforms.gridSize);
  let wx = clamp(x, 0, size - 1);
  let wy = clamp(y, 0, size - 1);
  return u32(wy * size + wx);
}

fn sampleDye(uv: vec2f) -> vec4f {
  let size = uniforms.gridSize;
  let x = uv.x * size;
  let y = uv.y * size;

  let x0 = i32(floor(x));
  let y0 = i32(floor(y));
  let x1 = x0 + 1;
  let y1 = y0 + 1;

  let fx = fract(x);
  let fy = fract(y);

  let d00 = dye[idx(x0, y0)];
  let d10 = dye[idx(x1, y0)];
  let d01 = dye[idx(x0, y1)];
  let d11 = dye[idx(x1, y1)];

  let d0 = mix(d00, d10, fx);
  let d1 = mix(d01, d11, fx);

  return mix(d0, d1, fy);
}

fn sampleVelocity(uv: vec2f) -> vec2f {
  let size = uniforms.gridSize;
  let x = uv.x * size;
  let y = uv.y * size;

  let x0 = i32(floor(x));
  let y0 = i32(floor(y));

  return velocity[idx(x0, y0)];
}

@fragment
fn main(@location(0) uv: vec2f) -> @location(0) vec4f {
  let d = sampleDye(uv);
  let vel = sampleVelocity(uv);

  // Base color from dye
  var color = d.rgb;

  // Add subtle velocity visualization
  let speed = length(vel) * 0.02;
  color += vec3f(speed * 0.3, speed * 0.1, speed * 0.5);

  // Add vignette
  let vignetteCenter = vec2f(0.5, 0.5);
  let vignetteDist = length(uv - vignetteCenter);
  let vignette = 1.0 - smoothstep(0.3, 0.8, vignetteDist);

  // Background color (dark blue)
  let bg = vec3f(0.02, 0.02, 0.05);

  // Combine with background
  color = mix(bg, color + bg, clamp(length(color) * 2.0 + 0.1, 0.0, 1.0));
  color *= vignette * 0.8 + 0.2;

  // Tone mapping
  color = color / (color + vec3f(1.0));

  return vec4f(color, 1.0);
}
`;

interface FluidResources extends DemoResources {
  // Compute pipelines
  advectPipeline: GPUComputePipeline;
  forcesPipeline: GPUComputePipeline;
  divergencePipeline: GPUComputePipeline;
  pressurePipeline: GPUComputePipeline;
  gradientPipeline: GPUComputePipeline;
  vorticityPipeline: GPUComputePipeline;
  confinementPipeline: GPUComputePipeline;

  // Buffers (double-buffered for ping-pong)
  velocityBuffers: [GPUBuffer, GPUBuffer];
  dyeBuffers: [GPUBuffer, GPUBuffer];
  pressureBuffers: [GPUBuffer, GPUBuffer];
  divergenceBuffer: GPUBuffer;
  vorticityBuffer: GPUBuffer;
  computeUniformBuffer: GPUBuffer;
  renderUniformBuffer: GPUBuffer;

  // Bind groups for each pass (need multiple for ping-pong)
  advectBindGroups: [GPUBindGroup, GPUBindGroup];
  forcesBindGroups: [GPUBindGroup, GPUBindGroup];
  divergenceBindGroups: [GPUBindGroup, GPUBindGroup];
  pressureBindGroups: [GPUBindGroup, GPUBindGroup];
  gradientBindGroups: [GPUBindGroup, GPUBindGroup];
  vorticityBindGroups: [GPUBindGroup, GPUBindGroup];
  confinementBindGroups: [GPUBindGroup, GPUBindGroup];
  renderBindGroups: [GPUBindGroup, GPUBindGroup];

  // State
  currentBuffer: number;
  gridSize: number;
  lastMouseX: number;
  lastMouseY: number;
}

export function initFluidDemo(ctx: WebGPUContext, format: GPUTextureFormat): DemoResources {
  const { device } = ctx;
  const gridSize = GRID_SIZE;
  const cellCount = gridSize * gridSize;

  // Create buffers
  const createStorageBuffer = (size: number) =>
    device.createBuffer({
      size,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });

  // Velocity: vec2f per cell
  const velocityBuffers: [GPUBuffer, GPUBuffer] = [
    createStorageBuffer(cellCount * 8),
    createStorageBuffer(cellCount * 8),
  ];

  // Dye: vec4f per cell
  const dyeBuffers: [GPUBuffer, GPUBuffer] = [
    createStorageBuffer(cellCount * 16),
    createStorageBuffer(cellCount * 16),
  ];

  // Pressure: f32 per cell
  const pressureBuffers: [GPUBuffer, GPUBuffer] = [
    createStorageBuffer(cellCount * 4),
    createStorageBuffer(cellCount * 4),
  ];

  // Divergence: f32 per cell
  const divergenceBuffer = createStorageBuffer(cellCount * 4);

  // Vorticity: f32 per cell
  const vorticityBuffer = createStorageBuffer(cellCount * 4);

  // Compute uniforms: deltaTime, gridSize, dissipation, pad, mousePos, mouseDelta
  const computeUniformBuffer = device.createBuffer({
    size: 32,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  // Render uniforms: time, gridSize, aspectRatio, pad
  const renderUniformBuffer = device.createBuffer({
    size: 16,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  // Dummy buffers for DemoResources interface
  const positionBuffer = device.createBuffer({
    size: 8,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  });
  const colorBuffer = device.createBuffer({
    size: 12,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  });

  // === Create Compute Pipelines ===

  // Advection bind group layout
  const advectLayout = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: "uniform" } },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } },
      { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
      { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } },
      { binding: 4, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
    ],
  });

  const advectPipeline = device.createComputePipeline({
    layout: device.createPipelineLayout({ bindGroupLayouts: [advectLayout] }),
    compute: {
      module: device.createShaderModule({ code: ADVECT_SHADER }),
      entryPoint: "main",
    },
  });

  // Forces bind group layout
  const forcesLayout = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: "uniform" } },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
      { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
    ],
  });

  const forcesPipeline = device.createComputePipeline({
    layout: device.createPipelineLayout({ bindGroupLayouts: [forcesLayout] }),
    compute: {
      module: device.createShaderModule({ code: FORCES_SHADER }),
      entryPoint: "main",
    },
  });

  // Divergence bind group layout
  const divergenceLayout = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: "uniform" } },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } },
      { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
    ],
  });

  const divergencePipeline = device.createComputePipeline({
    layout: device.createPipelineLayout({ bindGroupLayouts: [divergenceLayout] }),
    compute: {
      module: device.createShaderModule({ code: DIVERGENCE_SHADER }),
      entryPoint: "main",
    },
  });

  // Pressure bind group layout
  const pressureLayout = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: "uniform" } },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } },
      { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } },
      { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
    ],
  });

  const pressurePipeline = device.createComputePipeline({
    layout: device.createPipelineLayout({ bindGroupLayouts: [pressureLayout] }),
    compute: {
      module: device.createShaderModule({ code: PRESSURE_SHADER }),
      entryPoint: "main",
    },
  });

  // Gradient bind group layout
  const gradientLayout = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: "uniform" } },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } },
      { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
    ],
  });

  const gradientPipeline = device.createComputePipeline({
    layout: device.createPipelineLayout({ bindGroupLayouts: [gradientLayout] }),
    compute: {
      module: device.createShaderModule({ code: GRADIENT_SHADER }),
      entryPoint: "main",
    },
  });

  // Vorticity bind group layout
  const vorticityLayout = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: "uniform" } },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } },
      { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
    ],
  });

  const vorticityPipeline = device.createComputePipeline({
    layout: device.createPipelineLayout({ bindGroupLayouts: [vorticityLayout] }),
    compute: {
      module: device.createShaderModule({ code: VORTICITY_SHADER }),
      entryPoint: "main",
    },
  });

  // Confinement bind group layout
  const confinementLayout = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: "uniform" } },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } },
      { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
    ],
  });

  const confinementPipeline = device.createComputePipeline({
    layout: device.createPipelineLayout({ bindGroupLayouts: [confinementLayout] }),
    compute: {
      module: device.createShaderModule({ code: CONFINEMENT_SHADER }),
      entryPoint: "main",
    },
  });

  // === Create Render Pipeline ===
  const renderLayout = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "uniform" } },
      { binding: 1, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "read-only-storage" } },
      { binding: 2, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "read-only-storage" } },
    ],
  });

  const renderPipeline = device.createRenderPipeline({
    layout: device.createPipelineLayout({ bindGroupLayouts: [renderLayout] }),
    vertex: {
      module: device.createShaderModule({ code: RENDER_VERTEX_SHADER }),
      entryPoint: "main",
      buffers: [],
    },
    fragment: {
      module: device.createShaderModule({ code: RENDER_FRAGMENT_SHADER }),
      entryPoint: "main",
      targets: [{ format }],
    },
    primitive: { topology: "triangle-list" },
  });

  // === Create Bind Groups ===

  // Helper to create bind groups for both buffer configurations
  const createAdvectBindGroups = (): [GPUBindGroup, GPUBindGroup] => [
    device.createBindGroup({
      layout: advectLayout,
      entries: [
        { binding: 0, resource: { buffer: computeUniformBuffer } },
        { binding: 1, resource: { buffer: velocityBuffers[0] } },
        { binding: 2, resource: { buffer: velocityBuffers[1] } },
        { binding: 3, resource: { buffer: dyeBuffers[0] } },
        { binding: 4, resource: { buffer: dyeBuffers[1] } },
      ],
    }),
    device.createBindGroup({
      layout: advectLayout,
      entries: [
        { binding: 0, resource: { buffer: computeUniformBuffer } },
        { binding: 1, resource: { buffer: velocityBuffers[1] } },
        { binding: 2, resource: { buffer: velocityBuffers[0] } },
        { binding: 3, resource: { buffer: dyeBuffers[1] } },
        { binding: 4, resource: { buffer: dyeBuffers[0] } },
      ],
    }),
  ];

  const createForcesBindGroups = (): [GPUBindGroup, GPUBindGroup] => [
    device.createBindGroup({
      layout: forcesLayout,
      entries: [
        { binding: 0, resource: { buffer: computeUniformBuffer } },
        { binding: 1, resource: { buffer: velocityBuffers[1] } },
        { binding: 2, resource: { buffer: dyeBuffers[1] } },
      ],
    }),
    device.createBindGroup({
      layout: forcesLayout,
      entries: [
        { binding: 0, resource: { buffer: computeUniformBuffer } },
        { binding: 1, resource: { buffer: velocityBuffers[0] } },
        { binding: 2, resource: { buffer: dyeBuffers[0] } },
      ],
    }),
  ];

  const createDivergenceBindGroups = (): [GPUBindGroup, GPUBindGroup] => [
    device.createBindGroup({
      layout: divergenceLayout,
      entries: [
        { binding: 0, resource: { buffer: computeUniformBuffer } },
        { binding: 1, resource: { buffer: velocityBuffers[1] } },
        { binding: 2, resource: { buffer: divergenceBuffer } },
      ],
    }),
    device.createBindGroup({
      layout: divergenceLayout,
      entries: [
        { binding: 0, resource: { buffer: computeUniformBuffer } },
        { binding: 1, resource: { buffer: velocityBuffers[0] } },
        { binding: 2, resource: { buffer: divergenceBuffer } },
      ],
    }),
  ];

  const createPressureBindGroups = (): [GPUBindGroup, GPUBindGroup] => [
    device.createBindGroup({
      layout: pressureLayout,
      entries: [
        { binding: 0, resource: { buffer: computeUniformBuffer } },
        { binding: 1, resource: { buffer: divergenceBuffer } },
        { binding: 2, resource: { buffer: pressureBuffers[0] } },
        { binding: 3, resource: { buffer: pressureBuffers[1] } },
      ],
    }),
    device.createBindGroup({
      layout: pressureLayout,
      entries: [
        { binding: 0, resource: { buffer: computeUniformBuffer } },
        { binding: 1, resource: { buffer: divergenceBuffer } },
        { binding: 2, resource: { buffer: pressureBuffers[1] } },
        { binding: 3, resource: { buffer: pressureBuffers[0] } },
      ],
    }),
  ];

  const createGradientBindGroups = (): [GPUBindGroup, GPUBindGroup] => [
    device.createBindGroup({
      layout: gradientLayout,
      entries: [
        { binding: 0, resource: { buffer: computeUniformBuffer } },
        { binding: 1, resource: { buffer: pressureBuffers[1] } },
        { binding: 2, resource: { buffer: velocityBuffers[1] } },
      ],
    }),
    device.createBindGroup({
      layout: gradientLayout,
      entries: [
        { binding: 0, resource: { buffer: computeUniformBuffer } },
        { binding: 1, resource: { buffer: pressureBuffers[0] } },
        { binding: 2, resource: { buffer: velocityBuffers[0] } },
      ],
    }),
  ];

  const createVorticityBindGroups = (): [GPUBindGroup, GPUBindGroup] => [
    device.createBindGroup({
      layout: vorticityLayout,
      entries: [
        { binding: 0, resource: { buffer: computeUniformBuffer } },
        { binding: 1, resource: { buffer: velocityBuffers[1] } },
        { binding: 2, resource: { buffer: vorticityBuffer } },
      ],
    }),
    device.createBindGroup({
      layout: vorticityLayout,
      entries: [
        { binding: 0, resource: { buffer: computeUniformBuffer } },
        { binding: 1, resource: { buffer: velocityBuffers[0] } },
        { binding: 2, resource: { buffer: vorticityBuffer } },
      ],
    }),
  ];

  const createConfinementBindGroups = (): [GPUBindGroup, GPUBindGroup] => [
    device.createBindGroup({
      layout: confinementLayout,
      entries: [
        { binding: 0, resource: { buffer: computeUniformBuffer } },
        { binding: 1, resource: { buffer: vorticityBuffer } },
        { binding: 2, resource: { buffer: velocityBuffers[1] } },
      ],
    }),
    device.createBindGroup({
      layout: confinementLayout,
      entries: [
        { binding: 0, resource: { buffer: computeUniformBuffer } },
        { binding: 1, resource: { buffer: vorticityBuffer } },
        { binding: 2, resource: { buffer: velocityBuffers[0] } },
      ],
    }),
  ];

  const createRenderBindGroups = (): [GPUBindGroup, GPUBindGroup] => [
    device.createBindGroup({
      layout: renderLayout,
      entries: [
        { binding: 0, resource: { buffer: renderUniformBuffer } },
        { binding: 1, resource: { buffer: dyeBuffers[1] } },
        { binding: 2, resource: { buffer: velocityBuffers[1] } },
      ],
    }),
    device.createBindGroup({
      layout: renderLayout,
      entries: [
        { binding: 0, resource: { buffer: renderUniformBuffer } },
        { binding: 1, resource: { buffer: dyeBuffers[0] } },
        { binding: 2, resource: { buffer: velocityBuffers[0] } },
      ],
    }),
  ];

  const resources: FluidResources = {
    pipeline: renderPipeline,
    positionBuffer,
    colorBuffer,
    indexBuffer: null,
    uniformBuffer: renderUniformBuffer,
    bindGroup: device.createBindGroup({
      layout: renderLayout,
      entries: [
        { binding: 0, resource: { buffer: renderUniformBuffer } },
        { binding: 1, resource: { buffer: dyeBuffers[0] } },
        { binding: 2, resource: { buffer: velocityBuffers[0] } },
      ],
    }),
    indexCount: 0,
    vertexCount: 3,
    instanceCount: 1,
    useInstancing: true,

    advectPipeline,
    forcesPipeline,
    divergencePipeline,
    pressurePipeline,
    gradientPipeline,
    vorticityPipeline,
    confinementPipeline,

    velocityBuffers,
    dyeBuffers,
    pressureBuffers,
    divergenceBuffer,
    vorticityBuffer,
    computeUniformBuffer,
    renderUniformBuffer,

    advectBindGroups: createAdvectBindGroups(),
    forcesBindGroups: createForcesBindGroups(),
    divergenceBindGroups: createDivergenceBindGroups(),
    pressureBindGroups: createPressureBindGroups(),
    gradientBindGroups: createGradientBindGroups(),
    vorticityBindGroups: createVorticityBindGroups(),
    confinementBindGroups: createConfinementBindGroups(),
    renderBindGroups: createRenderBindGroups(),

    currentBuffer: 0,
    gridSize,
    lastMouseX: 0.5,
    lastMouseY: 0.5,
  };

  return resources;
}

export function renderFluid(
  ctx: WebGPUContext,
  resources: DemoResources,
  time: number,
  deltaTime: number,
  mouseX: number,
  mouseY: number
): void {
  const { device, context } = ctx;
  const fluid = resources as FluidResources;
  const workgroups = Math.ceil(fluid.gridSize / WORKGROUP_SIZE);

  // Normalize mouse position
  const normMouseX = mouseX / ctx.width;
  const normMouseY = mouseY / ctx.height;
  const mouseDeltaX = normMouseX - fluid.lastMouseX;
  const mouseDeltaY = normMouseY - fluid.lastMouseY;
  fluid.lastMouseX = normMouseX;
  fluid.lastMouseY = normMouseY;

  // Update compute uniforms
  const computeUniforms = new Float32Array([
    Math.min(deltaTime, 0.033), // Cap at ~30fps equivalent
    fluid.gridSize,
    0.99, // Velocity dissipation
    0,
    normMouseX,
    normMouseY,
    mouseDeltaX,
    mouseDeltaY,
  ]);
  device.queue.writeBuffer(fluid.computeUniformBuffer, 0, computeUniforms);

  // Update render uniforms
  const renderUniforms = new Float32Array([time, fluid.gridSize, ctx.width / ctx.height, 0]);
  device.queue.writeBuffer(fluid.renderUniformBuffer, 0, renderUniforms);

  const commandEncoder = device.createCommandEncoder();
  const buf = fluid.currentBuffer;

  // === Simulation Steps ===

  // 1. Advection
  {
    const pass = commandEncoder.beginComputePass();
    pass.setPipeline(fluid.advectPipeline);
    pass.setBindGroup(0, fluid.advectBindGroups[buf]!);
    pass.dispatchWorkgroups(workgroups, workgroups);
    pass.end();
  }

  // 2. Add forces (mouse interaction)
  {
    const pass = commandEncoder.beginComputePass();
    pass.setPipeline(fluid.forcesPipeline);
    pass.setBindGroup(0, fluid.forcesBindGroups[buf]!);
    pass.dispatchWorkgroups(workgroups, workgroups);
    pass.end();
  }

  // 3. Vorticity calculation
  {
    const pass = commandEncoder.beginComputePass();
    pass.setPipeline(fluid.vorticityPipeline);
    pass.setBindGroup(0, fluid.vorticityBindGroups[buf]!);
    pass.dispatchWorkgroups(workgroups, workgroups);
    pass.end();
  }

  // 4. Vorticity confinement
  {
    const pass = commandEncoder.beginComputePass();
    pass.setPipeline(fluid.confinementPipeline);
    pass.setBindGroup(0, fluid.confinementBindGroups[buf]!);
    pass.dispatchWorkgroups(workgroups, workgroups);
    pass.end();
  }

  // 5. Divergence calculation
  {
    const pass = commandEncoder.beginComputePass();
    pass.setPipeline(fluid.divergencePipeline);
    pass.setBindGroup(0, fluid.divergenceBindGroups[buf]!);
    pass.dispatchWorkgroups(workgroups, workgroups);
    pass.end();
  }

  // 6. Pressure solve (multiple Jacobi iterations)
  const PRESSURE_ITERATIONS = 20;
  for (let i = 0; i < PRESSURE_ITERATIONS; i++) {
    const pass = commandEncoder.beginComputePass();
    pass.setPipeline(fluid.pressurePipeline);
    pass.setBindGroup(0, fluid.pressureBindGroups[i % 2]!);
    pass.dispatchWorkgroups(workgroups, workgroups);
    pass.end();
  }

  // 7. Gradient subtraction
  {
    const pass = commandEncoder.beginComputePass();
    pass.setPipeline(fluid.gradientPipeline);
    pass.setBindGroup(0, fluid.gradientBindGroups[buf]!);
    pass.dispatchWorkgroups(workgroups, workgroups);
    pass.end();
  }

  // === Render ===
  const textureView = context.getCurrentTexture().createView();

  const renderPass = commandEncoder.beginRenderPass({
    colorAttachments: [
      {
        view: textureView,
        clearValue: { r: 0.02, g: 0.02, b: 0.05, a: 1.0 },
        loadOp: "clear",
        storeOp: "store",
      },
    ],
  });

  renderPass.setPipeline(fluid.pipeline);
  renderPass.setBindGroup(0, fluid.renderBindGroups[buf]!);
  renderPass.draw(3);
  renderPass.end();

  device.queue.submit([commandEncoder.finish()]);

  if ("present" in context && typeof context.present === "function") {
    (context as unknown as { present: () => void }).present();
  }

  // Swap buffers for next frame
  fluid.currentBuffer = 1 - fluid.currentBuffer;
}
