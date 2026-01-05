#!/bin/bash
set -e

# Uploads the dawn dylib so we don't have to build it anytime we clone the
# repo.

DYLIB_PATH="./libs/libwebgpu_dawn.dylib"
REPO="vogtb/glade"

if [[ ! -f "$DYLIB_PATH" ]]; then
    echo "Error: $DYLIB_PATH not found"
    exit 1
fi

DAWN_TAG="vendor-dawn-v0.0.1"

if ! gh release view "$DAWN_TAG" --repo "$REPO" > /dev/null 2>&1; then
    echo "Release $DAWN_TAG not found, creating..."
    gh release create "$DAWN_TAG" --repo "$REPO" --title "libwebgpu_dawn.dylib v0.0.1" --notes "Pre-built Dawn WebGPU dylib"
fi

echo "Uploading $DYLIB_PATH to release $DAWN_TAG..."

gh release upload "$DAWN_TAG" "$DYLIB_PATH" --repo "$REPO" --clobber

gh release edit "$DAWN_TAG" --repo "$REPO" --latest

echo "Successfully uploaded libwebgpu_dawn.dylib to release $DAWN_TAG"
