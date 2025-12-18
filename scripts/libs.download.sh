#!/bin/bash

set -e

# Configuration
REPO_OWNER="vogtb"  # Update this with your GitHub username
REPO_NAME="glade"
RELEASE_TAG="libs-latest"
LIBS_DIR="./libs"

# Libraries to download
LIBS=(
    "libglfw.dylib"
    "libwebgpu_dawn.dylib"
)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting library download from GitHub release...${NC}"

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo -e "${RED}Error: GitHub CLI (gh) is not installed.${NC}"
    echo "Please install it with: brew install gh"
    exit 1
fi

# Create libs directory if it doesn't exist
mkdir -p "$LIBS_DIR"

# Check if release exists
echo -e "${YELLOW}Checking for release $RELEASE_TAG...${NC}"
if ! gh release view "$RELEASE_TAG" --repo "$REPO_OWNER/$REPO_NAME" &> /dev/null; then
    echo -e "${RED}Error: Release $RELEASE_TAG not found${NC}"
    echo "Please run ./scripts/libs.sync.sh first to upload the libraries"
    exit 1
fi

# Download libraries from release
echo -e "${YELLOW}Downloading libraries from GitHub release...${NC}"
for lib in "${LIBS[@]}"; do
    echo "  Downloading $lib..."

    # Download the asset
    if gh release download "$RELEASE_TAG" \
        --repo "$REPO_OWNER/$REPO_NAME" \
        --pattern "$lib" \
        --dir "$LIBS_DIR" \
        --clobber 2>/dev/null; then
        echo -e "${GREEN}  ✓ Downloaded $lib${NC}"
    else
        echo -e "${RED}  ✗ Failed to download $lib${NC}"
        echo "    This library may not be available in the release"
    fi
done

# Set executable permissions on downloaded libraries
echo -e "${YELLOW}Setting executable permissions...${NC}"
for lib in "${LIBS[@]}"; do
    lib_path="$LIBS_DIR/$lib"
    if [ -f "$lib_path" ]; then
        chmod +x "$lib_path"
        echo "  Set +x on $lib"
    fi
done

# Verify downloads
echo -e "${YELLOW}Verifying downloaded libraries...${NC}"
all_present=true
for lib in "${LIBS[@]}"; do
    lib_path="$LIBS_DIR/$lib"
    if [ -f "$lib_path" ]; then
        size=$(ls -lh "$lib_path" | awk '{print $5}')
        echo -e "${GREEN}  ✓ $lib ($size)${NC}"
    else
        echo -e "${RED}  ✗ $lib not found${NC}"
        all_present=false
    fi
done

if [ "$all_present" = true ]; then
    echo -e "${GREEN}All libraries downloaded successfully!${NC}"
else
    echo -e "${YELLOW}Some libraries were not downloaded.${NC}"
    echo "You may need to run ./scripts/libs.sync.sh first"
    exit 1
fi