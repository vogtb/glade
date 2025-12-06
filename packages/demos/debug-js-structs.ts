/**
 * Debug test that dumps the exact bytes we send to Dawn
 */

import { ptr } from "bun:ffi";

function dumpBuffer(name: string, buffer: Buffer) {
  console.log(`${name} (${buffer.length} bytes):`);
  const hex = buffer.toString('hex');
  for (let i = 0; i < hex.length; i += 32) {
    const offset = i / 2;
    const line = hex.slice(i, i + 32).match(/.{1,2}/g)?.join(' ') || '';
    console.log(`  ${offset.toString().padStart(3, '0')}: ${line}`);
  }
  console.log('');
}

async function main() {
  console.log("=== JS Struct Byte Dumps ===\n");

  // Match the C test exactly
  const WGPUVertexFormat_Float32x2 = 0x1d;
  const WGPUVertexStepMode_Vertex = 1;
  const WGPUTextureFormat_BGRA8Unorm = 0x1b;
  const WGPUPrimitiveTopology_TriangleList = 4;

  // WGPUVertexAttribute (32 bytes)
  const attributeBuffer = Buffer.alloc(32);
  attributeBuffer.writeBigUInt64LE(BigInt(0), 0);        // nextInChain
  attributeBuffer.writeUInt32LE(WGPUVertexFormat_Float32x2, 8);  // format
  // offset 12: 4 bytes padding (already zero)
  attributeBuffer.writeBigUInt64LE(BigInt(0), 16);       // offset
  attributeBuffer.writeUInt32LE(0, 24);                  // shaderLocation
  // offset 28: 4 bytes padding (already zero)

  dumpBuffer("WGPUVertexAttribute", attributeBuffer);

  const attrPtr = ptr(attributeBuffer) as unknown as number;

  // WGPUVertexBufferLayout (40 bytes)
  const layoutBuffer = Buffer.alloc(40);
  layoutBuffer.writeBigUInt64LE(BigInt(0), 0);           // nextInChain
  layoutBuffer.writeUInt32LE(WGPUVertexStepMode_Vertex, 8); // stepMode
  // offset 12: 4 bytes padding (already zero)
  layoutBuffer.writeBigUInt64LE(BigInt(8), 16);          // arrayStride
  layoutBuffer.writeBigUInt64LE(BigInt(1), 24);          // attributeCount
  layoutBuffer.writeBigUInt64LE(BigInt(attrPtr), 32);    // attributes pointer

  dumpBuffer("WGPUVertexBufferLayout", layoutBuffer);
  console.log(`Attribute pointer value: 0x${attrPtr.toString(16)}\n`);

  // WGPUColorTargetState (32 bytes)
  const colorTargetBuffer = Buffer.alloc(32);
  colorTargetBuffer.writeBigUInt64LE(BigInt(0), 0);      // nextInChain
  colorTargetBuffer.writeUInt32LE(WGPUTextureFormat_BGRA8Unorm, 8); // format
  // offset 12: 4 bytes padding
  colorTargetBuffer.writeBigUInt64LE(BigInt(0), 16);     // blend = NULL
  colorTargetBuffer.writeUInt32LE(0xf, 24);              // writeMask = All
  // offset 28: 4 bytes padding

  dumpBuffer("WGPUColorTargetState", colorTargetBuffer);

  // WGPUPrimitiveState (32 bytes)
  const primitiveBuffer = Buffer.alloc(32);
  primitiveBuffer.writeBigUInt64LE(BigInt(0), 0);        // nextInChain
  primitiveBuffer.writeUInt32LE(WGPUPrimitiveTopology_TriangleList, 8); // topology
  primitiveBuffer.writeUInt32LE(0, 12);                  // stripIndexFormat
  primitiveBuffer.writeUInt32LE(0, 16);                  // frontFace
  primitiveBuffer.writeUInt32LE(0, 20);                  // cullMode
  primitiveBuffer.writeUInt32LE(0, 24);                  // unclippedDepth
  // offset 28: 4 bytes padding

  dumpBuffer("WGPUPrimitiveState", primitiveBuffer);

  // WGPUMultisampleState (24 bytes)
  const multisampleBuffer = Buffer.alloc(24);
  multisampleBuffer.writeBigUInt64LE(BigInt(0), 0);      // nextInChain
  multisampleBuffer.writeUInt32LE(1, 8);                 // count
  multisampleBuffer.writeUInt32LE(0xffffffff, 12);       // mask
  multisampleBuffer.writeUInt32LE(0, 16);                // alphaToCoverageEnabled
  // offset 20: 4 bytes padding

  dumpBuffer("WGPUMultisampleState", multisampleBuffer);

  // Compare expected vs C output
  console.log("=== Comparison with C output ===\n");

  const expectedAttribute = "00 00 00 00 00 00 00 00 1d 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00";
  const actualAttribute = attributeBuffer.toString('hex').match(/.{1,2}/g)?.join(' ');
  console.log("WGPUVertexAttribute:");
  console.log("  Expected: " + expectedAttribute);
  console.log("  Actual:   " + actualAttribute);
  console.log("  Match:    " + (expectedAttribute === actualAttribute));
  console.log("");

  const expectedPrimitive = "00 00 00 00 00 00 00 00 04 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00";
  const actualPrimitive = primitiveBuffer.toString('hex').match(/.{1,2}/g)?.join(' ');
  console.log("WGPUPrimitiveState:");
  console.log("  Expected: " + expectedPrimitive);
  console.log("  Actual:   " + actualPrimitive);
  console.log("  Match:    " + (expectedPrimitive === actualPrimitive));
  console.log("");

  const expectedMultisample = "00 00 00 00 00 00 00 00 01 00 00 00 ff ff ff ff 00 00 00 00 00 00 00 00";
  const actualMultisample = multisampleBuffer.toString('hex').match(/.{1,2}/g)?.join(' ');
  console.log("WGPUMultisampleState:");
  console.log("  Expected: " + expectedMultisample);
  console.log("  Actual:   " + actualMultisample);
  console.log("  Match:    " + (expectedMultisample === actualMultisample));
}

main().catch(console.error);
