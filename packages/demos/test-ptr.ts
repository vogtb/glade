/**
 * Test to understand ptr() behavior in Bun FFI
 */
import { ptr } from "bun:ffi";
const { read } = require("bun:ffi");

// Test 1: Buffer.alloc
console.log("=== Test 1: Buffer.alloc ===");
const buf1 = Buffer.alloc(32);
buf1.writeUInt32LE(0x1d, 8);
const ptr1a = ptr(buf1);
const ptr1b = ptr(buf1);
console.log(`ptr(buf1) call 1: ${ptr1a}`);
console.log(`ptr(buf1) call 2: ${ptr1b}`);
console.log(`Same pointer? ${ptr1a === ptr1b}`);
console.log(`Value at ptr+8: ${read.u32(ptr1a as unknown as number + 8)}`);
console.log(`Value from buffer: ${buf1.readUInt32LE(8)}`);

// Test 2: Uint8Array
console.log("\n=== Test 2: Uint8Array ===");
const arr = new Uint8Array(32);
const view = new DataView(arr.buffer);
view.setUint32(8, 0x1d, true);
const ptr2a = ptr(arr);
const ptr2b = ptr(arr);
console.log(`ptr(arr) call 1: ${ptr2a}`);
console.log(`ptr(arr) call 2: ${ptr2b}`);
console.log(`Same pointer? ${ptr2a === ptr2b}`);
console.log(`Value at ptr+8: ${read.u32(ptr2a as unknown as number + 8)}`);
console.log(`Value from DataView: ${view.getUint32(8, true)}`);

// Test 3: Buffer created from ArrayBuffer
console.log("\n=== Test 3: Buffer from ArrayBuffer ===");
const ab = new ArrayBuffer(32);
const buf3 = Buffer.from(ab);
buf3.writeUInt32LE(0x1d, 8);
const ptr3a = ptr(buf3);
const ptr3b = ptr(buf3);
console.log(`ptr(buf3) call 1: ${ptr3a}`);
console.log(`ptr(buf3) call 2: ${ptr3b}`);
console.log(`Same pointer? ${ptr3a === ptr3b}`);
console.log(`Value at ptr+8: ${read.u32(ptr3a as unknown as number + 8)}`);
console.log(`Value from buffer: ${buf3.readUInt32LE(8)}`);

// Test 4: Nested pointer scenario (simulating our issue)
console.log("\n=== Test 4: Nested pointer scenario ===");
const innerBuf = Buffer.alloc(32);
innerBuf.writeUInt32LE(0x1d, 8);
const innerPtr = ptr(innerBuf) as unknown as number;
console.log(`Inner buffer ptr: ${innerPtr}`);

const outerBuf = Buffer.alloc(16);
outerBuf.writeBigUInt64LE(BigInt(innerPtr), 0);
console.log(`Stored ptr in outer: ${outerBuf.readBigUInt64LE(0)}`);

// Now read back
const storedPtr = Number(outerBuf.readBigUInt64LE(0));
console.log(`Retrieved ptr: ${storedPtr}`);
console.log(`Value at retrieved ptr+8: ${read.u32(storedPtr + 8)}`);

// Test 5: Does calling ptr() again give different value?
console.log("\n=== Test 5: Multiple ptr() calls after GC pressure ===");
const testBuf = Buffer.alloc(32);
testBuf.writeUInt32LE(0x1d, 8);
const ptrBefore = ptr(testBuf) as unknown as number;
console.log(`ptr before: ${ptrBefore}`);
console.log(`value at ptr+8 before: ${read.u32(ptrBefore + 8)}`);

// Create GC pressure
for (let i = 0; i < 1000; i++) {
  const temp = Buffer.alloc(1024);
  temp.writeUInt32LE(i, 0);
}

const ptrAfter = ptr(testBuf) as unknown as number;
console.log(`ptr after GC pressure: ${ptrAfter}`);
console.log(`Same? ${ptrBefore === ptrAfter}`);
console.log(`value at original ptr+8 after: ${read.u32(ptrBefore + 8)}`);
console.log(`value at new ptr+8 after: ${read.u32(ptrAfter + 8)}`);
console.log(`value from buffer: ${testBuf.readUInt32LE(8)}`);
