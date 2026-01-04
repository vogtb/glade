import { log } from "@glade/logging";
import { dlopen, FFIType, type Pointer, ptr } from "bun:ffi";

// @ts-expect-error - Bun-specific import attribute
import DAWN_PATH from "../../libs/libwebgpu_dawn.dylib" with { type: "file" };

log.info("using embedded libwebgpu_dawn.dylib");
log.info(`DAWN_PATH=${DAWN_PATH}`);

// WebGPU handle types (opaque pointers)
export type WGPUInstance = Pointer;
export type WGPUAdapter = Pointer;
export type WGPUDevice = Pointer;
export type WGPUQueue = Pointer;
export type WGPUSurface = Pointer;
export type WGPUTexture = Pointer;
export type WGPUTextureView = Pointer;
export type WGPUBuffer = Pointer;
export type WGPUShaderModule = Pointer;
export type WGPURenderPipeline = Pointer;
export type WGPUComputePipeline = Pointer;
export type WGPUBindGroup = Pointer;
export type WGPUBindGroupLayout = Pointer;
export type WGPUPipelineLayout = Pointer;
export type WGPUCommandEncoder = Pointer;
export type WGPUCommandBuffer = Pointer;
export type WGPURenderPassEncoder = Pointer;
export type WGPUComputePassEncoder = Pointer;
export type WGPUSampler = Pointer;
export type WGPUQuerySet = Pointer;

// WebGPU enums
export const WGPUSType = {
  SurfaceSourceMetalLayer: 0x00000004,
  SurfaceSourceWindowsHWND: 0x00000005,
  SurfaceSourceXlibWindow: 0x00000006,
  SurfaceSourceWaylandSurface: 0x00000008,
  SurfaceSourceAndroidNativeWindow: 0x00000009,
  SurfaceSourceXCBWindow: 0x0000000a,
} as const;

export const WGPUCallbackMode = {
  WaitAnyOnly: 0x00000001,
  AllowProcessEvents: 0x00000002,
  AllowSpontaneous: 0x00000003,
} as const;

export const WGPURequestAdapterStatus = {
  Success: 0x00000001,
  InstanceDropped: 0x00000002,
  Unavailable: 0x00000003,
  Error: 0x00000004,
} as const;

export const WGPURequestDeviceStatus = {
  Success: 0x00000001,
  InstanceDropped: 0x00000002,
  Error: 0x00000003,
} as const;

export const WGPUTextureFormat = {
  Undefined: 0x00000000,
  RGBA8Unorm: 0x00000016,
  RGBA8UnormSrgb: 0x00000017,
  BGRA8Unorm: 0x0000001b,
  BGRA8UnormSrgb: 0x0000001c,
} as const;

export const WGPUTextureUsage = {
  None: 0x00000000,
  CopySrc: 0x00000001,
  CopyDst: 0x00000002,
  TextureBinding: 0x00000004,
  StorageBinding: 0x00000008,
  RenderAttachment: 0x00000010,
} as const;

export const WGPUPresentMode = {
  Fifo: 0x00000001,
  FifoRelaxed: 0x00000002,
  Immediate: 0x00000003,
  Mailbox: 0x00000004,
} as const;

export const WGPUCompositeAlphaMode = {
  Auto: 0x00000000,
  Opaque: 0x00000001,
  Premultiplied: 0x00000002,
  Unpremultiplied: 0x00000003,
  Inherit: 0x00000004,
} as const;

export const WGPUSurfaceGetCurrentTextureStatus = {
  SuccessOptimal: 0x00000001,
  SuccessSuboptimal: 0x00000002,
  Timeout: 0x00000003,
  Outdated: 0x00000004,
  Lost: 0x00000005,
  Error: 0x00000006,
} as const;

export const WGPULoadOp = {
  Undefined: 0x00000000,
  Load: 0x00000001,
  Clear: 0x00000002,
} as const;

export const WGPUStoreOp = {
  Undefined: 0x00000000,
  Store: 0x00000001,
  Discard: 0x00000002,
} as const;

