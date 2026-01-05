#!/bin/bash
set -e

REPO="vogtb/glade"
BIN_PATH="./packages/demos/dist/glade.demos.bin"
RELEASE_TAG="v0.0.1"

echo "Building demos for macOS..."
bun run build:demos:macos

if [[ ! -f "$BIN_PATH" ]]; then
    echo "Error: $BIN_PATH not found"
    exit 1
fi

if ! gh release view "$RELEASE_TAG" --repo "$REPO" > /dev/null 2>&1; then
    echo "Release $RELEASE_TAG not found, creating..."
    gh release create "$RELEASE_TAG" --repo "$REPO" --title "$RELEASE_TAG" --notes "Glade $RELEASE_TAG"
fi

echo "Uploading $BIN_PATH to release $RELEASE_TAG..."

gh release upload "$RELEASE_TAG" "$BIN_PATH" --repo "$REPO" --clobber

gh release edit "$RELEASE_TAG" --repo "$REPO" --latest

echo "Successfully uploaded glade.demos.bin to release $RELEASE_TAG"
