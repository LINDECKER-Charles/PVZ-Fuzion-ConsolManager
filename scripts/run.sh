#!/usr/bin/env bash
# Launch pvzf-console from source (no install required).
set -e
cd "$(dirname "$0")/.."
export PYTHONPATH="src"

PY=""
for cmd in python python3 py; do
    if VERSION="$("$cmd" --version 2>&1)" && [[ "$VERSION" == Python\ 3.* ]]; then
        PY="$cmd"
        break
    fi
done
if [ -z "$PY" ]; then
    echo "error: Python 3.10+ not found on PATH." >&2
    echo "       install it from https://www.python.org/downloads/" >&2
    exit 1
fi
exec "$PY" -m pvz_console "$@"
