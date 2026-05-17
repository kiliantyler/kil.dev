#!/usr/bin/env bash

set -euo pipefail

source_root="${CODEX_SOURCE_TREE_PATH:-}"
worktree_root="${CODEX_WORKTREE_PATH:-}"

if [[ -z "${source_root}" || -z "${worktree_root}" ]]; then
  echo "CODEX_SOURCE_TREE_PATH and CODEX_WORKTREE_PATH are required." >&2
  exit 1
fi

source_root="$(cd "${source_root}" && pwd)"
worktree_root="$(cd "${worktree_root}" && pwd)"

if [[ "${source_root}" == "${worktree_root}" ]]; then
  exit 0
fi

copy_if_missing() {
  local relative_path="$1"
  local source_path="${source_root}/${relative_path}"
  local worktree_path="${worktree_root}/${relative_path}"

  if [[ ! -f "${source_path}" || -e "${worktree_path}" ]]; then
    return 0
  fi

  mkdir -p "$(dirname "${worktree_path}")"
  cp -p "${source_path}" "${worktree_path}"
}

while IFS= read -r -d '' env_path; do
  relative_path="${env_path#"${source_root}/"}"

  if git -C "${source_root}" check-ignore -q -- "${relative_path}"; then
    copy_if_missing "${relative_path}"
  fi
done < <(
  find "${source_root}" \
    \( \
      -path "${source_root}/.git" \
      -o -path "${source_root}/node_modules" \
      -o -path "${source_root}/.next" \
      -o -path "${source_root}/out" \
      -o -path "${source_root}/build" \
      -o -path "${source_root}/coverage" \
      -o -path "${source_root}/test-results" \
      -o -path "${source_root}/playwright-report" \
      -o -path "${source_root}/blob-report" \
      -o -path "${source_root}/storybook-static" \
    \) \
    -prune \
    -o \
    -type f \
    \( -name '.env' -o -name '.env.*' -o -name '*.env' \) \
    -print0
)
