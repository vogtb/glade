/**
 * Debug test to trace vertex format mapping
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
  console.log("=== Debug Vertex Format ===\n");

  const ctx = await createWebGPUContext({
    width: 800,
    height: 600,
    title: "Debug Format",
  });

  const { device, context } = ctx;

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

  const vertexModule = device.createShaderModule({ code: VERTEX_SHADER });
  const fragmentModule = device.createShaderModule({ code: FRAGMENT_SHADER });

  // Log what we're passing in
  const vertexBufferLayout = {
    arrayStride: 8,
    stepMode: "vertex" as const,
    attributes: [{
      shaderLocation: 0,
      offset: 0,
      format: "float32x2" as const,
    }],
  };

  console.log("Vertex buffer layout:", JSON.stringify(vertexBufferLayout, null, 2));
  console.log("attributes[0].format =", vertexBufferLayout.attributes[0].format);
  console.log("typeof format =", typeof vertexBufferLayout.attributes[0].format);

  const pipelineDescriptor = {
    layout: "auto" as const,
    vertex: {
      module: vertexModule,
      entryPoint: "main",
      buffers: [vertexBufferLayout],
    },
    fragment: {
      module: fragmentModule,
      entryPoint: "main",
      targets: [{ format: "bgra8unorm" as const }],
    },
    primitive: { topology: "triangle-list" as const },
  };

  console.log("\nCreating pipeline with descriptor...");
  const pipeline = device.createRenderPipeline(pipelineDescriptor);
  console.log("Pipeline created:", pipeline);

  // Exit immediately
  ctx.destroy();
}

main().catch(console.error);
