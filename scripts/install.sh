#!/bin/bash

set -x

echo "Installing dependencies for JS/TS..."
pnpm install
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
