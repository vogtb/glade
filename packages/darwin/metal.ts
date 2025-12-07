/**
 * Metal layer utilities for macOS. Creates CAMetalLayer for connecting GLFW
 * windows to WebGPU/Dawn.
 */

import type { Pointer } from "bun:ffi";
import {
  getClass,
  getSelector,
  objcSendNoArgs,
  objcSendOnePtr,
  objcSendOneBool,
  objcSendReturnDouble,
  objcSendOneDouble,
} from "./objc.ts";

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
