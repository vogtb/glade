/**
 * WebGPU API wrappers for Darwin/Dawn
 *
 * These classes wrap the Dawn FFI bindings to provide a GPUDevice-compatible API
 * that can be used with standard WebGPU code.
 *
 * Note: We use 'as unknown as' casting rather than implementing interfaces directly
 * because the @webgpu/types use branded types with __brand properties that we cannot
 * satisfy at runtime.
 */

import { ptr, type Pointer } from "bun:ffi";
import {
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
} from "@glade/dawn";
import {
  getSurfaceCurrentTexture,
  presentSurface,
  createTextureView,
  releaseTextureView,
  releaseTexture,
  WGPUSurfaceGetCurrentTextureStatus,
} from "./webgpu.ts";

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

// Texture format mapping
const textureFormatMap: Record<string, number> = {
  bgra8unorm: 0x0000000b,
  rgba8unorm: 0x00000009,
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
    // WGPUBufferDescriptor struct
    const descBuffer = Buffer.alloc(48);
    descBuffer.writeBigUInt64LE(BigInt(0), 0); // nextInChain
    descBuffer.writeBigUInt64LE(BigInt(0), 8); // label.data
    descBuffer.writeBigUInt64LE(BigInt("0xFFFFFFFFFFFFFFFF"), 16); // label.length
    descBuffer.writeUInt32LE(convertBufferUsage(descriptor.usage), 24); // usage
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

    const wgslSource = Buffer.alloc(40);
    wgslSource.writeBigUInt64LE(BigInt(0), 0); // chain.next
    wgslSource.writeUInt32LE(6, 8); // chain.sType = WGPUSType_ShaderSourceWGSL
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

    const entrySize = 80;
    const entriesBuffer = Buffer.alloc(entrySize * numEntries);

    for (let i = 0; i < numEntries; i++) {
      const entry = entries[i]!;
      const offset = i * entrySize;

      entriesBuffer.writeBigUInt64LE(BigInt(0), offset); // nextInChain
      entriesBuffer.writeUInt32LE(entry.binding, offset + 8); // binding
      entriesBuffer.writeUInt32LE(convertShaderStage(entry.visibility), offset + 12); // visibility

      if (entry.buffer) {
        const bufferType =
          entry.buffer.type === "uniform"
            ? 1
            : entry.buffer.type === "storage"
              ? 2
              : entry.buffer.type === "read-only-storage"
                ? 3
                : 1;
        entriesBuffer.writeUInt32LE(bufferType, offset + 16); // buffer.type
        entriesBuffer.writeUInt32LE(entry.buffer.hasDynamicOffset ? 1 : 0, offset + 20);
        entriesBuffer.writeBigUInt64LE(BigInt(entry.buffer.minBindingSize ?? 0), offset + 24);
      }
    }

    const descBuffer = Buffer.alloc(40);
    descBuffer.writeBigUInt64LE(BigInt(0), 0); // nextInChain
    descBuffer.writeBigUInt64LE(BigInt(0), 8); // label.data
    descBuffer.writeBigUInt64LE(BigInt("0xFFFFFFFFFFFFFFFF"), 16); // label.length
    descBuffer.writeBigUInt64LE(BigInt(numEntries), 24); // entryCount
    descBuffer.writeBigUInt64LE(BigInt(ptr(entriesBuffer)), 32); // entries

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

    const entrySize = 56;
    const entriesBuffer = Buffer.alloc(entrySize * numEntries);

    for (let i = 0; i < numEntries; i++) {
      const entry = entries[i]!;
      const offset = i * entrySize;

      entriesBuffer.writeBigUInt64LE(BigInt(0), offset); // nextInChain
      entriesBuffer.writeUInt32LE(entry.binding, offset + 8); // binding

      const resource = entry.resource;
      entriesBuffer.writeBigUInt64LE(
        BigInt(resource.buffer._handle as unknown as number),
        offset + 16
      ); // buffer
      entriesBuffer.writeBigUInt64LE(BigInt(resource.offset ?? 0), offset + 24); // offset
      entriesBuffer.writeBigUInt64LE(BigInt(resource.size ?? resource.buffer.size), offset + 32); // size
    }

    const descBuffer = Buffer.alloc(48);
    descBuffer.writeBigUInt64LE(BigInt(0), 0); // nextInChain
    descBuffer.writeBigUInt64LE(BigInt(0), 8); // label.data
    descBuffer.writeBigUInt64LE(BigInt("0xFFFFFFFFFFFFFFFF"), 16); // label.length
    descBuffer.writeBigUInt64LE(BigInt(descriptor.layout._handle as unknown as number), 24); // layout
    descBuffer.writeBigUInt64LE(BigInt(numEntries), 32); // entryCount
    descBuffer.writeBigUInt64LE(BigInt(ptr(entriesBuffer)), 40); // entries

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

    const descBuffer = Buffer.alloc(40);
    descBuffer.writeBigUInt64LE(BigInt(0), 0); // nextInChain
    descBuffer.writeBigUInt64LE(BigInt(0), 8); // label.data
    descBuffer.writeBigUInt64LE(BigInt("0xFFFFFFFFFFFFFFFF"), 16); // label.length
    descBuffer.writeBigUInt64LE(BigInt(numLayouts), 24); // bindGroupLayoutCount
    descBuffer.writeBigUInt64LE(BigInt(ptr(layoutsBuffer)), 32); // bindGroupLayouts

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

    const attributeSize = 24;
    const attributesBuffer = Buffer.alloc(attributeSize * Math.max(totalAttributes, 1));

    const vertexBufferLayoutSize = 32;
    const vertexBufferLayoutsBuffer = Buffer.alloc(
      vertexBufferLayoutSize * Math.max(numVertexBuffers, 1)
    );

    let attrIndex = 0;
    for (let i = 0; i < numVertexBuffers; i++) {
      const buffer = vertexBuffers[i];
      if (!buffer) continue;

      const attributes = buffer.attributes ? Array.from(buffer.attributes) : [];
      const bufferOffset = i * vertexBufferLayoutSize;

      vertexBufferLayoutsBuffer.writeBigUInt64LE(BigInt(buffer.arrayStride), bufferOffset);
      vertexBufferLayoutsBuffer.writeUInt32LE(
        stepModeMap[buffer.stepMode ?? "vertex"] ?? WGPUVertexStepMode.Vertex,
        bufferOffset + 8
      );
      vertexBufferLayoutsBuffer.writeBigUInt64LE(BigInt(attributes.length), bufferOffset + 16);

      if (attributes.length > 0) {
        const attrPtr = ptr(attributesBuffer) as unknown as number;
        vertexBufferLayoutsBuffer.writeBigUInt64LE(
          BigInt(attrPtr + attrIndex * attributeSize),
          bufferOffset + 24
        );

        for (const attr of attributes) {
          const attrOffset = attrIndex * attributeSize;
          attributesBuffer.writeUInt32LE(
            vertexFormatMap[attr.format] ?? WGPUVertexFormat.Float32,
            attrOffset
          );
          attributesBuffer.writeBigUInt64LE(BigInt(attr.offset), attrOffset + 8);
          attributesBuffer.writeUInt32LE(attr.shaderLocation, attrOffset + 16);
          attrIndex++;
        }
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

      const targetSize = 32;
      targetsBuffer = Buffer.alloc(targetSize * Math.max(numTargets, 1));
      blendStatesBuffer = Buffer.alloc(48 * Math.max(numTargets, 1));

      for (let i = 0; i < numTargets; i++) {
        const target = targets[i]!;
        const targetOffset = i * targetSize;

        targetsBuffer.writeBigUInt64LE(BigInt(0), targetOffset); // nextInChain
        targetsBuffer.writeUInt32LE(
          textureFormatMap[target.format] ?? 0x0000000b,
          targetOffset + 8
        );

        if (target.blend) {
          const blendOffset = i * 48;
          blendStatesBuffer.writeUInt32LE(1, blendOffset); // color.operation (add)
          blendStatesBuffer.writeUInt32LE(2, blendOffset + 4); // color.srcFactor (src-alpha)
          blendStatesBuffer.writeUInt32LE(4, blendOffset + 8); // color.dstFactor (one-minus-src-alpha)
          blendStatesBuffer.writeUInt32LE(1, blendOffset + 12); // alpha.operation (add)
          blendStatesBuffer.writeUInt32LE(1, blendOffset + 16); // alpha.srcFactor (one)
          blendStatesBuffer.writeUInt32LE(4, blendOffset + 20); // alpha.dstFactor (one-minus-src-alpha)

          targetsBuffer.writeBigUInt64LE(
            BigInt((ptr(blendStatesBuffer) as unknown as number) + blendOffset),
            targetOffset + 16
          );
        } else {
          targetsBuffer.writeBigUInt64LE(BigInt(0), targetOffset + 16);
        }

        targetsBuffer.writeUInt32LE(0xf, targetOffset + 24); // writeMask = All
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

    // Primitive state
    const primitiveStateBuffer = Buffer.alloc(24);
    primitiveStateBuffer.writeBigUInt64LE(BigInt(0), 0); // nextInChain
    const topology = descriptor.primitive?.topology ?? "triangle-list";
    primitiveStateBuffer.writeUInt32LE(
      topologyMap[topology] ?? WGPUPrimitiveTopology.TriangleList,
      8
    );
    primitiveStateBuffer.writeUInt32LE(0, 12); // stripIndexFormat = undefined
    primitiveStateBuffer.writeUInt32LE(1, 16); // frontFace = CCW
    primitiveStateBuffer.writeUInt32LE(1, 20); // cullMode = None

    // Multisample state
    const multisampleStateBuffer = Buffer.alloc(16);
    multisampleStateBuffer.writeBigUInt64LE(BigInt(0), 0); // nextInChain
    multisampleStateBuffer.writeUInt32LE(1, 8); // count
    multisampleStateBuffer.writeUInt32LE(0xffffffff, 12); // mask

    // Layout
    const layout =
      descriptor.layout === "auto"
        ? null
        : (descriptor.layout as unknown as DawnGPUPipelineLayout | null);

    // WGPURenderPipelineDescriptor
    const descBuffer = Buffer.alloc(200);
    let offset = 0;

    descBuffer.writeBigUInt64LE(BigInt(0), offset);
    offset += 8; // nextInChain
    descBuffer.writeBigUInt64LE(BigInt(0), offset);
    offset += 8; // label.data
    descBuffer.writeBigUInt64LE(BigInt("0xFFFFFFFFFFFFFFFF"), offset);
    offset += 8; // label.length
    descBuffer.writeBigUInt64LE(
      layout ? BigInt(layout._handle as unknown as number) : BigInt(0),
      offset
    );
    offset += 8;

    // Vertex state (inline)
    descBuffer.writeBigUInt64LE(BigInt(0), offset);
    offset += 8; // vertex.nextInChain
    descBuffer.writeBigUInt64LE(BigInt(vertexModule._handle as unknown as number), offset);
    offset += 8;
    descBuffer.writeBigUInt64LE(BigInt(ptr(vertexEntryPointBuffer)), offset);
    offset += 8;
    descBuffer.writeBigUInt64LE(BigInt(vertexEntryPointBuffer.length - 1), offset);
    offset += 8;
    descBuffer.writeBigUInt64LE(BigInt(0), offset);
    offset += 8; // vertex.constantCount
    descBuffer.writeBigUInt64LE(BigInt(0), offset);
    offset += 8; // vertex.constants
    descBuffer.writeBigUInt64LE(BigInt(numVertexBuffers), offset);
    offset += 8;
    descBuffer.writeBigUInt64LE(
      numVertexBuffers > 0 ? BigInt(ptr(vertexBufferLayoutsBuffer)) : BigInt(0),
      offset
    );
    offset += 8;

    // Primitive state
    descBuffer.writeBigUInt64LE(BigInt(ptr(primitiveStateBuffer)), offset);
    offset += 8;

    // Depth stencil (NULL)
    descBuffer.writeBigUInt64LE(BigInt(0), offset);
    offset += 8;

    // Multisample state
    descBuffer.writeBigUInt64LE(BigInt(ptr(multisampleStateBuffer)), offset);
    offset += 8;

    // Fragment state
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
