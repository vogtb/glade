import { ptr, JSCallback, FFIType, type Pointer } from "bun:ffi";
import {
  WGPUSType,
  WGPUCallbackMode,
  WGPURequestAdapterStatus,
  WGPURequestDeviceStatus,
  WGPUTextureFormat,
  WGPUTextureUsage,
  WGPUPresentMode,
  WGPUCompositeAlphaMode,
  type WGPUInstance,
  type WGPUAdapter,
  dawn,
  WGPUBufferUsage,
  WGPUShaderStage,
  WGPUPrimitiveTopology,
  WGPUVertexFormat,
  WGPUVertexStepMode,
  WGPULoadOp,
  WGPUStoreOp,
  WGPUIndexFormat,
  type WGPUDevice,
  type WGPUQueue,
  type WGPUBuffer,
  type WGPUShaderModule,
  type WGPURenderPipeline,
  type WGPUBindGroup,
  type WGPUBindGroupLayout,
  type WGPUPipelineLayout,
  type WGPUCommandEncoder,
  type WGPUCommandBuffer,
  type WGPURenderPassEncoder,
  type WGPUComputePassEncoder,
  type WGPUComputePipeline,
  type WGPUTexture,
  type WGPUTextureView,
  type WGPUSurface,
  WGPUSurfaceGetCurrentTextureStatus,
} from "@glade/dawn";

// Buffer usage flag mapping
const bufferUsageMap: Record<number, number> = {
  0x0001: WGPUBufferUsage.MapRead, // GPUBufferUsage.MAP_READ
  0x0002: WGPUBufferUsage.MapWrite, // GPUBufferUsage.MAP_WRITE
  0x0004: WGPUBufferUsage.CopySrc, // GPUBufferUsage.COPY_SRC
  0x0008: WGPUBufferUsage.CopyDst, // GPUBufferUsage.COPY_DST
  0x0010: WGPUBufferUsage.Index, // GPUBufferUsage.INDEX
  0x0020: WGPUBufferUsage.Vertex, // GPUBufferUsage.VERTEX
  0x0040: WGPUBufferUsage.Uniform, // GPUBufferUsage.UNIFORM
  0x0080: WGPUBufferUsage.Storage, // GPUBufferUsage.STORAGE
  0x0100: WGPUBufferUsage.Indirect, // GPUBufferUsage.INDIRECT
  0x0200: WGPUBufferUsage.QueryResolve, // GPUBufferUsage.QUERY_RESOLVE
};

// Shader stage mapping
const shaderStageMap: Record<number, number> = {
  0x1: WGPUShaderStage.Vertex, // GPUShaderStage.VERTEX
  0x2: WGPUShaderStage.Fragment, // GPUShaderStage.FRAGMENT
  0x4: WGPUShaderStage.Compute, // GPUShaderStage.COMPUTE
};

// Vertex format mapping
const vertexFormatMap: Record<string, number> = {
  uint8x2: WGPUVertexFormat.Uint8x2,
  uint8x4: WGPUVertexFormat.Uint8x4,
  sint8x2: WGPUVertexFormat.Sint8x2,
  sint8x4: WGPUVertexFormat.Sint8x4,
  unorm8x2: WGPUVertexFormat.Unorm8x2,
  unorm8x4: WGPUVertexFormat.Unorm8x4,
  snorm8x2: WGPUVertexFormat.Snorm8x2,
  snorm8x4: WGPUVertexFormat.Snorm8x4,
  uint16x2: WGPUVertexFormat.Uint16x2,
  uint16x4: WGPUVertexFormat.Uint16x4,
  sint16x2: WGPUVertexFormat.Sint16x2,
  sint16x4: WGPUVertexFormat.Sint16x4,
  unorm16x2: WGPUVertexFormat.Unorm16x2,
  unorm16x4: WGPUVertexFormat.Unorm16x4,
  snorm16x2: WGPUVertexFormat.Snorm16x2,
  snorm16x4: WGPUVertexFormat.Snorm16x4,
  float16x2: WGPUVertexFormat.Float16x2,
  float16x4: WGPUVertexFormat.Float16x4,
  float32: WGPUVertexFormat.Float32,
  float32x2: WGPUVertexFormat.Float32x2,
  float32x3: WGPUVertexFormat.Float32x3,
  float32x4: WGPUVertexFormat.Float32x4,
  uint32: WGPUVertexFormat.Uint32,
  uint32x2: WGPUVertexFormat.Uint32x2,
  uint32x3: WGPUVertexFormat.Uint32x3,
  uint32x4: WGPUVertexFormat.Uint32x4,
  sint32: WGPUVertexFormat.Sint32,
  sint32x2: WGPUVertexFormat.Sint32x2,
  sint32x3: WGPUVertexFormat.Sint32x3,
  sint32x4: WGPUVertexFormat.Sint32x4,
};

// Step mode mapping
const stepModeMap: Record<string, number> = {
  vertex: WGPUVertexStepMode.Vertex,
  instance: WGPUVertexStepMode.Instance,
};

// Primitive topology mapping
const topologyMap: Record<string, number> = {
  "point-list": WGPUPrimitiveTopology.PointList,
  "line-list": WGPUPrimitiveTopology.LineList,
  "line-strip": WGPUPrimitiveTopology.LineStrip,
  "triangle-list": WGPUPrimitiveTopology.TriangleList,
  "triangle-strip": WGPUPrimitiveTopology.TriangleStrip,
};

// Load op mapping
const loadOpMap: Record<string, number> = {
  load: WGPULoadOp.Load,
  clear: WGPULoadOp.Clear,
};

// Store op mapping
const storeOpMap: Record<string, number> = {
  store: WGPUStoreOp.Store,
  discard: WGPUStoreOp.Discard,
};

// Index format mapping
const indexFormatMap: Record<string, number> = {
  uint16: WGPUIndexFormat.Uint16,
  uint32: WGPUIndexFormat.Uint32,
};

// Texture format mapping (from webgpu.h)
const textureFormatMap: Record<string, number> = {
  bgra8unorm: 0x0000001b, // WGPUTextureFormat_BGRA8Unorm
  "bgra8unorm-srgb": 0x0000001c, // WGPUTextureFormat_BGRA8UnormSrgb
  rgba8unorm: 0x00000016, // WGPUTextureFormat_RGBA8Unorm
  "rgba8unorm-srgb": 0x00000017, // WGPUTextureFormat_RGBA8UnormSrgb
  r8unorm: 0x00000001, // WGPUTextureFormat_R8Unorm
  rg8unorm: 0x0000000a, // WGPUTextureFormat_RG8Unorm
  rgba16float: 0x00000021, // WGPUTextureFormat_RGBA16Float
  rgba32float: 0x00000025, // WGPUTextureFormat_RGBA32Float
  depth24plus: 0x00000030, // WGPUTextureFormat_Depth24Plus
  depth32float: 0x00000032, // WGPUTextureFormat_Depth32Float
};

// Reverse texture format mapping (number -> string)
export const textureFormatToString: Record<number, string> = Object.fromEntries(
  Object.entries(textureFormatMap).map(([k, v]) => [v, k])
);

// Texture usage flag mapping (same as WebGPU spec)
const textureUsageMap: Record<number, number> = {
  0x01: 0x01, // COPY_SRC
  0x02: 0x02, // COPY_DST
  0x04: 0x04, // TEXTURE_BINDING
  0x08: 0x08, // STORAGE_BINDING
  0x10: 0x10, // RENDER_ATTACHMENT
};

// Texture dimension mapping
const textureDimensionMap: Record<string, number> = {
  "1d": 0x01, // WGPUTextureDimension_1D
  "2d": 0x02, // WGPUTextureDimension_2D
  "3d": 0x03, // WGPUTextureDimension_3D
};

// Address mode mapping for samplers
const addressModeMap: Record<string, number> = {
  "clamp-to-edge": 0x01, // WGPUAddressMode_ClampToEdge
  repeat: 0x02, // WGPUAddressMode_Repeat
  "mirror-repeat": 0x03, // WGPUAddressMode_MirrorRepeat
};

// Filter mode mapping for samplers
const filterModeMap: Record<string, number> = {
  nearest: 0x01, // WGPUFilterMode_Nearest
  linear: 0x02, // WGPUFilterMode_Linear
};

// Mipmap filter mode mapping
const mipmapFilterModeMap: Record<string, number> = {
  nearest: 0x01, // WGPUMipmapFilterMode_Nearest
  linear: 0x02, // WGPUMipmapFilterMode_Linear
};

// Compare function mapping
const compareFunctionMap: Record<string, number> = {
  never: 0x01,
  less: 0x02,
  equal: 0x03,
  "less-equal": 0x04,
  greater: 0x05,
  "not-equal": 0x06,
  "greater-equal": 0x07,
  always: 0x08,
};

// Texture aspect mapping
const textureAspectMap: Record<string, number> = {
  all: 0x01, // WGPUTextureAspect_All
  "stencil-only": 0x02, // WGPUTextureAspect_StencilOnly
  "depth-only": 0x03, // WGPUTextureAspect_DepthOnly
};

// Blend factor mapping (from WebGPU spec to Dawn)
const blendFactorMap: Record<string, number> = {
  zero: 0x01, // WGPUBlendFactor_Zero
  one: 0x02, // WGPUBlendFactor_One
  src: 0x03, // WGPUBlendFactor_Src
  "one-minus-src": 0x04, // WGPUBlendFactor_OneMinusSrc
  "src-alpha": 0x05, // WGPUBlendFactor_SrcAlpha
  "one-minus-src-alpha": 0x06, // WGPUBlendFactor_OneMinusSrcAlpha
  dst: 0x07, // WGPUBlendFactor_Dst
  "one-minus-dst": 0x08, // WGPUBlendFactor_OneMinusDst
  "dst-alpha": 0x09, // WGPUBlendFactor_DstAlpha
  "one-minus-dst-alpha": 0x0a, // WGPUBlendFactor_OneMinusDstAlpha
  "src-alpha-saturated": 0x0b, // WGPUBlendFactor_SrcAlphaSaturated
  constant: 0x0c, // WGPUBlendFactor_Constant
  "one-minus-constant": 0x0d, // WGPUBlendFactor_OneMinusConstant
};

// Blend operation mapping
const blendOperationMap: Record<string, number> = {
  add: 0x01, // WGPUBlendOperation_Add
  subtract: 0x02, // WGPUBlendOperation_Subtract
  "reverse-subtract": 0x03, // WGPUBlendOperation_ReverseSubtract
  min: 0x04, // WGPUBlendOperation_Min
  max: 0x05, // WGPUBlendOperation_Max
};

function convertBufferUsage(usage: number): number {
  let result = 0;
  for (const [webgpuFlag, dawnFlag] of Object.entries(bufferUsageMap)) {
    if (usage & Number(webgpuFlag)) {
      result |= dawnFlag;
    }
  }
  return result;
}

function convertTextureUsage(usage: number): number {
  let result = 0;
  for (const [webgpuFlag, dawnFlag] of Object.entries(textureUsageMap)) {
    if (usage & Number(webgpuFlag)) {
      result |= dawnFlag;
    }
  }
  return result;
}

function convertShaderStage(stage: number): number {
  let result = 0;
  for (const [webgpuFlag, dawnFlag] of Object.entries(shaderStageMap)) {
    if (stage & Number(webgpuFlag)) {
      result |= dawnFlag;
    }
  }
  return result;
}

/**
 * Wrapped GPUBuffer for Dawn
 */
export class DawnGPUBuffer {
  readonly label: string;
  readonly size: number;
  readonly usage: number;
  readonly mapState: string = "unmapped";

  constructor(
    public readonly _handle: WGPUBuffer,
    descriptor: { label?: string; size: number; usage: number; mappedAtCreation?: boolean }
  ) {
    this.label = descriptor.label ?? "";
    this.size = descriptor.size;
    this.usage = descriptor.usage;
  }

  getMappedRange(_offset?: number, _size?: number): ArrayBuffer {
    throw new Error("getMappedRange not implemented");
  }

  async mapAsync(_mode: number, _offset?: number, _size?: number): Promise<undefined> {
    throw new Error("mapAsync not implemented");
  }

  unmap() {
    dawn.wgpuBufferUnmap(this._handle);
  }

  destroy() {
    dawn.wgpuBufferDestroy(this._handle);
  }
}

/**
 * Wrapped GPUShaderModule for Dawn
 */
export class DawnGPUShaderModule {
  readonly label: string;

  constructor(
    public readonly _handle: WGPUShaderModule,
    label?: string
  ) {
    this.label = label ?? "";
  }

  getCompilationInfo(): Promise<GPUCompilationInfo> {
    throw new Error("getCompilationInfo not implemented");
  }
}

/**
 * Wrapped GPUBindGroupLayout for Dawn
 */
export class DawnGPUBindGroupLayout {
  readonly label: string;

  constructor(
    public readonly _handle: WGPUBindGroupLayout,
    label?: string
  ) {
    this.label = label ?? "";
  }
}

/**
 * Wrapped GPUBindGroup for Dawn
 */
export class DawnGPUBindGroup {
  readonly label: string;

  constructor(
    public readonly _handle: WGPUBindGroup,
    label?: string
  ) {
    this.label = label ?? "";
  }
}

/**
 * Wrapped GPUPipelineLayout for Dawn
 */
export class DawnGPUPipelineLayout {
  readonly label: string;

  constructor(
    public readonly _handle: WGPUPipelineLayout,
    label?: string
  ) {
    this.label = label ?? "";
  }
}

/**
 * Wrapped GPURenderPipeline for Dawn
 */
export class DawnGPURenderPipeline {
  readonly label: string;

  constructor(
    public readonly _handle: WGPURenderPipeline,
    label?: string
  ) {
    this.label = label ?? "";
  }

