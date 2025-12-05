import { dlopen, FFIType, ptr, type Pointer } from "bun:ffi";

// TODO: Probably a better way to get libglfw so we don't depend on brew. Bun's
// FFI (and most FFIs) only work with dynamic linking, so if we want to build
// our app into a stand-alone executable, we'd need to depend on dylib to be
// on the machine, or do something like use Bun.file to embed the dylib, then
// write it out to disk on start up, so we can link against it at runtime. Weird
// but theoretically possible. The embedding would work like this:
// `await Bun.file(new URL("./libglfw.dylib", import.meta.url));`
const GLFW_PATH = "/opt/homebrew/lib/libglfw.dylib";

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
});

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
};
