/**
 * Native C test for Dawn vertex buffers
 * Compile with:
 * clang -o test-native test-native.c -L../../vendor/dawn/out/Debug -lwebgpu_dawn -I../../vendor/dawn/out/Debug/gen/include/dawn -Wl,-rpath,../../vendor/dawn/out/Debug
 */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include "webgpu.h"

// Globals for callbacks
static WGPUAdapter g_adapter = NULL;
static WGPUDevice g_device = NULL;

void adapterCallback(WGPURequestAdapterStatus status, WGPUAdapter adapter, WGPUStringView message, void* userdata1, void* userdata2) {
    if (status == WGPURequestAdapterStatus_Success) {
        g_adapter = adapter;
        printf("Adapter acquired\n");
    } else {
        printf("Failed to get adapter: %.*s\n", (int)message.length, message.data);
    }
}

void deviceCallback(WGPURequestDeviceStatus status, WGPUDevice device, WGPUStringView message, void* userdata1, void* userdata2) {
    if (status == WGPURequestDeviceStatus_Success) {
        g_device = device;
        printf("Device acquired\n");
    } else {
        printf("Failed to get device: %.*s\n", (int)message.length, message.data);
    }
}

int main() {
    printf("=== Native Dawn Vertex Buffer Test ===\n\n");
    
    // Create instance
    WGPUInstanceDescriptor instanceDesc = WGPU_INSTANCE_DESCRIPTOR_INIT;
    WGPUInstance instance = wgpuCreateInstance(&instanceDesc);
    if (!instance) {
        printf("Failed to create instance\n");
        return 1;
    }
    printf("Instance created\n");
    
    // Request adapter
    WGPURequestAdapterOptions adapterOptions = WGPU_REQUEST_ADAPTER_OPTIONS_INIT;
    WGPURequestAdapterCallbackInfo adapterCallbackInfo = {
        .nextInChain = NULL,
        .mode = WGPUCallbackMode_AllowSpontaneous,
        .callback = adapterCallback,
        .userdata1 = NULL,
        .userdata2 = NULL
    };
    wgpuInstanceRequestAdapter(instance, &adapterOptions, adapterCallbackInfo);
    
    // Wait for adapter
    while (!g_adapter) {
        wgpuInstanceProcessEvents(instance);
        usleep(1000);
    }
    
    // Request device
    WGPUDeviceDescriptor deviceDesc = WGPU_DEVICE_DESCRIPTOR_INIT;
    WGPURequestDeviceCallbackInfo deviceCallbackInfo = {
        .nextInChain = NULL,
        .mode = WGPUCallbackMode_AllowSpontaneous,
        .callback = deviceCallback,
        .userdata1 = NULL,
        .userdata2 = NULL
    };
    wgpuAdapterRequestDevice(g_adapter, &deviceDesc, deviceCallbackInfo);
    
    // Wait for device
    while (!g_device) {
        wgpuInstanceProcessEvents(instance);
        usleep(1000);
    }
    
    WGPUQueue queue = wgpuDeviceGetQueue(g_device);
    printf("Queue acquired\n");
    
    // Create vertex buffer
    float vertices[] = {
        0.0f, 0.5f,   // top
        -0.5f, -0.5f, // bottom left
        0.5f, -0.5f   // bottom right
    };
    
    WGPUBufferDescriptor bufferDesc = WGPU_BUFFER_DESCRIPTOR_INIT;
    bufferDesc.size = sizeof(vertices);
    bufferDesc.usage = WGPUBufferUsage_Vertex | WGPUBufferUsage_CopyDst;
    
    WGPUBuffer vertexBuffer = wgpuDeviceCreateBuffer(g_device, &bufferDesc);
    if (!vertexBuffer) {
        printf("Failed to create buffer\n");
        return 1;
    }
    printf("Buffer created: %p\n", vertexBuffer);
    printf("Buffer size: %zu\n", sizeof(vertices));
    
    // Write data to buffer
    wgpuQueueWriteBuffer(queue, vertexBuffer, 0, vertices, sizeof(vertices));
    printf("Buffer data written\n");
    
    // Create shader module
    const char* shaderCode = 
        "@vertex\n"
        "fn vs_main(@location(0) pos: vec2f) -> @builtin(position) vec4f {\n"
        "  return vec4f(pos, 0.0, 1.0);\n"
        "}\n"
        "\n"
        "@fragment\n"
        "fn fs_main() -> @location(0) vec4f {\n"
        "  return vec4f(0.0, 1.0, 0.0, 1.0);\n"
        "}\n";
    
    WGPUShaderSourceWGSL wgslSource = {
        .chain = { .next = NULL, .sType = WGPUSType_ShaderSourceWGSL },
        .code = { .data = shaderCode, .length = strlen(shaderCode) }
    };
    
    WGPUShaderModuleDescriptor shaderDesc = WGPU_SHADER_MODULE_DESCRIPTOR_INIT;
    shaderDesc.nextInChain = (WGPUChainedStruct*)&wgslSource;
    
    WGPUShaderModule shaderModule = wgpuDeviceCreateShaderModule(g_device, &shaderDesc);
    if (!shaderModule) {
        printf("Failed to create shader module\n");
        return 1;
    }
    printf("Shader module created\n");
    
    // Create vertex buffer layout
    WGPUVertexAttribute attribute = WGPU_VERTEX_ATTRIBUTE_INIT;
    attribute.format = WGPUVertexFormat_Float32x2;
    attribute.offset = 0;
    attribute.shaderLocation = 0;
    
    WGPUVertexBufferLayout vertexBufferLayout = WGPU_VERTEX_BUFFER_LAYOUT_INIT;
    vertexBufferLayout.arrayStride = 8;
    vertexBufferLayout.stepMode = WGPUVertexStepMode_Vertex;
    vertexBufferLayout.attributeCount = 1;
    vertexBufferLayout.attributes = &attribute;
    
    printf("\nVertex buffer layout:\n");
    printf("  arrayStride: %llu\n", vertexBufferLayout.arrayStride);
    printf("  stepMode: %d\n", vertexBufferLayout.stepMode);
    printf("  attributeCount: %zu\n", vertexBufferLayout.attributeCount);
    printf("  attribute.format: 0x%x\n", attribute.format);
    printf("  attribute.offset: %llu\n", attribute.offset);
    printf("  attribute.shaderLocation: %d\n", attribute.shaderLocation);
    
    // Create render pipeline
    WGPUColorTargetState colorTarget = WGPU_COLOR_TARGET_STATE_INIT;
    colorTarget.format = WGPUTextureFormat_BGRA8Unorm;
    colorTarget.writeMask = WGPUColorWriteMask_All;
    
    WGPUFragmentState fragmentState = WGPU_FRAGMENT_STATE_INIT;
    fragmentState.module = shaderModule;
    fragmentState.entryPoint = (WGPUStringView){ .data = "fs_main", .length = 7 };
    fragmentState.targetCount = 1;
    fragmentState.targets = &colorTarget;
    
    WGPURenderPipelineDescriptor pipelineDesc = WGPU_RENDER_PIPELINE_DESCRIPTOR_INIT;
    pipelineDesc.vertex.module = shaderModule;
    pipelineDesc.vertex.entryPoint = (WGPUStringView){ .data = "vs_main", .length = 7 };
    pipelineDesc.vertex.bufferCount = 1;
    pipelineDesc.vertex.buffers = &vertexBufferLayout;
    pipelineDesc.primitive.topology = WGPUPrimitiveTopology_TriangleList;
    pipelineDesc.fragment = &fragmentState;
    pipelineDesc.multisample.count = 1;
    pipelineDesc.multisample.mask = 0xFFFFFFFF;
    
    WGPURenderPipeline pipeline = wgpuDeviceCreateRenderPipeline(g_device, &pipelineDesc);
    if (!pipeline) {
        printf("Failed to create render pipeline\n");
        return 1;
    }
    printf("Render pipeline created: %p\n", pipeline);
    
    printf("\n=== SUCCESS: All Dawn objects created successfully ===\n");
    printf("The vertex buffer setup works at the native level.\n");
    printf("If the JS version doesn't render, the issue is in FFI or struct marshalling.\n");
    
    // Cleanup
    wgpuRenderPipelineRelease(pipeline);
    wgpuShaderModuleRelease(shaderModule);
    wgpuBufferRelease(vertexBuffer);
    wgpuQueueRelease(queue);
    wgpuDeviceRelease(g_device);
    wgpuAdapterRelease(g_adapter);
    wgpuInstanceRelease(instance);
    
    return 0;
}
