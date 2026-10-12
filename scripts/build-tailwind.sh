#!/usr/bin/env bash
# Rebuilds www/tailwind.min.css from tailwind.config.js + tailwind.input.css.
# Run from anywhere after adding new Tailwind classes to any page:
#   ./scripts/build-tailwind.sh
# Installs the build tools into a temp folder, so nothing is added to package.json.
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TOOLS="${TMPDIR:-/tmp}/mc-tailwind-tools"
if [ ! -x "$TOOLS/node_modules/.bin/tailwindcss" ]; then
  echo "Installing Tailwind build tools (one-time)…"
  mkdir -p "$TOOLS"
  (cd "$TOOLS" && npm init -y >/dev/null && npm i --silent tailwindcss@3.4.17 @tailwindcss/forms@0.5.9 @tailwindcss/container-queries@0.1.1)
fi
cp "$ROOT/tailwind.config.js" "$TOOLS/tailwind.config.js"
cd "$ROOT"
"$TOOLS/node_modules/.bin/tailwindcss" -c "$TOOLS/tailwind.config.js" -i tailwind.input.css -o www/tailwind.min.css --minify
echo "✅ www/tailwind.min.css rebuilt"
