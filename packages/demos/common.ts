export interface DemoResources {
  pipeline: GPURenderPipeline;
  positionBuffer: GPUBuffer;
  colorBuffer: GPUBuffer;
  indexBuffer: GPUBuffer | null;
  uniformBuffer: GPUBuffer;
  bindGroup: GPUBindGroup;
  indexCount: number;
  vertexCount: number;
  instanceCount: number;
  useInstancing: boolean;
}
