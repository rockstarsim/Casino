const CHARACTER_COUNT = 6;

const CHARACTER_NAMES = [
  'Yuki', 'Ren', 'Mika', 'Kai', 'Hana', 'Sora', 'Akira', 'Rin', 'Takeshi', 'Mei'
];

function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h) + s.charCodeAt(i);
  return Math.abs(h);
}

function pickCharacterNames(count) {
  const pool = [...CHARACTER_NAMES].sort(() => Math.random() - 0.5);
  return pool.slice(0, count);
}

function characterImageFor(player) {
  if (player.isDealer) return 'img/characters/dealer.png';
  if (player.isYou || player.id === 'human' || player.name === 'You') return 'img/characters/player.png';
  const seed = player.avatarSeed || player.id || player.name;
  const idx = hashStr(seed) % CHARACTER_COUNT;
  return `img/characters/char-${idx}.png`;
}

function assignAvatarSeed(player) {
  if (!player.avatarSeed) {
    player.avatarSeed = player.isAi ? `${player.name}-${player.id}` : 'player-you';
  }
  return player;
}

function playerBadge(p) {
  if (p.isDealer) return '<span class="role-badge dealer-badge">Dealer</span>';
  if (p.isYou || p.id === 'human' || p.name === 'You') return '<span class="role-badge you-badge">★ You</span>';
  if (p.isAi) return '<span class="role-badge ai-badge">Opponent</span>';
  return '<span class="role-badge guest-badge">Player</span>';
}

function avatarFrameClass(p) {
  const isYou = p.isYou || p.id === 'human' || p.name === 'You';
  let cls = 'avatar-frame';
  if (p.isDealer) cls += ' dealer-frame';
  if (isYou) cls += ' you-frame';
  else if (p.isAi) cls += ' ai-frame';
  return cls;
}

function buildPlayerHeader(p) {
  assignAvatarSeed(p);
  const isYou = p.isYou || p.id === 'human' || p.name === 'You';
  if (isYou) p.isYou = true;
  return `
    <div class="player-header">
      <div class="${avatarFrameClass(p)}">
        <img class="player-avatar" src="${characterImageFor(p)}" alt="${p.name}" loading="lazy">
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
  const isYou = p.id === 'human' || p.isYou || p.name === 'You';
  const bets = p.bets
    ? `${p.bets.player ? 'Player $'+p.bets.player+' ' : ''}${p.bets.banker ? 'Banker $'+p.bets.banker+' ' : ''}${p.bets.tie ? 'Tie $'+p.bets.tie : ''}`
    : (p.bet ? `Bet ${formatMoney(p.bet)}` : '');
  return `
    <div class="player-row${isYou ? ' is-you' : ''}${p.isAi ? ' ai-player' : ''}">
      <div class="player-row-left">
        <div class="${avatarFrameClass(p)} row-avatar">
          <img class="player-avatar" src="${characterImageFor(p)}" alt="${p.name}" loading="lazy">
        </div>
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
  const isYou = p.isYou || p.id === 'human' || p.name === 'You';
  return `
    ${buildPlayerHeader(p)}
    ${extras.bet || ''}
    <div class="card-row seat-cards"></div>
    ${extras.total || ''}
    ${extras.result || ''}
    ${extras.action || ''}
    ${extras.handName || ''}`;
}
