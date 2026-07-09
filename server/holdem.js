const { newShoe, draw, bestHoldemHand, compareHands } = require('./deck');
const { assignCharacterIndex } = require('./avatars');

const SMALL_BLIND = 25;
const BIG_BLIND = 50;

function createHoldemRoom(code) {
  return {
    code,
    game: 'holdem',
    phase: 'lobby',
    shoe: newShoe(),
    players: [],
    community: [],
    pot: 0,
    currentBet: 0,
    currentTurn: null,
    dealerIndex: 0,
    smallBlindIndex: 0,
    bigBlindIndex: 0,
    round: null,
    winners: [],
    messages: []
  };
}

function addPlayer(room, id, name) {
  if (room.players.find(p => p.id === id)) return room.players.find(p => p.id === id);
  if (room.players.length >= 9) return null;
  const player = assignCharacterIndex(room, {
    id, name, chips: 10000, hole: [], bet: 0, totalBet: 0,
    status: 'waiting', folded: false, seat: room.players.length, lastAction: null
  });
  room.players.push(player);
  return player;
}

function removePlayer(room, id) {
  room.players = room.players.filter(p => p.id !== id);
  room.players.forEach((p, i) => { p.seat = i; });
}

function activePlayers(room) {
  return room.players.filter(p => !p.folded && p.chips >= 0);
}

function playersInHand(room) {
  return room.players.filter(p => p.status !== 'waiting' && !p.folded);
}

function startHand(room) {
  if (room.players.length < 2) return { error: 'Need at least 2 players' };
  if (room.phase !== 'lobby' && room.phase !== 'results') return { error: 'Hand in progress' };

  room.community = [];
  room.pot = 0;
  room.currentBet = 0;
  room.winners = [];
  room.round = 'preflop';

  for (const p of room.players) {
    p.hole = []; p.bet = 0; p.totalBet = 0; p.folded = false;
    p.status = 'active'; p.lastAction = null;
    if (p.chips <= 0) p.chips = 10000;
  }

  room.dealerIndex = room.dealerIndex % room.players.length;
  room.smallBlindIndex = (room.dealerIndex + 1) % room.players.length;
  room.bigBlindIndex = (room.dealerIndex + 2) % room.players.length;

  for (const p of room.players) {
    p.hole = [draw(room.shoe), draw(room.shoe)];
  }

  postBlind(room, room.smallBlindIndex, SMALL_BLIND);
  postBlind(room, room.bigBlindIndex, BIG_BLIND);
  room.currentBet = BIG_BLIND;
  room.phase = 'betting';
  room.currentTurn = nextBetter(room, room.bigBlindIndex);
  return { ok: true };
}

function postBlind(room, idx, amount) {
  const p = room.players[idx];
  const pay = Math.min(amount, p.chips);
  p.chips -= pay;
  p.bet = pay;
  p.totalBet = pay;
  room.pot += pay;
}

function nextBetter(room, fromIdx) {
  const n = room.players.length;
  for (let i = 1; i <= n; i++) {
    const idx = (fromIdx + i) % n;
    const p = room.players[idx];
    if (p.folded || p.status !== 'active') continue;
    if (p.chips === 0) continue;
    if (p.lastAction === null || p.bet < room.currentBet) return p.id;
  }
  return null;
}

function bettingComplete(room) {
  const active = playersInHand(room);
  if (active.length <= 1) return true;
  return active.every(p => {
    if (p.chips === 0) return p.lastAction !== null;
    return p.bet === room.currentBet && p.lastAction !== null;
  });
}

