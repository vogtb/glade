import { createWebGPUContext, runWebGPURenderLoop } from "@glade/platform";
import type { WebGPUContext } from "@glade/core";
import { GPUBufferUsage, GPUShaderStage } from "@glade/webgpu";

const DEMO_CYCLE_INTERVAL = 3.0; // seconds

// ============================================================================
// Demo 1: Hexagon
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

// ============================================================================
// Demo 2: Particle System with orbiting particles
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

// ============================================================================
// Shared utilities
// ============================================================================

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

// ============================================================================
// Demo 1: Hexagon geometry and resources
// ============================================================================

function createHexagonGeometry(): { positions: Float32Array; colors: Float32Array } {
  const positions: Array<number> = [];
  const colors: Array<number> = [];

  const sides = 6;
  const radius = 0.6;

  // center vertex
  positions.push(0, 0);
  colors.push(1, 1, 1); // White center

  // outer vertices
  for (let i = 0; i <= sides; i++) {
    const angle = (i / sides) * Math.PI * 2 - Math.PI / 2;
    positions.push(Math.cos(angle) * radius, Math.sin(angle) * radius);

    // colors based on angle (ish?)
    const hue = i / sides;
    const [r, g, b] = hslToRgb(hue, 1, 0.5);
    colors.push(r, g, b);
  }

  return {
    positions: new Float32Array(positions),
    colors: new Float32Array(colors),
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

// ============================================================================
// Demo 2: Particle geometry
// ============================================================================

function createParticleQuadGeometry(): { positions: Float32Array; colors: Float32Array } {
  // A simple quad (two triangles) for each particle instance
  // Positions are offsets from particle center
  const positions = new Float32Array([-1, -1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1]);

  // Colors (will be overridden in shader, but needed for vertex layout)
  const colors = new Float32Array([1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]);

  return { positions, colors };
}

// ============================================================================
// Resource types and initialization
// ============================================================================

interface DemoResources {
  pipeline: GPURenderPipeline;
  positionBuffer: GPUBuffer;
  colorBuffer: GPUBuffer;
  indexBuffer: GPUBuffer | null;
  uniformBuffer: GPUBuffer;
  bindGroup: GPUBindGroup;
  indexCount: number;
  vertexCount: number;
  instanceCount: number;
  useInstancing: boolean;
}
type Demo = { name: string; resources: DemoResources };

function initHexagonDemo(ctx: WebGPUContext, format: GPUTextureFormat): DemoResources {
  const { device } = ctx;

  const { positions, colors } = createHexagonGeometry();
  const indices = createHexagonIndices();

  const positionBuffer = device.createBuffer({
    size: positions.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(positionBuffer, 0, positions);

  const colorBuffer = device.createBuffer({
    size: colors.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(colorBuffer, 0, colors);

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
    vertexCount: 0,
    instanceCount: 1,
    useInstancing: false,
  };
}

function initParticleDemo(ctx: WebGPUContext, format: GPUTextureFormat): DemoResources {
  const { device } = ctx;

  const { positions, colors } = createParticleQuadGeometry();
  const particleCount = 24;

  const positionBuffer = device.createBuffer({
    size: positions.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(positionBuffer, 0, positions);

  const colorBuffer = device.createBuffer({
    size: colors.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(colorBuffer, 0, colors);

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
    indexBuffer: null,
    uniformBuffer,
    bindGroup,
    indexCount: 0,
    vertexCount: 6, // 6 vertices per quad
    instanceCount: particleCount,
    useInstancing: true,
  };
}

// ============================================================================
// Rendering
// ============================================================================

function render(
  ctx: WebGPUContext,
  resources: DemoResources,
  time: number,
  mouseX: number,
  mouseY: number
): void {
  const { device, context } = ctx;
  const {
    pipeline,
    positionBuffer,
    colorBuffer,
    indexBuffer,
    uniformBuffer,
    bindGroup,
    indexCount,
    vertexCount,
    instanceCount,
    useInstancing,
  } = resources;

  const uniformData = new Float32Array([time, 0, ctx.width, ctx.height, mouseX, mouseY, 0, 0]);
  device.queue.writeBuffer(uniformBuffer, 0, uniformData);

  const textureView = context.getCurrentTexture().createView();
  const commandEncoder = device.createCommandEncoder();

  const renderPass = commandEncoder.beginRenderPass({
    colorAttachments: [
      {
        view: textureView,
        clearValue: { r: 0.05, g: 0.05, b: 0.1, a: 1.0 },
        loadOp: "clear",
        storeOp: "store",
      },
    ],
  });

  renderPass.setPipeline(pipeline);
  renderPass.setBindGroup(0, bindGroup);
  renderPass.setVertexBuffer(0, positionBuffer);
  renderPass.setVertexBuffer(1, colorBuffer);

  if (useInstancing) {
    renderPass.draw(vertexCount, instanceCount);
  } else if (indexBuffer) {
    renderPass.setIndexBuffer(indexBuffer, "uint16");
    renderPass.drawIndexed(indexCount);
  }

  renderPass.end();
  device.queue.submit([commandEncoder.finish()]);

  if ("present" in context && typeof context.present === "function") {
    (context as unknown as { present: () => void }).present();
  }
}

// ============================================================================
// Main entry point
// ============================================================================

async function main() {
  const ctx = await createWebGPUContext({
    width: 800,
    height: 600,
    title: "glade WebGPU Demo",
  });

  console.log("initializing WebGPU demos...");

  const format: GPUTextureFormat = "bgra8unorm";

  const demos: Array<Demo> = [
    { name: "Hexagon", resources: initHexagonDemo(ctx, format) },
    { name: "Particle System", resources: initParticleDemo(ctx, format) },
  ];

  console.log("demos initialized, rendering...");

  let mouseX = ctx.width / 2;
  let mouseY = ctx.height / 2;

  ctx.onCursorMove((event) => {
    mouseX = event.x;
    mouseY = event.y;
  });

  let currentDemoIndex = 0;

  const renderCallback = (time: number, _deltaTime: number): void => {
    // Cycle demos every 3 seconds
    const newDemoIndex = Math.floor(time / DEMO_CYCLE_INTERVAL) % demos.length;
    if (newDemoIndex !== currentDemoIndex) {
      currentDemoIndex = newDemoIndex;
      console.log(`Switching to demo: ${demos[currentDemoIndex]!.name}`);
    }

    render(ctx, demos[currentDemoIndex]!.resources, time, mouseX, mouseY);
  };

  runWebGPURenderLoop(ctx, renderCallback);
}

main().catch(console.error);
