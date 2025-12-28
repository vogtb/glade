import { GPUBufferUsage, GPUShaderStage } from "@glade/core/webgpu";
import type { WebGPUHost, WebGPUHostInput, RenderTexture } from "@glade/flash/host.ts";
import { createRenderTexture } from "@glade/flash/host.ts";

const VERTEX_SHADER = `
struct VertexInput {
  @location(0) a_position: vec2f,
  @location(1) a_color: vec3f,
}

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) v_color: vec3f,
  @location(1) v_center: vec2f,
  @location(2) v_radius: f32,
}

struct Uniforms {
  u_time: f32,
  _pad: f32,
  u_resolution: vec2f,
  u_mouse: vec2f,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

@vertex
fn main(input: VertexInput, @builtin(vertex_index) vertexIndex: u32, @builtin(instance_index) instanceIndex: u32) -> VertexOutput {
  var output: VertexOutput;

  let aspect = uniforms.u_resolution.x / uniforms.u_resolution.y;

  // Convert mouse to normalized coords
  var mouseNorm = (uniforms.u_mouse / uniforms.u_resolution) * 2.0 - 1.0;
  mouseNorm.y = -mouseNorm.y;

  // Calculate particle properties based on instance
  let particleCount = 24u;
  let fi = f32(instanceIndex);
  let baseAngle = fi * 6.283185 / f32(particleCount);

  // Multiple orbit rings
  let ring = instanceIndex % 3u;
  let ringRadius = 0.25 + f32(ring) * 0.2;

  // Different speeds per ring
  let speed = 0.8 - f32(ring) * 0.2;
  let angle = baseAngle + uniforms.u_time * speed;

  // Calculate orbit center (follows mouse with lag)
  let orbitCenter = mouseNorm * 0.4;

  // Particle center position on orbit
  var particleCenter = vec2f(
    orbitCenter.x + cos(angle) * ringRadius,
    orbitCenter.y + sin(angle) * ringRadius
  );

  // Add some wobble to individual particles
  particleCenter.x += sin(uniforms.u_time * 3.0 + fi * 0.5) * 0.02;
  particleCenter.y += cos(uniforms.u_time * 2.5 + fi * 0.7) * 0.02;

  // Particle size varies with ring and pulses
  let baseSize = 0.06 - f32(ring) * 0.015;
  let size = baseSize * (0.8 + 0.2 * sin(uniforms.u_time * 4.0 + fi));

  // Apply vertex position (quad corners) around particle center
  var pos = particleCenter + input.a_position * size;
  pos.x /= aspect;

  output.position = vec4f(pos, 0.0, 1.0);

  // Color based on ring and angle
  let hue = fract(fi / f32(particleCount) + uniforms.u_time * 0.1);
  let saturation = 0.8 + 0.2 * sin(uniforms.u_time + fi);

  // HSV to RGB conversion
  let c = saturation;
  let x = c * (1.0 - abs(fract(hue * 6.0) * 2.0 - 1.0));
  let m = 0.3;

  var rgb: vec3f;
  let h6 = hue * 6.0;
  if (h6 < 1.0) { rgb = vec3f(c, x, 0.0); }
  else if (h6 < 2.0) { rgb = vec3f(x, c, 0.0); }
  else if (h6 < 3.0) { rgb = vec3f(0.0, c, x); }
  else if (h6 < 4.0) { rgb = vec3f(0.0, x, c); }
  else if (h6 < 5.0) { rgb = vec3f(x, 0.0, c); }
  else { rgb = vec3f(c, 0.0, x); }

  output.v_color = rgb + m;
  output.v_center = particleCenter;
  output.v_radius = size;

  return output;
}
`;

const FRAGMENT_SHADER = `
struct Uniforms {
  u_time: f32,
  _pad: f32,
  u_resolution: vec2f,
  u_mouse: vec2f,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

@fragment
fn main(
  @location(0) v_color: vec3f,
  @location(1) v_center: vec2f,
  @location(2) v_radius: f32,
  @builtin(position) fragCoord: vec4f
) -> @location(0) vec4f {
  // Convert fragment coord to normalized space
  let uv = (fragCoord.xy / uniforms.u_resolution) * 2.0 - 1.0;
  let aspect = uniforms.u_resolution.x / uniforms.u_resolution.y;

  // Calculate distance from particle center for soft circle
  var adjustedCenter = v_center;
  adjustedCenter.x /= aspect;
  var adjustedUV = vec2f(uv.x, -uv.y);

  let dist = length(adjustedUV - adjustedCenter);
  let edge = v_radius / aspect;

  // Soft circle with glow
  let alpha = 1.0 - smoothstep(edge * 0.3, edge, dist);
  let glow = exp(-dist * dist * 50.0) * 0.5;

  // Add shimmer effect
  let shimmer = 0.1 * sin(uniforms.u_time * 10.0 + fragCoord.x * 0.1 + fragCoord.y * 0.1);

  var color = v_color * (1.0 + shimmer);
  color += vec3f(glow);

  return vec4f(clamp(color, vec3f(0.0), vec3f(1.0)), alpha + glow * 0.5);
}
`;