  getBindGroupLayout(index: number): DawnGPUBindGroupLayout {
    const handle = dawn.wgpuRenderPipelineGetBindGroupLayout(this._handle, index);
    return new DawnGPUBindGroupLayout(handle!);
  }
}

/**
 * Wrapped GPUComputePipeline for Dawn
 */
export class DawnGPUComputePipeline {
  readonly label: string;

  constructor(
    public readonly _handle: WGPUComputePipeline,
    label?: string
  ) {
    this.label = label ?? "";
  }

  getBindGroupLayout(index: number): DawnGPUBindGroupLayout {
    const handle = dawn.wgpuComputePipelineGetBindGroupLayout(this._handle, index);
    return new DawnGPUBindGroupLayout(handle!);
  }
}

/**
 * Wrapped GPUCommandBuffer for Dawn
 */
export class DawnGPUCommandBuffer {
  readonly label: string;

  constructor(
    public readonly _handle: WGPUCommandBuffer,
    label?: string
  ) {
    this.label = label ?? "";
  }
}

/**
 * Wrapped GPUTextureView for Dawn
 */
export class DawnGPUTextureView {
  readonly label: string;

  constructor(
    public readonly _handle: WGPUTextureView,
    label?: string
  ) {
    this.label = label ?? "";
  }
}

/**
 * Wrapped GPUSampler for Dawn
 */
export class DawnGPUSampler {
  readonly label: string;

  constructor(
    public readonly _handle: Pointer,
    label?: string
  ) {
    this.label = label ?? "";
  }
}

/**
 * Wrapped GPURenderPassEncoder for Dawn
 */
export class DawnGPURenderPassEncoder {
  readonly label: string;

  constructor(
    public readonly _handle: WGPURenderPassEncoder,
    label?: string
  ) {
    this.label = label ?? "";
  }

  setPipeline(pipeline: DawnGPURenderPipeline) {
    dawn.wgpuRenderPassEncoderSetPipeline(this._handle, pipeline._handle);
  }

  setVertexBuffer(slot: number, buffer: DawnGPUBuffer | null, offset?: number, size?: number) {
    if (!buffer) {
      return;
    }
    const bufferSize = size ?? buffer.size - (offset ?? 0);
    dawn.wgpuRenderPassEncoderSetVertexBuffer(
      this._handle,
      slot,
      buffer._handle,
      BigInt(offset ?? 0),
      BigInt(bufferSize)
    );
  }

  setIndexBuffer(buffer: DawnGPUBuffer, indexFormat: string, offset?: number, size?: number) {
    const bufferSize = size ?? buffer.size - (offset ?? 0);
    dawn.wgpuRenderPassEncoderSetIndexBuffer(
      this._handle,
      buffer._handle,
      indexFormatMap[indexFormat] ?? WGPUIndexFormat.Uint16,
      BigInt(offset ?? 0),
      BigInt(bufferSize)
    );
  }

  setBindGroup(
    index: number,
    bindGroup: DawnGPUBindGroup | null,
    dynamicOffsets?: Iterable<number>
  ) {
    if (!bindGroup) {
      return;
    }
    const offsets = dynamicOffsets ? Array.from(dynamicOffsets) : [];
    const offsetsBuffer = offsets.length > 0 ? new Uint32Array(offsets) : null;
    dawn.wgpuRenderPassEncoderSetBindGroup(
      this._handle,
      index,
      bindGroup._handle,
      BigInt(offsets.length),
      offsetsBuffer ? ptr(offsetsBuffer) : null
    );
  }

  draw(vertexCount: number, instanceCount?: number, firstVertex?: number, firstInstance?: number) {
    dawn.wgpuRenderPassEncoderDraw(
      this._handle,
      vertexCount,
      instanceCount ?? 1,
      firstVertex ?? 0,
      firstInstance ?? 0
    );
  }

  drawIndexed(
    indexCount: number,
    instanceCount?: number,
    firstIndex?: number,
    baseVertex?: number,
    firstInstance?: number
  ) {
    dawn.wgpuRenderPassEncoderDrawIndexed(
      this._handle,
      indexCount,
      instanceCount ?? 1,
      firstIndex ?? 0,
      baseVertex ?? 0,
      firstInstance ?? 0
    );
  }

  setViewport(
    x: number,
    y: number,
    width: number,
    height: number,
    minDepth: number,
    maxDepth: number
  ) {
    dawn.wgpuRenderPassEncoderSetViewport(this._handle, x, y, width, height, minDepth, maxDepth);
  }

  setScissorRect(x: number, y: number, width: number, height: number) {
    dawn.wgpuRenderPassEncoderSetScissorRect(this._handle, x, y, width, height);
  }

  end() {
    dawn.wgpuRenderPassEncoderEnd(this._handle);
  }

  // Stubs for other methods
  setBlendConstant(color: GPUColor) {
    // WGPUColor struct: { r: f64, g: f64, b: f64, a: f64 } = 32 bytes
    const colorBuffer = Buffer.alloc(32);
    const colorDict = color as { r: number; g: number; b: number; a: number };
    colorBuffer.writeDoubleLE(colorDict.r, 0);
    colorBuffer.writeDoubleLE(colorDict.g, 8);
    colorBuffer.writeDoubleLE(colorDict.b, 16);
    colorBuffer.writeDoubleLE(colorDict.a, 24);
    dawn.wgpuRenderPassEncoderSetBlendConstant(this._handle, ptr(colorBuffer));
  }
  setStencilReference(reference: number) {
    dawn.wgpuRenderPassEncoderSetStencilReference(this._handle, reference);
  }
  beginOcclusionQuery(_queryIndex: number) {
    // TODO implement
  }
  endOcclusionQuery() {
    // TODO implement
  }
  executeBundles(_bundles: Iterable<GPURenderBundle>) {
    // TODO implement
  }
  drawIndirect(indirectBuffer: DawnGPUBuffer, indirectOffset: number) {
    dawn.wgpuRenderPassEncoderDrawIndirect(
      this._handle,
      indirectBuffer._handle,
      BigInt(indirectOffset)
    );
  }
  drawIndexedIndirect(indirectBuffer: DawnGPUBuffer, indirectOffset: number) {
    dawn.wgpuRenderPassEncoderDrawIndexedIndirect(
      this._handle,
      indirectBuffer._handle,
      BigInt(indirectOffset)
    );
  }
  pushDebugGroup(_groupLabel: string) {
    // TODO implement
  }
  popDebugGroup() {
    // TODO implement
  }
  insertDebugMarker(_markerLabel: string) {
    // TODO implement
  }
}

/**
 * Wrapped GPUComputePassEncoder for Dawn
 */
export class DawnGPUComputePassEncoder {
  readonly label: string;

  constructor(
    public readonly _handle: WGPUComputePassEncoder,
    label?: string
  ) {
    this.label = label ?? "";
  }

  setPipeline(pipeline: DawnGPUComputePipeline) {
    dawn.wgpuComputePassEncoderSetPipeline(this._handle, pipeline._handle);
  }

  setBindGroup(
    index: number,
    bindGroup: DawnGPUBindGroup | null,
    dynamicOffsets?: Iterable<number>
  ) {
    if (!bindGroup) {
      return;
    }
    const offsets = dynamicOffsets ? Array.from(dynamicOffsets) : [];
    const offsetsBuffer = offsets.length > 0 ? new Uint32Array(offsets) : null;
    dawn.wgpuComputePassEncoderSetBindGroup(
      this._handle,
      index,
      bindGroup._handle,
      BigInt(offsets.length),
      offsetsBuffer ? ptr(offsetsBuffer) : null
    );
  }

  dispatchWorkgroups(workgroupCountX: number, workgroupCountY?: number, workgroupCountZ?: number) {
    dawn.wgpuComputePassEncoderDispatchWorkgroups(
      this._handle,
      workgroupCountX,
      workgroupCountY ?? 1,
      workgroupCountZ ?? 1
    );
  }

  dispatchWorkgroupsIndirect(_indirectBuffer: DawnGPUBuffer, _indirectOffset: number) {
    // TODO implement - would need wgpuComputePassEncoderDispatchWorkgroupsIndirect
    throw new Error("dispatchWorkgroupsIndirect not implemented");
  }

  end() {
    dawn.wgpuComputePassEncoderEnd(this._handle);
  }

  pushDebugGroup(_groupLabel: string) {
    // TODO implement
  }

  popDebugGroup() {
    // TODO implement
  }

  insertDebugMarker(_markerLabel: string) {
    // TODO implement
  }
}

/**
 * Wrapped GPUCommandEncoder for Dawn
 */
export class DawnGPUCommandEncoder {
  readonly label: string;

  constructor(
    public readonly _handle: WGPUCommandEncoder,
    label?: string
  ) {
    this.label = label ?? "";
  }

  beginRenderPass(descriptor: GPURenderPassDescriptor): DawnGPURenderPassEncoder {
    // Build the render pass descriptor struct
    const colorAttachments = Array.from(descriptor.colorAttachments);
    const numColorAttachments = colorAttachments.length;

    // WGPURenderPassColorAttachment size
    const colorAttachmentSize = 72;
    const colorAttachmentsBuffer = Buffer.alloc(colorAttachmentSize * numColorAttachments);

    for (let i = 0; i < numColorAttachments; i++) {
      const attachment = colorAttachments[i]!;
      const offset = i * colorAttachmentSize;

      // WGPURenderPassColorAttachment struct layout:
      // { nextInChain: ptr(8), view: ptr(8), depthSlice: u32(4), padding(4),
      //   resolveTarget: ptr(8), loadOp: u32(4), storeOp: u32(4), clearValue: WGPUColor(32) }
      // WGPUColor: { r: f64, g: f64, b: f64, a: f64 }
      // Total: 72 bytes

      const view = attachment.view as unknown as DawnGPUTextureView;
      colorAttachmentsBuffer.writeBigUInt64LE(BigInt(0), offset); // nextInChain = NULL
      colorAttachmentsBuffer.writeBigUInt64LE(
        BigInt(view._handle as unknown as number),
        offset + 8
      ); // view
      colorAttachmentsBuffer.writeUInt32LE(0xffffffff, offset + 16); // depthSlice = WGPU_DEPTH_SLICE_UNDEFINED
      // offset + 20: 4 bytes padding
      colorAttachmentsBuffer.writeBigUInt64LE(BigInt(0), offset + 24); // resolveTarget = NULL
      colorAttachmentsBuffer.writeUInt32LE(
        loadOpMap[attachment.loadOp] ?? WGPULoadOp.Clear,
        offset + 32
      ); // loadOp
      colorAttachmentsBuffer.writeUInt32LE(
        storeOpMap[attachment.storeOp] ?? WGPUStoreOp.Store,
        offset + 36
      ); // storeOp

      // Clear value (r, g, b, a as f64) - WGPUColor at offset 40
      const clearValue = attachment.clearValue as
        | { r: number; g: number; b: number; a: number }
        | undefined;
      if (clearValue) {
        colorAttachmentsBuffer.writeDoubleLE(clearValue.r, offset + 40);
        colorAttachmentsBuffer.writeDoubleLE(clearValue.g, offset + 48);
        colorAttachmentsBuffer.writeDoubleLE(clearValue.b, offset + 56);
        colorAttachmentsBuffer.writeDoubleLE(clearValue.a, offset + 64);
      }
    }

    // Build depth stencil attachment if provided
    let depthStencilAttachmentBuffer: Buffer | null = null;
    if (descriptor.depthStencilAttachment) {
      const dsa = descriptor.depthStencilAttachment;
      // WGPURenderPassDepthStencilAttachment struct layout (48 bytes):
      // { nextInChain: ptr(8), view: ptr(8), depthLoadOp: u32(4), depthStoreOp: u32(4),
      //   depthClearValue: f32(4), depthReadOnly: u32(4), stencilLoadOp: u32(4),
      //   stencilStoreOp: u32(4), stencilClearValue: u32(4), stencilReadOnly: u32(4) }
      depthStencilAttachmentBuffer = Buffer.alloc(48);
      depthStencilAttachmentBuffer.writeBigUInt64LE(BigInt(0), 0); // nextInChain = NULL
      const dsaView = dsa.view as unknown as DawnGPUTextureView;
      depthStencilAttachmentBuffer.writeBigUInt64LE(
        BigInt(dsaView._handle as unknown as number),
        8
      ); // view
      depthStencilAttachmentBuffer.writeUInt32LE(
        loadOpMap[dsa.depthLoadOp ?? "load"] ?? WGPULoadOp.Load,
        16
      ); // depthLoadOp
      depthStencilAttachmentBuffer.writeUInt32LE(
        storeOpMap[dsa.depthStoreOp ?? "store"] ?? WGPUStoreOp.Store,
        20
      ); // depthStoreOp
      depthStencilAttachmentBuffer.writeFloatLE(dsa.depthClearValue ?? 1.0, 24); // depthClearValue
      depthStencilAttachmentBuffer.writeUInt32LE(dsa.depthReadOnly ? 1 : 0, 28); // depthReadOnly
      // stencilLoadOp/stencilStoreOp: use Undefined (0) if not specified (for depth-only formats)
      depthStencilAttachmentBuffer.writeUInt32LE(
        dsa.stencilLoadOp ? (loadOpMap[dsa.stencilLoadOp] ?? 0) : 0,
        32
      ); // stencilLoadOp (0 = Undefined)
      depthStencilAttachmentBuffer.writeUInt32LE(
        dsa.stencilStoreOp ? (storeOpMap[dsa.stencilStoreOp] ?? 0) : 0,
        36
      ); // stencilStoreOp (0 = Undefined)
      depthStencilAttachmentBuffer.writeUInt32LE(dsa.stencilClearValue ?? 0, 40); // stencilClearValue
      depthStencilAttachmentBuffer.writeUInt32LE(dsa.stencilReadOnly ? 1 : 0, 44); // stencilReadOnly
    }

    // WGPURenderPassDescriptor struct
    const descriptorBuffer = Buffer.alloc(80);
    descriptorBuffer.writeBigUInt64LE(BigInt(0), 0); // nextInChain
    descriptorBuffer.writeBigUInt64LE(BigInt(0), 8); // label.data = NULL
    descriptorBuffer.writeBigUInt64LE(BigInt("0xFFFFFFFFFFFFFFFF"), 16); // label.length = WGPU_STRLEN
    descriptorBuffer.writeBigUInt64LE(BigInt(numColorAttachments), 24); // colorAttachmentCount
    descriptorBuffer.writeBigUInt64LE(BigInt(ptr(colorAttachmentsBuffer)), 32); // colorAttachments
    descriptorBuffer.writeBigUInt64LE(
      depthStencilAttachmentBuffer ? BigInt(ptr(depthStencilAttachmentBuffer)) : BigInt(0),
      40
    ); // depthStencilAttachment
    descriptorBuffer.writeBigUInt64LE(BigInt(0), 48); // occlusionQuerySet = NULL
    descriptorBuffer.writeBigUInt64LE(BigInt(0), 56); // timestampWrites = NULL

    const renderPass = dawn.wgpuCommandEncoderBeginRenderPass(this._handle, ptr(descriptorBuffer));
    return new DawnGPURenderPassEncoder(renderPass!);
  }

