import { GPUBufferUsage, GPUShaderStage } from "@glade/core/webgpu";
import type { WebGPUHost, WebGPUHostInput, RenderTexture } from "@glade/flash/host.ts";
import { createRenderTexture } from "@glade/flash/host.ts";
import type { DemoResources } from "./common";

const VERTEX_SHADER = `
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

const FRAGMENT_SHADER = `
struct Uniforms {
  u_time: f32,
  _pad: f32,
  u_resolution: vec2f,
  u_mouse: vec2f,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

const PI: f32 = 3.14159265359;
const MAX_STEPS: i32 = 100;
const MAX_DIST: f32 = 100.0;
const SURF_DIST: f32 = 0.001;

// Rotation matrices
fn rotateX(a: f32) -> mat3x3f {
  let s = sin(a);
  let c = cos(a);
  return mat3x3f(
    vec3f(1.0, 0.0, 0.0),
    vec3f(0.0, c, -s),
    vec3f(0.0, s, c)
  );
}

fn rotateY(a: f32) -> mat3x3f {
  let s = sin(a);
  let c = cos(a);
  return mat3x3f(
    vec3f(c, 0.0, s),
    vec3f(0.0, 1.0, 0.0),
    vec3f(-s, 0.0, c)
  );
}

fn rotateZ(a: f32) -> mat3x3f {
  let s = sin(a);
  let c = cos(a);
  return mat3x3f(
    vec3f(c, -s, 0.0),
    vec3f(s, c, 0.0),
    vec3f(0.0, 0.0, 1.0)
  );
}

// SDF primitives
fn sdSphere(p: vec3f, r: f32) -> f32 {
  return length(p) - r;
}

fn sdBox(p: vec3f, b: vec3f) -> f32 {
  let q = abs(p) - b;
  return length(max(q, vec3f(0.0))) + min(max(q.x, max(q.y, q.z)), 0.0);
}

fn sdTorus(p: vec3f, t: vec2f) -> f32 {
  let q = vec2f(length(p.xz) - t.x, p.y);
  return length(q) - t.y;
}

fn sdOctahedron(p: vec3f, s: f32) -> f32 {
  let q = abs(p);
  return (q.x + q.y + q.z - s) * 0.57735027;
}

fn sdCapsule(p: vec3f, a: vec3f, b: vec3f, r: f32) -> f32 {
  let pa = p - a;
  let ba = b - a;
  let h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h) - r;
}

// SDF operations
fn opUnion(d1: f32, d2: f32) -> f32 {
  return min(d1, d2);
}

fn opSubtract(d1: f32, d2: f32) -> f32 {
  return max(-d1, d2);
}

fn opIntersect(d1: f32, d2: f32) -> f32 {
  return max(d1, d2);
}

fn opSmoothUnion(d1: f32, d2: f32, k: f32) -> f32 {
  let h = clamp(0.5 + 0.5 * (d2 - d1) / k, 0.0, 1.0);
  return mix(d2, d1, h) - k * h * (1.0 - h);
}

fn opSmoothSubtract(d1: f32, d2: f32, k: f32) -> f32 {
  let h = clamp(0.5 - 0.5 * (d2 + d1) / k, 0.0, 1.0);
  return mix(d2, -d1, h) + k * h * (1.0 - h);
}

// Repetition
fn opRep(p: vec3f, c: vec3f) -> vec3f {
  return ((p + 0.5 * c) % c) - 0.5 * c;
}

// Hash and noise for procedural details
fn hash3(p: vec3f) -> f32 {
  var q = fract(p * 0.1031);
  q += dot(q, q.yzx + 33.33);
  return fract((q.x + q.y) * q.z);
}

