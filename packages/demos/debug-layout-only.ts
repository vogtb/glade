/**
 * Test: Shader with vertex input (@location(0)) but DON'T call setVertexBuffer
 * This should fail/not render anything (validation error or undefined behavior)
 */

import { createWebGPUContext, runWebGPURenderLoop } from "@glade/platform";

const GPUBufferUsage = {
  VERTEX: 0x0020,
  COPY_DST: 0x0008,
} as const;

// Shader that expects vertex buffer input
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
  console.log("=== Test: Pipeline with vertex layout, but NO setVertexBuffer call ===\n");

  const ctx = await createWebGPUContext({
    width: 800,
    height: 600,
    title: "Layout Only Test",
  });

  const { device, context } = ctx;

  // DON'T create a vertex buffer

  const vertexModule = device.createShaderModule({ code: VERTEX_SHADER });
  const fragmentModule = device.createShaderModule({ code: FRAGMENT_SHADER });

  // Pipeline WITH vertex buffers layout
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
  console.log("Pipeline created WITH vertex buffer layout");

  console.log("\nRendering WITHOUT calling setVertexBuffer...");
  console.log("This should probably fail or show nothing (undefined behavior)\n");

  let frameCount = 0;
  runWebGPURenderLoop(ctx, () => {
    frameCount++;

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

    // DON'T call setVertexBuffer - pipeline expects it but we don't provide it

    renderPass.draw(3);
    renderPass.end();

    device.queue.submit([commandEncoder.finish()]);

    if ("present" in context && typeof context.present === "function") {
      (context as any).present();
    }

    if (frameCount === 1) {
      console.log("First frame rendered (or crashed?)");
    }
  });
}

main().catch(console.error);
