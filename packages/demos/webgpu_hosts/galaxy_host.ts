/**
 * Galaxy Demo Host Adapter
 *
 * Adapter for the Galaxy simulation demo with compute passes for particle physics.
 */

import { GPUBufferUsage, GPUShaderStage } from "@glade/core/webgpu";
import type { WebGPUHost, WebGPUHostInput } from "@glade/flash/webgpu_host.ts";
import { createRenderTexture, type RenderTexture } from "@glade/flash/render_texture.ts";

const NUM_STARS = 8000;
const NUM_DUST = 2000;

const VERTEX_SHADER = `
struct Uniforms {
  u_time: f32,
  _pad: f32,
  u_resolution: vec2f,
  u_mouse: vec2f,
}

struct Star {
  position: vec2f,
  velocity: vec2f,
  color: vec3f,
  size: f32,
  age: f32,
  type_id: f32,
}

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) v_color: vec3f,
  @location(1) v_uv: vec2f,
  @location(2) v_size: f32,
  @location(3) v_type: f32,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var<storage, read> stars: array<Star>;

@vertex
fn main(@builtin(vertex_index) vertexIndex: u32, @builtin(instance_index) instanceIndex: u32) -> VertexOutput {
  var output: VertexOutput;

  let star = stars[instanceIndex];
  let aspect = uniforms.u_resolution.x / uniforms.u_resolution.y;

  var quadPos: array<vec2f, 6> = array<vec2f, 6>(
    vec2f(-1.0, -1.0),
    vec2f(1.0, -1.0),
    vec2f(1.0, 1.0),
    vec2f(-1.0, -1.0),
    vec2f(1.0, 1.0),
    vec2f(-1.0, 1.0)
  );

  let localPos = quadPos[vertexIndex];
  let size = star.size * (0.8 + 0.2 * sin(uniforms.u_time * 3.0 + star.age * 10.0));

  var worldPos = star.position + localPos * size * 0.015;
  worldPos.x /= aspect;

  output.position = vec4f(worldPos, 0.0, 1.0);
  output.v_color = star.color;
  output.v_uv = localPos;
  output.v_size = size;
  output.v_type = star.type_id;

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
  @location(1) v_uv: vec2f,
  @location(2) v_size: f32,
  @location(3) v_type: f32
) -> @location(0) vec4f {
  let dist = length(v_uv);

  var alpha: f32;
  var color = v_color;

  if (v_type < 0.5) {
    let core = exp(-dist * dist * 8.0);
    let glow = exp(-dist * 1.5) * 0.5;
    let rays = (1.0 + 0.3 * sin(atan2(v_uv.y, v_uv.x) * 4.0 + uniforms.u_time)) * exp(-dist * 3.0) * 0.2;
    alpha = core + glow + rays;

    if (v_size > 1.5) {
      let offset = 0.02;
      color.r *= 1.0 + offset * (1.0 - dist);
      color.b *= 1.0 - offset * (1.0 - dist);
    }
  } else if (v_type < 1.5) {
    alpha = exp(-dist * dist * 2.0) * 0.15;
    color *= 0.6;
  } else {
    let ring = smoothstep(0.3, 0.5, dist) * smoothstep(1.0, 0.7, dist);
    let glow = exp(-dist * 0.5) * 0.8;
    alpha = ring * 0.8 + glow;

    let swirl = sin(atan2(v_uv.y, v_uv.x) * 3.0 - uniforms.u_time * 2.0 + dist * 5.0);
    color = mix(color, vec3f(1.0, 0.5, 0.2), swirl * 0.3 * ring);
  }

  let twinkle = 0.9 + 0.1 * sin(uniforms.u_time * 10.0 + v_color.r * 100.0);
  alpha *= twinkle;

  return vec4f(color * alpha, alpha);
}
`;

