#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AE_EXTENSION_SRC="$SCRIPT_DIR/AEUX"
AE_EXTENSIONS_DIR="$HOME/Library/Application Support/Adobe/CEP/extensions"
AE_EXTENSION_DEST="$AE_EXTENSIONS_DIR/AEUX"

echo "=== AEUX Installer for macOS ==="
echo ""

# ── After Effects extension ──────────────────────────────────────────────────

if [ ! -d "$AE_EXTENSION_SRC" ]; then
  echo "Error: AEUX folder not found next to this script."
  echo "Make sure you extracted the full AEUX zip before running this installer."
  exit 1
fi

echo "Installing After Effects extension..."
mkdir -p "$AE_EXTENSIONS_DIR"

if [ -d "$AE_EXTENSION_DEST" ]; then
  echo "  Removing old installation..."
  rm -rf "$AE_EXTENSION_DEST"
fi

cp -r "$AE_EXTENSION_SRC" "$AE_EXTENSION_DEST"
echo "  Copied to: $AE_EXTENSION_DEST"

# CEP requires debug mode to load unsigned extensions
PLIST="$HOME/Library/Preferences/com.adobe.CSXS.9.plist"
for version in 9 10 11 12 13; do
  defaults write "com.adobe.CSXS.$version" PlayerDebugMode 1 2>/dev/null || true
done
echo "  Enabled CEP debug mode for unsigned extensions."

echo ""
echo "After Effects: done."
echo "  Restart After Effects, then open Window > Extensions > AEUX."
echo ""

# ── Figma plugin ─────────────────────────────────────────────────────────────

FIGMA_DIR="$SCRIPT_DIR/AEUX-Figma"
if [ -d "$FIGMA_DIR" ]; then
  echo "Figma plugin:"
  echo "  1. In Figma, go to Plugins > Development > Import plugin from manifest..."
  echo "  2. Navigate to: $FIGMA_DIR"
  echo "  3. Select manifest.json"
  echo ""
fi

echo "Installation complete!"
