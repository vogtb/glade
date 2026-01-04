#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Glade installation script
GLADE_VERSION="latest"
INSTALL_DIR="$HOME/.glade/bin"
BINARY_NAME="glade"

# Detect OS
OS="$(uname -s)"
ARCH="$(uname -m)"

print_error() {
    echo -e "${RED}Error: $1${NC}" >&2
}

print_success() {
    echo -e "${GREEN}$1${NC}"
}

print_info() {
    echo -e "${YELLOW}$1${NC}"
}

# Check OS compatibility
case "$OS" in
    Darwin)
        PLATFORM="darwin"
        ;;
    Linux)
        print_error "Linux is not currently supported. Please check https://glade.graphics for updates."
        exit 1
        ;;
    *)
        print_error "Unsupported operating system: $OS"
        exit 1
        ;;
esac

# Check architecture
case "$ARCH" in
    x86_64)
        ARCH_SUFFIX="x64"
        ;;
    arm64|aarch64)
        ARCH_SUFFIX="arm64"
        ;;
    *)
        print_error "Unsupported architecture: $ARCH"
        exit 1
        ;;
esac

# Construct download URL
# TODO: the actual URL will probably be different.
DOWNLOAD_URL="https://glade.graphics/downloads/${GLADE_VERSION}/glade-${PLATFORM}-${ARCH_SUFFIX}"

print_info "Installing Glade for ${PLATFORM}-${ARCH_SUFFIX}..."

# Create installation directory
mkdir -p "$INSTALL_DIR"

# Download binary
print_info "Downloading Glade binary..."
if command -v curl >/dev/null 2>&1; then
    curl -fsSL "$DOWNLOAD_URL" -o "$INSTALL_DIR/$BINARY_NAME"
elif command -v wget >/dev/null 2>&1; then
    wget -q -O "$INSTALL_DIR/$BINARY_NAME" "$DOWNLOAD_URL"
else
    print_error "Neither curl nor wget found. Please install one of them."
    exit 1
fi

# Make binary executable
chmod +x "$INSTALL_DIR/$BINARY_NAME"

# Add to PATH if not already there
if [[ ":$PATH:" != *":$INSTALL_DIR:"* ]]; then
    print_info "Adding $INSTALL_DIR to PATH..."

    # Detect shell and update appropriate rc file
    if [[ "$SHELL" == *"zsh"* ]]; then
        SHELL_RC="$HOME/.zshrc"
    elif [[ "$SHELL" == *"bash"* ]]; then
        SHELL_RC="$HOME/.bashrc"
    else
        SHELL_RC="$HOME/.profile"
    fi

    echo "" >> "$SHELL_RC"
    echo "# Glade" >> "$SHELL_RC"
    echo "export PATH=\"\$PATH:$INSTALL_DIR\"" >> "$SHELL_RC"

    print_success " Added to $SHELL_RC"
    print_info "Run 'source $SHELL_RC' or restart your terminal to use glade"
else
    print_info " $INSTALL_DIR already in PATH"
fi

# Verify installation
if [ -x "$INSTALL_DIR/$BINARY_NAME" ]; then
    print_success " Glade installed successfully to $INSTALL_DIR/$BINARY_NAME"
    print_info "Run 'glade --version' to verify the installation"
else
    print_error "Installation failed. Binary not found or not executable."
    exit 1
fi