#!/bin/bash

set -e

# Configuration
REPO_OWNER="your-github-username"  # Update this with your GitHub username
REPO_NAME="glade"
RELEASE_TAG="libs-latest"  # Or use a specific version tag
LIBS_DIR="./libs"
VENDOR_DIR="./vendor"

# Libraries to sync
LIBS=(
    "libglfw.dylib"
    "libwebgpu_dawn.dylib"
)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting library sync to GitHub release...${NC}"

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo -e "${RED}Error: GitHub CLI (gh) is not installed.${NC}"
    echo "Please install it with: brew install gh"
    exit 1
fi

# Check if authenticated
if ! gh auth status &> /dev/null; then
    echo -e "${RED}Error: Not authenticated with GitHub CLI.${NC}"
    echo "Please run: gh auth login"
    exit 1
fi

# Create libs directory if it doesn't exist
mkdir -p "$LIBS_DIR"

# Copy libraries from vendor to libs directory
echo -e "${YELLOW}Copying libraries from vendor to libs...${NC}"
for lib in "${LIBS[@]}"; do
    if [ -f "$VENDOR_DIR/$lib" ]; then
        cp "$VENDOR_DIR/$lib" "$LIBS_DIR/"
        echo "  Copied $lib"
    else
        echo -e "${RED}  Warning: $VENDOR_DIR/$lib not found${NC}"
    fi
done

# Check if release exists, create if it doesn't
echo -e "${YELLOW}Checking for release $RELEASE_TAG...${NC}"
if ! gh release view "$RELEASE_TAG" --repo "$REPO_OWNER/$REPO_NAME" &> /dev/null; then
    echo "Creating new release $RELEASE_TAG..."
    gh release create "$RELEASE_TAG" \
        --repo "$REPO_OWNER/$REPO_NAME" \
        --title "Library Dependencies" \
        --notes "Pre-compiled library dependencies for macOS" \
        --prerelease
else
    echo "Release $RELEASE_TAG already exists"
fi

# Upload libraries as release assets
echo -e "${YELLOW}Uploading libraries to GitHub release...${NC}"
for lib in "${LIBS[@]}"; do
    lib_path="$LIBS_DIR/$lib"
    if [ -f "$lib_path" ]; then
        echo "  Uploading $lib..."
        # Delete existing asset if it exists (for updates)
        gh release delete-asset "$RELEASE_TAG" "$lib" \
            --repo "$REPO_OWNER/$REPO_NAME" \
            --yes &> /dev/null || true

        # Upload new asset
        gh release upload "$RELEASE_TAG" "$lib_path" \
            --repo "$REPO_OWNER/$REPO_NAME" \
            --clobber
        echo -e "${GREEN}  ✓ Uploaded $lib${NC}"
    else
        echo -e "${RED}  ✗ $lib_path not found${NC}"
    fi
done

echo -e "${GREEN}Library sync completed!${NC}"
echo ""
echo "Libraries are available at:"
echo "  https://github.com/$REPO_OWNER/$REPO_NAME/releases/tag/$RELEASE_TAG"