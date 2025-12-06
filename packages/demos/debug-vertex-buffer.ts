import { createWebGPUContext, runWebGPURenderLoop } from "@glade/platform";

const GPUBufferUsage = {
  VERTEX: 0x0020,
  COPY_DST: 0x0008,
} as const;

// Vertex shader that uses @location(0) for vertex buffer input
const VERTEX_SHADER = `
@vertex
fn main(@location(0) pos: vec2f) -> @builtin(position) vec4f {
  return vec4f(pos, 0.0, 1.0);
}
`;

// Fragment shader - green to distinguish from red hardcoded version
const FRAGMENT_SHADER = `
@fragment
fn main() -> @location(0) vec4f {
  return vec4f(0.0, 1.0, 0.0, 1.0);
}
`;

async function main() {
  console.log("=== Debug Vertex Buffer Test ===");
  console.log("Creating context...");
  const ctx = await createWebGPUContext({
    width: 800,
    height: 600,
    title: "Debug Vertex Buffer Test",
  });
  console.log("Context created");

  const { device, context } = ctx;

  // Simple triangle vertices - same as hardcoded version
  const vertices = new Float32Array([
    0.0,
    0.5, // top
    -0.5,
    -0.5, // bottom left
    0.5,
    -0.5, // bottom right
  ]);

  console.log("Vertex data:", vertices);
  console.log("Vertex buffer size:", vertices.byteLength, "bytes");
  console.log(
    "Buffer usage flags:",
    GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    `(VERTEX=${GPUBufferUsage.VERTEX}, COPY_DST=${GPUBufferUsage.COPY_DST})`
  );

  console.log("Creating vertex buffer...");
  const vertexBuffer = device.createBuffer({
    size: vertices.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  });
  console.log("Vertex buffer created:", vertexBuffer);
  console.log("  - size:", vertexBuffer.size);
  console.log("  - usage:", vertexBuffer.usage);

  // Check internal handle
  if ("_handle" in vertexBuffer) {
    console.log("  - _handle:", (vertexBuffer as any)._handle);
  }

  console.log("Writing vertex data to buffer...");
  device.queue.writeBuffer(vertexBuffer, 0, vertices);
  console.log("Vertex data written");

  console.log("Creating shaders...");
  const vertexModule = device.createShaderModule({ code: VERTEX_SHADER });
  const fragmentModule = device.createShaderModule({ code: FRAGMENT_SHADER });
  console.log("Shaders created");

  console.log("Creating pipeline with vertex buffer layout...");
  console.log("  - arrayStride: 8 (2 floats * 4 bytes)");
  console.log("  - attribute format: float32x2");
  console.log("  - attribute offset: 0");
  console.log("  - attribute shaderLocation: 0");

  const pipeline = device.createRenderPipeline({
    layout: "auto",
    vertex: {
      module: vertexModule,
      entryPoint: "main",
      buffers: [
        {
          arrayStride: 8, // 2 floats * 4 bytes
          stepMode: "vertex",
          attributes: [
            {
              shaderLocation: 0,
              offset: 0,
              format: "float32x2",
            },
          ],
        },
      ],
    },
    fragment: {
      module: fragmentModule,
      entryPoint: "main",
      targets: [{ format: "bgra8unorm" }],
    },
    primitive: { topology: "triangle-list" },
  });
  console.log("Pipeline created:", pipeline);

  console.log("Starting render loop...");
  console.log("Expected: GREEN triangle on BLUE background");
  console.log("If you see solid blue: vertex buffer is not being read");

  let frameCount = 0;
  runWebGPURenderLoop(ctx, () => {
    frameCount++;
    if (frameCount <= 3) {
      console.log(`Frame ${frameCount}: rendering...`);
    }

    const texture = context.getCurrentTexture();
    const textureView = texture.createView();
    const commandEncoder = device.createCommandEncoder();

    const renderPass = commandEncoder.beginRenderPass({
      colorAttachments: [
        {
          view: textureView,
          clearValue: { r: 0.0, g: 0.0, b: 0.5, a: 1.0 }, // Blue background
          loadOp: "clear",
          storeOp: "store",
        },
      ],
    });

    renderPass.setPipeline(pipeline);

    if (frameCount <= 3) {
      console.log(`  setVertexBuffer(0, buffer, offset=0, size=${vertexBuffer.size})`);
    }
    renderPass.setVertexBuffer(0, vertexBuffer);

    if (frameCount <= 3) {
      console.log(`  draw(3) - drawing 3 vertices`);
    }
    renderPass.draw(3);

    renderPass.end();
    device.queue.submit([commandEncoder.finish()]);

    if ("present" in context && typeof context.present === "function") {
      (context as any).present();
    }
  });
}

main().catch(console.error);
