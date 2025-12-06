/**
 * Debug test: Set up error callbacks to see what Dawn is reporting
 */
import { ptr, JSCallback, FFIType } from "bun:ffi";
import {
  dawn,
  WGPUCallbackMode,
  WGPURequestAdapterStatus,
  WGPURequestDeviceStatus,
  WGPUVertexFormat,
  WGPUVertexStepMode,
  WGPUPrimitiveTopology,
  WGPULoadOp,
  WGPUStoreOp,
  WGPUBufferUsage,
} from "@glade/dawn";
import {
  createInstance,
  configureSurface,
  getSurfaceCurrentTexture,
  presentSurface,
  createTextureView,
  createSurfaceFromMetalLayer,
  WGPUSurfaceGetCurrentTextureStatus,
} from "@glade/darwin/webgpu";
import { createWindow, getMetalLayer, pollEvents, windowShouldClose } from "@glade/darwin/metal";

const WIDTH = 800;
const HEIGHT = 600;

// Error type names
const ErrorTypeNames: Record<number, string> = {
  0x00000001: "NoError",
  0x00000002: "Validation",
  0x00000003: "OutOfMemory",
  0x00000004: "Internal",
  0x00000005: "Unknown",
};

// Set up uncaptured error callback
const errorCallback = new JSCallback(
  (
    devicePtr: number,
    errorType: number,
    messageData: number,
    messageLength: bigint,
    userdata1: number,
    userdata2: number
  ) => {
    const typeName = ErrorTypeNames[errorType] ?? `Unknown(${errorType})`;

    // Try to read the error message
    let message = "<could not read message>";
    if (messageData && messageLength > 0n) {
      try {
        const { read } = require("bun:ffi");
        const len = Number(messageLength);
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = read.u8(messageData + i);
        }
        message = new TextDecoder().decode(bytes);
      } catch (e) {
        message = `<error reading message: ${e}>`;
      }
    }

    console.error(`\n[DAWN ERROR] Type: ${typeName}`);
    console.error(`[DAWN ERROR] Message: ${message}\n`);
  },
  {
    args: [FFIType.ptr, FFIType.u32, FFIType.ptr, FFIType.u64, FFIType.ptr, FFIType.ptr],
    returns: FFIType.void,
  }
);

// Set up device lost callback
const deviceLostCallback = new JSCallback(
  (
    devicePtr: number,
    reason: number,
    messageData: number,
    messageLength: bigint,
    userdata1: number,
    userdata2: number
  ) => {
    console.error(`\n[DAWN DEVICE LOST] Reason: ${reason}`);
  },
  {
    args: [FFIType.ptr, FFIType.u32, FFIType.ptr, FFIType.u64, FFIType.ptr, FFIType.ptr],
    returns: FFIType.void,
  }
);

console.log("Creating WebGPU instance...");
const instance = createInstance();

console.log("Creating window...");
const window = createWindow(WIDTH, HEIGHT, "Debug Error Callback");
const metalLayer = getMetalLayer(window);
const surface = createSurfaceFromMetalLayer(instance, metalLayer);

console.log("Requesting adapter...");

// Request adapter
let adapter: any = null;
let adapterCallbackCalled = false;

const adapterCallback = new JSCallback(
  (status: number, adapterPtr: any) => {
    adapterCallbackCalled = true;
    if (status === WGPURequestAdapterStatus.Success) {
      adapter = adapterPtr;
    }
  },
  {
    args: [FFIType.u32, FFIType.ptr, FFIType.u64, FFIType.u64, FFIType.ptr, FFIType.ptr],
    returns: FFIType.void,
  }
);

const adapterCallbackInfo = Buffer.alloc(40);
adapterCallbackInfo.writeBigUInt64LE(BigInt(0), 0);
adapterCallbackInfo.writeUInt32LE(WGPUCallbackMode.AllowSpontaneous, 8);
adapterCallbackInfo.writeBigUInt64LE(BigInt(adapterCallback.ptr!), 16);
adapterCallbackInfo.writeBigUInt64LE(BigInt(0), 24);
adapterCallbackInfo.writeBigUInt64LE(BigInt(0), 32);

