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
MASK_IMAGE="example-icon.png"

# Destination directory
ICON_DIR="src/icons/mac"
mkdir -p "$ICON_DIR"

# Create icons directory if it doesn't exist
mkdir -p "$ICON_DIR/icons.iconset"

# Create a temporary directory for processing
TMP_DIR=$(mktemp -d)
trap 'rm -rf "$TMP_DIR"' EXIT

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

# Extract the alpha channel from the example icon to use as a mask
magick "$MASK_IMAGE" -alpha extract "$TMP_DIR/alpha_mask.png"

# Generate macOS icons for each size
for ICON_DEF in "${ICON_SIZES[@]}"; do
    IFS=',' read -r ICON_NAME ICON_SIZE <<< "$ICON_DEF"
    echo "Creating $ICON_NAME ($ICON_SIZE x $ICON_SIZE)"
    
    # Resize the mask to the target size
    magick "$TMP_DIR/alpha_mask.png" -resize "${ICON_SIZE}x${ICON_SIZE}" "$TMP_DIR/mask_${ICON_SIZE}.png"
    
    # Resize the source image to fill the entire icon space
    magick "$SOURCE_IMAGE" -resize "${ICON_SIZE}x${ICON_SIZE}^" -gravity center -extent "${ICON_SIZE}x${ICON_SIZE}" "$TMP_DIR/resized_${ICON_SIZE}.png"
    
    # Apply the mask to the source image to get the final icon
    magick "$TMP_DIR/resized_${ICON_SIZE}.png" "$TMP_DIR/mask_${ICON_SIZE}.png" -alpha Off -compose CopyOpacity -composite "$ICON_DIR/icons.iconset/$ICON_NAME"
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

# Clean up temp files (this will be handled by the trap command)

echo "Icon generation complete!"