/**
 * Debug test with full-screen quad to make sure SOMETHING renders
 */

import { createWebGPUContext, runWebGPURenderLoop } from "@glade/platform";

async function main() {
  console.log("=== Fullscreen Quad Debug Test ===\n");

  const ctx = await createWebGPUContext({
    width: 800,
    height: 600,
    title: "Fullscreen Quad Debug",
  });

  const { device, context } = ctx;

  // Full-screen quad (two triangles)
  const vertices = new Float32Array([
    // First triangle (covers full screen)
    -1.0, -1.0,  // bottom-left
     1.0, -1.0,  // bottom-right
    -1.0,  1.0,  // top-left
    // Second triangle
     1.0, -1.0,  // bottom-right
     1.0,  1.0,  // top-right
    -1.0,  1.0,  // top-left
  ]);

  const vertexBuffer = device.createBuffer({
    size: vertices.byteLength,
    usage: 0x0020 | 0x0008, // VERTEX | COPY_DST
  });
  device.queue.writeBuffer(vertexBuffer, 0, vertices);
  console.log("Full-screen quad buffer created");

  const shaderModule = device.createShaderModule({
    code: `
      @vertex
      fn vs_main(@location(0) pos: vec2f) -> @builtin(position) vec4f {
        return vec4f(pos, 0.0, 1.0);
      }

      @fragment
      fn fs_main() -> @location(0) vec4f {
        return vec4f(1.0, 0.0, 0.0, 1.0); // Red
      }
    `,
  });

  const pipeline = device.createRenderPipeline({
    layout: "auto",
    vertex: {
      module: shaderModule,
      entryPoint: "vs_main",
      buffers: [{
        arrayStride: 8,
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

  console.log("Rendering fullscreen RED quad on BLUE background...");
  console.log("If you see all BLUE - vertex buffer is broken");
  console.log("If you see all RED - vertex buffer works!\n");

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
        clearValue: { r: 0.0, g: 0.0, b: 1.0, a: 1.0 }, // Blue background
      }],
    });

    pass.setPipeline(pipeline);
    pass.setVertexBuffer(0, vertexBuffer);
    pass.draw(6, 1, 0, 0); // 6 vertices for quad
    pass.end();

    device.queue.submit([encoder.finish()]);

    if ("present" in context) {
      (context as any).present();
    }
  });
}

main().catch(console.error);
