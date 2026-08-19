# PWA Icons

This app requires two icon files for Progressive Web App functionality:

## Required Icons

1. **icon-192x192.png** - 192x192 pixels
2. **icon-512x512.png** - 512x512 pixels

Both are already generated from the Lost & Found Outreach logo (`logo-header.jpg`). Regenerate them if the logo changes:

```bash
sips -s format png -z 512 512 public/logo-header.jpg --out public/icon-512x512.png
sips -s format png -z 192 192 public/logo-header.jpg --out public/icon-192x192.png
```

## Creating Icons From Scratch

You can create these icons using any of these methods:

### Option 1: Use Online Icon Generator
1. Go to https://www.pwabuilder.com/imageGenerator
2. Upload the Lost & Found Outreach logo or create a custom icon
3. Generate icons for Android/Chrome
4. Download and place in the `/public` folder

### Option 2: Use Figma/Photoshop
1. Create a 512x512px canvas
2. Add the Lost & Found Outreach logo or "LF" text on charcoal background (#0a0a0a) with gold text (#b8860b)
3. Export as PNG at 512x512
4. Resize to 192x192 for the smaller icon
5. Save both files in `/public` folder

### Option 3: Simple Placeholder
Until you have custom icons, you can use solid color squares:
- Create 192x192px and 512x512px PNG files
- Fill with the app theme color (#b8860b)
- Add charcoal "LF" text in center
- Save as `icon-192x192.png` and `icon-512x512.png`

## Quick Setup with ImageMagick

If you have ImageMagick installed:

```bash
# Create a simple gold icon with "LF" text
convert -size 512x512 xc:"#0a0a0a" \
  -gravity center \
  -pointsize 200 \
  -fill "#b8860b" \
  -annotate +0+0 "LF" \
  public/icon-512x512.png

convert public/icon-512x512.png \
  -resize 192x192 \
  public/icon-192x192.png
```

## Important Notes

- Icons should have rounded corners for iOS
- Use maskable icons for Android (safe zone in center)
- Transparent backgrounds work best
- Test on both iOS and Android devices
