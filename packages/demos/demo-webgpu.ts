import { createWebGPUContext, runWebGPURenderLoop } from "@glade/platform";
import type { WebGPUContext } from "@glade/core";
import { GPUBufferUsage, GPUShaderStage } from "@glade/webgpu";

const DEMO_CYCLE_INTERVAL = 3.0; // seconds

// ============================================================================
// Demo 1: Hexagon
// ============================================================================

const HEXAGON_VERTEX_SHADER = `
struct VertexInput {
  @location(0) a_position: vec2f,
  @location(1) a_color: vec3f,
}

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) v_color: vec3f,
}

struct Uniforms {
  u_time: f32,
  _pad: f32,
  u_resolution: vec2f,
  u_mouse: vec2f,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

fn rotate2d(angle: f32) -> mat2x2f {
  let s = sin(angle);
  let c = cos(angle);
  return mat2x2f(c, -s, s, c);
}

@vertex
fn main(input: VertexInput) -> VertexOutput {
  var output: VertexOutput;

  // Convert mouse from pixel coords to normalized device coords (-1 to 1)
  var mouseNorm = (uniforms.u_mouse / uniforms.u_resolution) * 2.0 - 1.0;
  mouseNorm.y = -mouseNorm.y; // Flip Y (screen coords are top-down)

  // Apply rotation based on time
  var pos = input.a_position * rotate2d(uniforms.u_time * 0.5);

  // Add some wobble
  pos.x += sin(uniforms.u_time * 2.0 + input.a_position.y * 3.0) * 0.1;
  pos.y += cos(uniforms.u_time * 2.5 + input.a_position.x * 3.0) * 0.1;

  // Offset position toward mouse
  pos += mouseNorm * 0.3;

  // Scale to maintain aspect ratio
  let aspect = uniforms.u_resolution.x / uniforms.u_resolution.y;
  pos.x /= aspect;

  output.position = vec4f(pos, 0.0, 1.0);

  // Animate color
  output.v_color = input.a_color * (0.5 + 0.5 * sin(uniforms.u_time + input.a_color));

  return output;
}
`;

const HEXAGON_FRAGMENT_SHADER = `
struct Uniforms {
  u_time: f32,
  _pad: f32,
  u_resolution: vec2f,
  u_mouse: vec2f,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

@fragment
fn main(@location(0) v_color: vec3f, @builtin(position) fragCoord: vec4f) -> @location(0) vec4f {
  // Add some color pulsing
  var color = v_color;
  color += 0.1 * sin(uniforms.u_time * 3.0 + fragCoord.x * 0.02);
  color += 0.1 * cos(uniforms.u_time * 2.5 + fragCoord.y * 0.02);

  return vec4f(clamp(color, vec3f(0.0), vec3f(1.0)), 1.0);
}
`;

// ============================================================================
// Demo 2: Particle System with orbiting particles
// ============================================================================

const PARTICLE_VERTEX_SHADER = `
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

const PARTICLE_FRAGMENT_SHADER = `
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

// ============================================================================
// Demo 3: Metaballs - full-screen fragment shader with distance fields
// ============================================================================

