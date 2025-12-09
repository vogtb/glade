import type { WebGPUContext } from "@glade/core";
import { GPUBufferUsage, GPUShaderStage, GPUTextureUsage } from "@glade/core/webgpu";
import type { DemoResources } from "./common";

// Post-processing demo: Render a scene to a texture, then apply effects
// Features: render-to-texture, texture sampling, multi-pass rendering,
// chromatic aberration, vignette

// Simple scene shader that renders directly
const VERTEX_SHADER = `
struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
}

@vertex
fn main(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
  var pos = array<vec2f, 3>(
    vec2f(-1.0, -1.0),
    vec2f( 3.0, -1.0),
    vec2f(-1.0,  3.0)
  );
  var output: VertexOutput;
  output.position = vec4f(pos[vertexIndex], 0.0, 1.0);
  output.uv = pos[vertexIndex] * 0.5 + 0.5;
  return output;
}
`;

// Scene shader with raymarching
const SCENE_FRAGMENT_SHADER = `
struct Uniforms {
  time: f32,
  _pad0: f32,
  resolution: vec2f,
  mouse: vec2f,
  _pad1: vec2f,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

fn sdSphere(p: vec3f, r: f32) -> f32 {
  return length(p) - r;
}

fn sdTorus(p: vec3f, t: vec2f) -> f32 {
  let q = vec2f(length(p.xz) - t.x, p.y);
  return length(q) - t.y;
}

fn opSmoothUnion(d1: f32, d2: f32, k: f32) -> f32 {
  let h = clamp(0.5 + 0.5 * (d2 - d1) / k, 0.0, 1.0);
  return mix(d2, d1, h) - k * h * (1.0 - h);
}

fn rotateY(p: vec3f, angle: f32) -> vec3f {
  let c = cos(angle);
  let s = sin(angle);
  return vec3f(c * p.x + s * p.z, p.y, -s * p.x + c * p.z);
}

fn rotateX(p: vec3f, angle: f32) -> vec3f {
  let c = cos(angle);
  let s = sin(angle);
  return vec3f(p.x, c * p.y - s * p.z, s * p.y + c * p.z);
}

fn map(p: vec3f) -> f32 {
  let t = uniforms.time;
  var p1 = rotateY(p, t * 0.5);
  let torus = sdTorus(p1, vec2f(0.8, 0.25));
  let sphere = sdSphere(p, 0.3 + 0.1 * sin(t * 2.0));
  return opSmoothUnion(torus, sphere, 0.3);
}

fn calcNormal(p: vec3f) -> vec3f {
  let e = vec2f(0.001, 0.0);
  return normalize(vec3f(
    map(p + e.xyy) - map(p - e.xyy),
    map(p + e.yxy) - map(p - e.yxy),
    map(p + e.yyx) - map(p - e.yyx)
  ));
}

@fragment
fn main(@location(0) uv: vec2f) -> @location(0) vec4f {
  let aspect = uniforms.resolution.x / uniforms.resolution.y;
  var p = (uv * 2.0 - 1.0) * vec2f(aspect, 1.0);

  // Mouse controls camera rotation
  let mouseNorm = uniforms.mouse / uniforms.resolution;
  let camAngleY = (mouseNorm.x - 0.5) * 3.14159;
  let camAngleX = (mouseNorm.y - 0.5) * 1.0;

  var ro = vec3f(0.0, 0.0, 3.0);
  ro = rotateY(ro, camAngleY);
  ro = rotateX(ro, camAngleX);

  // Build camera basis vectors
  let forward = normalize(-ro);
  let worldUp = vec3f(0.0, 1.0, 0.0);
  let right = normalize(cross(worldUp, forward));
  let up = cross(forward, right);
  let rd = normalize(p.x * right + p.y * up + 1.5 * forward);

  var t = 0.0;
  for (var i = 0; i < 64; i++) {
    let pos = ro + rd * t;
    let d = map(pos);
    if (d < 0.001 || t > 20.0) { break; }
    t += d;
  }

  var col = vec3f(0.1, 0.1, 0.15);
  if (t < 20.0) {
    let pos = ro + rd * t;
    let nor = calcNormal(pos);
    let light = normalize(vec3f(1.0, 1.0, 1.0));
    let diff = max(dot(nor, light), 0.0);
    col = vec3f(0.4, 0.6, 0.9) * (0.2 + diff * 0.8);
  }

  return vec4f(col, 1.0);
}
`;

// Post-process fragment shader that samples texture
const POST_FRAGMENT_SHADER = `
struct Uniforms {
  time: f32,
  _pad0: f32,
  resolution: vec2f,
  mouse: vec2f,
  _pad1: vec2f,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var sceneTex: texture_2d<f32>;
@group(0) @binding(2) var sceneSampler: sampler;

@fragment
fn main(@location(0) uv: vec2f) -> @location(0) vec4f {
  let center = vec2f(0.5);
  let dist = distance(uv, center);

  // Chromatic aberration
  let aberration = 0.005 * dist;
  let dir = normalize(uv - center);

  let r = textureSample(sceneTex, sceneSampler, uv + dir * aberration).r;
  let g = textureSample(sceneTex, sceneSampler, uv).g;
  let b = textureSample(sceneTex, sceneSampler, uv - dir * aberration).b;

  var col = vec3f(r, g, b);

  // Vignette
  col *= 1.0 - dist * 0.5;

  return vec4f(col, 1.0);
}
`;

