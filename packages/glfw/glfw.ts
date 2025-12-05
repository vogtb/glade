import { dlopen, FFIType, ptr, JSCallback, type Pointer } from "bun:ffi";

// @ts-expect-error - Bun-specific import attribute
import GLFW_PATH from "../../vendor/libglfw.dylib" with { type: "file" };

console.log(`using embedded libglfw.dylib at GLFW_PATH=${GLFW_PATH}`);

const lib = dlopen(GLFW_PATH, {
  glfwInit: { args: [], returns: FFIType.i32 },
  glfwWindowHint: { args: [FFIType.i32, FFIType.i32], returns: FFIType.void },
  glfwTerminate: { args: [], returns: FFIType.void },
  glfwCreateWindow: {
    args: [FFIType.i32, FFIType.i32, FFIType.cstring, FFIType.ptr, FFIType.ptr],
    returns: FFIType.ptr,
  },
  glfwDestroyWindow: { args: [FFIType.ptr], returns: FFIType.void },
  glfwMakeContextCurrent: { args: [FFIType.ptr], returns: FFIType.void },
  glfwWindowShouldClose: { args: [FFIType.ptr], returns: FFIType.i32 },
  glfwSetWindowShouldClose: { args: [FFIType.ptr, FFIType.i32], returns: FFIType.void },
  glfwSwapBuffers: { args: [FFIType.ptr], returns: FFIType.void },
  glfwPollEvents: { args: [], returns: FFIType.void },
  glfwWaitEvents: { args: [], returns: FFIType.void },
  glfwGetTime: { args: [], returns: FFIType.f64 },
  glfwSetTime: { args: [FFIType.f64], returns: FFIType.void },
  glfwGetWindowSize: { args: [FFIType.ptr, FFIType.ptr, FFIType.ptr], returns: FFIType.void },
  glfwGetFramebufferSize: { args: [FFIType.ptr, FFIType.ptr, FFIType.ptr], returns: FFIType.void },
  glfwSwapInterval: { args: [FFIType.i32], returns: FFIType.void },
  // Callback setters
  glfwSetKeyCallback: { args: [FFIType.ptr, FFIType.ptr], returns: FFIType.ptr },
  glfwSetCharCallback: { args: [FFIType.ptr, FFIType.ptr], returns: FFIType.ptr },
  glfwSetMouseButtonCallback: { args: [FFIType.ptr, FFIType.ptr], returns: FFIType.ptr },
  glfwSetCursorPosCallback: { args: [FFIType.ptr, FFIType.ptr], returns: FFIType.ptr },
  glfwSetScrollCallback: { args: [FFIType.ptr, FFIType.ptr], returns: FFIType.ptr },
  glfwSetWindowSizeCallback: { args: [FFIType.ptr, FFIType.ptr], returns: FFIType.ptr },
  glfwSetFramebufferSizeCallback: { args: [FFIType.ptr, FFIType.ptr], returns: FFIType.ptr },
  glfwSetWindowCloseCallback: { args: [FFIType.ptr, FFIType.ptr], returns: FFIType.ptr },
  glfwSetWindowFocusCallback: { args: [FFIType.ptr, FFIType.ptr], returns: FFIType.ptr },
  glfwSetCursorEnterCallback: { args: [FFIType.ptr, FFIType.ptr], returns: FFIType.ptr },
  glfwSetWindowRefreshCallback: { args: [FFIType.ptr, FFIType.ptr], returns: FFIType.ptr },
});

// Callback type definitions for GLFW
export type GLFWKeyCallback = (
  window: Pointer,
  key: number,
  scancode: number,
  action: number,
  mods: number
) => void;
export type GLFWCharCallback = (window: Pointer, codepoint: number) => void;
export type GLFWMouseButtonCallback = (
  window: Pointer,
  button: number,
  action: number,
  mods: number
) => void;
export type GLFWCursorPosCallback = (window: Pointer, xpos: number, ypos: number) => void;
export type GLFWScrollCallback = (window: Pointer, xoffset: number, yoffset: number) => void;
export type GLFWWindowSizeCallback = (window: Pointer, width: number, height: number) => void;
export type GLFWWindowCloseCallback = (window: Pointer) => void;
export type GLFWWindowFocusCallback = (window: Pointer, focused: number) => void;
export type GLFWCursorEnterCallback = (window: Pointer, entered: number) => void;
export type GLFWWindowRefreshCallback = (window: Pointer) => void;