export const WGPUBufferUsage = {
  None: 0x00000000,
  MapRead: 0x00000001,
  MapWrite: 0x00000002,
  CopySrc: 0x00000004,
  CopyDst: 0x00000008,
  Index: 0x00000010,
  Vertex: 0x00000020,
  Uniform: 0x00000040,
  Storage: 0x00000080,
  Indirect: 0x00000100,
  QueryResolve: 0x00000200,
} as const;

export const WGPUShaderStage = {
  None: 0x00000000,
  Vertex: 0x00000001,
  Fragment: 0x00000002,
  Compute: 0x00000004,
} as const;

export const WGPUPrimitiveTopology = {
  Undefined: 0x00000000,
  PointList: 0x00000001,
  LineList: 0x00000002,
  LineStrip: 0x00000003,
  TriangleList: 0x00000004,
  TriangleStrip: 0x00000005,
} as const;

export const WGPUFrontFace = {
  Undefined: 0x00000000,
  CCW: 0x00000001,
  CW: 0x00000002,
} as const;

export const WGPUCullMode = {
  Undefined: 0x00000000,
  None: 0x00000001,
  Front: 0x00000002,
  Back: 0x00000003,
} as const;

export const WGPUIndexFormat = {
  Undefined: 0x00000000,
  Uint16: 0x00000001,
  Uint32: 0x00000002,
} as const;

export const WGPUVertexFormat = {
  Uint8: 0x00000001,
  Uint8x2: 0x00000002,
  Uint8x4: 0x00000003,
  Sint8: 0x00000004,
  Sint8x2: 0x00000005,
  Sint8x4: 0x00000006,
  Unorm8: 0x00000007,
  Unorm8x2: 0x00000008,
  Unorm8x4: 0x00000009,
  Snorm8: 0x0000000a,
  Snorm8x2: 0x0000000b,
  Snorm8x4: 0x0000000c,
  Uint16: 0x0000000d,
  Uint16x2: 0x0000000e,
  Uint16x4: 0x0000000f,
  Sint16: 0x00000010,
  Sint16x2: 0x00000011,
  Sint16x4: 0x00000012,
  Unorm16: 0x00000013,
  Unorm16x2: 0x00000014,
  Unorm16x4: 0x00000015,
  Snorm16: 0x00000016,
  Snorm16x2: 0x00000017,
  Snorm16x4: 0x00000018,
  Float16: 0x00000019,
  Float16x2: 0x0000001a,
  Float16x4: 0x0000001b,
  Float32: 0x0000001c,
  Float32x2: 0x0000001d,
  Float32x3: 0x0000001e,
  Float32x4: 0x0000001f,
  Uint32: 0x00000020,
  Uint32x2: 0x00000021,
  Uint32x3: 0x00000022,
  Uint32x4: 0x00000023,
  Sint32: 0x00000024,
  Sint32x2: 0x00000025,
  Sint32x3: 0x00000026,
  Sint32x4: 0x00000027,
} as const;

export const WGPUVertexStepMode = {
  Undefined: 0x00000000,
  Vertex: 0x00000001,
  Instance: 0x00000002,
} as const;

// WGPU_STRLEN constant for null-terminated strings
const WGPU_STRLEN = BigInt("0xFFFFFFFFFFFFFFFF"); // SIZE_MAX

