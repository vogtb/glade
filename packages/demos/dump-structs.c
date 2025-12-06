/**
 * Dump WebGPU struct bytes for comparison with JS version
 */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "../../vendor/dawn/out/Debug/gen/include/dawn/webgpu.h"

void dump_bytes(const char* name, void* data, size_t size) {
    printf("%s (%zu bytes):\n", name, size);
    unsigned char* bytes = (unsigned char*)data;
    for (size_t i = 0; i < size; i += 16) {
        printf("  %03zu: ", i);
        for (size_t j = i; j < i + 16 && j < size; j++) {
            printf("%02x ", bytes[j]);
        }
        printf("\n");
    }
    printf("\n");
}

int main() {
    printf("=== Struct Byte Dumps ===\n\n");
    
    // Create a dummy attribute
    WGPUVertexAttribute attribute = WGPU_VERTEX_ATTRIBUTE_INIT;
    attribute.format = WGPUVertexFormat_Float32x2;  // 0x1d
    attribute.offset = 0;
    attribute.shaderLocation = 0;
    
    dump_bytes("WGPUVertexAttribute", &attribute, sizeof(attribute));
    
    // Create vertex buffer layout pointing to attribute
    WGPUVertexBufferLayout layout = WGPU_VERTEX_BUFFER_LAYOUT_INIT;
    layout.arrayStride = 8;
    layout.stepMode = WGPUVertexStepMode_Vertex;  // 1
    layout.attributeCount = 1;
    layout.attributes = &attribute;
    
    dump_bytes("WGPUVertexBufferLayout", &layout, sizeof(layout));
    
    // Show the pointer value for attributes
    printf("Attribute pointer value: %p (0x%llx)\n\n", layout.attributes, (unsigned long long)layout.attributes);
    
    // Create a minimal render pipeline descriptor
    // First create entry point string
    const char* entryPoint = "main";
    WGPUStringView entryPointView = { .data = entryPoint, .length = 4 };
    
    // Color target
    WGPUColorTargetState colorTarget = WGPU_COLOR_TARGET_STATE_INIT;
    colorTarget.format = WGPUTextureFormat_BGRA8Unorm;  // 0x1b
    colorTarget.writeMask = WGPUColorWriteMask_All;
    
    dump_bytes("WGPUColorTargetState", &colorTarget, sizeof(colorTarget));
    
    // Fragment state
    WGPUFragmentState fragmentState = WGPU_FRAGMENT_STATE_INIT;
    fragmentState.module = (WGPUShaderModule)0x12345678;  // dummy
    fragmentState.entryPoint = entryPointView;
    fragmentState.targetCount = 1;
    fragmentState.targets = &colorTarget;
    
    dump_bytes("WGPUFragmentState", &fragmentState, sizeof(fragmentState));
    
    // Vertex state (inline in pipeline descriptor, so we check it separately)
    WGPUVertexState vertexState = WGPU_VERTEX_STATE_INIT;
    vertexState.module = (WGPUShaderModule)0x87654321;  // dummy
    vertexState.entryPoint = entryPointView;
    vertexState.bufferCount = 1;
    vertexState.buffers = &layout;
    
    dump_bytes("WGPUVertexState", &vertexState, sizeof(vertexState));
    
    // Primitive state
    WGPUPrimitiveState primitiveState = WGPU_PRIMITIVE_STATE_INIT;
    primitiveState.topology = WGPUPrimitiveTopology_TriangleList;  // 4
    
    dump_bytes("WGPUPrimitiveState", &primitiveState, sizeof(primitiveState));
    
    // Multisample state
    WGPUMultisampleState multisampleState = WGPU_MULTISAMPLE_STATE_INIT;
    
    dump_bytes("WGPUMultisampleState", &multisampleState, sizeof(multisampleState));
    
    // Full render pipeline descriptor
    WGPURenderPipelineDescriptor pipelineDesc = WGPU_RENDER_PIPELINE_DESCRIPTOR_INIT;
    pipelineDesc.vertex = vertexState;
    pipelineDesc.primitive = primitiveState;
    pipelineDesc.multisample = multisampleState;
    pipelineDesc.fragment = &fragmentState;
    
    dump_bytes("WGPURenderPipelineDescriptor", &pipelineDesc, sizeof(pipelineDesc));
    
    printf("=== Key field offsets ===\n");
    printf("Pipeline vertex offset: %zu\n", offsetof(WGPURenderPipelineDescriptor, vertex));
    printf("Pipeline primitive offset: %zu\n", offsetof(WGPURenderPipelineDescriptor, primitive));
    printf("Pipeline depthStencil offset: %zu\n", offsetof(WGPURenderPipelineDescriptor, depthStencil));
    printf("Pipeline multisample offset: %zu\n", offsetof(WGPURenderPipelineDescriptor, multisample));
    printf("Pipeline fragment offset: %zu\n", offsetof(WGPURenderPipelineDescriptor, fragment));
    printf("\n");
    
    printf("VertexState module offset: %zu\n", offsetof(WGPUVertexState, module));
    printf("VertexState entryPoint offset: %zu\n", offsetof(WGPUVertexState, entryPoint));
    printf("VertexState bufferCount offset: %zu\n", offsetof(WGPUVertexState, bufferCount));
    printf("VertexState buffers offset: %zu\n", offsetof(WGPUVertexState, buffers));
    
    return 0;
}
