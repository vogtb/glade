import type { WebGPUContext, RenderCallback, ContextOptions } from "@glade/core";
import {
  KeyAction,
  CursorStyle,
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
  type CompositionCallback,
  type TextInputCallback,
} from "@glade/core/events";
import {
  glfw,
  type GLFWwindow,
  type GLFWcursor,
  GLFW_ARROW_CURSOR,
  GLFW_IBEAM_CURSOR,
  GLFW_CROSSHAIR_CURSOR,
  GLFW_HAND_CURSOR,
  GLFW_HRESIZE_CURSOR,
  GLFW_VRESIZE_CURSOR,
  GLFW_RESIZE_ALL_CURSOR,
  GLFW_NOT_ALLOWED_CURSOR,
} from "@glade/glfw";
import { createClipboard } from "./clipboard.ts";
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
  textureFormatToString,
} from "./webgpu.ts";
import {
  type WGPUInstance,
  type WGPUAdapter,
  type WGPUDevice,
  type WGPUSurface,
} from "@glade/dawn";
import { createMetalLayerForView } from "./metal.ts";

// Map CursorStyle to GLFW cursor shape constants
function cursorStyleToGLFWShape(style: CursorStyle): number {
  switch (style) {
    case CursorStyle.Default:
      return GLFW_ARROW_CURSOR;
    case CursorStyle.Pointer:
      return GLFW_HAND_CURSOR;
    case CursorStyle.Text:
      return GLFW_IBEAM_CURSOR;
    case CursorStyle.Grab:
    case CursorStyle.Grabbing:
      return GLFW_HAND_CURSOR; // GLFW doesn't have separate grab cursors
    case CursorStyle.NotAllowed:
      return GLFW_NOT_ALLOWED_CURSOR;
    case CursorStyle.Move:
      return GLFW_RESIZE_ALL_CURSOR;
    case CursorStyle.Crosshair:
      return GLFW_CROSSHAIR_CURSOR;
    case CursorStyle.EwResize:
      return GLFW_HRESIZE_CURSOR;
    case CursorStyle.NsResize:
      return GLFW_VRESIZE_CURSOR;
    case CursorStyle.NeswResize:
    case CursorStyle.NwseResize:
      return GLFW_HRESIZE_CURSOR; // Fallback for diagonal resize
    default:
      return GLFW_ARROW_CURSOR;
  }
}

// Cursor cache to avoid recreating cursors repeatedly
class CursorCache {
  private cursors = new Map<number, GLFWcursor>();

  get(shape: number): GLFWcursor | null {
    const cached = this.cursors.get(shape);
    if (cached) {
      return cached;
    }
    const cursor = glfw.createStandardCursor(shape);
    if (cursor) {
      this.cursors.set(shape, cursor);
    }
    return cursor;
  }

  destroy(): void {
    for (const cursor of this.cursors.values()) {
      glfw.destroyCursor(cursor);
    }
    this.cursors.clear();
  }
}

export interface DarwinContextOptions extends ContextOptions {
  title?: string;
}

// WebGPU context interface
export interface DarwinWebGPUContext extends WebGPUContext {
  window: GLFWwindow;
  // Logical window size (in screen coordinates, e.g., 800x600)
  windowWidth: number;
  windowHeight: number;
  // Dawn-specific handles for advanced usage
  wgpuInstance: WGPUInstance;
  wgpuAdapter: WGPUAdapter;
  wgpuDevice: WGPUDevice;
  wgpuSurface: WGPUSurface;
  // Resize handler for reconfiguring surface on window resize
  handleResize(): void;
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

  const clipboard = createClipboard(window);

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

  // Use the first (preferred) format from capabilities
  // On macOS with Dawn, this is typically BGRA8Unorm (0x1b)
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
  // fbSize is physical pixels (e.g., 1600x1200 on Retina)
  // winSize is logical screen coordinates (e.g., 800x600)
  const fbSize = glfw.getFramebufferSize(window);
  const winSize = glfw.getWindowSize(window);

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

  // Cursor cache
  const cursorCache = new CursorCache();

  // Create wrapped GPU device and context
  const wrappedDevice = new DawnGPUDevice(device, queue);
  const wrappedContext = new DawnGPUCanvasContext(
    surface,
    fbSize.width,
    fbSize.height,
    preferredFormat
  );

  // Stub GPU object (not fully implemented)
  const gpu = {} as GPU;

  // Convert numeric format to string for WebGPU API compatibility
  const formatString = (textureFormatToString[preferredFormat] ?? "bgra8unorm") as GPUTextureFormat;

  // Mutable dimensions for resize handling
  let currentFbWidth = fbSize.width;
  let currentFbHeight = fbSize.height;
  let currentWinWidth = winSize.width;
  let currentWinHeight = winSize.height;

