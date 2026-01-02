/**
 * Objective-C runtime bindings for macOS.
 * Provides low-level access to the Objective-C runtime for FFI calls.
 */

import { dlopen, FFIType, ptr, type Pointer } from "bun:ffi";

const LIBOBJC_DYLIB_PATH = "/usr/lib/libobjc.A.dylib";

// Load Objective-C runtime
const objc = dlopen(LIBOBJC_DYLIB_PATH, {
  objc_getClass: { args: [FFIType.cstring], returns: FFIType.ptr },
  objc_msgSend: { args: [], returns: FFIType.ptr }, // Variadic, we'll use different signatures
  sel_registerName: { args: [FFIType.cstring], returns: FFIType.ptr },
  class_getInstanceMethod: { args: [FFIType.ptr, FFIType.ptr], returns: FFIType.ptr },
  object_getClass: { args: [FFIType.ptr], returns: FFIType.ptr },
});

// We need to call objc_msgSend with different signatures for different calls
// Create specialized bindings for the specific calls we need
export const objcSendNoArgs = dlopen(LIBOBJC_DYLIB_PATH, {
  objc_msgSend: { args: [FFIType.ptr, FFIType.ptr], returns: FFIType.ptr },
});

export const objcSendOnePtr = dlopen(LIBOBJC_DYLIB_PATH, {
  objc_msgSend: { args: [FFIType.ptr, FFIType.ptr, FFIType.ptr], returns: FFIType.ptr },
});

export const objcSendOneBool = dlopen(LIBOBJC_DYLIB_PATH, {
  objc_msgSend: { args: [FFIType.ptr, FFIType.ptr, FFIType.i32], returns: FFIType.ptr },
});

// objc_msgSend for returning double
export const objcSendReturnDouble = dlopen(LIBOBJC_DYLIB_PATH, {
  objc_msgSend: { args: [FFIType.ptr, FFIType.ptr], returns: FFIType.f64 },
});

export const objcSendOneDouble = dlopen(LIBOBJC_DYLIB_PATH, {
  objc_msgSend: { args: [FFIType.ptr, FFIType.ptr, FFIType.f64], returns: FFIType.ptr },
});

/**
 * Get an Objective-C class by name.
 */
export function getClass(name: string): Pointer {
  const nameBuffer = Buffer.from(name + "\0");
  const cls = objc.symbols.objc_getClass(ptr(nameBuffer));
  if (!cls) {
    throw new Error(`Failed to get Objective-C class: ${name}`);
  }
  return cls;
}

/**
 * Get an Objective-C selector by name.
 */
export function getSelector(name: string): Pointer {
  const nameBuffer = Buffer.from(name + "\0");
  const sel = objc.symbols.sel_registerName(ptr(nameBuffer));
  if (!sel) {
    throw new Error(`Failed to get selector: ${name}`);
  }
  return sel;
}
