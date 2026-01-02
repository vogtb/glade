/**
 * Native macOS image decoding using ImageIO framework.
 *
 * Replaces pure TypeScript PNG/JPEG decoders with native macOS ImageIO
 * calls via Bun FFI. This provides faster, more robust decoding and
 * supports additional formats (HEIC, TIFF, GIF, WebP, etc.) automatically.
 */

import { dlopen, FFIType, ptr, toArrayBuffer } from "bun:ffi";

/**
 * Decoded image data ready for GPU upload.
 */
export interface DecodedImage {
  width: number;
  height: number;
  /** RGBA pixel data (4 bytes per pixel) */
  data: Uint8Array;
}

// ImageIO framework bindings
const imageIO = dlopen("/System/Library/Frameworks/ImageIO.framework/ImageIO", {
  CGImageSourceCreateWithData: {
    args: [FFIType.ptr, FFIType.ptr],
    returns: FFIType.ptr,
  },
  CGImageSourceCreateImageAtIndex: {
    args: [FFIType.ptr, FFIType.u64, FFIType.ptr],
    returns: FFIType.ptr,
  },
});

// CoreGraphics framework bindings
const coreGraphics = dlopen("/System/Library/Frameworks/CoreGraphics.framework/CoreGraphics", {
  CGImageGetWidth: { args: [FFIType.ptr], returns: FFIType.u64 },
  CGImageGetHeight: { args: [FFIType.ptr], returns: FFIType.u64 },
  CGColorSpaceCreateDeviceRGB: { args: [], returns: FFIType.ptr },
  CGColorSpaceRelease: { args: [FFIType.ptr], returns: FFIType.void },
  CGBitmapContextCreate: {
    args: [
      FFIType.ptr, // data buffer (nullable for auto-allocation)
      FFIType.u64, // width
      FFIType.u64, // height
      FFIType.u64, // bitsPerComponent
      FFIType.u64, // bytesPerRow
      FFIType.ptr, // colorspace
      FFIType.u32, // bitmapInfo
    ],
    returns: FFIType.ptr,
  },
  // CGContextDrawImage takes CGRect by value. On ARM64, CGRect (4 doubles = 32 bytes)
  // is passed in registers d0-d3. We pass the 4 components as separate f64 args.
  CGContextDrawImage: {
    args: [
      FFIType.ptr, // context
      FFIType.f64, // rect.origin.x
      FFIType.f64, // rect.origin.y
      FFIType.f64, // rect.size.width
      FFIType.f64, // rect.size.height
      FFIType.ptr, // image
    ],
    returns: FFIType.void,
  },
  CGBitmapContextGetData: { args: [FFIType.ptr], returns: FFIType.ptr },
  CGContextRelease: { args: [FFIType.ptr], returns: FFIType.void },
  CGImageRelease: { args: [FFIType.ptr], returns: FFIType.void },
});

// CoreFoundation framework bindings
const coreFoundation = dlopen(
  "/System/Library/Frameworks/CoreFoundation.framework/CoreFoundation",
  {
    CFDataCreate: {
      args: [FFIType.ptr, FFIType.ptr, FFIType.i64],
      returns: FFIType.ptr,
    },
    CFRelease: { args: [FFIType.ptr], returns: FFIType.void },
  }
);

// CGBitmapInfo constants
// kCGImageAlphaPremultipliedFirst with 32Little gives BGRA in memory
// we'll R and B after reading to get RGBA
const kCGImageAlphaPremultipliedFirst = 2;
const kCGBitmapByteOrder32Little = 2 << 12; // 0x2000
const BGRA_BITMAP_INFO = kCGImageAlphaPremultipliedFirst | kCGBitmapByteOrder32Little;

/**
 * Decode an image using native macOS ImageIO framework. Supports PNG, JPEG,
 * HEIC, TIFF, GIF, WebP, and other ImageIO formats, returning RGBA pixel data
 * with non-premultiplied alpha.
 */
