let shoe = newShoe();
let phase = 'betting';
let playerHand = [];
let bankerHand = [];
let playerTotal = 0;
let bankerTotal = 0;
let winner = null;
let players = [];
let humanId = 'human';

const playerCards = document.getElementById('bac-player-cards');
const bankerCards = document.getElementById('bac-banker-cards');
const playerTotalEl = document.getElementById('player-total');
const bankerTotalEl = document.getElementById('banker-total');
const playersArea = document.getElementById('players-area');
const messageEl = document.getElementById('message');
const betInput = document.getElementById('bet-amount');
const dealBtn = document.getElementById('deal-btn');
const newRoundBtn = document.getElementById('new-round-btn');
const balanceEl = document.getElementById('balance');

function init() {
  const aiNames = pickAiNames(4);
  players = [
    { id: humanId, name: 'You', chips: getBalance(), bets: { player: 0, banker: 0, tie: 0 }, isAi: false, result: null },
    ...aiNames.map(n => ({ id: uid(), name: n, chips: 10000, bets: { player: 0, banker: 0, tie: 0 }, isAi: true, result: null }))
  ];
  updateChipDisplay(balanceEl, getBalance());
  render();
}

function human() { return players.find(p => p.id === humanId); }

function render() {
  renderCards(playerCards, playerHand);
  renderCards(bankerCards, bankerHand);
  playerTotalEl.textContent = playerTotal;
  bankerTotalEl.textContent = bankerTotal;

  playersArea.innerHTML = players.map(p => {
    if (p.id === humanId) p.isYou = true;
    return buildPlayerRow(p);
  }).join('');

  const hasBets = players.some(p => p.bets.player + p.bets.banker + p.bets.tie > 0);
  if (phase === 'betting') {
    messageEl.textContent = 'Pick who you think will win, then tap Show Cards!';
    dealBtn.disabled = !hasBets;
    newRoundBtn.disabled = true;
  } else if (phase === 'results') {
    messageEl.textContent = `Winner: ${winner?.toUpperCase()} (${playerTotal} vs ${bankerTotal})`;
    dealBtn.disabled = true;
    newRoundBtn.disabled = false;
  }
}

function placeBet(p, type, amount) {
  if (amount < 10 || amount > p.chips) return false;
  p.bets[type] += amount;
  p.chips -= amount;
  if (p.id === humanId) setBalance(p.chips);
  return true;
}

async function aiPlaceBets() {
  for (const p of players.filter(x => x.isAi)) {
    await delay(300 + Math.random() * 500);
    const { type, amount } = aiBaccaratBet(p.chips);
    if (amount >= 10) placeBet(p, type, amount);
    render();
  }
}

function resolveBets() {
  const tie = playerTotal === bankerTotal;
  const playerWins = playerTotal > bankerTotal;
  winner = tie ? 'tie' : playerWins ? 'player' : 'banker';

  for (const p of players) {
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
    if (p.id === humanId) setBalance(p.chips);
    if (p.chips <= 0) p.chips = 10000;
    p.bets = { player: 0, banker: 0, tie: 0 };
  }
  updateChipDisplay(balanceEl, getBalance());
}

async function deal() {
  phase = 'dealing';
  messageEl.textContent = 'Dealing...';
  await delay(500);

  const dealt = dealBaccaratHands(shoe);
  playerHand = dealt.playerHand;
  bankerHand = dealt.bankerHand;
  playerTotal = dealt.pTotal;
  bankerTotal = dealt.bTotal;
  render();
  await delay(800);

  resolveBets();
  phase = 'results';
  render();
}

function newRound() {
  phase = 'betting';
  playerHand = []; bankerHand = [];
  playerTotal = bankerTotal = 0;
  winner = null;
  players.forEach(p => { p.bets = { player: 0, banker: 0, tie: 0 }; p.result = null; });
  render();
}

document.getElementById('bet-player-btn').onclick = async () => {
  const amt = parseInt(betInput.value, 10);
  if (placeBet(human(), 'player', amt)) { render(); await aiPlaceBets(); render(); }
};
document.getElementById('bet-banker-btn').onclick = async () => {
  const amt = parseInt(betInput.value, 10);
  if (placeBet(human(), 'banker', amt)) { render(); await aiPlaceBets(); render(); }
};
document.getElementById('bet-tie-btn').onclick = async () => {
  const amt = parseInt(betInput.value, 10);
  if (placeBet(human(), 'tie', amt)) { render(); await aiPlaceBets(); render(); }
};
dealBtn.onclick = () => deal();
newRoundBtn.onclick = () => newRound();

init();
