const AI_NAMES = ['Victor', 'Sofia', 'James', 'Luna', 'Marcus', 'Elena', 'Dante', 'Aria'];

function pickAiNames(count) {
  const pool = [...AI_NAMES].sort(() => Math.random() - 0.5);
  return pool.slice(0, count);
}

function aiBetAmount(chips) {
  const options = [50, 75, 100, 150, 200, 250];
  const valid = options.filter(b => b <= chips);
  return valid[Math.floor(Math.random() * valid.length)] || Math.min(50, chips);
}

function aiBlackjackAction(player, shoe) {
  const total = blackjackTotal(player.hand);
  const soft = player.hand.some(c => c.rank === 'A') && total <= 21 && total - 10 >= 7;
  if (total < 12) return 'hit';
  if (total >= 17 && !soft) return 'stand';
  if (total <= 16 && Math.random() < 0.7) return 'hit';
  if (player.hand.length === 2 && total >= 9 && total <= 11 && player.bet <= player.chips && Math.random() < 0.25) return 'double';
  return 'stand';
}

function aiBaccaratBet(chips) {
  const r = Math.random();
  const type = r < 0.45 ? 'player' : r < 0.9 ? 'banker' : 'tie';
  const amount = type === 'tie' ? Math.min(aiBetAmount(chips), 50) : aiBetAmount(chips);
  return { type, amount: Math.min(amount, chips) };
}

function aiHoldemAction(player, room) {
  const toCall = room.currentBet - player.bet;
  const strength = holdemStrength(player.hole, room.community);
  const potOdds = toCall / (room.pot + toCall + 1);

  if (strength < 0.2 && toCall > 0) return Math.random() < 0.85 ? 'fold' : 'call';
  if (strength < 0.35) {
    if (toCall === 0) return Math.random() < 0.6 ? 'check' : 'fold';
    return Math.random() < 0.5 ? 'fold' : 'call';
  }
  if (strength < 0.55) {
    if (toCall === 0) return 'check';
    return Math.random() < 0.7 ? 'call' : 'fold';
  }
  if (strength < 0.75) {
    if (toCall === 0) return Math.random() < 0.4 ? 'raise' : 'check';
    if (Math.random() < 0.3 && player.chips > toCall + 100) return 'raise';
    return 'call';
  }
  if (toCall === 0) return Math.random() < 0.6 ? 'raise' : 'check';
  if (Math.random() < 0.5 && player.chips > toCall) return 'raise';
  return 'call';
}

function holdemStrength(hole, community) {
  if (!hole.length) return 0;
  if (!community.length) {
    const r1 = holdemRank(hole[0]), r2 = holdemRank(hole[1]);
    const high = Math.max(r1, r2), low = Math.min(r1, r2);
    const pair = r1 === r2;
    const suited = hole[0].suit === hole[1].suit;
    if (pair && high >= 10) return 0.9;
    if (pair) return 0.65;
    if (high >= 13 && low >= 10) return suited ? 0.7 : 0.6;
    if (high >= 12) return 0.45;
    return 0.25;
  }
  const hand = bestHoldemHand(hole, community);
  return Math.min(0.95, (hand.score + 1) / 9 + hand.tiebreak[0] / 140);
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }
