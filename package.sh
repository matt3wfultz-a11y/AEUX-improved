#!/bin/bash
# Builds all plugins and creates a distributable zip your colleagues can use.
# Run from the repo root: ./package.sh
# Output: AEUX_<version>.zip

set -e

# Webpack 4 uses a legacy OpenSSL hash that Node 17+ removed; this re-enables it.
export NODE_OPTIONS=--openssl-legacy-provider

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VERSION=$(node -p "require('$SCRIPT_DIR/Ae/AEUX/package.json').version" 2>/dev/null || echo "0.0.0")
OUT_DIR="$SCRIPT_DIR/.package-build"
ZIP_NAME="AEUX_$VERSION.zip"

echo "=== Building AEUX v$VERSION ==="
echo ""

# ── Build After Effects panel ─────────────────────────────────────────────────
echo "Building After Effects extension..."
cd "$SCRIPT_DIR/Ae/AEUX"
npm install --silent
npm run build --silent
echo "  Done."

# ── Build Figma plugin ────────────────────────────────────────────────────────
echo "Building Figma plugin..."
cd "$SCRIPT_DIR/Figma/AEUX"
npm install --silent
npm run build --silent
echo "  Done."

# ── Assemble distributable ────────────────────────────────────────────────────
echo ""
echo "Assembling distributable..."
rm -rf "$OUT_DIR"
mkdir -p "$OUT_DIR"

# After Effects extension (the whole folder goes into CEP/extensions/)
cp -r "$SCRIPT_DIR/Ae/AEUX" "$OUT_DIR/AEUX"
# Remove dev-only files from the copy
rm -rf "$OUT_DIR/AEUX/node_modules" \
       "$OUT_DIR/AEUX/src" \
       "$OUT_DIR/AEUX/babel.config.js" \
       "$OUT_DIR/AEUX/vue.config.js" \
       "$OUT_DIR/AEUX/package.json" \
       "$OUT_DIR/AEUX/package-lock.json" \
       "$OUT_DIR/AEUX/README.md"

# Figma plugin (manifest + compiled dist)
mkdir -p "$OUT_DIR/AEUX-Figma"
cp "$SCRIPT_DIR/Figma/AEUX/manifest.json" "$OUT_DIR/AEUX-Figma/"
cp -r "$SCRIPT_DIR/Figma/AEUX/dist" "$OUT_DIR/AEUX-Figma/dist"

# Installers and docs
cp "$SCRIPT_DIR/install-mac.sh" "$OUT_DIR/"
cp "$SCRIPT_DIR/install-aeux-windows.bat" "$OUT_DIR/"
cp "$SCRIPT_DIR/INSTALL.md" "$OUT_DIR/"
chmod +x "$OUT_DIR/install-mac.sh"

# ── Create zip ────────────────────────────────────────────────────────────────
cd "$OUT_DIR"
zip -r "$SCRIPT_DIR/$ZIP_NAME" . -x "*.DS_Store"
rm -rf "$OUT_DIR"

echo ""
echo "Done! Created: $ZIP_NAME"
echo ""
echo "Send this file to colleagues. They:"
echo "  Mac:     double-click the zip, then run install-mac.sh"
echo "  Windows: double-click the zip, then run install-aeux-windows.bat"
