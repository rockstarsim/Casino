#!/usr/bin/env node
/** Build char-14 … char-33 as anime-style PNG variants from existing portraits. */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const OUT = path.join(__dirname, '..', 'public', 'img', 'characters');

const VARIANTS = [
  { base: 6, hue: 18, sat: 1.15, flip: false, zoom: 1.05 },
  { base: 7, hue: -22, sat: 1.1, flip: true, zoom: 1.08 },
  { base: 8, hue: 35, sat: 1.2, flip: false, zoom: 1.04 },
  { base: 9, hue: -35, sat: 1.05, flip: true, zoom: 1.06 },
  { base: 10, hue: 55, sat: 1.18, flip: false, zoom: 1.07 },
  { base: 11, hue: -48, sat: 1.12, flip: true, zoom: 1.05 },
  { base: 12, hue: 72, sat: 1.08, flip: false, zoom: 1.09 },
  { base: 13, hue: -65, sat: 1.16, flip: true, zoom: 1.04 },
  { base: 0, hue: 28, sat: 1.14, flip: false, zoom: 1.06 },
  { base: 1, hue: -30, sat: 1.1, flip: true, zoom: 1.08 },
  { base: 2, hue: 42, sat: 1.2, flip: false, zoom: 1.05 },
  { base: 3, hue: -40, sat: 1.08, flip: true, zoom: 1.07 },
  { base: 4, hue: 15, sat: 1.12, flip: false, zoom: 1.09 },
  { base: 5, hue: -18, sat: 1.15, flip: true, zoom: 1.06 },
  { base: 6, hue: 80, sat: 1.22, flip: false, zoom: 1.1 },
  { base: 8, hue: -55, sat: 1.18, flip: true, zoom: 1.05 },
  { base: 10, hue: 25, sat: 1.1, flip: false, zoom: 1.08 },
  { base: 12, hue: -28, sat: 1.14, flip: true, zoom: 1.07 },
  { base: 1, hue: 48, sat: 1.16, flip: false, zoom: 1.04 },
  { base: 3, hue: -72, sat: 1.2, flip: true, zoom: 1.09 }
];

async function renderVariant(idx, v) {
  const src = path.join(OUT, `char-${v.base}.png`);
  if (!fs.existsSync(src)) throw new Error('Missing base: ' + src);

  const meta = await sharp(src).metadata();
  const w = meta.width || 1024;
  const h = meta.height || 1024;
  const cropW = Math.round(w / v.zoom);
  const cropH = Math.round(h / v.zoom);
  const left = Math.round((w - cropW) / 2);
  const top = Math.round((h - cropH) * 0.08);

  let img = sharp(src).extract({ left, top, width: cropW, height: cropH }).resize(w, h, { fit: 'cover' });

  if (v.flip) img = img.flop();

  const sat = v.sat;
  const hue = v.hue;
  img = img.modulate({ saturation: sat, hue });

  const outPath = path.join(OUT, `char-${idx}.png`);
  await img.png({ quality: 92, compressionLevel: 8 }).toFile(outPath);
  return outPath;
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  for (let i = 0; i < VARIANTS.length; i++) {
    const idx = i + 14;
    const svg = path.join(OUT, `char-${idx}.svg`);
    if (fs.existsSync(svg)) fs.unlinkSync(svg);
    const out = await renderVariant(idx, VARIANTS[i]);
    console.log('Wrote', path.basename(out));
  }
  console.log('Done — 20 PNG characters (char-14 … char-33)');
})().catch(err => {
  console.error(err);
  process.exit(1);
});
