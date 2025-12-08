import { createWebGPUContext, runWebGPURenderLoop } from "@glade/platform";
import { KeyAction, type WebGPUContext } from "@glade/core";

import { initHexagonDemo } from "./hexagon";
import { initParticleDemo } from "./particle";
import { initMetaballDemo } from "./metaball";
import { initRaymarchDemo } from "./raymarch";
import { initGalaxyDemo, renderGalaxy } from "./galaxy";
import { initFluidDemo, renderFluid } from "./fluid";
import { initPostProcessDemo, renderPostProcess } from "./postprocess";
import { initTerrainDemo } from "./terrain";
import { initFlashDemo, renderFlashDemo, type FlashDemoResources } from "./flash";
import type { DemoResources } from "./common";

type RenderFn<T> = (
  ctx: WebGPUContext,
  resources: T,
  time: number,
  deltaTime: number,
  mouseX: number,
  mouseY: number
) => void;

type Demo<T = DemoResources> = {
  name: string;
  resources: T;
  render?: RenderFn<T>;
};

type AnyDemo = Demo<DemoResources> | Demo<FlashDemoResources>;

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

  // Use the format from the context (matches browser's getPreferredCanvasFormat)
  const format = ctx.format;

  const demos: Array<AnyDemo> = [
    {
      name: "Flash GUI",
      resources: initFlashDemo(ctx, format),
      render: renderFlashDemo,
    } as Demo<FlashDemoResources>,
    {
      name: "Post-Processing",
      resources: initPostProcessDemo(ctx, format),
      render: renderPostProcess,
    },
    { name: "Hexagon", resources: initHexagonDemo(ctx, format) },
    { name: "Particle System", resources: initParticleDemo(ctx, format) },
    { name: "Metaballs", resources: initMetaballDemo(ctx, format) },
    { name: "Raymarched 3D", resources: initRaymarchDemo(ctx, format) },
    { name: "Galaxy Simulation", resources: initGalaxyDemo(ctx, format), render: renderGalaxy },
    { name: "Fluid Simulation", resources: initFluidDemo(ctx, format), render: renderFluid },
    { name: "Terrain Flyover", resources: initTerrainDemo(ctx, format) },
  ];

  console.log("demos initialized, rendering...");

  // Use logical window size for mouse position (not framebuffer size)
  const ctxAny = ctx as { windowWidth?: number; windowHeight?: number };
  const logicalWidth = ctxAny.windowWidth ?? ctx.width;
  const logicalHeight = ctxAny.windowHeight ?? ctx.height;
  console.log(
    `Context: framebuffer=${ctx.width}x${ctx.height}, logical=${logicalWidth}x${logicalHeight}`
  );

  let mouseX = logicalWidth / 2;
  let mouseY = logicalHeight / 2;

  ctx.onCursorMove((event) => {
    mouseX = event.x;
    mouseY = event.y;
  });

  let currentDemoIndex = 0;
  console.log(`Current demo: ${demos[currentDemoIndex]!.name} (use left/right arrows to navigate)`);

  // GLFW key codes: RIGHT=262, LEFT=263
  const KEY_RIGHT = 262;
  const KEY_LEFT = 263;

  ctx.onKey((event) => {
    if (event.action !== KeyAction.Press) {
      return;
    }

    if (event.key === KEY_RIGHT) {
      currentDemoIndex = (currentDemoIndex + 1) % demos.length;
      console.log(`Switching to demo: ${demos[currentDemoIndex]!.name}`);
    } else if (event.key === KEY_LEFT) {
      currentDemoIndex = (currentDemoIndex - 1 + demos.length) % demos.length;
      console.log(`Switching to demo: ${demos[currentDemoIndex]!.name}`);
    }
  });

  const renderCallback = (time: number, deltaTime: number): void => {
    const demo = demos[currentDemoIndex]!;
    if (demo.render) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      demo.render(ctx, demo.resources as any, time, deltaTime, mouseX, mouseY);
    } else {
      defaultRender(ctx, demo.resources as DemoResources, time, deltaTime, mouseX, mouseY);
    }
  };

  runWebGPURenderLoop(ctx, renderCallback);
}

main().catch(console.error);
