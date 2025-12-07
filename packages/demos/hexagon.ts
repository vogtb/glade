import type { WebGPUContext } from "@glade/core";
import { GPUBufferUsage, GPUShaderStage } from "@glade/webgpu";
import type { DemoResources } from "./demo-webgpu.js";

const VERTEX_SHADER = `
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

const FRAGMENT_SHADER = `
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

function createGeometry(): { positions: Float32Array; colors: Float32Array } {
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

function createIndices(): Uint16Array {
  const indices: Array<number> = [];
  const numSides = 6;

  for (let i = 0; i < numSides; i++) {
    indices.push(0, i + 1, i + 2);
  }

  return new Uint16Array(indices);
}

export function initHexagonDemo(ctx: WebGPUContext, format: GPUTextureFormat): DemoResources {
  const { device } = ctx;

  const { positions, colors } = createGeometry();
  const indices = createIndices();

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

  const vertexModule = device.createShaderModule({ code: VERTEX_SHADER });
  const fragmentModule = device.createShaderModule({ code: FRAGMENT_SHADER });

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