dawn.wgpuInstanceRequestAdapter(instance, null, ptr(adapterCallbackInfo));

while (!adapterCallbackCalled) {
  dawn.wgpuInstanceProcessEvents(instance);
  await Bun.sleep(1);
}

if (!adapter) {
  throw new Error("Failed to get adapter");
}
console.log("Got adapter!");

// Request device WITH error callbacks
console.log("Requesting device with error callbacks...");

let device: any = null;
let deviceCallbackCalled = false;

const deviceCallback = new JSCallback(
  (status: number, devicePtr: any) => {
    deviceCallbackCalled = true;
    if (status === WGPURequestDeviceStatus.Success) {
      device = devicePtr;
    }
  },
  {
    args: [FFIType.u32, FFIType.ptr, FFIType.u64, FFIType.u64, FFIType.ptr, FFIType.ptr],
    returns: FFIType.void,
  }
);

const deviceCallbackInfo = Buffer.alloc(40);
deviceCallbackInfo.writeBigUInt64LE(BigInt(0), 0);
deviceCallbackInfo.writeUInt32LE(WGPUCallbackMode.AllowSpontaneous, 8);
deviceCallbackInfo.writeBigUInt64LE(BigInt(deviceCallback.ptr!), 16);
deviceCallbackInfo.writeBigUInt64LE(BigInt(0), 24);
deviceCallbackInfo.writeBigUInt64LE(BigInt(0), 32);

// Build WGPUDeviceDescriptor with error callbacks
// WGPUDeviceDescriptor layout:
// { nextInChain: ptr(8), label: WGPUStringView(16),
//   requiredFeatureCount: size_t(8), requiredFeatures: ptr(8),
//   requiredLimits: ptr(8),
//   defaultQueue: WGPUQueueDescriptor(24),
//   deviceLostCallbackInfo: WGPUDeviceLostCallbackInfo(40),
//   uncapturedErrorCallbackInfo: WGPUUncapturedErrorCallbackInfo(32) }

// WGPUQueueDescriptor: { nextInChain: ptr(8), label: WGPUStringView(16) } = 24 bytes
// WGPUDeviceLostCallbackInfo: { nextInChain: ptr(8), mode: u32(4), padding(4), callback: ptr(8), userdata1: ptr(8), userdata2: ptr(8) } = 40 bytes
// WGPUUncapturedErrorCallbackInfo: { nextInChain: ptr(8), callback: ptr(8), userdata1: ptr(8), userdata2: ptr(8) } = 32 bytes

// Total: 8 + 16 + 8 + 8 + 8 + 24 + 40 + 32 = 144 bytes
const deviceDescriptor = Buffer.alloc(144);
let offset = 0;

// nextInChain
deviceDescriptor.writeBigUInt64LE(BigInt(0), offset);
offset += 8;

// label: WGPUStringView
deviceDescriptor.writeBigUInt64LE(BigInt(0), offset); // data = NULL
offset += 8;
deviceDescriptor.writeBigUInt64LE(BigInt("0xFFFFFFFFFFFFFFFF"), offset); // length = WGPU_STRLEN
offset += 8;

// requiredFeatureCount
deviceDescriptor.writeBigUInt64LE(BigInt(0), offset);
offset += 8;

// requiredFeatures
deviceDescriptor.writeBigUInt64LE(BigInt(0), offset);
offset += 8;

// requiredLimits
deviceDescriptor.writeBigUInt64LE(BigInt(0), offset);
offset += 8;

// defaultQueue: WGPUQueueDescriptor (24 bytes)
deviceDescriptor.writeBigUInt64LE(BigInt(0), offset); // nextInChain
offset += 8;
deviceDescriptor.writeBigUInt64LE(BigInt(0), offset); // label.data
offset += 8;
deviceDescriptor.writeBigUInt64LE(BigInt("0xFFFFFFFFFFFFFFFF"), offset); // label.length
offset += 8;

