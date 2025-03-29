# Application Icons

This directory contains the icons for the PullPreview application.

## Mac Icons

The `mac` directory contains icons in various sizes needed for macOS:

- `icon.icns`: The main macOS application icon used by Finder and the Dock
- `icon.png`: 512x512 icon for high resolution displays
- `icon@2x.png`: 256x256 icon for standard resolution displays
- `icons.iconset/`: Directory containing all icon sizes required by macOS

## Regenerating Icons

To regenerate the icons from the source `PullPreviewLogo.png` file:

```bash
# From the project root
npm run generate-icons
```

This script requires ImageMagick to be installed:

```bash
brew install imagemagick
```

## Icon Sizes

The following icon sizes are generated for macOS:

| Filename               | Size (pixels) | Purpose                       |
|------------------------|---------------|-------------------------------|
| icon_16x16.png         | 16×16         | Menu bar, toolbar             |
| icon_16x16@2x.png      | 32×32         | Menu bar, toolbar (Retina)    |
| icon_32x32.png         | 32×32         | Finder icon                   |
| icon_32x32@2x.png      | 64×64         | Finder icon (Retina)          |
| icon_128x128.png       | 128×128       | App icon, previews            |
| icon_128x128@2x.png    | 256×256       | App icon, previews (Retina)   |
| icon_256x256.png       | 256×256       | App icon, Dock                |
| icon_256x256@2x.png    | 512×512       | App icon, Dock (Retina)       |
| icon_512x512.png       | 512×512       | App Store icon                |
| icon_512x512@2x.png    | 1024×1024     | App Store icon (Retina)       |