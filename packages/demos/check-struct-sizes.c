#include <stdio.h>
#include <stddef.h>
#include "../../vendor/dawn/out/Debug/gen/include/dawn/webgpu.h"

int main() {
    printf("=== WebGPU Struct Sizes and Offsets ===\n\n");

    printf("WGPUVertexAttribute:\n");
    printf("  sizeof: %zu\n", sizeof(WGPUVertexAttribute));
    printf("  offsetof nextInChain: %zu\n", offsetof(WGPUVertexAttribute, nextInChain));
    printf("  offsetof format: %zu\n", offsetof(WGPUVertexAttribute, format));
    printf("  offsetof offset: %zu\n", offsetof(WGPUVertexAttribute, offset));
    printf("  offsetof shaderLocation: %zu\n", offsetof(WGPUVertexAttribute, shaderLocation));
    printf("\n");

    printf("WGPUVertexBufferLayout:\n");
    printf("  sizeof: %zu\n", sizeof(WGPUVertexBufferLayout));
    printf("  offsetof nextInChain: %zu\n", offsetof(WGPUVertexBufferLayout, nextInChain));
    printf("  offsetof stepMode: %zu\n", offsetof(WGPUVertexBufferLayout, stepMode));
    printf("  offsetof arrayStride: %zu\n", offsetof(WGPUVertexBufferLayout, arrayStride));
    printf("  offsetof attributeCount: %zu\n", offsetof(WGPUVertexBufferLayout, attributeCount));
    printf("  offsetof attributes: %zu\n", offsetof(WGPUVertexBufferLayout, attributes));
    printf("\n");

    printf("WGPUBufferDescriptor:\n");
    printf("  sizeof: %zu\n", sizeof(WGPUBufferDescriptor));
    printf("  offsetof nextInChain: %zu\n", offsetof(WGPUBufferDescriptor, nextInChain));
    printf("  offsetof label: %zu\n", offsetof(WGPUBufferDescriptor, label));
    printf("  offsetof usage: %zu\n", offsetof(WGPUBufferDescriptor, usage));
    printf("  offsetof size: %zu\n", offsetof(WGPUBufferDescriptor, size));
    printf("  offsetof mappedAtCreation: %zu\n", offsetof(WGPUBufferDescriptor, mappedAtCreation));
    printf("\n");

    printf("WGPUVertexState:\n");
    printf("  sizeof: %zu\n", sizeof(WGPUVertexState));
    printf("  offsetof nextInChain: %zu\n", offsetof(WGPUVertexState, nextInChain));
    printf("  offsetof module: %zu\n", offsetof(WGPUVertexState, module));
    printf("  offsetof entryPoint: %zu\n", offsetof(WGPUVertexState, entryPoint));
    printf("  offsetof constantCount: %zu\n", offsetof(WGPUVertexState, constantCount));
    printf("  offsetof constants: %zu\n", offsetof(WGPUVertexState, constants));
    printf("  offsetof bufferCount: %zu\n", offsetof(WGPUVertexState, bufferCount));
    printf("  offsetof buffers: %zu\n", offsetof(WGPUVertexState, buffers));
    printf("\n");

    printf("WGPURenderPipelineDescriptor:\n");
    printf("  sizeof: %zu\n", sizeof(WGPURenderPipelineDescriptor));
    printf("  offsetof nextInChain: %zu\n", offsetof(WGPURenderPipelineDescriptor, nextInChain));
    printf("  offsetof label: %zu\n", offsetof(WGPURenderPipelineDescriptor, label));
    printf("  offsetof layout: %zu\n", offsetof(WGPURenderPipelineDescriptor, layout));
    printf("  offsetof vertex: %zu\n", offsetof(WGPURenderPipelineDescriptor, vertex));
    printf("  offsetof primitive: %zu\n", offsetof(WGPURenderPipelineDescriptor, primitive));
    printf("  offsetof depthStencil: %zu\n", offsetof(WGPURenderPipelineDescriptor, depthStencil));
    printf("  offsetof multisample: %zu\n", offsetof(WGPURenderPipelineDescriptor, multisample));
    printf("  offsetof fragment: %zu\n", offsetof(WGPURenderPipelineDescriptor, fragment));
    printf("\n");

    printf("WGPUPrimitiveState:\n");
    printf("  sizeof: %zu\n", sizeof(WGPUPrimitiveState));
    printf("  offsetof nextInChain: %zu\n", offsetof(WGPUPrimitiveState, nextInChain));
    printf("  offsetof topology: %zu\n", offsetof(WGPUPrimitiveState, topology));
    printf("  offsetof stripIndexFormat: %zu\n", offsetof(WGPUPrimitiveState, stripIndexFormat));
    printf("  offsetof frontFace: %zu\n", offsetof(WGPUPrimitiveState, frontFace));
    printf("  offsetof cullMode: %zu\n", offsetof(WGPUPrimitiveState, cullMode));
    printf("  offsetof unclippedDepth: %zu\n", offsetof(WGPUPrimitiveState, unclippedDepth));
    printf("\n");

    printf("WGPUMultisampleState:\n");
    printf("  sizeof: %zu\n", sizeof(WGPUMultisampleState));
    printf("  offsetof nextInChain: %zu\n", offsetof(WGPUMultisampleState, nextInChain));
    printf("  offsetof count: %zu\n", offsetof(WGPUMultisampleState, count));
    printf("  offsetof mask: %zu\n", offsetof(WGPUMultisampleState, mask));
    printf("  offsetof alphaToCoverageEnabled: %zu\n", offsetof(WGPUMultisampleState, alphaToCoverageEnabled));
    printf("\n");

    return 0;
}
