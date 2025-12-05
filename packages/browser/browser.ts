export type { GLContext, RenderCallback, ContextOptions } from "@glade/core";

export {
  createContext,
  runRenderLoop,
  type BrowserContextOptions,
  type BrowserContext,
} from "./context.ts";

// GLSL shader constants for WebGL2
export const GLSL_VERSION = "#version 300 es";
export const GLSL_PRECISION = "precision highp float;";
