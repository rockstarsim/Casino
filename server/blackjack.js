const { newShoe, draw, blackjackTotal } = require('./deck');
const { assignCharacterIndex } = require('./avatars');

function createBlackjackRoom(code) {
  return {
    code,
    game: 'blackjack',
    phase: 'lobby',
    shoe: newShoe(),
    dealer: { hand: [], hidden: true },
    players: [],
    currentTurn: null,
    messages: []
  };
}

function addPlayer(room, id, name) {
  if (room.players.find(p => p.id === id)) return room.players.find(p => p.id === id);
  if (room.players.length >= 7) return null;
  const player = assignCharacterIndex(room, {
    id, name, chips: 10000, bet: 0, hand: [],
    status: 'waiting', acted: false, doubled: false, seat: room.players.length
  });
  room.players.push(player);
  return player;
}

function removePlayer(room, id) {
  room.players = room.players.filter(p => p.id !== id);
  room.players.forEach((p, i) => { p.seat = i; });
}

function placeBet(room, playerId, amount) {
  const p = room.players.find(x => x.id === playerId);
  if (!p || room.phase !== 'betting') return { error: 'Cannot bet now' };
  if (amount < 10 || amount > p.chips) return { error: 'Invalid bet' };
  p.bet = amount;
  p.chips -= amount;
  p.status = 'ready';
  return { ok: true };
}

function allBetsPlaced(room) {
  return room.players.length > 0 && room.players.every(p => p.bet > 0);
}

function startDealing(room) {
  if (!allBetsPlaced(room)) return { error: 'Not all players have bet' };
  room.phase = 'playing';
  room.dealer = { hand: [], hidden: true };
  for (const p of room.players) {
    p.hand = [draw(room.shoe), draw(room.shoe)];
    p.status = 'playing';
    p.acted = false;
    p.doubled = false;
    if (blackjackTotal(p.hand) === 21) { p.status = 'blackjack'; p.acted = true; }
  }
  room.dealer.hand = [draw(room.shoe), draw(room.shoe)];
  const active = room.players.filter(p => p.status === 'playing');
  room.currentTurn = active.length ? active[0].id : null;
  if (!active.length) finishDealer(room);
  return { ok: true };
}

function getCurrentPlayer(room) {
  return room.players.find(p => p.id === room.currentTurn);
}

function nextTurn(room) {
  const idx = room.players.findIndex(p => p.id === room.currentTurn);
  for (let i = idx + 1; i < room.players.length; i++) {
    if (room.players[i].status === 'playing') {
      room.currentTurn = room.players[i].id;
      return;
    }
  }
  room.currentTurn = null;
  finishDealer(room);
}

function playerHit(room, playerId) {
  const p = room.players.find(x => x.id === playerId);
  if (!p || p.id !== room.currentTurn || p.status !== 'playing') return { error: 'Not your turn' };
  p.hand.push(draw(room.shoe));
  const total = blackjackTotal(p.hand);
  if (total > 21) { p.status = 'bust'; p.acted = true; nextTurn(room); }
  else if (total === 21) { p.status = 'stand'; p.acted = true; nextTurn(room); }
  return { ok: true };
}

function playerStand(room, playerId) {
  const p = room.players.find(x => x.id === playerId);
  if (!p || p.id !== room.currentTurn || p.status !== 'playing') return { error: 'Not your turn' };
  p.status = 'stand';
  p.acted = true;
  nextTurn(room);
  return { ok: true };
}

function playerDouble(room, playerId) {
  const p = room.players.find(x => x.id === playerId);
  if (!p || p.id !== room.currentTurn || p.status !== 'playing' || p.hand.length !== 2) return { error: 'Cannot double' };
  if (p.bet > p.chips) return { error: 'Insufficient chips' };
  p.chips -= p.bet;
  p.bet *= 2;
  p.doubled = true;
  p.hand.push(draw(room.shoe));
  const total = blackjackTotal(p.hand);
  p.status = total > 21 ? 'bust' : 'stand';
  p.acted = true;
  nextTurn(room);
  return { ok: true };
}

function finishDealer(room) {
  room.phase = 'dealer';
  room.dealer.hidden = false;
  while (blackjackTotal(room.dealer.hand) < 17) {
    room.dealer.hand.push(draw(room.shoe));
  }
  const dealerTotal = blackjackTotal(room.dealer.hand);
  const dealerBust = dealerTotal > 21;
  const dealerBJ = room.dealer.hand.length === 2 && dealerTotal === 21;

  for (const p of room.players) {
    const pt = blackjackTotal(p.hand);
    if (p.status === 'bust') { p.result = 'lose'; continue; }
    if (p.status === 'blackjack' && !dealerBJ) { p.chips += p.bet + Math.floor(p.bet * 1.5); p.result = 'blackjack'; }
    else if (dealerBJ && p.status !== 'blackjack') { p.result = 'lose'; }
    else if (dealerBJ && p.status === 'blackjack') { p.chips += p.bet; p.result = 'push'; }
    else if (dealerBust) { p.chips += p.bet * 2; p.result = 'win'; }
    else if (pt > dealerTotal) { p.chips += p.bet * 2; p.result = 'win'; }
    else if (pt < dealerTotal) { p.result = 'lose'; }
    else { p.chips += p.bet; p.result = 'push'; }
    if (p.chips <= 0) p.chips = 10000;
  }
  room.phase = 'results';
  room.currentTurn = null;
}

function newRound(room) {
  room.phase = 'betting';
  room.dealer = { hand: [], hidden: true };
  room.currentTurn = null;
  for (const p of room.players) {
    p.bet = 0; p.hand = []; p.status = 'waiting'; p.acted = false; p.doubled = false; p.result = null;
  }
}

function publicState(room, viewerId) {
  return {
    code: room.code,
    game: room.game,
    phase: room.phase,
    dealer: {
      hand: room.phase === 'playing' ? [room.dealer.hand[0], { hidden: true }] : room.dealer.hand,
      total: room.phase === 'playing' ? '?' : blackjackTotal(room.dealer.hand)
    },
    players: room.players.map(p => ({
      id: p.id, name: p.name, chips: p.chips, bet: p.bet,
      hand: p.hand, status: p.status, result: p.result, seat: p.seat,
      total: p.hand.length ? blackjackTotal(p.hand) : 0,
      characterIndex: p.characterIndex,
      isYou: p.id === viewerId
    })),
    currentTurn: room.currentTurn,
    yourTurn: room.currentTurn === viewerId
  };
}

module.exports = {
  createBlackjackRoom, addPlayer, removePlayer, placeBet, allBetsPlaced,
  startDealing, playerHit, playerStand, playerDouble, newRound, publicState
};
