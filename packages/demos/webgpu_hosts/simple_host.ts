/**
 * Simple Demo Host Adapter
 *
 * Generic adapter for demos that use the default render pattern
 * (Hexagon, Particle, Metaball, Raymarch, Terrain).
 */

import { GPUTextureUsage } from "@glade/core/webgpu";
import type { WebGPUHost, WebGPUHostInput } from "@glade/flash/webgpu_host.ts";
import { createRenderTexture, type RenderTexture } from "@glade/flash/render_texture.ts";
import type { DemoResources } from "../common.ts";

/**
 * Minimal context shape that demo init functions expect.
 * This is compatible with WebGPUContext from core.
 */
type DemoContext = { device: GPUDevice };

/**
 * Creates a WebGPU host that wraps a simple demo with default rendering.
 */
export class SimpleDemoHost implements WebGPUHost {
  private renderTexture: RenderTexture;
  private resources: DemoResources | null = null;
  private initError = false;
  private ready = false;

  constructor(
    private device: GPUDevice,
    private format: GPUTextureFormat,
    width: number,
    height: number,
    initFn: (ctx: DemoContext, format: GPUTextureFormat) => DemoResources
  ) {
    this.renderTexture = createRenderTexture(device, width, height, format);
    // Initialize asynchronously to allow pipeline validation to complete
    this.initAsync(initFn);
  }

  private async initAsync(
    initFn: (ctx: DemoContext, format: GPUTextureFormat) => DemoResources
  ): Promise<void> {
    try {
      this.resources = initFn({ device: this.device }, this.format);
      // Wait a frame for GPU to validate pipelines
      await new Promise((resolve) => setTimeout(resolve, 0));
      this.ready = true;
    } catch (e) {
      console.error("[SimpleDemoHost] Failed to initialize resources:", e);
      this.initError = true;
    }
  }

  resize(width: number, height: number): void {
    if (width <= 0 || height <= 0) {
      return;
    }
    this.renderTexture.resize(width, height);
  }

  render(input: WebGPUHostInput, encoder: GPUCommandEncoder): void {
    if (!this.ready || !this.resources || this.initError) {
      return;
    }

    const { time, mouseX, mouseY, width, height } = input;

    // Update uniforms
    const uniformData = new Float32Array([time, 0, width, height, mouseX, mouseY, 0, 0]);
    this.device.queue.writeBuffer(this.resources.uniformBuffer, 0, uniformData);

    const textureView = this.renderTexture.textureView;

    const renderPass = encoder.beginRenderPass({
      colorAttachments: [
        {
          view: textureView,
          clearValue: { r: 0.05, g: 0.05, b: 0.1, a: 1.0 },
          loadOp: "clear",
          storeOp: "store",
        },
      ],
    });

    renderPass.setPipeline(this.resources.pipeline);
    renderPass.setBindGroup(0, this.resources.bindGroup);

    if (
      this.resources.useInstancing &&
      this.resources.vertexCount === 3 &&
      this.resources.instanceCount === 1
    ) {
      // Full-screen triangle (metaball/raymarch demo) - no vertex buffers
      renderPass.draw(this.resources.vertexCount);
    } else if (this.resources.useInstancing) {
      renderPass.setVertexBuffer(0, this.resources.positionBuffer);
      renderPass.setVertexBuffer(1, this.resources.colorBuffer);
      renderPass.draw(this.resources.vertexCount, this.resources.instanceCount);
    } else if (this.resources.indexBuffer) {
      renderPass.setVertexBuffer(0, this.resources.positionBuffer);
      renderPass.setVertexBuffer(1, this.resources.colorBuffer);
      renderPass.setIndexBuffer(this.resources.indexBuffer, "uint16");
      renderPass.drawIndexed(this.resources.indexCount);
    }

    renderPass.end();
  }

  getTexture(): RenderTexture {
    return this.renderTexture;
  }

  destroy(): void {
    this.renderTexture.destroy();
    if (this.resources) {
      this.resources.positionBuffer?.destroy();
      this.resources.colorBuffer?.destroy();
      this.resources.indexBuffer?.destroy();
      this.resources.uniformBuffer?.destroy();
    }
  }
}

/**
 * Factory function to create a SimpleDemoHost.
 */
export function createSimpleDemoHost(
  device: GPUDevice,
  format: GPUTextureFormat,
  width: number,
  height: number,
  initFn: (ctx: DemoContext, format: GPUTextureFormat) => DemoResources
): SimpleDemoHost {
  return new SimpleDemoHost(device, format, width, height, initFn);
}

export type { DemoContext };
