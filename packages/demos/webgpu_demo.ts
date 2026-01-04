import {
  colors,
  createRenderTexture,
  div,
  GPUBufferUsage,
  GPUShaderStage,
  type RenderTexture,
  text,
  type WebGPUHost,
  webgpuHost,
  type WebGPUHostInput,
} from "@glade/glade";

import { SPACER_10PX } from "./common";
import type { Demo, DemoItem } from "./demo";

type WebGPUDemoId = "hexagon" | "metaball" | "particle" | "raymarch" | "terrain" | "galaxy";

const HEIGHT = 400;
const WIDTH = 400;

const DEMO_METADATA: Array<{ id: WebGPUDemoId; label: string; desc: string }> = [
  { id: "hexagon", label: "Hexagon", desc: "Animated hexagon with mouse interaction" },
  { id: "metaball", label: "Metaball", desc: "Organic blob simulation" },
  { id: "particle", label: "Particle", desc: "Orbiting particle system" },
  { id: "raymarch", label: "Raymarch", desc: "3D raymarched scene" },
  { id: "terrain", label: "Terrain", desc: "Procedural terrain flyover" },
  { id: "galaxy", label: "Galaxy", desc: "Particle physics with compute shaders" },
];

// ============================================================================
// HEXAGON DEMO
// ============================================================================

const HEXAGON_VERTEX_SHADER = `
struct VertexInput {
  @location(0) a_position: vec2f,
  @location(1) a_color: vec3f,
}

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) v_color: vec3f,
}

struct Uniforms {
  u_time: f32,
  _pad: f32,
  u_resolution: vec2f,
  u_mouse: vec2f,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

fn rotate2d(angle: f32) -> mat2x2f {
  let s = sin(angle);
  let c = cos(angle);
  return mat2x2f(c, -s, s, c);
}

@vertex
fn main(input: VertexInput) -> VertexOutput {
  var output: VertexOutput;

  // Convert mouse from pixel coords to normalized device coords (-1 to 1)
  var mouseNorm = (uniforms.u_mouse / uniforms.u_resolution) * 2.0 - 1.0;
  mouseNorm.y = -mouseNorm.y; // Flip Y (screen coords are top-down)

  // Apply rotation based on time
  var pos = input.a_position * rotate2d(uniforms.u_time * 0.5);

  // Add some wobble
  pos.x += sin(uniforms.u_time * 2.0 + input.a_position.y * 3.0) * 0.1;
  pos.y += cos(uniforms.u_time * 2.5 + input.a_position.x * 3.0) * 0.1;

  // Offset position toward mouse
  pos += mouseNorm * 0.3;

  // Scale to maintain aspect ratio
  let aspect = uniforms.u_resolution.x / uniforms.u_resolution.y;
  pos.x /= aspect;

  output.position = vec4f(pos, 0.0, 1.0);

  // Animate color
  output.v_color = input.a_color * (0.5 + 0.5 * sin(uniforms.u_time + input.a_color));

  return output;
}
`;

const HEXAGON_FRAGMENT_SHADER = `
struct Uniforms {
  u_time: f32,
  _pad: f32,
  u_resolution: vec2f,
  u_mouse: vec2f,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

@fragment
fn main(@location(0) v_color: vec3f, @builtin(position) fragCoord: vec4f) -> @location(0) vec4f {
  // Add some color pulsing
  var color = v_color;
  color += 0.1 * sin(uniforms.u_time * 3.0 + fragCoord.x * 0.02);
  color += 0.1 * cos(uniforms.u_time * 2.5 + fragCoord.y * 0.02);

  return vec4f(clamp(color, vec3f(0.0), vec3f(1.0)), 1.0);
}
`;

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h * 6) % 2) - 1));
  const m = l - c / 2;

  let r = 0,
    g = 0,
    b = 0;
  const hue = h * 6;

  if (hue < 1) {
    r = c;
    g = x;
  } else if (hue < 2) {
    r = x;
    g = c;
  } else if (hue < 3) {
    g = c;
    b = x;
  } else if (hue < 4) {
    g = x;
    b = c;
  } else if (hue < 5) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }

  return [r + m, g + m, b + m];
}

function createHexagonGeometry(): { positions: Float32Array; colors: Float32Array } {
  const positions: Array<number> = [];
  const colorsArr: Array<number> = [];

  const sides = 6;
  const radius = 0.6;

  positions.push(0, 0);
  colorsArr.push(1, 1, 1);

  for (let i = 0; i <= sides; i++) {
    const angle = (i / sides) * Math.PI * 2 - Math.PI / 2;
    positions.push(Math.cos(angle) * radius, Math.sin(angle) * radius);

    const hue = i / sides;
    const [r, g, b] = hslToRgb(hue, 1, 0.5);
    colorsArr.push(r, g, b);
  }

  return {
    positions: new Float32Array(positions),
    colors: new Float32Array(colorsArr),
  };
}

function createHexagonIndices(): Uint16Array {
  const indices: Array<number> = [];
  const numSides = 6;

  for (let i = 0; i < numSides; i++) {
    indices.push(0, i + 1, i + 2);
  }

  return new Uint16Array(indices);
}

type HexagonResources = {
  pipeline: GPURenderPipeline;
  positionBuffer: GPUBuffer;
  colorBuffer: GPUBuffer;
  indexBuffer: GPUBuffer;
  uniformBuffer: GPUBuffer;
  bindGroup: GPUBindGroup;
  indexCount: number;
};

class HexagonHost implements WebGPUHost {
  private renderTexture: RenderTexture;
  private resources: HexagonResources | null = null;
  private ready = false;

  constructor(
    private device: GPUDevice,
    private format: GPUTextureFormat,
    width: number,
    height: number
  ) {
    this.renderTexture = createRenderTexture(device, width, height, format);
    this.initAsync();
  }

  private async initAsync(): Promise<void> {
    this.resources = this.initResources();
    await new Promise((resolve) => setTimeout(resolve, 0));
    this.ready = true;
  }

