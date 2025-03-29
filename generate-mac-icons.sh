#!/bin/bash

# Script to generate macOS app icons from a source PNG file
# Requires ImageMagick to be installed (brew install imagemagick)

# Check if ImageMagick is installed
if ! command -v magick &> /dev/null; then
    echo "ImageMagick is not installed or not in path. Please install it using 'brew install imagemagick'."
    exit 1
fi

# Source image
SOURCE_IMAGE="PullPreviewLogo.png"

# Destination directory
ICON_DIR="src/icons/mac"
mkdir -p "$ICON_DIR"

# Create icons directory if it doesn't exist
mkdir -p "$ICON_DIR/icons.iconset"

# Generate icon sizes for macOS
# Format: name, size
ICON_SIZES=(
    "icon_16x16.png,16"
    "icon_16x16@2x.png,32"
    "icon_32x32.png,32"
    "icon_32x32@2x.png,64"
    "icon_128x128.png,128"
    "icon_128x128@2x.png,256"
    "icon_256x256.png,256"
    "icon_256x256@2x.png,512"
    "icon_512x512.png,512"
    "icon_512x512@2x.png,1024"
)

echo "Generating macOS icons..."

# Generate all icon sizes
for ICON_DEF in "${ICON_SIZES[@]}"; do
    IFS=',' read -r ICON_NAME ICON_SIZE <<< "$ICON_DEF"
    echo "Creating $ICON_NAME ($ICON_SIZE x $ICON_SIZE)"
    magick "$SOURCE_IMAGE" -resize "${ICON_SIZE}x${ICON_SIZE}" "$ICON_DIR/icons.iconset/$ICON_NAME"
done

# Generate icns file from iconset
echo "Generating macOS .icns file from iconset..."
if command -v iconutil &> /dev/null; then
    iconutil -c icns "$ICON_DIR/icons.iconset" -o "$ICON_DIR/icon.icns"
    echo "Successfully created icon.icns"
else
    echo "iconutil not found. Cannot create .icns file. This requires macOS."
    # Alternative for non-macOS systems using ImageMagick
    echo "Trying alternative method with ImageMagick..."
    magick "$ICON_DIR/icons.iconset/icon_512x512@2x.png" "$ICON_DIR/icon.icns"
fi

# Also create png files in the main icon directory for electron-builder
echo "Copying main icons for electron-builder..."
cp "$ICON_DIR/icons.iconset/icon_512x512.png" "$ICON_DIR/icon.png"
cp "$ICON_DIR/icons.iconset/icon_256x256.png" "$ICON_DIR/icon@2x.png"

echo "Icon generation complete!"