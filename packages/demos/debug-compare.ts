/**
 * Debug test that compares hardcoded vertices vs vertex buffer
 * Renders each for a few frames to see which works
 */

import { createWebGPUContext, runWebGPURenderLoop } from "@glade/platform";

const GPUBufferUsage = {
  VERTEX: 0x0020,
  COPY_DST: 0x0008,
} as const;

// Shader with hardcoded vertices (this WORKS)
const HARDCODED_VERTEX_SHADER = `
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

// Shader that uses vertex buffer (this does NOT work)
const BUFFER_VERTEX_SHADER = `
@vertex
fn main(@location(0) pos: vec2f) -> @builtin(position) vec4f {
  return vec4f(pos, 0.0, 1.0);
}
`;

const RED_FRAGMENT_SHADER = `
@fragment
fn main() -> @location(0) vec4f {
  return vec4f(1.0, 0.0, 0.0, 1.0);
}
`;

const GREEN_FRAGMENT_SHADER = `
@fragment
fn main() -> @location(0) vec4f {
  return vec4f(0.0, 1.0, 0.0, 1.0);
}
`;

async function main() {
  console.log("=== Debug Compare: Hardcoded vs Buffer ===\n");

  const ctx = await createWebGPUContext({
    width: 800,
    height: 600,
    title: "Debug Compare Test",
  });

  const { device, context } = ctx;

  // Create vertex buffer
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

  // Create hardcoded shader pipeline (RED triangle) - no vertex buffers
  const hardcodedVertexModule = device.createShaderModule({ code: HARDCODED_VERTEX_SHADER });
  const redFragmentModule = device.createShaderModule({ code: RED_FRAGMENT_SHADER });

  const hardcodedPipeline = device.createRenderPipeline({
    layout: "auto",
    vertex: {
      module: hardcodedVertexModule,
      entryPoint: "main",
      // NO buffers - uses vertex_index
    },
    fragment: {
      module: redFragmentModule,
      entryPoint: "main",
      targets: [{ format: "bgra8unorm" }],
    },
    primitive: { topology: "triangle-list" },
  });

  // Create buffer shader pipeline (GREEN triangle) - uses vertex buffer
  const bufferVertexModule = device.createShaderModule({ code: BUFFER_VERTEX_SHADER });
  const greenFragmentModule = device.createShaderModule({ code: GREEN_FRAGMENT_SHADER });

  const bufferPipeline = device.createRenderPipeline({
    layout: "auto",
    vertex: {
      module: bufferVertexModule,
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
      module: greenFragmentModule,
      entryPoint: "main",
      targets: [{ format: "bgra8unorm" }],
    },
    primitive: { topology: "triangle-list" },
  });

  console.log("Both pipelines created successfully");
  console.log("Alternating between pipelines every 60 frames:");
  console.log("  - RED triangle = hardcoded (should work)");
  console.log("  - GREEN triangle = vertex buffer (broken)");
  console.log("");

  let frameCount = 0;
  runWebGPURenderLoop(ctx, () => {
    frameCount++;

    // Alternate between pipelines every 60 frames
    const useHardcoded = Math.floor(frameCount / 60) % 2 === 0;

    if (frameCount % 60 === 1) {
      console.log(`Frame ${frameCount}: Using ${useHardcoded ? "HARDCODED (red)" : "BUFFER (green)"} pipeline`);
    }

    const textureView = context.getCurrentTexture().createView();
    const commandEncoder = device.createCommandEncoder();

    const renderPass = commandEncoder.beginRenderPass({
      colorAttachments: [
        {
          view: textureView,
          clearValue: { r: 0.0, g: 0.0, b: 0.3, a: 1.0 }, // Dark blue background
          loadOp: "clear",
          storeOp: "store",
        },
      ],
    });

    if (useHardcoded) {
      renderPass.setPipeline(hardcodedPipeline);
      renderPass.draw(3);
    } else {
      renderPass.setPipeline(bufferPipeline);
      renderPass.setVertexBuffer(0, vertexBuffer);
      renderPass.draw(3);
    }

    renderPass.end();
    device.queue.submit([commandEncoder.finish()]);

    if ("present" in context && typeof context.present === "function") {
      (context as any).present();
    }
  });
}

main().catch(console.error);
