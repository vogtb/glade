/**
 * Debug test to verify struct layouts are correct
 * This creates a pipeline with vertex buffers and logs the struct bytes
 */

import { createWebGPUContext, runWebGPURenderLoop } from "@glade/platform";

const GPUBufferUsage = {
  VERTEX: 0x0020,
  COPY_DST: 0x0008,
} as const;

const VERTEX_SHADER = `
@vertex
fn main(@location(0) pos: vec2f) -> @builtin(position) vec4f {
  return vec4f(pos, 0.0, 1.0);
}
`;

const FRAGMENT_SHADER = `
@fragment
fn main() -> @location(0) vec4f {
  return vec4f(0.0, 1.0, 0.0, 1.0);
}
`;

async function main() {
  console.log("=== Debug Struct Layout Test ===\n");

  // Let's manually calculate what the struct layouts should be
  console.log("Expected WGPUVertexAttribute layout (32 bytes):");
  console.log("  offset  0: nextInChain (ptr, 8 bytes) = 0");
  console.log("  offset  8: format (u32, 4 bytes) = 0x1d (Float32x2)");
  console.log("  offset 12: (padding, 4 bytes)");
  console.log("  offset 16: offset (u64, 8 bytes) = 0");
  console.log("  offset 24: shaderLocation (u32, 4 bytes) = 0");
  console.log("  offset 28: (padding, 4 bytes)");
  console.log("");

  console.log("Expected WGPUVertexBufferLayout layout (40 bytes):");
  console.log("  offset  0: nextInChain (ptr, 8 bytes) = 0");
  console.log("  offset  8: stepMode (u32, 4 bytes) = 1 (Vertex)");
  console.log("  offset 12: (padding, 4 bytes)");
  console.log("  offset 16: arrayStride (u64, 8 bytes) = 8");
  console.log("  offset 24: attributeCount (size_t, 8 bytes) = 1");
  console.log("  offset 32: attributes (ptr, 8 bytes) = <pointer to attributes>");
  console.log("");

  // Create actual structs to verify
  const attributeBuffer = Buffer.alloc(32);
  attributeBuffer.writeBigUInt64LE(BigInt(0), 0);        // nextInChain
  attributeBuffer.writeUInt32LE(0x1d, 8);                // format = Float32x2
  // offset 12: padding
  attributeBuffer.writeBigUInt64LE(BigInt(0), 16);       // offset
  attributeBuffer.writeUInt32LE(0, 24);                  // shaderLocation
  // offset 28: padding

  console.log("Attribute buffer bytes:");
  console.log(attributeBuffer.toString('hex').match(/.{1,16}/g)?.join('\n'));
  console.log("");

  const layoutBuffer = Buffer.alloc(40);
  layoutBuffer.writeBigUInt64LE(BigInt(0), 0);           // nextInChain
  layoutBuffer.writeUInt32LE(1, 8);                      // stepMode = Vertex
  // offset 12: padding
  layoutBuffer.writeBigUInt64LE(BigInt(8), 16);          // arrayStride = 8
  layoutBuffer.writeBigUInt64LE(BigInt(1), 24);          // attributeCount = 1
  // We'll set the pointer to attributes below

  console.log("Layout buffer bytes (without attributes pointer):");
  console.log(layoutBuffer.toString('hex').match(/.{1,16}/g)?.join('\n'));
  console.log("");

  console.log("Creating context...");
  const ctx = await createWebGPUContext({
    width: 800,
    height: 600,
    title: "Debug Struct Layout Test",
  });

  const { device, context } = ctx;

  // Create vertex buffer
  const vertices = new Float32Array([
    0.0, 0.5,   // top
    -0.5, -0.5, // bottom left
    0.5, -0.5,  // bottom right
  ]);

  const vertexBuffer = device.createBuffer({
    size: vertices.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(vertexBuffer, 0, vertices);
  console.log("Vertex buffer created and data written");

  // Create shaders
  const vertexModule = device.createShaderModule({ code: VERTEX_SHADER });
  const fragmentModule = device.createShaderModule({ code: FRAGMENT_SHADER });
  console.log("Shaders created");

  // Create pipeline - this is where the struct layout matters
  console.log("\nCreating pipeline with vertex buffer layout...");
  const pipeline = device.createRenderPipeline({
    layout: "auto",
    vertex: {
      module: vertexModule,
      entryPoint: "main",
      buffers: [
        {
          arrayStride: 8,
          stepMode: "vertex",
          attributes: [
            { shaderLocation: 0, offset: 0, format: "float32x2" }
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
  console.log("Pipeline created successfully");

  console.log("\nStarting render loop...");
  console.log("Expected: GREEN triangle on BLUE background\n");

  let frameCount = 0;
  runWebGPURenderLoop(ctx, () => {
    frameCount++;
    if (frameCount <= 2) {
      console.log(`Frame ${frameCount}`);
    }

    const textureView = context.getCurrentTexture().createView();
    const commandEncoder = device.createCommandEncoder();

    const renderPass = commandEncoder.beginRenderPass({
      colorAttachments: [
        {
          view: textureView,
          clearValue: { r: 0.0, g: 0.0, b: 0.5, a: 1.0 },
          loadOp: "clear",
          storeOp: "store",
        },
      ],
    });

    renderPass.setPipeline(pipeline);
    renderPass.setVertexBuffer(0, vertexBuffer);
    renderPass.draw(3);
    renderPass.end();

    device.queue.submit([commandEncoder.finish()]);

    if ("present" in context && typeof context.present === "function") {
      (context as any).present();
    }
  });
}

main().catch(console.error);
