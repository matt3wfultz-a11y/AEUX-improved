# Installing AEUX

## Quick install

Extract the zip you received, then run the installer for your OS:

| OS      | Run this file              |
|---------|----------------------------|
| Mac     | `install-mac.sh`           |
| Windows | `install-aeux-windows.bat` |

The script will automatically copy the After Effects extension to the right location and enable the required CEP setting. It will also print the steps to load the Figma plugin.

After running the installer, **restart After Effects** and open **Window > Extensions > AEUX**.

---

## Manual install (After Effects)

If you prefer to install manually or the script doesn't work:

### Mac
1. Copy the `AEUX` folder to:
   ```
   ~/Library/Application Support/Adobe/CEP/extensions/
   ```
2. Enable CEP debug mode by running this in Terminal:
   ```sh
   defaults write com.adobe.CSXS.11 PlayerDebugMode 1
   ```
   (Repeat for CSXS.9 through CSXS.13 if needed for your Ae version.)
3. Restart After Effects → **Window > Extensions > AEUX**.

### Windows
1. Run `install-aeux-windows.bat` (handles the registry entry), **or** manually add:
   - Key: `HKEY_CURRENT_USER\SOFTWARE\Adobe\CSXS.11`
   - Value: `PlayerDebugMode` = `1` (String)
2. Copy the `AEUX` folder to:
   ```
   %APPDATA%\Adobe\CEP\extensions\
   ```
3. Restart After Effects → **Window > Extensions > AEUX**.

---

## Figma plugin

1. In Figma, open the menu → **Plugins > Development > Import plugin from manifest...**
2. Navigate to the `AEUX-Figma` folder and select `manifest.json`.
3. The plugin is now available under **Plugins > Development > AEUX**.

---

## Requirements

- After Effects CC 2019 or later
- Figma (desktop or browser)