// Scene SDF - returns distance and material ID
fn sceneSDF(p: vec3f, t: f32) -> vec2f {
  // Animated rotation
  let rot = rotateY(t * 0.3) * rotateX(t * 0.2);

  // Central morphing shape
  var centralP = p * rot;

  // Morph between shapes based on time
  let morphPhase = sin(t * 0.5) * 0.5 + 0.5;
  let sphere = sdSphere(centralP, 0.8);
  let box = sdBox(centralP, vec3f(0.6));
  let octahedron = sdOctahedron(centralP, 1.2);

  // Blend between shapes
  var central: f32;
  if (morphPhase < 0.5) {
    central = mix(sphere, box, morphPhase * 2.0);
  } else {
    central = mix(box, octahedron, (morphPhase - 0.5) * 2.0);
  }

  // Add twist deformation
  let twist = sin(centralP.y * 2.0 + t) * 0.2;
  let twistedP = vec3f(
    centralP.x * cos(twist) - centralP.z * sin(twist),
    centralP.y,
    centralP.x * sin(twist) + centralP.z * cos(twist)
  );
  let twistedBox = sdBox(twistedP, vec3f(0.5, 1.0, 0.5));
  central = opSmoothUnion(central, twistedBox, 0.3);

  // Orbiting torus
  let torusAngle = t * 0.7;
  let torusOffset = vec3f(cos(torusAngle) * 2.0, sin(t * 0.5) * 0.5, sin(torusAngle) * 2.0);
  let torusP = (p - torusOffset) * rotateX(t * 0.8) * rotateZ(t * 0.6);
  let torus = sdTorus(torusP, vec2f(0.4, 0.15));

  // Second orbiting torus (opposite direction)
  let torus2Angle = -t * 0.5 + PI;
  let torus2Offset = vec3f(cos(torus2Angle) * 2.5, cos(t * 0.3) * 0.8, sin(torus2Angle) * 2.5);
  let torus2P = (p - torus2Offset) * rotateY(t * 0.9) * rotateX(t * 0.4);
  let torus2 = sdTorus(torus2P, vec2f(0.3, 0.1));

  // Floating spheres
  var spheres = MAX_DIST;
  for (var i = 0; i < 6; i++) {
    let fi = f32(i);
    let angle = fi * PI * 2.0 / 6.0 + t * (0.2 + fi * 0.05);
    let radius = 1.8 + sin(t * 0.7 + fi) * 0.3;
    let height = sin(t * 0.5 + fi * 1.2) * 0.8;
    let spherePos = vec3f(cos(angle) * radius, height, sin(angle) * radius);
    let sphereSize = 0.15 + 0.05 * sin(t * 2.0 + fi * 0.8);
    spheres = opSmoothUnion(spheres, sdSphere(p - spherePos, sphereSize), 0.2);
  }

  // Ground plane with waves
  let groundWave = sin(p.x * 2.0 + t) * 0.1 + sin(p.z * 2.0 + t * 0.7) * 0.1;
  let ground = p.y + 2.0 + groundWave;

  // Combine scene
  var d = central;
  var mat = 1.0; // Material ID

  if (torus < d) {
    d = torus;
    mat = 2.0;
  }

  if (torus2 < d) {
    d = torus2;
    mat = 3.0;
  }

  if (spheres < d) {
    d = spheres;
    mat = 4.0;
  }

  // Smooth union with ground
  let groundBlend = opSmoothUnion(d, ground, 0.5);
  if (ground < d + 0.3) {
    mat = mix(mat, 5.0, smoothstep(d, d + 0.3, ground));
  }
  d = groundBlend;

  return vec2f(d, mat);
}

// Calculate normal using gradient
fn calcNormal(p: vec3f, t: f32) -> vec3f {
  let e = vec2f(0.001, 0.0);
  return normalize(vec3f(
    sceneSDF(p + e.xyy, t).x - sceneSDF(p - e.xyy, t).x,
    sceneSDF(p + e.yxy, t).x - sceneSDF(p - e.yxy, t).x,
    sceneSDF(p + e.yyx, t).x - sceneSDF(p - e.yyx, t).x
  ));
}

// Soft shadows
fn softShadow(ro: vec3f, rd: vec3f, mint: f32, maxt: f32, k: f32, t: f32) -> f32 {
  var res = 1.0;
  var ph = 1e20;
  var st = mint;

  for (var i = 0; i < 32; i++) {
    let h = sceneSDF(ro + rd * st, t).x;
    if (h < 0.001) {
      return 0.0;
    }
    let y = h * h / (2.0 * ph);
    let d = sqrt(h * h - y * y);
    res = min(res, k * d / max(0.0, st - y));
    ph = h;
    st += h;
    if (st > maxt) {
      break;
    }
  }

  return res;
}

// Ambient occlusion
fn calcAO(pos: vec3f, nor: vec3f, t: f32) -> f32 {
  var occ = 0.0;
  var sca = 1.0;

  for (var i = 0; i < 5; i++) {
    let h = 0.01 + 0.12 * f32(i) / 4.0;
    let d = sceneSDF(pos + h * nor, t).x;
    occ += (h - d) * sca;
    sca *= 0.95;
  }

  return clamp(1.0 - 3.0 * occ, 0.0, 1.0);
}

// Palette for materials
fn getMaterialColor(mat: f32, p: vec3f, t: f32) -> vec3f {
  if (mat < 1.5) {
    // Central shape - iridescent
    let n = normalize(p);
    let angle = atan2(n.z, n.x) / PI * 0.5 + 0.5;
    return vec3f(
      0.5 + 0.5 * sin(angle * 6.28 + t),
      0.5 + 0.5 * sin(angle * 6.28 + t + 2.094),
      0.5 + 0.5 * sin(angle * 6.28 + t + 4.188)
    );
  } else if (mat < 2.5) {
    // Torus 1 - gold
    return vec3f(1.0, 0.8, 0.3);
  } else if (mat < 3.5) {
    // Torus 2 - cyan
    return vec3f(0.2, 0.8, 0.9);
  } else if (mat < 4.5) {
    // Spheres - purple/pink
    return vec3f(0.8, 0.3, 0.7);
  } else {
    // Ground - checker pattern
    let checker = floor(p.x) + floor(p.z);
    let check = ((checker % 2.0) + 2.0) % 2.0;
    return mix(vec3f(0.1, 0.1, 0.15), vec3f(0.2, 0.2, 0.25), check);
  }
}

