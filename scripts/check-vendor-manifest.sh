#!/bin/sh
# Vendoring discipline, mechanized: any staged change under vendor/*/src or a
# vendored bin.js must come with a vendor/README.md change in the same commit
# (the manifest's local-modification log is the contract — see vendor/README.md).
set -eu

if ! command -v grep >/dev/null 2>&1 || ! command -v sed >/dev/null 2>&1; then
  echo 'vendor manifest guard: grep and sed are required' >&2
  exit 1
fi

staged=$(git diff --cached --name-only)

vendor_src_changed=$(printf '%s\n' "$staged" | grep -E '^vendor/[^/]+/(src/|bin\.js)' || true)
manifest_changed=$(printf '%s\n' "$staged" | grep -x 'vendor/README.md' || true)

if [ -n "$vendor_src_changed" ] && [ -z "$manifest_changed" ]; then
  echo 'vendor manifest guard: vendored SOURCE changed without updating vendor/README.md:'
  printf '%s\n' "$vendor_src_changed" | sed 's/^/  /'
  echo 'Log the modification in vendor/README.md ("Local modifications") and stage it.'
  exit 1
fi
