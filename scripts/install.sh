#!/bin/bash

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
LIBS_DIR="$ROOT_DIR/libs"

echo "Installing dependencies for JS/TS..."
bun install
echo "Done installing dependencies for JS/TS"

echo "Installing dependencies for rust..."
cargo update
echo "Done installing dependencies for rust"

echo "Installing components for rust..."
rustup component add rustfmt clippy
echo "Done installing components for rust"

if ! command -v wasm-pack &> /dev/null; then
    echo "Installing wasm-pack..."
    curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh
    echo "Done installing wasm-pack..."
fi

echo "Adding targets for rust..."
rustup target add wasm32-unknown-unknown
echo "Done adding targets for rust"

echo "Installing libs..."
mkdir -p "$LIBS_DIR"

GLFW_DYLIB="$LIBS_DIR/libglfw.dylib"
if [ -f "$GLFW_DYLIB" ]; then
    echo "libglfw.dylib already exists, skipping download"
else
    echo "Downloading GLFW 3.4 for macOS..."
    GLFW_URL="https://github.com/glfw/glfw/releases/download/3.4/glfw-3.4.bin.MACOS.zip"
    TEMP_DIR=$(mktemp -d)

    curl -L "$GLFW_URL" -o "$TEMP_DIR/glfw.zip"
    unzip -q "$TEMP_DIR/glfw.zip" -d "$TEMP_DIR"

    cp "$TEMP_DIR/glfw-3.4.bin.MACOS/lib-universal/libglfw.3.dylib" "$GLFW_DYLIB"

    rm -rf "$TEMP_DIR"
    echo "Downloaded libglfw.dylib to $GLFW_DYLIB"
fi

DAWN_DYLIB="$LIBS_DIR/libwebgpu_dawn.dylib"
if [ -f "$DAWN_DYLIB" ]; then
    echo "libwebgpu_dawn.dylib already exists, skipping download"
else
    echo "Downloading libwebgpu_dawn.dylib..."
    gh release download "vendor-dawn-v0.0.1" --repo "vogtb/glade" --pattern "libwebgpu_dawn.dylib" --dir "$LIBS_DIR" --clobber
    echo "Downloaded libwebgpu_dawn.dylib to $DAWN_DYLIB"
fi

echo "Done installing libs"