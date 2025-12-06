/**
 * Debug test using raw FFI calls to bypass our wrapper classes
 * This tests if the issue is in our wrapper or in the FFI itself
 */

import { ptr } from "bun:ffi";
import { dawn } from "../../packages/dawn/dawn.ts";
import { createWebGPUContext, runWebGPURenderLoop } from "@glade/platform";

async function main() {
  console.log("=== Raw FFI Debug Test ===\n");

  const ctx = await createWebGPUContext({
    width: 800,
    height: 600,
    title: "Raw FFI Test",
  });

  const { device, context } = ctx;

  // Get raw handles
  const deviceHandle = (device as any)._handle;
  const queueHandle = (device as any).queue._handle;

  console.log("Device handle:", deviceHandle);
  console.log("Queue handle:", queueHandle);

  // Create buffer using raw FFI
  const vertices = new Float32Array([
    0.0, 0.5,
    -0.5, -0.5,
    0.5, -0.5,
  ]);

  // WGPUBufferDescriptor
  const bufferDesc = Buffer.alloc(48);
  bufferDesc.writeBigUInt64LE(BigInt(0), 0);     // nextInChain
  bufferDesc.writeBigUInt64LE(BigInt(0), 8);     // label.data
  bufferDesc.writeBigUInt64LE(BigInt("0xFFFFFFFFFFFFFFFF"), 16); // label.length
  bufferDesc.writeBigUInt64LE(BigInt(0x28), 24); // usage: VERTEX | COPY_DST
  bufferDesc.writeBigUInt64LE(BigInt(24), 32);   // size
  bufferDesc.writeUInt32LE(0, 40);               // mappedAtCreation

  const bufferHandle = dawn.wgpuDeviceCreateBuffer(deviceHandle, ptr(bufferDesc));
  console.log("Buffer handle from raw FFI:", bufferHandle);
  console.log("Buffer handle type:", typeof bufferHandle);

  // Write data using raw FFI
  const verticesPtr = ptr(vertices);
  console.log("Vertices pointer:", verticesPtr);

  dawn.wgpuQueueWriteBuffer(
    queueHandle,
    bufferHandle,
    BigInt(0),
    verticesPtr,
    BigInt(24)
  );
  console.log("Buffer written via raw FFI");

  // Create shader
  const shaderCode = `
@vertex
fn main(@location(0) pos: vec2f) -> @builtin(position) vec4f {
  return vec4f(pos, 0.0, 1.0);
}

@fragment
fn fs_main() -> @location(0) vec4f {
  return vec4f(0.0, 1.0, 0.0, 1.0);
}
`;
  const codeBuffer = Buffer.from(shaderCode + "\0", "utf8");

  // WGPUShaderSourceWGSL
  const wgslSource = Buffer.alloc(32);
  wgslSource.writeBigUInt64LE(BigInt(0), 0);     // chain.next
  wgslSource.writeUInt32LE(0x00000002, 8);       // chain.sType
  wgslSource.writeBigUInt64LE(BigInt(ptr(codeBuffer)), 16); // code.data
  wgslSource.writeBigUInt64LE(BigInt(codeBuffer.length - 1), 24); // code.length

  // WGPUShaderModuleDescriptor
  const shaderDesc = Buffer.alloc(32);
  shaderDesc.writeBigUInt64LE(BigInt(ptr(wgslSource)), 0); // nextInChain
  shaderDesc.writeBigUInt64LE(BigInt(0), 8);     // label.data
  shaderDesc.writeBigUInt64LE(BigInt("0xFFFFFFFFFFFFFFFF"), 16); // label.length

  const shaderHandle = dawn.wgpuDeviceCreateShaderModule(deviceHandle, ptr(shaderDesc));
  console.log("Shader handle:", shaderHandle);

  // Use our wrapper for the rest since pipeline creation is complex
  const vertexModule = device.createShaderModule({ code: shaderCode });
  const pipeline = device.createRenderPipeline({
    layout: "auto",
    vertex: {
      module: vertexModule,
      entryPoint: "main",
      buffers: [{
        arrayStride: 8,
        stepMode: "vertex",
        attributes: [{
          shaderLocation: 0,
          offset: 0,
          format: "float32x2",
        }],
      }],
    },
    fragment: {
      module: vertexModule,
      entryPoint: "fs_main",
      targets: [{ format: "bgra8unorm" }],
    },
    primitive: { topology: "triangle-list" },
  });

  const pipelineHandle = (pipeline as any)._handle;
  console.log("Pipeline handle:", pipelineHandle);

  console.log("\nStarting render loop with raw FFI setVertexBuffer...");

  let frameCount = 0;
  runWebGPURenderLoop(ctx, () => {
    frameCount++;

    const texture = context.getCurrentTexture();
    const textureHandle = (texture as any)._handle;
    const textureView = texture.createView();
    const viewHandle = (textureView as any)._handle;

    const commandEncoder = device.createCommandEncoder();
    const encoderHandle = (commandEncoder as any)._handle;

    // Begin render pass using wrapper (complex struct)
    const renderPass = commandEncoder.beginRenderPass({
      colorAttachments: [{
        view: textureView,
        clearValue: { r: 0.0, g: 0.0, b: 0.5, a: 1.0 },
        loadOp: "clear",
        storeOp: "store",
      }],
    });

    const passHandle = (renderPass as any)._handle;

    // Use raw FFI for setPipeline and setVertexBuffer
    dawn.wgpuRenderPassEncoderSetPipeline(passHandle, pipelineHandle);

    if (frameCount === 1) {
      console.log("Raw FFI setVertexBuffer call:");
      console.log("  passHandle:", passHandle);
      console.log("  slot:", 0);
      console.log("  bufferHandle:", bufferHandle);
      console.log("  offset:", BigInt(0));
      console.log("  size:", BigInt(24));
    }

    // Raw FFI call to setVertexBuffer
    dawn.wgpuRenderPassEncoderSetVertexBuffer(
      passHandle,
      0,            // slot
      bufferHandle, // buffer
      BigInt(0),    // offset
      BigInt(24)    // size
    );

    dawn.wgpuRenderPassEncoderDraw(passHandle, 3, 1, 0, 0);

    renderPass.end();
    device.queue.submit([commandEncoder.finish()]);

    if ("present" in context && typeof context.present === "function") {
      (context as any).present();
    }

    if (frameCount === 1) {
      console.log("First frame rendered");
    }
  });
}

main().catch(console.error);
