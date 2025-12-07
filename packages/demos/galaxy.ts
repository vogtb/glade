import type { WebGPUContext } from "@glade/core";
import { GPUBufferUsage, GPUShaderStage } from "@glade/webgpu";
import type { DemoResources } from "./demo-webgpu.js";

// Galaxy simulation with thousands of stars orbiting a central black hole
// Features: gravitational physics, bloom/glow effects, dust lanes, spiral arms

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
  type_id: f32, // 0 = star, 1 = dust, 2 = core
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

  // Quad vertices for point sprite
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
    // Star - bright core with soft glow
    let core = exp(-dist * dist * 8.0);
    let glow = exp(-dist * 1.5) * 0.5;
    let rays = (1.0 + 0.3 * sin(atan2(v_uv.y, v_uv.x) * 4.0 + uniforms.u_time)) * exp(-dist * 3.0) * 0.2;
    alpha = core + glow + rays;

    // Add chromatic aberration for larger stars
    if (v_size > 1.5) {
      let offset = 0.02;
      color.r *= 1.0 + offset * (1.0 - dist);
      color.b *= 1.0 - offset * (1.0 - dist);
    }
  } else if (v_type < 1.5) {
    // Dust - soft, diffuse
    alpha = exp(-dist * dist * 2.0) * 0.15;
    color *= 0.6;
  } else {
    // Core/black hole accretion disk
    let ring = smoothstep(0.3, 0.5, dist) * smoothstep(1.0, 0.7, dist);
    let glow = exp(-dist * 0.5) * 0.8;
    alpha = ring * 0.8 + glow;

    // Swirling colors in accretion disk
    let swirl = sin(atan2(v_uv.y, v_uv.x) * 3.0 - uniforms.u_time * 2.0 + dist * 5.0);
    color = mix(color, vec3f(1.0, 0.5, 0.2), swirl * 0.3 * ring);
  }

  // Add twinkle
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

// Pseudo-random number generator
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

  // Galaxy center
  let center = vec2f(0.0, 0.0);

  // Secondary gravitational center (mouse when active)
  var mouseNorm = (uniforms.u_mouse / uniforms.u_resolution) * 2.0 - 1.0;
  let aspect = uniforms.u_resolution.x / uniforms.u_resolution.y;
  mouseNorm.x *= aspect;
  mouseNorm.y = -mouseNorm.y;

  // Vector to center
  let toCenter = center - star.position;
  let distToCenter = length(toCenter);
  let dirToCenter = toCenter / max(distToCenter, 0.001);

  // Gravitational force (inverse square with softening)
  let gravity = 0.5 / (distToCenter * distToCenter + 0.1);

  // Add centripetal acceleration for orbital motion
  var acc = dirToCenter * gravity;

  // Mouse attraction/repulsion
  if (uniforms.u_mouseActive > 0.5) {
    let toMouse = mouseNorm * 0.8 - star.position;
    let distToMouse = length(toMouse);
    let mouseGravity = 0.3 / (distToMouse * distToMouse + 0.05);
    acc += normalize(toMouse) * mouseGravity;
  }

  // Spiral arm perturbation
  let angle = atan2(star.position.y, star.position.x);
  let spiralPhase = angle * 2.0 - distToCenter * 3.0 + uniforms.u_time * 0.1;
  let spiralForce = sin(spiralPhase) * 0.02;
  let perpendicular = vec2f(-dirToCenter.y, dirToCenter.x);
  acc += perpendicular * spiralForce;

  // Apply velocity (orbital + perturbations)
  star.velocity += acc * dt;

  // Add slight damping to prevent runaway velocities
  star.velocity *= 0.999;

  // Clamp velocity
  let speed = length(star.velocity);
  if (speed > 2.0) {
    star.velocity = star.velocity / speed * 2.0;
  }

  // Update position
  star.position += star.velocity * dt;

  // Respawn stars that go too far
  if (length(star.position) > 2.5) {
    // Respawn in spiral pattern
    let spawnAngle = hash(vec2f(f32(idx), uniforms.u_time)) * 6.283;
    let spawnDist = 0.2 + hash(vec2f(f32(idx) + 100.0, uniforms.u_time)) * 1.3;

    star.position = vec2f(cos(spawnAngle), sin(spawnAngle)) * spawnDist;

    // Initial orbital velocity
    let orbitalSpeed = sqrt(0.5 / spawnDist) * 0.8;
    let orbitalDir = vec2f(-sin(spawnAngle), cos(spawnAngle));
    star.velocity = orbitalDir * orbitalSpeed;

    // Add some randomness
    star.velocity += (hash2(vec2f(f32(idx), uniforms.u_time * 0.1)) - 0.5) * 0.1;
  }

  // Update age for effects
  star.age += dt * 0.1;
  if (star.age > 1.0) {
    star.age = fract(star.age);
  }

  stars[idx] = star;
}
`;

// Background shader for nebula/space dust effect
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
  output.v_uv.y = 1.0 - output.v_uv.y;

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

  // Multiple layers of nebula
  var nebula = vec3f(0.0);

  // Deep space blue/purple nebula
  let n1 = fbm(uv * 1.5 + t * 0.3);
  let n2 = fbm(uv * 2.0 - t * 0.2 + 100.0);
  let n3 = fbm(uv * 3.0 + vec2f(t * 0.1, -t * 0.15));

  nebula += vec3f(0.1, 0.05, 0.2) * n1 * 0.5;
  nebula += vec3f(0.05, 0.1, 0.15) * n2 * 0.3;
  nebula += vec3f(0.15, 0.05, 0.1) * n3 * 0.2;

  // Central galaxy glow
  let dist = length(uv);
  let centerGlow = exp(-dist * 1.5) * 0.3;
  nebula += vec3f(0.2, 0.15, 0.1) * centerGlow;

  // Spiral arm hints in background
  let angle = atan2(uv.y, uv.x);
  let spiral = sin(angle * 2.0 - dist * 4.0 + t) * 0.5 + 0.5;
  let spiralMask = smoothstep(0.3, 1.5, dist) * smoothstep(2.0, 0.5, dist);
  nebula += vec3f(0.1, 0.08, 0.15) * spiral * spiralMask * 0.2;

  // Add some scattered background stars
  let starField = step(0.998, hash(floor(v_uv * 200.0)));
  let starBrightness = hash(floor(v_uv * 200.0) + 0.5) * 0.3;
  nebula += vec3f(starBrightness) * starField;

  // Vignette
  let vignette = 1.0 - length(v_uv - 0.5) * 0.8;
  nebula *= vignette;

  // Base dark space color
  let baseColor = vec3f(0.01, 0.01, 0.02);

  return vec4f(baseColor + nebula, 1.0);
}
`;

