#!/bin/zsh
cd "$(dirname "$0")"
export PATH="/usr/local/bin:/opt/homebrew/bin:$PATH"
node launcher.mjs simulation