function createQuadGeometry(): { positions: Float32Array; colors: Float32Array } {
  // A simple quad (two triangles) for each particle instance
  // Positions are offsets from particle center
  const positions = new Float32Array([-1, -1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1]);

  // Colors (will be overridden in shader, but needed for vertex layout)
  const colors = new Float32Array([1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]);

  return { positions, colors };
}

type ParticleResources = {
  pipeline: GPURenderPipeline;
  positionBuffer: GPUBuffer;
  colorBuffer: GPUBuffer;
  uniformBuffer: GPUBuffer;
  bindGroup: GPUBindGroup;
  vertexCount: number;
  instanceCount: number;
};

class ParticleHost implements WebGPUHost {
  private renderTexture: RenderTexture;
  private resources: ParticleResources | null = null;
  private ready = false;

  constructor(
    private device: GPUDevice,
    private format: GPUTextureFormat,
    width: number,
    height: number
  ) {
    this.renderTexture = createRenderTexture(device, width, height, format);
    this.initAsync();
  }

  private async initAsync(): Promise<void> {
    this.resources = this.initResources();
    await new Promise((resolve) => setTimeout(resolve, 0));
    this.ready = true;
  }

  private initResources(): ParticleResources {
    const { device, format } = this;

    const { positions, colors } = createQuadGeometry();
    const particleCount = 24;

    const positionBuffer = device.createBuffer({
      size: positions.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(positionBuffer, 0, positions);

    const colorBuffer = device.createBuffer({
      size: colors.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(colorBuffer, 0, colors);

    const uniformBuffer = device.createBuffer({
      size: 32,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const bindGroupLayout = device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
          buffer: { type: "uniform" },
        },
      ],
    });

    const pipelineLayout = device.createPipelineLayout({
      bindGroupLayouts: [bindGroupLayout],
    });

    const vertexModule = device.createShaderModule({ code: VERTEX_SHADER });
    const fragmentModule = device.createShaderModule({ code: FRAGMENT_SHADER });

    const pipeline = device.createRenderPipeline({
      layout: pipelineLayout,
      vertex: {
        module: vertexModule,
        entryPoint: "main",
        buffers: [
          {
            arrayStride: 8,
            attributes: [{ shaderLocation: 0, offset: 0, format: "float32x2" }],
          },
          {
            arrayStride: 12,
            attributes: [{ shaderLocation: 1, offset: 0, format: "float32x3" }],
          },
        ],
      },
      fragment: {
        module: fragmentModule,
        entryPoint: "main",
        targets: [
          {
            format,
            blend: {
              color: {
                srcFactor: "src-alpha",
                dstFactor: "one-minus-src-alpha",
                operation: "add",
              },
              alpha: {
                srcFactor: "one",
                dstFactor: "one-minus-src-alpha",
                operation: "add",
              },
            },
          },
        ],
      },
      primitive: { topology: "triangle-list" },
    });

    const bindGroup = device.createBindGroup({
      layout: bindGroupLayout,
      entries: [{ binding: 0, resource: { buffer: uniformBuffer } }],
    });

    return {
      pipeline,
      positionBuffer,
      colorBuffer,
      uniformBuffer,
      bindGroup,
      vertexCount: 6,
      instanceCount: particleCount,
    };
  }

  resize(width: number, height: number): void {
    if (width <= 0 || height <= 0) {
      return;
    }
    this.renderTexture.resize(width, height);
  }

  render(input: WebGPUHostInput, encoder: GPUCommandEncoder): void {
    if (!this.ready || !this.resources) {
      return;
    }

    const { time, mouseX, mouseY, width, height } = input;

    const uniformData = new Float32Array([time, 0, width, height, mouseX, mouseY, 0, 0]);
    this.device.queue.writeBuffer(this.resources.uniformBuffer, 0, uniformData);

    const textureView = this.renderTexture.textureView;

    const renderPass = encoder.beginRenderPass({
      colorAttachments: [
        {
          view: textureView,
          clearValue: { r: 0.02, g: 0.02, b: 0.05, a: 1.0 },
          loadOp: "clear",
          storeOp: "store",
        },
      ],
    });

    renderPass.setPipeline(this.resources.pipeline);
    renderPass.setBindGroup(0, this.resources.bindGroup);
    renderPass.setVertexBuffer(0, this.resources.positionBuffer);
    renderPass.setVertexBuffer(1, this.resources.colorBuffer);
    renderPass.draw(this.resources.vertexCount, this.resources.instanceCount);
    renderPass.end();
  }

  getTexture(): RenderTexture {
    return this.renderTexture;
  }

  destroy(): void {
    this.renderTexture.destroy();
    if (this.resources) {
      this.resources.positionBuffer.destroy();
      this.resources.colorBuffer.destroy();
      this.resources.uniformBuffer.destroy();
    }
  }
}

export function createParticleHost(
  device: GPUDevice,
  format: GPUTextureFormat,
  width: number,
  height: number
): WebGPUHost {
  return new ParticleHost(device, format, width, height);
}