  finish(descriptor?: { label?: string }): DawnGPUCommandBuffer {
    const descBuffer = Buffer.alloc(32);
    descBuffer.writeBigUInt64LE(BigInt(0), 0); // nextInChain
    descBuffer.writeBigUInt64LE(BigInt(0), 8); // label.data
    descBuffer.writeBigUInt64LE(BigInt("0xFFFFFFFFFFFFFFFF"), 16); // label.length

    const commandBuffer = dawn.wgpuCommandEncoderFinish(this._handle, ptr(descBuffer));
    return new DawnGPUCommandBuffer(commandBuffer!, descriptor?.label);
  }

  beginComputePass(descriptor?: GPUComputePassDescriptor): DawnGPUComputePassEncoder {
    // WGPUComputePassDescriptor struct layout:
    // { nextInChain: ptr(8), label: WGPUStringView(16), timestampWrites: ptr(8) }
    // Total: 32 bytes
    const descBuffer = Buffer.alloc(32);
    descBuffer.writeBigUInt64LE(BigInt(0), 0); // nextInChain = NULL
    descBuffer.writeBigUInt64LE(BigInt(0), 8); // label.data = NULL
    descBuffer.writeBigUInt64LE(BigInt("0xFFFFFFFFFFFFFFFF"), 16); // label.length = WGPU_STRLEN
    descBuffer.writeBigUInt64LE(BigInt(0), 24); // timestampWrites = NULL

    const computePass = dawn.wgpuCommandEncoderBeginComputePass(this._handle, ptr(descBuffer));
    if (!computePass) {
      throw new Error("Failed to begin compute pass");
    }
    return new DawnGPUComputePassEncoder(computePass, descriptor?.label);
  }

  copyBufferToBuffer(
    source: DawnGPUBuffer,
    sourceOffset: number,
    destination: DawnGPUBuffer,
    destinationOffset: number,
    size: number
  ) {
    dawn.wgpuCommandEncoderCopyBufferToBuffer(
      this._handle,
      source._handle,
      BigInt(sourceOffset),
      destination._handle,
      BigInt(destinationOffset),
      BigInt(size)
    );
  }
  copyBufferToTexture(
    source: GPUTexelCopyBufferInfo,
    destination: GPUTexelCopyTextureInfo,
    copySize: GPUExtent3DStrict
  ) {
    // WGPUTexelCopyBufferInfo struct layout:
    // { nextInChain: ptr @0, layout: WGPUTexelCopyBufferLayout @8 (16 bytes), buffer: ptr @24 }
    // WGPUTexelCopyBufferLayout: { offset: u64 @0, bytesPerRow: u32 @8, rowsPerImage: u32 @12 }
    // Total: 32 bytes
    const srcBuffer = Buffer.alloc(32);
    srcBuffer.writeBigUInt64LE(BigInt(0), 0); // nextInChain
    srcBuffer.writeBigUInt64LE(BigInt(source.offset ?? 0), 8); // layout.offset
    srcBuffer.writeUInt32LE(source.bytesPerRow ?? 0, 16); // layout.bytesPerRow
    srcBuffer.writeUInt32LE(source.rowsPerImage ?? 0, 20); // layout.rowsPerImage
    const buffer = source.buffer as unknown as DawnGPUBuffer;
    srcBuffer.writeBigUInt64LE(BigInt(buffer._handle as unknown as number), 24); // buffer

    // WGPUTexelCopyTextureInfo struct layout:
    // { texture: ptr @0, mipLevel: u32 @8, origin: WGPUOrigin3D @12 (3 x u32), aspect: u32 @24 }
    // Total: 28 bytes, padded to 32
    const destBuffer = Buffer.alloc(32);
    const texture = destination.texture as unknown as DawnGPUTexture;
    destBuffer.writeBigUInt64LE(BigInt(texture._handle as unknown as number), 0);
    destBuffer.writeUInt32LE(destination.mipLevel ?? 0, 8);
    const origin = destination.origin as GPUOrigin3DDict | undefined;
    destBuffer.writeUInt32LE(origin?.x ?? 0, 12);
    destBuffer.writeUInt32LE(origin?.y ?? 0, 16);
    destBuffer.writeUInt32LE(origin?.z ?? 0, 20);
    destBuffer.writeUInt32LE(textureAspectMap[destination.aspect ?? "all"] ?? 0x01, 24);

    // WGPUExtent3D struct layout: { width: u32, height: u32, depthOrArrayLayers: u32 }
    const extentBuffer = Buffer.alloc(12);
    const sizeDict = copySize as GPUExtent3DDict;
    extentBuffer.writeUInt32LE(sizeDict.width, 0);
    extentBuffer.writeUInt32LE(sizeDict.height ?? 1, 4);
    extentBuffer.writeUInt32LE(sizeDict.depthOrArrayLayers ?? 1, 8);

    dawn.wgpuCommandEncoderCopyBufferToTexture(
      this._handle,
      ptr(srcBuffer),
      ptr(destBuffer),
      ptr(extentBuffer)
    );
  }
  copyTextureToBuffer(
    source: GPUTexelCopyTextureInfo,
    destination: GPUTexelCopyBufferInfo,
    copySize: GPUExtent3DStrict
  ) {
    // WGPUTexelCopyTextureInfo struct layout
    const srcBuffer = Buffer.alloc(32);
    const texture = source.texture as unknown as DawnGPUTexture;
    srcBuffer.writeBigUInt64LE(BigInt(texture._handle as unknown as number), 0);
    srcBuffer.writeUInt32LE(source.mipLevel ?? 0, 8);
    const origin = source.origin as GPUOrigin3DDict | undefined;
    srcBuffer.writeUInt32LE(origin?.x ?? 0, 12);
    srcBuffer.writeUInt32LE(origin?.y ?? 0, 16);
    srcBuffer.writeUInt32LE(origin?.z ?? 0, 20);
    srcBuffer.writeUInt32LE(textureAspectMap[source.aspect ?? "all"] ?? 0x01, 24);

    // WGPUTexelCopyBufferInfo struct layout
    const destBuffer = Buffer.alloc(32);
    destBuffer.writeBigUInt64LE(BigInt(0), 0); // nextInChain
    destBuffer.writeBigUInt64LE(BigInt(destination.offset ?? 0), 8); // layout.offset
    destBuffer.writeUInt32LE(destination.bytesPerRow ?? 0, 16); // layout.bytesPerRow
    destBuffer.writeUInt32LE(destination.rowsPerImage ?? 0, 20); // layout.rowsPerImage
    const buffer = destination.buffer as unknown as DawnGPUBuffer;
    destBuffer.writeBigUInt64LE(BigInt(buffer._handle as unknown as number), 24); // buffer

    // WGPUExtent3D struct layout
    const extentBuffer = Buffer.alloc(12);
    const sizeDict = copySize as GPUExtent3DDict;
    extentBuffer.writeUInt32LE(sizeDict.width, 0);
    extentBuffer.writeUInt32LE(sizeDict.height ?? 1, 4);
    extentBuffer.writeUInt32LE(sizeDict.depthOrArrayLayers ?? 1, 8);

    dawn.wgpuCommandEncoderCopyTextureToBuffer(
      this._handle,
      ptr(srcBuffer),
      ptr(destBuffer),
      ptr(extentBuffer)
    );
  }
  copyTextureToTexture(
    source: GPUTexelCopyTextureInfo,
    destination: GPUTexelCopyTextureInfo,
    copySize: GPUExtent3DStrict
  ) {
    // WGPUTexelCopyTextureInfo struct layout for source
    const srcBuffer = Buffer.alloc(32);
    const srcTexture = source.texture as unknown as DawnGPUTexture;
    srcBuffer.writeBigUInt64LE(BigInt(srcTexture._handle as unknown as number), 0);
    srcBuffer.writeUInt32LE(source.mipLevel ?? 0, 8);
    const srcOrigin = source.origin as GPUOrigin3DDict | undefined;
    srcBuffer.writeUInt32LE(srcOrigin?.x ?? 0, 12);
    srcBuffer.writeUInt32LE(srcOrigin?.y ?? 0, 16);
    srcBuffer.writeUInt32LE(srcOrigin?.z ?? 0, 20);
    srcBuffer.writeUInt32LE(textureAspectMap[source.aspect ?? "all"] ?? 0x01, 24);

    // WGPUTexelCopyTextureInfo struct layout for destination
    const destBuffer = Buffer.alloc(32);
    const destTexture = destination.texture as unknown as DawnGPUTexture;
    destBuffer.writeBigUInt64LE(BigInt(destTexture._handle as unknown as number), 0);
    destBuffer.writeUInt32LE(destination.mipLevel ?? 0, 8);
    const destOrigin = destination.origin as GPUOrigin3DDict | undefined;
    destBuffer.writeUInt32LE(destOrigin?.x ?? 0, 12);
    destBuffer.writeUInt32LE(destOrigin?.y ?? 0, 16);
    destBuffer.writeUInt32LE(destOrigin?.z ?? 0, 20);
    destBuffer.writeUInt32LE(textureAspectMap[destination.aspect ?? "all"] ?? 0x01, 24);

    // WGPUExtent3D struct layout
    const extentBuffer = Buffer.alloc(12);
    const sizeDict = copySize as GPUExtent3DDict;
    extentBuffer.writeUInt32LE(sizeDict.width, 0);
    extentBuffer.writeUInt32LE(sizeDict.height ?? 1, 4);
    extentBuffer.writeUInt32LE(sizeDict.depthOrArrayLayers ?? 1, 8);

    dawn.wgpuCommandEncoderCopyTextureToTexture(
      this._handle,
      ptr(srcBuffer),
      ptr(destBuffer),
      ptr(extentBuffer)
    );
  }
  clearBuffer(buffer: DawnGPUBuffer, offset?: number, size?: number) {
    dawn.wgpuCommandEncoderClearBuffer(
      this._handle,
      buffer._handle,
      BigInt(offset ?? 0),
      BigInt(size ?? buffer.size)
    );
  }
  resolveQuerySet(
    _querySet: GPUQuerySet,
    _firstQuery: number,
    _queryCount: number,
    _destination: DawnGPUBuffer,
    _destinationOffset: number
  ) {
    // TODO implement
  }
  pushDebugGroup(_groupLabel: string) {
    // TODO implement
  }
  popDebugGroup() {
    // TODO implement
  }
  insertDebugMarker(_markerLabel: string) {
    // TODO implement
  }
}

/**
 * Wrapped GPUTexture for Dawn
 */
export class DawnGPUTexture {
  readonly label: string;
  readonly width: number;
  readonly height: number;
  readonly depthOrArrayLayers: number = 1;
  readonly mipLevelCount: number = 1;
  readonly sampleCount: number = 1;
  readonly dimension: string = "2d";
  readonly format: string;
  readonly usage: number = 0;

  constructor(
    public readonly _handle: WGPUTexture,
    format: string,
    label?: string
  ) {
    this.label = label ?? "";
    this.format = format;
    this.width = dawn.wgpuTextureGetWidth(this._handle);
    this.height = dawn.wgpuTextureGetHeight(this._handle);
  }

  createView(_descriptor?: GPUTextureViewDescriptor): DawnGPUTextureView {
    const view = createTextureView(this._handle);
    return new DawnGPUTextureView(view);
  }

  destroy() {
    releaseTexture(this._handle);
  }
}

/**
 * Wrapped GPUQueue for Dawn
 */
export class DawnGPUQueue {
  readonly label: string = "";

  constructor(public readonly _handle: WGPUQueue) {}

  submit(commandBuffers: Iterable<DawnGPUCommandBuffer>) {
    const buffers = Array.from(commandBuffers);
    if (buffers.length === 0) {
      return;
    }

    // Create array of command buffer handles
    const handles = new BigUint64Array(buffers.length);
    for (let i = 0; i < buffers.length; i++) {
      handles[i] = BigInt(buffers[i]!._handle as unknown as number);
    }

    dawn.wgpuQueueSubmit(this._handle, BigInt(buffers.length), ptr(handles));
  }

