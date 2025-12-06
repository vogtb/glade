/**
 * Debug test that dumps the actual struct bytes being passed to Dawn
 */

import { ptr } from "bun:ffi";
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

function dumpBuffer(name: string, buffer: Buffer) {
  console.log(`\n${name} (${buffer.length} bytes):`);
  const hex = buffer.toString('hex');
  for (let i = 0; i < hex.length; i += 32) {
    const offset = i / 2;
    const line = hex.slice(i, i + 32).match(/.{1,2}/g)?.join(' ') || '';
    console.log(`  ${offset.toString().padStart(3, '0')}: ${line}`);
  }
}

async function main() {
  console.log("=== Debug Dump Structs ===\n");

  // Print expected struct layouts from C
  console.log("Expected struct layouts (from C compiler):");
  console.log("WGPUVertexAttribute: 32 bytes");
  console.log("  nextInChain: 0, format: 8, offset: 16, shaderLocation: 24");
  console.log("WGPUVertexBufferLayout: 40 bytes");
  console.log("  nextInChain: 0, stepMode: 8, arrayStride: 16, attributeCount: 24, attributes: 32");
  console.log("");

  // Build the structs manually to verify
  const attributeBuffer = Buffer.alloc(32);
  attributeBuffer.writeBigUInt64LE(BigInt(0), 0);        // nextInChain
  attributeBuffer.writeUInt32LE(0x1d, 8);                // format = Float32x2
  attributeBuffer.writeBigUInt64LE(BigInt(0), 16);       // offset = 0
  attributeBuffer.writeUInt32LE(0, 24);                  // shaderLocation = 0

  dumpBuffer("WGPUVertexAttribute", attributeBuffer);

  const attrPtr = ptr(attributeBuffer) as unknown as number;

  const layoutBuffer = Buffer.alloc(40);
  layoutBuffer.writeBigUInt64LE(BigInt(0), 0);           // nextInChain
  layoutBuffer.writeUInt32LE(1, 8);                      // stepMode = Vertex
  layoutBuffer.writeBigUInt64LE(BigInt(8), 16);          // arrayStride = 8
  layoutBuffer.writeBigUInt64LE(BigInt(1), 24);          // attributeCount = 1
  layoutBuffer.writeBigUInt64LE(BigInt(attrPtr), 32);    // attributes pointer

  dumpBuffer("WGPUVertexBufferLayout", layoutBuffer);

  console.log(`\nAttribute pointer value: 0x${attrPtr.toString(16)}`);

  // Now run the actual test
  console.log("\n--- Creating context and running test ---\n");

  const ctx = await createWebGPUContext({
    width: 800,
    height: 600,
    title: "Debug Dump Structs",
  });

  const { device, context } = ctx;

  const vertices = new Float32Array([
    0.0, 0.5,
    -0.5, -0.5,
    0.5, -0.5,
  ]);

  console.log("Vertex data as Float32Array:", vertices);
  console.log("Vertex data as bytes:", Buffer.from(vertices.buffer).toString('hex'));

  const vertexBuffer = device.createBuffer({
    size: vertices.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(vertexBuffer, 0, vertices);

  const vertexModule = device.createShaderModule({ code: VERTEX_SHADER });
  const fragmentModule = device.createShaderModule({ code: FRAGMENT_SHADER });

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

  console.log("\nPipeline created, starting render loop...");
  console.log("Should show GREEN triangle on BLUE background");

  let frameCount = 0;
  runWebGPURenderLoop(ctx, () => {
    frameCount++;
    if (frameCount > 5) return;

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
