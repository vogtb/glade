/**
 * Metal layer utilities for macOS. Creates CAMetalLayer for connecting GLFW
 * windows to WebGPU/Dawn.
 */

import { dlopen, FFIType, ptr, type Pointer } from "bun:ffi";
import {
  getClass,
  getSelector,
  objcSendNoArgs,
  objcSendOnePtr,
  objcSendOneBool,
  objcSendReturnDouble,
  objcSendOneDouble,
} from "./objc";

// CoreFoundation for CFString creation
const coreFoundation = dlopen(
  "/System/Library/Frameworks/CoreFoundation.framework/CoreFoundation",
  {
    CFStringCreateWithCString: {
      args: [FFIType.ptr, FFIType.ptr, FFIType.u32],
      returns: FFIType.ptr,
    },
    CFRelease: { args: [FFIType.ptr], returns: FFIType.void },
  }
);

// CoreGraphics framework for colorspace functions
const coreGraphics = dlopen("/System/Library/Frameworks/CoreGraphics.framework/CoreGraphics", {
  CGColorSpaceCreateWithName: { args: [FFIType.ptr], returns: FFIType.ptr },
  CGColorSpaceRelease: { args: [FFIType.ptr], returns: FFIType.void },
});

// Create sRGB colorspace name CFString for use when setting up Metal layers
// kCFStringEncodingUTF8 = 0x08000100
const kCFStringEncodingUTF8 = 0x08000100;
const srgbNameBuffer = Buffer.from("kCGColorSpaceSRGB\0");
const srgbNameCFString = coreFoundation.symbols.CFStringCreateWithCString(
  null,
  ptr(srgbNameBuffer),
  kCFStringEncodingUTF8
);

// Selector cache
const selectors = {
  // Both class method on CAMetalLayer and instance method on NSView
  layer: getSelector("layer"),
  setLayer: getSelector("setLayer:"),
  setWantsLayer: getSelector("setWantsLayer:"),
  contentView: getSelector("contentView"),
  setContentsScale: getSelector("setContentsScale:"),
  backingScaleFactor: getSelector("backingScaleFactor"),
  window: getSelector("window"),
  setColorspace: getSelector("setColorspace:"),
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
  // Following Dawn's pattern from utils_metal.mm:
  // 1. [view setWantsLayer:YES]
  // 2. [view setLayer:[CAMetalLayer layer]]  -- use class method 'layer', not alloc/init
  // 3. [[view layer] setContentsScale:[nsWindow backingScaleFactor]]
  // 4. Return [view layer]

  // Create a CAMetalLayer using the class method: [CAMetalLayer layer]
  // This is equivalent to [[[CAMetalLayer alloc] init] autorelease]
  const metalLayer = objcSendNoArgs.symbols.objc_msgSend(classes.CAMetalLayer, selectors.layer);
  if (!metalLayer) {
    throw new Error("Failed to create CAMetalLayer");
  }

  // Enable layer-backing on the view: [nsView setWantsLayer:YES]
  objcSendOneBool.symbols.objc_msgSend(nsView, selectors.setWantsLayer, 1);

  // Set the layer: [nsView setLayer:metalLayer]
  objcSendOnePtr.symbols.objc_msgSend(nsView, selectors.setLayer, metalLayer);

  // Get window's backing scale factor for Retina displays
  const nsWindow = objcSendNoArgs.symbols.objc_msgSend(nsView, selectors.window);
  if (nsWindow) {
    const scaleFactor = objcSendReturnDouble.symbols.objc_msgSend(
      nsWindow,
      selectors.backingScaleFactor
    );
    if (scaleFactor > 0) {
      // Get the layer back from the view and set its contents scale
      const viewLayer = objcSendNoArgs.symbols.objc_msgSend(nsView, selectors.layer);
      if (viewLayer) {
        objcSendOneDouble.symbols.objc_msgSend(viewLayer, selectors.setContentsScale, scaleFactor);
      }
    }
  }

  // Return the layer from the view (as Dawn does)
  const resultLayer = objcSendNoArgs.symbols.objc_msgSend(nsView, selectors.layer);
  if (!resultLayer) {
    throw new Error("Failed to get layer from view");
  }

  // Set colorspace to sRGB for proper color management
  // This ensures colors are displayed correctly and match browser WebGPU behavior
  // Without this, macOS doesn't perform color management and colors may appear incorrect
  if (srgbNameCFString) {
    const srgbColorspace = coreGraphics.symbols.CGColorSpaceCreateWithName(srgbNameCFString);
    console.log(
      `Metal layer colorspace: cfString=${srgbNameCFString}, colorspace=${srgbColorspace}`
    );
    if (srgbColorspace) {
      objcSendOnePtr.symbols.objc_msgSend(resultLayer, selectors.setColorspace, srgbColorspace);
      coreGraphics.symbols.CGColorSpaceRelease(srgbColorspace);
    }
  } else {
    console.log("Warning: srgbNameCFString is null, colorspace not set");
  }

  return resultLayer;
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
