#!/usr/bin/env node
/**
 * Generates chibi-style playing card SVGs and character avatars.
 * Run: node scripts/generate-art.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', 'public', 'img');
const CARDS_DIR = path.join(ROOT, 'cards');
const CHARS_DIR = path.join(ROOT, 'characters');

const SUITS = [
  { sym: '♠', name: 'spades', color: '#1e293b', accent: '#475569', theme: 'cool' },
  { sym: '♥', name: 'hearts', color: '#dc2626', accent: '#f87171', theme: 'sweet' },
  { sym: '♦', name: 'diamonds', color: '#db2777', accent: '#f472b6', theme: 'sparkle' },
  { sym: '♣', name: 'clubs', color: '#166534', accent: '#4ade80', theme: 'nature' },
];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

const HAIR = ['#2d1b0e', '#f59e0b', '#ec4899', '#6366f1', '#14b8a6', '#78716c', '#a855f7', '#0ea5e9'];
const SKIN = ['#fde68a', '#fcd34d', '#fdba74', '#fbbf24', '#fde047'];
const OUTFITS = ['#6366f1', '#ec4899', '#14b8a6', '#f97316', '#8b5cf6', '#06b6d4', '#ef4444', '#22c55e'];

function hash(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function pick(arr, seed) {
  return arr[seed % arr.length];
}

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
}

function chibiEyes(cx, cy, mood) {
  const eyeY = cy - 2;
  if (mood === 'wink') {
    return `
      <ellipse cx="${cx - 10}" cy="${eyeY}" rx="5.5" ry="7" fill="#1e293b"/>
      <circle cx="${cx - 8}" cy="${eyeY - 2}" r="2.2" fill="#fff"/>
      <path d="M ${cx + 4} ${eyeY} Q ${cx + 10} ${eyeY - 2} ${cx + 16} ${eyeY}" stroke="#1e293b" stroke-width="2.2" fill="none" stroke-linecap="round"/>
    `;
  }
  if (mood === 'happy') {
    return `
      <path d="M ${cx - 16} ${eyeY + 2} Q ${cx - 10} ${eyeY - 6} ${cx - 4} ${eyeY + 2}" stroke="#1e293b" stroke-width="2.2" fill="none" stroke-linecap="round"/>
      <path d="M ${cx + 4} ${eyeY + 2} Q ${cx + 10} ${eyeY - 6} ${cx + 16} ${eyeY + 2}" stroke="#1e293b" stroke-width="2.2" fill="none" stroke-linecap="round"/>
    `;
  }
  return `
    <ellipse cx="${cx - 10}" cy="${eyeY}" rx="5.5" ry="7" fill="#1e293b"/>
    <ellipse cx="${cx + 10}" cy="${eyeY}" rx="5.5" ry="7" fill="#1e293b"/>
    <circle cx="${cx - 8}" cy="${eyeY - 2}" r="2.2" fill="#fff"/>
    <circle cx="${cx + 12}" cy="${eyeY - 2}" r="2.2" fill="#fff"/>
    <circle cx="${cx - 6}" cy="${eyeY + 1}" r="1" fill="#fff" opacity="0.6"/>
    <circle cx="${cx + 14}" cy="${eyeY + 1}" r="1" fill="#fff" opacity="0.6"/>
  `;
}

function chibiBlush(cx, cy) {
  return `
    <ellipse cx="${cx - 18}" cy="${cy + 8}" rx="5" ry="3" fill="#fca5a5" opacity="0.55"/>
    <ellipse cx="${cx + 18}" cy="${cy + 8}" rx="5" ry="3" fill="#fca5a5" opacity="0.55"/>
  `;
}

function chibiMouth(cx, cy, mood) {
  if (mood === 'open') return `<ellipse cx="${cx}" cy="${cy + 16}" rx="4" ry="3" fill="#be123c"/>`;
  if (mood === 'smirk') return `<path d="M ${cx - 4} ${cy + 14} Q ${cx + 2} ${cy + 18} ${cx + 8} ${cy + 13}" stroke="#be123c" stroke-width="1.8" fill="none" stroke-linecap="round"/>`;
  return `<path d="M ${cx - 5} ${cy + 14} Q ${cx} ${cy + 19} ${cx + 5} ${cy + 14}" stroke="#be123c" stroke-width="1.8" fill="none" stroke-linecap="round"/>`;
}

function chibiHair(cx, cy, style, color) {
  const base = `<ellipse cx="${cx}" cy="${cy - 18}" rx="30" ry="26" fill="${color}"/>`;
  const styles = {
    bob: `<path d="M ${cx - 30} ${cy - 8} Q ${cx - 34} ${cy + 20} ${cx - 18} ${cy + 28} L ${cx + 18} ${cy + 28} Q ${cx + 34} ${cy + 20} ${cx + 30} ${cy - 8} Z" fill="${color}"/>`,
    spiky: `<path d="M ${cx - 28} ${cy - 10} L ${cx - 20} ${cy - 38} L ${cx - 8} ${cy - 14} L ${cx} ${cy - 42} L ${cx + 8} ${cy - 14} L ${cx + 20} ${cy - 38} L ${cx + 28} ${cy - 10} Z" fill="${color}"/>`,
    long: `<path d="M ${cx - 28} ${cy - 6} Q ${cx - 36} ${cy + 30} ${cx - 22} ${cy + 42} L ${cx - 14} ${cy + 20} L ${cx + 14} ${cy + 20} L ${cx + 22} ${cy + 42} Q ${cx + 36} ${cy + 30} ${cx + 28} ${cy - 6} Z" fill="${color}"/>`,
    bun: `<circle cx="${cx - 18}" cy="${cy - 34}" r="10" fill="${color}"/><circle cx="${cx + 18}" cy="${cy - 34}" r="10" fill="${color}"/>`,
    fringe: `<path d="M ${cx - 28} ${cy - 12} Q ${cx - 10} ${cy + 2} ${cx} ${cy - 18} Q ${cx + 10} ${cy + 2} ${cx + 28} ${cy - 12} L ${cx + 26} ${cy - 28} L ${cx - 26} ${cy - 28} Z" fill="${color}"/>`,
    crown: `<path d="M ${cx - 22} ${cy - 28} L ${cx - 16} ${cy - 44} L ${cx - 8} ${cy - 30} L ${cx} ${cy - 48} L ${cx + 8} ${cy - 30} L ${cx + 16} ${cy - 44} L ${cx + 22} ${cy - 28} Z" fill="#fbbf24" stroke="#d97706" stroke-width="1"/>`,
  };
  return base + (styles[style] || styles.bob);
}

function chibiBody(cx, cy, outfit, pose) {
  const body = `
    <ellipse cx="${cx}" cy="${cy + 38}" rx="22" ry="18" fill="${outfit}"/>
    <ellipse cx="${cx}" cy="${cy + 34}" rx="18" ry="8" fill="rgba(255,255,255,0.15)"/>
  `;
  const arms = {
    wave: `
      <ellipse cx="${cx - 28}" cy="${cy + 30}" rx="7" ry="5" fill="${outfit}" transform="rotate(-35 ${cx - 28} ${cy + 30})"/>
      <ellipse cx="${cx + 26}" cy="${cy + 22}" rx="7" ry="5" fill="${outfit}" transform="rotate(55 ${cx + 26} ${cy + 22})"/>
      <circle cx="${cx + 32}" cy="${cy + 14}" r="6" fill="${pick(SKIN, cx)}"/>
    `,
    peace: `
      <ellipse cx="${cx - 24}" cy="${cy + 28}" rx="7" ry="5" fill="${outfit}" transform="rotate(-20 ${cx - 24} ${cy + 28})"/>
      <ellipse cx="${cx + 24}" cy="${cy + 28}" rx="7" ry="5" fill="${outfit}" transform="rotate(20 ${cx + 24} ${cy + 28})"/>
    `,
    shy: `
      <ellipse cx="${cx - 22}" cy="${cy + 36}" rx="7" ry="5" fill="${outfit}" transform="rotate(10 ${cx - 22} ${cy + 36})"/>
      <ellipse cx="${cx + 22}" cy="${cy + 36}" rx="7" ry="5" fill="${outfit}" transform="rotate(-10 ${cx + 22} ${cy + 36})"/>
    `,
    royal: `
      <path d="M ${cx - 26} ${cy + 20} L ${cx - 30} ${cy + 52} L ${cx + 30} ${cy + 52} L ${cx + 26} ${cy + 20} Z" fill="#7c3aed" opacity="0.85"/>
      <ellipse cx="${cx - 24}" cy="${cy + 30}" rx="7" ry="5" fill="${outfit}" transform="rotate(-15 ${cx - 24} ${cy + 30})"/>
      <ellipse cx="${cx + 24}" cy="${cy + 30}" rx="7" ry="5" fill="${outfit}" transform="rotate(15 ${cx + 24} ${cy + 30})"/>
    `,
  };
  return body + (arms[pose] || arms.shy);
}

function drawChibi(cx, cy, seed, rank, suit) {
  const h = hash(`${rank}-${suit.name}-${seed}`);
  const hairColor = pick(HAIR, h);
  const skinColor = pick(SKIN, h >> 3);
  const outfit = pick(OUTFITS, h >> 5);
  const hairStyles = ['bob', 'spiky', 'long', 'bun', 'fringe'];
  let hairStyle = pick(hairStyles, h >> 7);
  let pose = pick(['wave', 'peace', 'shy'], h >> 9);
  let mood = pick(['normal', 'happy', 'wink', 'open'], h >> 11);
  let accessory = '';

  if (rank === 'J') {
    hairStyle = 'spiky';
    pose = 'wave';
    accessory = `
      <rect x="${cx - 18}" y="${cy - 48}" width="36" height="10" rx="3" fill="#1e40af"/>
      <rect x="${cx - 14}" y="${cy - 54}" width="28" height="8" rx="2" fill="#2563eb"/>
      <circle cx="${cx}" cy="${cy - 50}" r="3" fill="#fbbf24"/>
    `;
  } else if (rank === 'Q') {
    hairStyle = 'long';
    pose = 'peace';
    accessory = `
      ${chibiHair(cx, cy, 'crown', '#fbbf24')}
      <line x1="${cx + 24}" y1="${cy + 10}" x2="${cx + 24}" y2="${cy + 44}" stroke="#a855f7" stroke-width="2"/>
      <polygon points="${cx + 24},${cy + 6} ${cx + 18},${cy + 14} ${cx + 30},${cy + 14}" fill="#f472b6"/>
    `;
  } else if (rank === 'K') {
    hairStyle = 'fringe';
    pose = 'royal';
    mood = 'smirk';
    accessory = `
      <path d="M ${cx - 20} ${cy - 42} L ${cx} ${cy - 56} L ${cx + 20} ${cy - 42} Z" fill="#dc2626"/>
      <circle cx="${cx}" cy="${cy - 46}" r="4" fill="#fbbf24"/>
      <rect x="${cx - 3}" y="${cy + 8}" width="6" height="28" rx="2" fill="#fbbf24"/>
      <circle cx="${cx}" cy="${cy + 6}" r="5" fill="#fde047"/>
    `;
  } else if (rank === 'A') {
    accessory = `
      <ellipse cx="${cx}" cy="${cy - 44}" rx="14" ry="4" fill="none" stroke="#fbbf24" stroke-width="2"/>
      <path d="M ${cx - 10} ${cy - 50} Q ${cx} ${cy - 62} ${cx + 10} ${cy - 50}" fill="#fef08a" opacity="0.8"/>
    `;
  }

  const suitDeco = {
    spades: `<path d="M ${cx} ${cy + 52} l -6 -10 a 6 6 0 1 1 12 0 Z" fill="${suit.color}" opacity="0.35"/>`,
    hearts: `<path d="M ${cx} ${cy + 50} C ${cx - 10} ${cy + 38} ${cx - 10} ${cy + 52} ${cx} ${cy + 58} C ${cx + 10} ${cy + 52} ${cx + 10} ${cy + 38} ${cx} ${cy + 50} Z" fill="${suit.color}" opacity="0.35"/>`,
    diamonds: `<polygon points="${cx},${cy + 42} ${cx - 8},${cy + 54} ${cx},${cy + 66} ${cx + 8},${cy + 54}" fill="${suit.color}" opacity="0.35"/>`,
    clubs: `<circle cx="${cx - 5}" cy="${cy + 48}" r="5" fill="${suit.color}" opacity="0.35"/><circle cx="${cx + 5}" cy="${cy + 48}" r="5" fill="${suit.color}" opacity="0.35"/><circle cx="${cx}" cy="${cy + 42}" r="5" fill="${suit.color}" opacity="0.35"/>`,
  };

  return `
    <g>
      ${suitDeco[suit.name] || ''}
      ${chibiBody(cx, cy, outfit, pose)}
      <ellipse cx="${cx}" cy="${cy + 4}" rx="26" ry="24" fill="${skinColor}"/>
      ${hairStyle !== 'crown' ? chibiHair(cx, cy, hairStyle, hairColor) : ''}
      ${accessory}
      ${chibiBlush(cx, cy)}
      ${chibiEyes(cx, cy, mood)}
      ${chibiMouth(cx, cy, mood === 'open' ? 'open' : mood === 'smirk' ? 'smirk' : 'smile')}
    </g>
  `;
}

function cardFrame(rank, suit) {
  const isRed = suit.name === 'hearts' || suit.name === 'diamonds';
  const cornerColor = isRed ? '#dc2626' : '#1e293b';
  const rankLabel = rank;
  const suitLabel = suit.sym;

  return `
    <defs>
      <linearGradient id="cardBg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#fffef9"/>
        <stop offset="100%" stop-color="#f8f4ea"/>
      </linearGradient>
      <linearGradient id="frameGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${suit.accent}"/>
        <stop offset="100%" stop-color="${suit.color}"/>
      </linearGradient>
      <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.15"/>
      </filter>
    </defs>
    <rect x="2" y="2" width="136" height="192" rx="12" fill="url(#frameGrad)" filter="url(#softShadow)"/>
    <rect x="6" y="6" width="128" height="184" rx="10" fill="url(#cardBg)" stroke="${suit.color}" stroke-width="1.5" opacity="0.95"/>
    <rect x="10" y="10" width="120" height="176" rx="8" fill="none" stroke="${suit.accent}" stroke-width="0.8" opacity="0.4"/>

    <text x="18" y="30" font-family="Georgia, serif" font-size="20" font-weight="700" fill="${cornerColor}">${esc(rankLabel)}</text>
    <text x="18" y="48" font-family="Georgia, serif" font-size="16" fill="${cornerColor}">${esc(suitLabel)}</text>

    <text x="122" y="182" font-family="Georgia, serif" font-size="20" font-weight="700" fill="${cornerColor}" text-anchor="end" transform="rotate(180 122 182)">${esc(rankLabel)}</text>
    <text x="122" y="164" font-family="Georgia, serif" font-size="16" fill="${cornerColor}" text-anchor="end" transform="rotate(180 122 164)">${esc(suitLabel)}</text>
  `;
}

function generateCard(rank, suit) {
  const seed = hash(`${rank}-${suit.name}`);
  const chibi = drawChibi(70, 108, seed, rank, suit);
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 196" width="140" height="196">
  ${cardFrame(rank, suit)}
  ${chibi}
</svg>`;
}

function generateCardBack() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 196" width="140" height="196">
  <defs>
    <linearGradient id="backBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#312e81"/>
      <stop offset="50%" stop-color="#4338ca"/>
      <stop offset="100%" stop-color="#1e1b4b"/>
    </linearGradient>
    <pattern id="stars" width="20" height="20" patternUnits="userSpaceOnUse">
      <circle cx="10" cy="10" r="1.2" fill="#c4b5fd" opacity="0.5"/>
    </pattern>
  </defs>
  <rect x="2" y="2" width="136" height="192" rx="12" fill="url(#backBg)"/>
  <rect x="2" y="2" width="136" height="192" rx="12" fill="url(#stars)"/>
  <rect x="10" y="10" width="120" height="176" rx="8" fill="none" stroke="#a78bfa" stroke-width="2" opacity="0.6"/>
  <rect x="16" y="16" width="108" height="164" rx="6" fill="none" stroke="#818cf8" stroke-width="1" opacity="0.4"/>
  <g transform="translate(70, 98)">
    <ellipse cx="0" cy="0" rx="28" ry="26" fill="#fcd34d"/>
    <ellipse cx="0" cy="-18" rx="28" ry="24" fill="#6366f1"/>
    <ellipse cx="-10" cy="-4" rx="5.5" ry="7" fill="#1e293b"/>
    <ellipse cx="10" cy="-4" rx="5.5" ry="7" fill="#1e293b"/>
    <circle cx="-8" cy="-6" r="2" fill="#fff"/>
    <circle cx="12" cy="-6" r="2" fill="#fff"/>
    <path d="M -5 10 Q 0 15 5 10" stroke="#be123c" stroke-width="1.8" fill="none"/>
    <ellipse cx="-16" cy="6" rx="5" ry="3" fill="#fca5a5" opacity="0.55"/>
    <ellipse cx="16" cy="6" rx="5" ry="3" fill="#fca5a5" opacity="0.55"/>
    <text y="42" font-family="Georgia, serif" font-size="14" font-weight="700" fill="#e0e7ff" text-anchor="middle">♠ ♥ ♦ ♣</text>
  </g>
</svg>`;
}

function generateAvatar(name, variant) {
  const h = hash(name + variant);
  const cx = 64;
  const cy = 72;
  const hairColor = pick(HAIR, h);
  const skinColor = pick(SKIN, h >> 2);
  const outfit = pick(OUTFITS, h >> 4);
  const hairStyle = pick(['bob', 'spiky', 'long', 'bun', 'fringe'], h >> 6);
  const mood = pick(['normal', 'happy', 'wink'], h >> 8);
  let extra = '';

  if (variant === 'dealer') {
    extra = `
      <rect x="34" y="18" width="60" height="14" rx="4" fill="#1e293b"/>
      <rect x="38" y="12" width="52" height="10" rx="3" fill="#334155"/>
      <ellipse cx="64" cy="28" rx="8" ry="3" fill="none" stroke="#94a3b8" stroke-width="2"/>
    `;
  } else if (variant === 'player') {
    extra = `<circle cx="92" cy="28" r="10" fill="#22c55e"/><text x="92" y="32" font-size="12" fill="#fff" text-anchor="middle" font-weight="700">★</text>`;
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#eef2ff"/>
      <stop offset="100%" stop-color="#e0e7ff"/>
    </linearGradient>
  </defs>
  <rect width="128" height="128" rx="24" fill="url(#bg)"/>
  ${extra}
  ${chibiBody(cx, cy, outfit, 'peace')}
  <ellipse cx="${cx}" cy="${cy - 8}" rx="34" ry="32" fill="${skinColor}"/>
  ${chibiHair(cx, cy - 12, hairStyle, hairColor)}
  ${chibiBlush(cx, cy - 8)}
  ${chibiEyes(cx, cy - 8, mood)}
  ${chibiMouth(cx, cy - 8, 'smile')}
</svg>`;
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function writeCards() {
  ensureDir(CARDS_DIR);
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      const filename = `${rank}-${suit.name}.svg`;
      fs.writeFileSync(path.join(CARDS_DIR, filename), generateCard(rank, suit));
    }
  }
  fs.writeFileSync(path.join(CARDS_DIR, 'back.svg'), generateCardBack());
  console.log(`Wrote 53 card SVGs to ${CARDS_DIR}`);
}

function writeCharacters() {
  /* Character PNGs are committed separately; cards-only generation is the default. */
}

writeCards();
console.log('Done!');
