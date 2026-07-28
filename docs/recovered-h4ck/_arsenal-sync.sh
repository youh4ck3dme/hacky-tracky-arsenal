#!/usr/bin/env bash
# Shared git sync for H4CK arsenal module scripts.
# shellcheck disable=SC2034
ARSENAL_SYNC_FAIL=0

_resolve_origin_branch() {
  local branch
  branch="$(git symbolic-ref -q --short HEAD 2>/dev/null || true)"
  if [[ -n "$branch" && "$branch" != "HEAD" ]]; then
    echo "$branch"
    return 0
  fi
  branch="$(git remote show origin 2>/dev/null | awk '/HEAD branch/ {print $NF}')"
  if [[ -n "$branch" ]]; then
    echo "$branch"
    return 0
  fi
  for candidate in main master; do
    if git show-ref --verify --quiet "refs/remotes/origin/${candidate}"; then
      echo "$candidate"
      return 0
    fi
  done
  echo "main"
}

_git_sync_in_dir() {
  git stash push -u -m "arsenal-pwa sync $(date +%Y%m%d-%H%M%S)" >/dev/null 2>&1 || true
  if ! git fetch --prune origin 2>/dev/null; then
    git fetch --depth=1 origin 2>/dev/null || return 1
  fi
  local branch
  branch="$(_resolve_origin_branch)"
  if git reset --hard "origin/${branch}" 2>/dev/null; then
    return 0
  fi
  git reset --hard FETCH_HEAD 2>/dev/null || return 1
}

sync_repo() {
  local dir="$1" url="$2"
  if [[ -z "$dir" || -z "$url" ]]; then
    echo "sync_repo: missing directory or url" >&2
    return 1
  fi

  if [[ -d "$dir" && ! -d "$dir/.git" ]]; then
    echo "⚠ $dir exists without .git — removing stale directory..."
    rm -rf "$dir"
  fi

  if [[ -d "$dir/.git" ]]; then
    echo "↻ Updating $dir..."
    if ( cd "$dir" && _git_sync_in_dir ); then
      echo "✓ $dir updated"
      return 0
    fi
    echo "✗ Failed to update $dir" >&2
    return 1
  fi

  if [[ -d "$dir" ]]; then
    rm -rf "$dir"
  fi

  echo "⬇ Cloning $dir..."
  if git clone --quiet --depth=1 "$url" "$dir"; then
    echo "✓ $dir cloned"
    return 0
  fi
  echo "✗ Failed to clone $url -> $dir" >&2
  return 1
}

sync_repo_optional() {
  sync_repo "$@" || echo "⚠ Optional repo skipped: $1"
}

require_sync() {
  if ! sync_repo "$@"; then
    ARSENAL_SYNC_FAIL=1
    return 1
  fi
}

require_sync_optional() {
  sync_repo_optional "$@" || true
}
