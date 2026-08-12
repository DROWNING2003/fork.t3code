#!/usr/bin/env bash
set -euo pipefail

output_dir="${1:?usage: build-sandbox-node-pty.sh <output-directory>}"
mkdir -p "$output_dir"
output_dir="$(cd "$output_dir" && pwd)"

docker run --rm --platform=linux/amd64 \
  -v "$output_dir:/out" \
  node:22-bookworm \
  bash -lc '
    set -eu
    install_root=/out/.node-pty-install
    rm -rf "$install_root"
    mkdir -p "$install_root"
    apt-get update -qq
    apt-get install -y -qq python3 make g++ >/dev/null
    npm install --prefix "$install_root" --omit=dev --no-audit --no-fund node-pty@1.1.0
    rm -rf \
      "$install_root/node_modules/node-pty/prebuilds" \
      "$install_root/node_modules/node-pty/deps" \
      "$install_root/node_modules/node-pty/third_party" \
      "$install_root/node_modules/node-pty/src" \
      "$install_root/node_modules/node-pty/scripts" \
      "$install_root/node_modules/node-pty/typings" \
      "$install_root/node_modules/node-pty/node_modules"
    mkdir -p /out/node_modules
    rm -rf /out/node_modules/node-pty
    cp -R "$install_root/node_modules/node-pty" /out/node_modules/
    rm -rf "$install_root"
  '