// Dawn FFI bindings
export const lib = dlopen(DAWN_PATH, {
  // Instance
  wgpuCreateInstance: {
    args: [FFIType.ptr],
    returns: FFIType.ptr,
  },
  wgpuInstanceRelease: {
    args: [FFIType.ptr],
    returns: FFIType.void,
  },
  wgpuInstanceAddRef: {
    args: [FFIType.ptr],
    returns: FFIType.void,
  },
  wgpuInstanceRequestAdapter: {
    args: [FFIType.ptr, FFIType.ptr, FFIType.ptr], // instance, options, callbackInfo struct
    returns: FFIType.u64, // WGPUFuture
  },
  wgpuInstanceCreateSurface: {
    args: [FFIType.ptr, FFIType.ptr],
    returns: FFIType.ptr,
  },
  wgpuInstanceProcessEvents: {
    args: [FFIType.ptr],
    returns: FFIType.void,
  },
  wgpuInstanceWaitAny: {
    args: [FFIType.ptr, FFIType.u64, FFIType.ptr, FFIType.u64],
    returns: FFIType.u32,
  },

  // Adapter
  wgpuAdapterRelease: {
    args: [FFIType.ptr],
    returns: FFIType.void,
  },
  wgpuAdapterRequestDevice: {
    args: [FFIType.ptr, FFIType.ptr, FFIType.ptr], // adapter, descriptor, callbackInfo struct
    returns: FFIType.u64, // WGPUFuture
  },
  wgpuAdapterGetInfo: {
    args: [FFIType.ptr, FFIType.ptr],
    returns: FFIType.u32,
  },
  wgpuAdapterGetLimits: {
    args: [FFIType.ptr, FFIType.ptr],
    returns: FFIType.u32,
  },
  wgpuAdapterGetFeatures: {
    args: [FFIType.ptr, FFIType.ptr],
    returns: FFIType.void,
  },

  // Device
  wgpuDeviceRelease: {
    args: [FFIType.ptr],
    returns: FFIType.void,
  },
  wgpuDeviceGetQueue: {
    args: [FFIType.ptr],
    returns: FFIType.ptr,
  },
  wgpuDeviceCreateShaderModule: {
    args: [FFIType.ptr, FFIType.ptr],
    returns: FFIType.ptr,
  },
  wgpuDeviceCreateBuffer: {
    args: [FFIType.ptr, FFIType.ptr],
    returns: FFIType.ptr,
  },
  wgpuDeviceCreateTexture: {
    args: [FFIType.ptr, FFIType.ptr],
    returns: FFIType.ptr,
  },
  wgpuDeviceCreateSampler: {
    args: [FFIType.ptr, FFIType.ptr],
    returns: FFIType.ptr,
  },
  wgpuDeviceCreateBindGroupLayout: {
    args: [FFIType.ptr, FFIType.ptr],
    returns: FFIType.ptr,
  },
  wgpuDeviceCreateBindGroup: {
    args: [FFIType.ptr, FFIType.ptr],
    returns: FFIType.ptr,
  },
  wgpuDeviceCreatePipelineLayout: {
    args: [FFIType.ptr, FFIType.ptr],
    returns: FFIType.ptr,
  },
  wgpuDeviceCreateRenderPipeline: {
    args: [FFIType.ptr, FFIType.ptr],
    returns: FFIType.ptr,
  },
  wgpuDeviceCreateComputePipeline: {
    args: [FFIType.ptr, FFIType.ptr],
    returns: FFIType.ptr,
  },
  wgpuDeviceCreateCommandEncoder: {
    args: [FFIType.ptr, FFIType.ptr],
    returns: FFIType.ptr,
  },
  wgpuDeviceTick: {
    args: [FFIType.ptr],
    returns: FFIType.void,
  },
  wgpuDeviceDestroy: {
    args: [FFIType.ptr],
    returns: FFIType.void,
  },

  // Queue
  wgpuQueueRelease: {
    args: [FFIType.ptr],
    returns: FFIType.void,
  },
  wgpuQueueSubmit: {
    args: [FFIType.ptr, FFIType.u64, FFIType.ptr],
    returns: FFIType.void,
  },
  wgpuQueueWriteBuffer: {
    args: [FFIType.ptr, FFIType.ptr, FFIType.u64, FFIType.ptr, FFIType.u64],
    returns: FFIType.void,
  },
  wgpuQueueWriteTexture: {
    args: [FFIType.ptr, FFIType.ptr, FFIType.ptr, FFIType.u64, FFIType.ptr, FFIType.ptr],
    returns: FFIType.void,
  },
  wgpuQueueOnSubmittedWorkDone: {
    args: [FFIType.ptr, FFIType.ptr],
    returns: FFIType.u64, // WGPUFuture
  },

  // Surface
  wgpuSurfaceRelease: {
    args: [FFIType.ptr],
    returns: FFIType.void,
  },
  wgpuSurfaceConfigure: {
    args: [FFIType.ptr, FFIType.ptr],
    returns: FFIType.void,
  },
  wgpuSurfaceUnconfigure: {
    args: [FFIType.ptr],
    returns: FFIType.void,
  },
  wgpuSurfaceGetCurrentTexture: {
    args: [FFIType.ptr, FFIType.ptr],
    returns: FFIType.void,
  },
  wgpuSurfacePresent: {
    args: [FFIType.ptr],
    returns: FFIType.u32,
  },
  wgpuSurfaceGetCapabilities: {
    args: [FFIType.ptr, FFIType.ptr, FFIType.ptr],
    returns: FFIType.u32,
  },

  // Texture
  wgpuTextureRelease: {
    args: [FFIType.ptr],
    returns: FFIType.void,
  },
  wgpuTextureCreateView: {
    args: [FFIType.ptr, FFIType.ptr],
    returns: FFIType.ptr,
  },
  wgpuTextureDestroy: {
    args: [FFIType.ptr],
    returns: FFIType.void,
  },
  wgpuTextureGetWidth: {
    args: [FFIType.ptr],
    returns: FFIType.u32,
  },
  wgpuTextureGetHeight: {
    args: [FFIType.ptr],
    returns: FFIType.u32,
  },
  wgpuTextureGetFormat: {
    args: [FFIType.ptr],
    returns: FFIType.u32,
  },

  // TextureView
  wgpuTextureViewRelease: {
    args: [FFIType.ptr],
    returns: FFIType.void,
  },

  // Buffer
  wgpuBufferRelease: {
    args: [FFIType.ptr],
    returns: FFIType.void,
  },
  wgpuBufferDestroy: {
    args: [FFIType.ptr],
    returns: FFIType.void,
  },
  wgpuBufferGetSize: {
    args: [FFIType.ptr],
    returns: FFIType.u64,
  },
  wgpuBufferGetMappedRange: {
    args: [FFIType.ptr, FFIType.u64, FFIType.u64],
    returns: FFIType.ptr,
  },
  wgpuBufferUnmap: {
    args: [FFIType.ptr],
    returns: FFIType.void,
  },

  // ShaderModule
  wgpuShaderModuleRelease: {
    args: [FFIType.ptr],
    returns: FFIType.void,
  },

  // RenderPipeline
  wgpuRenderPipelineRelease: {
    args: [FFIType.ptr],
    returns: FFIType.void,
  },
  wgpuRenderPipelineGetBindGroupLayout: {
    args: [FFIType.ptr, FFIType.u32],
    returns: FFIType.ptr,
  },

  // ComputePipeline
  wgpuComputePipelineRelease: {
    args: [FFIType.ptr],
    returns: FFIType.void,
  },
  wgpuComputePipelineGetBindGroupLayout: {
    args: [FFIType.ptr, FFIType.u32],
    returns: FFIType.ptr,
  },

  // BindGroup
  wgpuBindGroupRelease: {
    args: [FFIType.ptr],
    returns: FFIType.void,
  },

  // BindGroupLayout
  wgpuBindGroupLayoutRelease: {
    args: [FFIType.ptr],
    returns: FFIType.void,
  },

  // PipelineLayout
  wgpuPipelineLayoutRelease: {
    args: [FFIType.ptr],
    returns: FFIType.void,
  },

  // Sampler
  wgpuSamplerRelease: {
    args: [FFIType.ptr],
    returns: FFIType.void,
  },

  // CommandEncoder
  wgpuCommandEncoderRelease: {
    args: [FFIType.ptr],
    returns: FFIType.void,
  },
  wgpuCommandEncoderBeginRenderPass: {
    args: [FFIType.ptr, FFIType.ptr],
    returns: FFIType.ptr,
  },
  wgpuCommandEncoderBeginComputePass: {
    args: [FFIType.ptr, FFIType.ptr],
    returns: FFIType.ptr,
  },
  wgpuCommandEncoderFinish: {
    args: [FFIType.ptr, FFIType.ptr],
    returns: FFIType.ptr,
  },
  wgpuCommandEncoderCopyBufferToBuffer: {
    args: [FFIType.ptr, FFIType.ptr, FFIType.u64, FFIType.ptr, FFIType.u64, FFIType.u64],
    returns: FFIType.void,
  },
  wgpuCommandEncoderCopyBufferToTexture: {
    args: [FFIType.ptr, FFIType.ptr, FFIType.ptr, FFIType.ptr],
    returns: FFIType.void,
  },
  wgpuCommandEncoderCopyTextureToBuffer: {
    args: [FFIType.ptr, FFIType.ptr, FFIType.ptr, FFIType.ptr],
    returns: FFIType.void,
  },
  wgpuCommandEncoderCopyTextureToTexture: {
    args: [FFIType.ptr, FFIType.ptr, FFIType.ptr, FFIType.ptr],
    returns: FFIType.void,
  },
  wgpuCommandEncoderClearBuffer: {
    args: [FFIType.ptr, FFIType.ptr, FFIType.u64, FFIType.u64],
    returns: FFIType.void,
  },

  // CommandBuffer
  wgpuCommandBufferRelease: {
    args: [FFIType.ptr],
    returns: FFIType.void,
  },

  // RenderPassEncoder
  wgpuRenderPassEncoderRelease: {
    args: [FFIType.ptr],
    returns: FFIType.void,
  },
  wgpuRenderPassEncoderEnd: {
    args: [FFIType.ptr],
    returns: FFIType.void,
  },
  wgpuRenderPassEncoderSetPipeline: {
    args: [FFIType.ptr, FFIType.ptr],
    returns: FFIType.void,
  },
  wgpuRenderPassEncoderSetBindGroup: {
    args: [FFIType.ptr, FFIType.u32, FFIType.ptr, FFIType.u64, FFIType.ptr],
    returns: FFIType.void,
  },
  wgpuRenderPassEncoderSetVertexBuffer: {
    args: [FFIType.ptr, FFIType.u32, FFIType.ptr, FFIType.u64, FFIType.u64],
    returns: FFIType.void,
  },
  wgpuRenderPassEncoderSetIndexBuffer: {
    args: [FFIType.ptr, FFIType.ptr, FFIType.u32, FFIType.u64, FFIType.u64],
    returns: FFIType.void,
  },
  wgpuRenderPassEncoderDraw: {
    args: [FFIType.ptr, FFIType.u32, FFIType.u32, FFIType.u32, FFIType.u32],
    returns: FFIType.void,
  },
  wgpuRenderPassEncoderDrawIndexed: {
    args: [FFIType.ptr, FFIType.u32, FFIType.u32, FFIType.u32, FFIType.i32, FFIType.u32],
    returns: FFIType.void,
  },
  wgpuRenderPassEncoderSetViewport: {
    args: [
      FFIType.ptr,
      FFIType.f32,
      FFIType.f32,
      FFIType.f32,
      FFIType.f32,
      FFIType.f32,
      FFIType.f32,
    ],
    returns: FFIType.void,
  },
  wgpuRenderPassEncoderSetScissorRect: {
    args: [FFIType.ptr, FFIType.u32, FFIType.u32, FFIType.u32, FFIType.u32],
    returns: FFIType.void,
  },
  wgpuRenderPassEncoderSetBlendConstant: {
    args: [FFIType.ptr, FFIType.ptr], // color is a pointer to WGPUColor struct
    returns: FFIType.void,
  },
  wgpuRenderPassEncoderSetStencilReference: {
    args: [FFIType.ptr, FFIType.u32],
    returns: FFIType.void,
  },
  wgpuRenderPassEncoderDrawIndirect: {
    args: [FFIType.ptr, FFIType.ptr, FFIType.u64],
    returns: FFIType.void,
  },
  wgpuRenderPassEncoderDrawIndexedIndirect: {
    args: [FFIType.ptr, FFIType.ptr, FFIType.u64],
    returns: FFIType.void,
  },

  // ComputePassEncoder
  wgpuComputePassEncoderRelease: {
    args: [FFIType.ptr],
    returns: FFIType.void,
  },
  wgpuComputePassEncoderEnd: {
    args: [FFIType.ptr],
    returns: FFIType.void,
  },
  wgpuComputePassEncoderSetPipeline: {
    args: [FFIType.ptr, FFIType.ptr],
    returns: FFIType.void,
  },
  wgpuComputePassEncoderSetBindGroup: {
    args: [FFIType.ptr, FFIType.u32, FFIType.ptr, FFIType.u64, FFIType.ptr],
    returns: FFIType.void,
  },
  wgpuComputePassEncoderDispatchWorkgroups: {
    args: [FFIType.ptr, FFIType.u32, FFIType.u32, FFIType.u32],
    returns: FFIType.void,
  },
  wgpuComputePassEncoderDispatchWorkgroupsIndirect: {
    args: [FFIType.ptr, FFIType.ptr, FFIType.u64],
    returns: FFIType.void,
  },
  wgpuComputePassEncoderPushDebugGroup: {
    args: [FFIType.ptr, FFIType.ptr, FFIType.u64], // label as WGPUStringView (data, length)
    returns: FFIType.void,
  },
  wgpuComputePassEncoderPopDebugGroup: {
    args: [FFIType.ptr],
    returns: FFIType.void,
  },
  wgpuComputePassEncoderInsertDebugMarker: {
    args: [FFIType.ptr, FFIType.ptr, FFIType.u64], // label as WGPUStringView
    returns: FFIType.void,
  },

  // RenderPassEncoder debug
  wgpuRenderPassEncoderPushDebugGroup: {
    args: [FFIType.ptr, FFIType.ptr, FFIType.u64],
    returns: FFIType.void,
  },
  wgpuRenderPassEncoderPopDebugGroup: {
    args: [FFIType.ptr],
    returns: FFIType.void,
  },
  wgpuRenderPassEncoderInsertDebugMarker: {
    args: [FFIType.ptr, FFIType.ptr, FFIType.u64],
    returns: FFIType.void,
  },
  wgpuRenderPassEncoderBeginOcclusionQuery: {
    args: [FFIType.ptr, FFIType.u32],
    returns: FFIType.void,
  },
  wgpuRenderPassEncoderEndOcclusionQuery: {
    args: [FFIType.ptr],
    returns: FFIType.void,
  },
  wgpuRenderPassEncoderExecuteBundles: {
    args: [FFIType.ptr, FFIType.u64, FFIType.ptr],
    returns: FFIType.void,
  },

  // CommandEncoder debug
  wgpuCommandEncoderPushDebugGroup: {
    args: [FFIType.ptr, FFIType.ptr, FFIType.u64],
    returns: FFIType.void,
  },
  wgpuCommandEncoderPopDebugGroup: {
    args: [FFIType.ptr],
    returns: FFIType.void,
  },
  wgpuCommandEncoderInsertDebugMarker: {
    args: [FFIType.ptr, FFIType.ptr, FFIType.u64],
    returns: FFIType.void,
  },
  wgpuCommandEncoderResolveQuerySet: {
    args: [FFIType.ptr, FFIType.ptr, FFIType.u32, FFIType.u32, FFIType.ptr, FFIType.u64],
    returns: FFIType.void,
  },

  // Buffer mapping
  wgpuBufferMapAsync: {
    args: [FFIType.ptr, FFIType.u64, FFIType.u64, FFIType.u64, FFIType.ptr],
    returns: FFIType.void,
  },
});

