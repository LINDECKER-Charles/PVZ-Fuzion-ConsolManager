#!/usr/bin/env bash
# Build dist/pvzf_console.pyz with bundled data/.
set -e
cd "$(dirname "$0")/.."

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

STAGING="$(mktemp -d -t pvzf-build-XXXXXX)"
trap 'rm -rf "$STAGING"' EXIT

cp -R src/pvz_console "$STAGING/pvz_console"
mkdir -p "$STAGING/pvz_console/data"
cp -R data/. "$STAGING/pvz_console/data/"

mkdir -p dist
"$PY" -m zipapp "$STAGING" -m "pvz_console.__main__:main" -o dist/pvzf_console.pyz

if [ -f README.dist.md ]; then
    cp README.dist.md dist/README.md
fi

echo "built: dist/pvzf_console.pyz"
echo "doc:   dist/README.md"
