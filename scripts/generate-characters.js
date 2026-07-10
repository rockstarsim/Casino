#!/usr/bin/env node
/** Generate anime-style SVG character avatars char-14 … char-33 */
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', 'public', 'img', 'characters');

const STYLES = [
  { hair: '#ff6b9d', outfit: '#7c3aed', pose: 'wave', skin: '#ffe0bd' },
  { hair: '#ffd166', outfit: '#e11d48', pose: 'peace', skin: '#ffcd94' },
  { hair: '#06d6a0', outfit: '#2563eb', pose: 'shy', skin: '#ffe0bd' },
  { hair: '#4cc9f0', outfit: '#db2777', pose: 'lean', skin: '#ffcba4' },
  { hair: '#b5179e', outfit: '#0891b2', pose: 'wave', skin: '#ffe0bd' },
  { hair: '#fb8500', outfit: '#7c2d12', pose: 'peace', skin: '#ffcd94' },
  { hair: '#8338ec', outfit: '#be185d', pose: 'shy', skin: '#ffe0bd' },
  { hair: '#2ec4b6', outfit: '#4338ca', pose: 'lean', skin: '#ffcba4' },
  { hair: '#f72585', outfit: '#1d4ed8', pose: 'wave', skin: '#ffe0bd' },
  { hair: '#7209b7', outfit: '#dc2626', pose: 'peace', skin: '#ffcd94' },
  { hair: '#3a86ff', outfit: '#059669', pose: 'shy', skin: '#ffe0bd' },
  { hair: '#ff006e', outfit: '#92400e', pose: 'lean', skin: '#ffcba4' },
  { hair: '#c1121f', outfit: '#6366f1', pose: 'wave', skin: '#ffe0bd' },
  { hair: '#ff9e00', outfit: '#be123c', pose: 'peace', skin: '#ffcd94' },
  { hair: '#560bad', outfit: '#0d9488', pose: 'shy', skin: '#ffe0bd' },
  { hair: '#80ffdb', outfit: '#7e22ce', pose: 'lean', skin: '#ffcba4' },
  { hair: '#ff477e', outfit: '#0369a1', pose: 'wave', skin: '#ffe0bd' },
  { hair: '#ffc300', outfit: '#9d174d', pose: 'peace', skin: '#ffcd94' },
  { hair: '#48cae4', outfit: '#b45309', pose: 'shy', skin: '#ffe0bd' },
  { hair: '#e0aaff', outfit: '#15803d', pose: 'lean', skin: '#ffcba4' },
];

function poseArms(pose) {
  if (pose === 'wave') return '<path d="M55 95 Q75 70 90 55" stroke="#3d2314" stroke-width="3" fill="none" stroke-linecap="round"/><circle cx="92" cy="52" r="8" fill="STSKIN"/>';
  if (pose === 'peace') return '<path d="M45 98 L35 75 M75 98 L85 75" stroke="#3d2314" stroke-width="3" stroke-linecap="round"/>';
  if (pose === 'lean') return '<ellipse cx="35" cy="100" rx="10" ry="6" fill="OUTFIT"/><ellipse cx="85" cy="105" rx="10" ry="6" fill="OUTFIT"/>';
  return '<ellipse cx="38" cy="102" rx="9" ry="5" fill="OUTFIT"/><ellipse cx="82" cy="102" rx="9" ry="5" fill="OUTFIT"/>';
}

function svg(i, s) {
  const arms = poseArms(s.pose).replace(/OUTFIT/g, s.outfit).replace(/STSKIN/g, s.skin);
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 180" width="140" height="180">
  <defs>
    <linearGradient id="bg${i}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#2a1210"/>
      <stop offset="100%" stop-color="#120808"/>
    </linearGradient>
  </defs>
  <rect width="140" height="180" fill="url(#bg${i})"/>
  <ellipse cx="70" cy="130" rx="38" ry="28" fill="${s.outfit}" stroke="#3d2314" stroke-width="2"/>
  <ellipse cx="70" cy="72" rx="34" ry="32" fill="${s.skin}" stroke="#3d2314" stroke-width="2"/>
  <ellipse cx="70" cy="38" rx="36" ry="30" fill="${s.hair}" stroke="#3d2314" stroke-width="2"/>
  <path d="M40 48 Q70 20 100 48" fill="${s.hair}" stroke="#3d2314" stroke-width="2"/>
  ${arms}
  <ellipse cx="58" cy="70" rx="5" ry="7" fill="#fff" stroke="#3d2314" stroke-width="1.5"/>
  <ellipse cx="82" cy="70" rx="5" ry="7" fill="#fff" stroke="#3d2314" stroke-width="1.5"/>
  <circle cx="59" cy="72" r="3" fill="#1a1a2e"/>
  <circle cx="83" cy="72" r="3" fill="#1a1a2e"/>
  <circle cx="60" cy="70" r="1" fill="#fff"/>
  <circle cx="84" cy="70" r="1" fill="#fff"/>
  <ellipse cx="52" cy="82" rx="6" ry="3" fill="#ffb4b4" opacity="0.7"/>
  <ellipse cx="88" cy="82" rx="6" ry="3" fill="#ffb4b4" opacity="0.7"/>
  <path d="M64 88 Q70 94 76 88" fill="none" stroke="#3d2314" stroke-width="2" stroke-linecap="round"/>
  <text x="70" y="168" text-anchor="middle" font-family="Inter,sans-serif" font-size="10" fill="${s.hair}" opacity="0.6">#${i + 14}</text>
</svg>`;
}

fs.mkdirSync(OUT, { recursive: true });
for (let i = 0; i < 20; i++) {
  const idx = i + 14;
  fs.writeFileSync(path.join(OUT, `char-${idx}.svg`), svg(idx, STYLES[i]));
}
console.log('Wrote 20 character SVGs (char-14 … char-33)');
