/**
 * GPU buffer management utilities for Glade.
 *
 * Provides pooling and dynamic resizing for GPU buffers used in rendering.
 */

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
