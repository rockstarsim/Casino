let shoe = newShoe();
let phase = 'betting';
let dealer = { hand: [] };
let players = [];
let currentTurn = null;
let humanId = 'human';

const dealerCards = document.getElementById('dealer-cards');
const dealerScore = document.getElementById('dealer-score');
const playersArea = document.getElementById('players-area');
const messageEl = document.getElementById('message');
const betBtn = document.getElementById('bet-btn');
const dealBtn = document.getElementById('deal-btn');
const hitBtn = document.getElementById('hit-btn');
const standBtn = document.getElementById('stand-btn');
const doubleBtn = document.getElementById('double-btn');
const newRoundBtn = document.getElementById('new-round-btn');
const betInput = document.getElementById('bet-amount');
const balanceEl = document.getElementById('balance');

function init() {
  const aiNames = pickAiNames(3);
  players = [
    { id: humanId, name: 'You', chips: getBalance(), bet: 0, hand: [], status: 'waiting', isAi: false, result: null },
    ...aiNames.map(n => ({ id: uid(), name: n, chips: 10000, bet: 0, hand: [], status: 'waiting', isAi: true, result: null }))
  ];
  updateChipDisplay(balanceEl, getBalance());
  render();
}

function human() { return players.find(p => p.id === humanId); }

function render() {
  const hideDealer = phase === 'playing';
  renderCards(dealerCards, hideDealer && dealer.hand.length ? [dealer.hand[0], { hidden: true }] : dealer.hand);
  dealerScore.textContent = hideDealer ? '?' : (dealer.hand.length ? blackjackTotal(dealer.hand) : 0);

  playersArea.innerHTML = '';
  players.forEach(p => {
    const seat = document.createElement('div');
    seat.className = 'player-seat' + (p.id === humanId ? ' is-you' : '') + (currentTurn === p.id ? ' active-turn' : '');
    if (p.isAi) seat.classList.add('ai-player');
    seat.innerHTML = `
      <div class="player-name">${p.name}${p.isAi ? ' 🤖' : ''}</div>
      <div class="player-chips">${formatMoney(p.chips)}</div>
      <div class="player-bet">${p.bet ? 'Bet: ' + formatMoney(p.bet) : ''}</div>
      <div class="card-row"></div>
      <div>Total: ${p.hand.length ? blackjackTotal(p.hand) : 0} ${p.result ? `<span class="result-${p.result}">${p.result}</span>` : ''}</div>
    `;
    playersArea.appendChild(seat);
    renderCards(seat.querySelector('.card-row'), p.hand);
  });

  const me = human();
  if (phase === 'betting') {
    messageEl.textContent = me.bet ? 'AI players betting...' : 'Place your bet.';
    betBtn.disabled = !!me.bet;
    dealBtn.disabled = true;
    hitBtn.disabled = standBtn.disabled = doubleBtn.disabled = true;
    newRoundBtn.disabled = true;
  } else if (phase === 'playing') {
    messageEl.textContent = currentTurn === humanId ? 'Your turn!' : `${players.find(p => p.id === currentTurn)?.name} is thinking...`;
    betBtn.disabled = dealBtn.disabled = true;
    const myTurn = currentTurn === humanId;
    hitBtn.disabled = !myTurn;
    standBtn.disabled = !myTurn;
    doubleBtn.disabled = !myTurn || me.hand.length !== 2 || me.bet > me.chips;
    newRoundBtn.disabled = true;
  } else {
    messageEl.textContent = 'Round complete!';
    betBtn.disabled = dealBtn.disabled = hitBtn.disabled = standBtn.disabled = doubleBtn.disabled = true;
    newRoundBtn.disabled = false;
  }
}

function allBetsPlaced() { return players.every(p => p.bet > 0); }

async function aiPlaceBets() {
  for (const p of players.filter(x => x.isAi)) {
    await delay(400 + Math.random() * 400);
    const bet = aiBetAmount(p.chips);
    p.bet = bet;
    p.chips -= bet;
    p.status = 'ready';
    render();
  }
}

