/**
 * Browser bindings are not really that complex as we're depending on the
 * standard WebGL and WegGPU JS APIs, not our own custom implementations of
 * them like on darwin.
 */

export {
  // WebGL
  createWebGLContext,
  runWebGLRenderLoop,
  // WebGPU
  createWebGPUContext,
  runWebGPURenderLoop,
  // Types
  type BrowserWebGLContext,
  type BrowserWebGPUContext,
  type BrowserContextOptions,
  type BrowserWebGPUContextOptions,
} from "./context.ts";

// GLSL shader constants for WebGL2
export const GLSL_VERSION = "#version 300 es";
export const GLSL_PRECISION = "precision highp float;";

// Flash platform
export { createFlashPlatform } from "./flash";
