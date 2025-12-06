import { ptr, JSCallback, FFIType } from "bun:ffi";
import {
  dawn,
  lib,
  WGPUSType,
  WGPUCallbackMode,
  WGPURequestAdapterStatus,
  WGPURequestDeviceStatus,
  WGPUTextureFormat,
  WGPUTextureUsage,
  WGPUPresentMode,
  WGPUCompositeAlphaMode,
  WGPUSurfaceGetCurrentTextureStatus,
  createStringView,
  nullStringView,
  type WGPUInstance,
  type WGPUAdapter,
  type WGPUDevice,
  type WGPUQueue,
  type WGPUSurface,
  type WGPUTexture,
  type WGPUTextureView,
} from "@glade/dawn";

// Re-export Dawn types and enums for convenience
export * from "@glade/dawn";

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
        messageData: bigint,
        messageLength: bigint,
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
        messageData: bigint,
        messageLength: bigint,
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

    // Call the async function with NULL descriptor for default device
    dawn.wgpuAdapterRequestDevice(adapter, null, ptr(callbackInfo));

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
    // Use Bun's toArrayBuffer to read from the pointer
    const ptrAsNumber = Number(ptrVal);
    const arrayBuffer = new Uint32Array(count);
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
