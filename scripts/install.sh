#!/usr/bin/env bash
set -euo pipefail

echo "=== Glade Installation Script ==="

# Check for Rust/Cargo
if ! command -v cargo &> /dev/null; then
    echo "Installing Rust via rustup..."
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    source "$HOME/.cargo/env"
fi

echo "Rust version: $(rustc --version)"

# Check for wasm-pack
if ! command -v wasm-pack &> /dev/null; then
    echo "Installing wasm-pack..."
    curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh
fi

echo "wasm-pack version: $(wasm-pack --version)"

# Add wasm32 target if not present
if ! rustup target list --installed | grep -q wasm32-unknown-unknown; then
    echo "Adding wasm32-unknown-unknown target..."
    rustup target add wasm32-unknown-unknown
fi

echo ""
echo "=== All dependencies installed ==="
echo ""
echo "To build the layout WASM module:"
echo "  bun run build:layout"