const METABALL_VERTEX_SHADER = `
struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) v_uv: vec2f,
}

@vertex
fn main(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
  var output: VertexOutput;

  // Full-screen triangle (covers entire viewport with one triangle)
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

const METABALL_FRAGMENT_SHADER = `
struct Uniforms {
  u_time: f32,
  _pad: f32,
  u_resolution: vec2f,
  u_mouse: vec2f,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

// Compute metaball field contribution from a single ball
fn metaball(p: vec2f, center: vec2f, radius: f32) -> f32 {
  let d = length(p - center);
  return radius * radius / (d * d + 0.0001);
}

// Compute 2D rotation matrix
fn rotate2d(angle: f32) -> mat2x2f {
  let s = sin(angle);
  let c = cos(angle);
  return mat2x2f(c, -s, s, c);
}

// Hash function for pseudo-random values
fn hash(p: vec2f) -> f32 {
  return fract(sin(dot(p, vec2f(127.1, 311.7))) * 43758.5453);
}

// Simplex-like noise
fn noise(p: vec2f) -> f32 {
  let i = floor(p);
  let f = fract(p);
  let u = f * f * (3.0 - 2.0 * f);

  return mix(
    mix(hash(i + vec2f(0.0, 0.0)), hash(i + vec2f(1.0, 0.0)), u.x),
    mix(hash(i + vec2f(0.0, 1.0)), hash(i + vec2f(1.0, 1.0)), u.x),
    u.y
  );
}

// Fractal Brownian Motion for organic movement
fn fbm(p: vec2f) -> f32 {
  var value = 0.0;
  var amplitude = 0.5;
  var frequency = 1.0;
  var pt = p;

  for (var i = 0; i < 4; i++) {
    value += amplitude * noise(pt * frequency);
    amplitude *= 0.5;
    frequency *= 2.0;
  }

  return value;
}

// Palette function for smooth color gradients
fn palette(t: f32, a: vec3f, b: vec3f, c: vec3f, d: vec3f) -> vec3f {
  return a + b * cos(6.28318 * (c * t + d));
}

@fragment
fn main(@location(0) v_uv: vec2f) -> @location(0) vec4f {
  let aspect = uniforms.u_resolution.x / uniforms.u_resolution.y;
  var uv = v_uv * 2.0 - 1.0;
  uv.x *= aspect;

  // Convert mouse to normalized coords
  var mouseNorm = (uniforms.u_mouse / uniforms.u_resolution) * 2.0 - 1.0;
  mouseNorm.x *= aspect;
  mouseNorm.y = -mouseNorm.y;

  let t = uniforms.u_time;

  // Define metaball positions with organic movement
  var field = 0.0;
  let numBalls = 8;

  for (var i = 0; i < numBalls; i++) {
    let fi = f32(i);
    let angle = fi * 0.785398 + t * (0.3 + fi * 0.05);
    let radius = 0.3 + 0.2 * sin(t * 0.5 + fi);

    // Base orbital position
    var center = vec2f(
      cos(angle) * radius,
      sin(angle * 1.3) * radius * 0.8
    );

    // Add noise-based organic movement
    center.x += fbm(vec2f(fi * 10.0, t * 0.3)) * 0.3 - 0.15;
    center.y += fbm(vec2f(fi * 10.0 + 100.0, t * 0.3)) * 0.3 - 0.15;

    // Attraction toward mouse
    let toMouse = mouseNorm - center;
    let mouseDist = length(toMouse);
    center += toMouse * 0.15 / (mouseDist + 0.5);

    // Metaball size varies
    let ballRadius = 0.08 + 0.03 * sin(t * 2.0 + fi * 1.5);

    field += metaball(uv, center, ballRadius);
  }

  // Add a larger central blob that follows mouse more directly
  let centralRadius = 0.12 + 0.02 * sin(t * 1.5);
  field += metaball(uv, mouseNorm * 0.5, centralRadius);

  // Threshold for metaball surface
  let threshold = 1.0;
  let edge = smoothstep(threshold - 0.3, threshold + 0.1, field);

  // Create color based on field strength and position
  let colorT = field * 0.1 + t * 0.1 + length(uv) * 0.2;

  // Vibrant color palette
  let col = palette(
    colorT,
    vec3f(0.5, 0.5, 0.5),
    vec3f(0.5, 0.5, 0.5),
    vec3f(1.0, 1.0, 1.0),
    vec3f(0.0, 0.33, 0.67)
  );

  // Add internal structure/caustics
  let internalPattern = sin(field * 10.0 - t * 3.0) * 0.5 + 0.5;
  let caustics = pow(internalPattern, 3.0) * 0.3;

  // Fresnel-like edge glow
  let edgeGlow = pow(1.0 - abs(field - threshold) / 0.5, 4.0) * 0.5;

  // Combine colors
  var finalColor = col * edge;
  finalColor += vec3f(caustics) * edge;
  finalColor += vec3f(0.2, 0.5, 1.0) * edgeGlow * edge;

  // Background gradient
  let bgGradient = 0.05 + 0.03 * length(uv);
  let bg = vec3f(0.02, 0.02, 0.05) + vec3f(0.0, 0.02, 0.05) * bgGradient;

  // Add subtle background pattern
  let bgPattern = fbm(uv * 3.0 + t * 0.1) * 0.02;
  let bgFinal = bg + bgPattern;

  finalColor = mix(bgFinal, finalColor, edge);

  // Add bloom/glow around metaballs
  let bloom = smoothstep(0.3, 1.0, field) * (1.0 - edge) * 0.3;
  finalColor += col * bloom;

  return vec4f(clamp(finalColor, vec3f(0.0), vec3f(1.0)), 1.0);
}
`;

// ============================================================================
// Demo 4: Raymarched 3D Scene with SDFs
// ============================================================================

const RAYMARCH_VERTEX_SHADER = `
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

const RAYMARCH_FRAGMENT_SHADER = `
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
  mouseNorm.y = -mouseNorm.y;

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

// ============================================================================
// Shared utilities
// ============================================================================

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h * 6) % 2) - 1));
  const m = l - c / 2;

  let r = 0,
    g = 0,
    b = 0;
  const hue = h * 6;

  if (hue < 1) {
    r = c;
    g = x;
  } else if (hue < 2) {
    r = x;
    g = c;
  } else if (hue < 3) {
    g = c;
    b = x;
  } else if (hue < 4) {
    g = x;
    b = c;
  } else if (hue < 5) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }

  return [r + m, g + m, b + m];
}

// ============================================================================
// Demo 1: Hexagon geometry and resources
// ============================================================================

function createHexagonGeometry(): { positions: Float32Array; colors: Float32Array } {
  const positions: Array<number> = [];
  const colors: Array<number> = [];

  const sides = 6;
  const radius = 0.6;

  // center vertex
  positions.push(0, 0);
  colors.push(1, 1, 1); // White center

  // outer vertices
  for (let i = 0; i <= sides; i++) {
    const angle = (i / sides) * Math.PI * 2 - Math.PI / 2;
    positions.push(Math.cos(angle) * radius, Math.sin(angle) * radius);

    // colors based on angle (ish?)
    const hue = i / sides;
    const [r, g, b] = hslToRgb(hue, 1, 0.5);
    colors.push(r, g, b);
  }

  return {
    positions: new Float32Array(positions),
    colors: new Float32Array(colors),
  };
}

function createHexagonIndices(): Uint16Array {
  const indices: Array<number> = [];
  const numSides = 6;

  for (let i = 0; i < numSides; i++) {
    indices.push(0, i + 1, i + 2);
  }

  return new Uint16Array(indices);
}

// ============================================================================
// Demo 2: Particle geometry
// ============================================================================

function createParticleQuadGeometry(): { positions: Float32Array; colors: Float32Array } {
  // A simple quad (two triangles) for each particle instance
  // Positions are offsets from particle center
  const positions = new Float32Array([-1, -1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1]);

  // Colors (will be overridden in shader, but needed for vertex layout)
  const colors = new Float32Array([1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]);

  return { positions, colors };
}

// ============================================================================
// Resource types and initialization
// ============================================================================

interface DemoResources {
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
type Demo = { name: string; resources: DemoResources };

function initHexagonDemo(ctx: WebGPUContext, format: GPUTextureFormat): DemoResources {
  const { device } = ctx;

  const { positions, colors } = createHexagonGeometry();
  const indices = createHexagonIndices();

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

  const indexBuffer = device.createBuffer({
    size: indices.byteLength,
    usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(indexBuffer, 0, indices);

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

  const vertexModule = device.createShaderModule({ code: HEXAGON_VERTEX_SHADER });
  const fragmentModule = device.createShaderModule({ code: HEXAGON_FRAGMENT_SHADER });

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
    indexBuffer,
    uniformBuffer,
    bindGroup,
    indexCount: indices.length,
    vertexCount: 0,
    instanceCount: 1,
    useInstancing: false,
  };
}

function initParticleDemo(ctx: WebGPUContext, format: GPUTextureFormat): DemoResources {
  const { device } = ctx;

  const { positions, colors } = createParticleQuadGeometry();
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

  const vertexModule = device.createShaderModule({ code: PARTICLE_VERTEX_SHADER });
  const fragmentModule = device.createShaderModule({ code: PARTICLE_FRAGMENT_SHADER });

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
    indexBuffer: null,
    uniformBuffer,
    bindGroup,
    indexCount: 0,
    vertexCount: 6, // 6 vertices per quad
    instanceCount: particleCount,
    useInstancing: true,
  };
}

function initMetaballDemo(ctx: WebGPUContext, format: GPUTextureFormat): DemoResources {
  const { device } = ctx;

  // Metaballs use a full-screen triangle, no vertex buffers needed for geometry
  // But we still need dummy buffers to satisfy the DemoResources interface
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

  const vertexModule = device.createShaderModule({ code: METABALL_VERTEX_SHADER });
  const fragmentModule = device.createShaderModule({ code: METABALL_FRAGMENT_SHADER });

  const pipeline = device.createRenderPipeline({
    layout: pipelineLayout,
    vertex: {
      module: vertexModule,
      entryPoint: "main",
      buffers: [], // No vertex buffers - positions generated from vertex index
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
    vertexCount: 3, // Single full-screen triangle
    instanceCount: 1,
    useInstancing: true, // Use draw() path
  };
}

function initRaymarchDemo(ctx: WebGPUContext, format: GPUTextureFormat): DemoResources {
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

  const vertexModule = device.createShaderModule({ code: RAYMARCH_VERTEX_SHADER });
  const fragmentModule = device.createShaderModule({ code: RAYMARCH_FRAGMENT_SHADER });

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

// ============================================================================
// Rendering
// ============================================================================

function render(
  ctx: WebGPUContext,
  resources: DemoResources,
  time: number,
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
    // Full-screen triangle (metaball demo) - no vertex buffers
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
  ];

  console.log("demos initialized, rendering...");

  let mouseX = ctx.width / 2;
  let mouseY = ctx.height / 2;

  ctx.onCursorMove((event) => {
    mouseX = event.x;
    mouseY = event.y;
  });

  let currentDemoIndex = 0;

  const renderCallback = (time: number, _deltaTime: number): void => {
    // Cycle demos every 3 seconds
    const newDemoIndex = Math.floor(time / DEMO_CYCLE_INTERVAL) % demos.length;
    if (newDemoIndex !== currentDemoIndex) {
      currentDemoIndex = newDemoIndex;
      console.log(`Switching to demo: ${demos[currentDemoIndex]!.name}`);
    }

    render(ctx, demos[currentDemoIndex]!.resources, time, mouseX, mouseY);
  };

  runWebGPURenderLoop(ctx, renderCallback);
}

main().catch(console.error);
