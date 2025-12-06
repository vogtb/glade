/**
 * Debug test to check buffer handle types
 */

import { createWebGPUContext } from "@glade/platform";

async function main() {
  console.log("=== Debug Buffer Type Test ===\n");

  const ctx = await createWebGPUContext({
    width: 800,
    height: 600,
    title: "Debug Buffer Type",
  });

  const { device } = ctx;

  const vertices = new Float32Array([0.0, 0.5, -0.5, -0.5, 0.5, -0.5]);

  const vertexBuffer = device.createBuffer({
    size: vertices.byteLength,
    usage: 0x0020 | 0x0008,
  });

  console.log("vertexBuffer:", vertexBuffer);
  console.log("vertexBuffer._handle:", (vertexBuffer as any)._handle);
  console.log("typeof _handle:", typeof (vertexBuffer as any)._handle);
  console.log("_handle constructor:", (vertexBuffer as any)._handle?.constructor?.name);

  // Check if it's a number (pointer value) or something else
  const handle = (vertexBuffer as any)._handle;
  if (typeof handle === 'number') {
    console.log("Handle is a number (pointer):", handle);
    console.log("Handle as hex:", "0x" + handle.toString(16));
  } else if (typeof handle === 'bigint') {
    console.log("Handle is a bigint:", handle);
  } else if (handle && typeof handle === 'object') {
    console.log("Handle is an object with keys:", Object.keys(handle));
  }

  device.queue.writeBuffer(vertexBuffer, 0, vertices);
  console.log("\nBuffer write completed");

  process.exit(0);
}

main().catch(console.error);
