const CHARACTER_COUNT = 34;

function usedCharacterIndices(players) {
  return new Set(players.map(p => p.characterIndex).filter(i => Number.isInteger(i)));
}

function assignCharacterIndex(room, player) {
  const used = usedCharacterIndices(room.players);
  const available = [];
  for (let i = 0; i < CHARACTER_COUNT; i++) {
    if (!used.has(i)) available.push(i);
  }
  player.characterIndex = available.length
    ? available[Math.floor(Math.random() * available.length)]
    : Math.abs(hashStr(player.id)) % CHARACTER_COUNT;
  return player;
}

function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h) + s.charCodeAt(i);
  return Math.abs(h);
}

module.exports = { CHARACTER_COUNT, assignCharacterIndex };
