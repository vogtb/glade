import { createWebGPUContext, runWebGPURenderLoop } from "@glade/platform";
import type { WebGPUContext } from "@glade/core";

import { initHexagonDemo } from "./hexagon.js";
import { initParticleDemo } from "./particle.js";
import { initMetaballDemo } from "./metaball.js";
import { initRaymarchDemo } from "./raymarch.js";
import { initGalaxyDemo, renderGalaxy } from "./galaxy.js";

const DEMO_CYCLE_INTERVAL_SECONDS = 1.0;

// ============================================================================
// Resource types
// ============================================================================

export interface DemoResources {
  pipeline: GPURenderPipeline;
  positionBuffer: GPUBuffer;
  colorBuffer: GPUBuffer;
  indexBuffer: GPUBuffer | null;
  uniformBuffer: GPUBuffer;
  bindGroup: GPUBindGroup;
  indexCount: number;
  vertexCount: number;
  instanceCount: number;
  useInstancing: boolean;
}

type RenderFn = (
  ctx: WebGPUContext,
  resources: DemoResources,
  time: number,
  deltaTime: number,
  mouseX: number,
  mouseY: number
) => void;

type Demo = {
  name: string;
  resources: DemoResources;
  render?: RenderFn;
};

// ============================================================================
// Default Rendering
// ============================================================================

function defaultRender(
  ctx: WebGPUContext,
  resources: DemoResources,
  time: number,
  _deltaTime: number,
  mouseX: number,
  mouseY: number
): void {
  const { device, context } = ctx;
  const {
    pipeline,
    positionBuffer,
    colorBuffer,
    indexBuffer,
    uniformBuffer,
    bindGroup,
    indexCount,
    vertexCount,
    instanceCount,
    useInstancing,
  } = resources;

  const uniformData = new Float32Array([time, 0, ctx.width, ctx.height, mouseX, mouseY, 0, 0]);
  device.queue.writeBuffer(uniformBuffer, 0, uniformData);

  const textureView = context.getCurrentTexture().createView();
  const commandEncoder = device.createCommandEncoder();

  const renderPass = commandEncoder.beginRenderPass({
    colorAttachments: [
      {
        view: textureView,
        clearValue: { r: 0.05, g: 0.05, b: 0.1, a: 1.0 },
        loadOp: "clear",
        storeOp: "store",
      },
    ],
  });

  renderPass.setPipeline(pipeline);
  renderPass.setBindGroup(0, bindGroup);

  if (useInstancing && vertexCount === 3 && instanceCount === 1) {
    // Full-screen triangle (metaball/raymarch demo) - no vertex buffers
    renderPass.draw(vertexCount);
  } else if (useInstancing) {
    renderPass.setVertexBuffer(0, positionBuffer);
    renderPass.setVertexBuffer(1, colorBuffer);
    renderPass.draw(vertexCount, instanceCount);
  } else if (indexBuffer) {
    renderPass.setVertexBuffer(0, positionBuffer);
    renderPass.setVertexBuffer(1, colorBuffer);
    renderPass.setIndexBuffer(indexBuffer, "uint16");
    renderPass.drawIndexed(indexCount);
  }

  renderPass.end();
  device.queue.submit([commandEncoder.finish()]);

  if ("present" in context && typeof context.present === "function") {
    (context as unknown as { present: () => void }).present();
  }
}

// ============================================================================
// Main entry point
// ============================================================================

async function main() {
  const ctx = await createWebGPUContext({
    width: 800,
    height: 600,
    title: "glade WebGPU Demo",
  });

  console.log("initializing WebGPU demos...");

  const format: GPUTextureFormat = "bgra8unorm";

  const demos: Array<Demo> = [
    { name: "Hexagon", resources: initHexagonDemo(ctx, format) },
    { name: "Particle System", resources: initParticleDemo(ctx, format) },
    { name: "Metaballs", resources: initMetaballDemo(ctx, format) },
    { name: "Raymarched 3D", resources: initRaymarchDemo(ctx, format) },
    { name: "Galaxy Simulation", resources: initGalaxyDemo(ctx, format), render: renderGalaxy },
  ];

  console.log("demos initialized, rendering...");

  let mouseX = ctx.width / 2;
  let mouseY = ctx.height / 2;

  ctx.onCursorMove((event) => {
    mouseX = event.x;
    mouseY = event.y;
  });

  let currentDemoIndex = 0;

  const renderCallback = (time: number, deltaTime: number): void => {
    // Cycle demos every 3 seconds
    const newDemoIndex = Math.floor(time / DEMO_CYCLE_INTERVAL_SECONDS) % demos.length;
    if (newDemoIndex !== currentDemoIndex) {
      currentDemoIndex = newDemoIndex;
      console.log(`Switching to demo: ${demos[currentDemoIndex]!.name}`);
    }

    const demo = demos[currentDemoIndex]!;
    const renderFn = demo.render ?? defaultRender;
    renderFn(ctx, demo.resources, time, deltaTime, mouseX, mouseY);
  };

  runWebGPURenderLoop(ctx, renderCallback);
}

main().catch(console.error);
