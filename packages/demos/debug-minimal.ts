/**
 * Minimal debug test - strips everything down to the bare minimum
 */

import { createWebGPUContext, runWebGPURenderLoop } from "@glade/platform";

async function main() {
  console.log("=== Minimal Debug Test ===\n");

  const ctx = await createWebGPUContext({
    width: 800,
    height: 600,
    title: "Minimal Debug",
  });

  const { device, context } = ctx;

  // Simplest possible triangle vertices
  const vertices = new Float32Array([
     0.0,  0.5,   // top center
    -0.5, -0.5,   // bottom left
     0.5, -0.5,   // bottom right
  ]);

  // Create buffer with ONLY vertex usage (no COPY_DST) using mappedAtCreation
  const vertexBuffer = device.createBuffer({
    size: vertices.byteLength,
    usage: 0x0020 | 0x0008, // VERTEX | COPY_DST
    mappedAtCreation: false,
  });

  // Write data
  device.queue.writeBuffer(vertexBuffer, 0, vertices);
  console.log("Buffer created and written");

  // Very simple shaders
  const shaderModule = device.createShaderModule({
    code: `
      struct VertexOutput {
        @builtin(position) position: vec4f,
      }

      @vertex
      fn vs_main(@location(0) pos: vec2f) -> VertexOutput {
        var output: VertexOutput;
        output.position = vec4f(pos.x, pos.y, 0.0, 1.0);
        return output;
      }

      @fragment
      fn fs_main() -> @location(0) vec4f {
        return vec4f(0.0, 1.0, 0.0, 1.0); // Green
      }
    `,
  });
  console.log("Shader module created");

  const pipeline = device.createRenderPipeline({
    layout: "auto",
    vertex: {
      module: shaderModule,
      entryPoint: "vs_main",
      buffers: [{
        arrayStride: 8, // 2 * sizeof(float)
        stepMode: "vertex",
        attributes: [{
          format: "float32x2",
          offset: 0,
          shaderLocation: 0,
        }],
      }],
    },
    fragment: {
      module: shaderModule,
      entryPoint: "fs_main",
      targets: [{ format: "bgra8unorm" }],
    },
    primitive: {
      topology: "triangle-list",
    },
  });
  console.log("Pipeline created");

  console.log("\nRendering... (should show GREEN triangle on DARK BLUE background)");

  let frame = 0;
  runWebGPURenderLoop(ctx, () => {
    frame++;

    const texture = context.getCurrentTexture();
    const view = texture.createView();

    const encoder = device.createCommandEncoder();
    const pass = encoder.beginRenderPass({
      colorAttachments: [{
        view: view,
        loadOp: "clear",
        storeOp: "store",
        clearValue: { r: 0.1, g: 0.1, b: 0.3, a: 1.0 },
      }],
    });

    pass.setPipeline(pipeline);
    pass.setVertexBuffer(0, vertexBuffer);
    pass.draw(3, 1, 0, 0);
    pass.end();

    const commandBuffer = encoder.finish();
    device.queue.submit([commandBuffer]);

    if ("present" in context) {
      (context as any).present();
    }

    if (frame === 1) {
      console.log("First frame rendered");
    }
  });
}

main().catch(console.error);