interface PostProcessResources extends DemoResources {
  sceneTexture: GPUTexture;
  sceneTextureView: GPUTextureView;
  scenePipeline: GPURenderPipeline;
  sceneBindGroup: GPUBindGroup;
  postPipeline: GPURenderPipeline;
  postBindGroup: GPUBindGroup;
  sampler: GPUSampler;
}

export function initPostProcessDemo(
  ctx: WebGPUContext,
  format: GPUTextureFormat
): PostProcessResources {
  const { device } = ctx;

  // Uniform buffer
  const uniformBuffer = device.createBuffer({
    size: 32,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  // Create render target texture
  const sceneTexture = device.createTexture({
    size: { width: ctx.width, height: ctx.height },
    format: format,
    usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
  });
  const sceneTextureView = sceneTexture.createView();

  // Create sampler
  const sampler = device.createSampler({
    magFilter: "linear",
    minFilter: "linear",
  });

  // === Scene pipeline (renders to texture) ===
  const sceneBindGroupLayout = device.createBindGroupLayout({
    entries: [{ binding: 0, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "uniform" } }],
  });

  const sceneBindGroup = device.createBindGroup({
    layout: sceneBindGroupLayout,
    entries: [{ binding: 0, resource: { buffer: uniformBuffer } }],
  });

  const scenePipelineLayout = device.createPipelineLayout({
    bindGroupLayouts: [sceneBindGroupLayout],
  });

  const sceneVertexModule = device.createShaderModule({ code: VERTEX_SHADER });
  const sceneFragmentModule = device.createShaderModule({ code: SCENE_FRAGMENT_SHADER });

  const scenePipeline = device.createRenderPipeline({
    layout: scenePipelineLayout,
    vertex: { module: sceneVertexModule, entryPoint: "main" },
    fragment: {
      module: sceneFragmentModule,
      entryPoint: "main",
      targets: [{ format }],
    },
    primitive: { topology: "triangle-list" },
  });

  // === Post-process pipeline (samples texture, renders to screen) ===
  const postBindGroupLayout = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "uniform" } },
      { binding: 1, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: "float" } },
      { binding: 2, visibility: GPUShaderStage.FRAGMENT, sampler: { type: "filtering" } },
    ],
  });

  const postBindGroup = device.createBindGroup({
    layout: postBindGroupLayout,
    entries: [
      { binding: 0, resource: { buffer: uniformBuffer } },
      { binding: 1, resource: sceneTextureView },
      { binding: 2, resource: sampler },
    ],
  });

  const postPipelineLayout = device.createPipelineLayout({
    bindGroupLayouts: [postBindGroupLayout],
  });

  const postVertexModule = device.createShaderModule({ code: VERTEX_SHADER });
  const postFragmentModule = device.createShaderModule({ code: POST_FRAGMENT_SHADER });

  const postPipeline = device.createRenderPipeline({
    layout: postPipelineLayout,
    vertex: { module: postVertexModule, entryPoint: "main" },
    fragment: {
      module: postFragmentModule,
      entryPoint: "main",
      targets: [{ format }],
    },
    primitive: { topology: "triangle-list" },
  });

  // Dummy buffers for interface
  const dummyBuffer = device.createBuffer({
    size: 16,
    usage: GPUBufferUsage.VERTEX,
  });

  return {
    pipeline: scenePipeline,
    positionBuffer: dummyBuffer,
    colorBuffer: dummyBuffer,
    indexBuffer: null,
    uniformBuffer,
    bindGroup: sceneBindGroup,
    indexCount: 0,
    vertexCount: 3,
    instanceCount: 1,
    useInstancing: true,
    sceneTexture,
    sceneTextureView,
    scenePipeline,
    sceneBindGroup,
    postPipeline,
    postBindGroup,
    sampler,
  };
}

export function renderPostProcess(
  ctx: WebGPUContext,
  resources: DemoResources,
  time: number,
  _deltaTime: number,
  mouseX: number,
  mouseY: number
): void {
  const { device, context } = ctx;
  const r = resources as PostProcessResources;

  // Update uniforms
  const uniformData = new Float32Array([time, 0, ctx.width, ctx.height, mouseX, mouseY, 0, 0]);
  device.queue.writeBuffer(r.uniformBuffer, 0, uniformData);

  const commandEncoder = device.createCommandEncoder();

  // Pass 1: Render scene to texture
  const scenePass = commandEncoder.beginRenderPass({
    colorAttachments: [
      {
        view: r.sceneTextureView,
        clearValue: { r: 0.0, g: 0.0, b: 0.0, a: 1.0 },
        loadOp: "clear",
        storeOp: "store",
      },
    ],
  });
  scenePass.setPipeline(r.scenePipeline);
  scenePass.setBindGroup(0, r.sceneBindGroup);
  scenePass.draw(3);
  scenePass.end();

  // Pass 2: Post-process to screen
  const screenView = context.getCurrentTexture().createView();
  const postPass = commandEncoder.beginRenderPass({
    colorAttachments: [
      {
        view: screenView,
        clearValue: { r: 0.0, g: 0.0, b: 0.0, a: 1.0 },
        loadOp: "clear",
        storeOp: "store",
      },
    ],
  });
  postPass.setPipeline(r.postPipeline);
  postPass.setBindGroup(0, r.postBindGroup);
  postPass.draw(3);
  postPass.end();

  device.queue.submit([commandEncoder.finish()]);

  if ("present" in context && typeof context.present === "function") {
    (context as unknown as { present: () => void }).present();
  }
}
