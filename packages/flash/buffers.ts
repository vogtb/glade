/**
 * GPU buffer management utilities for Flash.
 *
 * Provides pooling and dynamic resizing for GPU buffers used in rendering.
 */

import { GPUBufferUsage } from "@glade/core/webgpu";

/**
 * A dynamically resizing GPU buffer.
 *
 * Automatically grows when needed, reducing allocations.
 */
export class DynamicBuffer {
  private buffer: GPUBuffer;
  private capacity: number;

  constructor(
    private device: GPUDevice,
    private usage: GPUBufferUsageFlags,
    initialCapacity: number = 4096
  ) {
    this.capacity = initialCapacity;
    this.buffer = this.createBuffer(initialCapacity);
  }

  private createBuffer(size: number): GPUBuffer {
    return this.device.createBuffer({
      size,
      usage: this.usage,
    });
  }

  /**
   * Get the underlying GPU buffer.
   */
  getBuffer(): GPUBuffer {
    return this.buffer;
  }

  /**
   * Get current capacity in bytes.
   */
  getCapacity(): number {
    return this.capacity;
  }

  /**
   * Ensure buffer can hold at least `size` bytes.
   * Grows by 2x if needed.
   */
  ensureCapacity(size: number): void {
    if (size <= this.capacity) {
      return;
    }

    // Grow by 2x to amortize allocations
    let newCapacity = this.capacity;
    while (newCapacity < size) {
      newCapacity *= 2;
    }

    this.buffer.destroy();
    this.buffer = this.createBuffer(newCapacity);
    this.capacity = newCapacity;
  }

  /**
   * Write data to the buffer, growing if needed.
   */
  write(data: BufferSource, offset: number = 0): void {
    const totalSize = offset + (data as ArrayBuffer).byteLength;
    this.ensureCapacity(totalSize);
    this.device.queue.writeBuffer(this.buffer, offset, data);
  }

  /**
   * Destroy the buffer and release resources.
   */
  destroy(): void {
    this.buffer.destroy();
  }
}

/**
 * A pool of reusable GPU buffers.
 *
 * Reduces allocation overhead for frequently created/destroyed buffers.
 */
export class BufferPool {
  private pools: Map<number, GPUBuffer[]> = new Map();

  constructor(
    private device: GPUDevice,
    private usage: GPUBufferUsageFlags
  ) {}

  /**
   * Round size up to nearest power of 2 for efficient pooling.
   */
  private roundUpToPowerOf2(size: number): number {
    let power = 1;
    while (power < size) {
      power *= 2;
    }
    return power;
  }

  /**
   * Acquire a buffer of at least the specified size.
   */
  acquire(minSize: number): GPUBuffer {
    const size = this.roundUpToPowerOf2(minSize);
    const pool = this.pools.get(size);

    if (pool && pool.length > 0) {
      return pool.pop()!;
    }

    return this.device.createBuffer({
      size,
      usage: this.usage,
    });
  }

  /**
   * Release a buffer back to the pool for reuse.
   */
  release(buffer: GPUBuffer): void {
    const size = buffer.size;
    let pool = this.pools.get(size);

    if (!pool) {
      pool = [];
      this.pools.set(size, pool);
    }

    pool.push(buffer);
  }

  /**
   * Clear all pooled buffers.
   */
  clear(): void {
    for (const pool of this.pools.values()) {
      for (const buffer of pool) {
        buffer.destroy();
      }
    }
    this.pools.clear();
  }

  /**
   * Get statistics about the pool.
   */
  getStats(): { sizes: number; totalBuffers: number } {
    let totalBuffers = 0;
    for (const pool of this.pools.values()) {
      totalBuffers += pool.length;
    }
    return { sizes: this.pools.size, totalBuffers };
  }
}

/**
 * Staging buffer for CPU-to-GPU data transfer.
 *
 * Uses a ring buffer approach for efficient streaming.
 */
export class StagingBuffer {
  private buffer: GPUBuffer;
  private mappedData: Float32Array | null = null;
  private offset: number = 0;

  constructor(
    private device: GPUDevice,
    private capacity: number = 1024 * 1024 // 1MB default
  ) {
    this.buffer = device.createBuffer({
      size: capacity,
      usage: GPUBufferUsage.COPY_SRC | GPUBufferUsage.MAP_WRITE,
      mappedAtCreation: true,
    });
    this.mappedData = new Float32Array(this.buffer.getMappedRange());
  }

  /**
   * Write float data and return the offset.
   */
  writeFloats(data: Float32Array): number {
    const byteOffset = this.offset;
    const floatOffset = byteOffset / 4;

    if (floatOffset + data.length > this.mappedData!.length) {
      throw new Error("Staging buffer overflow");
    }

    this.mappedData!.set(data, floatOffset);
    this.offset += data.byteLength;

    return byteOffset;
  }

  /**
   * Get the underlying buffer for copy operations.
   */
  getBuffer(): GPUBuffer {
    return this.buffer;
  }

  /**
   * Unmap the buffer for GPU access.
   */
  unmap(): void {
    if (this.mappedData) {
      this.buffer.unmap();
      this.mappedData = null;
    }
  }

  /**
   * Reset offset for next frame (call after flush).
   */
  reset(): void {
    this.offset = 0;
  }

  /**
   * Destroy the staging buffer.
   */
  destroy(): void {
    this.buffer.destroy();
  }
}

/**
 * Uniform buffer manager for shader constants.
 */
export class UniformBufferManager {
  private buffers: Map<string, GPUBuffer> = new Map();

  constructor(private device: GPUDevice) {}

  /**
   * Create or update a uniform buffer.
   */
  set(name: string, data: Float32Array): GPUBuffer {
    let buffer = this.buffers.get(name);

    if (!buffer || buffer.size < data.byteLength) {
      buffer?.destroy();
      buffer = this.device.createBuffer({
        size: Math.max(data.byteLength, 16), // Min 16 bytes for alignment
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      });
      this.buffers.set(name, buffer);
    }

    this.device.queue.writeBuffer(buffer, 0, data);
    return buffer;
  }

  /**
   * Get a uniform buffer by name.
   */
  get(name: string): GPUBuffer | undefined {
    return this.buffers.get(name);
  }

  /**
   * Destroy all managed buffers.
   */
  destroy(): void {
    for (const buffer of this.buffers.values()) {
      buffer.destroy();
    }
    this.buffers.clear();
  }
}

/**
 * Helper to create common buffer types.
 */
export const BufferFactory = {
  /**
   * Create a vertex buffer.
   */
  createVertexBuffer(device: GPUDevice, data: Float32Array): GPUBuffer {
    const buffer = device.createBuffer({
      size: data.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(buffer, 0, data);
    return buffer;
  },

  /**
   * Create an index buffer.
   */
  createIndexBuffer(device: GPUDevice, data: Uint16Array | Uint32Array): GPUBuffer {
    const buffer = device.createBuffer({
      size: data.byteLength,
      usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(buffer, 0, data);
    return buffer;
  },

  /**
   * Create a uniform buffer.
   */
  createUniformBuffer(device: GPUDevice, size: number): GPUBuffer {
    return device.createBuffer({
      size: Math.max(size, 16), // Min 16 bytes for alignment
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
  },

  /**
   * Create a storage buffer.
   */
  createStorageBuffer(device: GPUDevice, size: number): GPUBuffer {
    return device.createBuffer({
      size,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
  },
};
