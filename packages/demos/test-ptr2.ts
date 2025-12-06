/**
 * Test to replicate exact gpu-wrapper.ts flow
 */
import { ptr } from "bun:ffi";
const { read } = require("bun:ffi");

console.log("=== Replicating gpu-wrapper.ts flow ===\n");

const attributeSize = 32;
const totalAttributes = 1;
const attributesBuffer = Buffer.alloc(attributeSize * Math.max(totalAttributes, 1));

const vertexBufferLayoutSize = 40;
const numVertexBuffers = 1;
const vertexBufferLayoutsBuffer = Buffer.alloc(vertexBufferLayoutSize * Math.max(numVertexBuffers, 1));

let attrIndex = 0;

// Simulating the loop for one buffer
const bufferOffset = 0;

// Write to vertexBufferLayoutsBuffer
vertexBufferLayoutsBuffer.writeBigUInt64LE(BigInt(0), bufferOffset); // nextInChain
vertexBufferLayoutsBuffer.writeUInt32LE(1, bufferOffset + 8); // stepMode = Vertex
vertexBufferLayoutsBuffer.writeBigUInt64LE(BigInt(8), bufferOffset + 16); // arrayStride
vertexBufferLayoutsBuffer.writeBigUInt64LE(BigInt(1), bufferOffset + 24); // attributeCount

// Get pointer to attributesBuffer BEFORE writing data
const attrPtr = ptr(attributesBuffer) as unknown as number;
console.log(`1. Got attrPtr: ${attrPtr}`);
console.log(`   Value at attrPtr+8 (before write): ${read.u32(attrPtr + 8)}`);

// Store pointer in vertexBufferLayoutsBuffer
vertexBufferLayoutsBuffer.writeBigUInt64LE(
  BigInt(attrPtr + attrIndex * attributeSize),
  bufferOffset + 32
);
console.log(`2. Stored pointer ${attrPtr} in layout buffer`);

// Now write the attribute data
const attrOffset = attrIndex * attributeSize;
const formatValue = 0x1d; // Float32x2
attributesBuffer.writeBigUInt64LE(BigInt(0), attrOffset); // nextInChain
attributesBuffer.writeUInt32LE(formatValue, attrOffset + 8); // format
attributesBuffer.writeBigUInt64LE(BigInt(0), attrOffset + 16); // offset
attributesBuffer.writeUInt32LE(0, attrOffset + 24); // shaderLocation
attrIndex++;

console.log(`3. Wrote attribute data to attributesBuffer`);
console.log(`   attributesBuffer[8] via Buffer: ${attributesBuffer.readUInt32LE(8)}`);
console.log(`   Value at attrPtr+8 (after write): ${read.u32(attrPtr + 8)}`);

// Get pointer again
const attrPtrAgain = ptr(attributesBuffer) as unknown as number;
console.log(`4. Got attrPtr again: ${attrPtrAgain}`);
console.log(`   Same? ${attrPtr === attrPtrAgain}`);

// Read back pointer from layout buffer
const storedPtr = Number(vertexBufferLayoutsBuffer.readBigUInt64LE(32));
console.log(`5. Read back stored pointer: ${storedPtr}`);
console.log(`   Value at stored ptr+8: ${read.u32(storedPtr + 8)}`);

// Simulate what happens when building the main descriptor
console.log("\n=== Building main descriptor ===");

const descBuffer = Buffer.alloc(168);
let offset = 0;

// Skip to vertex.buffers at offset 56 (after nextInChain, label, layout, and vertex.module, entryPoint, constants)
offset = 56; // vertex.bufferCount offset
descBuffer.writeBigUInt64LE(BigInt(numVertexBuffers), offset);
offset += 8;

const vertexBuffersPtr = ptr(vertexBufferLayoutsBuffer) as unknown as number;
console.log(`6. vertexBufferLayoutsBuffer ptr: ${vertexBuffersPtr}`);
descBuffer.writeBigUInt64LE(BigInt(vertexBuffersPtr), offset);

// Verify the chain
console.log("\n=== Final verification ===");
const descVertexBuffersPtr = Number(descBuffer.readBigUInt64LE(64));
console.log(`Descriptor.vertex.buffers ptr: ${descVertexBuffersPtr}`);

const layoutAttrPtr = Number(
  new DataView(
    Buffer.from([
      ...new Uint8Array(
        (function () {
          const result = new Uint8Array(8);
          for (let i = 0; i < 8; i++) {
            result[i] = read.u8(descVertexBuffersPtr + 32 + i);
          }
          return result.buffer;
        })()
      ),
    ]).buffer
  ).getBigUint64(0, true)
);
console.log(`Layout.attributes ptr (via FFI read): ${layoutAttrPtr}`);
console.log(`Format at layoutAttrPtr+8 (via FFI): ${read.u32(layoutAttrPtr + 8)}`);
