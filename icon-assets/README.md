# Icon Assets

This folder contains the source files and tools for generating extension icons.

## Contents

- **export.ps1** - PowerShell script to generate PNG icons from SVG files
- **svg/** - Source SVG files for the icons
  - `icon-large.svg` - Main extension icon (large version)
  - `icon-small.svg` - Extension icon (small version)
  - `store-logo.svg` - Store listing logo

## Usage

To regenerate icons after modifying the SVG files:

1. Edit the SVG files in the `svg/` folder
2. Run `powershell .\export.ps1` from this directory
3. Copy the generated PNG files to the `../images/` folder
4. Update the extension package

## Generated Sizes

The export script generates these standard extension icon sizes:

- 16x16, 19x19, 32x32, 38x38, 48x48, 64x64, 128x128, 256x256
- Plus 512x512 store logo