  private initResources(): HexagonResources {
    const { device, format } = this;

    const { positions, colors: colorsData } = createHexagonGeometry();
    const indices = createHexagonIndices();

    const positionBuffer = device.createBuffer({
      size: positions.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(positionBuffer, 0, positions);

    const colorBuffer = device.createBuffer({
      size: colorsData.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(colorBuffer, 0, colorsData);

    const indexBuffer = device.createBuffer({
      size: indices.byteLength,
      usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(indexBuffer, 0, indices);

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

    const vertexModule = device.createShaderModule({ code: HEXAGON_VERTEX_SHADER });
    const fragmentModule = device.createShaderModule({ code: HEXAGON_FRAGMENT_SHADER });

    const pipeline = device.createRenderPipeline({
      layout: pipelineLayout,
      vertex: {
        module: vertexModule,
        entryPoint: "main",
        buffers: [
          {
            arrayStride: 8,
            attributes: [{ shaderLocation: 0, offset: 0, format: "float32x2" }],
          },
          {
            arrayStride: 12,
            attributes: [{ shaderLocation: 1, offset: 0, format: "float32x3" }],
          },
        ],
      },
      fragment: {
        module: fragmentModule,
        entryPoint: "main",
        targets: [
          {
            format,
            blend: {
              color: {
                srcFactor: "src-alpha",
                dstFactor: "one-minus-src-alpha",
                operation: "add",
              },
              alpha: {
                srcFactor: "one",
                dstFactor: "one-minus-src-alpha",
                operation: "add",
              },
            },
          },
        ],
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
      indexBuffer,
      uniformBuffer,
      bindGroup,
      indexCount: indices.length,
    };
  }

  resize(width: number, height: number): void {
    if (width <= 0 || height <= 0) {
      return;
    }
    this.renderTexture.resize(width, height);
  }

  render(input: WebGPUHostInput, encoder: GPUCommandEncoder): void {
    if (!this.ready || !this.resources) {
      return;
    }

    const { time, mouseX, mouseY, width, height } = input;

    const uniformData = new Float32Array([time, 0, width, height, mouseX, mouseY, 0, 0]);
    this.device.queue.writeBuffer(this.resources.uniformBuffer, 0, uniformData);

    const textureView = this.renderTexture.textureView;

    const renderPass = encoder.beginRenderPass({
      colorAttachments: [
        {
          view: textureView,
          clearValue: { r: 0.05, g: 0.05, b: 0.1, a: 1.0 },
          loadOp: "clear",
          storeOp: "store",
        },
      ],
    });

    renderPass.setPipeline(this.resources.pipeline);
    renderPass.setBindGroup(0, this.resources.bindGroup);
    renderPass.setVertexBuffer(0, this.resources.positionBuffer);
    renderPass.setVertexBuffer(1, this.resources.colorBuffer);
    renderPass.setIndexBuffer(this.resources.indexBuffer, "uint16");
    renderPass.drawIndexed(this.resources.indexCount);
    renderPass.end();
  }

  getTexture(): RenderTexture {
    return this.renderTexture;
  }

  destroy(): void {
    this.renderTexture.destroy();
    if (this.resources) {
      this.resources.positionBuffer.destroy();
      this.resources.colorBuffer.destroy();
      this.resources.indexBuffer.destroy();
      this.resources.uniformBuffer.destroy();
    }
  }
}

function createHexagonHost(
  device: GPUDevice,
  format: GPUTextureFormat,
  width: number,
  height: number
): WebGPUHost {
  return new HexagonHost(device, format, width, height);
}

// ============================================================================
// METABALL DEMO
// ============================================================================

const METABALL_VERTEX_SHADER = `
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

const METABALL_FRAGMENT_SHADER = `
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

type MetaballResources = {
  pipeline: GPURenderPipeline;
  uniformBuffer: GPUBuffer;
  bindGroup: GPUBindGroup;
};

class MetaballHost implements WebGPUHost {
  private renderTexture: RenderTexture;
  private resources: MetaballResources | null = null;
  private ready = false;

  constructor(
    private device: GPUDevice,
    private format: GPUTextureFormat,
    width: number,
    height: number
  ) {
    this.renderTexture = createRenderTexture(device, width, height, format);
    this.initAsync();
  }

  private async initAsync(): Promise<void> {
    this.resources = this.initResources();
    await new Promise((resolve) => setTimeout(resolve, 0));
    this.ready = true;
  }

  private initResources(): MetaballResources {
    const { device, format } = this;

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

    const vertexModule = device.createShaderModule({ code: METABALL_VERTEX_SHADER });
    const fragmentModule = device.createShaderModule({ code: METABALL_FRAGMENT_SHADER });

    const pipeline = device.createRenderPipeline({
      layout: pipelineLayout,
      vertex: {
        module: vertexModule,
        entryPoint: "main",
        buffers: [],
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
      uniformBuffer,
      bindGroup,
    };
  }

  resize(width: number, height: number): void {
    if (width <= 0 || height <= 0) {
      return;
    }
    this.renderTexture.resize(width, height);
  }

  render(input: WebGPUHostInput, encoder: GPUCommandEncoder): void {
    if (!this.ready || !this.resources) {
      return;
    }

    const { time, mouseX, mouseY, width, height } = input;

    const uniformData = new Float32Array([time, 0, width, height, mouseX, mouseY, 0, 0]);
    this.device.queue.writeBuffer(this.resources.uniformBuffer, 0, uniformData);

    const textureView = this.renderTexture.textureView;

    const renderPass = encoder.beginRenderPass({
      colorAttachments: [
        {
          view: textureView,
          clearValue: { r: 0.02, g: 0.02, b: 0.05, a: 1.0 },
          loadOp: "clear",
          storeOp: "store",
        },
      ],
    });

    renderPass.setPipeline(this.resources.pipeline);
    renderPass.setBindGroup(0, this.resources.bindGroup);
    renderPass.draw(3);
    renderPass.end();
  }

  getTexture(): RenderTexture {
    return this.renderTexture;
  }

  destroy(): void {
    this.renderTexture.destroy();
    if (this.resources) {
      this.resources.uniformBuffer.destroy();
    }
  }
}

function createMetaballHost(
  device: GPUDevice,
  format: GPUTextureFormat,
  width: number,
  height: number
): WebGPUHost {
  return new MetaballHost(device, format, width, height);
}

// ============================================================================
// PARTICLE DEMO
// ============================================================================

const PARTICLE_VERTEX_SHADER = `
struct VertexInput {
  @location(0) a_position: vec2f,
  @location(1) a_color: vec3f,
}

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) v_color: vec3f,
  @location(1) v_center: vec2f,
  @location(2) v_radius: f32,
}

struct Uniforms {
  u_time: f32,
  _pad: f32,
  u_resolution: vec2f,
  u_mouse: vec2f,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

@vertex
fn main(input: VertexInput, @builtin(vertex_index) vertexIndex: u32, @builtin(instance_index) instanceIndex: u32) -> VertexOutput {
  var output: VertexOutput;

  let aspect = uniforms.u_resolution.x / uniforms.u_resolution.y;

  // Convert mouse to normalized coords
  var mouseNorm = (uniforms.u_mouse / uniforms.u_resolution) * 2.0 - 1.0;
  mouseNorm.y = -mouseNorm.y;

  // Calculate particle properties based on instance
  let particleCount = 24u;
  let fi = f32(instanceIndex);
  let baseAngle = fi * 6.283185 / f32(particleCount);

  // Multiple orbit rings
  let ring = instanceIndex % 3u;
  let ringRadius = 0.25 + f32(ring) * 0.2;

  // Different speeds per ring
  let speed = 0.8 - f32(ring) * 0.2;
  let angle = baseAngle + uniforms.u_time * speed;

  // Calculate orbit center (follows mouse with lag)
  let orbitCenter = mouseNorm * 0.4;

  // Particle center position on orbit
  var particleCenter = vec2f(
    orbitCenter.x + cos(angle) * ringRadius,
    orbitCenter.y + sin(angle) * ringRadius
  );

  // Add some wobble to individual particles
  particleCenter.x += sin(uniforms.u_time * 3.0 + fi * 0.5) * 0.02;
  particleCenter.y += cos(uniforms.u_time * 2.5 + fi * 0.7) * 0.02;

  // Particle size varies with ring and pulses
  let baseSize = 0.06 - f32(ring) * 0.015;
  let size = baseSize * (0.8 + 0.2 * sin(uniforms.u_time * 4.0 + fi));

  // Apply vertex position (quad corners) around particle center
  var pos = particleCenter + input.a_position * size;
  pos.x /= aspect;

  output.position = vec4f(pos, 0.0, 1.0);

  // Color based on ring and angle
  let hue = fract(fi / f32(particleCount) + uniforms.u_time * 0.1);
  let saturation = 0.8 + 0.2 * sin(uniforms.u_time + fi);

  // HSV to RGB conversion
  let c = saturation;
  let x = c * (1.0 - abs(fract(hue * 6.0) * 2.0 - 1.0));
  let m = 0.3;

  var rgb: vec3f;
  let h6 = hue * 6.0;
  if (h6 < 1.0) { rgb = vec3f(c, x, 0.0); }
  else if (h6 < 2.0) { rgb = vec3f(x, c, 0.0); }
  else if (h6 < 3.0) { rgb = vec3f(0.0, c, x); }
  else if (h6 < 4.0) { rgb = vec3f(0.0, x, c); }
  else if (h6 < 5.0) { rgb = vec3f(x, 0.0, c); }
  else { rgb = vec3f(c, 0.0, x); }

  output.v_color = rgb + m;
  output.v_center = particleCenter;
  output.v_radius = size;

  return output;
}
`;

const PARTICLE_FRAGMENT_SHADER = `
struct Uniforms {
  u_time: f32,
  _pad: f32,
  u_resolution: vec2f,
  u_mouse: vec2f,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

@fragment
fn main(
  @location(0) v_color: vec3f,
  @location(1) v_center: vec2f,
  @location(2) v_radius: f32,
  @builtin(position) fragCoord: vec4f
) -> @location(0) vec4f {
  // Convert fragment coord to normalized space
  let uv = (fragCoord.xy / uniforms.u_resolution) * 2.0 - 1.0;
  let aspect = uniforms.u_resolution.x / uniforms.u_resolution.y;

  // Calculate distance from particle center for soft circle
  var adjustedCenter = v_center;
  adjustedCenter.x /= aspect;
  var adjustedUV = vec2f(uv.x, -uv.y);

  let dist = length(adjustedUV - adjustedCenter);
  let edge = v_radius / aspect;

  // Soft circle with glow
  let alpha = 1.0 - smoothstep(edge * 0.3, edge, dist);
  let glow = exp(-dist * dist * 50.0) * 0.5;

  // Add shimmer effect
  let shimmer = 0.1 * sin(uniforms.u_time * 10.0 + fragCoord.x * 0.1 + fragCoord.y * 0.1);

  var color = v_color * (1.0 + shimmer);
  color += vec3f(glow);

  return vec4f(clamp(color, vec3f(0.0), vec3f(1.0)), alpha + glow * 0.5);
}
`;

function createParticleQuadGeometry(): { positions: Float32Array; colors: Float32Array } {
  const positions = new Float32Array([-1, -1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1]);
  const colorsArr = new Float32Array([1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]);

  return { positions, colors: colorsArr };
}

type ParticleResources = {
  pipeline: GPURenderPipeline;
  positionBuffer: GPUBuffer;
  colorBuffer: GPUBuffer;
  uniformBuffer: GPUBuffer;
  bindGroup: GPUBindGroup;
  vertexCount: number;
  instanceCount: number;
};

class ParticleHost implements WebGPUHost {
  private renderTexture: RenderTexture;
  private resources: ParticleResources | null = null;
  private ready = false;

  constructor(
    private device: GPUDevice,
    private format: GPUTextureFormat,
    width: number,
    height: number
  ) {
    this.renderTexture = createRenderTexture(device, width, height, format);
    this.initAsync();
  }

  private async initAsync(): Promise<void> {
    this.resources = this.initResources();
    await new Promise((resolve) => setTimeout(resolve, 0));
    this.ready = true;
  }

  private initResources(): ParticleResources {
    const { device, format } = this;

    const { positions, colors: colorsData } = createParticleQuadGeometry();
    const particleCount = 24;

    const positionBuffer = device.createBuffer({
      size: positions.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(positionBuffer, 0, positions);

    const colorBuffer = device.createBuffer({
      size: colorsData.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(colorBuffer, 0, colorsData);

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

    const vertexModule = device.createShaderModule({ code: PARTICLE_VERTEX_SHADER });
    const fragmentModule = device.createShaderModule({ code: PARTICLE_FRAGMENT_SHADER });

    const pipeline = device.createRenderPipeline({
      layout: pipelineLayout,
      vertex: {
        module: vertexModule,
        entryPoint: "main",
        buffers: [
          {
            arrayStride: 8,
            attributes: [{ shaderLocation: 0, offset: 0, format: "float32x2" }],
          },
          {
            arrayStride: 12,
            attributes: [{ shaderLocation: 1, offset: 0, format: "float32x3" }],
          },
        ],
      },
      fragment: {
        module: fragmentModule,
        entryPoint: "main",
        targets: [
          {
            format,
            blend: {
              color: {
                srcFactor: "src-alpha",
                dstFactor: "one-minus-src-alpha",
                operation: "add",
              },
              alpha: {
                srcFactor: "one",
                dstFactor: "one-minus-src-alpha",
                operation: "add",
              },
            },
          },
        ],
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
      uniformBuffer,
      bindGroup,
      vertexCount: 6,
      instanceCount: particleCount,
    };
  }

  resize(width: number, height: number): void {
    if (width <= 0 || height <= 0) {
      return;
    }
    this.renderTexture.resize(width, height);
  }

  render(input: WebGPUHostInput, encoder: GPUCommandEncoder): void {
    if (!this.ready || !this.resources) {
      return;
    }

    const { time, mouseX, mouseY, width, height } = input;

    const uniformData = new Float32Array([time, 0, width, height, mouseX, mouseY, 0, 0]);
    this.device.queue.writeBuffer(this.resources.uniformBuffer, 0, uniformData);

    const textureView = this.renderTexture.textureView;

    const renderPass = encoder.beginRenderPass({
      colorAttachments: [
        {
          view: textureView,
          clearValue: { r: 0.02, g: 0.02, b: 0.05, a: 1.0 },
          loadOp: "clear",
          storeOp: "store",
        },
      ],
    });

    renderPass.setPipeline(this.resources.pipeline);
    renderPass.setBindGroup(0, this.resources.bindGroup);
    renderPass.setVertexBuffer(0, this.resources.positionBuffer);
    renderPass.setVertexBuffer(1, this.resources.colorBuffer);
    renderPass.draw(this.resources.vertexCount, this.resources.instanceCount);
    renderPass.end();
  }

  getTexture(): RenderTexture {
    return this.renderTexture;
  }

  destroy(): void {
    this.renderTexture.destroy();
    if (this.resources) {
      this.resources.positionBuffer.destroy();
      this.resources.colorBuffer.destroy();
      this.resources.uniformBuffer.destroy();
    }
  }
}

function createParticleHost(
  device: GPUDevice,
  format: GPUTextureFormat,
  width: number,
  height: number
): WebGPUHost {
  return new ParticleHost(device, format, width, height);
}

// ============================================================================
// RAYMARCH DEMO
// ============================================================================

const RAYMARCH_VERTEX_SHADER = `
struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) v_uv: vec2f,
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
  output.v_uv = pos[vertexIndex] * 0.5 + 0.5;

  return output;
}
`;

const RAYMARCH_FRAGMENT_SHADER = `
struct Uniforms {
  u_time: f32,
  _pad: f32,
  u_resolution: vec2f,
  u_mouse: vec2f,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

const PI: f32 = 3.14159265359;
const MAX_STEPS: i32 = 100;
const MAX_DIST: f32 = 100.0;
const SURF_DIST: f32 = 0.001;

// Rotation matrices
fn rotateX(a: f32) -> mat3x3f {
  let s = sin(a);
  let c = cos(a);
  return mat3x3f(
    vec3f(1.0, 0.0, 0.0),
    vec3f(0.0, c, -s),
    vec3f(0.0, s, c)
  );
}

fn rotateY(a: f32) -> mat3x3f {
  let s = sin(a);
  let c = cos(a);
  return mat3x3f(
    vec3f(c, 0.0, s),
    vec3f(0.0, 1.0, 0.0),
    vec3f(-s, 0.0, c)
  );
}

fn rotateZ(a: f32) -> mat3x3f {
  let s = sin(a);
  let c = cos(a);
  return mat3x3f(
    vec3f(c, -s, 0.0),
    vec3f(s, c, 0.0),
    vec3f(0.0, 0.0, 1.0)
  );
}

// SDF primitives
fn sdSphere(p: vec3f, r: f32) -> f32 {
  return length(p) - r;
}

fn sdBox(p: vec3f, b: vec3f) -> f32 {
  let q = abs(p) - b;
  return length(max(q, vec3f(0.0))) + min(max(q.x, max(q.y, q.z)), 0.0);
}

fn sdTorus(p: vec3f, t: vec2f) -> f32 {
  let q = vec2f(length(p.xz) - t.x, p.y);
  return length(q) - t.y;
}

fn sdOctahedron(p: vec3f, s: f32) -> f32 {
  let q = abs(p);
  return (q.x + q.y + q.z - s) * 0.57735027;
}

fn sdCapsule(p: vec3f, a: vec3f, b: vec3f, r: f32) -> f32 {
  let pa = p - a;
  let ba = b - a;
  let h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h) - r;
}

// SDF operations
fn opUnion(d1: f32, d2: f32) -> f32 {
  return min(d1, d2);
}

fn opSubtract(d1: f32, d2: f32) -> f32 {
  return max(-d1, d2);
}

fn opIntersect(d1: f32, d2: f32) -> f32 {
  return max(d1, d2);
}

fn opSmoothUnion(d1: f32, d2: f32, k: f32) -> f32 {
  let h = clamp(0.5 + 0.5 * (d2 - d1) / k, 0.0, 1.0);
  return mix(d2, d1, h) - k * h * (1.0 - h);
}

fn opSmoothSubtract(d1: f32, d2: f32, k: f32) -> f32 {
  let h = clamp(0.5 - 0.5 * (d2 + d1) / k, 0.0, 1.0);
  return mix(d2, -d1, h) + k * h * (1.0 - h);
}

// Repetition
fn opRep(p: vec3f, c: vec3f) -> vec3f {
  return ((p + 0.5 * c) % c) - 0.5 * c;
}

// Hash and noise for procedural details
fn hash3(p: vec3f) -> f32 {
  var q = fract(p * 0.1031);
  q += dot(q, q.yzx + 33.33);
  return fract((q.x + q.y) * q.z);
}

// Scene SDF - returns distance and material ID
fn sceneSDF(p: vec3f, t: f32) -> vec2f {
  // Animated rotation
  let rot = rotateY(t * 0.3) * rotateX(t * 0.2);

  // Central morphing shape
  var centralP = p * rot;

  // Morph between shapes based on time
  let morphPhase = sin(t * 0.5) * 0.5 + 0.5;
  let sphere = sdSphere(centralP, 0.8);
  let box = sdBox(centralP, vec3f(0.6));
  let octahedron = sdOctahedron(centralP, 1.2);

  // Blend between shapes
  var central: f32;
  if (morphPhase < 0.5) {
    central = mix(sphere, box, morphPhase * 2.0);
  } else {
    central = mix(box, octahedron, (morphPhase - 0.5) * 2.0);
  }

  // Add twist deformation
  let twist = sin(centralP.y * 2.0 + t) * 0.2;
  let twistedP = vec3f(
    centralP.x * cos(twist) - centralP.z * sin(twist),
    centralP.y,
    centralP.x * sin(twist) + centralP.z * cos(twist)
  );
  let twistedBox = sdBox(twistedP, vec3f(0.5, 1.0, 0.5));
  central = opSmoothUnion(central, twistedBox, 0.3);

  // Orbiting torus
  let torusAngle = t * 0.7;
  let torusOffset = vec3f(cos(torusAngle) * 2.0, sin(t * 0.5) * 0.5, sin(torusAngle) * 2.0);
  let torusP = (p - torusOffset) * rotateX(t * 0.8) * rotateZ(t * 0.6);
  let torus = sdTorus(torusP, vec2f(0.4, 0.15));

  // Second orbiting torus (opposite direction)
  let torus2Angle = -t * 0.5 + PI;
  let torus2Offset = vec3f(cos(torus2Angle) * 2.5, cos(t * 0.3) * 0.8, sin(torus2Angle) * 2.5);
  let torus2P = (p - torus2Offset) * rotateY(t * 0.9) * rotateX(t * 0.4);
  let torus2 = sdTorus(torus2P, vec2f(0.3, 0.1));

  // Floating spheres
  var spheres = MAX_DIST;
  for (var i = 0; i < 6; i++) {
    let fi = f32(i);
    let angle = fi * PI * 2.0 / 6.0 + t * (0.2 + fi * 0.05);
    let radius = 1.8 + sin(t * 0.7 + fi) * 0.3;
    let height = sin(t * 0.5 + fi * 1.2) * 0.8;
    let spherePos = vec3f(cos(angle) * radius, height, sin(angle) * radius);
    let sphereSize = 0.15 + 0.05 * sin(t * 2.0 + fi * 0.8);
    spheres = opSmoothUnion(spheres, sdSphere(p - spherePos, sphereSize), 0.2);
  }

  // Ground plane with waves
  let groundWave = sin(p.x * 2.0 + t) * 0.1 + sin(p.z * 2.0 + t * 0.7) * 0.1;
  let ground = p.y + 2.0 + groundWave;

  // Combine scene
  var d = central;
  var mat = 1.0; // Material ID

  if (torus < d) {
    d = torus;
    mat = 2.0;
  }

  if (torus2 < d) {
    d = torus2;
    mat = 3.0;
  }

  if (spheres < d) {
    d = spheres;
    mat = 4.0;
  }

  // Smooth union with ground
  let groundBlend = opSmoothUnion(d, ground, 0.5);
  if (ground < d + 0.3) {
    mat = mix(mat, 5.0, smoothstep(d, d + 0.3, ground));
  }
  d = groundBlend;

  return vec2f(d, mat);
}

// Calculate normal using gradient
fn calcNormal(p: vec3f, t: f32) -> vec3f {
  let e = vec2f(0.001, 0.0);
  return normalize(vec3f(
    sceneSDF(p + e.xyy, t).x - sceneSDF(p - e.xyy, t).x,
    sceneSDF(p + e.yxy, t).x - sceneSDF(p - e.yxy, t).x,
    sceneSDF(p + e.yyx, t).x - sceneSDF(p - e.yyx, t).x
  ));
}

// Soft shadows
fn softShadow(ro: vec3f, rd: vec3f, mint: f32, maxt: f32, k: f32, t: f32) -> f32 {
  var res = 1.0;
  var ph = 1e20;
  var st = mint;

  for (var i = 0; i < 32; i++) {
    let h = sceneSDF(ro + rd * st, t).x;
    if (h < 0.001) {
      return 0.0;
    }
    let y = h * h / (2.0 * ph);
    let d = sqrt(h * h - y * y);
    res = min(res, k * d / max(0.0, st - y));
    ph = h;
    st += h;
    if (st > maxt) {
      break;
    }
  }

  return res;
}

// Ambient occlusion
fn calcAO(pos: vec3f, nor: vec3f, t: f32) -> f32 {
  var occ = 0.0;
  var sca = 1.0;

  for (var i = 0; i < 5; i++) {
    let h = 0.01 + 0.12 * f32(i) / 4.0;
    let d = sceneSDF(pos + h * nor, t).x;
    occ += (h - d) * sca;
    sca *= 0.95;
  }

  return clamp(1.0 - 3.0 * occ, 0.0, 1.0);
}

// Palette for materials
fn getMaterialColor(mat: f32, p: vec3f, t: f32) -> vec3f {
  if (mat < 1.5) {
    // Central shape - iridescent
    let n = normalize(p);
    let angle = atan2(n.z, n.x) / PI * 0.5 + 0.5;
    return vec3f(
      0.5 + 0.5 * sin(angle * 6.28 + t),
      0.5 + 0.5 * sin(angle * 6.28 + t + 2.094),
      0.5 + 0.5 * sin(angle * 6.28 + t + 4.188)
    );
  } else if (mat < 2.5) {
    // Torus 1 - gold
    return vec3f(1.0, 0.8, 0.3);
  } else if (mat < 3.5) {
    // Torus 2 - cyan
    return vec3f(0.2, 0.8, 0.9);
  } else if (mat < 4.5) {
    // Spheres - purple/pink
    return vec3f(0.8, 0.3, 0.7);
  } else {
    // Ground - checker pattern
    let checker = floor(p.x) + floor(p.z);
    let check = ((checker % 2.0) + 2.0) % 2.0;
    return mix(vec3f(0.1, 0.1, 0.15), vec3f(0.2, 0.2, 0.25), check);
  }
}

// Main raymarching
fn rayMarch(ro: vec3f, rd: vec3f, t: f32) -> vec2f {
  var dO = 0.0;
  var mat = 0.0;

  for (var i = 0; i < MAX_STEPS; i++) {
    let p = ro + rd * dO;
    let result = sceneSDF(p, t);
    let dS = result.x;
    mat = result.y;
    dO += dS;

    if (dO > MAX_DIST || dS < SURF_DIST) {
      break;
    }
  }

  return vec2f(dO, mat);
}

@fragment
fn main(@location(0) v_uv: vec2f) -> @location(0) vec4f {
  let aspect = uniforms.u_resolution.x / uniforms.u_resolution.y;
  var uv = v_uv * 2.0 - 1.0;
  uv.x *= aspect;

  let t = uniforms.u_time;

  // Mouse influence on camera
  var mouseNorm = (uniforms.u_mouse / uniforms.u_resolution) * 2.0 - 1.0;

  // Camera setup
  let camDist = 5.0;
  let camHeight = 1.5 + mouseNorm.y * 1.0;
  let camAngle = t * 0.2 + mouseNorm.x * 0.5;

  let ro = vec3f(
    sin(camAngle) * camDist,
    camHeight,
    cos(camAngle) * camDist
  );
  let lookAt = vec3f(0.0, 0.0, 0.0);

  // Camera matrix
  let forward = normalize(lookAt - ro);
  let right = normalize(cross(vec3f(0.0, 1.0, 0.0), forward));
  let up = cross(forward, right);

  let rd = normalize(uv.x * right + uv.y * up + 1.5 * forward);

  // Raymarch
  let result = rayMarch(ro, rd, t);
  let d = result.x;
  let mat = result.y;

  var col = vec3f(0.02, 0.02, 0.05); // Background

  if (d < MAX_DIST) {
    let p = ro + rd * d;
    let n = calcNormal(p, t);

    // Material color
    let albedo = getMaterialColor(mat, p, t);

    // Lighting
    let lightPos = vec3f(3.0, 5.0, 2.0);
    let lightDir = normalize(lightPos - p);
    let viewDir = normalize(ro - p);
    let halfDir = normalize(lightDir + viewDir);

    // Diffuse
    let diff = max(dot(n, lightDir), 0.0);

    // Specular (Blinn-Phong)
    let spec = pow(max(dot(n, halfDir), 0.0), 32.0);

    // Shadows
    let shadow = softShadow(p + n * 0.02, lightDir, 0.02, 10.0, 16.0, t);

    // Ambient occlusion
    let ao = calcAO(p, n, t);

    // Fresnel
    let fresnel = pow(1.0 - max(dot(n, viewDir), 0.0), 3.0);

    // Combine lighting
    let ambient = vec3f(0.1, 0.12, 0.15) * ao;
    let diffuse = albedo * diff * shadow;
    let specular = vec3f(1.0) * spec * shadow * 0.5;
    let rim = vec3f(0.3, 0.5, 0.8) * fresnel * 0.3;

    col = ambient + diffuse + specular + rim;

    // Fog
    let fog = 1.0 - exp(-d * 0.05);
    col = mix(col, vec3f(0.02, 0.02, 0.05), fog);
  }

  // Tone mapping and gamma
  col = col / (col + vec3f(1.0));
  col = pow(col, vec3f(0.4545));

  return vec4f(col, 1.0);
}
`;

type RaymarchResources = {
  pipeline: GPURenderPipeline;
  uniformBuffer: GPUBuffer;
  bindGroup: GPUBindGroup;
};

class RaymarchHost implements WebGPUHost {
  private renderTexture: RenderTexture;
  private resources: RaymarchResources | null = null;
  private ready = false;

  constructor(
    private device: GPUDevice,
    private format: GPUTextureFormat,
    width: number,
    height: number
  ) {
    this.renderTexture = createRenderTexture(device, width, height, format);
    this.initAsync();
  }

  private async initAsync(): Promise<void> {
    this.resources = this.initResources();
    await new Promise((resolve) => setTimeout(resolve, 0));
    this.ready = true;
  }

  private initResources(): RaymarchResources {
    const { device, format } = this;

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

    const vertexModule = device.createShaderModule({ code: RAYMARCH_VERTEX_SHADER });
    const fragmentModule = device.createShaderModule({ code: RAYMARCH_FRAGMENT_SHADER });

    const pipeline = device.createRenderPipeline({
      layout: pipelineLayout,
      vertex: {
        module: vertexModule,
        entryPoint: "main",
        buffers: [],
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
      uniformBuffer,
      bindGroup,
    };
  }

  resize(width: number, height: number): void {
    if (width <= 0 || height <= 0) {
      return;
    }
    this.renderTexture.resize(width, height);
  }

  render(input: WebGPUHostInput, encoder: GPUCommandEncoder): void {
    if (!this.ready || !this.resources) {
      return;
    }

    const { time, mouseX, mouseY, width, height } = input;

    const uniformData = new Float32Array([time, 0, width, height, mouseX, mouseY, 0, 0]);
    this.device.queue.writeBuffer(this.resources.uniformBuffer, 0, uniformData);

    const textureView = this.renderTexture.textureView;

    const renderPass = encoder.beginRenderPass({
      colorAttachments: [
        {
          view: textureView,
          clearValue: { r: 0.02, g: 0.02, b: 0.05, a: 1.0 },
          loadOp: "clear",
          storeOp: "store",
        },
      ],
    });

    renderPass.setPipeline(this.resources.pipeline);
    renderPass.setBindGroup(0, this.resources.bindGroup);
    renderPass.draw(3);
    renderPass.end();
  }

  getTexture(): RenderTexture {
    return this.renderTexture;
  }

  destroy(): void {
    this.renderTexture.destroy();
    if (this.resources) {
      this.resources.uniformBuffer.destroy();
    }
  }
}

function createRaymarchHost(
  device: GPUDevice,
  format: GPUTextureFormat,
  width: number,
  height: number
): WebGPUHost {
  return new RaymarchHost(device, format, width, height);
}

// ============================================================================
// TERRAIN DEMO
// ============================================================================

const TERRAIN_VERTEX_SHADER = `
struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) v_uv: vec2f,
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
  output.v_uv = pos[vertexIndex] * 0.5 + 0.5;

  return output;
}
`;

const TERRAIN_FRAGMENT_SHADER = `
struct Uniforms {
  u_time: f32,
  _pad: f32,
  u_resolution: vec2f,
  u_mouse: vec2f,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

const PI: f32 = 3.14159265359;
const MAX_STEPS: i32 = 128;
const MAX_DIST: f32 = 150.0;
const SURF_DIST: f32 = 0.002;
const WATER_LEVEL: f32 = 0.0;

// Hash functions for noise
fn hash(p: f32) -> f32 {
  var p2 = fract(p * 0.1031);
  p2 *= p2 + 33.33;
  p2 *= p2 + p2;
  return fract(p2);
}

fn hash2(p: vec2f) -> f32 {
  var p3 = fract(vec3f(p.x, p.y, p.x) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

fn hash3(p: vec3f) -> f32 {
  var q = fract(p * 0.1031);
  q += dot(q, q.yzx + 33.33);
  return fract((q.x + q.y) * q.z);
}

// Smooth noise
fn noise2(p: vec2f) -> f32 {
  let i = floor(p);
  let f = fract(p);
  let u = f * f * (3.0 - 2.0 * f);

  return mix(
    mix(hash2(i + vec2f(0.0, 0.0)), hash2(i + vec2f(1.0, 0.0)), u.x),
    mix(hash2(i + vec2f(0.0, 1.0)), hash2(i + vec2f(1.0, 1.0)), u.x),
    u.y
  );
}

// FBM (Fractal Brownian Motion) for terrain
fn fbm(p: vec2f, octaves: i32) -> f32 {
  var value = 0.0;
  var amplitude = 0.5;
  var frequency = 1.0;
  var maxValue = 0.0;
  var pos = p;

  for (var i = 0; i < octaves; i++) {
    value += amplitude * noise2(pos * frequency);
    maxValue += amplitude;
    amplitude *= 0.5;
    frequency *= 2.0;
    // Rotate each octave for more natural look
    pos = vec2f(pos.x * 0.8 - pos.y * 0.6, pos.x * 0.6 + pos.y * 0.8);
  }

  return value / maxValue;
}

// Terrain height function
fn terrainHeight(p: vec2f) -> f32 {
  let t = uniforms.u_time * 0.05;

  // Base terrain with multiple scales
  var h = fbm(p * 0.1, 8) * 4.0;

  // Add ridges
  let ridge = abs(fbm(p * 0.15 + vec2f(100.0), 6) - 0.5) * 2.0;
  h += ridge * ridge * 2.0;

  // Mountains in the distance
  let mountains = pow(fbm(p * 0.05 + vec2f(50.0), 5), 2.0) * 8.0;
  h += mountains;

  // Subtle animation
  h += sin(p.x * 0.1 + t) * cos(p.y * 0.1 + t * 0.7) * 0.2;

  return h - 2.0; // Offset to get water at y=0
}

// Water waves
fn waterHeight(p: vec2f, t: f32) -> f32 {
  var h = 0.0;

  // Multiple wave layers
  h += sin(p.x * 0.5 + t * 2.0) * 0.02;
  h += sin(p.y * 0.7 + t * 1.5) * 0.015;
  h += sin((p.x + p.y) * 0.3 + t * 2.5) * 0.01;
  h += sin((p.x - p.y) * 0.4 + t * 1.8) * 0.008;

  // High frequency ripples
  h += sin(p.x * 2.0 + t * 4.0) * sin(p.y * 2.0 + t * 3.5) * 0.005;

  return WATER_LEVEL + h;
}

// Calculate terrain normal
fn terrainNormal(p: vec2f) -> vec3f {
  let e = 0.01;
  let h = terrainHeight(p);
  let hx = terrainHeight(p + vec2f(e, 0.0));
  let hz = terrainHeight(p + vec2f(0.0, e));

  return normalize(vec3f(h - hx, e, h - hz));
}

// Calculate water normal
fn waterNormal(p: vec2f, t: f32) -> vec3f {
  let e = 0.01;
  let h = waterHeight(p, t);
  let hx = waterHeight(p + vec2f(e, 0.0), t);
  let hz = waterHeight(p + vec2f(0.0, e), t);

  return normalize(vec3f(h - hx, e, h - hz));
}

// Sky color based on direction
fn skyColor(rd: vec3f, sunDir: vec3f, t: f32) -> vec3f {
  // Base sky gradient
  let skyUp = vec3f(0.2, 0.4, 0.8);
  let skyHorizon = vec3f(0.7, 0.8, 0.95);
  let sky = mix(skyHorizon, skyUp, max(rd.y, 0.0));

  // Sun
  let sunDot = max(dot(rd, sunDir), 0.0);
  let sun = pow(sunDot, 256.0) * vec3f(1.0, 0.95, 0.8) * 2.0;
  let sunGlow = pow(sunDot, 8.0) * vec3f(1.0, 0.7, 0.3) * 0.5;

  // Clouds
  let cloudPos = rd.xz / (rd.y + 0.1) * 2.0 + t * 0.1;
  let clouds = fbm(cloudPos, 5);
  let cloudShape = smoothstep(0.4, 0.7, clouds);
  let cloudColor = mix(vec3f(0.9, 0.9, 0.95), vec3f(1.0), cloudShape);

  var finalSky = sky + sun + sunGlow;
  finalSky = mix(finalSky, cloudColor, cloudShape * 0.6 * smoothstep(0.0, 0.3, rd.y));

  // Sunset colors near horizon
  let sunset = vec3f(1.0, 0.5, 0.2) * pow(1.0 - abs(rd.y), 8.0) * 0.3;
  finalSky += sunset;

  return finalSky;
}

// Terrain material
fn terrainColor(p: vec3f, n: vec3f) -> vec3f {
  let h = p.y;
  let slope = 1.0 - n.y;

  // Base colors
  let grass = vec3f(0.2, 0.35, 0.1);
  let rock = vec3f(0.4, 0.35, 0.3);
  let snow = vec3f(0.95, 0.95, 1.0);
  let sand = vec3f(0.76, 0.7, 0.5);
  let dirt = vec3f(0.3, 0.25, 0.2);

  // Height-based coloring
  var col = sand; // Beach

  if (h > 0.3) {
    col = mix(sand, grass, smoothstep(0.3, 0.8, h));
  }
  if (h > 1.5) {
    col = mix(col, dirt, smoothstep(1.5, 2.5, h));
  }
  if (h > 3.0) {
    col = mix(col, rock, smoothstep(3.0, 4.0, h));
  }
  if (h > 5.0) {
    col = mix(col, snow, smoothstep(5.0, 6.0, h));
  }

  // Slope-based rock
  col = mix(col, rock, smoothstep(0.4, 0.7, slope));

  // Add some variation
  let variation = fbm(p.xz * 2.0, 4) * 0.2;
  col *= 0.9 + variation;

  return col;
}

// Raymarch terrain
fn raymarchTerrain(ro: vec3f, rd: vec3f) -> vec4f {
  var t = 0.0;
  var hit = false;
  var hitWater = false;
  var waterT = 0.0;

  // Check water plane intersection first
  if (rd.y < 0.0 && ro.y > WATER_LEVEL) {
    waterT = (WATER_LEVEL - ro.y) / rd.y;
    if (waterT > 0.0 && waterT < MAX_DIST) {
      hitWater = true;
    }
  }

  // Raymarch terrain
  for (var i = 0; i < MAX_STEPS; i++) {
    let p = ro + rd * t;

    if (t > MAX_DIST) {
      break;
    }

    let h = terrainHeight(p.xz);
    let d = p.y - h;

    if (d < SURF_DIST) {
      hit = true;
      break;
    }

    // Adaptive step size
    t += max(d * 0.5, 0.01);
  }

  // Return: x=terrain distance, y=water distance, z=hit terrain, w=hit water
  return vec4f(t, waterT, select(0.0, 1.0, hit), select(0.0, 1.0, hitWater));
}

// Soft shadow for terrain
fn terrainShadow(p: vec3f, lightDir: vec3f) -> f32 {
  var shadow = 1.0;
  var t = 0.1;

  for (var i = 0; i < 32; i++) {
    let pos = p + lightDir * t;
    let h = terrainHeight(pos.xz);
    let d = pos.y - h;

    if (d < 0.01) {
      return 0.0;
    }

    shadow = min(shadow, 8.0 * d / t);
    t += max(d * 0.5, 0.05);

    if (t > 20.0) {
      break;
    }
  }

  return clamp(shadow, 0.0, 1.0);
}

@fragment
fn main(@location(0) v_uv: vec2f) -> @location(0) vec4f {
  let aspect = uniforms.u_resolution.x / uniforms.u_resolution.y;
  var uv = v_uv * 2.0 - 1.0;
  uv.x *= aspect;

  let t = uniforms.u_time;

  // Mouse influence on camera
  var mouseNorm = (uniforms.u_mouse / uniforms.u_resolution) * 2.0 - 1.0;

  // Camera setup - flying over terrain
  let camSpeed = t * 0.5;
  let camPath = vec2f(
    sin(camSpeed * 0.3) * 20.0,
    camSpeed * 3.0
  );

  let camHeight = 3.0 + sin(t * 0.2) * 1.0 + mouseNorm.y * 2.0;
  let terrainH = terrainHeight(camPath);
  let ro = vec3f(camPath.x, max(terrainH + 2.0, camHeight), camPath.y);

  // Look direction
  let lookAhead = vec2f(
    sin(camSpeed * 0.3 + 0.5) * 20.0,
    camSpeed * 3.0 + 10.0
  );
  let lookAtHeight = terrainHeight(lookAhead);
  let lookAt = vec3f(lookAhead.x + mouseNorm.x * 5.0, lookAtHeight + 1.0, lookAhead.y);

  // Camera matrix
  let forward = normalize(lookAt - ro);
  let right = normalize(cross(vec3f(0.0, 1.0, 0.0), forward));
  let up = cross(forward, right);

  let rd = normalize(uv.x * right + uv.y * up + 1.8 * forward);

  // Sun direction
  let sunAngle = t * 0.1;
  let sunDir = normalize(vec3f(cos(sunAngle), 0.4 + sin(t * 0.05) * 0.1, sin(sunAngle)));

  // Raymarch
  let result = raymarchTerrain(ro, rd);
  let terrainT = result.x;
  let waterT = result.y;
  let hitTerrain = result.z > 0.5;
  let hitWater = result.w > 0.5;

  var col = skyColor(rd, sunDir, t);

  // Determine what we hit first
  let showWater = hitWater && (!hitTerrain || waterT < terrainT);
  let showTerrain = hitTerrain && (!hitWater || terrainT < waterT);

  if (showTerrain) {
    let p = ro + rd * terrainT;
    let n = terrainNormal(p.xz);

    // Material
    let albedo = terrainColor(p, n);

    // Lighting
    let diff = max(dot(n, sunDir), 0.0);
    let shadow = terrainShadow(p + n * 0.1, sunDir);

    // Ambient
    let ambient = vec3f(0.3, 0.4, 0.5) * (0.5 + 0.5 * n.y);

    // Combine
    col = albedo * (ambient + vec3f(1.0, 0.95, 0.8) * diff * shadow);

    // Fog
    let fog = 1.0 - exp(-terrainT * 0.015);
    let fogColor = mix(vec3f(0.5, 0.6, 0.7), skyColor(rd, sunDir, t), 0.5);
    col = mix(col, fogColor, fog);
  }

  if (showWater) {
    let p = ro + rd * waterT;
    let wn = waterNormal(p.xz, t);

    // Fresnel
    let fresnel = pow(1.0 - max(dot(-rd, wn), 0.0), 4.0);

    // Reflection
    let reflDir = reflect(rd, wn);
    var reflCol = skyColor(reflDir, sunDir, t);

    // Check if reflection hits terrain
    let reflResult = raymarchTerrain(p + wn * 0.1, reflDir);
    if (reflResult.z > 0.5 && reflResult.x < 50.0) {
      let reflP = p + reflDir * reflResult.x;
      let reflN = terrainNormal(reflP.xz);
      let reflAlbedo = terrainColor(reflP, reflN);
      let reflDiff = max(dot(reflN, sunDir), 0.0);
      reflCol = reflAlbedo * (vec3f(0.3, 0.4, 0.5) + vec3f(1.0, 0.95, 0.8) * reflDiff * 0.5);

      // Fog on reflection
      let reflFog = 1.0 - exp(-reflResult.x * 0.02);
      reflCol = mix(reflCol, skyColor(reflDir, sunDir, t), reflFog);
    }

    // Water color (deep blue-green)
    let waterCol = vec3f(0.1, 0.3, 0.4);

    // Specular highlight
    let halfDir = normalize(sunDir - rd);
    let spec = pow(max(dot(wn, halfDir), 0.0), 128.0) * 2.0;

    // Combine water
    col = mix(waterCol, reflCol, fresnel * 0.8);
    col += vec3f(1.0, 0.95, 0.8) * spec;

    // Fog
    let fog = 1.0 - exp(-waterT * 0.01);
    let fogColor = mix(vec3f(0.5, 0.6, 0.7), skyColor(rd, sunDir, t), 0.5);
    col = mix(col, fogColor, fog);
  }

  // Tone mapping
  col = col / (col + vec3f(1.0));

  // Vignette
  let vignette = 1.0 - length(v_uv - 0.5) * 0.5;
  col *= vignette;

  // Gamma correction
  col = pow(col, vec3f(0.4545));

  return vec4f(col, 1.0);
}
`;

type TerrainResources = {
  pipeline: GPURenderPipeline;
  uniformBuffer: GPUBuffer;
  bindGroup: GPUBindGroup;
};

class TerrainHost implements WebGPUHost {
  private renderTexture: RenderTexture;
  private resources: TerrainResources | null = null;
  private ready = false;

  constructor(
    private device: GPUDevice,
    private format: GPUTextureFormat,
    width: number,
    height: number
  ) {
    this.renderTexture = createRenderTexture(device, width, height, format);
    this.initAsync();
  }

  private async initAsync(): Promise<void> {
    this.resources = this.initResources();
    await new Promise((resolve) => setTimeout(resolve, 0));
    this.ready = true;
  }

  private initResources(): TerrainResources {
    const { device, format } = this;

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

    const vertexModule = device.createShaderModule({ code: TERRAIN_VERTEX_SHADER });
    const fragmentModule = device.createShaderModule({ code: TERRAIN_FRAGMENT_SHADER });

    const pipeline = device.createRenderPipeline({
      layout: pipelineLayout,
      vertex: {
        module: vertexModule,
        entryPoint: "main",
        buffers: [],
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
      uniformBuffer,
      bindGroup,
    };
  }

  resize(width: number, height: number): void {
    if (width <= 0 || height <= 0) {
      return;
    }
    this.renderTexture.resize(width, height);
  }

  render(input: WebGPUHostInput, encoder: GPUCommandEncoder): void {
    if (!this.ready || !this.resources) {
      return;
    }

    const { time, mouseX, mouseY, width, height } = input;

    const uniformData = new Float32Array([time, 0, width, height, mouseX, mouseY, 0, 0]);
    this.device.queue.writeBuffer(this.resources.uniformBuffer, 0, uniformData);

    const textureView = this.renderTexture.textureView;

    const renderPass = encoder.beginRenderPass({
      colorAttachments: [
        {
          view: textureView,
          clearValue: { r: 0.5, g: 0.6, b: 0.7, a: 1.0 },
          loadOp: "clear",
          storeOp: "store",
        },
      ],
    });

    renderPass.setPipeline(this.resources.pipeline);
    renderPass.setBindGroup(0, this.resources.bindGroup);
    renderPass.draw(3);
    renderPass.end();
  }

  getTexture(): RenderTexture {
    return this.renderTexture;
  }

  destroy(): void {
    this.renderTexture.destroy();
    if (this.resources) {
      this.resources.uniformBuffer.destroy();
    }
  }
}

function createTerrainHost(
  device: GPUDevice,
  format: GPUTextureFormat,
  width: number,
  height: number
): WebGPUHost {
  return new TerrainHost(device, format, width, height);
}

// ============================================================================
// GALAXY DEMO
// ============================================================================

const GALAXY_NUM_STARS = 8000;
const GALAXY_NUM_DUST = 2000;

const GALAXY_VERTEX_SHADER = `
struct Uniforms {
  u_time: f32,
  _pad: f32,
  u_resolution: vec2f,
  u_mouse: vec2f,
}

struct Star {
  position: vec2f,
  velocity: vec2f,
  color: vec3f,
  size: f32,
  age: f32,
  type_id: f32, // 0 = star, 1 = dust, 2 = core
}

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) v_color: vec3f,
  @location(1) v_uv: vec2f,
  @location(2) v_size: f32,
  @location(3) v_type: f32,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var<storage, read> stars: array<Star>;

@vertex
fn main(@builtin(vertex_index) vertexIndex: u32, @builtin(instance_index) instanceIndex: u32) -> VertexOutput {
  var output: VertexOutput;

  let star = stars[instanceIndex];
  let aspect = uniforms.u_resolution.x / uniforms.u_resolution.y;

  // Quad vertices for point sprite
  var quadPos: array<vec2f, 6> = array<vec2f, 6>(
    vec2f(-1.0, -1.0),
    vec2f(1.0, -1.0),
    vec2f(1.0, 1.0),
    vec2f(-1.0, -1.0),
    vec2f(1.0, 1.0),
    vec2f(-1.0, 1.0)
  );

  let localPos = quadPos[vertexIndex];
  let size = star.size * (0.8 + 0.2 * sin(uniforms.u_time * 3.0 + star.age * 10.0));

  var worldPos = star.position + localPos * size * 0.015;
  worldPos.x /= aspect;

  output.position = vec4f(worldPos, 0.0, 1.0);
  output.v_color = star.color;
  output.v_uv = localPos;
  output.v_size = size;
  output.v_type = star.type_id;

  return output;
}
`;

const GALAXY_FRAGMENT_SHADER = `
struct Uniforms {
  u_time: f32,
  _pad: f32,
  u_resolution: vec2f,
  u_mouse: vec2f,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

@fragment
fn main(
  @location(0) v_color: vec3f,
  @location(1) v_uv: vec2f,
  @location(2) v_size: f32,
  @location(3) v_type: f32
) -> @location(0) vec4f {
  let dist = length(v_uv);

  var alpha: f32;
  var color = v_color;

  if (v_type < 0.5) {
    // Star - bright core with soft glow
    let core = exp(-dist * dist * 8.0);
    let glow = exp(-dist * 1.5) * 0.5;
    let rays = (1.0 + 0.3 * sin(atan2(v_uv.y, v_uv.x) * 4.0 + uniforms.u_time)) * exp(-dist * 3.0) * 0.2;
    alpha = core + glow + rays;

    // Add chromatic aberration for larger stars
    if (v_size > 1.5) {
      let offset = 0.02;
      color.r *= 1.0 + offset * (1.0 - dist);
      color.b *= 1.0 - offset * (1.0 - dist);
    }
  } else if (v_type < 1.5) {
    // Dust - soft, diffuse
    alpha = exp(-dist * dist * 2.0) * 0.15;
    color *= 0.6;
  } else {
    // Core/black hole accretion disk
    let ring = smoothstep(0.3, 0.5, dist) * smoothstep(1.0, 0.7, dist);
    let glow = exp(-dist * 0.5) * 0.8;
    alpha = ring * 0.8 + glow;

    // Swirling colors in accretion disk
    let swirl = sin(atan2(v_uv.y, v_uv.x) * 3.0 - uniforms.u_time * 2.0 + dist * 5.0);
    color = mix(color, vec3f(1.0, 0.5, 0.2), swirl * 0.3 * ring);
  }

  // Add twinkle
  let twinkle = 0.9 + 0.1 * sin(uniforms.u_time * 10.0 + v_color.r * 100.0);
  alpha *= twinkle;

  return vec4f(color * alpha, alpha);
}
`;

const GALAXY_COMPUTE_SHADER = `
struct Uniforms {
  u_time: f32,
  u_deltaTime: f32,
  u_resolution: vec2f,
  u_mouse: vec2f,
  u_mouseActive: f32,
  _pad: f32,
}

struct Star {
  position: vec2f,
  velocity: vec2f,
  color: vec3f,
  size: f32,
  age: f32,
  type_id: f32,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var<storage, read_write> stars: array<Star>;

// Pseudo-random number generator
fn hash(p: vec2f) -> f32 {
  var p3 = fract(vec3f(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

fn hash2(p: vec2f) -> vec2f {
  return vec2f(hash(p), hash(p + vec2f(127.1, 311.7)));
}

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id: vec3u) {
  let idx = global_id.x;
  let numStars = arrayLength(&stars);

  if (idx >= numStars) {
    return;
  }

  var star = stars[idx];
  let dt = uniforms.u_deltaTime * 0.5;

  // Galaxy center
  let center = vec2f(0.0, 0.0);

  // Secondary gravitational center (mouse when active)
  var mouseNorm = (uniforms.u_mouse / uniforms.u_resolution) * 2.0 - 1.0;
  let aspect = uniforms.u_resolution.x / uniforms.u_resolution.y;
  mouseNorm.x *= aspect;


  // Vector to center
  let toCenter = center - star.position;
  let distToCenter = length(toCenter);
  let dirToCenter = toCenter / max(distToCenter, 0.001);

  // Gravitational force (inverse square with softening)
  let gravity = 0.5 / (distToCenter * distToCenter + 0.1);

  // Add centripetal acceleration for orbital motion
  var acc = dirToCenter * gravity;

  // Mouse attraction/repulsion
  if (uniforms.u_mouseActive > 0.5) {
    let toMouse = mouseNorm * 0.8 - star.position;
    let distToMouse = length(toMouse);
    let mouseGravity = 0.3 / (distToMouse * distToMouse + 0.05);
    acc += normalize(toMouse) * mouseGravity;
  }

  // Spiral arm perturbation
  let angle = atan2(star.position.y, star.position.x);
  let spiralPhase = angle * 2.0 - distToCenter * 3.0 + uniforms.u_time * 0.1;
  let spiralForce = sin(spiralPhase) * 0.02;
  let perpendicular = vec2f(-dirToCenter.y, dirToCenter.x);
  acc += perpendicular * spiralForce;

  // Apply velocity (orbital + perturbations)
  star.velocity += acc * dt;

  // Add slight damping to prevent runaway velocities
  star.velocity *= 0.999;

  // Clamp velocity
  let speed = length(star.velocity);
  if (speed > 2.0) {
    star.velocity = star.velocity / speed * 2.0;
  }

  // Update position
  star.position += star.velocity * dt;

  // Respawn stars that go too far
  if (length(star.position) > 2.5) {
    // Respawn in spiral pattern
    let spawnAngle = hash(vec2f(f32(idx), uniforms.u_time)) * 6.283;
    let spawnDist = 0.2 + hash(vec2f(f32(idx) + 100.0, uniforms.u_time)) * 1.3;

    star.position = vec2f(cos(spawnAngle), sin(spawnAngle)) * spawnDist;

    // Initial orbital velocity
    let orbitalSpeed = sqrt(0.5 / spawnDist) * 0.8;
    let orbitalDir = vec2f(-sin(spawnAngle), cos(spawnAngle));
    star.velocity = orbitalDir * orbitalSpeed;

    // Add some randomness
    star.velocity += (hash2(vec2f(f32(idx), uniforms.u_time * 0.1)) - 0.5) * 0.1;
  }

  // Update age for effects
  star.age += dt * 0.1;
  if (star.age > 1.0) {
    star.age = fract(star.age);
  }

  stars[idx] = star;
}
`;

const GALAXY_BG_VERTEX_SHADER = `
struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) v_uv: vec2f,
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
  output.v_uv = pos[vertexIndex] * 0.5 + 0.5;

  return output;
}
`;

const GALAXY_BG_FRAGMENT_SHADER = `
struct Uniforms {
  u_time: f32,
  _pad: f32,
  u_resolution: vec2f,
  u_mouse: vec2f,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

fn hash(p: vec2f) -> f32 {
  return fract(sin(dot(p, vec2f(127.1, 311.7))) * 43758.5453);
}

fn noise(p: vec2f) -> f32 {
  let i = floor(p);
  let f = fract(p);
  let u = f * f * (3.0 - 2.0 * f);

  return mix(
    mix(hash(i), hash(i + vec2f(1.0, 0.0)), u.x),
    mix(hash(i + vec2f(0.0, 1.0)), hash(i + vec2f(1.0, 1.0)), u.x),
    u.y
  );
}

fn fbm(p: vec2f) -> f32 {
  var value = 0.0;
  var amplitude = 0.5;
  var pt = p;

  for (var i = 0; i < 6; i++) {
    value += amplitude * noise(pt);
    pt *= 2.0;
    amplitude *= 0.5;
  }

  return value;
}

@fragment
fn main(@location(0) v_uv: vec2f) -> @location(0) vec4f {
  let aspect = uniforms.u_resolution.x / uniforms.u_resolution.y;
  var uv = v_uv * 2.0 - 1.0;
  uv.x *= aspect;

  let t = uniforms.u_time * 0.05;

  // Multiple layers of nebula
  var nebula = vec3f(0.0);

  // Deep space blue/purple nebula
  let n1 = fbm(uv * 1.5 + t * 0.3);
  let n2 = fbm(uv * 2.0 - t * 0.2 + 100.0);
  let n3 = fbm(uv * 3.0 + vec2f(t * 0.1, -t * 0.15));

  nebula += vec3f(0.1, 0.05, 0.2) * n1 * 0.5;
  nebula += vec3f(0.05, 0.1, 0.15) * n2 * 0.3;
  nebula += vec3f(0.15, 0.05, 0.1) * n3 * 0.2;

  // Central galaxy glow
  let dist = length(uv);
  let centerGlow = exp(-dist * 1.5) * 0.3;
  nebula += vec3f(0.2, 0.15, 0.1) * centerGlow;

  // Spiral arm hints in background
  let angle = atan2(uv.y, uv.x);
  let spiral = sin(angle * 2.0 - dist * 4.0 + t) * 0.5 + 0.5;
  let spiralMask = smoothstep(0.3, 1.5, dist) * smoothstep(2.0, 0.5, dist);
  nebula += vec3f(0.1, 0.08, 0.15) * spiral * spiralMask * 0.2;

  // Add some scattered background stars
  let starField = step(0.998, hash(floor(v_uv * 200.0)));
  let starBrightness = hash(floor(v_uv * 200.0) + 0.5) * 0.3;
  nebula += vec3f(starBrightness) * starField;

  // Vignette
  let vignette = 1.0 - length(v_uv - 0.5) * 0.8;
  nebula *= vignette;

  // Base dark space color
  let baseColor = vec3f(0.01, 0.01, 0.02);

  return vec4f(baseColor + nebula, 1.0);
}
`;

function initGalaxyStarData(): Float32Array {
  const data = new Float32Array((GALAXY_NUM_STARS + GALAXY_NUM_DUST + 1) * 10);

  let offset = 0;

  for (let i = 0; i < GALAXY_NUM_STARS; i++) {
    const arm = Math.floor(Math.random() * 2);
    const armAngle = arm * Math.PI;

    const dist = 0.1 + Math.pow(Math.random(), 0.5) * 1.4;
    const spread = (Math.random() - 0.5) * 0.3 * (1 + dist * 0.5);
    const angle = armAngle + dist * 2.5 + spread + Math.random() * 0.5;

    data[offset++] = Math.cos(angle) * dist;
    data[offset++] = Math.sin(angle) * dist;

    const orbitalSpeed = Math.sqrt(0.5 / dist) * 0.7;
    data[offset++] = -Math.sin(angle) * orbitalSpeed + (Math.random() - 0.5) * 0.05;
    data[offset++] = Math.cos(angle) * orbitalSpeed + (Math.random() - 0.5) * 0.05;

    const colorTemp = Math.random();
    if (dist < 0.3) {
      data[offset++] = 0.7 + Math.random() * 0.3;
      data[offset++] = 0.8 + Math.random() * 0.2;
      data[offset++] = 1.0;
    } else if (colorTemp < 0.3) {
      data[offset++] = 0.6 + Math.random() * 0.2;
      data[offset++] = 0.7 + Math.random() * 0.2;
      data[offset++] = 1.0;
    } else if (colorTemp < 0.7) {
      data[offset++] = 1.0;
      data[offset++] = 0.9 + Math.random() * 0.1;
      data[offset++] = 0.7 + Math.random() * 0.3;
    } else {
      data[offset++] = 1.0;
      data[offset++] = 0.4 + Math.random() * 0.4;
      data[offset++] = 0.2 + Math.random() * 0.2;
    }

    data[offset++] = 0.5 + Math.random() * 2.0;
    data[offset++] = Math.random();
    data[offset++] = 0;
  }

  for (let i = 0; i < GALAXY_NUM_DUST; i++) {
    const arm = Math.floor(Math.random() * 2);
    const armAngle = arm * Math.PI;

    const dist = 0.2 + Math.random() * 1.2;
    const spread = (Math.random() - 0.5) * 0.5;
    const angle = armAngle + dist * 2.5 + spread;

    data[offset++] = Math.cos(angle) * dist;
    data[offset++] = Math.sin(angle) * dist;

    const orbitalSpeed = Math.sqrt(0.5 / dist) * 0.6;
    data[offset++] = -Math.sin(angle) * orbitalSpeed;
    data[offset++] = Math.cos(angle) * orbitalSpeed;

    data[offset++] = 0.4 + Math.random() * 0.2;
    data[offset++] = 0.2 + Math.random() * 0.1;
    data[offset++] = 0.1 + Math.random() * 0.1;

    data[offset++] = 2.0 + Math.random() * 3.0;
    data[offset++] = Math.random();
    data[offset++] = 1;
  }

  data[offset++] = 0;
  data[offset++] = 0;
  data[offset++] = 0;
  data[offset++] = 0;
  data[offset++] = 1.0;
  data[offset++] = 0.6;
  data[offset++] = 0.2;
  data[offset++] = 8.0;
  data[offset++] = 0;
  data[offset++] = 2;

  return data;
}

type GalaxyResources = {
  pipeline: GPURenderPipeline;
  uniformBuffer: GPUBuffer;
  bindGroup: GPUBindGroup;
  computePipeline: GPUComputePipeline;
  starBuffer: GPUBuffer;
  computeBindGroup: GPUBindGroup;
  computeUniformBuffer: GPUBuffer;
  bgPipeline: GPURenderPipeline;
  bgBindGroup: GPUBindGroup;
  numStars: number;
};

class GalaxyHost implements WebGPUHost {
  private renderTexture: RenderTexture;
  private resources: GalaxyResources | null = null;
  private ready = false;

  constructor(
    private device: GPUDevice,
    private format: GPUTextureFormat,
    width: number,
    height: number
  ) {
    this.renderTexture = createRenderTexture(device, width, height, format);
    this.initResourcesAsync();
  }

  private async initResourcesAsync(): Promise<void> {
    this.resources = await this.initResources();
    this.ready = true;
  }

  private async initResources(): Promise<GalaxyResources> {
    const { device, format } = this;
    const totalParticles = GALAXY_NUM_STARS + GALAXY_NUM_DUST + 1;

    const starData = initGalaxyStarData();

    const starBuffer = device.createBuffer({
      size: starData.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(starBuffer, 0, starData);

    const uniformBuffer = device.createBuffer({
      size: 32,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const computeUniformBuffer = device.createBuffer({
      size: 32,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const bgBindGroupLayout = device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.FRAGMENT,
          buffer: { type: "uniform" },
        },
      ],
    });

    const bgPipelineLayout = device.createPipelineLayout({
      bindGroupLayouts: [bgBindGroupLayout],
    });

    const bgPipeline = await device.createRenderPipelineAsync({
      layout: bgPipelineLayout,
      vertex: {
        module: device.createShaderModule({ code: GALAXY_BG_VERTEX_SHADER }),
        entryPoint: "main",
        buffers: [],
      },
      fragment: {
        module: device.createShaderModule({ code: GALAXY_BG_FRAGMENT_SHADER }),
        entryPoint: "main",
        targets: [{ format }],
      },
      primitive: { topology: "triangle-list" },
    });

    const bgBindGroup = device.createBindGroup({
      layout: bgBindGroupLayout,
      entries: [{ binding: 0, resource: { buffer: uniformBuffer } }],
    });

    const renderBindGroupLayout = device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
          buffer: { type: "uniform" },
        },
        {
          binding: 1,
          visibility: GPUShaderStage.VERTEX,
          buffer: { type: "read-only-storage" },
        },
      ],
    });

    const renderPipelineLayout = device.createPipelineLayout({
      bindGroupLayouts: [renderBindGroupLayout],
    });

    const pipeline = await device.createRenderPipelineAsync({
      layout: renderPipelineLayout,
      vertex: {
        module: device.createShaderModule({ code: GALAXY_VERTEX_SHADER }),
        entryPoint: "main",
        buffers: [],
      },
      fragment: {
        module: device.createShaderModule({ code: GALAXY_FRAGMENT_SHADER }),
        entryPoint: "main",
        targets: [
          {
            format,
            blend: {
              color: {
                srcFactor: "src-alpha",
                dstFactor: "one",
                operation: "add",
              },
              alpha: {
                srcFactor: "one",
                dstFactor: "one",
                operation: "add",
              },
            },
          },
        ],
      },
      primitive: { topology: "triangle-list" },
    });

    const bindGroup = device.createBindGroup({
      layout: renderBindGroupLayout,
      entries: [
        { binding: 0, resource: { buffer: uniformBuffer } },
        { binding: 1, resource: { buffer: starBuffer } },
      ],
    });

    const computeBindGroupLayout = device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: "uniform" },
        },
        {
          binding: 1,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: "storage" },
        },
      ],
    });

    const computePipelineLayout = device.createPipelineLayout({
      bindGroupLayouts: [computeBindGroupLayout],
    });

    const computePipeline = await device.createComputePipelineAsync({
      layout: computePipelineLayout,
      compute: {
        module: device.createShaderModule({ code: GALAXY_COMPUTE_SHADER }),
        entryPoint: "main",
      },
    });

    const computeBindGroup = device.createBindGroup({
      layout: computeBindGroupLayout,
      entries: [
        { binding: 0, resource: { buffer: computeUniformBuffer } },
        { binding: 1, resource: { buffer: starBuffer } },
      ],
    });

    return {
      pipeline,
      uniformBuffer,
      bindGroup,
      computePipeline,
      starBuffer,
      computeBindGroup,
      computeUniformBuffer,
      bgPipeline,
      bgBindGroup,
      numStars: totalParticles,
    };
  }

  resize(width: number, height: number): void {
    if (width <= 0 || height <= 0) {
      return;
    }
    this.renderTexture.resize(width, height);
  }

  render(input: WebGPUHostInput, encoder: GPUCommandEncoder): void {
    if (!this.ready || !this.resources) {
      return;
    }

    const { time, deltaTime, mouseX, mouseY, width, height, mouseDown } = input;

    const uniformData = new Float32Array([time, 0, width, height, mouseX, mouseY, 0, 0]);
    this.device.queue.writeBuffer(this.resources.uniformBuffer, 0, uniformData);

    const computeUniformData = new Float32Array([
      time,
      Math.min(deltaTime, 0.1),
      width,
      height,
      mouseX,
      mouseY,
      mouseDown ? 1.0 : 0.0,
      0,
    ]);
    this.device.queue.writeBuffer(this.resources.computeUniformBuffer, 0, computeUniformData);

    const computePass = encoder.beginComputePass();
    computePass.setPipeline(this.resources.computePipeline);
    computePass.setBindGroup(0, this.resources.computeBindGroup);
    computePass.dispatchWorkgroups(Math.ceil(this.resources.numStars / 64));
    computePass.end();

    const textureView = this.renderTexture.textureView;

    const renderPass = encoder.beginRenderPass({
      colorAttachments: [
        {
          view: textureView,
          clearValue: { r: 0.01, g: 0.01, b: 0.02, a: 1.0 },
          loadOp: "clear",
          storeOp: "store",
        },
      ],
    });

    renderPass.setPipeline(this.resources.bgPipeline);
    renderPass.setBindGroup(0, this.resources.bgBindGroup);
    renderPass.draw(3);

    renderPass.setPipeline(this.resources.pipeline);
    renderPass.setBindGroup(0, this.resources.bindGroup);
    renderPass.draw(6, this.resources.numStars);

    renderPass.end();
  }

  getTexture(): RenderTexture {
    return this.renderTexture;
  }

  destroy(): void {
    this.renderTexture.destroy();
    if (this.resources) {
      this.resources.starBuffer.destroy();
      this.resources.uniformBuffer.destroy();
      this.resources.computeUniformBuffer.destroy();
    }
  }
}

function createGalaxyHost(
  device: GPUDevice,
  format: GPUTextureFormat,
  width: number,
  height: number
): WebGPUHost {
  return new GalaxyHost(device, format, width, height);
}

// ============================================================================
// WEBGPU DEMO EXPORT
// ============================================================================

const hostCache = new Map<WebGPUDemoId, WebGPUHost>();

function getHost(id: WebGPUDemoId, device: GPUDevice, format: GPUTextureFormat): WebGPUHost {
  const cached = hostCache.get(id);
  if (cached) {
    return cached;
  }

  let host: WebGPUHost;
  switch (id) {
    case "hexagon":
      host = createHexagonHost(device, format, WIDTH, HEIGHT);
      break;
    case "metaball":
      host = createMetaballHost(device, format, WIDTH, HEIGHT);
      break;
    case "particle":
      host = createParticleHost(device, format, WIDTH, HEIGHT);
      break;
    case "raymarch":
      host = createRaymarchHost(device, format, WIDTH, HEIGHT);
      break;
    case "terrain":
      host = createTerrainHost(device, format, WIDTH, HEIGHT);
      break;
    case "galaxy":
      host = createGalaxyHost(device, format, WIDTH, HEIGHT);
      break;
  }

  hostCache.set(id, host);
  return host;
}

export const WEBGPU_DEMO: Demo = {
  name: "WebGPU",
  renderElement: (cx, state): DemoItem[] => {
    const device = cx.window.getDevice();
    const format = cx.window.getFormat();
    const currentHost = getHost(state.selectedWebGPUDemo, device, format);
    const currentDemo = DEMO_METADATA.find((d) => d.id === state.selectedWebGPUDemo);

    const selectorButton = (demo: (typeof DEMO_METADATA)[number]) => {
      const isSelected = state.selectedWebGPUDemo === demo.id;
      return div()
        .flex()
        .flexCol()
        .gap(4)
        .p(10)
        .bg(isSelected ? colors.black.x700 : colors.black.x900)
        .rounded(3)
        .border(2)
        .borderColor(isSelected ? colors.blue.x600 : colors.black.x700)
        .cursorPointer()
        .onMouseDown(() => {
          state.setSelectedWebGPUDemo(demo.id);
          cx.notify();
        })
        .children(text(demo.label).weight(isSelected ? 600 : HEIGHT), text(demo.desc));
    };

    return [
      text("Custom WebGPU rendering embedded within Glade UI layout"),
      SPACER_10PX,

      div()
        .flex()
        .flexRow()
        .gap(24)
        .children(
          div()
            .flex()
            .flexCol()
            .gap(8)
            .children(
              webgpuHost(currentHost, WIDTH, HEIGHT).rounded(12),
              text(currentDemo?.label ?? "")
                .size(16)
                .weight(600),
              text(currentDemo?.desc ?? "").size(13)
            ),
          div()
            .flex()
            .flexCol()
            .gap(12)
            .children(
              text("Select Demo").weight(600),
              div()
                .grid()
                .gridCols(2)
                .gap(8)
                .children(...DEMO_METADATA.map(selectorButton))
            )
        ),

      SPACER_10PX,

      div()
        .flex()
        .flexCol()
        .gap(8)
        .p(16)
        .bg(colors.black.x900)
        .rounded(8)
        .children(
          text("How it works"),
          text("Each demo implements the WebGPUHost interface and renders to its own texture."),
          text("Glade samples these textures during its render pass, enabling full compositing."),
          text("Mouse coordinates are automatically transformed to local demo space.")
        ),
    ];
  },
};
