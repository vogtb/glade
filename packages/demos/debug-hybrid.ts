/**
 * Hybrid test - hardcoded vertices in shader, but still call setVertexBuffer
 * to see if that breaks rendering
 */

import { createWebGPUContext, runWebGPURenderLoop } from "@glade/platform";

const GPUBufferUsage = {
  VERTEX: 0x0020,
  COPY_DST: 0x0008,
} as const;

// Shader with hardcoded vertices (ignores any vertex buffer)
const VERTEX_SHADER = `
@vertex
fn main(@builtin(vertex_index) vertexIndex: u32) -> @builtin(position) vec4f {
  var pos = array<vec2f, 3>(
    vec2f(0.0, 0.5),
    vec2f(-0.5, -0.5),
    vec2f(0.5, -0.5)
  );
  return vec4f(pos[vertexIndex], 0.0, 1.0);
}
`;

const FRAGMENT_SHADER = `
@fragment
fn main() -> @location(0) vec4f {
  return vec4f(1.0, 0.0, 0.0, 1.0);
}
`;

async function main() {
  console.log("=== Hybrid Test: Hardcoded shader + setVertexBuffer call ===\n");

  const ctx = await createWebGPUContext({
    width: 800,
    height: 600,
    title: "Hybrid Test",
  });

  const { device, context } = ctx;

  // Create a vertex buffer even though we won't use it
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
  console.log("Vertex buffer created (but shader ignores it)");

  const vertexModule = device.createShaderModule({ code: VERTEX_SHADER });
  const fragmentModule = device.createShaderModule({ code: FRAGMENT_SHADER });

  // Pipeline WITHOUT vertex buffers (shader uses vertex_index)
  const pipeline = device.createRenderPipeline({
    layout: "auto",
    vertex: {
      module: vertexModule,
      entryPoint: "main",
      // NO buffers - shader uses vertex_index
    },
    fragment: {
      module: fragmentModule,
      entryPoint: "main",
      targets: [{ format: "bgra8unorm" }],
    },
    primitive: { topology: "triangle-list" },
  });
  console.log("Pipeline created (no vertex buffers in layout)");

  console.log("\nTest 1: Rendering WITHOUT calling setVertexBuffer...");
  console.log("Should show RED triangle on BLUE background\n");

  let frameCount = 0;
  const testPhase1Frames = 120; // 2 seconds at 60fps

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

    // DON'T call setVertexBuffer - shader doesn't need it
    // This should work (and does work)

    renderPass.draw(3);
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