// deviceLostCallbackInfo: WGPUDeviceLostCallbackInfo (40 bytes)
deviceDescriptor.writeBigUInt64LE(BigInt(0), offset); // nextInChain
offset += 8;
deviceDescriptor.writeUInt32LE(WGPUCallbackMode.AllowSpontaneous, offset); // mode
offset += 4;
offset += 4; // padding
deviceDescriptor.writeBigUInt64LE(BigInt(deviceLostCallback.ptr!), offset); // callback
offset += 8;
deviceDescriptor.writeBigUInt64LE(BigInt(0), offset); // userdata1
offset += 8;
deviceDescriptor.writeBigUInt64LE(BigInt(0), offset); // userdata2
offset += 8;

// uncapturedErrorCallbackInfo: WGPUUncapturedErrorCallbackInfo (32 bytes)
deviceDescriptor.writeBigUInt64LE(BigInt(0), offset); // nextInChain
offset += 8;
deviceDescriptor.writeBigUInt64LE(BigInt(errorCallback.ptr!), offset); // callback
offset += 8;
deviceDescriptor.writeBigUInt64LE(BigInt(0), offset); // userdata1
offset += 8;
deviceDescriptor.writeBigUInt64LE(BigInt(0), offset); // userdata2
offset += 8;

console.log(`Device descriptor size: ${offset} bytes`);

dawn.wgpuAdapterRequestDevice(adapter, ptr(deviceDescriptor), ptr(deviceCallbackInfo));

while (!deviceCallbackCalled) {
  dawn.wgpuInstanceProcessEvents(instance);
  await Bun.sleep(1);
}

if (!device) {
  throw new Error("Failed to get device");
}
console.log("Got device with error callbacks!");

const queue = dawn.wgpuDeviceGetQueue(device);
console.log("Got queue!");

// Configure surface
configureSurface(surface, {
  device,
  width: WIDTH,
  height: HEIGHT,
});
console.log("Surface configured!");

// Create shader module with vertex buffer input
const VERTEX_SHADER = `
@vertex
fn main(@location(0) pos: vec2f) -> @builtin(position) vec4f {
  return vec4f(pos, 0.0, 1.0);
}
`;

const FRAGMENT_SHADER = `
@fragment
fn main() -> @location(0) vec4f {
  return vec4f(0.0, 1.0, 0.0, 1.0); // Green
}
`;

// Create shader modules
function createShaderModule(code: string) {
  const codeBuffer = Buffer.from(code + "\0", "utf8");
  const wgslSource = Buffer.alloc(32);
  wgslSource.writeBigUInt64LE(BigInt(0), 0);
  wgslSource.writeUInt32LE(0x00000002, 8); // WGPUSType_ShaderSourceWGSL
  wgslSource.writeBigUInt64LE(BigInt(ptr(codeBuffer)), 16);
  wgslSource.writeBigUInt64LE(BigInt(codeBuffer.length - 1), 24);

  const descBuffer = Buffer.alloc(32);
  descBuffer.writeBigUInt64LE(BigInt(ptr(wgslSource)), 0);
  descBuffer.writeBigUInt64LE(BigInt(0), 8);
  descBuffer.writeBigUInt64LE(BigInt("0xFFFFFFFFFFFFFFFF"), 16);

  return dawn.wgpuDeviceCreateShaderModule(device, ptr(descBuffer));
}

console.log("Creating shader modules...");
const vertexModule = createShaderModule(VERTEX_SHADER);
const fragmentModule = createShaderModule(FRAGMENT_SHADER);
console.log(`Vertex shader: ${vertexModule}`);
console.log(`Fragment shader: ${fragmentModule}`);

// Tick device to process any errors
dawn.wgpuDeviceTick(device);
await Bun.sleep(10);

// Create vertex buffer
const vertices = new Float32Array([
  0.0, 0.5,    // top
  -0.5, -0.5,  // bottom left
  0.5, -0.5,   // bottom right
]);

