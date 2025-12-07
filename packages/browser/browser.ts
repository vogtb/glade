/**
 * Browser bindings are not r
 */

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
  type BrowserContext,
  type BrowserWebGLContext,
  type BrowserWebGPUContext,
  type BrowserContextOptions,
  type BrowserWebGPUContextOptions,
} from "./context.ts";

// GLSL shader constants for WebGL2
export const GLSL_VERSION = "#version 300 es";
export const GLSL_PRECISION = "precision highp float;";
