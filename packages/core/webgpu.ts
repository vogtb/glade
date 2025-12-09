/**
 * WebGPU constants and utilities for cross-platform usage.
 *
 * In browser environments, these constants are available as globals (GPUBufferUsage, GPUShaderStage).
 * In native environments (Dawn), these globals don't exist, so we provide them here.
 */

/**
 * Buffer usage flags for GPUBufferDescriptor.usage
 * @see https://www.w3.org/TR/webgpu/#buffer-usage
 */
export const GPUBufferUsage = {
  MAP_READ: 0x0001,
  MAP_WRITE: 0x0002,
  COPY_SRC: 0x0004,
  COPY_DST: 0x0008,
  INDEX: 0x0010,
  VERTEX: 0x0020,
  UNIFORM: 0x0040,
  STORAGE: 0x0080,
  INDIRECT: 0x0100,
  QUERY_RESOLVE: 0x0200,
} as const;

/**
 * Shader stage flags for GPUBindGroupLayoutEntry.visibility
 * @see https://www.w3.org/TR/webgpu/#shader-stage
 */
export const GPUShaderStage = {
  VERTEX: 0x1,
  FRAGMENT: 0x2,
  COMPUTE: 0x4,
} as const;

/**
 * Texture usage flags for GPUTextureDescriptor.usage
 * @see https://www.w3.org/TR/webgpu/#texture-usage
 */
export const GPUTextureUsage = {
  COPY_SRC: 0x01,
  COPY_DST: 0x02,
  TEXTURE_BINDING: 0x04,
  STORAGE_BINDING: 0x08,
  RENDER_ATTACHMENT: 0x10,
} as const;

/**
 * Map mode flags for GPUBuffer.mapAsync
 * @see https://www.w3.org/TR/webgpu/#buffer-mapping
 */
export const GPUMapMode = {
  READ: 0x0001,
  WRITE: 0x0002,
} as const;

/**
 * Color write flags for GPUColorTargetState.writeMask
 * @see https://www.w3.org/TR/webgpu/#color-target-state
 */
export const GPUColorWrite = {
  RED: 0x1,
  GREEN: 0x2,
  BLUE: 0x4,
  ALPHA: 0x8,
  ALL: 0xf,
} as const;
