export {
  // WebGL (legacy names for backwards compatibility)
  createContext,
  runRenderLoop,
  // WebGL (new names)
  createWebGLContext,
  runWebGLRenderLoop,
  // WebGPU
  createWebGPUContext,
  runWebGPURenderLoop,
  // Constants
  GLSL_VERSION,
  GLSL_PRECISION,
  // Types
  type WebGLContext,
  type WebGPUContext,
  type GLContext,
  type RenderCallback,
  type ContextOptions,
  type DarwinContext,
  type DarwinWebGLContext,
  type DarwinWebGPUContext,
  type DarwinContextOptions,
} from "@glade/darwin";
