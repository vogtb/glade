import type { ContextOptions, RenderCallback, WebGPUContext } from "@glade/core";
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
  ModifierKey,
  MouseButton,
  type MouseButtonCallback,
  type RefreshCallback,
  type ResizeCallback,
  type ScrollCallback,
  type TextInputCallback,
} from "@glade/core/events";
import { log } from "@glade/logging";
import { hashCode } from "@glade/utils";

import { createClipboard } from "./clipboard.ts";

export interface BrowserContextOptions extends ContextOptions {
  canvas?: HTMLCanvasElement;
  attributes?: WebGLContextAttributes;
}

export interface BrowserWebGPUContextOptions extends ContextOptions {
  canvas?: HTMLCanvasElement;
  powerPreference?: GPUPowerPreference;
}

// WebGPU context interface
export interface BrowserWebGPUContext extends WebGPUContext {
  canvas: HTMLCanvasElement;
  // Logical window size (CSS pixels, e.g., 800x600)
  windowWidth: number;
  windowHeight: number;
}

/**
 * Creates a WebGPU context for browser rendering. This is async because
 * WebGPU adapter/device creation is asynchronous.
 */
export async function createWebGPUContext(
  options: BrowserWebGPUContextOptions = {}
): Promise<BrowserWebGPUContext> {
  const canvas = options.canvas ?? document.createElement("canvas");

  // If no custom canvas provided, make it fill the window
  const isFullscreen = !options.canvas;
  // In fullscreen mode, always use actual window size (ignore
  // passed width/height)
  const logicalWidth = isFullscreen ? window.innerWidth : (options.width ?? 800);
  const logicalHeight = isFullscreen ? window.innerHeight : (options.height ?? 600);

  // Account for device pixel ratio for crisp rendering on high-DPI displays
  const dpr = window.devicePixelRatio || 1;
  const physicalWidth = Math.floor(logicalWidth * dpr);
  const physicalHeight = Math.floor(logicalHeight * dpr);

  // Ensure canvas can receive focus for keyboard capture
  canvas.tabIndex = 0;

  // Set canvas buffer size to physical pixels
  canvas.width = physicalWidth;
  canvas.height = physicalHeight;

  if (isFullscreen) {
    // Make canvas fill the entire window
    canvas.style.position = "fixed";
    canvas.style.top = "0";
    canvas.style.left = "0";
    canvas.style.width = "100vw";
    canvas.style.height = "100vh";
    canvas.style.margin = "0";
    canvas.style.padding = "0";

    // Ensure body has no margins
    document.body.style.margin = "0";
    document.body.style.padding = "0";
    document.body.style.overflow = "hidden";
  }
  // When a canvas is passed in, don't override its CSS dimensions.
  // The caller is responsible for styling it (e.g., with CSS classes
  // that set width: 100%; height: 100%;).

  log.info(
    `canvas setup: buffer=${canvas.width}x${canvas.height}, logical=${logicalWidth}x${logicalHeight}, dpr=${dpr}, fullscreen=${isFullscreen}`
  );

  if (!options.canvas) {
    document.body.appendChild(canvas);
  }

  // Hidden input element to capture text/IME events.
  // Canvas elements cannot receive beforeinput or composition events directly
  // because they are not editable. This hidden input acts as a proxy.
  const hiddenInput = document.createElement("input");
  hiddenInput.type = "text";
  hiddenInput.autocomplete = "off";
  hiddenInput.setAttribute("autocapitalize", "off");
  hiddenInput.setAttribute("autocorrect", "off");
  hiddenInput.setAttribute("spellcheck", "false");
  hiddenInput.style.cssText = `
    position: absolute;
    left: -9999px;
    top: 0;
    width: 1px;
    height: 1px;
    opacity: 0;
    pointer-events: none;
    font-size: 16px;
  `;
  document.body.appendChild(hiddenInput);

  // Check for WebGPU support
  if (!navigator.gpu) {
    throw new Error("WebGPU is not supported in this browser");
  }

  const clipboard = createClipboard();

  const gpu = navigator.gpu;

  // Request adapter
  const adapter = await gpu.requestAdapter({
    powerPreference: options.powerPreference,
  });
  if (!adapter) {
    throw new Error("Failed to get WebGPU adapter");
  }

  // Request device
  const device = await adapter.requestDevice();
  const queue = device.queue;

  // Get canvas context
  const context = canvas.getContext("webgpu");
  if (!context) {
    throw new Error("Failed to get WebGPU canvas context");
  }

  // Configure the context
  const format = gpu.getPreferredCanvasFormat();
  context.configure({
    device,
    format,
    alphaMode: "opaque",
  });

  // Helper to convert DOM modifier keys to our bitmask
  function getModifiers(e: KeyboardEvent | MouseEvent): number {
    let mods = 0;
    if (e.shiftKey) {
      mods |= ModifierKey.Shift;
    }
    if (e.ctrlKey) {
      mods |= ModifierKey.Control;
    }
    if (e.altKey) {
      mods |= ModifierKey.Alt;
    }
    if (e.metaKey) {
      mods |= ModifierKey.Super;
    }
    return mods;
  }

  // Map browser key names to GLFW key codes for compatibility
  const keyCodeMap: Record<string, number> = {
    ArrowRight: 262,
    ArrowLeft: 263,
    ArrowDown: 264,
    ArrowUp: 265,
    Escape: 256,
    Enter: 257,
    Tab: 258,
    Backspace: 259,
    Insert: 260,
    Delete: 261,
    Home: 268,
    End: 269,
    PageUp: 266,
    PageDown: 267,
    Space: 32,
  };

  function getKeyCode(e: KeyboardEvent): number {
    // Check for mapped special keys first
    const mapped = keyCodeMap[e.key];
    if (mapped !== undefined) {
      return mapped;
    }
    // Single character keys use their char code
    if (e.key.length === 1) {
      return e.key.toUpperCase().charCodeAt(0);
    }
    // Fall back to 0 for unknown keys
    return 0;
  }

  // Mutable dimensions for resize handling
  let currentPhysicalWidth = physicalWidth;
  let currentPhysicalHeight = physicalHeight;
  let currentLogicalWidth = logicalWidth;
  let currentLogicalHeight = logicalHeight;
  let hasKeyboardCapture = false;

  // Focus the hidden input to capture text events.
  // We need to prevent default on mousedown to stop the canvas from stealing
  // focus back (canvas has tabIndex=0 which makes it focusable).
  const focusHiddenInput = (e: MouseEvent) => {
    // Prevent the canvas from receiving focus
    e.preventDefault();
    if (document.activeElement !== hiddenInput) {
      hiddenInput.focus();
      hasKeyboardCapture = true;
    }
  };

  canvas.addEventListener("mousedown", focusHiddenInput);

  const hiddenInputBlurHandler = () => {
    hasKeyboardCapture = false;
  };
  hiddenInput.addEventListener("blur", hiddenInputBlurHandler);

  const windowBlurHandler = () => {
    hasKeyboardCapture = false;
  };
  window.addEventListener("blur", windowBlurHandler);

  // Registered resize callbacks
  const resizeCallbacks: Set<ResizeCallback> = new Set();

  // Unified resize handler that updates framebuffer and notifies callbacks
  function handleResizeEvent(newLogicalWidth: number, newLogicalHeight: number) {
    const newDpr = window.devicePixelRatio || 1;
    const newPhysicalWidth = Math.floor(newLogicalWidth * newDpr);
    const newPhysicalHeight = Math.floor(newLogicalHeight * newDpr);

    // Skip zero-size to avoid WebGPU errors
    if (newPhysicalWidth === 0 || newPhysicalHeight === 0) {
      return;
    }

    if (newPhysicalWidth !== currentPhysicalWidth || newPhysicalHeight !== currentPhysicalHeight) {
      currentPhysicalWidth = newPhysicalWidth;
      currentPhysicalHeight = newPhysicalHeight;
      currentLogicalWidth = newLogicalWidth;
      currentLogicalHeight = newLogicalHeight;

      // Update canvas buffer size
      canvas.width = newPhysicalWidth;
      canvas.height = newPhysicalHeight;

      log.info(
        `canvas resized: buffer=${newPhysicalWidth}x${newPhysicalHeight}, logical=${newLogicalWidth}x${newLogicalHeight}`
      );

      // Notify all registered callbacks
      for (const callback of resizeCallbacks) {
        callback({ width: newLogicalWidth, height: newLogicalHeight });
      }
    }
  }

  // ResizeObserver to detect canvas size changes (works for both fullscreen and embedded)
  const resizeObserver = new ResizeObserver((entries) => {
    for (const entry of entries) {
      handleResizeEvent(entry.contentRect.width, entry.contentRect.height);
    }
  });
  resizeObserver.observe(canvas);

  return {
    gpu,
    adapter,
    device,
    queue,
    context,
    format,
    clipboard,
    canvas,
    // width/height are framebuffer size (physical pixels) for GPU operations
    get width() {
      return currentPhysicalWidth;
    },
    set width(v: number) {
      currentPhysicalWidth = v;
    },
    get height() {
      return currentPhysicalHeight;
    },
    set height(v: number) {
      currentPhysicalHeight = v;
    },
    // windowWidth/windowHeight are logical CSS pixels for UI
    get windowWidth() {
      return currentLogicalWidth;
    },
    set windowWidth(v: number) {
      currentLogicalWidth = v;
    },
    get windowHeight() {
      return currentLogicalHeight;
    },
    set windowHeight(v: number) {
      currentLogicalHeight = v;
    },

    destroy() {
      resizeObserver.disconnect();
      canvas.removeEventListener("mousedown", focusHiddenInput);
      hiddenInput.removeEventListener("blur", hiddenInputBlurHandler);
      window.removeEventListener("blur", windowBlurHandler);
      hiddenInput.remove();
      device.destroy();
    },

    onKey(callback: KeyCallback): () => void {
      // Keys that should have their default behavior prevented.
      // Single character keys should NOT be prevented - they need to generate
      // input events for the hidden text input.
      const shouldPreventDefault = (e: KeyboardEvent): boolean => {
        // Allow character input to flow through to generate beforeinput events
        if (e.key.length === 1 && !e.metaKey && !e.ctrlKey) {
          return false;
        }
        // Prevent default for special keys, shortcuts, etc.
        return true;
      };

      const handleKeyDown = (e: KeyboardEvent) => {
        if (hasKeyboardCapture && shouldPreventDefault(e)) {
          e.preventDefault();
          e.stopPropagation();
        }
        callback({
          key: getKeyCode(e),
          scancode: hashCode(e.code),
          action: e.repeat ? KeyAction.Repeat : KeyAction.Press,
          mods: getModifiers(e),
        });
      };
      const handleKeyUp = (e: KeyboardEvent) => {
        if (hasKeyboardCapture && shouldPreventDefault(e)) {
          e.preventDefault();
          e.stopPropagation();
        }
        callback({
          key: getKeyCode(e),
          scancode: hashCode(e.code),
          action: KeyAction.Release,
          mods: getModifiers(e),
        });
      };
      window.addEventListener("keydown", handleKeyDown);
      window.addEventListener("keyup", handleKeyUp);
      return () => {
        window.removeEventListener("keydown", handleKeyDown);
        window.removeEventListener("keyup", handleKeyUp);
      };
    },

    onChar(callback: CharCallback): () => void {
      const handleInput = (e: KeyboardEvent) => {
        if (e.key.length === 1) {
          callback({
            codepoint: e.key.codePointAt(0) ?? 0,
            char: e.key,
          });
        }
      };
      window.addEventListener("keydown", handleInput);
      return () => window.removeEventListener("keydown", handleInput);
    },

    onMouseButton(callback: MouseButtonCallback): () => void {
      const mapDomButton = (button: number): MouseButton => {
        if (button === 2) {
          return MouseButton.Right;
        }
        if (button === 1) {
          return MouseButton.Middle;
        }
        return MouseButton.Left;
      };

      const handleMouseDown = (e: MouseEvent) => {
        callback({
          button: mapDomButton(e.button),
          action: KeyAction.Press,
          mods: getModifiers(e),
        });
      };
      const handleMouseUp = (e: MouseEvent) => {
        callback({
          button: mapDomButton(e.button),
          action: KeyAction.Release,
          mods: getModifiers(e),
        });
      };
      canvas.addEventListener("mousedown", handleMouseDown);
      canvas.addEventListener("mouseup", handleMouseUp);
      return () => {
        canvas.removeEventListener("mousedown", handleMouseDown);
        canvas.removeEventListener("mouseup", handleMouseUp);
      };
    },

    onCursorMove(callback: CursorMoveCallback): () => void {
      const handleMouseMove = (e: MouseEvent) => {
        const rect = canvas.getBoundingClientRect();
        callback({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        });
      };
      canvas.addEventListener("mousemove", handleMouseMove);
      return () => canvas.removeEventListener("mousemove", handleMouseMove);
    },

    onScroll(callback: ScrollCallback): () => void {
      const handleWheel = (e: WheelEvent) => {
        e.preventDefault();
        // Browser deltaY > 0 means scroll down, which matches our convention
        // (positive delta = increase scroll offset = see content below)
        // Chrome applies ~40x multiplier to discrete wheel events (kScrollbarPixelsPerCocoaTick)
        // and trackpad events include macOS acceleration. Scale down significantly.
        const scale = 0.3;
        callback({
          deltaX: e.deltaX * scale,
          deltaY: e.deltaY * scale,
        });
      };
      canvas.addEventListener("wheel", handleWheel, { passive: false });
      return () => canvas.removeEventListener("wheel", handleWheel);
    },

    onResize(callback: ResizeCallback): () => void {
      resizeCallbacks.add(callback);
      return () => {
        resizeCallbacks.delete(callback);
      };
    },

    onClose(callback: CloseCallback): () => void {
      const handleBeforeUnload = () => callback();
      window.addEventListener("beforeunload", handleBeforeUnload);
      return () => window.removeEventListener("beforeunload", handleBeforeUnload);
    },

    onFocus(callback: FocusCallback): () => void {
      const handleFocus = () => callback({ focused: true });
      const handleBlur = () => callback({ focused: false });
      canvas.addEventListener("focus", handleFocus);
      canvas.addEventListener("blur", handleBlur);
      return () => {
        canvas.removeEventListener("focus", handleFocus);
        canvas.removeEventListener("blur", handleBlur);
      };
    },

    onCursorEnter(callback: CursorEnterCallback): () => void {
      const handleEnter = () => callback({ entered: true });
      const handleLeave = () => callback({ entered: false });
      canvas.addEventListener("mouseenter", handleEnter);
      canvas.addEventListener("mouseleave", handleLeave);
      return () => {
        canvas.removeEventListener("mouseenter", handleEnter);
        canvas.removeEventListener("mouseleave", handleLeave);
      };
    },

    onRefresh(_callback: RefreshCallback): () => void {
      // Browser handles refresh automatically, no-op
      return () => {};
    },

    onCompositionStart(callback: CompositionCallback): () => void {
      const handle = (event: globalThis.CompositionEvent) => {
        const text = event.data ?? "";
        const selection = text.length;
        callback({ text, selectionStart: selection, selectionEnd: selection });
      };
      hiddenInput.addEventListener("compositionstart", handle);
      return () => {
        hiddenInput.removeEventListener("compositionstart", handle);
      };
    },

    onCompositionUpdate(callback: CompositionCallback): () => void {
      const handle = (event: globalThis.CompositionEvent) => {
        const text = event.data ?? "";
        const selection = text.length;
        callback({ text, selectionStart: selection, selectionEnd: selection });
      };
      hiddenInput.addEventListener("compositionupdate", handle);
      return () => {
        hiddenInput.removeEventListener("compositionupdate", handle);
      };
    },

    onCompositionEnd(callback: CompositionCallback): () => void {
      const handle = (event: globalThis.CompositionEvent) => {
        const text = event.data ?? "";
        const selection = text.length;
        callback({ text, selectionStart: selection, selectionEnd: selection });
        // Clear the hidden input after composition ends
        hiddenInput.value = "";
      };
      hiddenInput.addEventListener("compositionend", handle);
      return () => {
        hiddenInput.removeEventListener("compositionend", handle);
      };
    },

    onTextInput(callback: TextInputCallback): () => void {
      const handle = (event: InputEvent) => {
        const isInsertText =
          event.inputType === "insertText" || event.inputType === "insertCompositionText";
        if (!isInsertText) {
          return;
        }
        const text = event.data ?? "";
        if (text.length === 0) {
          return;
        }
        callback({ text, isComposing: event.isComposing });
        event.preventDefault();
        // Clear the hidden input to prevent text accumulation
        hiddenInput.value = "";
      };
      hiddenInput.addEventListener("beforeinput", handle);
      return () => {
        hiddenInput.removeEventListener("beforeinput", handle);
      };
    },

    setCursor(style: CursorStyle): void {
      canvas.style.cursor = style;
    },

    setTitle(title: string): void {
      document.title = title;
    },
  };
}

/**
 * Render loop for browser WebGPU context.
 * Time values are normalized to seconds to match macos behavior.
 */
export function runWebGPURenderLoop(ctx: BrowserWebGPUContext, callback: RenderCallback): void {
  let lastTime = 0;

  function frame(timeMs: number) {
    // Convert milliseconds to seconds to match macos
    const time = timeMs / 1000;
    const deltaTime = lastTime ? time - lastTime : 0;
    lastTime = time;

    const shouldContinue = callback(time, deltaTime);
    if (shouldContinue !== false) {
      requestAnimationFrame(frame);
    }
  }

  requestAnimationFrame(frame);
}