// Main raymarching
fn rayMarch(ro: vec3f, rd: vec3f, t: f32) -> vec2f {
  var dO = 0.0;
  var mat = 0.0;

  for (var i = 0; i < MAX_STEPS; i++) {
    let p = ro + rd * dO;
    let result = sceneSDF(p, t);
    let dS = result.x;
    mat = result.y;
    dO += dS;

    if (dO > MAX_DIST || dS < SURF_DIST) {
      break;
    }
  }

  return vec2f(dO, mat);
}

@fragment
fn main(@location(0) v_uv: vec2f) -> @location(0) vec4f {
  let aspect = uniforms.u_resolution.x / uniforms.u_resolution.y;
  var uv = v_uv * 2.0 - 1.0;
  uv.x *= aspect;

  let t = uniforms.u_time;

  // Mouse influence on camera
  var mouseNorm = (uniforms.u_mouse / uniforms.u_resolution) * 2.0 - 1.0;

  // Camera setup
  let camDist = 5.0;
  let camHeight = 1.5 + mouseNorm.y * 1.0;
  let camAngle = t * 0.2 + mouseNorm.x * 0.5;

  let ro = vec3f(
    sin(camAngle) * camDist,
    camHeight,
    cos(camAngle) * camDist
  );
  let lookAt = vec3f(0.0, 0.0, 0.0);

  // Camera matrix
  let forward = normalize(lookAt - ro);
  let right = normalize(cross(vec3f(0.0, 1.0, 0.0), forward));
  let up = cross(forward, right);

  let rd = normalize(uv.x * right + uv.y * up + 1.5 * forward);

  // Raymarch
  let result = rayMarch(ro, rd, t);
  let d = result.x;
  let mat = result.y;

  var col = vec3f(0.02, 0.02, 0.05); // Background

  if (d < MAX_DIST) {
    let p = ro + rd * d;
    let n = calcNormal(p, t);

    // Material color
    let albedo = getMaterialColor(mat, p, t);

    // Lighting
    let lightPos = vec3f(3.0, 5.0, 2.0);
    let lightDir = normalize(lightPos - p);
    let viewDir = normalize(ro - p);
    let halfDir = normalize(lightDir + viewDir);

    // Diffuse
    let diff = max(dot(n, lightDir), 0.0);

    // Specular (Blinn-Phong)
    let spec = pow(max(dot(n, halfDir), 0.0), 32.0);

    // Shadows
    let shadow = softShadow(p + n * 0.02, lightDir, 0.02, 10.0, 16.0, t);

    // Ambient occlusion
    let ao = calcAO(p, n, t);

    // Fresnel
    let fresnel = pow(1.0 - max(dot(n, viewDir), 0.0), 3.0);

    // Combine lighting
    let ambient = vec3f(0.1, 0.12, 0.15) * ao;
    let diffuse = albedo * diff * shadow;
    let specular = vec3f(1.0) * spec * shadow * 0.5;
    let rim = vec3f(0.3, 0.5, 0.8) * fresnel * 0.3;

    col = ambient + diffuse + specular + rim;

    // Fog
    let fog = 1.0 - exp(-d * 0.05);
    col = mix(col, vec3f(0.02, 0.02, 0.05), fog);
  }

  // Tone mapping and gamma
  col = col / (col + vec3f(1.0));
  col = pow(col, vec3f(0.4545));

  return vec4f(col, 1.0);
}
`;

export function initRaymarchDemo(
  ctx: { device: GPUDevice },
  format: GPUTextureFormat
): DemoResources {
  const { device } = ctx;

  const dummyPositions = new Float32Array([0, 0]);
  const dummyColors = new Float32Array([1, 1, 1]);

  const positionBuffer = device.createBuffer({
    size: dummyPositions.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(positionBuffer, 0, dummyPositions);

  const colorBuffer = device.createBuffer({
    size: dummyColors.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(colorBuffer, 0, dummyColors);

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
      buffers: [],
    },
    fragment: {
      module: fragmentModule,
      entryPoint: "main",
      targets: [{ format }],
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
    indexBuffer: null,
    uniformBuffer,
    bindGroup,
    indexCount: 0,
    vertexCount: 3,
    instanceCount: 1,
    useInstancing: true,
  };
}

class RaymarchHost implements WebGPUHost {
  private renderTexture: RenderTexture;
  private resources: DemoResources | null = null;
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
    this.resources = initRaymarchDemo({ device: this.device }, this.format);
    await new Promise((resolve) => setTimeout(resolve, 0));
    this.ready = true;
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
    renderPass.draw(3);
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
      this.resources.uniformBuffer?.destroy();
    }
  }
}

export function createRaymarchHost(
  device: GPUDevice,
  format: GPUTextureFormat,
  width: number,
  height: number
): WebGPUHost {
  return new RaymarchHost(device, format, width, height);
}
