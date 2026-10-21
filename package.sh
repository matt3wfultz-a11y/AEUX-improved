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
ZXP_NAME="AEUX_$VERSION.zxp"

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
# zip -r adds to an existing archive rather than replacing it, and a leftover
# ZXP would get shipped even if this run doesn't sign one
rm -rf "$OUT_DIR" "$SCRIPT_DIR/$ZIP_NAME" "$SCRIPT_DIR/$ZXP_NAME"
mkdir -p "$OUT_DIR"

# After Effects extension (the whole folder goes into CEP/extensions/)
cp -r "$SCRIPT_DIR/Ae/AEUX" "$OUT_DIR/AEUX"
# Remove dev-only files from the copy. Two things that look like build tooling
# are read at runtime and have to stay:
#   src/host   - CSXS/manifest.xml loads the ExtendScript from
#                ./src/host/AEFT/host.jsx, so without it the panel opens but
#                every command fails with "AEUX is undefined"
#   package.json - cep-spy reads it from the extension root on startup and
#                throws if it isn't there, which takes the whole panel down
rm -rf "$OUT_DIR/AEUX/node_modules" \
       "$OUT_DIR/AEUX/babel.config.js" \
       "$OUT_DIR/AEUX/vue.config.js" \
       "$OUT_DIR/AEUX/package-lock.json" \
       "$OUT_DIR/AEUX/README.md"
find "$OUT_DIR/AEUX/src" -mindepth 1 -maxdepth 1 ! -name host -exec rm -rf {} +
rm -f "$OUT_DIR/AEUX/src/host/AEFT/host.ts" "$OUT_DIR/AEUX/src/host/AEFT/tsconfig.json"
# The dotfiles are bombino/git config, plus .debug, which opens a remote
# debugging port in every install. ZXPSignCmd (the Windows build at least)
# signs dotfiles but leaves them out of the archive, so a ZXP built with them
# fails verification.
find "$OUT_DIR/AEUX" -name '.*' -exec rm -rf {} +

# a package missing either of those installs cleanly and then does nothing,
# so fail here instead of shipping it
for required in "src/host/AEFT/host.jsx" "package.json" "dist/index.html" "CSXS/manifest.xml"; do
  if [ ! -f "$OUT_DIR/AEUX/$required" ]; then
    echo "Error: $required missing from the packaged extension."
    exit 1
  fi
done

# Figma plugin (manifest + compiled dist)
mkdir -p "$OUT_DIR/AEUX-Figma"
cp "$SCRIPT_DIR/Figma/AEUX/manifest.json" "$OUT_DIR/AEUX-Figma/"
cp -r "$SCRIPT_DIR/Figma/AEUX/dist" "$OUT_DIR/AEUX-Figma/dist"

# Installers and docs
cp "$SCRIPT_DIR/install-mac.sh" "$OUT_DIR/"
cp "$SCRIPT_DIR/install-aeux-windows.bat" "$OUT_DIR/"
cp "$SCRIPT_DIR/INSTALL.md" "$OUT_DIR/"
chmod +x "$OUT_DIR/install-mac.sh"

# ── Sign the After Effects extension as a ZXP ─────────────────────────────────
# ZXPSignCmd is Adobe's signing tool, published for macOS and Windows only:
# https://github.com/Adobe-CEP/CEP-Resources/tree/master/ZXPSignCMD
# Put it on PATH or point ZXPSIGNCMD at it; elsewhere a Windows .exe runs under
# wine. Without it the zip is built as before, just without the ZXP.
ZXPSIGN=()
if [ -n "$ZXPSIGNCMD" ]; then
  ZXPSIGN=("$ZXPSIGNCMD")
  case "$ZXPSIGNCMD:$(uname -s)" in
    *.exe:MINGW*|*.exe:MSYS*|*.exe:CYGWIN*) ;;
    *.exe:*) ZXPSIGN=(wine "$ZXPSIGNCMD") ;;
  esac
elif command -v ZXPSignCmd >/dev/null 2>&1; then
  ZXPSIGN=(ZXPSignCmd)
fi

echo ""
if [ ${#ZXPSIGN[@]} -eq 0 ]; then
  echo "ZXPSignCmd not found, skipping the ZXP. Set ZXPSIGNCMD to build one."
else
  echo "Signing $ZXP_NAME..."
  # paths stay relative: under wine, ZXPSignCmd rejects absolute Unix paths
  cd "$OUT_DIR"
  # ZXP installers accept a self-signed cert, so a throwaway one will do
  CERT_PASS=aeux
  "${ZXPSIGN[@]}" -selfSignedCert US CA AEUX AEUX "$CERT_PASS" cert.p12 >/dev/null
  # a timestamped signature stays valid after the cert expires; an untimestamped
  # one stops loading in After Effects on that date
  if ! "${ZXPSIGN[@]}" -sign AEUX "$ZXP_NAME" cert.p12 "$CERT_PASS" -tsa http://timestamp.digicert.com; then
    echo "  Couldn't reach the timestamp server, signing without one."
    echo "  This ZXP stops loading when its certificate expires."
    "${ZXPSIGN[@]}" -sign AEUX "$ZXP_NAME" cert.p12 "$CERT_PASS"
  fi
  # .rnd is the random seed OpenSSL leaves behind when it makes the cert
  rm -f cert.p12 .rnd
  "${ZXPSIGN[@]}" -verify "$ZXP_NAME"
  cp "$ZXP_NAME" "$SCRIPT_DIR/"
fi

# ── Create zip ────────────────────────────────────────────────────────────────
cd "$OUT_DIR"
zip -r "$SCRIPT_DIR/$ZIP_NAME" . -x "*.DS_Store"
rm -rf "$OUT_DIR"

echo ""
echo "Done! Created: $ZIP_NAME"
if [ -f "$SCRIPT_DIR/$ZXP_NAME" ]; then
  echo "               $ZXP_NAME (also inside the zip)"
fi
echo ""
echo "Send the zip to colleagues. They:"
echo "  Mac:     double-click the zip, then run install-mac.sh"
echo "  Windows: double-click the zip, then run install-aeux-windows.bat"
if [ -f "$SCRIPT_DIR/$ZXP_NAME" ]; then
  echo "  or open the .zxp with a ZXP installer (see INSTALL.md)"
fi
