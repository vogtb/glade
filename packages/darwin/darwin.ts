export type { GLContext, RenderCallback, ContextOptions } from "@glade/core";

export {
  createContext,
  runRenderLoop,
  type DarwinContext,
  type DarwinContextOptions,
} from "./context.ts";
export { glfw } from "@glade/glfw";
export { lib } from "./gl.ts";
export { DarwinWebGL2RenderingContext } from "./webgl2-context.ts";

// GLSL shader constants for OpenGL 3.2 Core Profile
export const GLSL_VERSION = "#version 150 core";
export const GLSL_PRECISION = "";
