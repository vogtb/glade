import type { GLContext, RenderCallback, ContextOptions } from "@bun-gui/core";
import { glfw, type GLFWwindow } from "@bun-gui/glfw";
import { DarwinWebGL2RenderingContext } from "./webgl2-context.ts";

export interface DarwinContextOptions extends ContextOptions {
  title?: string;
}

export interface DarwinContext extends GLContext {
  gl: WebGL2RenderingContext;
  window: GLFWwindow;
}

// Creates a native OpenGL context for macOS using GLFW.
export function createContext(options: DarwinContextOptions = {}): DarwinContext {
  const width = options.width ?? 800;
  const height = options.height ?? 600;
  const title = options.title ?? "bun-gui";

  if (!glfw.init()) {
    throw new Error("Failed to initialize GLFW");
  }

  // GLFW constants
  const GLFW_CONTEXT_VERSION_MAJOR = 0x00022002;
  const GLFW_CONTEXT_VERSION_MINOR = 0x00022003;
  const GLFW_OPENGL_PROFILE = 0x00022008;
  const GLFW_OPENGL_FORWARD_COMPAT = 0x00022006;
  const GLFW_OPENGL_CORE_PROFILE = 0x00032001;

  // request OpenGL 3.2 Core Profile for WebGL2 compatibility
  glfw.windowHint(GLFW_CONTEXT_VERSION_MAJOR, 3);
  glfw.windowHint(GLFW_CONTEXT_VERSION_MINOR, 2);
  glfw.windowHint(GLFW_OPENGL_PROFILE, GLFW_OPENGL_CORE_PROFILE);
  glfw.windowHint(GLFW_OPENGL_FORWARD_COMPAT, 1);

  const window = glfw.createWindow(width, height, title);
  if (!window) {
    glfw.terminate();
    throw new Error("failed to create GLFW window");
  }

  glfw.makeContextCurrent(window);
  glfw.swapInterval(1); // enable vsync

  const fbSize = glfw.getFramebufferSize(window);

  // create WebGL2-compatible context
  const glImpl = new DarwinWebGL2RenderingContext(fbSize.width, fbSize.height);
  glImpl.viewport(0, 0, fbSize.width, fbSize.height);

  // cast to WebGL2RenderingContext for type compatibility
  const gl = glImpl as unknown as WebGL2RenderingContext;

  return {
    gl,
    window,
    width,
    height,
    destroy() {
      glfw.destroyWindow(window);
      glfw.terminate();
    },
  };
}

/**
 * Native render loop for macOS, which takes a DarwinContext and runs until the
 * window is closed. Time values are in seconds.
 */
export function runRenderLoop(ctx: DarwinContext, callback: RenderCallback): void {
  let lastTime = glfw.getTime();

  while (!glfw.windowShouldClose(ctx.window)) {
    const time = glfw.getTime();
    const deltaTime = time - lastTime;
    lastTime = time;

    const shouldContinue = callback(time, deltaTime);
    if (shouldContinue === false) {
      break;
    }

    glfw.swapBuffers(ctx.window);
    glfw.pollEvents();
  }
}
