const { newShoe, draw, baccaratTotal, baccaratValue } = require('./deck');
const { assignCharacterIndex } = require('./avatars');

function createBaccaratRoom(code) {
  return {
    code,
    game: 'baccarat',
    phase: 'betting',
    shoe: newShoe(),
    playerHand: [],
    bankerHand: [],
    players: [],
    timer: null
  };
}

function addPlayer(room, id, name) {
  if (room.players.find(p => p.id === id)) return room.players.find(p => p.id === id);
  if (room.players.length >= 9) return null;
  const player = assignCharacterIndex(room, {
    id, name, chips: 10000, bets: { player: 0, banker: 0, tie: 0 },
    seat: room.players.length, lastSeen: Date.now()
  });
  room.players.push(player);
  return player;
}

function removePlayer(room, id) {
  room.players = room.players.filter(p => p.id !== id);
  room.players.forEach((p, i) => { p.seat = i; });
}

function placeBet(room, playerId, type, amount) {
  const p = room.players.find(x => x.id === playerId);
  if (!p || room.phase !== 'betting') return { error: 'Cannot bet now' };
  if (!['player', 'banker', 'tie'].includes(type)) return { error: 'Invalid bet type' };
  if (amount < 10 || amount > p.chips) return { error: 'Invalid amount' };
  p.bets[type] += amount;
  p.chips -= amount;
  return { ok: true };
}

function anyBetsPlaced(room) {
  return room.players.some(p => p.bets.player + p.bets.banker + p.bets.tie > 0);
}

function dealBaccarat(room) {
  if (!anyBetsPlaced(room)) return { error: 'No bets placed' };
  room.phase = 'dealing';
  room.playerHand = [draw(room.shoe), draw(room.shoe)];
  room.bankerHand = [draw(room.shoe), draw(room.shoe)];

  let pTotal = baccaratTotal(room.playerHand);
  let bTotal = baccaratTotal(room.bankerHand);

  if (pTotal < 8 && bTotal < 8) {
    let playerThird = null;
    if (pTotal <= 5) {
      playerThird = draw(room.shoe);
      room.playerHand.push(playerThird);
      pTotal = baccaratTotal(room.playerHand);
    }
    if (playerThird === null) {
      if (bTotal <= 5) room.bankerHand.push(draw(room.shoe));
    } else {
      const p3 = baccaratValue(playerThird);
      if (bTotal <= 2) room.bankerHand.push(draw(room.shoe));
      else if (bTotal === 3 && p3 !== 8) room.bankerHand.push(draw(room.shoe));
      else if (bTotal === 4 && [2,3,4,5,6,7].includes(p3)) room.bankerHand.push(draw(room.shoe));
      else if (bTotal === 5 && [4,5,6,7].includes(p3)) room.bankerHand.push(draw(room.shoe));
      else if (bTotal === 6 && [6,7].includes(p3)) room.bankerHand.push(draw(room.shoe));
    }
  }

  pTotal = baccaratTotal(room.playerHand);
  bTotal = baccaratTotal(room.bankerHand);
  const tie = pTotal === bTotal;
  const playerWins = pTotal > bTotal;

  for (const p of room.players) {
    const { player: bp, banker: bb, tie: bt } = p.bets;
    if (tie) {
      p.chips += bp + bb + bt * 9;
      p.result = bt > 0 ? 'tie-win' : 'push';
    } else if (playerWins) {
      if (bp > 0) p.chips += bp * 2;
      p.result = bp > 0 ? 'win' : (bb > 0 ? 'lose' : 'none');
    } else {
      if (bb > 0) p.chips += bb + Math.floor(bb * 0.95);
      p.result = bb > 0 ? 'win' : (bp > 0 ? 'lose' : 'none');
    }
    if (p.chips <= 0) p.chips = 10000;
    p.bets = { player: 0, banker: 0, tie: 0 };
  }

  room.phase = 'results';
  room.winner = tie ? 'tie' : playerWins ? 'player' : 'banker';
  room.playerTotal = pTotal;
  room.bankerTotal = bTotal;
  return { ok: true };
}

function newRound(room) {
  room.phase = 'betting';
  room.playerHand = [];
  room.bankerHand = [];
  room.winner = null;
  for (const p of room.players) {
    p.bets = { player: 0, banker: 0, tie: 0 };
    p.result = null;
  }
}

function publicState(room, viewerId) {
  return {
    code: room.code,
    game: room.game,
    phase: room.phase,
    playerHand: room.playerHand,
    bankerHand: room.bankerHand,
    playerTotal: room.playerTotal ?? (room.playerHand.length ? baccaratTotal(room.playerHand) : 0),
    bankerTotal: room.bankerTotal ?? (room.bankerHand.length ? baccaratTotal(room.bankerHand) : 0),
    winner: room.winner,
    players: room.players.map(p => ({
      id: p.id, name: p.name, chips: p.chips, bets: p.bets,
      result: p.result, seat: p.seat, characterIndex: p.characterIndex,
      isYou: p.id === viewerId
    }))
  };
}

module.exports = {
  createBaccaratRoom, addPlayer, removePlayer, placeBet,
  anyBetsPlaced, dealBaccarat, newRound, publicState
};
