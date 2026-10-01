import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

/**
 * Generates PNG, JPG, and PWA icon formats directly from the authentic,
 * unmodified official Notre Dame College, Dhaka monogram (public/ndc-logo.svg)
 * without altering the logo design.
 */
async function main() {
  const publicDir = path.resolve(process.cwd(), 'public');
  const srcAssetsDir = path.resolve(process.cwd(), 'src/assets');
  const distDir = path.resolve(process.cwd(), 'dist');

  const svgPath = path.join(publicDir, 'ndc-logo.svg');
  const svgBuffer = fs.readFileSync(svgPath);

  // Sync unmodified SVG to src/assets/ndc-logo.svg
  fs.writeFileSync(path.join(srcAssetsDir, 'ndc-logo.svg'), svgBuffer);

  // Render high-resolution PNGs from the unmodified SVG
  const png512 = await sharp(svgBuffer, { density: 400 })
    .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  const png192 = await sharp(svgBuffer, { density: 400 })
    .resize(192, 192, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  fs.writeFileSync(path.join(publicDir, 'ndc-logo.png'), png512);
  fs.writeFileSync(path.join(srcAssetsDir, 'ndc-logo.png'), png512);
  fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), png192);
  fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), png512);
  fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), png512);
  fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), png192);

  if (fs.existsSync(distDir)) {
    fs.writeFileSync(path.join(distDir, 'ndc-logo.svg'), svgBuffer);
    fs.writeFileSync(path.join(distDir, 'ndc-logo.png'), png512);
  }

  console.log('Synced all PNG and PWA icons from unmodified public/ndc-logo.svg');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
