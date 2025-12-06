/**
 * Debug test with explicit device tick after buffer write
 */

import { createWebGPUContext, runWebGPURenderLoop } from "@glade/platform";
import { dawn } from "../../packages/dawn/dawn.ts";

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
  console.log("=== Test with Device Tick ===\n");

  const ctx = await createWebGPUContext({
    width: 800,
    height: 600,
    title: "Device Tick Test",
  });

  const { device, context } = ctx;
  const deviceHandle = (device as any)._handle;

  const vertices = new Float32Array([
    0.0, 0.5,
    -0.5, -0.5,
    0.5, -0.5,
  ]);

  const vertexBuffer = device.createBuffer({
    size: vertices.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  });

  device.queue.writeBuffer(vertexBuffer, 0, vertices);
  console.log("Buffer written");

  // Tick the device to process pending operations
  dawn.wgpuDeviceTick(deviceHandle);
  console.log("Device ticked after buffer write");

  const vertexModule = device.createShaderModule({ code: VERTEX_SHADER });
  const fragmentModule = device.createShaderModule({ code: FRAGMENT_SHADER });

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
      module: fragmentModule,
      entryPoint: "main",
      targets: [{ format: "bgra8unorm" }],
    },
    primitive: { topology: "triangle-list" },
  });

  console.log("Starting render loop...");

  let frameCount = 0;
  runWebGPURenderLoop(ctx, () => {
    frameCount++;

    // Tick every frame
    dawn.wgpuDeviceTick(deviceHandle);

    const textureView = context.getCurrentTexture().createView();
    const commandEncoder = device.createCommandEncoder();

    const renderPass = commandEncoder.beginRenderPass({
      colorAttachments: [{
        view: textureView,
        clearValue: { r: 0.0, g: 0.0, b: 0.5, a: 1.0 },
        loadOp: "clear",
        storeOp: "store",
      }],
    });

    renderPass.setPipeline(pipeline);
    renderPass.setVertexBuffer(0, vertexBuffer);
    renderPass.draw(3);
    renderPass.end();

    device.queue.submit([commandEncoder.finish()]);

    // Tick after submit
    dawn.wgpuDeviceTick(deviceHandle);

    if ("present" in context && typeof context.present === "function") {
      (context as any).present();
    }

    if (frameCount === 1) {
      console.log("First frame with ticks");
    }
  });
}

main().catch(console.error);
