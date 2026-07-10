const CHARACTER_COUNT = 34;

const CHARACTER_NAMES = [
  'Yuki', 'Ren', 'Mika', 'Kai', 'Hana', 'Sora', 'Akira', 'Rin',
  'Takeshi', 'Mei', 'Luna', 'Sakura', 'Aiko', 'Nami', 'Yui', 'Emi'
];

function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h) + s.charCodeAt(i);
  return Math.abs(h);
}

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickCharacterNames(count) {
  return shuffleArray(CHARACTER_NAMES).slice(0, count);
}

function pickUniqueCharacterIndices(count, reserved = []) {
  const blocked = new Set(reserved);
  const pool = shuffleArray(
    [...Array(CHARACTER_COUNT).keys()].filter(i => !blocked.has(i))
  );
  return pool.slice(0, count);
}

function isYouPlayer(player) {
  return player.isYou || player.id === 'human' || player.name === 'You';
}

function assignUniqueCharacters(players) {
  const used = new Set();
  for (const p of players) {
    if (Number.isInteger(p.characterIndex)) used.add(p.characterIndex);
  }
  const available = pickUniqueCharacterIndices(players.length, [...used]);
  let next = 0;
  for (const p of players) {
    if (p.isDealer || isYouPlayer(p)) continue;
    if (Number.isInteger(p.characterIndex)) continue;
    p.characterIndex = available[next++];
  }
  return players;
}

function characterImageFor(player) {
  if (player.isDealer) return 'img/characters/dealer.png';
  if (isYouPlayer(player) && !Number.isInteger(player.characterIndex)) return 'img/characters/player.png';
  const idx = Number.isInteger(player.characterIndex)
    ? player.characterIndex
    : hashStr(player.avatarSeed || `${player.name}-${player.id}` || player.name) % CHARACTER_COUNT;
  if (idx >= 14) return `img/characters/char-${idx}.svg`;
  return `img/characters/char-${idx}.png`;
}

function syncPlayerAvatar(scope, player) {
  if (!scope || !player) return;
  const img = scope.querySelector('.player-avatar');
  if (!img) return;
  const src = characterImageFor(player);
  if (img.getAttribute('src') !== src) img.setAttribute('src', src);
  if (Number.isInteger(player.characterIndex)) {
    img.dataset.char = String(player.characterIndex);
  }
}

function assignAvatarSeed(player) {
  if (!player.avatarSeed) {
    player.avatarSeed = player.isAi ? `${player.name}-${player.id}` : 'player-you';
  }
  return player;
}

function playerBadge(p) {
  if (p.isDealer) return '<span class="role-badge dealer-badge">Dealer</span>';
  if (isYouPlayer(p)) return '<span class="role-badge you-badge">You</span>';
  if (p.isAi) return '<span class="role-badge ai-badge">Opponent</span>';
  return '<span class="role-badge guest-badge">Player</span>';
}

function buildPlayerHeader(p) {
  assignAvatarSeed(p);
  const isYou = isYouPlayer(p);
  if (isYou) p.isYou = true;
  return `
    <div class="player-header">
      <div class="avatar-frame${p.isAi ? ' ai-frame' : ''}${isYou ? ' you-frame' : ''}">
        <img class="player-avatar" src="${characterImageFor(p)}" alt="${p.name}" data-char="${Number.isInteger(p.characterIndex) ? p.characterIndex : ''}">
      </div>
      <div class="player-meta">
        <div class="player-name-row">
          <span class="player-name">${p.name}</span>
          ${playerBadge(p)}
        </div>
        <div class="player-chips">${formatMoney(p.chips)}</div>
      </div>
    </div>`;
}

function buildDealerHeader(scoreText) {
  const dealer = { isDealer: true, name: 'Dealer' };
  return `
    <div class="dealer-persona">
      <div class="avatar-frame dealer-frame">
        <img class="player-avatar dealer-avatar" src="${characterImageFor(dealer)}" alt="Dealer">
      </div>
      <div class="dealer-meta">
        <h3 class="dealer-title">Dealer</h3>
        <span class="score-badge dealer-score-badge">Score: ${scoreText ?? '0'}</span>
      </div>
    </div>`;
}

function buildPlayerRow(p) {
  assignAvatarSeed(p);
  const isYou = isYouPlayer(p);
  const bets = p.bets
    ? `${p.bets.player ? 'Player $'+p.bets.player+' ' : ''}${p.bets.banker ? 'Banker $'+p.bets.banker+' ' : ''}${p.bets.tie ? 'Tie $'+p.bets.tie : ''}`
    : (p.bet ? `Bet ${formatMoney(p.bet)}` : '');
  return `
    <div class="player-row${isYou ? ' is-you' : ''}${p.isAi ? ' ai-player' : ''}">
      <div class="player-row-left">
        <img class="player-avatar small" src="${characterImageFor(p)}" alt="${p.name}" data-char="${Number.isInteger(p.characterIndex) ? p.characterIndex : ''}">
        <div>
          <strong>${p.name}</strong> ${playerBadge(p)}
          <div class="player-chips">${formatMoney(p.chips)}</div>
        </div>
      </div>
      <div class="player-row-right">${bets}${p.result ? `<span class="result-tag result-${p.result}">${p.result}</span>` : ''}</div>
    </div>`;
}

function buildSeatCard(p, extras = {}) {
  assignAvatarSeed(p);
  return `
    ${buildPlayerHeader(p)}
    ${extras.bet || ''}
    <div class="card-row seat-cards"></div>
    ${extras.total || ''}
    ${extras.result || ''}
    ${extras.action || ''}
    ${extras.handName || ''}`;
}