console.log("Creating vertex buffer...");
const bufferDescriptor = Buffer.alloc(48);
bufferDescriptor.writeBigUInt64LE(BigInt(0), 0);
bufferDescriptor.writeBigUInt64LE(BigInt(0), 8);
bufferDescriptor.writeBigUInt64LE(BigInt("0xFFFFFFFFFFFFFFFF"), 16);
bufferDescriptor.writeBigUInt64LE(BigInt(WGPUBufferUsage.Vertex | WGPUBufferUsage.CopyDst), 24);
bufferDescriptor.writeBigUInt64LE(BigInt(vertices.byteLength), 32);
bufferDescriptor.writeUInt32LE(0, 40);

const vertexBuffer = dawn.wgpuDeviceCreateBuffer(device, ptr(bufferDescriptor));
console.log(`Vertex buffer: ${vertexBuffer}`);

// Write vertex data
dawn.wgpuQueueWriteBuffer(
  queue,
  vertexBuffer,
  BigInt(0),
  ptr(vertices),
  BigInt(vertices.byteLength)
);
console.log("Vertex data written!");

// Tick device to process any errors
dawn.wgpuDeviceTick(device);
await Bun.sleep(10);

// Create render pipeline with vertex buffer layout
console.log("Creating render pipeline...");

// WGPUVertexAttribute (32 bytes)
const attributesBuffer = Buffer.alloc(32);
attributesBuffer.writeBigUInt64LE(BigInt(0), 0); // nextInChain
attributesBuffer.writeUInt32LE(WGPUVertexFormat.Float32x2, 8); // format
attributesBuffer.writeBigUInt64LE(BigInt(0), 16); // offset
attributesBuffer.writeUInt32LE(0, 24); // shaderLocation

// WGPUVertexBufferLayout (40 bytes)
const vertexBufferLayoutsBuffer = Buffer.alloc(40);
vertexBufferLayoutsBuffer.writeBigUInt64LE(BigInt(0), 0); // nextInChain
vertexBufferLayoutsBuffer.writeUInt32LE(WGPUVertexStepMode.Vertex, 8); // stepMode
vertexBufferLayoutsBuffer.writeBigUInt64LE(BigInt(8), 16); // arrayStride (2 floats * 4 bytes)
vertexBufferLayoutsBuffer.writeBigUInt64LE(BigInt(1), 24); // attributeCount
vertexBufferLayoutsBuffer.writeBigUInt64LE(BigInt(ptr(attributesBuffer)), 32); // attributes

// Vertex entry point
const vertexEntryPointBuffer = Buffer.from("main\0", "utf8");

// Fragment entry point
const fragmentEntryPointBuffer = Buffer.from("main\0", "utf8");

// WGPUColorTargetState (32 bytes)
const targetsBuffer = Buffer.alloc(32);
targetsBuffer.writeBigUInt64LE(BigInt(0), 0); // nextInChain
targetsBuffer.writeUInt32LE(0x0000001b, 8); // format = BGRA8Unorm
targetsBuffer.writeBigUInt64LE(BigInt(0), 16); // blend = NULL
targetsBuffer.writeUInt32LE(0xf, 24); // writeMask = All

// WGPUFragmentState (64 bytes)
const fragmentStateBuffer = Buffer.alloc(64);
fragmentStateBuffer.writeBigUInt64LE(BigInt(0), 0); // nextInChain
fragmentStateBuffer.writeBigUInt64LE(BigInt(fragmentModule as unknown as number), 8); // module
fragmentStateBuffer.writeBigUInt64LE(BigInt(ptr(fragmentEntryPointBuffer)), 16); // entryPoint.data
fragmentStateBuffer.writeBigUInt64LE(BigInt(fragmentEntryPointBuffer.length - 1), 24); // entryPoint.length
fragmentStateBuffer.writeBigUInt64LE(BigInt(0), 32); // constantCount
fragmentStateBuffer.writeBigUInt64LE(BigInt(0), 40); // constants
fragmentStateBuffer.writeBigUInt64LE(BigInt(1), 48); // targetCount
fragmentStateBuffer.writeBigUInt64LE(BigInt(ptr(targetsBuffer)), 56); // targets

// WGPURenderPipelineDescriptor (168 bytes)
const pipelineDescBuffer = Buffer.alloc(168);
let pOffset = 0;