  writeBuffer(
    buffer: DawnGPUBuffer,
    bufferOffset: number,
    data: BufferSource,
    dataOffset?: number,
    size?: number
  ) {
    let dataView: Uint8Array;

    if (data instanceof ArrayBuffer) {
      // For ArrayBuffer, dataOffset and size are in bytes
      const byteOffset = dataOffset ?? 0;
      const dataSize = size ?? data.byteLength - byteOffset;
      dataView = new Uint8Array(data, byteOffset, dataSize);
    } else if (ArrayBuffer.isView(data)) {
      // For TypedArrays, dataOffset and size are in ELEMENTS, not bytes!
      // This matches the WebGPU spec behavior
      const bytesPerElement = (data as unknown as { BYTES_PER_ELEMENT: number }).BYTES_PER_ELEMENT;
      const elementOffset = dataOffset ?? 0;
      const elementCount = size ?? data.byteLength / bytesPerElement - elementOffset;
      const byteOffset = data.byteOffset + elementOffset * bytesPerElement;
      const byteSize = elementCount * bytesPerElement;
      dataView = new Uint8Array(data.buffer as ArrayBuffer, byteOffset, byteSize);
    } else {
      throw new Error("Invalid data type for writeBuffer");
    }

    dawn.wgpuQueueWriteBuffer(
      this._handle,
      buffer._handle,
      BigInt(bufferOffset),
      ptr(dataView),
      BigInt(dataView.byteLength)
    );
  }

  writeTexture(
    destination: GPUTexelCopyTextureInfo,
    data: BufferSource,
    dataLayout: GPUTexelCopyBufferLayout,
    size: GPUExtent3DStrict
  ) {
    // WGPUTexelCopyTextureInfo struct layout:
    // { texture: ptr @0, mipLevel: u32 @8, origin: WGPUOrigin3D @12 (3 x u32), aspect: u32 @24 }
    // Total: 28 bytes, padded to 32
    const destBuffer = Buffer.alloc(32);
    const texture = destination.texture as unknown as DawnGPUTexture;
    destBuffer.writeBigUInt64LE(BigInt(texture._handle as unknown as number), 0);
    destBuffer.writeUInt32LE(destination.mipLevel ?? 0, 8);
    // origin
    const origin = destination.origin as GPUOrigin3DDict | undefined;
    destBuffer.writeUInt32LE(origin?.x ?? 0, 12);
    destBuffer.writeUInt32LE(origin?.y ?? 0, 16);
    destBuffer.writeUInt32LE(origin?.z ?? 0, 20);
    destBuffer.writeUInt32LE(textureAspectMap[destination.aspect ?? "all"] ?? 0x01, 24);

    // WGPUTexelCopyBufferLayout struct layout:
    // { offset: u64 @0, bytesPerRow: u32 @8, rowsPerImage: u32 @12 }
    // Total: 16 bytes
    const layoutBuffer = Buffer.alloc(16);
    layoutBuffer.writeBigUInt64LE(BigInt(dataLayout.offset ?? 0), 0);
    layoutBuffer.writeUInt32LE(dataLayout.bytesPerRow ?? 0, 8);
    layoutBuffer.writeUInt32LE(dataLayout.rowsPerImage ?? 0, 12);

    // WGPUExtent3D struct layout: { width: u32, height: u32, depthOrArrayLayers: u32 }
    const extentBuffer = Buffer.alloc(12);
    const sizeDict = size as GPUExtent3DDict;
    extentBuffer.writeUInt32LE(sizeDict.width, 0);
    extentBuffer.writeUInt32LE(sizeDict.height ?? 1, 4);
    extentBuffer.writeUInt32LE(sizeDict.depthOrArrayLayers ?? 1, 8);

    // Get data as buffer
    let dataView: Uint8Array;
    if (data instanceof ArrayBuffer) {
      dataView = new Uint8Array(data);
    } else {
      dataView = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
    }

    dawn.wgpuQueueWriteTexture(
      this._handle,
      ptr(destBuffer),
      ptr(Buffer.from(dataView)),
      BigInt(dataView.byteLength),
      ptr(layoutBuffer),
      ptr(extentBuffer)
    );
  }
  copyExternalImageToTexture(
    _source: GPUCopyExternalImageSourceInfo,
    _destination: GPUCopyExternalImageDestInfo,
    _copySize: GPUExtent3DStrict
  ) {
    // TODO implement
  }
  onSubmittedWorkDone(): Promise<undefined> {
    return new Promise((resolve) => {
      // Create callback for work done notification
      const callback = new JSCallback(
        (_status: number, _userdata1: number, _userdata2: number) => {
          callback.close();
          resolve(undefined);
        },
        {
          args: [FFIType.u32, FFIType.ptr, FFIType.ptr],
          returns: FFIType.void,
        }
      );

      // WGPUQueueWorkDoneCallbackInfo struct layout:
      // { nextInChain: ptr(8), mode: u32(4), padding(4), callback: ptr(8), userdata1: ptr(8), userdata2: ptr(8) }
      // Total: 40 bytes
      const callbackInfo = Buffer.alloc(40);
      callbackInfo.writeBigUInt64LE(BigInt(0), 0); // nextInChain = NULL
      callbackInfo.writeUInt32LE(WGPUCallbackMode.AllowSpontaneous, 8); // mode
      // offset 12: 4 bytes padding
      callbackInfo.writeBigUInt64LE(BigInt(callback.ptr!), 16); // callback
      callbackInfo.writeBigUInt64LE(BigInt(0), 24); // userdata1
      callbackInfo.writeBigUInt64LE(BigInt(0), 32); // userdata2

      dawn.wgpuQueueOnSubmittedWorkDone(this._handle, ptr(callbackInfo));
    });
  }
}

/**
 * Dawn canvas context that wraps a WGPUSurface
 */
export class DawnGPUCanvasContext {
  readonly canvas: null = null;
  private currentTexture: DawnGPUTexture | null = null;
  private format: string;
  private _width: number;
  private _height: number;

  constructor(
    private readonly surface: WGPUSurface,
    width: number,
    height: number,
    format: string | number = "bgra8unorm"
  ) {
    this._width = width;
    this._height = height;
    // Convert numeric format to string if needed
    this.format =
      typeof format === "number" ? (textureFormatToString[format] ?? "bgra8unorm") : format;
  }

  get width(): number {
    return this._width;
  }

  get height(): number {
    return this._height;
  }

  resize(width: number, height: number): void {
    this._width = width;
    this._height = height;
  }

  configure(configuration: { format: string }) {
    this.format = configuration.format;
  }

  unconfigure() {
    // no-op
  }

  getConfiguration(): null {
    // TODO: this
    return null;
  }

  getCurrentTexture(): DawnGPUTexture {
    // Don't destroy the previous texture - the surface manages texture lifecycle.
    // Each call to getCurrentTexture returns a new texture for the current frame.
    const result = getSurfaceCurrentTexture(this.surface);
    if (
      result.status !== WGPUSurfaceGetCurrentTextureStatus.SuccessOptimal &&
      result.status !== WGPUSurfaceGetCurrentTextureStatus.SuccessSuboptimal
    ) {
      throw new Error(`Failed to get surface texture: status ${result.status}`);
    }

    if (!result.texture) {
      throw new Error("Surface texture is null");
    }

    this.currentTexture = new DawnGPUTexture(result.texture, this.format);
    return this.currentTexture;
  }

  present(): void {
    presentSurface(this.surface);
    // Clear reference after present - texture is no longer valid
    this.currentTexture = null;
  }
}

/**
 * Wrapped GPUDevice for Dawn
 */
export class DawnGPUDevice {
  readonly label: string = "";
  readonly features: Set<string> = new Set();
  readonly limits: Record<string, number> = {};
  readonly adapterInfo: Record<string, unknown> = {};
  readonly lost: Promise<{ reason: string; message: string }>;
  onuncapturederror: ((ev: unknown) => unknown) | null = null;
  readonly queue: DawnGPUQueue;

  constructor(
    public readonly _handle: WGPUDevice,
    queueHandle: WGPUQueue
  ) {
    this.queue = new DawnGPUQueue(queueHandle);
    this.lost = new Promise(() => {}); // Never resolves for now
  }

  destroy() {
    dawn.wgpuDeviceDestroy(this._handle);
  }

  createBuffer(descriptor: {
    label?: string;
    size: number;
    usage: number;
    mappedAtCreation?: boolean;
  }): DawnGPUBuffer {
    // WGPUBufferDescriptor struct layout (from webgpu.h):
    // { nextInChain: ptr(8), label: WGPUStringView(16), usage: u64(8), size: u64(8), mappedAtCreation: u32(4) }
    // Total: 48 bytes
    const descBuffer = Buffer.alloc(48);
    descBuffer.writeBigUInt64LE(BigInt(0), 0); // nextInChain
    descBuffer.writeBigUInt64LE(BigInt(0), 8); // label.data
    descBuffer.writeBigUInt64LE(BigInt("0xFFFFFFFFFFFFFFFF"), 16); // label.length
    descBuffer.writeBigUInt64LE(BigInt(convertBufferUsage(descriptor.usage)), 24); // usage (u64!)
    descBuffer.writeBigUInt64LE(BigInt(descriptor.size), 32); // size
    descBuffer.writeUInt32LE(descriptor.mappedAtCreation ? 1 : 0, 40); // mappedAtCreation

    const buffer = dawn.wgpuDeviceCreateBuffer(this._handle, ptr(descBuffer));
    if (!buffer) {
      throw new Error("Failed to create buffer");
    }
    return new DawnGPUBuffer(buffer, descriptor);
  }

  createShaderModule(descriptor: { label?: string; code: string }): DawnGPUShaderModule {
    // WGPUShaderSourceWGSL chained struct
    const code = descriptor.code;
    const codeBuffer = Buffer.from(code + "\0", "utf8");

    // WGSLDescriptor struct: { chain: ChainedStruct(16), code: WGPUStringView(16) } = 32 bytes
    // ChainedStruct: { next: ptr(8), s_type: u32(4), padding(4) }
    const wgslSource = Buffer.alloc(32);
    wgslSource.writeBigUInt64LE(BigInt(0), 0); // chain.next
    wgslSource.writeUInt32LE(0x00000002, 8); // chain.sType = WGPUSType_ShaderSourceWGSL (0x02)
    // offset 12: 4 bytes padding
    wgslSource.writeBigUInt64LE(BigInt(ptr(codeBuffer)), 16); // code.data
    wgslSource.writeBigUInt64LE(BigInt(codeBuffer.length - 1), 24); // code.length

    // WGPUShaderModuleDescriptor
    const descBuffer = Buffer.alloc(32);
    descBuffer.writeBigUInt64LE(BigInt(ptr(wgslSource)), 0); // nextInChain -> wgslSource
    descBuffer.writeBigUInt64LE(BigInt(0), 8); // label.data
    descBuffer.writeBigUInt64LE(BigInt("0xFFFFFFFFFFFFFFFF"), 16); // label.length

    const module = dawn.wgpuDeviceCreateShaderModule(this._handle, ptr(descBuffer));
    if (!module) {
      throw new Error("Failed to create shader module");
    }
    return new DawnGPUShaderModule(module, descriptor.label);
  }

