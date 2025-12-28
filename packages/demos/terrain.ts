import { GPUBufferUsage, GPUShaderStage } from "@glade/core/webgpu";
import type { WebGPUHost, WebGPUHostInput, RenderTexture } from "@glade/flash/host.ts";
import { createRenderTexture } from "@glade/flash/host.ts";

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
const MAX_STEPS: i32 = 128;
const MAX_DIST: f32 = 150.0;
const SURF_DIST: f32 = 0.002;
const WATER_LEVEL: f32 = 0.0;

// Hash functions for noise
fn hash(p: f32) -> f32 {
  var p2 = fract(p * 0.1031);
  p2 *= p2 + 33.33;
  p2 *= p2 + p2;
  return fract(p2);
}

fn hash2(p: vec2f) -> f32 {
  var p3 = fract(vec3f(p.x, p.y, p.x) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

fn hash3(p: vec3f) -> f32 {
  var q = fract(p * 0.1031);
  q += dot(q, q.yzx + 33.33);
  return fract((q.x + q.y) * q.z);
}

// Smooth noise
fn noise2(p: vec2f) -> f32 {
  let i = floor(p);
  let f = fract(p);
  let u = f * f * (3.0 - 2.0 * f);

  return mix(
    mix(hash2(i + vec2f(0.0, 0.0)), hash2(i + vec2f(1.0, 0.0)), u.x),
    mix(hash2(i + vec2f(0.0, 1.0)), hash2(i + vec2f(1.0, 1.0)), u.x),
    u.y
  );
}

// FBM (Fractal Brownian Motion) for terrain
fn fbm(p: vec2f, octaves: i32) -> f32 {
  var value = 0.0;
  var amplitude = 0.5;
  var frequency = 1.0;
  var maxValue = 0.0;
  var pos = p;

  for (var i = 0; i < octaves; i++) {
    value += amplitude * noise2(pos * frequency);
    maxValue += amplitude;
    amplitude *= 0.5;
    frequency *= 2.0;
    // Rotate each octave for more natural look
    pos = vec2f(pos.x * 0.8 - pos.y * 0.6, pos.x * 0.6 + pos.y * 0.8);
  }

  return value / maxValue;
}

// Terrain height function
fn terrainHeight(p: vec2f) -> f32 {
  let t = uniforms.u_time * 0.05;

  // Base terrain with multiple scales
  var h = fbm(p * 0.1, 8) * 4.0;

  // Add ridges
  let ridge = abs(fbm(p * 0.15 + vec2f(100.0), 6) - 0.5) * 2.0;
  h += ridge * ridge * 2.0;

  // Mountains in the distance
  let mountains = pow(fbm(p * 0.05 + vec2f(50.0), 5), 2.0) * 8.0;
  h += mountains;

  // Subtle animation
  h += sin(p.x * 0.1 + t) * cos(p.y * 0.1 + t * 0.7) * 0.2;

  return h - 2.0; // Offset to get water at y=0
}

// Water waves
fn waterHeight(p: vec2f, t: f32) -> f32 {
  var h = 0.0;

  // Multiple wave layers
  h += sin(p.x * 0.5 + t * 2.0) * 0.02;
  h += sin(p.y * 0.7 + t * 1.5) * 0.015;
  h += sin((p.x + p.y) * 0.3 + t * 2.5) * 0.01;
  h += sin((p.x - p.y) * 0.4 + t * 1.8) * 0.008;

  // High frequency ripples
  h += sin(p.x * 2.0 + t * 4.0) * sin(p.y * 2.0 + t * 3.5) * 0.005;

  return WATER_LEVEL + h;
}

// Calculate terrain normal
fn terrainNormal(p: vec2f) -> vec3f {
  let e = 0.01;
  let h = terrainHeight(p);
  let hx = terrainHeight(p + vec2f(e, 0.0));
  let hz = terrainHeight(p + vec2f(0.0, e));

  return normalize(vec3f(h - hx, e, h - hz));
}

// Calculate water normal
fn waterNormal(p: vec2f, t: f32) -> vec3f {
  let e = 0.01;
  let h = waterHeight(p, t);
  let hx = waterHeight(p + vec2f(e, 0.0), t);
  let hz = waterHeight(p + vec2f(0.0, e), t);

  return normalize(vec3f(h - hx, e, h - hz));
}

// Sky color based on direction
fn skyColor(rd: vec3f, sunDir: vec3f, t: f32) -> vec3f {
  // Base sky gradient
  let skyUp = vec3f(0.2, 0.4, 0.8);
  let skyHorizon = vec3f(0.7, 0.8, 0.95);
  let sky = mix(skyHorizon, skyUp, max(rd.y, 0.0));

  // Sun
  let sunDot = max(dot(rd, sunDir), 0.0);
  let sun = pow(sunDot, 256.0) * vec3f(1.0, 0.95, 0.8) * 2.0;
  let sunGlow = pow(sunDot, 8.0) * vec3f(1.0, 0.7, 0.3) * 0.5;

  // Clouds
  let cloudPos = rd.xz / (rd.y + 0.1) * 2.0 + t * 0.1;
  let clouds = fbm(cloudPos, 5);
  let cloudShape = smoothstep(0.4, 0.7, clouds);
  let cloudColor = mix(vec3f(0.9, 0.9, 0.95), vec3f(1.0), cloudShape);

  var finalSky = sky + sun + sunGlow;
  finalSky = mix(finalSky, cloudColor, cloudShape * 0.6 * smoothstep(0.0, 0.3, rd.y));

  // Sunset colors near horizon
  let sunset = vec3f(1.0, 0.5, 0.2) * pow(1.0 - abs(rd.y), 8.0) * 0.3;
  finalSky += sunset;

  return finalSky;
}

// Terrain material
fn terrainColor(p: vec3f, n: vec3f) -> vec3f {
  let h = p.y;
  let slope = 1.0 - n.y;

  // Base colors
  let grass = vec3f(0.2, 0.35, 0.1);
  let rock = vec3f(0.4, 0.35, 0.3);
  let snow = vec3f(0.95, 0.95, 1.0);
  let sand = vec3f(0.76, 0.7, 0.5);
  let dirt = vec3f(0.3, 0.25, 0.2);

  // Height-based coloring
  var col = sand; // Beach

  if (h > 0.3) {
    col = mix(sand, grass, smoothstep(0.3, 0.8, h));
  }
  if (h > 1.5) {
    col = mix(col, dirt, smoothstep(1.5, 2.5, h));
  }
  if (h > 3.0) {
    col = mix(col, rock, smoothstep(3.0, 4.0, h));
  }
  if (h > 5.0) {
    col = mix(col, snow, smoothstep(5.0, 6.0, h));
  }

  // Slope-based rock
  col = mix(col, rock, smoothstep(0.4, 0.7, slope));

  // Add some variation
  let variation = fbm(p.xz * 2.0, 4) * 0.2;
  col *= 0.9 + variation;

  return col;
}

// Raymarch terrain
fn raymarchTerrain(ro: vec3f, rd: vec3f) -> vec4f {
  var t = 0.0;
  var hit = false;
  var hitWater = false;
  var waterT = 0.0;

  // Check water plane intersection first
  if (rd.y < 0.0 && ro.y > WATER_LEVEL) {
    waterT = (WATER_LEVEL - ro.y) / rd.y;
    if (waterT > 0.0 && waterT < MAX_DIST) {
      hitWater = true;
    }
  }

  // Raymarch terrain
  for (var i = 0; i < MAX_STEPS; i++) {
    let p = ro + rd * t;

    if (t > MAX_DIST) {
      break;
    }

    let h = terrainHeight(p.xz);
    let d = p.y - h;

    if (d < SURF_DIST) {
      hit = true;
      break;
    }

    // Adaptive step size
    t += max(d * 0.5, 0.01);
  }

  // Return: x=terrain distance, y=water distance, z=hit terrain, w=hit water
  return vec4f(t, waterT, select(0.0, 1.0, hit), select(0.0, 1.0, hitWater));
}

// Soft shadow for terrain
fn terrainShadow(p: vec3f, lightDir: vec3f) -> f32 {
  var shadow = 1.0;
  var t = 0.1;

  for (var i = 0; i < 32; i++) {
    let pos = p + lightDir * t;
    let h = terrainHeight(pos.xz);
    let d = pos.y - h;

    if (d < 0.01) {
      return 0.0;
    }

    shadow = min(shadow, 8.0 * d / t);
    t += max(d * 0.5, 0.05);

    if (t > 20.0) {
      break;
    }
  }

  return clamp(shadow, 0.0, 1.0);
}

@fragment
fn main(@location(0) v_uv: vec2f) -> @location(0) vec4f {
  let aspect = uniforms.u_resolution.x / uniforms.u_resolution.y;
  var uv = v_uv * 2.0 - 1.0;
  uv.x *= aspect;

  let t = uniforms.u_time;

  // Mouse influence on camera
  var mouseNorm = (uniforms.u_mouse / uniforms.u_resolution) * 2.0 - 1.0;

  // Camera setup - flying over terrain
  let camSpeed = t * 0.5;
  let camPath = vec2f(
    sin(camSpeed * 0.3) * 20.0,
    camSpeed * 3.0
  );

  let camHeight = 3.0 + sin(t * 0.2) * 1.0 + mouseNorm.y * 2.0;
  let terrainH = terrainHeight(camPath);
  let ro = vec3f(camPath.x, max(terrainH + 2.0, camHeight), camPath.y);

  // Look direction
  let lookAhead = vec2f(
    sin(camSpeed * 0.3 + 0.5) * 20.0,
    camSpeed * 3.0 + 10.0
  );
  let lookAtHeight = terrainHeight(lookAhead);
  let lookAt = vec3f(lookAhead.x + mouseNorm.x * 5.0, lookAtHeight + 1.0, lookAhead.y);

  // Camera matrix
  let forward = normalize(lookAt - ro);
  let right = normalize(cross(vec3f(0.0, 1.0, 0.0), forward));
  let up = cross(forward, right);

  let rd = normalize(uv.x * right + uv.y * up + 1.8 * forward);

  // Sun direction
  let sunAngle = t * 0.1;
  let sunDir = normalize(vec3f(cos(sunAngle), 0.4 + sin(t * 0.05) * 0.1, sin(sunAngle)));

  // Raymarch
  let result = raymarchTerrain(ro, rd);
  let terrainT = result.x;
  let waterT = result.y;
  let hitTerrain = result.z > 0.5;
  let hitWater = result.w > 0.5;

  var col = skyColor(rd, sunDir, t);

  // Determine what we hit first
  let showWater = hitWater && (!hitTerrain || waterT < terrainT);
  let showTerrain = hitTerrain && (!hitWater || terrainT < waterT);

  if (showTerrain) {
    let p = ro + rd * terrainT;
    let n = terrainNormal(p.xz);

    // Material
    let albedo = terrainColor(p, n);

    // Lighting
    let diff = max(dot(n, sunDir), 0.0);
    let shadow = terrainShadow(p + n * 0.1, sunDir);

    // Ambient
    let ambient = vec3f(0.3, 0.4, 0.5) * (0.5 + 0.5 * n.y);

    // Combine
    col = albedo * (ambient + vec3f(1.0, 0.95, 0.8) * diff * shadow);

    // Fog
    let fog = 1.0 - exp(-terrainT * 0.015);
    let fogColor = mix(vec3f(0.5, 0.6, 0.7), skyColor(rd, sunDir, t), 0.5);
    col = mix(col, fogColor, fog);
  }

  if (showWater) {
    let p = ro + rd * waterT;
    let wn = waterNormal(p.xz, t);

    // Fresnel
    let fresnel = pow(1.0 - max(dot(-rd, wn), 0.0), 4.0);

    // Reflection
    let reflDir = reflect(rd, wn);
    var reflCol = skyColor(reflDir, sunDir, t);

    // Check if reflection hits terrain
    let reflResult = raymarchTerrain(p + wn * 0.1, reflDir);
    if (reflResult.z > 0.5 && reflResult.x < 50.0) {
      let reflP = p + reflDir * reflResult.x;
      let reflN = terrainNormal(reflP.xz);
      let reflAlbedo = terrainColor(reflP, reflN);
      let reflDiff = max(dot(reflN, sunDir), 0.0);
      reflCol = reflAlbedo * (vec3f(0.3, 0.4, 0.5) + vec3f(1.0, 0.95, 0.8) * reflDiff * 0.5);

      // Fog on reflection
      let reflFog = 1.0 - exp(-reflResult.x * 0.02);
      reflCol = mix(reflCol, skyColor(reflDir, sunDir, t), reflFog);
    }

    // Water color (deep blue-green)
    let waterCol = vec3f(0.1, 0.3, 0.4);

    // Specular highlight
    let halfDir = normalize(sunDir - rd);
    let spec = pow(max(dot(wn, halfDir), 0.0), 128.0) * 2.0;

    // Combine water
    col = mix(waterCol, reflCol, fresnel * 0.8);
    col += vec3f(1.0, 0.95, 0.8) * spec;

    // Fog
    let fog = 1.0 - exp(-waterT * 0.01);
    let fogColor = mix(vec3f(0.5, 0.6, 0.7), skyColor(rd, sunDir, t), 0.5);
    col = mix(col, fogColor, fog);
  }

  // Tone mapping
  col = col / (col + vec3f(1.0));

  // Vignette
  let vignette = 1.0 - length(v_uv - 0.5) * 0.5;
  col *= vignette;

  // Gamma correction
  col = pow(col, vec3f(0.4545));

  return vec4f(col, 1.0);
}
`;

type TerrainResources = {
  pipeline: GPURenderPipeline;
  uniformBuffer: GPUBuffer;
  bindGroup: GPUBindGroup;
};

class TerrainHost implements WebGPUHost {
  private renderTexture: RenderTexture;
  private resources: TerrainResources | null = null;
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

  private initResources(): TerrainResources {
    const { device, format } = this;

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
      uniformBuffer,
      bindGroup,
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
          clearValue: { r: 0.5, g: 0.6, b: 0.7, a: 1.0 },
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
      this.resources.uniformBuffer.destroy();
    }
  }
}

export function createTerrainHost(
  device: GPUDevice,
  format: GPUTextureFormat,
  width: number,
  height: number
): WebGPUHost {
  return new TerrainHost(device, format, width, height);
}
