#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DAWN_DIR="$SCRIPT_DIR/dawn"
BUILD_DIR="$DAWN_DIR/build"
OUTPUT_DIR="$SCRIPT_DIR"

# Check if dylib already exists
if [ -f "$OUTPUT_DIR/libwebgpu_dawn.dylib" ]; then
    echo "libwebgpu_dawn.dylib already exists, skipping build"
    exit 0
fi

echo "Building Dawn..."

# Check for cmake
if ! command -v cmake &> /dev/null; then
    echo "Error: cmake is required but not installed."
    echo "Install with: brew install cmake"
    exit 1
fi

# Check for ninja (recommended for Dawn builds)
if ! command -v ninja &> /dev/null; then
    echo "Error: ninja is required but not installed."
    echo "Install with: brew install ninja"
    exit 1
fi

# Create build directory
mkdir -p "$BUILD_DIR"
cd "$BUILD_DIR"

# Configure with CMake - build shared monolithic library for macOS
cmake .. \
    -G Ninja \
    -DCMAKE_BUILD_TYPE=Release \
    -DBUILD_SHARED_LIBS=OFF \
    -DDAWN_BUILD_MONOLITHIC_LIBRARY=SHARED \
    -DDAWN_BUILD_SAMPLES=OFF \
    -DDAWN_BUILD_TESTS=OFF \
    -DDAWN_ENABLE_INSTALL=OFF \
    -DTINT_BUILD_CMD_TOOLS=OFF \
    -DTINT_BUILD_TESTS=OFF

# Build the webgpu_dawn target
cmake --build . --config Release --target webgpu_dawn --parallel

# Find and copy the dylib to vendor directory
DYLIB_PATH=$(find "$BUILD_DIR" -name "libwebgpu_dawn.dylib" -type f | head -1)
if [ -z "$DYLIB_PATH" ]; then
    echo "Error: Could not find libwebgpu_dawn.dylib"
    exit 1
fi

cp "$DYLIB_PATH" "$OUTPUT_DIR/libwebgpu_dawn.dylib"

echo "Built libwebgpu_dawn.dylib successfully at $OUTPUT_DIR/libwebgpu_dawn.dylib"
