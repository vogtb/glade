import type { ContextOptions, RenderCallback, TitleBarStyle, WebGPUContext } from "@glade/core";
import {
  type CharCallback,
  type CloseCallback,
  type CompositionCallback,
  type CursorEnterCallback,
  type CursorMoveCallback,
  CursorStyle,
  type FocusCallback,
  KeyAction,
  type KeyCallback,
  type MouseButton,
  type MouseButtonCallback,
  type RefreshCallback,
  type ResizeCallback,
  type ScrollCallback,
  type TextInputCallback,
} from "@glade/core/events";
import {
  type WGPUAdapter,
  type WGPUDevice,
  type WGPUInstance,
  type WGPUSurface,
} from "@glade/dawn";
import {
  glfw,
  GLFW_ARROW_CURSOR,
  GLFW_CROSSHAIR_CURSOR,
  GLFW_HAND_CURSOR,
  GLFW_HRESIZE_CURSOR,
  GLFW_IBEAM_CURSOR,
  GLFW_NOT_ALLOWED_CURSOR,
  GLFW_RESIZE_ALL_CURSOR,
  GLFW_VRESIZE_CURSOR,
  type GLFWcursor,
  type GLFWwindow,
} from "@glade/glfw";

import { createClipboard } from "./clipboard.ts";
import {
  attachIme,
  attachTitlebarDrag,
  attachTitlebarDragMonitor,
  type ImeHandle,
  type TitlebarDragHandle,
  type TitlebarDragMonitorHandle,
} from "./helpers.ts";
import { createMetalLayerForView } from "./metal.ts";
import { getClass, getSelector, objcSendNoArgs } from "./objc.ts";
import {
  configureSurface,
  createInstance,
  createSurfaceFromMetalLayer,
  DawnGPUCanvasContext,
  DawnGPUDevice,
  getDeviceQueue,
  getSurfaceCapabilities,
  processEvents,
  releaseAdapter,
  releaseDevice,
  releaseInstance,
  releaseQueue,
  releaseSurface,
  requestAdapter,
  requestDevice,
  textureFormatToString,
  tickDevice,
} from "./webgpu.ts";
import { applyTitleBarStyle } from "./window_style.ts";