function startDeal() {
  phase = 'playing';
  dealer.hand = [];
  for (const p of players) {
    p.hand = [draw(shoe), draw(shoe)];
    p.status = 'playing';
    if (blackjackTotal(p.hand) === 21) p.status = 'blackjack';
  }
  dealer.hand = [draw(shoe), draw(shoe)];
  const active = players.filter(p => p.status === 'playing');
  currentTurn = active.length ? active[0].id : null;
  render();
  if (!active.length) finishDealer();
  else processTurn();
}

function nextTurn() {
  const idx = players.findIndex(p => p.id === currentTurn);
  for (let i = idx + 1; i < players.length; i++) {
    if (players[i].status === 'playing') { currentTurn = players[i].id; return true; }
  }
  currentTurn = null;
  return false;
}

async function processTurn() {
  while (currentTurn) {
    const p = players.find(x => x.id === currentTurn);
    render();
    if (p.isAi) {
      await delay(600 + Math.random() * 800);
      const action = aiBlackjackAction(p, shoe);
      if (action === 'hit') doHit(p);
      else if (action === 'double' && p.hand.length === 2 && p.bet <= p.chips) doDouble(p);
      else doStand(p);
    } else return;
  }
  finishDealer();
}

function doHit(p) {
  p.hand.push(draw(shoe));
  const t = blackjackTotal(p.hand);
  if (t > 21) { p.status = 'bust'; if (!nextTurn()) finishDealer(); else processTurn(); }
  else if (t === 21) { p.status = 'stand'; if (!nextTurn()) finishDealer(); else processTurn(); }
  else if (p.id === humanId) render();
}

function doStand(p) {
  p.status = 'stand';
  if (!nextTurn()) finishDealer();
  else processTurn();
}

function doDouble(p) {
  p.chips -= p.bet;
  p.bet *= 2;
  p.hand.push(draw(shoe));
  p.status = blackjackTotal(p.hand) > 21 ? 'bust' : 'stand';
  if (!nextTurn()) finishDealer();
  else processTurn();
}

function finishDealer() {
  phase = 'results';
  while (blackjackTotal(dealer.hand) < 17) dealer.hand.push(draw(shoe));
  const dt = blackjackTotal(dealer.hand);
  const dealerBust = dt > 21;
  const dealerBJ = dealer.hand.length === 2 && dt === 21;

  for (const p of players) {
    const pt = blackjackTotal(p.hand);
    if (p.status === 'bust') { p.result = 'lose'; continue; }
    if (p.status === 'blackjack' && !dealerBJ) { p.chips += p.bet + Math.floor(p.bet * 1.5); p.result = 'blackjack'; }
    else if (dealerBJ && p.status !== 'blackjack') { p.result = 'lose'; }
    else if (dealerBJ) { p.chips += p.bet; p.result = 'push'; }
    else if (dealerBust) { p.chips += p.bet * 2; p.result = 'win'; }
    else if (pt > dt) { p.chips += p.bet * 2; p.result = 'win'; }
    else if (pt < dt) { p.result = 'lose'; }
    else { p.chips += p.bet; p.result = 'push'; }
    if (p.id === humanId) setBalance(p.chips);
    if (p.chips <= 0) p.chips = 10000;
  }
  updateChipDisplay(balanceEl, getBalance());
  currentTurn = null;
  render();
}

function newRound() {
  phase = 'betting';
  dealer.hand = [];
  currentTurn = null;
  players.forEach(p => { p.bet = 0; p.hand = []; p.status = 'waiting'; p.result = null; });
  render();
}

betBtn.onclick = async () => {
  const me = human();
  const amount = parseInt(betInput.value, 10);
  if (!amount || amount < 10 || amount > me.chips) { messageEl.textContent = 'Invalid bet.'; return; }
  me.bet = amount;
  me.chips -= amount;
  me.status = 'ready';
  setBalance(me.chips);
  render();
  await aiPlaceBets();
  if (allBetsPlaced()) { dealBtn.disabled = false; messageEl.textContent = 'Ready to deal!'; }
};

dealBtn.onclick = () => startDeal();
hitBtn.onclick = () => { doHit(human()); if (currentTurn) processTurn(); };
standBtn.onclick = () => { doStand(human()); processTurn(); };
doubleBtn.onclick = () => { doDouble(human()); processTurn(); };
newRoundBtn.onclick = () => newRound();

init();
