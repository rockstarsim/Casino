const SUITS = ['♠', '♥', '♦', '♣'];

function createDeck() {
  const cards = [];
  for (const suit of SUITS) {
    for (const rank of ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']) {
      cards.push({ rank, suit, red: suit === '♥' || suit === '♦' });
    }
  }
  return cards;
}

function shuffle(deck) {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function newShoe() {
  return shuffle(createDeck());
}

function draw(shoe) {
  if (shoe.length < 15) return shuffle(createDeck()).pop();
  return shoe.pop();
}

function blackjackValue(card) {
  if (['J', 'Q', 'K'].includes(card.rank)) return 10;
  if (card.rank === 'A') return 11;
  return parseInt(card.rank, 10);
}

function blackjackTotal(hand) {
  let total = hand.reduce((s, c) => s + blackjackValue(c), 0);
  let aces = hand.filter(c => c.rank === 'A').length;
  while (total > 21 && aces > 0) { total -= 10; aces--; }
  return total;
}

function baccaratValue(card) {
  if (['10', 'J', 'Q', 'K'].includes(card.rank)) return 0;
  if (card.rank === 'A') return 1;
  return parseInt(card.rank, 10);
}

function baccaratTotal(hand) {
  return hand.reduce((s, c) => s + baccaratValue(c), 0) % 10;
}

function holdemRank(card) {
  const order = { '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, J: 11, Q: 12, K: 13, A: 14 };
  return order[card.rank];
}

function evaluateHand(cards) {
  const ranks = cards.map(holdemRank).sort((a, b) => b - a);
  const suits = cards.map(c => c.suit);
  const isFlush = suits.every(s => s === suits[0]);
  const counts = {};
  ranks.forEach(r => { counts[r] = (counts[r] || 0) + 1; });
  const groups = Object.entries(counts).map(([r, c]) => ({ rank: +r, count: c })).sort((a, b) => b.count - a.count || b.rank - a.rank);
  const unique = [...new Set(ranks)].sort((a, b) => b - a);
  let isStraight = false;
  let straightHigh = 0;
  for (let i = 0; i <= unique.length - 5; i++) {
    if (unique[i] - unique[i + 4] === 4) { isStraight = true; straightHigh = unique[i]; break; }
  }
  if (!isStraight && unique.includes(14) && unique.includes(5) && unique.includes(4) && unique.includes(3) && unique.includes(2)) {
    isStraight = true; straightHigh = 5;
  }
  if (isFlush && isStraight) return { score: 8, name: straightHigh === 14 ? 'Royal Flush' : 'Straight Flush', tiebreak: [straightHigh] };
  if (groups[0].count === 4) return { score: 7, name: 'Four of a Kind', tiebreak: [groups[0].rank, groups[1].rank] };
  if (groups[0].count === 3 && groups[1].count === 2) return { score: 6, name: 'Full House', tiebreak: [groups[0].rank, groups[1].rank] };
  if (isFlush) return { score: 5, name: 'Flush', tiebreak: ranks };
  if (isStraight) return { score: 4, name: 'Straight', tiebreak: [straightHigh] };
  if (groups[0].count === 3) return { score: 3, name: 'Three of a Kind', tiebreak: [groups[0].rank, ...ranks.filter(r => r !== groups[0].rank)] };
  if (groups[0].count === 2 && groups[1].count === 2) return { score: 2, name: 'Two Pair', tiebreak: [Math.max(groups[0].rank, groups[1].rank), Math.min(groups[0].rank, groups[1].rank), groups[2]?.rank || 0] };
  if (groups[0].count === 2) return { score: 1, name: 'Pair', tiebreak: [groups[0].rank, ...ranks.filter(r => r !== groups[0].rank)] };
  return { score: 0, name: 'High Card', tiebreak: ranks };
}

function bestHoldemHand(hole, community) {
  const all = [...hole, ...community];
  let best = null;
  const combos = (arr, k, start = 0, cur = []) => {
    if (cur.length === k) {
      const ev = evaluateHand(cur);
      if (!best || compareHands(ev, best) > 0) best = ev;
      return;
    }
    for (let i = start; i < arr.length; i++) combos(arr, k, i + 1, [...cur, arr[i]]);
  };
  combos(all, 5);
  return best;
}

function compareHands(a, b) {
  if (a.score !== b.score) return a.score - b.score;
  for (let i = 0; i < Math.max(a.tiebreak.length, b.tiebreak.length); i++) {
    if ((a.tiebreak[i] || 0) !== (b.tiebreak[i] || 0)) return (a.tiebreak[i] || 0) - (b.tiebreak[i] || 0);
  }
  return 0;
}

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

module.exports = {
  newShoe, draw, shuffle, createDeck,
  blackjackValue, blackjackTotal, baccaratValue, baccaratTotal,
  bestHoldemHand, compareHands, evaluateHand, generateRoomCode
};
