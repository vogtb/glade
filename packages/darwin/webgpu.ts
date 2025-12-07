import { ptr, JSCallback, FFIType } from "bun:ffi";
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
  rgba8unorm: 0x00000016, // WGPUTextureFormat_RGBA8Unorm
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

  unmap(): undefined {
    dawn.wgpuBufferUnmap(this._handle);
    return undefined;
  }

  destroy(): undefined {
    dawn.wgpuBufferDestroy(this._handle);
    return undefined;
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

  setPipeline(pipeline: DawnGPURenderPipeline): undefined {
    dawn.wgpuRenderPassEncoderSetPipeline(this._handle, pipeline._handle);
    return undefined;
  }

  setVertexBuffer(
    slot: number,
    buffer: DawnGPUBuffer | null,
    offset?: number,
    size?: number
  ): undefined {
    if (!buffer) return undefined;
    const bufferSize = size ?? buffer.size - (offset ?? 0);
    dawn.wgpuRenderPassEncoderSetVertexBuffer(
      this._handle,
      slot,
      buffer._handle,
      BigInt(offset ?? 0),
      BigInt(bufferSize)
    );
    return undefined;
  }

  setIndexBuffer(
    buffer: DawnGPUBuffer,
    indexFormat: string,
    offset?: number,
    size?: number
  ): undefined {
    const bufferSize = size ?? buffer.size - (offset ?? 0);
    dawn.wgpuRenderPassEncoderSetIndexBuffer(
      this._handle,
      buffer._handle,
      indexFormatMap[indexFormat] ?? WGPUIndexFormat.Uint16,
      BigInt(offset ?? 0),
      BigInt(bufferSize)
    );
    return undefined;
  }

  setBindGroup(
    index: number,
    bindGroup: DawnGPUBindGroup | null,
    dynamicOffsets?: Iterable<number>
  ): undefined {
    if (!bindGroup) return undefined;
    const offsets = dynamicOffsets ? Array.from(dynamicOffsets) : [];
    const offsetsBuffer = offsets.length > 0 ? new Uint32Array(offsets) : null;
    dawn.wgpuRenderPassEncoderSetBindGroup(
      this._handle,
      index,
      bindGroup._handle,
      BigInt(offsets.length),
      offsetsBuffer ? ptr(offsetsBuffer) : null
    );
    return undefined;
  }

  draw(
    vertexCount: number,
    instanceCount?: number,
    firstVertex?: number,
    firstInstance?: number
  ): undefined {
    dawn.wgpuRenderPassEncoderDraw(
      this._handle,
      vertexCount,
      instanceCount ?? 1,
      firstVertex ?? 0,
      firstInstance ?? 0
    );
    return undefined;
  }

  drawIndexed(
    indexCount: number,
    instanceCount?: number,
    firstIndex?: number,
    baseVertex?: number,
    firstInstance?: number
  ): undefined {
    dawn.wgpuRenderPassEncoderDrawIndexed(
      this._handle,
      indexCount,
      instanceCount ?? 1,
      firstIndex ?? 0,
      baseVertex ?? 0,
      firstInstance ?? 0
    );
    return undefined;
  }

  setViewport(
    x: number,
    y: number,
    width: number,
    height: number,
    minDepth: number,
    maxDepth: number
  ): undefined {
    dawn.wgpuRenderPassEncoderSetViewport(this._handle, x, y, width, height, minDepth, maxDepth);
    return undefined;
  }

  setScissorRect(x: number, y: number, width: number, height: number): undefined {
    dawn.wgpuRenderPassEncoderSetScissorRect(this._handle, x, y, width, height);
    return undefined;
  }

  end(): undefined {
    dawn.wgpuRenderPassEncoderEnd(this._handle);
    return undefined;
  }

  // Stubs for other methods
  setBlendConstant(_color: GPUColor): undefined {
    return undefined;
  }
  setStencilReference(_reference: number): undefined {
    return undefined;
  }
  beginOcclusionQuery(_queryIndex: number): undefined {
    return undefined;
  }
  endOcclusionQuery(): undefined {
    return undefined;
  }
  executeBundles(_bundles: Iterable<GPURenderBundle>): undefined {
    return undefined;
  }
  drawIndirect(_indirectBuffer: DawnGPUBuffer, _indirectOffset: number): undefined {
    return undefined;
  }
  drawIndexedIndirect(_indirectBuffer: DawnGPUBuffer, _indirectOffset: number): undefined {
    return undefined;
  }
  pushDebugGroup(_groupLabel: string): undefined {
    return undefined;
  }
  popDebugGroup(): undefined {
    return undefined;
  }
  insertDebugMarker(_markerLabel: string): undefined {
    return undefined;
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

    // WGPURenderPassDescriptor struct
    const descriptorBuffer = Buffer.alloc(80);
    descriptorBuffer.writeBigUInt64LE(BigInt(0), 0); // nextInChain
    descriptorBuffer.writeBigUInt64LE(BigInt(0), 8); // label.data = NULL
    descriptorBuffer.writeBigUInt64LE(BigInt("0xFFFFFFFFFFFFFFFF"), 16); // label.length = WGPU_STRLEN
    descriptorBuffer.writeBigUInt64LE(BigInt(numColorAttachments), 24); // colorAttachmentCount
    descriptorBuffer.writeBigUInt64LE(BigInt(ptr(colorAttachmentsBuffer)), 32); // colorAttachments
    descriptorBuffer.writeBigUInt64LE(BigInt(0), 40); // depthStencilAttachment = NULL
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

  // Stubs
  beginComputePass(_descriptor?: GPUComputePassDescriptor): never {
    throw new Error("beginComputePass not implemented");
  }
  copyBufferToBuffer(
    _source: DawnGPUBuffer,
    _sourceOffset: number,
    _destination: DawnGPUBuffer,
    _destinationOffset: number,
    _size: number
  ): undefined {
    return undefined;
  }
  copyBufferToTexture(
    _source: GPUTexelCopyBufferInfo,
    _destination: GPUTexelCopyTextureInfo,
    _copySize: GPUExtent3DStrict
  ): undefined {
    return undefined;
  }
  copyTextureToBuffer(
    _source: GPUTexelCopyTextureInfo,
    _destination: GPUTexelCopyBufferInfo,
    _copySize: GPUExtent3DStrict
  ): undefined {
    return undefined;
  }
  copyTextureToTexture(
    _source: GPUTexelCopyTextureInfo,
    _destination: GPUTexelCopyTextureInfo,
    _copySize: GPUExtent3DStrict
  ): undefined {
    return undefined;
  }
  clearBuffer(_buffer: DawnGPUBuffer, _offset?: number, _size?: number): undefined {
    return undefined;
  }
  resolveQuerySet(
    _querySet: GPUQuerySet,
    _firstQuery: number,
    _queryCount: number,
    _destination: DawnGPUBuffer,
    _destinationOffset: number
  ): undefined {
    return undefined;
  }
  pushDebugGroup(_groupLabel: string): undefined {
    return undefined;
  }
  popDebugGroup(): undefined {
    return undefined;
  }
  insertDebugMarker(_markerLabel: string): undefined {
    return undefined;
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

  destroy(): undefined {
    releaseTexture(this._handle);
    return undefined;
  }
}

/**
 * Wrapped GPUQueue for Dawn
 */
export class DawnGPUQueue {
  readonly label: string = "";

  constructor(public readonly _handle: WGPUQueue) {}

  submit(commandBuffers: Iterable<DawnGPUCommandBuffer>): undefined {
    const buffers = Array.from(commandBuffers);
    if (buffers.length === 0) return undefined;

    // Create array of command buffer handles
    const handles = new BigUint64Array(buffers.length);
    for (let i = 0; i < buffers.length; i++) {
      handles[i] = BigInt(buffers[i]!._handle as unknown as number);
    }

    dawn.wgpuQueueSubmit(this._handle, BigInt(buffers.length), ptr(handles));
    return undefined;
  }

  writeBuffer(
    buffer: DawnGPUBuffer,
    bufferOffset: number,
    data: BufferSource,
    dataOffset?: number,
    size?: number
  ): undefined {
    let byteOffset = dataOffset ?? 0;
    let dataView: Uint8Array;

    if (data instanceof ArrayBuffer) {
      const dataSize = size ?? data.byteLength - byteOffset;
      dataView = new Uint8Array(data, byteOffset, dataSize);
    } else if (ArrayBuffer.isView(data)) {
      byteOffset += data.byteOffset;
      const dataSize = size ?? data.byteLength - (dataOffset ?? 0);
      dataView = new Uint8Array(data.buffer as ArrayBuffer, byteOffset, dataSize);
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
    return undefined;
  }

  // Stubs
  writeTexture(
    _destination: GPUTexelCopyTextureInfo,
    _data: BufferSource,
    _dataLayout: GPUTexelCopyBufferLayout,
    _size: GPUExtent3DStrict
  ): undefined {
    return undefined;
  }
  copyExternalImageToTexture(
    _source: GPUCopyExternalImageSourceInfo,
    _destination: GPUCopyExternalImageDestInfo,
    _copySize: GPUExtent3DStrict
  ): undefined {
    return undefined;
  }
  onSubmittedWorkDone(): Promise<undefined> {
    return Promise.resolve(undefined);
  }
}

/**
 * Dawn canvas context that wraps a WGPUSurface
 */
export class DawnGPUCanvasContext {
  readonly canvas: null = null;
  private currentTexture: DawnGPUTexture | null = null;
  private format: string = "bgra8unorm";

  constructor(
    private readonly surface: WGPUSurface,
    private readonly _width: number,
    private readonly _height: number
  ) {}

  configure(configuration: { format: string }): undefined {
    this.format = configuration.format;
    return undefined;
  }

  unconfigure(): undefined {
    return undefined;
  }

  getConfiguration(): null {
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

  destroy(): undefined {
    dawn.wgpuDeviceDestroy(this._handle);
    return undefined;
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

      entriesBuffer.writeBigUInt64LE(BigInt(0), offset + 0); // nextInChain
      entriesBuffer.writeUInt32LE(entry.binding, offset + 8); // binding
      // offset + 12: 4 bytes padding (visibility is at 16, not 12)
      entriesBuffer.writeUInt32LE(convertShaderStage(entry.visibility), offset + 16); // visibility
      // offset + 20: 4 bytes padding
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
      // sampler: WGPUSamplerBindingLayout at offset 56 (16 bytes) - leave as zeros
      // texture: WGPUTextureBindingLayout at offset 72 (24 bytes) - leave as zeros
      // storageTexture: WGPUStorageTextureBindingLayout at offset 96 (24 bytes) - leave as zeros
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
      resource: { buffer: DawnGPUBuffer; offset?: number; size?: number };
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
      entriesBuffer.writeBigUInt64LE(
        BigInt(resource.buffer._handle as unknown as number),
        offset + 16
      ); // buffer
      entriesBuffer.writeBigUInt64LE(BigInt(resource.offset ?? 0), offset + 24); // offset
      entriesBuffer.writeBigUInt64LE(BigInt(resource.size ?? resource.buffer.size), offset + 32); // size
      entriesBuffer.writeBigUInt64LE(BigInt(0), offset + 40); // sampler = NULL
      entriesBuffer.writeBigUInt64LE(BigInt(0), offset + 48); // textureView = NULL
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
          blendStatesBuffer.writeUInt32LE(1, blendOffset); // color.operation (add)
          blendStatesBuffer.writeUInt32LE(2, blendOffset + 4); // color.srcFactor (src-alpha)
          blendStatesBuffer.writeUInt32LE(4, blendOffset + 8); // color.dstFactor (one-minus-src-alpha)
          blendStatesBuffer.writeUInt32LE(1, blendOffset + 12); // alpha.operation (add)
          blendStatesBuffer.writeUInt32LE(1, blendOffset + 16); // alpha.srcFactor (one)
          blendStatesBuffer.writeUInt32LE(4, blendOffset + 20); // alpha.dstFactor (one-minus-src-alpha)

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

    // depthStencil: ptr (NULL)
    descBuffer.writeBigUInt64LE(BigInt(0), offset);
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

  // Stubs for other methods
  createTexture(_descriptor: GPUTextureDescriptor): never {
    throw new Error("createTexture not implemented");
  }
  createSampler(_descriptor?: GPUSamplerDescriptor): never {
    throw new Error("createSampler not implemented");
  }
  createComputePipeline(_descriptor: GPUComputePipelineDescriptor): never {
    throw new Error("createComputePipeline not implemented");
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
  pushErrorScope(_filter: GPUErrorFilter): undefined {
    return undefined;
  }
  popErrorScope(): Promise<GPUError | null> {
    return Promise.resolve(null);
  }
  addEventListener(
    _type: string,
    _listener: EventListenerOrEventListenerObject,
    _options?: boolean | AddEventListenerOptions
  ): undefined {
    return undefined;
  }
  removeEventListener(
    _type: string,
    _listener: EventListenerOrEventListenerObject,
    _options?: boolean | EventListenerOptions
  ): undefined {
    return undefined;
  }
  dispatchEvent(_event: Event): boolean {
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
}

/**
 * Configures a WebGPU surface for rendering.
 */
export function configureSurface(surface: WGPUSurface, config: SurfaceConfiguration): void {
  const format = config.format ?? WGPUTextureFormat.BGRA8Unorm;
  const usage = config.usage ?? WGPUTextureUsage.RenderAttachment;
  const presentMode = config.presentMode ?? WGPUPresentMode.Fifo;
  const alphaMode = config.alphaMode ?? WGPUCompositeAlphaMode.Opaque;

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
  configBuffer.writeBigUInt64LE(BigInt(0), offset); // viewFormatCount
  offset += 8;
  configBuffer.writeBigUInt64LE(BigInt(0), offset); // viewFormats
  offset += 8;
  configBuffer.writeUInt32LE(alphaMode, offset); // alphaMode
  offset += 4;
  configBuffer.writeUInt32LE(presentMode, offset); // presentMode

  dawn.wgpuSurfaceConfigure(surface, ptr(configBuffer));
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
    if (ptrVal === BigInt(0) || count === 0) return [];
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