  createBindGroupLayout(descriptor: GPUBindGroupLayoutDescriptor): DawnGPUBindGroupLayout {
    const entries = Array.from(descriptor.entries);
    const numEntries = entries.length;

    // WGPUBindGroupLayoutEntry struct layout (from C sizeof/offsetof):
    // { nextInChain: ptr @0, binding: u32 @8, visibility: u32 @16, bindingArraySize: u32 @24,
    //   buffer: WGPUBufferBindingLayout @32 (24 bytes),
    //   sampler: WGPUSamplerBindingLayout @56 (16 bytes),
    //   texture: WGPUTextureBindingLayout @72 (24 bytes),
    //   storageTexture: WGPUStorageTextureBindingLayout @96 (24 bytes) }
    // Total: 120 bytes
    const entrySize = 120;
    const entriesBuffer = Buffer.alloc(entrySize * numEntries);

    for (let i = 0; i < numEntries; i++) {
      const entry = entries[i]!;
      const offset = i * entrySize;

      // WGPUBindGroupLayoutEntry layout (with 64-bit alignment):
      // nextInChain: ptr @0 (8 bytes)
      // binding: u32 @8 (4 bytes)
      // padding: @12 (4 bytes)
      // visibility: WGPUFlags=u64 @16 (8 bytes)
      // bindingArraySize: u32 @24 (4 bytes)
      // padding: @28 (4 bytes)
      // buffer: WGPUBufferBindingLayout @32 (24 bytes)
      // sampler: WGPUSamplerBindingLayout @56 (16 bytes)
      // texture: WGPUTextureBindingLayout @72 (24 bytes)
      // storageTexture: WGPUStorageTextureBindingLayout @96 (24 bytes)
      // Total: 120 bytes

      entriesBuffer.writeBigUInt64LE(BigInt(0), offset + 0); // nextInChain
      entriesBuffer.writeUInt32LE(entry.binding, offset + 8); // binding
      // offset + 12: 4 bytes padding
      entriesBuffer.writeBigUInt64LE(BigInt(convertShaderStage(entry.visibility)), offset + 16); // visibility (u64!)
      entriesBuffer.writeUInt32LE(0, offset + 24); // bindingArraySize = 0
      // offset + 28: 4 bytes padding

      // buffer: WGPUBufferBindingLayout at offset 32 (24 bytes)
      // { nextInChain: ptr @0, type: u32 @8, hasDynamicOffset: u32 @12, minBindingSize: u64 @16 }
      // WGPUBufferBindingType: BindingNotUsed=0, Undefined=1, Uniform=2, Storage=3, ReadOnlyStorage=4
      if (entry.buffer) {
        const bufferType =
          entry.buffer.type === "uniform"
            ? 2 // WGPUBufferBindingType_Uniform
            : entry.buffer.type === "storage"
              ? 3 // WGPUBufferBindingType_Storage
              : entry.buffer.type === "read-only-storage"
                ? 4 // WGPUBufferBindingType_ReadOnlyStorage
                : 2; // default to Uniform
        entriesBuffer.writeBigUInt64LE(BigInt(0), offset + 32); // buffer.nextInChain
        entriesBuffer.writeUInt32LE(bufferType, offset + 32 + 8); // buffer.type
        entriesBuffer.writeUInt32LE(entry.buffer.hasDynamicOffset ? 1 : 0, offset + 32 + 12); // buffer.hasDynamicOffset
        entriesBuffer.writeBigUInt64LE(BigInt(entry.buffer.minBindingSize ?? 0), offset + 32 + 16); // buffer.minBindingSize
      }

      // sampler: WGPUSamplerBindingLayout at offset 56 (16 bytes)
      // { nextInChain: ptr @0, type: u32 @8, padding @12 }
      if (entry.sampler) {
        const samplerType =
          entry.sampler.type === "filtering"
            ? 2 // WGPUSamplerBindingType_Filtering
            : entry.sampler.type === "non-filtering"
              ? 3 // WGPUSamplerBindingType_NonFiltering
              : entry.sampler.type === "comparison"
                ? 4 // WGPUSamplerBindingType_Comparison
                : 2; // default to Filtering
        entriesBuffer.writeBigUInt64LE(BigInt(0), offset + 56); // sampler.nextInChain
        entriesBuffer.writeUInt32LE(samplerType, offset + 56 + 8); // sampler.type
      }

      // texture: WGPUTextureBindingLayout at offset 72 (24 bytes)
      // { nextInChain: ptr @0, sampleType: u32 @8, viewDimension: u32 @12, multisampled: u32 @16, padding @20 }
      if (entry.texture) {
        const sampleType =
          entry.texture.sampleType === "float"
            ? 2 // WGPUTextureSampleType_Float
            : entry.texture.sampleType === "unfilterable-float"
              ? 3 // WGPUTextureSampleType_UnfilterableFloat
              : entry.texture.sampleType === "depth"
                ? 4 // WGPUTextureSampleType_Depth
                : entry.texture.sampleType === "sint"
                  ? 5 // WGPUTextureSampleType_Sint
                  : entry.texture.sampleType === "uint"
                    ? 6 // WGPUTextureSampleType_Uint
                    : 2; // default to Float
        const viewDimension =
          entry.texture.viewDimension === "1d"
            ? 1 // WGPUTextureViewDimension_1D
            : entry.texture.viewDimension === "2d"
              ? 2 // WGPUTextureViewDimension_2D
              : entry.texture.viewDimension === "2d-array"
                ? 3 // WGPUTextureViewDimension_2DArray
                : entry.texture.viewDimension === "cube"
                  ? 4 // WGPUTextureViewDimension_Cube
                  : entry.texture.viewDimension === "cube-array"
                    ? 5 // WGPUTextureViewDimension_CubeArray
                    : entry.texture.viewDimension === "3d"
                      ? 6 // WGPUTextureViewDimension_3D
                      : 2; // default to 2D
        entriesBuffer.writeBigUInt64LE(BigInt(0), offset + 72); // texture.nextInChain
        entriesBuffer.writeUInt32LE(sampleType, offset + 72 + 8); // texture.sampleType
        entriesBuffer.writeUInt32LE(viewDimension, offset + 72 + 12); // texture.viewDimension
        entriesBuffer.writeUInt32LE(entry.texture.multisampled ? 1 : 0, offset + 72 + 16); // texture.multisampled
      }
      // storageTexture: WGPUStorageTextureBindingLayout at offset 96 (24 bytes) - leave as zeros for now
    }

    // Get pointer AFTER all writes are done (Bun Buffer ptr() issue)
    const entriesPtr = ptr(entriesBuffer);

    const descBuffer = Buffer.alloc(40);
    descBuffer.writeBigUInt64LE(BigInt(0), 0); // nextInChain
    descBuffer.writeBigUInt64LE(BigInt(0), 8); // label.data
    descBuffer.writeBigUInt64LE(BigInt("0xFFFFFFFFFFFFFFFF"), 16); // label.length
    descBuffer.writeBigUInt64LE(BigInt(numEntries), 24); // entryCount
    descBuffer.writeBigUInt64LE(BigInt(entriesPtr as unknown as number), 32); // entries

    const layout = dawn.wgpuDeviceCreateBindGroupLayout(this._handle, ptr(descBuffer));
    if (!layout) {
      throw new Error("Failed to create bind group layout");
    }
    return new DawnGPUBindGroupLayout(layout, descriptor.label);
  }

  createBindGroup(descriptor: {
    label?: string;
    layout: DawnGPUBindGroupLayout;
    entries: Array<{
      binding: number;
      resource:
        | { buffer: DawnGPUBuffer; offset?: number; size?: number }
        | DawnGPUSampler
        | DawnGPUTextureView;
    }>;
  }): DawnGPUBindGroup {
    const entries = descriptor.entries;
    const numEntries = entries.length;

    // WGPUBindGroupEntry struct layout (from C sizeof/offsetof):
    // { nextInChain: ptr @0, binding: u32 @8, buffer: ptr @16,
    //   offset: u64 @24, size: u64 @32, sampler: ptr @40, textureView: ptr @48 }
    // Total: 56 bytes
    const entrySize = 56;
    const entriesBuffer = Buffer.alloc(entrySize * numEntries);

    for (let i = 0; i < numEntries; i++) {
      const entry = entries[i]!;
      const offset = i * entrySize;

      entriesBuffer.writeBigUInt64LE(BigInt(0), offset + 0); // nextInChain
      entriesBuffer.writeUInt32LE(entry.binding, offset + 8); // binding
      // offset + 12: 4 bytes padding

      const resource = entry.resource;

      // Initialize all resource fields to 0/NULL
      entriesBuffer.writeBigUInt64LE(BigInt(0), offset + 16); // buffer = NULL
      entriesBuffer.writeBigUInt64LE(BigInt(0), offset + 24); // offset = 0
      entriesBuffer.writeBigUInt64LE(BigInt(0), offset + 32); // size = 0
      entriesBuffer.writeBigUInt64LE(BigInt(0), offset + 40); // sampler = NULL
      entriesBuffer.writeBigUInt64LE(BigInt(0), offset + 48); // textureView = NULL

      if (resource instanceof DawnGPUSampler) {
        // Sampler resource
        entriesBuffer.writeBigUInt64LE(BigInt(resource._handle as unknown as number), offset + 40); // sampler
      } else if (resource instanceof DawnGPUTextureView) {
        // Texture view resource
        entriesBuffer.writeBigUInt64LE(BigInt(resource._handle as unknown as number), offset + 48); // textureView
      } else if ("buffer" in resource) {
        // Buffer resource
        entriesBuffer.writeBigUInt64LE(
          BigInt(resource.buffer._handle as unknown as number),
          offset + 16
        ); // buffer
        entriesBuffer.writeBigUInt64LE(BigInt(resource.offset ?? 0), offset + 24); // offset
        entriesBuffer.writeBigUInt64LE(BigInt(resource.size ?? resource.buffer.size), offset + 32); // size
      }
    }

    // Get pointer AFTER all writes are done (Bun Buffer ptr() issue)
    const entriesPtr = ptr(entriesBuffer);

    const descBuffer = Buffer.alloc(48);
    descBuffer.writeBigUInt64LE(BigInt(0), 0); // nextInChain
    descBuffer.writeBigUInt64LE(BigInt(0), 8); // label.data
    descBuffer.writeBigUInt64LE(BigInt("0xFFFFFFFFFFFFFFFF"), 16); // label.length
    descBuffer.writeBigUInt64LE(BigInt(descriptor.layout._handle as unknown as number), 24); // layout
    descBuffer.writeBigUInt64LE(BigInt(numEntries), 32); // entryCount
    descBuffer.writeBigUInt64LE(BigInt(entriesPtr as unknown as number), 40); // entries

    const bindGroup = dawn.wgpuDeviceCreateBindGroup(this._handle, ptr(descBuffer));
    if (!bindGroup) {
      throw new Error("Failed to create bind group");
    }
    return new DawnGPUBindGroup(bindGroup, descriptor.label);
  }

  createPipelineLayout(descriptor: {
    label?: string;
    bindGroupLayouts: DawnGPUBindGroupLayout[];
  }): DawnGPUPipelineLayout {
    const layouts = descriptor.bindGroupLayouts;
    const numLayouts = layouts.length;

    const layoutsBuffer = new BigUint64Array(numLayouts);
    for (let i = 0; i < numLayouts; i++) {
      layoutsBuffer[i] = BigInt(layouts[i]!._handle as unknown as number);
    }

    // Get pointer AFTER all writes are done (Bun Buffer ptr() issue)
    const layoutsPtr = ptr(layoutsBuffer);

    const descBuffer = Buffer.alloc(40);
    descBuffer.writeBigUInt64LE(BigInt(0), 0); // nextInChain
    descBuffer.writeBigUInt64LE(BigInt(0), 8); // label.data
    descBuffer.writeBigUInt64LE(BigInt("0xFFFFFFFFFFFFFFFF"), 16); // label.length
    descBuffer.writeBigUInt64LE(BigInt(numLayouts), 24); // bindGroupLayoutCount
    descBuffer.writeBigUInt64LE(BigInt(layoutsPtr as unknown as number), 32); // bindGroupLayouts

    const pipelineLayout = dawn.wgpuDeviceCreatePipelineLayout(this._handle, ptr(descBuffer));
    if (!pipelineLayout) {
      throw new Error("Failed to create pipeline layout");
    }
    return new DawnGPUPipelineLayout(pipelineLayout, descriptor.label);
  }