interface GalaxyResources extends DemoResources {
  computePipeline: GPUComputePipeline;
  starBuffer: GPUBuffer;
  computeBindGroup: GPUBindGroup;
  computeUniformBuffer: GPUBuffer;
  bgPipeline: GPURenderPipeline;
  bgBindGroup: GPUBindGroup;
  numStars: number;
}

function initStarData(): Float32Array {
  // Star structure: position(2) + velocity(2) + color(3) + size(1) + age(1) + type(1) = 10 floats
  const data = new Float32Array((NUM_STARS + NUM_DUST + 1) * 10);

  let offset = 0;

  // Generate stars in spiral arms
  for (let i = 0; i < NUM_STARS; i++) {
    const arm = Math.floor(Math.random() * 2); // 2 spiral arms
    const armAngle = arm * Math.PI;

    const dist = 0.1 + Math.pow(Math.random(), 0.5) * 1.4;
    const spread = (Math.random() - 0.5) * 0.3 * (1 + dist * 0.5);
    const angle = armAngle + dist * 2.5 + spread + Math.random() * 0.5;

    // Position
    data[offset++] = Math.cos(angle) * dist;
    data[offset++] = Math.sin(angle) * dist;

    // Velocity (orbital)
    const orbitalSpeed = Math.sqrt(0.5 / dist) * 0.7;
    data[offset++] = -Math.sin(angle) * orbitalSpeed + (Math.random() - 0.5) * 0.05;
    data[offset++] = Math.cos(angle) * orbitalSpeed + (Math.random() - 0.5) * 0.05;

    // Color - vary by distance (blue core, yellow/white middle, red outer)
    const colorTemp = Math.random();
    if (dist < 0.3) {
      // Hot blue/white stars near center
      data[offset++] = 0.7 + Math.random() * 0.3;
      data[offset++] = 0.8 + Math.random() * 0.2;
      data[offset++] = 1.0;
    } else if (colorTemp < 0.3) {
      // Blue stars
      data[offset++] = 0.6 + Math.random() * 0.2;
      data[offset++] = 0.7 + Math.random() * 0.2;
      data[offset++] = 1.0;
    } else if (colorTemp < 0.7) {
      // Yellow/white stars
      data[offset++] = 1.0;
      data[offset++] = 0.9 + Math.random() * 0.1;
      data[offset++] = 0.7 + Math.random() * 0.3;
    } else {
      // Red/orange stars
      data[offset++] = 1.0;
      data[offset++] = 0.4 + Math.random() * 0.4;
      data[offset++] = 0.2 + Math.random() * 0.2;
    }

    // Size
    data[offset++] = 0.5 + Math.random() * 2.0;

    // Age (random phase)
    data[offset++] = Math.random();

    // Type (0 = star)
    data[offset++] = 0;
  }

  // Generate dust particles
  for (let i = 0; i < NUM_DUST; i++) {
    const arm = Math.floor(Math.random() * 2);
    const armAngle = arm * Math.PI;

    const dist = 0.2 + Math.random() * 1.2;
    const spread = (Math.random() - 0.5) * 0.5;
    const angle = armAngle + dist * 2.5 + spread;

    // Position
    data[offset++] = Math.cos(angle) * dist;
    data[offset++] = Math.sin(angle) * dist;

    // Velocity
    const orbitalSpeed = Math.sqrt(0.5 / dist) * 0.6;
    data[offset++] = -Math.sin(angle) * orbitalSpeed;
    data[offset++] = Math.cos(angle) * orbitalSpeed;

    // Color (reddish/brown dust)
    data[offset++] = 0.4 + Math.random() * 0.2;
    data[offset++] = 0.2 + Math.random() * 0.1;
    data[offset++] = 0.1 + Math.random() * 0.1;

    // Size
    data[offset++] = 2.0 + Math.random() * 3.0;

    // Age
    data[offset++] = Math.random();

    // Type (1 = dust)
    data[offset++] = 1;
  }

  // Central black hole / accretion disk
  data[offset++] = 0; // position x
  data[offset++] = 0; // position y
  data[offset++] = 0; // velocity x
  data[offset++] = 0; // velocity y
  data[offset++] = 1.0; // color r
  data[offset++] = 0.6; // color g
  data[offset++] = 0.2; // color b
  data[offset++] = 8.0; // size
  data[offset++] = 0; // age
  data[offset++] = 2; // type (2 = core)

  return data;
}

