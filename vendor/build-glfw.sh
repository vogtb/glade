#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GLFW_DIR="$SCRIPT_DIR/glfw"
BUILD_DIR="$GLFW_DIR/build"
OUTPUT_DIR="$SCRIPT_DIR"

# Check if dylib already exists
if [ -f "$OUTPUT_DIR/libglfw.dylib" ]; then
    echo "libglfw.dylib already exists, skipping build"
    exit 0
fi

echo "Building GLFW..."

# Check for cmake
if ! command -v cmake &> /dev/null; then
    echo "Error: cmake is required but not installed."
    echo "Install with: brew install cmake"
    exit 1
fi

# Create build directory
mkdir -p "$BUILD_DIR"
cd "$BUILD_DIR"

# Configure with CMake - build shared library for macOS
cmake .. \
    -DCMAKE_BUILD_TYPE=Release \
    -DBUILD_SHARED_LIBS=ON \
    -DGLFW_BUILD_EXAMPLES=OFF \
    -DGLFW_BUILD_TESTS=OFF \
    -DGLFW_BUILD_DOCS=OFF

# Build
cmake --build . --config Release --parallel

# Copy the actual dylib (not symlinks) to vendor directory
cp "$BUILD_DIR/src/libglfw.3.dylib" "$OUTPUT_DIR/libglfw.dylib"

echo "Built libglfw.dylib successfully at $OUTPUT_DIR/libglfw.dylib"