  createRenderPipeline(descriptor: GPURenderPipelineDescriptor): DawnGPURenderPipeline {
    // Vertex state
    const vertexModule = descriptor.vertex.module as unknown as DawnGPUShaderModule;
    const vertexEntryPoint = descriptor.vertex.entryPoint ?? "main";
    const vertexEntryPointBuffer = Buffer.from(vertexEntryPoint + "\0", "utf8");

    // Vertex buffers
    const vertexBuffers = descriptor.vertex.buffers ? Array.from(descriptor.vertex.buffers) : [];
    const numVertexBuffers = vertexBuffers.length;

    // Calculate total attributes
    let totalAttributes = 0;
    for (const buffer of vertexBuffers) {
      if (buffer) {
        totalAttributes += buffer.attributes ? Array.from(buffer.attributes).length : 0;
      }
    }

    // WGPUVertexAttribute struct layout (from webgpu.h):
    // { nextInChain: ptr(8), format: u32(4), padding(4), offset: u64(8), shaderLocation: u32(4), padding(4) }
    // Total: 32 bytes
    const attributeSize = 32;
    const attributesBuffer = Buffer.alloc(attributeSize * Math.max(totalAttributes, 1));

    // WGPUVertexBufferLayout struct layout (from webgpu.h):
    // { nextInChain: ptr(8), stepMode: u32(4), padding(4), arrayStride: u64(8), attributeCount: size_t(8), attributes: ptr(8) }
    // Total: 40 bytes
    const vertexBufferLayoutSize = 40;
    const vertexBufferLayoutsBuffer = Buffer.alloc(
      vertexBufferLayoutSize * Math.max(numVertexBuffers, 1)
    );

    let attrIndex = 0;
    for (let i = 0; i < numVertexBuffers; i++) {
      const buffer = vertexBuffers[i];
      if (!buffer) continue;

      const attributes = buffer.attributes ? Array.from(buffer.attributes) : [];
      const bufferOffset = i * vertexBufferLayoutSize;

      vertexBufferLayoutsBuffer.writeBigUInt64LE(BigInt(0), bufferOffset); // nextInChain = NULL
      vertexBufferLayoutsBuffer.writeUInt32LE(
        stepModeMap[buffer.stepMode ?? "vertex"] ?? WGPUVertexStepMode.Vertex,
        bufferOffset + 8
      ); // stepMode
      // bufferOffset + 12: 4 bytes padding
      vertexBufferLayoutsBuffer.writeBigUInt64LE(BigInt(buffer.arrayStride), bufferOffset + 16); // arrayStride
      vertexBufferLayoutsBuffer.writeBigUInt64LE(BigInt(attributes.length), bufferOffset + 24); // attributeCount

      if (attributes.length > 0) {
        // IMPORTANT: Write attribute data FIRST, then get pointer
        // Bun's Buffer can reallocate on write, invalidating previous ptr() results
        const firstAttrIndex = attrIndex;
        for (const attr of attributes) {
          const attrOffset = attrIndex * attributeSize;
          attributesBuffer.writeBigUInt64LE(BigInt(0), attrOffset); // nextInChain = NULL
          attributesBuffer.writeUInt32LE(
            vertexFormatMap[attr.format] ?? WGPUVertexFormat.Float32,
            attrOffset + 8
          ); // format
          // attrOffset + 12: 4 bytes padding
          attributesBuffer.writeBigUInt64LE(BigInt(attr.offset), attrOffset + 16); // offset
          attributesBuffer.writeUInt32LE(attr.shaderLocation, attrOffset + 24); // shaderLocation
          // attrOffset + 28: 4 bytes padding
          attrIndex++;
        }

        // Now get the pointer AFTER all writes are done
        const attrPtr = ptr(attributesBuffer) as unknown as number;
        vertexBufferLayoutsBuffer.writeBigUInt64LE(
          BigInt(attrPtr + firstAttrIndex * attributeSize),
          bufferOffset + 32
        ); // attributes
      } else {
        vertexBufferLayoutsBuffer.writeBigUInt64LE(BigInt(0), bufferOffset + 32); // attributes = NULL
      }
    }

    // Fragment state
    let fragmentStateBuffer: Buffer | null = null;
    let targetsBuffer: Buffer | null = null;
    let blendStatesBuffer: Buffer | null = null;

    if (descriptor.fragment) {
      const fragmentModule = descriptor.fragment.module as unknown as DawnGPUShaderModule;
      const fragmentEntryPoint = descriptor.fragment.entryPoint ?? "main";
      const fragmentEntryPointBuffer = Buffer.from(fragmentEntryPoint + "\0", "utf8");
      const targets = descriptor.fragment.targets ? Array.from(descriptor.fragment.targets) : [];
      const numTargets = targets.length;

      // WGPUColorTargetState struct layout:
      // { nextInChain: ptr(8), format: u32(4), padding(4), blend: ptr(8), writeMask: u32(4), padding(4) }
      // Total: 32 bytes
      const targetSize = 32;
      targetsBuffer = Buffer.alloc(targetSize * Math.max(numTargets, 1));
      // WGPUBlendState: { color: WGPUBlendComponent(12), alpha: WGPUBlendComponent(12) } = 24 bytes
      blendStatesBuffer = Buffer.alloc(24 * Math.max(numTargets, 1));

      for (let i = 0; i < numTargets; i++) {
        const target = targets[i]!;
        const targetOffset = i * targetSize;

        targetsBuffer.writeBigUInt64LE(BigInt(0), targetOffset); // nextInChain
        targetsBuffer.writeUInt32LE(
          textureFormatMap[target.format] ?? 0x0000001b, // default BGRA8Unorm
          targetOffset + 8
        ); // format
        // targetOffset + 12: 4 bytes padding

        if (target.blend) {
          // WGPUBlendState: { color: WGPUBlendComponent, alpha: WGPUBlendComponent }
          // WGPUBlendComponent: { operation: u32, srcFactor: u32, dstFactor: u32 } = 12 bytes
          const blendOffset = i * 24;
          const colorBlend = target.blend.color;
          const alphaBlend = target.blend.alpha;

          // Color blend component
          blendStatesBuffer.writeUInt32LE(
            blendOperationMap[colorBlend.operation ?? "add"] ?? 0x01,
            blendOffset
          );
          blendStatesBuffer.writeUInt32LE(
            blendFactorMap[colorBlend.srcFactor ?? "one"] ?? 0x02,
            blendOffset + 4
          );
          blendStatesBuffer.writeUInt32LE(
            blendFactorMap[colorBlend.dstFactor ?? "zero"] ?? 0x01,
            blendOffset + 8
          );

          // Alpha blend component
          blendStatesBuffer.writeUInt32LE(
            blendOperationMap[alphaBlend.operation ?? "add"] ?? 0x01,
            blendOffset + 12
          );
          blendStatesBuffer.writeUInt32LE(
            blendFactorMap[alphaBlend.srcFactor ?? "one"] ?? 0x02,
            blendOffset + 16
          );
          blendStatesBuffer.writeUInt32LE(
            blendFactorMap[alphaBlend.dstFactor ?? "zero"] ?? 0x01,
            blendOffset + 20
          );

          targetsBuffer.writeBigUInt64LE(
            BigInt((ptr(blendStatesBuffer) as unknown as number) + blendOffset),
            targetOffset + 16
          ); // blend
        } else {
          targetsBuffer.writeBigUInt64LE(BigInt(0), targetOffset + 16); // blend = NULL
        }

        targetsBuffer.writeUInt32LE(0xf, targetOffset + 24); // writeMask = All
        // targetOffset + 28: 4 bytes padding
      }

      fragmentStateBuffer = Buffer.alloc(64);
      fragmentStateBuffer.writeBigUInt64LE(BigInt(0), 0); // nextInChain
      fragmentStateBuffer.writeBigUInt64LE(BigInt(fragmentModule._handle as unknown as number), 8);
      fragmentStateBuffer.writeBigUInt64LE(BigInt(ptr(fragmentEntryPointBuffer)), 16);
      fragmentStateBuffer.writeBigUInt64LE(BigInt(fragmentEntryPointBuffer.length - 1), 24);
      fragmentStateBuffer.writeBigUInt64LE(BigInt(0), 32); // constantCount
      fragmentStateBuffer.writeBigUInt64LE(BigInt(0), 40); // constants
      fragmentStateBuffer.writeBigUInt64LE(BigInt(numTargets), 48);
      fragmentStateBuffer.writeBigUInt64LE(BigInt(ptr(targetsBuffer)), 56);
    }

    // Layout
    const layout =
      descriptor.layout === "auto"
        ? null
        : (descriptor.layout as unknown as DawnGPUPipelineLayout | null);

    // WGPURenderPipelineDescriptor struct layout:
    // { nextInChain: ptr(8), label: WGPUStringView(16), layout: ptr(8),
    //   vertex: WGPUVertexState(64), primitive: WGPUPrimitiveState(32),
    //   depthStencil: ptr(8), multisample: WGPUMultisampleState(24), fragment: ptr(8) }
    // Total: 168 bytes
    const descBuffer = Buffer.alloc(168);
    let offset = 0;

    // nextInChain
    descBuffer.writeBigUInt64LE(BigInt(0), offset);
    offset += 8;

    // label: WGPUStringView { data: ptr, length: size_t }
    descBuffer.writeBigUInt64LE(BigInt(0), offset); // label.data = NULL
    offset += 8;
    descBuffer.writeBigUInt64LE(BigInt("0xFFFFFFFFFFFFFFFF"), offset); // label.length = WGPU_STRLEN
    offset += 8;

    // layout: ptr
    descBuffer.writeBigUInt64LE(
      layout ? BigInt(layout._handle as unknown as number) : BigInt(0),
      offset
    );
    offset += 8;

    // vertex: WGPUVertexState (inline, 64 bytes)
    // { nextInChain: ptr(8), module: ptr(8), entryPoint: WGPUStringView(16),
    //   constantCount: size_t(8), constants: ptr(8), bufferCount: size_t(8), buffers: ptr(8) }
    descBuffer.writeBigUInt64LE(BigInt(0), offset); // vertex.nextInChain
    offset += 8;
    descBuffer.writeBigUInt64LE(BigInt(vertexModule._handle as unknown as number), offset); // vertex.module
    offset += 8;
    descBuffer.writeBigUInt64LE(BigInt(ptr(vertexEntryPointBuffer)), offset); // vertex.entryPoint.data
    offset += 8;
    descBuffer.writeBigUInt64LE(BigInt(vertexEntryPointBuffer.length - 1), offset); // vertex.entryPoint.length
    offset += 8;
    descBuffer.writeBigUInt64LE(BigInt(0), offset); // vertex.constantCount
    offset += 8;
    descBuffer.writeBigUInt64LE(BigInt(0), offset); // vertex.constants
    offset += 8;
    descBuffer.writeBigUInt64LE(BigInt(numVertexBuffers), offset); // vertex.bufferCount
    offset += 8;
    descBuffer.writeBigUInt64LE(
      numVertexBuffers > 0 ? BigInt(ptr(vertexBufferLayoutsBuffer)) : BigInt(0),
      offset
    ); // vertex.buffers
    offset += 8;

    // primitive: WGPUPrimitiveState (inline, 32 bytes)
    // { nextInChain: ptr(8), topology: u32(4), stripIndexFormat: u32(4),
    //   frontFace: u32(4), cullMode: u32(4), unclippedDepth: u32(4), padding(4) }
    const topology = descriptor.primitive?.topology ?? "triangle-list";
    descBuffer.writeBigUInt64LE(BigInt(0), offset); // primitive.nextInChain
    offset += 8;
    descBuffer.writeUInt32LE(topologyMap[topology] ?? WGPUPrimitiveTopology.TriangleList, offset); // primitive.topology
    offset += 4;
    descBuffer.writeUInt32LE(0, offset); // primitive.stripIndexFormat = undefined
    offset += 4;
    descBuffer.writeUInt32LE(0, offset); // primitive.frontFace = undefined (defaults to CCW)
    offset += 4;
    descBuffer.writeUInt32LE(0, offset); // primitive.cullMode = undefined (defaults to None)
    offset += 4;
    descBuffer.writeUInt32LE(0, offset); // primitive.unclippedDepth = false
    offset += 4;
    offset += 4; // padding

    // depthStencil: ptr
    let depthStencilBuffer: Buffer | null = null;
    if (descriptor.depthStencil) {
      const ds = descriptor.depthStencil;
      // WGPUDepthStencilState struct layout (72 bytes):
      // { nextInChain: ptr(8), format: u32(4), depthWriteEnabled: u32(4), depthCompare: u32(4),
      //   stencilFront: WGPUStencilFaceState(16), stencilBack: WGPUStencilFaceState(16),
      //   stencilReadMask: u32(4), stencilWriteMask: u32(4), depthBias: i32(4),
      //   depthBiasSlopeScale: f32(4), depthBiasClamp: f32(4) }
      // WGPUStencilFaceState: { compare: u32(4), failOp: u32(4), depthFailOp: u32(4), passOp: u32(4) }
      depthStencilBuffer = Buffer.alloc(72);
      let dsOffset = 0;
      depthStencilBuffer.writeBigUInt64LE(BigInt(0), dsOffset); // nextInChain
      dsOffset += 8;
      depthStencilBuffer.writeUInt32LE(
        textureFormatMap[ds.format] ?? 0x00000030, // default depth24plus
        dsOffset
      ); // format
      dsOffset += 4;
      // depthWriteEnabled: WGPUOptionalBool (0=false, 1=true, 2=undefined)
      depthStencilBuffer.writeUInt32LE(ds.depthWriteEnabled ? 1 : 0, dsOffset);
      dsOffset += 4;
      depthStencilBuffer.writeUInt32LE(
        compareFunctionMap[ds.depthCompare ?? "always"] ?? 0x00000008,
        dsOffset
      ); // depthCompare
      dsOffset += 4;
      // stencilFront (16 bytes) - use defaults (undefined = 0)
      depthStencilBuffer.writeUInt32LE(0, dsOffset); // compare = undefined
      depthStencilBuffer.writeUInt32LE(0, dsOffset + 4); // failOp = undefined
      depthStencilBuffer.writeUInt32LE(0, dsOffset + 8); // depthFailOp = undefined
      depthStencilBuffer.writeUInt32LE(0, dsOffset + 12); // passOp = undefined
      dsOffset += 16;
      // stencilBack (16 bytes) - use defaults (undefined = 0)
      depthStencilBuffer.writeUInt32LE(0, dsOffset); // compare = undefined
      depthStencilBuffer.writeUInt32LE(0, dsOffset + 4); // failOp = undefined
      depthStencilBuffer.writeUInt32LE(0, dsOffset + 8); // depthFailOp = undefined
      depthStencilBuffer.writeUInt32LE(0, dsOffset + 12); // passOp = undefined
      dsOffset += 16;
      depthStencilBuffer.writeUInt32LE(ds.stencilReadMask ?? 0xffffffff, dsOffset); // stencilReadMask
      dsOffset += 4;
      depthStencilBuffer.writeUInt32LE(ds.stencilWriteMask ?? 0xffffffff, dsOffset); // stencilWriteMask
      dsOffset += 4;
      depthStencilBuffer.writeInt32LE(ds.depthBias ?? 0, dsOffset); // depthBias
      dsOffset += 4;
      depthStencilBuffer.writeFloatLE(ds.depthBiasSlopeScale ?? 0, dsOffset); // depthBiasSlopeScale
      dsOffset += 4;
      depthStencilBuffer.writeFloatLE(ds.depthBiasClamp ?? 0, dsOffset); // depthBiasClamp
    }
    descBuffer.writeBigUInt64LE(
      depthStencilBuffer ? BigInt(ptr(depthStencilBuffer)) : BigInt(0),
      offset
    );
    offset += 8;

    // multisample: WGPUMultisampleState (inline, 24 bytes)
    // { nextInChain: ptr(8), count: u32(4), mask: u32(4), alphaToCoverageEnabled: u32(4), padding(4) }
    descBuffer.writeBigUInt64LE(BigInt(0), offset); // multisample.nextInChain
    offset += 8;
    descBuffer.writeUInt32LE(1, offset); // multisample.count
    offset += 4;
    descBuffer.writeUInt32LE(0xffffffff, offset); // multisample.mask
    offset += 4;
    descBuffer.writeUInt32LE(0, offset); // multisample.alphaToCoverageEnabled
    offset += 4;
    offset += 4; // padding

    // fragment: ptr
    descBuffer.writeBigUInt64LE(
      fragmentStateBuffer ? BigInt(ptr(fragmentStateBuffer)) : BigInt(0),
      offset
    );

    const pipeline = dawn.wgpuDeviceCreateRenderPipeline(this._handle, ptr(descBuffer));
    if (!pipeline) {
      throw new Error("Failed to create render pipeline");
    }
    return new DawnGPURenderPipeline(pipeline, descriptor.label);
  }

  createCommandEncoder(descriptor?: { label?: string }): DawnGPUCommandEncoder {
    const descBuffer = Buffer.alloc(32);
    descBuffer.writeBigUInt64LE(BigInt(0), 0); // nextInChain
    descBuffer.writeBigUInt64LE(BigInt(0), 8); // label.data
    descBuffer.writeBigUInt64LE(BigInt("0xFFFFFFFFFFFFFFFF"), 16); // label.length

    const encoder = dawn.wgpuDeviceCreateCommandEncoder(this._handle, ptr(descBuffer));
    if (!encoder) {
      throw new Error("Failed to create command encoder");
    }
    return new DawnGPUCommandEncoder(encoder, descriptor?.label);
  }

