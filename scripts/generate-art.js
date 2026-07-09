#!/usr/bin/env node
/**
 * MapleStory-inspired chibi playing card SVG generator.
 * Run: npm run generate-art
 */

const fs = require('fs');
const path = require('path');

const CARDS_DIR = path.join(__dirname, '..', 'public', 'img', 'cards');
const OUTLINE = '#3d2314';
const SW = 2.4;

const SUITS = [
  { sym: '♠', name: 'spades', color: '#2563eb', accent: '#93c5fd', bg: '#eff6ff' },
  { sym: '♥', name: 'hearts', color: '#e11d48', accent: '#fda4af', bg: '#fff1f2' },
  { sym: '♦', name: 'diamonds', color: '#c026d3', accent: '#f0abfc', bg: '#fdf4ff' },
  { sym: '♣', name: 'clubs', color: '#16a34a', accent: '#86efac', bg: '#f0fdf4' },
];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

const HAIR = ['#ff6b9d', '#ffd166', '#06d6a0', '#4cc9f0', '#b5179e', '#fb8500', '#8338ec', '#2ec4b6'];
const SKIN = ['#ffe0bd', '#ffcd94', '#ffcba4', '#f5c99a'];
const OUTFITS = ['#4361ee', '#f72585', '#4cc9f0', '#7209b7', '#ff006e', '#06d6a0', '#ff8500', '#3a86ff'];