// nextInChain
pipelineDescBuffer.writeBigUInt64LE(BigInt(0), pOffset);
pOffset += 8;

// label
pipelineDescBuffer.writeBigUInt64LE(BigInt(0), pOffset);
pOffset += 8;
pipelineDescBuffer.writeBigUInt64LE(BigInt("0xFFFFFFFFFFFFFFFF"), pOffset);
pOffset += 8;

// layout = NULL (auto)
pipelineDescBuffer.writeBigUInt64LE(BigInt(0), pOffset);
pOffset += 8;

// vertex state (64 bytes inline)
pipelineDescBuffer.writeBigUInt64LE(BigInt(0), pOffset); // nextInChain
pOffset += 8;
pipelineDescBuffer.writeBigUInt64LE(BigInt(vertexModule as unknown as number), pOffset); // module
pOffset += 8;
pipelineDescBuffer.writeBigUInt64LE(BigInt(ptr(vertexEntryPointBuffer)), pOffset); // entryPoint.data
pOffset += 8;
pipelineDescBuffer.writeBigUInt64LE(BigInt(vertexEntryPointBuffer.length - 1), pOffset); // entryPoint.length
pOffset += 8;
pipelineDescBuffer.writeBigUInt64LE(BigInt(0), pOffset); // constantCount
pOffset += 8;
pipelineDescBuffer.writeBigUInt64LE(BigInt(0), pOffset); // constants
pOffset += 8;
pipelineDescBuffer.writeBigUInt64LE(BigInt(1), pOffset); // bufferCount
pOffset += 8;
pipelineDescBuffer.writeBigUInt64LE(BigInt(ptr(vertexBufferLayoutsBuffer)), pOffset); // buffers
pOffset += 8;

// primitive state (32 bytes inline)
pipelineDescBuffer.writeBigUInt64LE(BigInt(0), pOffset); // nextInChain
pOffset += 8;
pipelineDescBuffer.writeUInt32LE(WGPUPrimitiveTopology.TriangleList, pOffset); // topology
pOffset += 4;
pipelineDescBuffer.writeUInt32LE(0, pOffset); // stripIndexFormat
pOffset += 4;
pipelineDescBuffer.writeUInt32LE(0, pOffset); // frontFace
pOffset += 4;
pipelineDescBuffer.writeUInt32LE(0, pOffset); // cullMode
pOffset += 4;
pipelineDescBuffer.writeUInt32LE(0, pOffset); // unclippedDepth
pOffset += 4;
pOffset += 4; // padding

// depthStencil = NULL
pipelineDescBuffer.writeBigUInt64LE(BigInt(0), pOffset);
pOffset += 8;

// multisample state (24 bytes inline)
pipelineDescBuffer.writeBigUInt64LE(BigInt(0), pOffset); // nextInChain
pOffset += 8;
pipelineDescBuffer.writeUInt32LE(1, pOffset); // count
pOffset += 4;
pipelineDescBuffer.writeUInt32LE(0xffffffff, pOffset); // mask
pOffset += 4;
pipelineDescBuffer.writeUInt32LE(0, pOffset); // alphaToCoverageEnabled
pOffset += 4;
pOffset += 4; // padding

// fragment = ptr to fragment state
pipelineDescBuffer.writeBigUInt64LE(BigInt(ptr(fragmentStateBuffer)), pOffset);
pOffset += 8;

console.log(`Pipeline descriptor offset: ${pOffset} (expected 168)`);

const pipeline = dawn.wgpuDeviceCreateRenderPipeline(device, ptr(pipelineDescBuffer));
console.log(`Pipeline: ${pipeline}`);

// Tick device to process any errors
dawn.wgpuDeviceTick(device);
await Bun.sleep(10);

if (!pipeline) {
  console.error("Pipeline creation failed!");
  process.exit(1);
}

// Render loop
console.log("\nStarting render loop (check for errors above)...");