// Buffer map mode
export const WGPUMapMode = {
  None: 0x00000000,
  Read: 0x00000001,
  Write: 0x00000002,
} as const;

// Helper to create a WGPUStringView struct
export function createStringView(str: string | null): Buffer {
  // WGPUStringView: { data: ptr, length: size_t }
  // On 64-bit: 8 bytes pointer + 8 bytes size_t = 16 bytes
  const buffer = Buffer.alloc(16);
  if (str === null) {
    buffer.writeBigUInt64LE(BigInt(0), 0); // data = NULL
    buffer.writeBigUInt64LE(WGPU_STRLEN, 8); // length = WGPU_STRLEN
  } else {
    const strBuffer = Buffer.from(str + "\0", "utf8");
    buffer.writeBigUInt64LE(BigInt(ptr(strBuffer)), 0);
    buffer.writeBigUInt64LE(BigInt(strBuffer.length - 1), 8); // exclude null terminator
  }
  return buffer;
}

// Helper to create a null WGPUStringView
export function nullStringView(): Buffer {
  const buffer = Buffer.alloc(16);
  buffer.writeBigUInt64LE(BigInt(0), 0);
  buffer.writeBigUInt64LE(WGPU_STRLEN, 8);
  return buffer;
}

// Export the raw lib for advanced usage
export const dawn = lib.symbols;
