/**
 * Objective-C runtime bindings for creating CAMetalLayer on macOS.
 * This is needed to connect GLFW windows to WebGPU/Dawn.
 */

import { dlopen, FFIType, ptr, type Pointer } from "bun:ffi";

// Load Objective-C runtime
const objc = dlopen("/usr/lib/libobjc.A.dylib", {
  objc_getClass: { args: [FFIType.cstring], returns: FFIType.ptr },
  objc_msgSend: { args: [], returns: FFIType.ptr }, // Variadic, we'll use different signatures
  sel_registerName: { args: [FFIType.cstring], returns: FFIType.ptr },
  class_getInstanceMethod: { args: [FFIType.ptr, FFIType.ptr], returns: FFIType.ptr },
  object_getClass: { args: [FFIType.ptr], returns: FFIType.ptr },
});

// We need to call objc_msgSend with different signatures for different calls
// Create specialized bindings for the specific calls we need
const objcSendNoArgs = dlopen("/usr/lib/libobjc.A.dylib", {
  objc_msgSend: { args: [FFIType.ptr, FFIType.ptr], returns: FFIType.ptr },
});

const objcSendOnePtr = dlopen("/usr/lib/libobjc.A.dylib", {
  objc_msgSend: { args: [FFIType.ptr, FFIType.ptr, FFIType.ptr], returns: FFIType.ptr },
});

const objcSendOneBool = dlopen("/usr/lib/libobjc.A.dylib", {
  objc_msgSend: { args: [FFIType.ptr, FFIType.ptr, FFIType.i32], returns: FFIType.ptr },
});

// Helper to get a class
function getClass(name: string): Pointer {
  const nameBuffer = Buffer.from(name + "\0");
  const cls = objc.symbols.objc_getClass(ptr(nameBuffer));
  if (!cls) {
    throw new Error(`Failed to get Objective-C class: ${name}`);
  }
  return cls;
}

// Helper to get a selector
function getSelector(name: string): Pointer {
  const nameBuffer = Buffer.from(name + "\0");
  const sel = objc.symbols.sel_registerName(ptr(nameBuffer));
  if (!sel) {
    throw new Error(`Failed to get selector: ${name}`);
  }
  return sel;
}

// Selector cache
const selectors = {
  alloc: getSelector("alloc"),
  init: getSelector("init"),
  layer: getSelector("layer"),
  setLayer: getSelector("setLayer:"),
  setWantsLayer: getSelector("setWantsLayer:"),
  contentView: getSelector("contentView"),
};

// Class cache
const classes = {
  CAMetalLayer: getClass("CAMetalLayer"),
};

/**
 * Creates a CAMetalLayer and attaches it to an NSView.
 * Returns the CAMetalLayer pointer for use with WebGPU.
 *
 * @param nsView - The NSView pointer (from glfwGetCocoaView)
 * @returns The CAMetalLayer pointer
 */
export function createMetalLayerForView(nsView: Pointer): Pointer {
  // Create a CAMetalLayer: [[CAMetalLayer alloc] init]
  const alloced = objcSendNoArgs.symbols.objc_msgSend(classes.CAMetalLayer, selectors.alloc);
  if (!alloced) {
    throw new Error("Failed to alloc CAMetalLayer");
  }

  const metalLayer = objcSendNoArgs.symbols.objc_msgSend(alloced, selectors.init);
  if (!metalLayer) {
    throw new Error("Failed to init CAMetalLayer");
  }

  // Enable layer-backing on the view: [nsView setWantsLayer:YES]
  objcSendOneBool.symbols.objc_msgSend(nsView, selectors.setWantsLayer, 1);

  // Set the layer: [nsView setLayer:metalLayer]
  objcSendOnePtr.symbols.objc_msgSend(nsView, selectors.setLayer, metalLayer);

  return metalLayer;
}

/**
 * Gets or creates a Metal layer for an NSWindow's content view.
 *
 * @param nsWindow - The NSWindow pointer (from glfwGetCocoaWindow)
 * @returns The CAMetalLayer pointer
 */
export function createMetalLayerForWindow(nsWindow: Pointer): Pointer {
  // Get content view: [nsWindow contentView]
  const contentView = objcSendNoArgs.symbols.objc_msgSend(nsWindow, selectors.contentView);
  if (!contentView) {
    throw new Error("Failed to get content view from NSWindow");
  }

  return createMetalLayerForView(contentView);
}

/**
 * Gets the existing layer from an NSView (if any).
 *
 * @param nsView - The NSView pointer
 * @returns The layer pointer or null
 */
export function getLayerFromView(nsView: Pointer): Pointer | null {
  return objcSendNoArgs.symbols.objc_msgSend(nsView, selectors.layer);
}