let frameCount = 0;
while (!windowShouldClose(window) && frameCount < 60) {
  pollEvents();

  const surfaceTexture = getSurfaceCurrentTexture(surface);
  if (surfaceTexture.status !== WGPUSurfaceGetCurrentTextureStatus.SuccessOptimal) {
    continue;
  }

  const textureView = createTextureView(surfaceTexture.texture!);

  // Create render pass
  const colorAttachment = Buffer.alloc(72);
  colorAttachment.writeBigUInt64LE(BigInt(0), 0); // nextInChain
  colorAttachment.writeBigUInt64LE(BigInt(textureView as unknown as number), 8); // view
  colorAttachment.writeUInt32LE(0xffffffff, 16); // depthSlice
  colorAttachment.writeBigUInt64LE(BigInt(0), 24); // resolveTarget
  colorAttachment.writeUInt32LE(WGPULoadOp.Clear, 32); // loadOp
  colorAttachment.writeUInt32LE(WGPUStoreOp.Store, 36); // storeOp
  colorAttachment.writeDoubleLE(0.0, 40); // clearValue.r
  colorAttachment.writeDoubleLE(0.0, 48); // clearValue.g
  colorAttachment.writeDoubleLE(0.5, 56); // clearValue.b (dark blue)
  colorAttachment.writeDoubleLE(1.0, 64); // clearValue.a

  const renderPassDesc = Buffer.alloc(80);
  renderPassDesc.writeBigUInt64LE(BigInt(0), 0); // nextInChain
  renderPassDesc.writeBigUInt64LE(BigInt(0), 8); // label.data
  renderPassDesc.writeBigUInt64LE(BigInt("0xFFFFFFFFFFFFFFFF"), 16); // label.length
  renderPassDesc.writeBigUInt64LE(BigInt(1), 24); // colorAttachmentCount
  renderPassDesc.writeBigUInt64LE(BigInt(ptr(colorAttachment)), 32); // colorAttachments
  renderPassDesc.writeBigUInt64LE(BigInt(0), 40); // depthStencilAttachment
  renderPassDesc.writeBigUInt64LE(BigInt(0), 48); // occlusionQuerySet
  renderPassDesc.writeBigUInt64LE(BigInt(0), 56); // timestampWrites

  // Create command encoder
  const encoderDesc = Buffer.alloc(32);
  encoderDesc.writeBigUInt64LE(BigInt(0), 0);
  encoderDesc.writeBigUInt64LE(BigInt(0), 8);
  encoderDesc.writeBigUInt64LE(BigInt("0xFFFFFFFFFFFFFFFF"), 16);
  const encoder = dawn.wgpuDeviceCreateCommandEncoder(device, ptr(encoderDesc));

  const renderPass = dawn.wgpuCommandEncoderBeginRenderPass(encoder, ptr(renderPassDesc));

  // Set pipeline and draw
  dawn.wgpuRenderPassEncoderSetPipeline(renderPass, pipeline);
  dawn.wgpuRenderPassEncoderSetVertexBuffer(
    renderPass,
    0,
    vertexBuffer,
    BigInt(0),
    BigInt(vertices.byteLength)
  );
  dawn.wgpuRenderPassEncoderDraw(renderPass, 3, 1, 0, 0);
  dawn.wgpuRenderPassEncoderEnd(renderPass);

  // Finish and submit
  const cmdBufDesc = Buffer.alloc(32);
  cmdBufDesc.writeBigUInt64LE(BigInt(0), 0);
  cmdBufDesc.writeBigUInt64LE(BigInt(0), 8);
  cmdBufDesc.writeBigUInt64LE(BigInt("0xFFFFFFFFFFFFFFFF"), 16);
  const commandBuffer = dawn.wgpuCommandEncoderFinish(encoder, ptr(cmdBufDesc));

  const cmdBuffers = new BigUint64Array([BigInt(commandBuffer as unknown as number)]);
  dawn.wgpuQueueSubmit(queue, BigInt(1), ptr(cmdBuffers));

  presentSurface(surface);

  // Tick to process callbacks
  dawn.wgpuDeviceTick(device);

  frameCount++;

  if (frameCount === 1) {
    console.log("First frame rendered - check for errors above");
  }
}

console.log(`\nRendered ${frameCount} frames. Done.`);
