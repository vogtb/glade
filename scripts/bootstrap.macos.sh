#!/bin/bash

set -e

echo "Bootstrapping dev env..."

# Install JS tooling
echo "Installing Node.js..."
brew install node@24

echo "Installing Bun..."
curl -fsSL https://bun.sh/install | bash

# Installing GH CLI
echo "Installing Github CLI..."
brew install gh

# Install Rust
echo "Installing Rust..."
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y

# Source cargo environment
source "$HOME/.cargo/env"

# Install wasm-pack if not already installed
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

echo "Bootstrapping dev env complete"