export type GLFWwindow = Pointer;

export const glfw = {
  init(): boolean {
    return lib.symbols.glfwInit() !== 0;
  },

  terminate(): void {
    lib.symbols.glfwTerminate();
  },

  createWindow(width: number, height: number, title: string): GLFWwindow | null {
    const titleBuffer = Buffer.from(title + "\0");
    const window = lib.symbols.glfwCreateWindow(width, height, ptr(titleBuffer), null, null);
    return window;
  },

  destroyWindow(window: GLFWwindow): void {
    lib.symbols.glfwDestroyWindow(window);
  },

  makeContextCurrent(window: GLFWwindow): void {
    lib.symbols.glfwMakeContextCurrent(window);
  },

  windowShouldClose(window: GLFWwindow): boolean {
    return lib.symbols.glfwWindowShouldClose(window) !== 0;
  },

  setWindowShouldClose(window: GLFWwindow, value: boolean): void {
    lib.symbols.glfwSetWindowShouldClose(window, value ? 1 : 0);
  },

  swapBuffers(window: GLFWwindow): void {
    lib.symbols.glfwSwapBuffers(window);
  },

  pollEvents(): void {
    lib.symbols.glfwPollEvents();
  },

  waitEvents(): void {
    lib.symbols.glfwWaitEvents();
  },

  getTime(): number {
    return lib.symbols.glfwGetTime();
  },

  setTime(time: number): void {
    lib.symbols.glfwSetTime(time);
  },

  getWindowSize(window: GLFWwindow): { width: number; height: number } {
    const widthBuf = new Int32Array(1);
    const heightBuf = new Int32Array(1);
    lib.symbols.glfwGetWindowSize(window, ptr(widthBuf), ptr(heightBuf));
    return { width: widthBuf[0]!, height: heightBuf[0]! };
  },

  getFramebufferSize(window: GLFWwindow): { width: number; height: number } {
    const widthBuf = new Int32Array(1);
    const heightBuf = new Int32Array(1);
    lib.symbols.glfwGetFramebufferSize(window, ptr(widthBuf), ptr(heightBuf));
    return { width: widthBuf[0]!, height: heightBuf[0]! };
  },

  swapInterval(interval: number): void {
    lib.symbols.glfwSwapInterval(interval);
  },

  windowHint(hint: number, value: number): void {
    lib.symbols.glfwWindowHint(hint, value);
  },

  // Callback setters - return a cleanup function that removes the callback
  setKeyCallback(window: GLFWwindow, callback: GLFWKeyCallback): () => void {
    const cb = new JSCallback(callback, {
      args: [FFIType.ptr, FFIType.i32, FFIType.i32, FFIType.i32, FFIType.i32],
      returns: FFIType.void,
    });
    lib.symbols.glfwSetKeyCallback(window, cb.ptr);
    return () => {
      lib.symbols.glfwSetKeyCallback(window, null);
      cb.close();
    };
  },

  setCharCallback(window: GLFWwindow, callback: GLFWCharCallback): () => void {
    const cb = new JSCallback(callback, {
      args: [FFIType.ptr, FFIType.u32],
      returns: FFIType.void,
    });
    lib.symbols.glfwSetCharCallback(window, cb.ptr);
    return () => {
      lib.symbols.glfwSetCharCallback(window, null);
      cb.close();
    };
  },

  setMouseButtonCallback(window: GLFWwindow, callback: GLFWMouseButtonCallback): () => void {
    const cb = new JSCallback(callback, {
      args: [FFIType.ptr, FFIType.i32, FFIType.i32, FFIType.i32],
      returns: FFIType.void,
    });
    lib.symbols.glfwSetMouseButtonCallback(window, cb.ptr);
    return () => {
      lib.symbols.glfwSetMouseButtonCallback(window, null);
      cb.close();
    };
  },

  setCursorPosCallback(window: GLFWwindow, callback: GLFWCursorPosCallback): () => void {
    const cb = new JSCallback(callback, {
      args: [FFIType.ptr, FFIType.f64, FFIType.f64],
      returns: FFIType.void,
    });
    lib.symbols.glfwSetCursorPosCallback(window, cb.ptr);
    return () => {
      lib.symbols.glfwSetCursorPosCallback(window, null);
      cb.close();
    };
  },

  setScrollCallback(window: GLFWwindow, callback: GLFWScrollCallback): () => void {
    const cb = new JSCallback(callback, {
      args: [FFIType.ptr, FFIType.f64, FFIType.f64],
      returns: FFIType.void,
    });
    lib.symbols.glfwSetScrollCallback(window, cb.ptr);
    return () => {
      lib.symbols.glfwSetScrollCallback(window, null);
      cb.close();
    };
  },

  setWindowSizeCallback(window: GLFWwindow, callback: GLFWWindowSizeCallback): () => void {
    const cb = new JSCallback(callback, {
      args: [FFIType.ptr, FFIType.i32, FFIType.i32],
      returns: FFIType.void,
    });
    lib.symbols.glfwSetWindowSizeCallback(window, cb.ptr);
    return () => {
      lib.symbols.glfwSetWindowSizeCallback(window, null);
      cb.close();
    };
  },

  setFramebufferSizeCallback(window: GLFWwindow, callback: GLFWWindowSizeCallback): () => void {
    const cb = new JSCallback(callback, {
      args: [FFIType.ptr, FFIType.i32, FFIType.i32],
      returns: FFIType.void,
    });
    lib.symbols.glfwSetFramebufferSizeCallback(window, cb.ptr);
    return () => {
      lib.symbols.glfwSetFramebufferSizeCallback(window, null);
      cb.close();
    };
  },

  setWindowCloseCallback(window: GLFWwindow, callback: GLFWWindowCloseCallback): () => void {
    const cb = new JSCallback(callback, {
      args: [FFIType.ptr],
      returns: FFIType.void,
    });
    lib.symbols.glfwSetWindowCloseCallback(window, cb.ptr);
    return () => {
      lib.symbols.glfwSetWindowCloseCallback(window, null);
      cb.close();
    };
  },

  setWindowFocusCallback(window: GLFWwindow, callback: GLFWWindowFocusCallback): () => void {
    const cb = new JSCallback(callback, {
      args: [FFIType.ptr, FFIType.i32],
      returns: FFIType.void,
    });
    lib.symbols.glfwSetWindowFocusCallback(window, cb.ptr);
    return () => {
      lib.symbols.glfwSetWindowFocusCallback(window, null);
      cb.close();
    };
  },

  setCursorEnterCallback(window: GLFWwindow, callback: GLFWCursorEnterCallback): () => void {
    const cb = new JSCallback(callback, {
      args: [FFIType.ptr, FFIType.i32],
      returns: FFIType.void,
    });
    lib.symbols.glfwSetCursorEnterCallback(window, cb.ptr);
    return () => {
      lib.symbols.glfwSetCursorEnterCallback(window, null);
      cb.close();
    };
  },

  setWindowRefreshCallback(window: GLFWwindow, callback: GLFWWindowRefreshCallback): () => void {
    const cb = new JSCallback(callback, {
      args: [FFIType.ptr],
      returns: FFIType.void,
    });
    lib.symbols.glfwSetWindowRefreshCallback(window, cb.ptr);
    return () => {
      lib.symbols.glfwSetWindowRefreshCallback(window, null);
      cb.close();
    };
  },
};