  createTexture(descriptor: GPUTextureDescriptor): DawnGPUTexture {
    // WGPUTextureDescriptor struct layout (from webgpu.h):
    // { nextInChain: ptr(8), label: WGPUStringView(16), usage: u64(8), dimension: u32(4),
    //   size: WGPUExtent3D(12), format: u32(4), mipLevelCount: u32(4), sampleCount: u32(4),
    //   viewFormatCount: size_t(8), viewFormats: ptr(8) }
    // Total: 80 bytes (with alignment)
    const descBuffer = Buffer.alloc(80);

    // nextInChain
    descBuffer.writeBigUInt64LE(BigInt(0), 0);

    // label (WGPUStringView: data ptr + length)
    descBuffer.writeBigUInt64LE(BigInt(0), 8); // label.data = NULL
    descBuffer.writeBigUInt64LE(BigInt("0xFFFFFFFFFFFFFFFF"), 16); // label.length = WGPU_STRLEN

    // usage (u64)
    descBuffer.writeBigUInt64LE(BigInt(convertTextureUsage(descriptor.usage)), 24);

    // dimension (u32)
    const dimension = descriptor.dimension ?? "2d";
    descBuffer.writeUInt32LE(textureDimensionMap[dimension] ?? 0x02, 32);

    // size: WGPUExtent3D (3 x u32 = 12 bytes)
    const size = descriptor.size;
    const width = typeof size === "number" ? size : (size as GPUExtent3DDict).width;
    const height = typeof size === "number" ? 1 : ((size as GPUExtent3DDict).height ?? 1);
    const depthOrArrayLayers =
      typeof size === "number" ? 1 : ((size as GPUExtent3DDict).depthOrArrayLayers ?? 1);
    descBuffer.writeUInt32LE(width, 36);
    descBuffer.writeUInt32LE(height, 40);
    descBuffer.writeUInt32LE(depthOrArrayLayers, 44);

    // format (u32)
    const format = textureFormatMap[descriptor.format] ?? 0x0000001b; // default to bgra8unorm
    descBuffer.writeUInt32LE(format, 48);

    // mipLevelCount (u32)
    descBuffer.writeUInt32LE(descriptor.mipLevelCount ?? 1, 52);

    // sampleCount (u32)
    descBuffer.writeUInt32LE(descriptor.sampleCount ?? 1, 56);
    // padding @60 (4 bytes for size_t alignment)

    // viewFormatCount (size_t = 8 bytes)
    descBuffer.writeBigUInt64LE(BigInt(0), 64);

    // viewFormats (ptr)
    descBuffer.writeBigUInt64LE(BigInt(0), 72);

    const texture = dawn.wgpuDeviceCreateTexture(this._handle, ptr(descBuffer));
    if (!texture) {
      throw new Error("Failed to create texture");
    }
    return new DawnGPUTexture(texture, descriptor.format, descriptor.label);
  }

  createSampler(descriptor?: GPUSamplerDescriptor): DawnGPUSampler {
    // WGPUSamplerDescriptor struct layout (from webgpu.h):
    // { nextInChain: ptr(8), label: WGPUStringView(16), addressModeU: u32(4), addressModeV: u32(4),
    //   addressModeW: u32(4), magFilter: u32(4), minFilter: u32(4), mipmapFilter: u32(4),
    //   lodMinClamp: f32(4), lodMaxClamp: f32(4), compare: u32(4), maxAnisotropy: u16(2) }
    // Total: 64 bytes (with alignment padding)
    const descBuffer = Buffer.alloc(72);

    // nextInChain
    descBuffer.writeBigUInt64LE(BigInt(0), 0);

    // label (WGPUStringView: data ptr + length)
    descBuffer.writeBigUInt64LE(BigInt(0), 8); // label.data = NULL
    descBuffer.writeBigUInt64LE(BigInt("0xFFFFFFFFFFFFFFFF"), 16); // label.length = WGPU_STRLEN

    // addressModeU (u32)
    const addressModeU = addressModeMap[descriptor?.addressModeU ?? "clamp-to-edge"] ?? 0x01;
    descBuffer.writeUInt32LE(addressModeU, 24);

    // addressModeV (u32)
    const addressModeV = addressModeMap[descriptor?.addressModeV ?? "clamp-to-edge"] ?? 0x01;
    descBuffer.writeUInt32LE(addressModeV, 28);

    // addressModeW (u32)
    const addressModeW = addressModeMap[descriptor?.addressModeW ?? "clamp-to-edge"] ?? 0x01;
    descBuffer.writeUInt32LE(addressModeW, 32);

    // magFilter (u32)
    const magFilter = filterModeMap[descriptor?.magFilter ?? "nearest"] ?? 0x01;
    descBuffer.writeUInt32LE(magFilter, 36);

    // minFilter (u32)
    const minFilter = filterModeMap[descriptor?.minFilter ?? "nearest"] ?? 0x01;
    descBuffer.writeUInt32LE(minFilter, 40);

    // mipmapFilter (u32)
    const mipmapFilter = mipmapFilterModeMap[descriptor?.mipmapFilter ?? "nearest"] ?? 0x01;
    descBuffer.writeUInt32LE(mipmapFilter, 44);

    // lodMinClamp (f32)
    descBuffer.writeFloatLE(descriptor?.lodMinClamp ?? 0, 48);

    // lodMaxClamp (f32)
    descBuffer.writeFloatLE(descriptor?.lodMaxClamp ?? 32, 52);

    // compare (u32) - 0 means no comparison
    const compare = descriptor?.compare ? (compareFunctionMap[descriptor.compare] ?? 0) : 0;
    descBuffer.writeUInt32LE(compare, 56);

    // maxAnisotropy (u16)
    descBuffer.writeUInt16LE(descriptor?.maxAnisotropy ?? 1, 60);

    const sampler = dawn.wgpuDeviceCreateSampler(this._handle, ptr(descBuffer));
    if (!sampler) {
      throw new Error("Failed to create sampler");
    }
    return new DawnGPUSampler(sampler, descriptor?.label);
  }
  createComputePipeline(descriptor: GPUComputePipelineDescriptor): DawnGPUComputePipeline {
    // Get compute shader module and entry point
    const computeModule = descriptor.compute.module as unknown as DawnGPUShaderModule;
    const computeEntryPoint = descriptor.compute.entryPoint ?? "main";
    const computeEntryPointBuffer = Buffer.from(computeEntryPoint + "\0", "utf8");

    // Layout
    const layout =
      descriptor.layout === "auto"
        ? null
        : (descriptor.layout as unknown as DawnGPUPipelineLayout | null);

    // WGPUComputePipelineDescriptor struct layout:
    // { nextInChain: ptr(8), label: WGPUStringView(16), layout: ptr(8), compute: WGPUProgrammableStageDescriptor(48) }
    // WGPUProgrammableStageDescriptor: { nextInChain: ptr(8), module: ptr(8), entryPoint: WGPUStringView(16), constantCount: size_t(8), constants: ptr(8) }
    // Total: 80 bytes
    const descBuffer = Buffer.alloc(80);
    let offset = 0;

    // nextInChain
    descBuffer.writeBigUInt64LE(BigInt(0), offset);
    offset += 8;

    // label: WGPUStringView { data: ptr, length: size_t }
    descBuffer.writeBigUInt64LE(BigInt(0), offset); // label.data = NULL
    offset += 8;
    descBuffer.writeBigUInt64LE(BigInt("0xFFFFFFFFFFFFFFFF"), offset); // label.length = WGPU_STRLEN
    offset += 8;

    // layout: ptr
    descBuffer.writeBigUInt64LE(
      layout ? BigInt(layout._handle as unknown as number) : BigInt(0),
      offset
    );
    offset += 8;

    // compute: WGPUProgrammableStageDescriptor (inline, 48 bytes)
    // { nextInChain: ptr(8), module: ptr(8), entryPoint: WGPUStringView(16), constantCount: size_t(8), constants: ptr(8) }
    descBuffer.writeBigUInt64LE(BigInt(0), offset); // compute.nextInChain
    offset += 8;
    descBuffer.writeBigUInt64LE(BigInt(computeModule._handle as unknown as number), offset); // compute.module
    offset += 8;
    descBuffer.writeBigUInt64LE(BigInt(ptr(computeEntryPointBuffer)), offset); // compute.entryPoint.data
    offset += 8;
    descBuffer.writeBigUInt64LE(BigInt(computeEntryPointBuffer.length - 1), offset); // compute.entryPoint.length
    offset += 8;
    descBuffer.writeBigUInt64LE(BigInt(0), offset); // compute.constantCount
    offset += 8;
    descBuffer.writeBigUInt64LE(BigInt(0), offset); // compute.constants
    offset += 8;

    const pipeline = dawn.wgpuDeviceCreateComputePipeline(this._handle, ptr(descBuffer));
    if (!pipeline) {
      throw new Error("Failed to create compute pipeline");
    }
    return new DawnGPUComputePipeline(pipeline, descriptor.label);
  }
  createComputePipelineAsync(_descriptor: GPUComputePipelineDescriptor): Promise<never> {
    throw new Error("createComputePipelineAsync not implemented");
  }
  createRenderPipelineAsync(_descriptor: GPURenderPipelineDescriptor): Promise<never> {
    throw new Error("createRenderPipelineAsync not implemented");
  }
  createQuerySet(_descriptor: GPUQuerySetDescriptor): never {
    throw new Error("createQuerySet not implemented");
  }
  createRenderBundleEncoder(_descriptor: GPURenderBundleEncoderDescriptor): never {
    throw new Error("createRenderBundleEncoder not implemented");
  }
  importExternalTexture(_descriptor: GPUExternalTextureDescriptor): never {
    throw new Error("importExternalTexture not implemented");
  }
  pushErrorScope(_filter: GPUErrorFilter) {
    // TODO implement
  }
  popErrorScope(): Promise<GPUError | null> {
    // TODO implement
    return Promise.resolve(null);
  }
  addEventListener(
    _type: string,
    _listener: EventListenerOrEventListenerObject,
    _options?: boolean | AddEventListenerOptions
  ) {
    // TODO implement
  }
  removeEventListener(
    _type: string,
    _listener: EventListenerOrEventListenerObject,
    _options?: boolean | EventListenerOptions
  ) {
    // TODO implement
  }
  dispatchEvent(_event: Event): boolean {
    // TODO implement
    return false;
  }
}

/**
 * Creates a WebGPU instance (the root WebGPU object).
 * This is equivalent to navigator.gpu on the web.
 */
export function createInstance(): WGPUInstance {
  // Pass NULL for default instance descriptor
  const instance = dawn.wgpuCreateInstance(null);
  if (!instance) {
    throw new Error("Failed to create WebGPU instance");
  }
  return instance;
}

/**
 * Releases a WebGPU instance.
 */
export function releaseInstance(instance: WGPUInstance): void {
  dawn.wgpuInstanceRelease(instance);
}

/**
 * Requests a WebGPU adapter (represents a GPU).
 * This is equivalent to navigator.gpu.requestAdapter() on the web.
 */
export function requestAdapter(instance: WGPUInstance): Promise<WGPUAdapter> {
  return new Promise((resolve, reject) => {
    let adapter: WGPUAdapter | null = null;
    let callbackCalled = false;

    // Create callback for adapter request
    const callback = new JSCallback(
      (
        status: number,
        adapterPtr: WGPUAdapter,
        _messageData: bigint,
        _messageLength: bigint,
        _userdata1: bigint,
        _userdata2: bigint
      ) => {
        callbackCalled = true;
        if (status === WGPURequestAdapterStatus.Success) {
          adapter = adapterPtr;
        } else {
          const statusName =
            Object.entries(WGPURequestAdapterStatus).find(([, v]) => v === status)?.[0] ??
            "Unknown";
          reject(new Error(`Failed to request adapter: ${statusName}`));
        }
      },
      {
        args: [FFIType.u32, FFIType.ptr, FFIType.u64, FFIType.u64, FFIType.ptr, FFIType.ptr],
        returns: FFIType.void,
      }
    );

    // Create WGPURequestAdapterCallbackInfo struct
    // Layout: { nextInChain: ptr, mode: u32, callback: ptr, userdata1: ptr, userdata2: ptr }
    // Sizes: 8 + 4 (+ 4 padding) + 8 + 8 + 8 = 40 bytes
    const callbackInfo = Buffer.alloc(40);
    callbackInfo.writeBigUInt64LE(BigInt(0), 0); // nextInChain = NULL
    callbackInfo.writeUInt32LE(WGPUCallbackMode.AllowSpontaneous, 8); // mode
    callbackInfo.writeBigUInt64LE(BigInt(callback.ptr!), 16); // callback
    callbackInfo.writeBigUInt64LE(BigInt(0), 24); // userdata1
    callbackInfo.writeBigUInt64LE(BigInt(0), 32); // userdata2

    // Call the async function
    dawn.wgpuInstanceRequestAdapter(instance, null, ptr(callbackInfo));

    // Process events until callback is called
    const startTime = Date.now();
    const timeout = 5000; // 5 second timeout

    const poll = () => {
      if (callbackCalled) {
        callback.close();
        if (adapter) {
          resolve(adapter);
        }
        return;
      }

      if (Date.now() - startTime > timeout) {
        callback.close();
        reject(new Error("Timeout waiting for adapter"));
        return;
      }

      dawn.wgpuInstanceProcessEvents(instance);
      setTimeout(poll, 1);
    };

    poll();
  });
}

/**
 * Releases a WebGPU adapter.
 */
export function releaseAdapter(adapter: WGPUAdapter): void {
  dawn.wgpuAdapterRelease(adapter);
}

// Global error callback that stays alive for the duration of the process
let globalErrorCallback: JSCallback | null = null;

// Error type names for logging
const ErrorTypeNames: Record<number, string> = {
  0x00000001: "NoError",
  0x00000002: "Validation",
  0x00000003: "OutOfMemory",
  0x00000004: "Internal",
  0x00000005: "Unknown",
};