export function decodeImage(data: Uint8Array): DecodedImage {
  // Create CFData from input bytes
  const cfData = coreFoundation.symbols.CFDataCreate(null, ptr(data), data.length);
  if (!cfData) {
    throw new Error("Failed to create CFData from image bytes");
  }

  try {
    // Create image source from CFData
    const imageSource = imageIO.symbols.CGImageSourceCreateWithData(cfData, null);
    if (!imageSource) {
      throw new Error("Failed to create image source - unsupported format or corrupt data");
    }

    try {
      // Extract CGImage at index 0
      const cgImage = imageIO.symbols.CGImageSourceCreateImageAtIndex(imageSource, 0n, null);
      if (!cgImage) {
        throw new Error("Failed to create CGImage from source");
      }

      try {
        // Get image dimensions
        const width = Number(coreGraphics.symbols.CGImageGetWidth(cgImage));
        const height = Number(coreGraphics.symbols.CGImageGetHeight(cgImage));

        if (width <= 0 || height <= 0) {
          throw new Error(`Invalid image dimensions: ${width}x${height}`);
        }

        // Create RGB colorspace
        const colorspace = coreGraphics.symbols.CGColorSpaceCreateDeviceRGB();
        if (!colorspace) {
          throw new Error("Failed to create RGB colorspace");
        }

        try {
          const bytesPerRow = width * 4;

          // Create bitmap context - let CoreGraphics allocate the buffer
          // We'll copy from it after drawing
          const context = coreGraphics.symbols.CGBitmapContextCreate(
            null, // Let CG allocate buffer
            BigInt(width),
            BigInt(height),
            8n, // bits per component
            BigInt(bytesPerRow),
            colorspace,
            BGRA_BITMAP_INFO
          );
          if (!context) {
            throw new Error("Failed to create bitmap context");
          }

          try {
            // Draw image into context (decodes and converts to RGBA)
            // CGRect is passed as 4 separate f64 values (origin.x, origin.y, size.width, size.height)
            coreGraphics.symbols.CGContextDrawImage(context, 0.0, 0.0, width, height, cgImage);

            // Get pointer to bitmap data
            const bitmapData = coreGraphics.symbols.CGBitmapContextGetData(context);
            if (!bitmapData) {
              throw new Error("Failed to get bitmap data from context");
            }

            // Copy data from CG-owned buffer to our own Uint8Array.
            // IMPORTANT: We must make a true copy because toArrayBuffer creates a view
            // into native memory that becomes invalid after CGContextRelease.
            const bufferSize = bytesPerRow * height;
            const nativeView = new Uint8Array(toArrayBuffer(bitmapData, 0, bufferSize));
            const buffer = new Uint8Array(bufferSize);
            buffer.set(nativeView);

            // CoreGraphics produces BGRA premultiplied, but we need RGBA non-premultiplied.
            // The shader does its own premultiplication.
            bgraToRgba(buffer);

            return { width, height, data: buffer };
          } finally {
            coreGraphics.symbols.CGContextRelease(context);
          }
        } finally {
          coreGraphics.symbols.CGColorSpaceRelease(colorspace);
        }
      } finally {
        coreGraphics.symbols.CGImageRelease(cgImage);
      }
    } finally {
      coreFoundation.symbols.CFRelease(imageSource);
    }
  } finally {
    coreFoundation.symbols.CFRelease(cfData);
  }
}

/**
 * Convert BGRA premultiplied to RGBA non-premultiplied.
 * Swaps B and R channels, and unpremultiplies alpha.
 * Modifies buffer in-place.
 */
function bgraToRgba(buffer: Uint8Array): void {
  const pixels = buffer.length / 4;
  for (let i = 0; i < pixels; i++) {
    const offset = i * 4;
    const b = buffer[offset]!;
    const g = buffer[offset + 1]!;
    const r = buffer[offset + 2]!;
    const a = buffer[offset + 3]!;

    if (a === 0) {
      // Fully transparent - RGB values are undefined, set to 0
      buffer[offset] = 0;
      buffer[offset + 1] = 0;
      buffer[offset + 2] = 0;
    } else if (a < 255) {
      // Partial transparency - unpremultiply and swap
      const invAlpha = 255 / a;
      buffer[offset] = Math.min(255, Math.round(r * invAlpha));
      buffer[offset + 1] = Math.min(255, Math.round(g * invAlpha));
      buffer[offset + 2] = Math.min(255, Math.round(b * invAlpha));
    } else {
      // Fully opaque - just swap R and B
      buffer[offset] = r;
      buffer[offset + 2] = b;
    }
  }
}

/**
 * Decode a PNG image.
 * @deprecated Use decodeImage() which handles all formats automatically.
 */
export function decodePNG(data: Uint8Array): DecodedImage {
  return decodeImage(data);
}

/**
 * Decode a JPEG image.
 * @deprecated Use decodeImage() which handles all formats automatically.
 */
export function decodeJPEG(data: Uint8Array): DecodedImage {
  return decodeImage(data);
}