const COMPUTE_SHADER = `
struct Uniforms {
  u_time: f32,
  u_deltaTime: f32,
  u_resolution: vec2f,
  u_mouse: vec2f,
  u_mouseActive: f32,
  _pad: f32,
}

struct Star {
  position: vec2f,
  velocity: vec2f,
  color: vec3f,
  size: f32,
  age: f32,
  type_id: f32,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var<storage, read_write> stars: array<Star>;

fn hash(p: vec2f) -> f32 {
  var p3 = fract(vec3f(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

fn hash2(p: vec2f) -> vec2f {
  return vec2f(hash(p), hash(p + vec2f(127.1, 311.7)));
}

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id: vec3u) {
  let idx = global_id.x;
  let numStars = arrayLength(&stars);

  if (idx >= numStars) {
    return;
  }

  var star = stars[idx];
  let dt = uniforms.u_deltaTime * 0.5;

  let center = vec2f(0.0, 0.0);

  var mouseNorm = (uniforms.u_mouse / uniforms.u_resolution) * 2.0 - 1.0;
  let aspect = uniforms.u_resolution.x / uniforms.u_resolution.y;
  mouseNorm.x *= aspect;

  let toCenter = center - star.position;
  let distToCenter = length(toCenter);
  let dirToCenter = toCenter / max(distToCenter, 0.001);

  let gravity = 0.5 / (distToCenter * distToCenter + 0.1);

  var acc = dirToCenter * gravity;

  if (uniforms.u_mouseActive > 0.5) {
    let toMouse = mouseNorm * 0.8 - star.position;
    let distToMouse = length(toMouse);
    let mouseGravity = 0.3 / (distToMouse * distToMouse + 0.05);
    acc += normalize(toMouse) * mouseGravity;
  }

  let angle = atan2(star.position.y, star.position.x);
  let spiralPhase = angle * 2.0 - distToCenter * 3.0 + uniforms.u_time * 0.1;
  let spiralForce = sin(spiralPhase) * 0.02;
  let perpendicular = vec2f(-dirToCenter.y, dirToCenter.x);
  acc += perpendicular * spiralForce;

  star.velocity += acc * dt;
  star.velocity *= 0.999;

  let speed = length(star.velocity);
  if (speed > 2.0) {
    star.velocity = star.velocity / speed * 2.0;
  }

  star.position += star.velocity * dt;

  if (length(star.position) > 2.5) {
    let spawnAngle = hash(vec2f(f32(idx), uniforms.u_time)) * 6.283;
    let spawnDist = 0.2 + hash(vec2f(f32(idx) + 100.0, uniforms.u_time)) * 1.3;

    star.position = vec2f(cos(spawnAngle), sin(spawnAngle)) * spawnDist;

    let orbitalSpeed = sqrt(0.5 / spawnDist) * 0.8;
    let orbitalDir = vec2f(-sin(spawnAngle), cos(spawnAngle));
    star.velocity = orbitalDir * orbitalSpeed;

    star.velocity += (hash2(vec2f(f32(idx), uniforms.u_time * 0.1)) - 0.5) * 0.1;
  }

  star.age += dt * 0.1;
  if (star.age > 1.0) {
    star.age = fract(star.age);
  }

  stars[idx] = star;
}
`;

const BG_VERTEX_SHADER = `
struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) v_uv: vec2f,
}

@vertex
fn main(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
  var output: VertexOutput;

  var pos: array<vec2f, 3> = array<vec2f, 3>(
    vec2f(-1.0, -1.0),
    vec2f(3.0, -1.0),
    vec2f(-1.0, 3.0)
  );

  output.position = vec4f(pos[vertexIndex], 0.0, 1.0);
  output.v_uv = pos[vertexIndex] * 0.5 + 0.5;

  return output;
}
`;

