const crypto = require('crypto');
const { getRooms } = require('./store');
const { generateRoomCode } = require('./deck');
const blackjack = require('./blackjack');
const baccarat = require('./baccarat');
const holdem = require('./holdem');

function getRoom(code) {
  return getRooms().get(String(code).toUpperCase());
}

function getPublicState(room, viewerId) {
  if (room.game === 'blackjack') return blackjack.publicState(room, viewerId);
  if (room.game === 'baccarat') return baccarat.publicState(room, viewerId);
  if (room.game === 'holdem') return holdem.publicState(room, viewerId);
  return {};
}

function createRoom(game) {
  const rooms = getRooms();
  let code;
  do { code = generateRoomCode(); } while (rooms.has(code));

  let room;
  if (game === 'blackjack') room = blackjack.createBlackjackRoom(code);
  else if (game === 'baccarat') room = baccarat.createBaccaratRoom(code);
  else if (game === 'holdem') room = holdem.createHoldemRoom(code);
  else return null;

  if (game === 'blackjack') room.phase = 'betting';
  rooms.set(code, room);
  return room;
}

function joinRoom(room, name) {
  if (!name || name.trim().length < 2) return null;
  const cleanName = name.trim().slice(0, 16);
  const playerId = crypto.randomUUID();

  let player;
  if (room.game === 'blackjack') player = blackjack.addPlayer(room, playerId, cleanName);
  else if (room.game === 'baccarat') player = baccarat.addPlayer(room, playerId, cleanName);
  else if (room.game === 'holdem') player = holdem.addPlayer(room, playerId, cleanName);

  if (!player) return null;
  return { player, playerId };
}

function listRooms() {
  const list = [];
  for (const [code, room] of getRooms()) {
    list.push({ code, game: room.game, players: room.players.length, phase: room.phase });
  }
  return list;
}

function handleAction(room, playerId, action, data = {}) {
  if (room.game === 'blackjack') {
    if (action === 'bj-bet') return blackjack.placeBet(room, playerId, data.amount);
    if (action === 'bj-deal') return blackjack.startDealing(room);
    if (action === 'bj-hit') return blackjack.playerHit(room, playerId);
    if (action === 'bj-stand') return blackjack.playerStand(room, playerId);
    if (action === 'bj-double') return blackjack.playerDouble(room, playerId);
    if (action === 'bj-new-round') { blackjack.newRound(room); return { ok: true }; }
  }
  if (room.game === 'baccarat') {
    if (action === 'bac-bet') return baccarat.placeBet(room, playerId, data.type, data.amount);
    if (action === 'bac-deal') return baccarat.dealBaccarat(room);
    if (action === 'bac-new-round') { baccarat.newRound(room); return { ok: true }; }
  }
  if (room.game === 'holdem') {
    if (action === 'holdem-start') return holdem.startHand(room);
    if (action === 'holdem-action') return holdem.playerAction(room, playerId, data.action, data.amount);
  }
  return { error: 'Unknown action' };
}

module.exports = {
  getRoom, getPublicState, createRoom, joinRoom, listRooms, handleAction, getRooms
};
