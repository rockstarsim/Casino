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
  const charIndices = pickUniqueCharacterIndices(aiNames.length);
  players = [
    { id: humanId, name: 'You', chips: getBalance(), bet: 0, hand: [], status: 'waiting', isAi: false, isYou: true, result: null },
    ...aiNames.map((n, i) => ({
      id: uid(), name: n, chips: 10000, bet: 0, hand: [], status: 'waiting',
      isAi: true, result: null, characterIndex: charIndices[i]
    }))
  ];
  assignUniqueCharacters(players);
  updateChipDisplay(balanceEl, getBalance());
  render();
}

function human() { return players.find(p => p.id === humanId); }

function render() {
  const hideDealer = phase === 'playing';
  renderCards(dealerCards, hideDealer && dealer.hand.length ? [dealer.hand[0], { hidden: true }] : dealer.hand);
  const existingMap = new Map();
  playersArea.querySelectorAll('[data-player-id]').forEach(el => existingMap.set(el.dataset.playerId, el));

  players.forEach(p => {
    assignAvatarSeed(p);
    if (p.id === humanId) p.isYou = true;
    let seat = existingMap.get(p.id);
    if (!seat) {
      seat = document.createElement('div');
      seat.dataset.playerId = p.id;
      seat.innerHTML = `
        <div class="seat-header"></div>
        <div class="seat-bet"></div>
        <div class="card-row seat-cards"></div>
        <div class="seat-total"></div>
        <div class="seat-result"></div>`;
      playersArea.appendChild(seat);
    }
    seat.className = 'player-seat' + (p.id === humanId ? ' is-you' : '') + (currentTurn === p.id ? ' active-turn' : '') + (p.isAi ? ' ai-player' : '');
    seat.querySelector('.seat-header').innerHTML = buildPlayerHeader(p);
    syncPlayerAvatar(seat.querySelector('.seat-header'), p);
    seat.querySelector('.seat-bet').innerHTML = p.bet ? `<div class="player-bet">Bet: ${formatMoney(p.bet)}</div>` : '';
    const total = p.hand.length ? blackjackTotal(p.hand) : 0;
    seat.querySelector('.seat-total').innerHTML = p.hand.length ? `<div class="hand-total">Total: <strong>${total}</strong></div>` : '';
    seat.querySelector('.seat-result').innerHTML = p.result ? `<span class="result-tag result-${p.result}">${p.result}</span>` : '';
    renderCards(seat.querySelector('.seat-cards'), p.hand);
    existingMap.delete(p.id);
  });
  existingMap.forEach(el => el.remove());

  const dealerHeader = document.getElementById('dealer-header');
  if (dealerHeader) {
    const score = hideDealer ? '?' : (dealer.hand.length ? blackjackTotal(dealer.hand) : 0);
    dealerHeader.innerHTML = buildDealerHeader(score);
  } else if (dealerScore) {
    dealerScore.textContent = hideDealer ? '?' : (dealer.hand.length ? blackjackTotal(dealer.hand) : 0);
  }

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
    await delay(actionDelay());
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
      await delay(actionDelay());
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
  finishDealerAsync();
}

async function finishDealerAsync() {
  phase = 'results';
  render();
  while (blackjackTotal(dealer.hand) < 17) {
    await delay(actionDelay());
    dealer.hand.push(draw(shoe));
    render();
  }
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