  const ctx: DarwinWebGPUContext = {
    gpu,
    adapter: adapter as unknown as GPUAdapter,
    device: wrappedDevice as unknown as GPUDevice,
    queue: wrappedDevice.queue as unknown as GPUQueue,
    context: wrappedContext as unknown as GPUCanvasContext,
    format: formatString,
    clipboard,
    window,
    // width/height are framebuffer size (physical pixels) for GPU operations
    get width() {
      return currentFbWidth;
    },
    set width(v: number) {
      currentFbWidth = v;
    },
    get height() {
      return currentFbHeight;
    },
    set height(v: number) {
      currentFbHeight = v;
    },
    // windowWidth/windowHeight are logical screen coordinates for UI
    get windowWidth() {
      return currentWinWidth;
    },
    set windowWidth(v: number) {
      currentWinWidth = v;
    },
    get windowHeight() {
      return currentWinHeight;
    },
    set windowHeight(v: number) {
      currentWinHeight = v;
    },
    wgpuInstance: instance,
    wgpuAdapter: adapter,
    wgpuDevice: device,
    wgpuSurface: surface,

    handleResize() {
      const newFbSize = glfw.getFramebufferSize(window);
      const newWinSize = glfw.getWindowSize(window);

      if (newFbSize.width !== currentFbWidth || newFbSize.height !== currentFbHeight) {
        currentFbWidth = newFbSize.width;
        currentFbHeight = newFbSize.height;
        currentWinWidth = newWinSize.width;
        currentWinHeight = newWinSize.height;

        // Reconfigure the surface with new dimensions
        configureSurface(surface, {
          device,
          format: preferredFormat,
          width: newFbSize.width,
          height: newFbSize.height,
          presentMode: preferredPresentMode,
          alphaMode: preferredAlphaMode,
        });

        // Update the wrapped context dimensions
        wrappedContext.resize(newFbSize.width, newFbSize.height);
      }
    },

    destroy() {
      for (const cleanup of cleanups) {
        cleanup();
      }
      cleanups.length = 0;
      cursorCache.destroy();
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

    onCompositionStart(_callback: CompositionCallback): () => void {
      // TODO: hook into NSTextInputClient via objc bridge to surface real composition data.
      return () => {};
    },

    onCompositionUpdate(_callback: CompositionCallback): () => void {
      // TODO: hook into NSTextInputClient via objc bridge to surface real composition data.
      return () => {};
    },

    onCompositionEnd(_callback: CompositionCallback): () => void {
      // TODO: hook into NSTextInputClient via objc bridge to surface real composition data.
      return () => {};
    },

    onTextInput(callback: TextInputCallback): () => void {
      const cleanup = glfw.setCharCallback(window, (_win, codepoint) => {
        const text = String.fromCodePoint(codepoint);
        callback({
          text,
          isComposing: false,
        });
      });
      cleanups.push(cleanup);
      return () => {
        cleanup();
        const idx = cleanups.indexOf(cleanup);
        if (idx >= 0) {
          cleanups.splice(idx, 1);
        }
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
        // GLFW: positive yoffset = scroll up (wheel toward user / trackpad swipe down in natural mode)
        // Our convention: positive deltaY = scroll down (increase offset, see content below)
        // So we negate the GLFW values. GLFW gives raw ticks (~1-3), scale up to match pixels.
        const scale = 3.5;
        callback({ deltaX: -deltaX * scale, deltaY: -deltaY * scale });
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

    setCursor(style: CursorStyle): void {
      const shape = cursorStyleToGLFWShape(style);
      const cursor = cursorCache.get(shape);
      glfw.setCursor(window, cursor);
    },
  };

  return ctx;
}

/**
 * Native render loop for macOS WebGPU context.
 * Time values are in seconds.
 * Uses a timed loop to yield to the host event loop between frames.
 */
export function runWebGPURenderLoop(ctx: DarwinWebGPUContext, callback: RenderCallback): void {
  let lastTime = glfw.getTime();

  function frame(): void {
    if (glfw.windowShouldClose(ctx.window)) {
      return;
    }

    const time = glfw.getTime();
    const deltaTime = time - lastTime;
    lastTime = time;

    // Check for window resize and reconfigure surface if needed
    ctx.handleResize();

    // Process Dawn events
    processEvents(ctx.wgpuInstance);
    tickDevice(ctx.wgpuDevice);

    const shouldContinue = callback(time, deltaTime);
    if (shouldContinue === false) {
      return;
    }

    glfw.pollEvents();

    // Yield to the host event loop between frames so async tasks (e.g., clipboard reads) can run.
    setTimeout(frame, 0);
  }

  setTimeout(frame, 0);
}