function playerAction(room, playerId, action, raiseAmount = 0) {
  const p = room.players.find(x => x.id === playerId);
  if (!p || p.id !== room.currentTurn || p.folded) return { error: 'Not your turn' };

  if (action === 'fold') {
    p.folded = true;
    p.lastAction = 'fold';
  } else if (action === 'check') {
    if (p.bet < room.currentBet) return { error: 'Cannot check' };
    p.lastAction = 'check';
  } else if (action === 'call') {
    const toCall = room.currentBet - p.bet;
    const pay = Math.min(toCall, p.chips);
    p.chips -= pay;
    p.bet += pay;
    p.totalBet += pay;
    room.pot += pay;
    p.lastAction = p.chips === 0 ? 'allin' : 'call';
  } else if (action === 'raise') {
    const minRaise = room.currentBet + BIG_BLIND;
    const raiseTo = Math.max(minRaise, raiseAmount);
    const toPay = raiseTo - p.bet;
    if (toPay > p.chips) return { error: 'Insufficient chips' };
    p.chips -= toPay;
    room.pot += toPay;
    p.totalBet += toPay;
    p.bet = raiseTo;
    room.currentBet = raiseTo;
    for (const other of room.players) {
      if (other.id !== p.id && !other.folded && other.chips > 0) other.lastAction = null;
    }
    p.lastAction = p.chips === 0 ? 'allin' : 'raise';
  } else if (action === 'allin') {
    room.pot += p.chips;
    p.bet += p.chips;
    p.totalBet += p.chips;
    if (p.bet > room.currentBet) {
      room.currentBet = p.bet;
      for (const other of room.players) {
        if (other.id !== p.id && !other.folded && other.chips > 0) other.lastAction = null;
      }
    }
    p.chips = 0;
    p.lastAction = 'allin';
  } else {
    return { error: 'Invalid action' };
  }

  const idx = room.players.findIndex(x => x.id === playerId);
  if (bettingComplete(room)) {
    advanceRound(room);
  } else {
    room.currentTurn = nextBetter(room, idx);
  }
  return { ok: true };
}

function advanceRound(room) {
  for (const p of room.players) { p.bet = 0; p.lastAction = null; }
  room.currentBet = 0;

  const remaining = playersInHand(room);
  if (remaining.length === 1) {
    const winner = remaining[0];
    winner.chips += room.pot;
    room.winners = [{ id: winner.id, name: winner.name, amount: room.pot, reason: 'Everyone else folded' }];
    room.phase = 'results';
    room.dealerIndex = (room.dealerIndex + 1) % room.players.length;
    return;
  }

  if (room.round === 'preflop') {
    room.community.push(draw(room.shoe), draw(room.shoe), draw(room.shoe));
    room.round = 'flop';
  } else if (room.round === 'flop') {
    room.community.push(draw(room.shoe));
    room.round = 'turn';
  } else if (room.round === 'turn') {
    room.community.push(draw(room.shoe));
    room.round = 'river';
  } else if (room.round === 'river') {
    return showdown(room);
  }

  room.currentTurn = nextBetter(room, room.dealerIndex);
  if (!room.currentTurn) advanceRound(room);
}

function showdown(room) {
  room.phase = 'showdown';
  const remaining = playersInHand(room);
  const evaluations = remaining.map(p => ({
    player: p,
    hand: bestHoldemHand(p.hole, room.community)
  }));

  evaluations.sort((a, b) => compareHands(b.hand, a.hand));
  const best = evaluations[0].hand;
  const winners = evaluations.filter(e => compareHands(e.hand, best) === 0);
  const share = Math.floor(room.pot / winners.length);

  room.winners = winners.map(w => {
    w.player.chips += share;
    return { id: w.player.id, name: w.player.name, amount: share, hand: w.hand.name };
  });

  room.phase = 'results';
  room.dealerIndex = (room.dealerIndex + 1) % room.players.length;
}

function publicState(room, viewerId) {
  const showHoles = room.phase === 'showdown' || room.phase === 'results';
  return {
    code: room.code,
    game: room.game,
    phase: room.phase,
    round: room.round,
    community: room.community,
    pot: room.pot,
    currentBet: room.currentBet,
    currentTurn: room.currentTurn,
    yourTurn: room.currentTurn === viewerId,
    winners: room.winners,
    players: room.players.map(p => ({
      id: p.id, name: p.name, chips: p.chips, bet: p.bet, totalBet: p.totalBet,
      hole: (p.id === viewerId || showHoles) ? p.hole : p.hole.map(() => ({ hidden: true })),
      folded: p.folded, status: p.status, seat: p.seat, lastAction: p.lastAction,
      characterIndex: p.characterIndex,
      isYou: p.id === viewerId,
      handName: showHoles && p.hole.length && room.community.length >= 3
        ? bestHoldemHand(p.hole, room.community)?.name : null
    })),
    smallBlind: SMALL_BLIND,
    bigBlind: BIG_BLIND
  };
}

module.exports = {
  createHoldemRoom, addPlayer, removePlayer, startHand, playerAction, publicState
};
