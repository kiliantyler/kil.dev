#!/usr/bin/env bash

set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

if [[ -n "${CODEX_SOURCE_TREE_PATH:-}" && -n "${CODEX_WORKTREE_PATH:-}" ]]; then
  "${repo_root}/scripts/codex/setup-worktree-local-config.sh"
fi

if [[ ! -f "${repo_root}/.env.local" && ! -f "${repo_root}/.env" && -f "${repo_root}/.env.example" ]]; then
  cp "${repo_root}/.env.example" "${repo_root}/.env.local"
fi

cd "${repo_root}"

if command -v mise >/dev/null 2>&1; then
  if [[ -f "${repo_root}/mise.toml" ]]; then
    mise trust "${repo_root}/mise.toml"
  fi

  mise install
fi

bun install --frozen-lockfile
