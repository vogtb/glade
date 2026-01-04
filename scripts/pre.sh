#!/usr/bin/env bash

# Standard pre-commit scripts. We don't have a git pre-commit configured,
# because it's a huge pain to do every time, but this is in the spirit of
# a git pre-commit.

set -euo pipefail

bun run format
bun run --filter='*' format
bun run --filter='*' lint
bun run --filter='*' typecheck
