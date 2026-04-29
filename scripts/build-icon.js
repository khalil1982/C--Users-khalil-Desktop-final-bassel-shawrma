/**
 * Build app icon from SVG to PNG (and ICO for Windows build).
 * Run: npm run build-icon
 */

const path = require('path');
const fs = require('fs');

const assetsDir = path.join(__dirname, '..', 'assets');
const svgPath = path.join(assetsDir, 'icon.svg');
const pngPath = path.join(assetsDir, 'icon.png');
const iconsDir = path.join(assetsDir, 'icons');

async function main() {
  if (!fs.existsSync(svgPath)) {
    console.error('icon.svg not found in assets/');
    process.exit(1);
  }

  try {
    const sharp = require('sharp');
    const svgBuffer = fs.readFileSync(svgPath);

    await sharp(svgBuffer)
      .resize(256, 256)
      .png()
      .toFile(pngPath);
    console.log('Created:', pngPath);

    if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir, { recursive: true });
    fs.copyFileSync(pngPath, path.join(iconsDir, 'app-icon-256.png'));

    const pngToIco = (await import('png-to-ico')).default;
    const icoPath = path.join(iconsDir, 'app-icon.ico');
    const icoBuf = await pngToIco(pngPath);
    fs.writeFileSync(icoPath, icoBuf);
    console.log('Created:', icoPath);

    const icoWindow = path.join(assetsDir, 'icon.ico');
    fs.writeFileSync(icoWindow, icoBuf);
    console.log('Created:', icoWindow);
  } catch (err) {
    console.error('Build failed:', err.message);
    process.exit(1);
  }
}

main();
