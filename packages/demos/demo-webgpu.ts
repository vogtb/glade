import { createWebGPUContext, runWebGPURenderLoop } from "@glade/platform";
import type { CursorMoveEvent } from "@glade/core/events.ts";

// WebGPU constants (needed for native where globals aren't available)
const GPUBufferUsage = {
  MAP_READ: 0x0001,
  MAP_WRITE: 0x0002,
  COPY_SRC: 0x0004,
  COPY_DST: 0x0008,
  INDEX: 0x0010,
  VERTEX: 0x0020,
  UNIFORM: 0x0040,
  STORAGE: 0x0080,
  INDIRECT: 0x0100,
  QUERY_RESOLVE: 0x0200,
} as const;

const GPUShaderStage = {
  VERTEX: 0x1,
  FRAGMENT: 0x2,
  COMPUTE: 0x4,
} as const;

// WGSL Vertex Shader
const VERTEX_SHADER = `
struct VertexInput {
  @location(0) position: vec2f,
  @location(1) color: vec3f,
}

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) color: vec3f,
}

struct Uniforms {
  time: f32,
  resolution: vec2f,
  mouse: vec2f,
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
  var mouseNorm = (uniforms.mouse / uniforms.resolution) * 2.0 - 1.0;
  mouseNorm.y = -mouseNorm.y; // Flip Y (screen coords are top-down)

  // Apply rotation based on time
  var pos = input.position * rotate2d(uniforms.time * 0.5);

  // Add some wobble
  pos.x += sin(uniforms.time * 2.0 + input.position.y * 3.0) * 0.1;
  pos.y += cos(uniforms.time * 2.5 + input.position.x * 3.0) * 0.1;

  // Offset position toward mouse
  pos += mouseNorm * 0.3;

  // Scale to maintain aspect ratio
  let aspect = uniforms.resolution.x / uniforms.resolution.y;
  pos.x /= aspect;

  output.position = vec4f(pos, 0.0, 1.0);

  // Animate color
  output.color = input.color * (0.5 + 0.5 * sin(uniforms.time + input.color));

  return output;
}
`;

// WGSL Fragment Shader
const FRAGMENT_SHADER = `
struct FragmentInput {
  @location(0) color: vec3f,
}

struct Uniforms {
  time: f32,
  resolution: vec2f,
  mouse: vec2f,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

@fragment
fn main(input: FragmentInput, @builtin(position) fragCoord: vec4f) -> @location(0) vec4f {
  // Add some color pulsing
  var color = input.color;
  color += 0.1 * sin(uniforms.time * 3.0 + fragCoord.x * 0.02);
  color += 0.1 * cos(uniforms.time * 2.5 + fragCoord.y * 0.02);

  return vec4f(clamp(color, vec3f(0.0), vec3f(1.0)), 1.0);
}
`;

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

    // colors based on angle
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

interface Resources {
  pipeline: GPURenderPipeline;
  positionBuffer: GPUBuffer;
  colorBuffer: GPUBuffer;
  indexBuffer: GPUBuffer;
  uniformBuffer: GPUBuffer;
  bindGroup: GPUBindGroup;
  indexCount: number;
}

function initDemo(device: GPUDevice, format: GPUTextureFormat): Resources {
  // Create shader modules
  const vertexModule = device.createShaderModule({
    code: VERTEX_SHADER,
  });

  const fragmentModule = device.createShaderModule({
    code: FRAGMENT_SHADER,
  });

  // Create geometry
  const { positions, colors } = createHexagonGeometry();
  const indices = createHexagonIndices();

  // Create buffers
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

  // Uniform buffer: time (f32) + padding (f32) + resolution (vec2f) + mouse (vec2f) = 24 bytes
  // Aligned to 16 bytes: 32 bytes
  const uniformBuffer = device.createBuffer({
    size: 32,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  // Create bind group layout and pipeline layout
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

  // Create render pipeline
  const pipeline = device.createRenderPipeline({
    layout: pipelineLayout,
    vertex: {
      module: vertexModule,
      entryPoint: "main",
      buffers: [
        {
          arrayStride: 8, // 2 floats * 4 bytes
          attributes: [
            {
              shaderLocation: 0,
              offset: 0,
              format: "float32x2",
            },
          ],
        },
        {
          arrayStride: 12, // 3 floats * 4 bytes
          attributes: [
            {
              shaderLocation: 1,
              offset: 0,
              format: "float32x3",
            },
          ],
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
    primitive: {
      topology: "triangle-list",
    },
  });

  // Create bind group
  const bindGroup = device.createBindGroup({
    layout: bindGroupLayout,
    entries: [
      {
        binding: 0,
        resource: { buffer: uniformBuffer },
      },
    ],
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

function render(
  device: GPUDevice,
  context: GPUCanvasContext,
  resources: Resources,
  time: number,
  width: number,
  height: number,
  mouseX: number,
  mouseY: number
): void {
  const {
    pipeline,
    positionBuffer,
    colorBuffer,
    indexBuffer,
    uniformBuffer,
    bindGroup,
    indexCount,
  } = resources;

  // Update uniforms
  const uniformData = new Float32Array([
    time, // time
    0, // padding
    width, // resolution.x
    height, // resolution.y
    mouseX, // mouse.x
    mouseY, // mouse.y
    0,
    0, // padding to 32 bytes
  ]);
  device.queue.writeBuffer(uniformBuffer, 0, uniformData);

  // Get current texture from swap chain
  const textureView = context.getCurrentTexture().createView();

  // Create command encoder
  const commandEncoder = device.createCommandEncoder();

  // Begin render pass
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
  renderPass.setVertexBuffer(0, positionBuffer);
  renderPass.setVertexBuffer(1, colorBuffer);
  renderPass.setIndexBuffer(indexBuffer, "uint16");
  renderPass.setBindGroup(0, bindGroup);
  renderPass.drawIndexed(indexCount);
  renderPass.end();

  // Submit commands
  device.queue.submit([commandEncoder.finish()]);

  // Present the frame - this is required for native WebGPU
  // On browser, this happens automatically, but Dawn requires explicit present
  if ("present" in context && typeof context.present === "function") {
    (context as unknown as { present: () => void }).present();
  }
}

async function main() {
  console.log("Initializing WebGPU demo...");

  const ctx = await createWebGPUContext({
    width: 800,
    height: 600,
    title: "glade WebGPU Demo",
  });

  console.log("WebGPU context created");

  // Get the preferred format - on browser this comes from GPU, on native we use BGRA8Unorm
  const format: GPUTextureFormat = "bgra8unorm";

  const resources = initDemo(ctx.device, format);

  console.log("Demo initialized, rendering...");

  let mouseX = ctx.width / 2;
  let mouseY = ctx.height / 2;

  ctx.onCursorMove((event: CursorMoveEvent) => {
    mouseX = event.x;
    mouseY = event.y;
  });

  // Create render callback
  const renderCallback = (time: number, _deltaTime: number): void => {
    render(ctx.device, ctx.context, resources, time, ctx.width, ctx.height, mouseX, mouseY);
  };

  runWebGPURenderLoop(ctx, renderCallback);
}

main().catch(console.error);
