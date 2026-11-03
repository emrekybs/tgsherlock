#!/usr/bin/env bash
# One-command release: date-based version -> PyPI upload -> GitHub push.
# Users always get the newest one with:  pipx install tgsherlock  /  pipx upgrade tgsherlock
set -euo pipefail
cd "$(dirname "$0")"

VERSION="$(date -u +%Y.%-m.%-d.%-H%M)"
sed -i -E "s/^__version__ = \".*\"/__version__ = \"$VERSION\"/" src/tgsherlock/__init__.py

rm -rf dist build src/*.egg-info
pipx run build
pipx run twine upload dist/*

git add -A
git commit -m "Release $VERSION" || true
git push

echo
echo "Released tgsherlock $VERSION"
