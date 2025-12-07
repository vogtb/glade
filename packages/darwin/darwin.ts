export type {
  WebGLContext,
  WebGPUContext,
  GLContext,
  RenderCallback,
  ContextOptions,
} from "@glade/core";

export {
  // WebGL
  createWebGLContext,
  runWebGLRenderLoop,
  // WebGPU
  createWebGPUContext,
  runWebGPURenderLoop,
  // Types
  type DarwinContext,
  type DarwinWebGLContext,
  type DarwinWebGPUContext,
  type DarwinContextOptions,
} from "./context.ts";
export { glfw } from "@glade/glfw";
export { lib, DarwinWebGL2RenderingContext } from "./opengl.ts";
export * from "./webgpu.ts";

// GLSL shader constants for OpenGL 3.2 Core Profile
export const GLSL_VERSION = "#version 150 core";
export const GLSL_PRECISION = "";
