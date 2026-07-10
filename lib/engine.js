const crypto = require('crypto');
const store = require('./store');
const { assignCharacterIndex } = require('./avatars');
const auth = require('./auth');
const { generateRoomCode } = require('./deck');
const blackjack = require('./blackjack');
const baccarat = require('./baccarat');
const holdem = require('./holdem');

const ACTIVE_MS = 45000;

function getGameModule(game) {
  if (game === 'blackjack') return blackjack;
  if (game === 'baccarat') return baccarat;
  if (game === 'holdem') return holdem;
  return null;
}

function touchPlayer(room, playerId) {
  const p = room.players.find(x => x.id === playerId);
  if (p) p.lastSeen = Date.now();
}

function pruneInactivePlayers(room) {
  const now = Date.now();
  const before = room.players.length;
  room.players = room.players.filter(p => now - (p.lastSeen || 0) < ACTIVE_MS);
  room.players.forEach((p, i) => { p.seat = i; });
  return before !== room.players.length;
}

function activePlayerCount(room) {
  const now = Date.now();
  return room.players.filter(p => now - (p.lastSeen || 0) < ACTIVE_MS).length;
}

async function persistRoom(room) {
  if (!room) return;
  pruneInactivePlayers(room);
  if (room.players.length === 0) {
    await store.deleteRoom(room.code);
    return;
  }
  await store.saveRoom(room);
}

async function syncPlayerBalanceToAccount(player) {
  if (!player?.userId) return;
  await auth.updateUserBalance(player.userId, player.chips);
}

async function syncAllBalances(room) {
  for (const p of room.players) {
    if (p.userId) await syncPlayerBalanceToAccount(p);
  }
}

function getPublicState(room, viewerId) {
  const mod = getGameModule(room.game);
  return mod ? mod.publicState(room, viewerId) : {};
}

async function createRoom(game) {
  let code;
  const codes = await store.listRoomCodes();
  const existing = new Set(codes);
  do { code = generateRoomCode(); } while (existing.has(code));

  const mod = getGameModule(game);
  if (!mod) return null;

  let room;
  if (game === 'blackjack') room = blackjack.createBlackjackRoom(code);
  else if (game === 'baccarat') room = baccarat.createBaccaratRoom(code);
  else if (game === 'holdem') room = holdem.createHoldemRoom(code);
  else return null;

  if (game === 'blackjack') room.phase = 'betting';
  room.updatedAt = Date.now();
  await store.saveRoom(room);
  return room;
}

async function joinRoom(code, opts = {}) {
  const room = await store.getRoom(code);
  if (!room) return { error: 'Room not found' };

  pruneInactivePlayers(room);
  const mod = getGameModule(room.game);
  if (!mod) return { error: 'Invalid room' };

  let user = null;
  if (opts.token) user = await auth.getUserFromToken(opts.token);

  const name = user?.displayName || String(opts.name || '').trim().slice(0, 16);
  if (name.length < 2) return { error: 'Enter your name (2+ chars)' };

  if (opts.playerId) {
    const existing = room.players.find(p => p.id === opts.playerId);
    if (existing) {
      existing.lastSeen = Date.now();
      if (user) {
        existing.userId = user.id;
        existing.name = user.displayName;
        existing.characterIndex = user.characterIndex;
        existing.chips = user.balance;
      }
      await persistRoom(room);
      return { ok: true, code: room.code, playerId: existing.id, rejoined: true };
    }
  }

  const playerId = opts.playerId || crypto.randomUUID();
  let player;
  if (room.game === 'blackjack') player = blackjack.addPlayer(room, playerId, name);
  else if (room.game === 'baccarat') player = baccarat.addPlayer(room, playerId, name);
  else if (room.game === 'holdem') player = holdem.addPlayer(room, playerId, name);

  if (!player) return { error: 'Room full or game in progress' };

  player.lastSeen = Date.now();
  if (user) {
    player.userId = user.id;
    player.name = user.displayName;
    player.characterIndex = user.characterIndex;
    player.chips = user.balance;
  } else {
    assignCharacterIndex(room, player);
  }

  await persistRoom(room);
  return { ok: true, code: room.code, playerId: player.id };
}

async function leaveRoom(code, playerId) {
  const room = await store.getRoom(code);
  if (!room) return { ok: true };
  const player = room.players.find(p => p.id === playerId);
  if (player) await syncPlayerBalanceToAccount(player);

  const mod = getGameModule(room.game);
  if (mod?.removePlayer) mod.removePlayer(room, playerId);

  await persistRoom(room);
  return { ok: true };
}

async function pollRoom(code, playerId) {
  const room = await store.getRoom(code);
  if (!room) return { error: 'Room not found' };
  touchPlayer(room, playerId);
  const changed = pruneInactivePlayers(room);
  if (changed || room.players.some(p => p.id === playerId)) await persistRoom(room);
  return getPublicState(room, playerId);
}

async function listRooms() {
  const codes = await store.listRoomCodes();
  const list = [];
  const now = Date.now();
  for (const code of codes) {
    const room = await store.getRoom(code);
    if (!room) {
      await store.deleteRoom(code);
      continue;
    }
    pruneInactivePlayers(room);
    const active = room.players.filter(p => now - (p.lastSeen || 0) < ACTIVE_MS);
    if (active.length === 0) {
      await store.deleteRoom(room.code);
      continue;
    }
    if (active.length !== room.players.length) await persistRoom(room);
    list.push({
      code: room.code,
      game: room.game,
      players: active.length,
      phase: room.phase
    });
  }
  return list;
}

async function handleAction(code, playerId, action, data = {}) {
  const room = await store.getRoom(code);
  if (!room) return { error: 'Room not found', state: null };

  touchPlayer(room, playerId);
  let result;
  if (room.game === 'blackjack') {
    if (action === 'bj-bet') result = blackjack.placeBet(room, playerId, data.amount);
    else if (action === 'bj-deal') result = blackjack.startDealing(room);
    else if (action === 'bj-hit') result = blackjack.playerHit(room, playerId);
    else if (action === 'bj-stand') result = blackjack.playerStand(room, playerId);
    else if (action === 'bj-double') result = blackjack.playerDouble(room, playerId);
    else if (action === 'bj-new-round') { blackjack.newRound(room); result = { ok: true }; }
    else result = { error: 'Unknown action' };
    if (room.phase === 'results') await syncAllBalances(room);
  } else if (room.game === 'baccarat') {
    if (action === 'bac-bet') result = baccarat.placeBet(room, playerId, data.type, data.amount);
    else if (action === 'bac-deal') result = baccarat.dealBaccarat(room);
    else if (action === 'bac-new-round') { baccarat.newRound(room); result = { ok: true }; }
    else result = { error: 'Unknown action' };
    if (room.phase === 'results') await syncAllBalances(room);
  } else if (room.game === 'holdem') {
    if (action === 'holdem-start') result = holdem.startHand(room);
    else if (action === 'holdem-action') result = holdem.playerAction(room, playerId, data.action, data.amount);
    else result = { error: 'Unknown action' };
    if (room.phase === 'results') await syncAllBalances(room);
  } else {
    result = { error: 'Unknown game' };
  }

  await persistRoom(room);
  const state = getPublicState(room, playerId);
  return { result, state };
}

module.exports = {
  createRoom,
  joinRoom,
  leaveRoom,
  pollRoom,
  listRooms,
  handleAction,
  getPublicState,
  ACTIVE_MS
};