const BG_FRAGMENT_SHADER = `
struct Uniforms {
  u_time: f32,
  _pad: f32,
  u_resolution: vec2f,
  u_mouse: vec2f,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

fn hash(p: vec2f) -> f32 {
  return fract(sin(dot(p, vec2f(127.1, 311.7))) * 43758.5453);
}

fn noise(p: vec2f) -> f32 {
  let i = floor(p);
  let f = fract(p);
  let u = f * f * (3.0 - 2.0 * f);

  return mix(
    mix(hash(i), hash(i + vec2f(1.0, 0.0)), u.x),
    mix(hash(i + vec2f(0.0, 1.0)), hash(i + vec2f(1.0, 1.0)), u.x),
    u.y
  );
}

fn fbm(p: vec2f) -> f32 {
  var value = 0.0;
  var amplitude = 0.5;
  var pt = p;

  for (var i = 0; i < 6; i++) {
    value += amplitude * noise(pt);
    pt *= 2.0;
    amplitude *= 0.5;
  }

  return value;
}

@fragment
fn main(@location(0) v_uv: vec2f) -> @location(0) vec4f {
  let aspect = uniforms.u_resolution.x / uniforms.u_resolution.y;
  var uv = v_uv * 2.0 - 1.0;
  uv.x *= aspect;

  let t = uniforms.u_time * 0.05;

  var nebula = vec3f(0.0);

  let n1 = fbm(uv * 1.5 + t * 0.3);
  let n2 = fbm(uv * 2.0 - t * 0.2 + 100.0);
  let n3 = fbm(uv * 3.0 + vec2f(t * 0.1, -t * 0.15));

  nebula += vec3f(0.1, 0.05, 0.2) * n1 * 0.5;
  nebula += vec3f(0.05, 0.1, 0.15) * n2 * 0.3;
  nebula += vec3f(0.15, 0.05, 0.1) * n3 * 0.2;

  let dist = length(uv);
  let centerGlow = exp(-dist * 1.5) * 0.3;
  nebula += vec3f(0.2, 0.15, 0.1) * centerGlow;

  let angle = atan2(uv.y, uv.x);
  let spiral = sin(angle * 2.0 - dist * 4.0 + t) * 0.5 + 0.5;
  let spiralMask = smoothstep(0.3, 1.5, dist) * smoothstep(2.0, 0.5, dist);
  nebula += vec3f(0.1, 0.08, 0.15) * spiral * spiralMask * 0.2;

  let starField = step(0.998, hash(floor(v_uv * 200.0)));
  let starBrightness = hash(floor(v_uv * 200.0) + 0.5) * 0.3;
  nebula += vec3f(starBrightness) * starField;

  let vignette = 1.0 - length(v_uv - 0.5) * 0.8;
  nebula *= vignette;

  let baseColor = vec3f(0.01, 0.01, 0.02);

  return vec4f(baseColor + nebula, 1.0);
}
`;

interface GalaxyResources {
  pipeline: GPURenderPipeline;
  bindGroup: GPUBindGroup;
  uniformBuffer: GPUBuffer;
  computePipeline: GPUComputePipeline;
  starBuffer: GPUBuffer;
  computeBindGroup: GPUBindGroup;
  computeUniformBuffer: GPUBuffer;
  bgPipeline: GPURenderPipeline;
  bgBindGroup: GPUBindGroup;
  numStars: number;
}

function initStarData(): Float32Array {
  const data = new Float32Array((NUM_STARS + NUM_DUST + 1) * 10);
  let offset = 0;

  for (let i = 0; i < NUM_STARS; i++) {
    const arm = Math.floor(Math.random() * 2);
    const armAngle = arm * Math.PI;

    const dist = 0.1 + Math.pow(Math.random(), 0.5) * 1.4;
    const spread = (Math.random() - 0.5) * 0.3 * (1 + dist * 0.5);
    const angle = armAngle + dist * 2.5 + spread + Math.random() * 0.5;

    data[offset++] = Math.cos(angle) * dist;
    data[offset++] = Math.sin(angle) * dist;

    const orbitalSpeed = Math.sqrt(0.5 / dist) * 0.7;
    data[offset++] = -Math.sin(angle) * orbitalSpeed + (Math.random() - 0.5) * 0.05;
    data[offset++] = Math.cos(angle) * orbitalSpeed + (Math.random() - 0.5) * 0.05;

    const colorTemp = Math.random();
    if (dist < 0.3) {
      data[offset++] = 0.7 + Math.random() * 0.3;
      data[offset++] = 0.8 + Math.random() * 0.2;
      data[offset++] = 1.0;
    } else if (colorTemp < 0.3) {
      data[offset++] = 0.6 + Math.random() * 0.2;
      data[offset++] = 0.7 + Math.random() * 0.2;
      data[offset++] = 1.0;
    } else if (colorTemp < 0.7) {
      data[offset++] = 1.0;
      data[offset++] = 0.9 + Math.random() * 0.1;
      data[offset++] = 0.7 + Math.random() * 0.3;
    } else {
      data[offset++] = 1.0;
      data[offset++] = 0.4 + Math.random() * 0.4;
      data[offset++] = 0.2 + Math.random() * 0.2;
    }

    data[offset++] = 0.5 + Math.random() * 2.0;
    data[offset++] = Math.random();
    data[offset++] = 0;
  }

  for (let i = 0; i < NUM_DUST; i++) {
    const arm = Math.floor(Math.random() * 2);
    const armAngle = arm * Math.PI;

    const dist = 0.2 + Math.random() * 1.2;
    const spread = (Math.random() - 0.5) * 0.5;
    const angle = armAngle + dist * 2.5 + spread;

    data[offset++] = Math.cos(angle) * dist;
    data[offset++] = Math.sin(angle) * dist;

    const orbitalSpeed = Math.sqrt(0.5 / dist) * 0.6;
    data[offset++] = -Math.sin(angle) * orbitalSpeed;
    data[offset++] = Math.cos(angle) * orbitalSpeed;

    data[offset++] = 0.4 + Math.random() * 0.2;
    data[offset++] = 0.2 + Math.random() * 0.1;
    data[offset++] = 0.1 + Math.random() * 0.1;

    data[offset++] = 2.0 + Math.random() * 3.0;
    data[offset++] = Math.random();
    data[offset++] = 1;
  }

  // Central core
  data[offset++] = 0;
  data[offset++] = 0;
  data[offset++] = 0;
  data[offset++] = 0;
  data[offset++] = 1.0;
  data[offset++] = 0.6;
  data[offset++] = 0.2;
  data[offset++] = 8.0;
  data[offset++] = 0;
  data[offset++] = 2;

  return data;
}

