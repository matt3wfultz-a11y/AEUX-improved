# Installing AEUX

## Quick install

Extract the zip you received, then run the installer for your OS:

| OS      | Run this file              |
|---------|----------------------------|
| Mac     | `install-mac.sh` (in Terminal: type `bash `, drag the file in, press Return) |
| Windows | `install-aeux-windows.bat` |

The script will automatically copy the After Effects extension to the right location and enable the required CEP setting. It will also print the steps to load the Figma plugin.

After running the installer, **restart After Effects** and open **Window > Extensions > AEUX**.

AEUX writes small preset files to import gradients and inner shadows, so turn on **Preferences > Scripting & Expressions > Allow Scripts to Write Files and Access Network** in After Effects.

---

## ZXP install (After Effects)

If the zip has a signed `AEUX_<version>.zxp`, you can install with a ZXP installer instead of the script:

1. Install a ZXP installer such as [ZXP Installer](https://aescripts.com/learn/zxp-installer/) (free) or [Anastasiy's Extension Manager](https://install.anastasiy.com/).
2. Quit After Effects, then open the `.zxp` with the installer (or drag it onto the installer's window).
3. Open After Effects → **Window > Extensions > AEUX**.

If the panel opens blank, run the install script for your OS as well. This is a [known Adobe issue](https://github.com/Adobe-CEP/CEP-Resources/blob/master/ZXPSignCMD/KnownIssue2024.md) with ZXPs, and the CEP debug setting the script turns on works around it.

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
   defaults write com.adobe.CSXS.12 PlayerDebugMode 1
   ```
   (CSXS.11 covers Ae 2021–2024, CSXS.12 covers Ae 2025 and later.)
3. Restart After Effects → **Window > Extensions > AEUX**.

### Windows
1. Run `install-aeux-windows.bat` (handles the registry entry), **or** manually add:
   - Keys: `HKEY_CURRENT_USER\SOFTWARE\Adobe\CSXS.11` and `...\CSXS.12` (Ae 2025+)
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
