import type { GLContext, RenderCallback, ContextOptions } from "@glade/core";
import {
  KeyAction,
  type MouseButton,
  type KeyCallback,
  type CharCallback,
  type MouseButtonCallback,
  type CursorMoveCallback,
  type ScrollCallback,
  type ResizeCallback,
  type CloseCallback,
  type FocusCallback,
  type CursorEnterCallback,
  type RefreshCallback,
} from "@glade/core/events.ts";
import { glfw, type GLFWwindow } from "@glade/glfw";
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
  // TODO; move these and other glfw setup into the glfw package
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

  // Track cleanup functions for all registered callbacks
  const cleanups: Array<() => void> = [];

  return {
    gl,
    window,
    width,
    height,

    destroy() {
      // Clean up all registered callbacks
      for (const cleanup of cleanups) {
        cleanup();
      }
      cleanups.length = 0;
      glfw.destroyWindow(window);
      glfw.terminate();
    },

    onKey(callback: KeyCallback): () => void {
      const cleanup = glfw.setKeyCallback(window, (_win, key, scancode, action, mods) => {
        callback({
          key,
          scancode,
          action: action as KeyAction,
          mods,
        });
      });
      cleanups.push(cleanup);
      return () => {
        cleanup();
        const idx = cleanups.indexOf(cleanup);
        if (idx >= 0) cleanups.splice(idx, 1);
      };
    },

    onChar(callback: CharCallback): () => void {
      const cleanup = glfw.setCharCallback(window, (_win, codepoint) => {
        callback({
          codepoint,
          char: String.fromCodePoint(codepoint),
        });
      });
      cleanups.push(cleanup);
      return () => {
        cleanup();
        const idx = cleanups.indexOf(cleanup);
        if (idx >= 0) cleanups.splice(idx, 1);
      };
    },

    onMouseButton(callback: MouseButtonCallback): () => void {
      const cleanup = glfw.setMouseButtonCallback(window, (_win, button, action, mods) => {
        callback({
          button: button as MouseButton,
          action: action as KeyAction,
          mods,
        });
      });
      cleanups.push(cleanup);
      return () => {
        cleanup();
        const idx = cleanups.indexOf(cleanup);
        if (idx >= 0) cleanups.splice(idx, 1);
      };
    },

    onCursorMove(callback: CursorMoveCallback): () => void {
      const cleanup = glfw.setCursorPosCallback(window, (_win, x, y) => {
        callback({ x, y });
      });
      cleanups.push(cleanup);
      return () => {
        cleanup();
        const idx = cleanups.indexOf(cleanup);
        if (idx >= 0) cleanups.splice(idx, 1);
      };
    },

    onScroll(callback: ScrollCallback): () => void {
      const cleanup = glfw.setScrollCallback(window, (_win, deltaX, deltaY) => {
        callback({ deltaX, deltaY });
      });
      cleanups.push(cleanup);
      return () => {
        cleanup();
        const idx = cleanups.indexOf(cleanup);
        if (idx >= 0) cleanups.splice(idx, 1);
      };
    },

    onResize(callback: ResizeCallback): () => void {
      const cleanup = glfw.setFramebufferSizeCallback(window, (_win, w, h) => {
        callback({ width: w, height: h });
      });
      cleanups.push(cleanup);
      return () => {
        cleanup();
        const idx = cleanups.indexOf(cleanup);
        if (idx >= 0) cleanups.splice(idx, 1);
      };
    },

    onClose(callback: CloseCallback): () => void {
      const cleanup = glfw.setWindowCloseCallback(window, () => {
        callback();
      });
      cleanups.push(cleanup);
      return () => {
        cleanup();
        const idx = cleanups.indexOf(cleanup);
        if (idx >= 0) cleanups.splice(idx, 1);
      };
    },

    onFocus(callback: FocusCallback): () => void {
      const cleanup = glfw.setWindowFocusCallback(window, (_win, focused) => {
        callback({ focused: focused !== 0 });
      });
      cleanups.push(cleanup);
      return () => {
        cleanup();
        const idx = cleanups.indexOf(cleanup);
        if (idx >= 0) cleanups.splice(idx, 1);
      };
    },

    onCursorEnter(callback: CursorEnterCallback): () => void {
      const cleanup = glfw.setCursorEnterCallback(window, (_win, entered) => {
        callback({ entered: entered !== 0 });
      });
      cleanups.push(cleanup);
      return () => {
        cleanup();
        const idx = cleanups.indexOf(cleanup);
        if (idx >= 0) cleanups.splice(idx, 1);
      };
    },

    onRefresh(callback: RefreshCallback): () => void {
      const cleanup = glfw.setWindowRefreshCallback(window, () => {
        callback();
      });
      cleanups.push(cleanup);
      return () => {
        cleanup();
        const idx = cleanups.indexOf(cleanup);
        if (idx >= 0) cleanups.splice(idx, 1);
      };
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