/**
 * Galaxy simulation host with compute passes for particle physics.
 */
export class GalaxyHost implements WebGPUHost {
  private renderTexture: RenderTexture;
  private resources: GalaxyResources | null = null;
  private initError = false;
  private ready = false;

  constructor(
    private device: GPUDevice,
    private format: GPUTextureFormat,
    width: number,
    height: number
  ) {
    this.renderTexture = createRenderTexture(device, width, height, format);
    this.initResourcesAsync();
  }

  private async initResourcesAsync(): Promise<void> {
    try {
      console.log("[GalaxyHost] Starting async resource initialization...");
      this.resources = await this.initResources();
      console.log("[GalaxyHost] Resources initialized successfully, ready=true");
      this.ready = true;
    } catch (e) {
      console.error("[GalaxyHost] Failed to initialize resources:", e);
      this.initError = true;
    }
  }

  private async initResources(): Promise<GalaxyResources> {
    const { device, format } = this;
    const totalParticles = NUM_STARS + NUM_DUST + 1;

    const starData = initStarData();

    const starBuffer = device.createBuffer({
      size: starData.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(starBuffer, 0, starData);

    const uniformBuffer = device.createBuffer({
      size: 32,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const computeUniformBuffer = device.createBuffer({
      size: 32,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    // Background pipeline
    const bgBindGroupLayout = device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.FRAGMENT,
          buffer: { type: "uniform" },
        },
      ],
    });

    const bgPipelineLayout = device.createPipelineLayout({
      bindGroupLayouts: [bgBindGroupLayout],
    });

    const bgPipeline = await device.createRenderPipelineAsync({
      layout: bgPipelineLayout,
      vertex: {
        module: device.createShaderModule({ code: BG_VERTEX_SHADER }),
        entryPoint: "main",
        buffers: [],
      },
      fragment: {
        module: device.createShaderModule({ code: BG_FRAGMENT_SHADER }),
        entryPoint: "main",
        targets: [{ format }],
      },
      primitive: { topology: "triangle-list" },
    });

    const bgBindGroup = device.createBindGroup({
      layout: bgBindGroupLayout,
      entries: [{ binding: 0, resource: { buffer: uniformBuffer } }],
    });

    // Render pipeline
    const renderBindGroupLayout = device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
          buffer: { type: "uniform" },
        },
        {
          binding: 1,
          visibility: GPUShaderStage.VERTEX,
          buffer: { type: "read-only-storage" },
        },
      ],
    });

    const renderPipelineLayout = device.createPipelineLayout({
      bindGroupLayouts: [renderBindGroupLayout],
    });

    const pipeline = await device.createRenderPipelineAsync({
      layout: renderPipelineLayout,
      vertex: {
        module: device.createShaderModule({ code: VERTEX_SHADER }),
        entryPoint: "main",
        buffers: [],
      },
      fragment: {
        module: device.createShaderModule({ code: FRAGMENT_SHADER }),
        entryPoint: "main",
        targets: [
          {
            format,
            blend: {
              color: {
                srcFactor: "src-alpha",
                dstFactor: "one",
                operation: "add",
              },
              alpha: {
                srcFactor: "one",
                dstFactor: "one",
                operation: "add",
              },
            },
          },
        ],
      },
      primitive: { topology: "triangle-list" },
    });

    const bindGroup = device.createBindGroup({
      layout: renderBindGroupLayout,
      entries: [
        { binding: 0, resource: { buffer: uniformBuffer } },
        { binding: 1, resource: { buffer: starBuffer } },
      ],
    });

    // Compute pipeline
    const computeBindGroupLayout = device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: "uniform" },
        },
        {
          binding: 1,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: "storage" },
        },
      ],
    });

    const computePipelineLayout = device.createPipelineLayout({
      bindGroupLayouts: [computeBindGroupLayout],
    });

    const computeShaderModule = device.createShaderModule({ code: COMPUTE_SHADER });
    const compileInfo = await computeShaderModule.getCompilationInfo();
    for (const message of compileInfo.messages) {
      console.error(`[Galaxy Compute Shader ${message.type}] ${message.message}`);
      if (message.type === "error") {
        throw new Error(`Compute shader compilation failed: ${message.message}`);
      }
    }

    const computePipeline = await device.createComputePipelineAsync({
      label: "GalaxyHost Compute Pipeline",
      layout: computePipelineLayout,
      compute: {
        module: computeShaderModule,
        entryPoint: "main",
      },
    });

    const computeBindGroup = device.createBindGroup({
      layout: computeBindGroupLayout,
      entries: [
        { binding: 0, resource: { buffer: computeUniformBuffer } },
        { binding: 1, resource: { buffer: starBuffer } },
      ],
    });

    return {
      pipeline,
      bindGroup,
      uniformBuffer,
      computePipeline,
      starBuffer,
      computeBindGroup,
      computeUniformBuffer,
      bgPipeline,
      bgBindGroup,
      numStars: totalParticles,
    };
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

    const { time, deltaTime, mouseX, mouseY, width, height, mouseDown } = input;

    // Update uniforms
    const uniformData = new Float32Array([time, 0, width, height, mouseX, mouseY, 0, 0]);
    this.device.queue.writeBuffer(this.resources.uniformBuffer, 0, uniformData);

    // Compute uniforms
    const computeUniformData = new Float32Array([
      time,
      Math.min(deltaTime, 0.1),
      width,
      height,
      mouseX,
      mouseY,
      mouseDown ? 1.0 : 0.0,
      0,
    ]);
    this.device.queue.writeBuffer(this.resources.computeUniformBuffer, 0, computeUniformData);

    // Compute pass
    const computePass = encoder.beginComputePass();
    computePass.setPipeline(this.resources.computePipeline);
    computePass.setBindGroup(0, this.resources.computeBindGroup);
    computePass.dispatchWorkgroups(Math.ceil(this.resources.numStars / 64));
    computePass.end();

    // Render pass
    const textureView = this.renderTexture.textureView;

    const renderPass = encoder.beginRenderPass({
      colorAttachments: [
        {
          view: textureView,
          clearValue: { r: 0.01, g: 0.01, b: 0.02, a: 1.0 },
          loadOp: "clear",
          storeOp: "store",
        },
      ],
    });

    // Background
    renderPass.setPipeline(this.resources.bgPipeline);
    renderPass.setBindGroup(0, this.resources.bgBindGroup);
    renderPass.draw(3);

    // Stars
    renderPass.setPipeline(this.resources.pipeline);
    renderPass.setBindGroup(0, this.resources.bindGroup);
    renderPass.draw(6, this.resources.numStars);

    renderPass.end();
  }

  getTexture(): RenderTexture {
    return this.renderTexture;
  }

  destroy(): void {
    this.renderTexture.destroy();
    if (this.resources) {
      this.resources.starBuffer.destroy();
      this.resources.uniformBuffer.destroy();
      this.resources.computeUniformBuffer.destroy();
    }
  }
}

/**
 * Factory function to create a GalaxyHost.
 */
export function createGalaxyHost(
  device: GPUDevice,
  format: GPUTextureFormat,
  width: number,
  height: number
): GalaxyHost {
  return new GalaxyHost(device, format, width, height);
}