// Map CursorStyle to GLFW cursor shape constants, returning null for cursors
// that need NSCursor handling
function cursorStyleToGLFWShape(style: CursorStyle): number | null {
  switch (style) {
    case CursorStyle.Default:
      return GLFW_ARROW_CURSOR;
    case CursorStyle.Pointer:
      return GLFW_HAND_CURSOR;
    case CursorStyle.Text:
      return GLFW_IBEAM_CURSOR;
    case CursorStyle.Grab:
    case CursorStyle.Grabbing:
      return null; // Use NSCursor for these
    case CursorStyle.Move:
      return GLFW_RESIZE_ALL_CURSOR; // Four-directional arrows
    case CursorStyle.NotAllowed:
      return GLFW_NOT_ALLOWED_CURSOR;
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

// Set cursor using native NSCursor API. Used for cursors not available in
// GLFW (grab, grabbing)
function setNSCursor(style: CursorStyle): void {
  const NSCursor = getClass("NSCursor");
  let selectorName: string;

  switch (style) {
    case CursorStyle.Grab:
      selectorName = "openHandCursor";
      break;
    case CursorStyle.Grabbing:
      selectorName = "closedHandCursor";
      break;
    default:
      return;
  }

  const sel = getSelector(selectorName);
  const cursor = objcSendNoArgs.symbols.objc_msgSend(NSCursor, sel);
  if (cursor) {
    const setSel = getSelector("set");
    objcSendNoArgs.symbols.objc_msgSend(cursor, setSel);
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

export interface MacOSContextOptions extends ContextOptions {
  title?: string;
  // "transparent" draws content under the title bar; leave space for traffic
  // lights if needed.
  titleBarStyle?: TitleBarStyle;
}

// WebGPU context interface
export interface MacOSWebGPUContext extends WebGPUContext {
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

// For macOS we need to multiply it in a similar way to Chrome to get desired
// scroll effect.
const SCROLL_SCALE = 3.5;

/**
 * Creates a native WebGPU context for macOS using GLFW and Dawn. Async
 * because WebGPU adapter/device creation is asynchronous.
 */
export async function createWebGPUContext(
  options: MacOSContextOptions = {}
): Promise<MacOSWebGPUContext> {
  const width = options.width ?? 800;
  const height = options.height ?? 600;
  const title = options.title ?? "glade";
  const titleBarStyle = options.titleBarStyle ?? "standard";

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

  const nsWindowPtr = glfw.getCocoaWindow(window);
  if (nsWindowPtr) {
    applyTitleBarStyle(nsWindowPtr, titleBarStyle);
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

  // Use the first (preferred) format from capabilities. On macOS with Dawn,
  // this is typically BGRA8Unorm (0x1b)
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

  // IME handler (optional)
  let imeHandle: ImeHandle | null = null;
  let titlebarDragHandle: TitlebarDragHandle | null = null;
  let titlebarDragMonitorHandle: TitlebarDragMonitorHandle | null = null;
  const compositionStartListeners: CompositionCallback[] = [];
  const compositionUpdateListeners: CompositionCallback[] = [];
  const compositionEndListeners: CompositionCallback[] = [];
  const textInputListeners: TextInputCallback[] = [];
  const charListeners: CharCallback[] = [];
  let compositionActive = false;

  const emitComposition = (
    which: "start" | "update" | "end",
    text: string,
    selectionStart: number,
    selectionEnd: number
  ) => {
    const payload = { text, selectionStart, selectionEnd };
    const listeners =
      which === "start"
        ? compositionStartListeners
        : which === "update"
          ? compositionUpdateListeners
          : compositionEndListeners;
    for (const cb of listeners) {
      cb(payload);
    }
  };

  const emitTextInput = (text: string, isComposing: boolean) => {
    const payload = { text, isComposing };
    for (const cb of textInputListeners) {
      cb(payload);
    }
  };

  // Fallback text input from GLFW char events (non-IME paths) and fan-out
  // to listeners
  const charCleanup = glfw.setCharCallback(window, (_win, codepoint) => {
    const text = String.fromCodePoint(codepoint);
    emitTextInput(text, false);
    const event = { codepoint, char: text };
    for (const cb of charListeners) {
      cb(event);
    }
  });
  cleanups.push(charCleanup);

  // Try to attach native IME handler (optional)
  if (nsWindowPtr) {
    const handle = attachIme(nsWindowPtr, {
      onComposing: (text, selectionStart, selectionEnd) => {
        if (!compositionActive) {
          compositionActive = true;
          emitComposition("start", text, selectionStart, selectionEnd);
        } else {
          emitComposition("update", text, selectionStart, selectionEnd);
        }
      },
      onCommit: (text) => {
        emitTextInput(text, true);
        emitComposition("end", "", 0, 0);
        compositionActive = false;
      },
      onCancel: () => {
        emitComposition("end", "", 0, 0);
        compositionActive = false;
      },
    });
    imeHandle = handle;
  }

  if (nsWindowPtr) {
    if (titleBarStyle === "transparent") {
      titlebarDragHandle = attachTitlebarDrag(nsWindowPtr);
    } else if (titleBarStyle === "controlled") {
      titlebarDragMonitorHandle = attachTitlebarDragMonitor(nsWindowPtr);
    }
  }

  const ctx: MacOSWebGPUContext = {
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
      if (imeHandle) {
        imeHandle.detach();
        imeHandle = null;
      }
      if (titlebarDragHandle) {
        titlebarDragHandle.detach();
        titlebarDragHandle = null;
      }
      if (titlebarDragMonitorHandle) {
        titlebarDragMonitorHandle.detach();
        titlebarDragMonitorHandle = null;
      }
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
        if (idx >= 0) {
          cleanups.splice(idx, 1);
        }
      };
    },

    onChar(callback: CharCallback): () => void {
      charListeners.push(callback);
      return () => {
        const idx = charListeners.indexOf(callback);
        if (idx >= 0) {
          charListeners.splice(idx, 1);
        }
      };
    },

    onCompositionStart(_callback: CompositionCallback): () => void {
      compositionStartListeners.push(_callback);
      return () => {
        const idx = compositionStartListeners.indexOf(_callback);
        if (idx >= 0) {
          compositionStartListeners.splice(idx, 1);
        }
      };
    },

    onCompositionUpdate(_callback: CompositionCallback): () => void {
      compositionUpdateListeners.push(_callback);
      return () => {
        const idx = compositionUpdateListeners.indexOf(_callback);
        if (idx >= 0) {
          compositionUpdateListeners.splice(idx, 1);
        }
      };
    },

    onCompositionEnd(_callback: CompositionCallback): () => void {
      compositionEndListeners.push(_callback);
      return () => {
        const idx = compositionEndListeners.indexOf(_callback);
        if (idx >= 0) {
          compositionEndListeners.splice(idx, 1);
        }
      };
    },

    onTextInput(callback: TextInputCallback): () => void {
      textInputListeners.push(callback);
      return () => {
        const idx = textInputListeners.indexOf(callback);
        if (idx >= 0) {
          textInputListeners.splice(idx, 1);
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
        if (idx >= 0) {
          cleanups.splice(idx, 1);
        }
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
        if (idx >= 0) {
          cleanups.splice(idx, 1);
        }
      };
    },

    onScroll(callback: ScrollCallback): () => void {
      const cleanup = glfw.setScrollCallback(window, (_win, deltaX, deltaY) => {
        // GLFW: positive yoffset = scroll up (wheel toward user / trackpad
        // swipe down in natural mode)
        // Our convention: positive deltaY = scroll down (increase offset,
        // see content below) o we negate the GLFW values. GLFW gives raw
        // ticks (~1-3), scale up to match pixels.
        callback({ deltaX: -deltaX * SCROLL_SCALE, deltaY: -deltaY * SCROLL_SCALE });
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

    onResize(callback: ResizeCallback): () => void {
      const cleanup = glfw.setFramebufferSizeCallback(window, (_win, w, h) => {
        callback({ width: w, height: h });
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

    onClose(callback: CloseCallback): () => void {
      const cleanup = glfw.setWindowCloseCallback(window, () => {
        callback();
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

    onFocus(callback: FocusCallback): () => void {
      const cleanup = glfw.setWindowFocusCallback(window, (_win, focused) => {
        if (focused !== 0 && imeHandle) {
          imeHandle.makeFirstResponder();
        } else if (focused === 0 && compositionActive) {
          // Ensure we end any in-flight composition when focus leaves
          // the window
          emitComposition("end", "", 0, 0);
          compositionActive = false;
        }
        callback({ focused: focused !== 0 });
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

    onCursorEnter(callback: CursorEnterCallback): () => void {
      const cleanup = glfw.setCursorEnterCallback(window, (_win, entered) => {
        callback({ entered: entered !== 0 });
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

    onRefresh(callback: RefreshCallback): () => void {
      const cleanup = glfw.setWindowRefreshCallback(window, () => {
        callback();
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

    setCursor(style: CursorStyle): void {
      const shape = cursorStyleToGLFWShape(style);
      if (shape === null) {
        // Use native NSCursor for grab, grabbing, move
        glfw.setCursor(window, null); // Clear GLFW cursor first
        setNSCursor(style);
      } else {
        const cursor = cursorCache.get(shape);
        glfw.setCursor(window, cursor);
      }
    },

    setTitle(title: string): void {
      glfw.setWindowTitle(window, title);
    },
  };

  return ctx;
}

/**
 * Native render loop for macOS WebGPU context. Time values are in seconds.
 * Uses a timed loop to yield to the host event loop between frames.
 */
export function runWebGPURenderLoop(ctx: MacOSWebGPUContext, callback: RenderCallback): void {
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

    // Yield to the host event loop between frames so async tasks
    // (e.g., clipboard reads) can run.
    setTimeout(frame, 0);
  }

  setTimeout(frame, 0);
}