export function initGalaxyDemo(ctx: WebGPUContext, format: GPUTextureFormat): DemoResources {
  const { device } = ctx;

  const totalParticles = NUM_STARS + NUM_DUST + 1;

  // Initialize star data
  const starData = initStarData();

  // Create star storage buffer
  const starBuffer = device.createBuffer({
    size: starData.byteLength,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(starBuffer, 0, starData);

  // Uniform buffer for render
  const uniformBuffer = device.createBuffer({
    size: 32,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  // Uniform buffer for compute (needs extra fields)
  const computeUniformBuffer = device.createBuffer({
    size: 32,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  // Dummy buffers for DemoResources interface
  const positionBuffer = device.createBuffer({
    size: 8,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  });
  const colorBuffer = device.createBuffer({
    size: 12,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  });

  // === Background Pipeline ===
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

  const bgPipeline = device.createRenderPipeline({
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

  // === Render Pipeline ===
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

  const pipeline = device.createRenderPipeline({
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

  // === Compute Pipeline ===
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

  const computePipeline = device.createComputePipeline({
    layout: computePipelineLayout,
    compute: {
      module: device.createShaderModule({ code: COMPUTE_SHADER }),
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

  const resources: GalaxyResources = {
    pipeline,
    positionBuffer,
    colorBuffer,
    indexBuffer: null,
    uniformBuffer,
    bindGroup,
    indexCount: 0,
    vertexCount: 6,
    instanceCount: totalParticles,
    useInstancing: true,
    computePipeline,
    starBuffer,
    computeBindGroup,
    computeUniformBuffer,
    bgPipeline,
    bgBindGroup,
    numStars: totalParticles,
  };

  return resources;
}

// Custom render function for galaxy (needs compute pass)
export function renderGalaxy(
  ctx: WebGPUContext,
  resources: DemoResources,
  time: number,
  deltaTime: number,
  mouseX: number,
  mouseY: number
): void {
  const { device, context } = ctx;
  const galaxyResources = resources as GalaxyResources;

  // Update uniforms
  const uniformData = new Float32Array([time, 0, ctx.width, ctx.height, mouseX, mouseY, 0, 0]);
  device.queue.writeBuffer(galaxyResources.uniformBuffer, 0, uniformData);

  // Compute uniforms (includes deltaTime and mouse active)
  const computeUniformData = new Float32Array([
    time,
    Math.min(deltaTime, 0.1), // Cap delta time
    ctx.width,
    ctx.height,
    mouseX,
    mouseY,
    1.0, // Mouse always active for this demo
    0,
  ]);
  device.queue.writeBuffer(galaxyResources.computeUniformBuffer, 0, computeUniformData);

  const commandEncoder = device.createCommandEncoder();

  // Compute pass - update particle positions
  const computePass = commandEncoder.beginComputePass();
  computePass.setPipeline(galaxyResources.computePipeline);
  computePass.setBindGroup(0, galaxyResources.computeBindGroup);
  computePass.dispatchWorkgroups(Math.ceil(galaxyResources.numStars / 64));
  computePass.end();

  // Render pass
  const textureView = context.getCurrentTexture().createView();

  const renderPass = commandEncoder.beginRenderPass({
    colorAttachments: [
      {
        view: textureView,
        clearValue: { r: 0.01, g: 0.01, b: 0.02, a: 1.0 },
        loadOp: "clear",
        storeOp: "store",
      },
    ],
  });

  // Draw background nebula
  renderPass.setPipeline(galaxyResources.bgPipeline);
  renderPass.setBindGroup(0, galaxyResources.bgBindGroup);
  renderPass.draw(3);

  // Draw stars
  renderPass.setPipeline(galaxyResources.pipeline);
  renderPass.setBindGroup(0, galaxyResources.bindGroup);
  renderPass.draw(6, galaxyResources.numStars);

  renderPass.end();

  device.queue.submit([commandEncoder.finish()]);

  if ("present" in context && typeof context.present === "function") {
    (context as unknown as { present: () => void }).present();
  }
}
