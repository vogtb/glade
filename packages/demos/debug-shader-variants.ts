/**
 * Test different shader variants to see if one works
 */

import { createWebGPUContext, runWebGPURenderLoop } from "@glade/platform";

const GPUBufferUsage = {
  VERTEX: 0x0020,
  COPY_DST: 0x0008,
} as const;

// Variant 1: Simple direct return
const SHADER_V1 = `
@vertex
fn vs_main(@location(0) pos: vec2f) -> @builtin(position) vec4f {
  return vec4f(pos, 0.0, 1.0);
}

@fragment
fn fs_main() -> @location(0) vec4f {
  return vec4f(1.0, 0.0, 0.0, 1.0);
}
`;

// Variant 2: With explicit struct
const SHADER_V2 = `
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
  return vec4f(0.0, 1.0, 0.0, 1.0);
}
`;

// Variant 3: With input struct
const SHADER_V3 = `
struct VertexInput {
  @location(0) position: vec2f,
}

struct VertexOutput {
  @builtin(position) position: vec4f,
}

@vertex
fn vs_main(input: VertexInput) -> VertexOutput {
  var output: VertexOutput;
  output.position = vec4f(input.position, 0.0, 1.0);
  return output;
}

@fragment
fn fs_main() -> @location(0) vec4f {
  return vec4f(0.0, 0.0, 1.0, 1.0);
}
`;

async function main() {
  console.log("=== Shader Variants Test ===\n");

  const ctx = await createWebGPUContext({
    width: 800,
    height: 600,
    title: "Shader Variants",
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

  // Create all three shader modules
  const shader1 = device.createShaderModule({ code: SHADER_V1 });
  const shader2 = device.createShaderModule({ code: SHADER_V2 });
  const shader3 = device.createShaderModule({ code: SHADER_V3 });
  console.log("All shader modules created successfully");

  const vertexBufferLayout = {
    arrayStride: 8,
    stepMode: "vertex" as const,
    attributes: [{
      shaderLocation: 0,
      offset: 0,
      format: "float32x2" as const,
    }],
  };

  // Create pipelines for each variant
  const pipeline1 = device.createRenderPipeline({
    layout: "auto",
    vertex: {
      module: shader1,
      entryPoint: "vs_main",
      buffers: [vertexBufferLayout],
    },
    fragment: {
      module: shader1,
      entryPoint: "fs_main",
      targets: [{ format: "bgra8unorm" }],
    },
    primitive: { topology: "triangle-list" },
  });
  console.log("Pipeline 1 (simple) created - should be RED");

  const pipeline2 = device.createRenderPipeline({
    layout: "auto",
    vertex: {
      module: shader2,
      entryPoint: "vs_main",
      buffers: [vertexBufferLayout],
    },
    fragment: {
      module: shader2,
      entryPoint: "fs_main",
      targets: [{ format: "bgra8unorm" }],
    },
    primitive: { topology: "triangle-list" },
  });
  console.log("Pipeline 2 (output struct) created - should be GREEN");

  const pipeline3 = device.createRenderPipeline({
    layout: "auto",
    vertex: {
      module: shader3,
      entryPoint: "vs_main",
      buffers: [vertexBufferLayout],
    },
    fragment: {
      module: shader3,
      entryPoint: "fs_main",
      targets: [{ format: "bgra8unorm" }],
    },
    primitive: { topology: "triangle-list" },
  });
  console.log("Pipeline 3 (input+output struct) created - should be BLUE");

  const pipelines = [pipeline1, pipeline2, pipeline3];
  const colors = ["RED", "GREEN", "BLUE"];

  console.log("\nCycling through shader variants every 2 seconds...");
  console.log("Watch for triangle color changes!\n");

  let frameCount = 0;
  runWebGPURenderLoop(ctx, () => {
    frameCount++;

    const pipelineIndex = Math.floor(frameCount / 120) % 3;
    const pipeline = pipelines[pipelineIndex];

    if (frameCount % 120 === 1) {
      console.log(`Switching to variant ${pipelineIndex + 1} (${colors[pipelineIndex]} triangle)`);
    }

    const textureView = context.getCurrentTexture().createView();
    const commandEncoder = device.createCommandEncoder();

    const renderPass = commandEncoder.beginRenderPass({
      colorAttachments: [{
        view: textureView,
        clearValue: { r: 0.2, g: 0.2, b: 0.2, a: 1.0 }, // Gray background
        loadOp: "clear",
        storeOp: "store",
      }],
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