function ensureErrorCallback(): JSCallback {
  if (!globalErrorCallback) {
    globalErrorCallback = new JSCallback(
      (
        _devicePtr: number,
        errorType: number,
        messageData: number,
        messageLength: bigint,
        _userdata1: number,
        _userdata2: number
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
  }
  return globalErrorCallback;
}

/**
 * Requests a WebGPU device from an adapter.
 * This is equivalent to adapter.requestDevice() on the web.
 */
export function requestDevice(adapter: WGPUAdapter): Promise<WGPUDevice> {
  return new Promise((resolve, reject) => {
    let device: WGPUDevice | null = null;
    let callbackCalled = false;

    // Create callback for device request
    const callback = new JSCallback(
      (
        status: number,
        devicePtr: WGPUDevice,
        _messageData: bigint,
        _messageLength: bigint,
        _userdata1: bigint,
        _userdata2: bigint
      ) => {
        callbackCalled = true;
        if (status === WGPURequestDeviceStatus.Success) {
          device = devicePtr;
        } else {
          const statusName =
            Object.entries(WGPURequestDeviceStatus).find(([, v]) => v === status)?.[0] ?? "Unknown";
          reject(new Error(`Failed to request device: ${statusName}`));
        }
      },
      {
        args: [FFIType.u32, FFIType.ptr, FFIType.u64, FFIType.u64, FFIType.ptr, FFIType.ptr],
        returns: FFIType.void,
      }
    );

    // Create WGPURequestDeviceCallbackInfo struct
    const callbackInfo = Buffer.alloc(40);
    callbackInfo.writeBigUInt64LE(BigInt(0), 0); // nextInChain = NULL
    callbackInfo.writeUInt32LE(WGPUCallbackMode.AllowSpontaneous, 8); // mode
    callbackInfo.writeBigUInt64LE(BigInt(callback.ptr!), 16); // callback
    callbackInfo.writeBigUInt64LE(BigInt(0), 24); // userdata1
    callbackInfo.writeBigUInt64LE(BigInt(0), 32); // userdata2

    // Ensure we have an error callback
    const errorCallback = ensureErrorCallback();

    // Build WGPUDeviceDescriptor with error callback
    // WGPUDeviceDescriptor layout:
    // { nextInChain: ptr(8), label: WGPUStringView(16),
    //   requiredFeatureCount: size_t(8), requiredFeatures: ptr(8),
    //   requiredLimits: ptr(8),
    //   defaultQueue: WGPUQueueDescriptor(24),
    //   deviceLostCallbackInfo: WGPUDeviceLostCallbackInfo(40),
    //   uncapturedErrorCallbackInfo: WGPUUncapturedErrorCallbackInfo(32) }
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
    deviceDescriptor.writeUInt32LE(0, offset); // mode = 0 (no callback)
    offset += 4;
    offset += 4; // padding
    deviceDescriptor.writeBigUInt64LE(BigInt(0), offset); // callback = NULL
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

    // Call the async function WITH descriptor that includes error callback
    dawn.wgpuAdapterRequestDevice(adapter, ptr(deviceDescriptor), ptr(callbackInfo));

    // We need an instance to process events, but we don't have direct access here
    // For now, use tick on a dummy loop - in practice this will be handled by the render loop
    const startTime = Date.now();
    const timeout = 5000;

    const poll = () => {
      if (callbackCalled) {
        callback.close();
        if (device) {
          resolve(device);
        }
        return;
      }

      if (Date.now() - startTime > timeout) {
        callback.close();
        reject(new Error("Timeout waiting for device"));
        return;
      }

      // Try ticking the device if we have one already (we don't in initial request)
      setTimeout(poll, 1);
    };

    poll();
  });
}

/**
 * Releases a WebGPU device.
 */
export function releaseDevice(device: WGPUDevice): void {
  dawn.wgpuDeviceRelease(device);
}

/**
 * Gets the queue from a device.
 */
export function getDeviceQueue(device: WGPUDevice): WGPUQueue {
  const queue = dawn.wgpuDeviceGetQueue(device);
  if (!queue) {
    throw new Error("Failed to get device queue");
  }
  return queue;
}

/**
 * Releases a WebGPU queue.
 */
export function releaseQueue(queue: WGPUQueue): void {
  dawn.wgpuQueueRelease(queue);
}

/**
 * Creates a WebGPU surface from a Metal layer pointer.
 * On macOS, this is used to connect WebGPU to a window.
 */
export function createSurfaceFromMetalLayer(
  instance: WGPUInstance,
  metalLayer: bigint | number
): WGPUSurface {
  // Create WGPUSurfaceSourceMetalLayer struct
  // Layout: { chain: { next: ptr, sType: u32 }, layer: ptr }
  // Sizes: 8 + 4 (+ 4 padding) + 8 = 24 bytes
  const metalLayerSource = Buffer.alloc(24);
  metalLayerSource.writeBigUInt64LE(BigInt(0), 0); // chain.next = NULL
  metalLayerSource.writeUInt32LE(WGPUSType.SurfaceSourceMetalLayer, 8); // chain.sType
  metalLayerSource.writeBigUInt64LE(BigInt(metalLayer), 16); // layer

  // Create WGPUSurfaceDescriptor struct
  // Layout: { nextInChain: ptr, label: WGPUStringView }
  // WGPUStringView: { data: ptr, length: size_t } = 16 bytes
  // Total: 8 + 16 = 24 bytes
  const descriptor = Buffer.alloc(24);
  descriptor.writeBigUInt64LE(BigInt(ptr(metalLayerSource)), 0); // nextInChain points to metalLayerSource
  // label is a WGPUStringView with NULL data and WGPU_STRLEN length
  descriptor.writeBigUInt64LE(BigInt(0), 8); // label.data = NULL
  descriptor.writeBigUInt64LE(BigInt("0xFFFFFFFFFFFFFFFF"), 16); // label.length = WGPU_STRLEN

  const surface = dawn.wgpuInstanceCreateSurface(instance, ptr(descriptor));
  if (!surface) {
    throw new Error("Failed to create WebGPU surface");
  }
  return surface;
}

/**
 * Releases a WebGPU surface.
 */
export function releaseSurface(surface: WGPUSurface): void {
  dawn.wgpuSurfaceRelease(surface);
}

/**
 * Surface configuration options.
 */
export interface SurfaceConfiguration {
  device: WGPUDevice;
  format?: number;
  usage?: number;
  width: number;
  height: number;
  presentMode?: number;
  alphaMode?: number;
  viewFormats?: number[];
}

/**
 * Configures a WebGPU surface for rendering.
 */
export function configureSurface(surface: WGPUSurface, config: SurfaceConfiguration): void {
  const format = config.format ?? WGPUTextureFormat.BGRA8Unorm;
  const usage = config.usage ?? WGPUTextureUsage.RenderAttachment;
  const presentMode = config.presentMode ?? WGPUPresentMode.Fifo;
  const alphaMode = config.alphaMode ?? WGPUCompositeAlphaMode.Opaque;
  const viewFormats = config.viewFormats ?? [];

  // Create viewFormats buffer if needed
  let viewFormatsPtr = BigInt(0);
  let viewFormatsBuffer: Buffer | null = null;
  if (viewFormats.length > 0) {
    viewFormatsBuffer = Buffer.alloc(viewFormats.length * 4);
    for (let i = 0; i < viewFormats.length; i++) {
      viewFormatsBuffer.writeUInt32LE(viewFormats[i]!, i * 4);
    }
    viewFormatsPtr = BigInt(ptr(viewFormatsBuffer) as unknown as number);
  }

  // WGPUSurfaceConfiguration struct layout:
  // { nextInChain: ptr(8), device: ptr(8), format: u32(4), padding(4),
  //   usage: u64(8), width: u32(4), height: u32(4),
  //   viewFormatCount: size_t(8), viewFormats: ptr(8), alphaMode: u32(4), presentMode: u32(4) }
  // Total: 8 + 8 + 4 + 4 + 8 + 4 + 4 + 8 + 8 + 4 + 4 = 64 bytes
  const configBuffer = Buffer.alloc(72);
  let offset = 0;

  configBuffer.writeBigUInt64LE(BigInt(0), offset); // nextInChain
  offset += 8;
  configBuffer.writeBigUInt64LE(BigInt(config.device as unknown as number), offset); // device
  offset += 8;
  configBuffer.writeUInt32LE(format, offset); // format (u32)
  offset += 4;
  offset += 4; // padding to align usage to 8 bytes
  configBuffer.writeBigUInt64LE(BigInt(usage), offset); // usage (u64 - WGPUFlags)
  offset += 8;
  configBuffer.writeUInt32LE(config.width, offset); // width
  offset += 4;
  configBuffer.writeUInt32LE(config.height, offset); // height
  offset += 4;
  configBuffer.writeBigUInt64LE(BigInt(viewFormats.length), offset); // viewFormatCount
  offset += 8;
  configBuffer.writeBigUInt64LE(viewFormatsPtr, offset); // viewFormats
  offset += 8;
  configBuffer.writeUInt32LE(alphaMode, offset); // alphaMode
  offset += 4;
  configBuffer.writeUInt32LE(presentMode, offset); // presentMode

  dawn.wgpuSurfaceConfigure(surface, ptr(configBuffer));

  // Keep viewFormatsBuffer alive until configure completes (prevent GC)
  void viewFormatsBuffer;
}

/**
 * Unconfigures a WebGPU surface.
 */
export function unconfigureSurface(surface: WGPUSurface): void {
  dawn.wgpuSurfaceUnconfigure(surface);
}

/**
 * Surface capabilities returned by getSurfaceCapabilities.
 */
export interface SurfaceCapabilities {
  usages: number;
  formats: number[];
  presentModes: number[];
  alphaModes: number[];
}

/**
 * Gets surface capabilities for an adapter.
 * This must be called before configureSurface to get valid configuration values.
 */
export function getSurfaceCapabilities(
  surface: WGPUSurface,
  adapter: WGPUAdapter
): SurfaceCapabilities {
  // WGPUSurfaceCapabilities struct layout:
  // { nextInChain: ptr(8), usages: u64(8),
  //   formatCount: size_t(8), formats: ptr(8),
  //   presentModeCount: size_t(8), presentModes: ptr(8),
  //   alphaModeCount: size_t(8), alphaModes: ptr(8) }
  // Total: 64 bytes
  const capsBuffer = Buffer.alloc(64);

  // WGPUStatus: Success = 1, Error = 2
  const status = dawn.wgpuSurfaceGetCapabilities(surface, adapter, ptr(capsBuffer));
  if (status !== 1) {
    throw new Error(`Failed to get surface capabilities: status ${status}`);
  }

  // Read the capabilities
  const usages = Number(capsBuffer.readBigUInt64LE(8));
  const formatCount = Number(capsBuffer.readBigUInt64LE(16));
  const formatsPtr = capsBuffer.readBigUInt64LE(24);
  const presentModeCount = Number(capsBuffer.readBigUInt64LE(32));
  const presentModesPtr = capsBuffer.readBigUInt64LE(40);
  const alphaModeCount = Number(capsBuffer.readBigUInt64LE(48));
  const alphaModesPtr = capsBuffer.readBigUInt64LE(56);

  // Helper to read u32 array from a pointer
  const readU32Array = (ptrVal: bigint, count: number): number[] => {
    if (ptrVal === BigInt(0) || count === 0) {
      return [];
    }
    const ptrAsNumber = Number(ptrVal);
    const dataView = new DataView(
      Buffer.from(
        new Uint8Array(
          // Read memory directly using FFI pointer
          (function () {
            const { read } = require("bun:ffi");
            const result = new Uint8Array(count * 4);
            for (let i = 0; i < count * 4; i++) {
              result[i] = read.u8(ptrAsNumber + i);
            }
            return result.buffer;
          })()
        )
      ).buffer
    );
    const result: number[] = [];
    for (let i = 0; i < count; i++) {
      result.push(dataView.getUint32(i * 4, true));
    }
    return result;
  };

  const formats = readU32Array(formatsPtr, formatCount);
  const presentModes = readU32Array(presentModesPtr, presentModeCount);
  const alphaModes = readU32Array(alphaModesPtr, alphaModeCount);

  return { usages, formats, presentModes, alphaModes };
}

/**
 * Surface texture result from getCurrentTexture.
 */
export interface SurfaceTexture {
  texture: WGPUTexture | null;
  status: number;
}

/**
 * Gets the current texture from a surface for rendering.
 */
export function getSurfaceCurrentTexture(surface: WGPUSurface): SurfaceTexture {
  // WGPUSurfaceTexture struct layout from webgpu.h:
  // { nextInChain: WGPUChainedStruct* (8), texture: WGPUTexture (8), status: u32 (4) }
  // Total: 20 bytes (with potential padding to 24)
  const result = Buffer.alloc(24);

  dawn.wgpuSurfaceGetCurrentTexture(surface, ptr(result));

  // Read texture pointer at offset 8 (after nextInChain)
  const texturePtr = result.readBigUInt64LE(8);
  const status = result.readUInt32LE(16); // status is at offset 16 (after texture)

  // In Bun FFI, pointers are just numbers. Convert BigInt to number.
  // This is safe because 64-bit pointers only use 52 bits of addressable space,
  // which fits in JavaScript's 53-bit number precision.
  let texture: WGPUTexture | null = null;
  if (texturePtr !== BigInt(0)) {
    texture = Number(texturePtr) as unknown as WGPUTexture;
  }

  return { texture, status };
}

/**
 * Presents the surface (swaps buffers).
 */
export function presentSurface(surface: WGPUSurface): number {
  return dawn.wgpuSurfacePresent(surface);
}

/**
 * Creates a texture view from a texture.
 */
export function createTextureView(texture: WGPUTexture): WGPUTextureView {
  // NULL descriptor for default view
  const view = dawn.wgpuTextureCreateView(texture, null);
  if (!view) {
    throw new Error("Failed to create texture view");
  }
  return view;
}

/**
 * Releases a texture view.
 */
export function releaseTextureView(view: WGPUTextureView): void {
  dawn.wgpuTextureViewRelease(view);
}

/**
 * Releases a texture.
 */
export function releaseTexture(texture: WGPUTexture): void {
  dawn.wgpuTextureRelease(texture);
}

/**
 * Processes pending WebGPU events on an instance.
 */
export function processEvents(instance: WGPUInstance): void {
  dawn.wgpuInstanceProcessEvents(instance);
}

/**
 * Ticks the device (processes pending work).
 */
export function tickDevice(device: WGPUDevice): void {
  dawn.wgpuDeviceTick(device);
}
