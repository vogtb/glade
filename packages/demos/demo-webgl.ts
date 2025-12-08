import {
  createWebGLContext,
  runWebGLRenderLoop,
  GLSL_VERSION,
  GLSL_PRECISION,
  type WebGLContext,
} from "@glade/platform";

// Vertex shader - transforms vertices and passes color to fragment shader
const VERTEX_SHADER = `${GLSL_VERSION}
${GLSL_PRECISION}

in vec2 a_position;
in vec3 a_color;

uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_mouse;

out vec3 v_color;

mat2 rotate2d(float angle) {
  float s = sin(angle);
  float c = cos(angle);
  return mat2(c, -s, s, c);
}

void main() {
  // Convert mouse from pixel coords to normalized device coords (-1 to 1)
  vec2 mouseNorm = (u_mouse / u_resolution) * 2.0 - 1.0;
  mouseNorm.y = -mouseNorm.y; // Flip Y (screen coords are top-down)

  // Apply rotation based on time
  vec2 pos = a_position * rotate2d(u_time * 0.5);

  // Add some wobble
  pos.x += sin(u_time * 2.0 + a_position.y * 3.0) * 0.1;
  pos.y += cos(u_time * 2.5 + a_position.x * 3.0) * 0.1;

  // Offset position toward mouse
  pos += mouseNorm * 0.3;

  // Scale to maintain aspect ratio
  float aspect = u_resolution.x / u_resolution.y;
  pos.x /= aspect;

  gl_Position = vec4(pos, 0.0, 1.0);

  // Animate color
  v_color = a_color * (0.5 + 0.5 * sin(u_time + a_color));
}
`;

// Fragment shader - outputs interpolated color with effects
const FRAGMENT_SHADER = `${GLSL_VERSION}
${GLSL_PRECISION}

in vec3 v_color;
uniform float u_time;

out vec4 fragColor;

void main() {
  // Add some color pulsing
  vec3 color = v_color;
  color += 0.1 * sin(u_time * 3.0 + gl_FragCoord.x * 0.02);
  color += 0.1 * cos(u_time * 2.5 + gl_FragCoord.y * 0.02);

  fragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
`;

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

function compileShader(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) {
    throw new Error("error creating shader (ie check your shader code)");
  }

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`shader compilation failed: ${info}`);
  }

  return shader;
}

function createProgram(
  gl: WebGL2RenderingContext,
  vertexShader: WebGLShader,
  fragmentShader: WebGLShader
): WebGLProgram {
  const program = gl.createProgram();
  if (!program) {
    throw new Error("failed to create program");
  }

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    console.error(info);
    throw new Error(`program linking failed: ${info}`);
  }

  return program;
}

interface Resources {
  program: WebGLProgram;
  vao: WebGLVertexArrayObject;
  positionBuffer: WebGLBuffer;
  colorBuffer: WebGLBuffer;
  indexBuffer: WebGLBuffer;
  timeLocation: WebGLUniformLocation;
  resolutionLocation: WebGLUniformLocation;
  mouseLocation: WebGLUniformLocation;
  indexCount: number;
}

function initDemo(ctx: WebGLContext): Resources {
  const { gl } = ctx;

  // compile shaders
  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
  const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
  const program = createProgram(gl, vertexShader, fragmentShader);

  // they're linked now, clean up
  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);

  const timeLocation = gl.getUniformLocation(program, "u_time");
  const resolutionLocation = gl.getUniformLocation(program, "u_resolution");
  const mouseLocation = gl.getUniformLocation(program, "u_mouse");
  if (!timeLocation || !resolutionLocation || !mouseLocation) {
    throw new Error("oops");
  }

  // Create geometry
  const { positions, colors } = createHexagonGeometry();
  const indices = createHexagonIndices();

  // VAO stuff
  const vao = gl.createVertexArray();
  if (!vao) {
    throw new Error("failed to create VAO");
  }
  gl.bindVertexArray(vao);

  // get attribute locations (no layout qualifiers in GLSL 150)
  const positionLoc = gl.getAttribLocation(program, "a_position");
  const colorLoc = gl.getAttribLocation(program, "a_color");

  // create and setup position buffer
  const positionBuffer = gl.createBuffer();
  if (!positionBuffer) {
    throw new Error("buffer position err");
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(positionLoc);
  gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

  // create and setup color buffer
  const colorBuffer = gl.createBuffer();
  if (!colorBuffer) {
    throw new Error("color buffer err");
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, colors, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(colorLoc);
  gl.vertexAttribPointer(colorLoc, 3, gl.FLOAT, false, 0, 0);

  const indexBuffer = gl.createBuffer();
  if (!indexBuffer) {
    throw new Error("err creating index buffer");
  }
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

  gl.bindVertexArray(null);

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  return {
    program,
    vao,
    positionBuffer,
    colorBuffer,
    indexBuffer,
    timeLocation,
    resolutionLocation,
    mouseLocation,
    indexCount: indices.length,
  };
}

function render(
  ctx: WebGLContext,
  resources: Resources,
  time: number,
  mouseX: number,
  mouseY: number
): void {
  const { gl } = ctx;
  const { program, vao, timeLocation, resolutionLocation, mouseLocation, indexCount } = resources;

  // clear with dark bg
  gl.clearColor(0.05, 0.05, 0.1, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT);

  // setup program for use
  gl.useProgram(program);

  // set uniforms
  gl.uniform1f(timeLocation, time);
  gl.uniform2f(resolutionLocation, ctx.width, ctx.height);
  gl.uniform2f(mouseLocation, mouseX, mouseY);

  // bind VAO and draw
  gl.bindVertexArray(vao);
  gl.drawElements(gl.TRIANGLES, indexCount, gl.UNSIGNED_SHORT, 0);
  gl.bindVertexArray(null);

  // and around we go!
}

function main() {
  const ctx = createWebGLContext({
    width: 800,
    height: 600,
    title: "glade WebGL2 Demo",
  });

  console.log("initializing WebGL2 demo...");

  const resources = initDemo(ctx);

  console.log("demo initialized, rendering...");

  let mouseX = ctx.width / 2;
  let mouseY = ctx.height / 2;

  ctx.onCursorMove((event) => {
    mouseX = event.x;
    mouseY = event.y;
  });

  // create render callback
  const renderCallback = (time: number, _deltaTime: number): void =>
    render(ctx, resources, time, mouseX, mouseY);

  // runWebGLRenderLoop is async (uses requestAnimationFrame), so cleanup must
  // not happen here - the browser handles resource cleanup on page unload
  runWebGLRenderLoop(ctx, renderCallback);
}

main();
