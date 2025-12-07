import type { WebGLContext, WebGPUContext, RenderCallback, ContextOptions } from "@glade/core";
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
import { DarwinWebGL2RenderingContext } from "./opengl.ts";
import {
  createInstance,
  requestAdapter,
  requestDevice,
  getDeviceQueue,
  createSurfaceFromMetalLayer,
  configureSurface,
  getSurfaceCapabilities,
  releaseInstance,
  releaseAdapter,
  releaseDevice,
  releaseQueue,
  releaseSurface,
  processEvents,
  tickDevice,
  DawnGPUDevice,
  DawnGPUCanvasContext,
} from "./webgpu.ts";
import {
  type WGPUInstance,
  type WGPUAdapter,
  type WGPUDevice,
  type WGPUSurface,
} from "@glade/dawn";
import { createMetalLayerForView } from "./metal.ts";

export interface DarwinContextOptions extends ContextOptions {
  title?: string;
}

// WebGL context interface
export interface DarwinWebGLContext extends WebGLContext {
  gl: WebGL2RenderingContext;
  window: GLFWwindow;
}

// WebGPU context interface
export interface DarwinWebGPUContext extends WebGPUContext {
  window: GLFWwindow;
  // Dawn-specific handles for advanced usage
  wgpuInstance: WGPUInstance;
  wgpuAdapter: WGPUAdapter;
  wgpuDevice: WGPUDevice;
  wgpuSurface: WGPUSurface;
}

/**
 * @deprecated Use DarwinWebGLContext instead
 */
export type DarwinContext = DarwinWebGLContext;

// Creates a native OpenGL context for macOS using GLFW.
export function createWebGLContext(options: DarwinContextOptions = {}): DarwinWebGLContext {
  const width = options.width ?? 800;
  const height = options.height ?? 600;
  const title = options.title ?? "glade";

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
 * Creates a native WebGPU context for macOS using GLFW and Dawn.
 * This is an async function because WebGPU adapter/device creation is asynchronous.
 */
export async function createWebGPUContext(
  options: DarwinContextOptions = {}
): Promise<DarwinWebGPUContext> {
  const width = options.width ?? 800;
  const height = options.height ?? 600;
  const title = options.title ?? "glade";

  if (!glfw.init()) {
    throw new Error("Failed to initialize GLFW");
  }

  // GLFW constants
  const GLFW_CLIENT_API = 0x00022001;
  const GLFW_NO_API = 0;

  // For WebGPU, we don't want GLFW to create an OpenGL context
  glfw.windowHint(GLFW_CLIENT_API, GLFW_NO_API);

  const window = glfw.createWindow(width, height, title);
  if (!window) {
    glfw.terminate();
    throw new Error("Failed to create GLFW window");
  }

  // Get the native view and create a Metal layer
  const nsView = glfw.getCocoaView(window);
  if (!nsView) {
    glfw.destroyWindow(window);
    glfw.terminate();
    throw new Error("Failed to get Cocoa view from GLFW window");
  }

  const metalLayer = createMetalLayerForView(nsView);

  // Create WebGPU instance
  const instance = createInstance();

  // Create surface from Metal layer
  const surface = createSurfaceFromMetalLayer(instance, metalLayer as unknown as bigint);

  // Request adapter
  const adapter = await requestAdapter(instance);

  // Get surface capabilities to find supported formats/modes
  const capabilities = getSurfaceCapabilities(surface, adapter);
  if (capabilities.formats.length === 0) {
    throw new Error("No supported surface formats");
  }

  // Use first (preferred) format from capabilities
  const preferredFormat = capabilities.formats[0]!;
  const preferredPresentMode =
    capabilities.presentModes.length > 0 ? capabilities.presentModes[0]! : undefined;
  const preferredAlphaMode =
    capabilities.alphaModes.length > 0 ? capabilities.alphaModes[0]! : undefined;

  // Request device
  const device = await requestDevice(adapter);

  // Get queue
  const queue = getDeviceQueue(device);

  // Configure surface with capabilities-derived values
  const fbSize = glfw.getFramebufferSize(window);
  configureSurface(surface, {
    device,
    format: preferredFormat,
    width: fbSize.width,
    height: fbSize.height,
    presentMode: preferredPresentMode,
    alphaMode: preferredAlphaMode,
  });

  // Track cleanup functions for all registered callbacks
  const cleanups: Array<() => void> = [];

  // Create wrapped GPU device and context
  const wrappedDevice = new DawnGPUDevice(device, queue);
  const wrappedContext = new DawnGPUCanvasContext(surface, fbSize.width, fbSize.height);

  // Stub GPU object (not fully implemented)
  const gpu = {} as GPU;

  return {
    gpu,
    adapter: adapter as unknown as GPUAdapter,
    device: wrappedDevice as unknown as GPUDevice,
    queue: wrappedDevice.queue as unknown as GPUQueue,
    context: wrappedContext as unknown as GPUCanvasContext,
    window,
    width: fbSize.width,
    height: fbSize.height,
    wgpuInstance: instance,
    wgpuAdapter: adapter,
    wgpuDevice: device,
    wgpuSurface: surface,

    destroy() {
      for (const cleanup of cleanups) {
        cleanup();
      }
      cleanups.length = 0;
      releaseSurface(surface);
      releaseQueue(queue);
      releaseDevice(device);
      releaseAdapter(adapter);
      releaseInstance(instance);
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
 * Native render loop for macOS WebGL context.
 * Time values are in seconds.
 */
export function runWebGLRenderLoop(ctx: DarwinWebGLContext, callback: RenderCallback): void {
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

/**
 * @deprecated Use runWebGLRenderLoop instead
 */
export const runRenderLoop = runWebGLRenderLoop;

/**
 * Native render loop for macOS WebGPU context.
 * Time values are in seconds.
 */
export function runWebGPURenderLoop(ctx: DarwinWebGPUContext, callback: RenderCallback): void {
  let lastTime = glfw.getTime();

  while (!glfw.windowShouldClose(ctx.window)) {
    const time = glfw.getTime();
    const deltaTime = time - lastTime;
    lastTime = time;

    // Process Dawn events
    processEvents(ctx.wgpuInstance);
    tickDevice(ctx.wgpuDevice);

    const shouldContinue = callback(time, deltaTime);
    if (shouldContinue === false) {
      break;
    }

    glfw.pollEvents();
  }
}
