import { createWebGPUContext, runWebGPURenderLoop } from "@glade/platform";

const GPUBufferUsage = {
  VERTEX: 0x0020,
  COPY_DST: 0x0008,
} as const;

// Simple vertex shader
const VERTEX_SHADER = `
@vertex
fn main(@location(0) pos: vec2f) -> @builtin(position) vec4f {
  return vec4f(pos, 0.0, 1.0);
}
`;

// Simple fragment shader - green to distinguish from debug-render.ts
const FRAGMENT_SHADER = `
@fragment
fn main() -> @location(0) vec4f {
  return vec4f(0.0, 1.0, 0.0, 1.0);
}
`;

async function main() {
  console.log("Creating context...");
  const ctx = await createWebGPUContext({
    width: 800,
    height: 600,
    title: "Debug Vertex Buffer Test",
  });
  console.log("Context created");

  const { device, context } = ctx;

  // Simple triangle vertices
  const vertices = new Float32Array([
    0.0, 0.5,   // top
    -0.5, -0.5, // bottom left
    0.5, -0.5,  // bottom right
  ]);

  console.log("Vertices:", vertices);
  console.log("Vertices byteLength:", vertices.byteLength);

  console.log("Creating vertex buffer...");
  const vertexBuffer = device.createBuffer({
    size: vertices.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  });
  console.log("Vertex buffer created, size:", (vertexBuffer as any).size);

  console.log("Writing to vertex buffer...");
  device.queue.writeBuffer(vertexBuffer, 0, vertices);
  console.log("Vertex buffer written");

  console.log("Creating shaders...");
  const shaderModule = device.createShaderModule({
    code: VERTEX_SHADER + FRAGMENT_SHADER
  });
  console.log("Shader module created");

  console.log("Creating pipeline...");
  const pipeline = device.createRenderPipeline({
    layout: "auto",
    vertex: {
      module: shaderModule,
      entryPoint: "main",
      buffers: [
        {
          arrayStride: 8, // 2 floats * 4 bytes
          stepMode: "vertex",
          attributes: [
            {
              shaderLocation: 0,
              offset: 0,
              format: "float32x2"
            }
          ],
        },
      ],
    },
    fragment: {
      module: shaderModule,
      entryPoint: "main",
      targets: [{ format: "bgra8unorm" }],
    },
    primitive: { topology: "triangle-list" },
  });
  console.log("Pipeline created");

  console.log("Starting render loop...");

  let frameCount = 0;
  runWebGPURenderLoop(ctx, () => {
    frameCount++;
    if (frameCount <= 3) {
      console.log(`Frame ${frameCount}`);
    }

    const textureView = context.getCurrentTexture().createView();
    const commandEncoder = device.createCommandEncoder();

    const renderPass = commandEncoder.beginRenderPass({
      colorAttachments: [
        {
          view: textureView,
          clearValue: { r: 0.2, g: 0.2, b: 0.2, a: 1.0 }, // Gray background
          loadOp: "clear",
          storeOp: "store",
        },
      ],
    });

    renderPass.setPipeline(pipeline);
    renderPass.setVertexBuffer(0, vertexBuffer);
    renderPass.draw(3); // 3 vertices

    renderPass.end();
    device.queue.submit([commandEncoder.finish()]);

    if ("present" in context && typeof context.present === "function") {
      (context as any).present();
    }
  });
}

main().catch(console.error);
