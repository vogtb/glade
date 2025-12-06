/**
 * Debug test to verify buffer properties after creation
 */

import { dlopen, FFIType, ptr } from "bun:ffi";
import { createWebGPUContext } from "@glade/platform";

// @ts-expect-error - Bun-specific import
import DAWN_PATH from "../../vendor/libwebgpu_dawn.dylib" with { type: "file" };

const lib = dlopen(DAWN_PATH, {
  wgpuBufferGetSize: {
    args: [FFIType.ptr],
    returns: FFIType.u64,
  },
  wgpuBufferGetUsage: {
    args: [FFIType.ptr],
    returns: FFIType.u64,
  },
});

async function main() {
  console.log("=== Buffer Verification Test ===\n");

  const ctx = await createWebGPUContext({
    width: 800,
    height: 600,
    title: "Buffer Verify",
  });

  const { device } = ctx;

  const vertices = new Float32Array([
    0.0, 0.5,
    -0.5, -0.5,
    0.5, -0.5,
  ]);

  console.log("Creating buffer with size", vertices.byteLength, "and usage VERTEX | COPY_DST (0x28)");

  const vertexBuffer = device.createBuffer({
    size: vertices.byteLength,
    usage: 0x0020 | 0x0008, // VERTEX | COPY_DST
  });

  const bufferHandle = (vertexBuffer as any)._handle;
  console.log("Buffer handle:", bufferHandle);

  // Query Dawn for the buffer properties
  const actualSize = lib.symbols.wgpuBufferGetSize(bufferHandle);
  const actualUsage = lib.symbols.wgpuBufferGetUsage(bufferHandle);

  console.log("\nQuerying Dawn for buffer properties:");
  console.log("  wgpuBufferGetSize:", actualSize);
  console.log("  wgpuBufferGetUsage:", "0x" + actualUsage.toString(16));

  console.log("\nExpected:");
  console.log("  size: 24");
  console.log("  usage: 0x28 (VERTEX | COPY_DST)");

  console.log("\nMatch:");
  console.log("  size matches:", actualSize === BigInt(24));
  console.log("  usage matches:", actualUsage === BigInt(0x28));

  // Write data
  device.queue.writeBuffer(vertexBuffer, 0, vertices);
  console.log("\nBuffer data written");

  // Query again after write
  const sizeAfter = lib.symbols.wgpuBufferGetSize(bufferHandle);
  console.log("Size after write:", sizeAfter);

  process.exit(0);
}

main().catch(console.error);