function hash(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function pick(arr, seed) {
  return arr[seed % arr.length];
}

function outlined(shape, strokeW = SW) {
  const attrs = ` stroke="${OUTLINE}" stroke-width="${strokeW}" stroke-linejoin="round" stroke-linecap="round"`;
  return shape.replace(/(<(?:path|ellipse|circle|rect|polygon|line)[^>]*?)(\s*\/?>)/g, `$1${attrs}$2`);
}

function msEyes(cx, cy, mood) {
  const y = cy - 4;
  if (mood === 'wink') {
    return outlined(`
      <ellipse cx="${cx - 12}" cy="${y}" rx="9" ry="11" fill="#fff"/>
      <ellipse cx="${cx - 12}" cy="${y + 1}" rx="6" ry="8" fill="#1a1a2e"/>
      <circle cx="${cx - 10}" cy="${y - 3}" r="3" fill="#fff"/>
      <circle cx="${cx - 8}" cy="${y + 3}" r="1.2" fill="#fff"/>
      <path d="M ${cx + 2} ${y} Q ${cx + 12} ${y - 4} ${cx + 20} ${y}" fill="none" stroke="${OUTLINE}" stroke-width="2.5" stroke-linecap="round"/>
    `);
  }
  if (mood === 'happy') {
    return outlined(`
      <path d="M ${cx - 22} ${y + 4} Q ${cx - 12} ${y - 8} ${cx - 2} ${y + 4}" fill="none" stroke="${OUTLINE}" stroke-width="2.8" stroke-linecap="round"/>
      <path d="M ${cx + 2} ${y + 4} Q ${cx + 12} ${y - 8} ${cx + 22} ${y + 4}" fill="none" stroke="${OUTLINE}" stroke-width="2.8" stroke-linecap="round"/>
    `);
  }
  return outlined(`
    <ellipse cx="${cx - 12}" cy="${y}" rx="9" ry="11" fill="#fff"/>
    <ellipse cx="${cx + 12}" cy="${y}" rx="9" ry="11" fill="#fff"/>
    <ellipse cx="${cx - 12}" cy="${y + 1}" rx="6" ry="8" fill="#1a1a2e"/>
    <ellipse cx="${cx + 12}" cy="${y + 1}" rx="6" ry="8" fill="#1a1a2e"/>
    <circle cx="${cx - 10}" cy="${y - 3}" r="3.2" fill="#fff"/>
    <circle cx="${cx + 14}" cy="${y - 3}" r="3.2" fill="#fff"/>
    <circle cx="${cx - 8}" cy="${y + 4}" r="1.5" fill="#fff"/>
    <circle cx="${cx + 16}" cy="${y + 4}" r="1.5" fill="#fff"/>
    <circle cx="${cx - 14}" cy="${y + 2}" r="0.8" fill="#7dd3fc"/>
    <circle cx="${cx + 10}" cy="${y + 2}" r="0.8" fill="#7dd3fc"/>
  `);
}

function msHair(cx, cy, style, color) {
  const highlight = lighten(color);
  const styles = {
    spiky: `
      <path d="M ${cx - 32} ${cy - 6} L ${cx - 24} ${cy - 44} L ${cx - 10} ${cy - 16} L ${cx} ${cy - 50} L ${cx + 10} ${cy - 16} L ${cx + 24} ${cy - 44} L ${cx + 32} ${cy - 6} Z" fill="${color}"/>
      <path d="M ${cx - 8} ${cy - 38} L ${cx} ${cy - 46} L ${cx + 6} ${cy - 30} Z" fill="${highlight}" opacity="0.55"/>
    `,
    bob: `
      <ellipse cx="${cx}" cy="${cy - 22}" rx="34" ry="30" fill="${color}"/>
      <path d="M ${cx - 32} ${cy - 4} Q ${cx - 36} ${cy + 28} ${cx - 20} ${cy + 36} L ${cx + 20} ${cy + 36} Q ${cx + 36} ${cy + 28} ${cx + 32} ${cy - 4} Z" fill="${color}"/>
      <ellipse cx="${cx - 10}" cy="${cy - 28}" rx="8" ry="12" fill="${highlight}" opacity="0.4"/>
    `,
    long: `
      <ellipse cx="${cx}" cy="${cy - 20}" rx="34" ry="28" fill="${color}"/>
      <path d="M ${cx - 30} ${cy - 2} Q ${cx - 38} ${cy + 36} ${cx - 22} ${cy + 48} L ${cx - 12} ${cy + 18} L ${cx + 12} ${cy + 18} L ${cx + 22} ${cy + 48} Q ${cx + 38} ${cy + 36} ${cx + 30} ${cy - 2} Z" fill="${color}"/>
    `,
    twin: `
      <ellipse cx="${cx}" cy="${cy - 18}" rx="32" ry="26" fill="${color}"/>
      <circle cx="${cx - 22}" cy="${cy - 38}" r="12" fill="${color}"/>
      <circle cx="${cx + 22}" cy="${cy - 38}" r="12" fill="${color}"/>
      <circle cx="${cx - 22}" cy="${cy - 40}" r="5" fill="${highlight}" opacity="0.5"/>
      <circle cx="${cx + 22}" cy="${cy - 40}" r="5" fill="${highlight}" opacity="0.5"/>
    `,
    fringe: `
      <ellipse cx="${cx}" cy="${cy - 18}" rx="32" ry="26" fill="${color}"/>
      <path d="M ${cx - 30} ${cy - 8} Q ${cx - 14} ${cy + 8} ${cx} ${cy - 14} Q ${cx + 14} ${cy + 8} ${cx + 30} ${cy - 8} L ${cx + 28} ${cy - 32} L ${cx - 28} ${cy - 32} Z" fill="${color}"/>
    `,
  };
  return outlined(styles[style] || styles.bob);
}

function lighten(hex) {
  return hex;
}

function msBody(cx, cy, outfit, pose) {
  const shadow = shade(outfit);
  const body = outlined(`
    <ellipse cx="${cx}" cy="${cy + 42}" rx="14" ry="10" fill="${shadow}"/>
    <ellipse cx="${cx}" cy="${cy + 36}" rx="18" ry="14" fill="${outfit}"/>
    <ellipse cx="${cx}" cy="${cy + 32}" rx="14" ry="6" fill="#fff" opacity="0.2"/>
  `);
  const limbs = {
    wave: outlined(`
      <ellipse cx="${cx - 22}" cy="${cy + 28}" rx="6" ry="4.5" fill="${outfit}"/>
      <ellipse cx="${cx + 20}" cy="${cy + 18}" rx="6" ry="4.5" fill="${outfit}"/>
      <circle cx="${cx + 26}" cy="${cy + 10}" r="7" fill="${pick(SKIN, cx)}"/>
    `),
    peace: outlined(`
      <ellipse cx="${cx - 20}" cy="${cy + 30}" rx="6" ry="4.5" fill="${outfit}"/>
      <ellipse cx="${cx + 20}" cy="${cy + 30}" rx="6" ry="4.5" fill="${outfit}"/>
    `),
    shy: outlined(`
      <ellipse cx="${cx - 18}" cy="${cy + 34}" rx="6" ry="4.5" fill="${outfit}"/>
      <ellipse cx="${cx + 18}" cy="${cy + 34}" rx="6" ry="4.5" fill="${outfit}"/>
    `),
    royal: outlined(`
      <path d="M ${cx - 22} ${cy + 18} L ${cx - 26} ${cy + 48} L ${cx + 26} ${cy + 48} L ${cx + 22} ${cy + 18} Z" fill="#7c3aed"/>
      <ellipse cx="${cx - 18}" cy="${cy + 28}" rx="6" ry="4.5" fill="${outfit}"/>
      <ellipse cx="${cx + 18}" cy="${cy + 28}" rx="6" ry="4.5" fill="${outfit}"/>
    `),
  };
  return body + (limbs[pose] || limbs.shy);
}

function shade(hex) {
  return hex;
}

function suitAccessory(cx, cy, suit) {
  const items = {
    spades: outlined(`<polygon points="${cx - 8},${cy - 52} ${cx},${cy - 62} ${cx + 8},${cy - 52}" fill="#2563eb"/>`),
    hearts: outlined(`<path d="M ${cx} ${cy - 50} C ${cx - 10} ${cy - 62} ${cx - 10} ${cy - 46} ${cx} ${cy - 42} C ${cx + 10} ${cy - 46} ${cx + 10} ${cy - 62} ${cx} ${cy - 50} Z" fill="#fb7185"/>`),
    diamonds: outlined(`<polygon points="${cx},${cy - 62} ${cx - 8},${cy - 50} ${cx},${cy - 38} ${cx + 8},${cy - 50}" fill="#e879f9"/>`),
    clubs: outlined(`
      <circle cx="${cx - 6}" cy="${cy - 52}" r="5" fill="#4ade80"/>
      <circle cx="${cx + 6}" cy="${cy - 52}" r="5" fill="#4ade80"/>
      <circle cx="${cx}" cy="${cy - 58}" r="5" fill="#4ade80"/>
    `),
  };
  return items[suit.name] || '';
}

function drawMapleChibi(cx, cy, rank, suit) {
  const h = hash(`${rank}-${suit.name}`);
  const hairColor = pick(HAIR, h);
  const skinColor = pick(SKIN, h >> 3);
  const outfit = pick(OUTFITS, h >> 5);
  const hairStyle = pick(['spiky', 'bob', 'long', 'twin', 'fringe'], h >> 7);
  let pose = pick(['wave', 'peace', 'shy'], h >> 9);
  let mood = pick(['normal', 'happy', 'wink'], h >> 11);
  let extra = suitAccessory(cx, cy - 8, suit);

  if (rank === 'J') {
    pose = 'wave';
    extra += outlined(`
      <rect x="${cx - 20}" y="${cy - 58}" width="40" height="12" rx="4" fill="#2563eb"/>
      <rect x="${cx - 16}" y="${cy - 66}" width="32" height="10" rx="3" fill="#3b82f6"/>
      <circle cx="${cx}" cy="${cy - 60}" r="4" fill="#fbbf24"/>
    `);
  } else if (rank === 'Q') {
    pose = 'peace';
    extra += outlined(`
      <path d="M ${cx - 18} ${cy - 56} L ${cx - 12} ${cy - 72} L ${cx - 6} ${cy - 56} L ${cx} ${cy - 76} L ${cx + 6} ${cy - 56} L ${cx + 12} ${cy - 72} L ${cx + 18} ${cy - 56} Z" fill="#fbbf24"/>
      <line x1="${cx + 22}" y1="${cy - 4}" x2="${cx + 22}" y2="${cy + 28}" stroke="${OUTLINE}" stroke-width="2.5"/>
      <polygon points="${cx + 22},${cy - 10} ${cx + 16},${cy - 2} ${cx + 28},${cy - 2}" fill="#f472b6"/>
    `);
  } else if (rank === 'K') {
    pose = 'royal';
    mood = 'wink';
    extra += outlined(`
      <path d="M ${cx - 18} ${cy - 58} L ${cx} ${cy - 74} L ${cx + 18} ${cy - 58} Z" fill="#dc2626"/>
      <circle cx="${cx}" cy="${cy - 64}" r="5" fill="#fbbf24"/>
      <rect x="${cx - 2}" y="${cy - 2}" width="4" height="24" rx="2" fill="#fbbf24"/>
      <circle cx="${cx}" cy="${cy - 4}" r="5" fill="#fde047"/>
    `);
  } else if (rank === 'A') {
    extra += outlined(`
      <ellipse cx="${cx}" cy="${cy - 62}" rx="16" ry="5" fill="none" stroke="#fbbf24" stroke-width="2.5"/>
      <path d="M ${cx - 12} ${cy - 68} Q ${cx} ${cy - 82} ${cx + 12} ${cy - 68}" fill="#fef08a" opacity="0.85"/>
    `);
  }

  return `
    <g clip-path="url(#artZone)">
      ${msBody(cx, cy, outfit, pose)}
      ${outlined(`<ellipse cx="${cx}" cy="${cy + 2}" rx="30" ry="28" fill="${skinColor}"/>`)}
      ${msHair(cx, cy - 6, hairStyle, hairColor)}
      ${extra}
      ${outlined(`
        <ellipse cx="${cx - 20}" cy="${cy + 10}" rx="7" ry="4" fill="#ffb4b4" opacity="0.65"/>
        <ellipse cx="${cx + 20}" cy="${cy + 10}" rx="7" ry="4" fill="#ffb4b4" opacity="0.65"/>
      `)}
      ${msEyes(cx, cy, mood)}
      ${outlined(`<ellipse cx="${cx}" cy="${cy + 14}" rx="3" ry="2" fill="#ffb4b4" opacity="0.5"/>`)}
      <path d="M ${cx - 6} ${cy + 18} Q ${cx} ${cy + 24} ${cx + 6} ${cy + 18}" fill="none" stroke="${OUTLINE}" stroke-width="2.2" stroke-linecap="round"/>
    </g>
  `;
}

function cardArtBackground(suit) {
  return `
    <defs>
      <clipPath id="artZone">
        <rect x="14" y="52" width="112" height="132" rx="8"/>
      </clipPath>
      <linearGradient id="cardBg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#ffffff"/>
        <stop offset="100%" stop-color="${suit.bg}"/>
      </linearGradient>
      <linearGradient id="frameGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${suit.accent}"/>
        <stop offset="100%" stop-color="${suit.color}"/>
      </linearGradient>
      <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="2" stdDeviation="2.5" flood-opacity="0.18"/>
      </filter>
    </defs>
    <rect x="2" y="2" width="136" height="192" rx="12" fill="url(#frameGrad)" filter="url(#softShadow)"/>
    <rect x="6" y="6" width="128" height="184" rx="10" fill="url(#cardBg)" stroke="${suit.color}" stroke-width="2"/>
    <rect x="14" y="52" width="112" height="132" rx="8" fill="${suit.bg}" opacity="0.35" stroke="${suit.accent}" stroke-width="1" stroke-dasharray="4 3"/>
  `;
}

function generateCard(rank, suit) {
  const chibi = drawMapleChibi(70, 118, rank, suit);
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 196" width="140" height="196">
  ${cardArtBackground(suit)}
  ${chibi}
</svg>`;
}

function generateCardBack() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 196" width="140" height="196">
  <defs>
    <linearGradient id="backBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#4f46e5"/>
      <stop offset="50%" stop-color="#6366f1"/>
      <stop offset="100%" stop-color="#312e81"/>
    </linearGradient>
    <pattern id="stars" width="16" height="16" patternUnits="userSpaceOnUse">
      <circle cx="8" cy="8" r="1.5" fill="#c4b5fd" opacity="0.6"/>
    </pattern>
  </defs>
  <rect x="2" y="2" width="136" height="192" rx="12" fill="url(#backBg)"/>
  <rect x="2" y="2" width="136" height="192" rx="12" fill="url(#stars)"/>
  <rect x="10" y="10" width="120" height="176" rx="8" fill="none" stroke="#a78bfa" stroke-width="2.5"/>
  <g transform="translate(70, 100)">
    ${outlined(`<ellipse cx="0" cy="8" rx="16" ry="12" fill="#4361ee"/>`)}
    ${outlined(`<ellipse cx="0" cy="-6" rx="32" ry="30" fill="#ffe0bd"/>`)}
    ${outlined(`<ellipse cx="0" cy="-28" rx="34" ry="28" fill="#ff6b9d"/>`)}
    ${msEyes(0, -6, 'happy')}
    <path d="M -6 8 Q 0 14 6 8" fill="none" stroke="${OUTLINE}" stroke-width="2.2" stroke-linecap="round"/>
    ${outlined(`
      <ellipse cx="-18" cy="4" rx="7" ry="4" fill="#ffb4b4" opacity="0.65"/>
      <ellipse cx="18" cy="4" rx="7" ry="4" fill="#ffb4b4" opacity="0.65"/>
    `)}
    <text y="52" font-family="Inter, sans-serif" font-size="13" font-weight="700" fill="#e0e7ff" text-anchor="middle">♠ ♥ ♦ ♣</text>
  </g>
</svg>`;
}

function writeCards() {
  fs.mkdirSync(CARDS_DIR, { recursive: true });
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      fs.writeFileSync(path.join(CARDS_DIR, `${rank}-${suit.name}.svg`), generateCard(rank, suit));
    }
  }
  fs.writeFileSync(path.join(CARDS_DIR, 'back.svg'), generateCardBack());
  console.log(`Wrote 53 MapleStory-style card SVGs to ${CARDS_DIR}`);
}

writeCards();
console.log('Done!');
