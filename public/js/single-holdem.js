const SMALL_BLIND = 25;
const BIG_BLIND = 50;
let shoe = newShoe();
let phase = 'lobby';
let players = [];
let community = [];
let pot = 0;
let currentBet = 0;
let currentTurn = null;
let dealerIndex = 0;
let round = null;
let winners = [];
let humanId = 'human';

const communityCards = document.getElementById('community-cards');
const potEl = document.getElementById('pot');
const roundInfo = document.getElementById('round-info');
const playersArea = document.getElementById('players-area');
const messageEl = document.getElementById('message');
const startBtn = document.getElementById('start-btn');
const foldBtn = document.getElementById('fold-btn');
const checkBtn = document.getElementById('check-btn');
const callBtn = document.getElementById('call-btn');
const raiseBtn = document.getElementById('raise-btn');
const allinBtn = document.getElementById('allin-btn');
const raiseInput = document.getElementById('raise-amount');
const balanceEl = document.getElementById('balance');

async function init() {
  await ensureBalanceReady();
  const balance = getBalance();
  const user = typeof fetchMe === 'function' ? await fetchMe() : null;
  const aiNames = pickAiNames(4);
  const charIndices = pickUniqueCharacterIndices(aiNames.length, user ? [user.characterIndex] : []);
  players = [
    {
      id: humanId, name: user?.displayName || 'You', chips: balance, hole: [], bet: 0, totalBet: 0,
      folded: false, status: 'waiting', isAi: false, lastAction: null,
      characterIndex: user?.characterIndex
    },
    ...aiNames.map((n, i) => ({
      id: uid(), name: n, chips: 10000, hole: [], bet: 0, totalBet: 0, folded: false,
      status: 'waiting', isAi: true, lastAction: null, characterIndex: charIndices[i]
    }))
  ];
  assignUniqueCharacters(players);
  updateChipDisplay(balanceEl, getBalance());
  render();
}

function human() { return players.find(p => p.id === humanId); }
function inHand() { return players.filter(p => p.status !== 'waiting' && !p.folded); }
function allInActive() { return players.some(p => p.lastAction === 'allin' && !p.folded); }

function needsToAct(p) {
  if (p.folded || p.status !== 'active') return false;
  if (p.chips === 0) return false;
  return p.lastAction === null || p.bet < currentBet;
}

function nextBetter(fromIdx) {
  const n = players.length;
  for (let i = 1; i <= n; i++) {
    const idx = (fromIdx + i) % n;
    if (needsToAct(players[idx])) return players[idx].id;
  }
  return null;
}

function bettingComplete() {
  const active = inHand();
  if (active.length <= 1) return true;
  return active.every(p => {
    if (p.chips === 0) return p.lastAction !== null;
    return p.bet === currentBet && p.lastAction !== null;
  });
}

function aiThinkDelay() {
  return actionDelay();
}

function render() {
  const showHoles = phase === 'showdown' || phase === 'results';
  renderCards(communityCards, community);
  potEl.textContent = formatMoney(pot);
  roundInfo.textContent = round ? round.toUpperCase() : phase;

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
        <div class="player-bet seat-bet"></div>
        <div class="hole-cards"></div>
        <div class="hand-name seat-hand"></div>`;
      playersArea.appendChild(seat);
    }
    seat.className = 'holdem-seat' + (p.id === humanId ? ' is-you' : '') + (currentTurn === p.id ? ' active-turn' : '') + (p.folded ? ' folded' : '') + (p.isAi ? ' ai-player' : '');
    seat.querySelector('.seat-header').innerHTML = buildPlayerHeader(p);
    syncPlayerAvatar(seat.querySelector('.seat-header'), p);
    seat.querySelector('.seat-bet').innerHTML = `${p.bet ? 'Bet: ' + formatMoney(p.bet) : ''}${p.lastAction ? ` <span class="action-tag">${p.lastAction}</span>` : ''}`;
    const handName = showHoles && p.hole.length && community.length >= 3 ? bestHoldemHand(p.hole, community)?.name : '';
    const handEl = seat.querySelector('.seat-hand');
    handEl.textContent = handName || '';
    handEl.style.display = handName ? '' : 'none';
    const holes = (p.id === humanId || showHoles) ? p.hole : p.hole.map(() => ({ hidden: true }));
    renderCards(seat.querySelector('.hole-cards'), holes);
    existingMap.delete(p.id);
  });

  existingMap.forEach(el => el.remove());

  const me = human();
  const canAct = currentTurn === humanId && phase === 'betting';
  const toCall = currentBet - (me?.bet || 0);

  if (phase === 'lobby' || phase === 'results') {
    messageEl.textContent = 'Ready for next hand.';
    startBtn.disabled = false;
  } else if (phase === 'betting') {
    messageEl.textContent = canAct ? `Your turn. Call: ${formatMoney(toCall)}` : `${players.find(p => p.id === currentTurn)?.name} is thinking...`;
    startBtn.disabled = true;
  } else if (phase === 'showdown' || phase === 'results') {
    messageEl.textContent = winners.map(w => `${w.name} wins ${formatMoney(w.amount)}`).join(' · ') || 'Hand over.';
  }

  foldBtn.disabled = !canAct;
  checkBtn.disabled = !canAct || me.bet < currentBet;
  callBtn.disabled = !canAct;
  raiseBtn.disabled = !canAct;
  raiseInput.disabled = !canAct;
  allinBtn.disabled = !canAct;
}

function postBlind(idx, amount) {
  const p = players[idx];
  const pay = Math.min(amount, p.chips);
  p.chips -= pay; p.bet = pay; p.totalBet = pay; pot += pay;
}

function startHand() {
  community = []; pot = 0; currentBet = 0; winners = []; round = 'preflop';
  players.forEach(p => {
    p.hole = []; p.bet = 0; p.totalBet = 0; p.folded = false; p.status = 'active'; p.lastAction = null;
    if (p.chips <= 0) p.chips = 10000;
  });
  dealerIndex = dealerIndex % players.length;
  const sb = (dealerIndex + 1) % players.length;
  const bb = (dealerIndex + 2) % players.length;
  players.forEach(p => { p.hole = [draw(shoe), draw(shoe)]; });
  postBlind(sb, SMALL_BLIND);
  postBlind(bb, BIG_BLIND);
  currentBet = BIG_BLIND;
  phase = 'betting';
  currentTurn = nextBetter(bb);
  render();
  processTurn();
}

function doAction(p, action, raiseAmount) {
  if (action === 'fold') { p.folded = true; p.lastAction = 'fold'; }
  else if (action === 'check') { p.lastAction = 'check'; }
  else if (action === 'call') {
    const pay = Math.min(currentBet - p.bet, p.chips);
    p.chips -= pay; p.bet += pay; p.totalBet += pay; pot += pay;
    p.lastAction = p.chips === 0 ? 'allin' : 'call';
  } else if (action === 'raise') {
    const raiseTo = Math.max(currentBet + BIG_BLIND, raiseAmount);
    const pay = raiseTo - p.bet;
    if (pay > p.chips) return false;
    p.chips -= pay; pot += pay; p.totalBet += pay; p.bet = raiseTo;
    currentBet = raiseTo;
    players.forEach(o => { if (o.id !== p.id && !o.folded && o.chips > 0) o.lastAction = null; });
    p.lastAction = p.chips === 0 ? 'allin' : 'raise';
  } else if (action === 'allin') {
    pot += p.chips; p.bet += p.chips; p.totalBet += p.chips;
    if (p.bet > currentBet) {
      currentBet = p.bet;
      players.forEach(o => { if (o.id !== p.id && !o.folded && o.chips > 0) o.lastAction = null; });
    }
    p.chips = 0; p.lastAction = 'allin';
  }
  if (p.id === humanId) setBalance(p.chips);
  return true;
}

async function advanceRound() {
  players.forEach(p => { p.bet = 0; p.lastAction = null; });
  currentBet = 0;
  const remaining = inHand();
  if (remaining.length === 1) {
    const w = remaining[0];
    w.chips += pot;
    winners = [{ name: w.name, amount: pot }];
    phase = 'results';
    dealerIndex = (dealerIndex + 1) % players.length;
    if (w.id === humanId) setBalance(w.chips);
    updateChipDisplay(balanceEl, getBalance());
    render();
    return;
  }
  if (round === 'preflop') { community.push(draw(shoe), draw(shoe), draw(shoe)); round = 'flop'; }
  else if (round === 'flop') { community.push(draw(shoe)); round = 'turn'; }
  else if (round === 'turn') { community.push(draw(shoe)); round = 'river'; }
  else if (round === 'river') { return showdown(); }
  await delay(actionDelay());
  currentTurn = nextBetter(dealerIndex);
  if (!currentTurn) await advanceRound();
  else { render(); processTurn(); }
}

function showdown() {
  phase = 'showdown';
  const remaining = inHand();
  const evals = remaining.map(p => ({ player: p, hand: bestHoldemHand(p.hole, community) }));
  evals.sort((a, b) => compareHands(b.hand, a.hand));
  const best = evals[0].hand;
  const wins = evals.filter(e => compareHands(e.hand, best) === 0);
  const share = Math.floor(pot / wins.length);
  winners = wins.map(w => { w.player.chips += share; return { name: w.player.name, amount: share, hand: w.hand.name }; });
  phase = 'results';
  dealerIndex = (dealerIndex + 1) % players.length;
  const me = human();
  if (me) setBalance(me.chips);
  updateChipDisplay(balanceEl, getBalance());
  render();
}

async function processTurn() {
  while (currentTurn && phase === 'betting') {
    const p = players.find(x => x.id === currentTurn);
    if (!p || !needsToAct(p)) {
      if (bettingComplete()) { await advanceRound(); break; }
      const idx = players.findIndex(x => x.id === currentTurn);
      currentTurn = nextBetter(idx);
      if (!currentTurn) { await advanceRound(); break; }
      continue;
    }
    render();
    if (p.isAi) {
      await delay(aiThinkDelay());
      const ctx = { currentBet, pot, community, allInActive: allInActive() };
      let action = aiHoldemAction(p, ctx);
      if (action === 'raise' && allInActive()) action = p.bet < currentBet ? 'call' : 'check';
      if (action === 'raise') {
        const raiseTo = currentBet + BIG_BLIND + Math.floor(Math.random() * 100);
        if (!doAction(p, 'raise', raiseTo)) doAction(p, 'call');
      } else if (action === 'check' && p.bet < currentBet) doAction(p, 'call');
      else doAction(p, action);
    } else return;
    const idx = players.findIndex(x => x.id === currentTurn);
    if (bettingComplete()) { await advanceRound(); break; }
    currentTurn = nextBetter(idx);
    if (!currentTurn) { await advanceRound(); break; }
  }
}

async function humanAction(action) {
  const p = human();
  if (!p || currentTurn !== humanId) return;
  if (action === 'raise') {
    if (!doAction(p, 'raise', parseInt(raiseInput.value, 10))) return;
  } else doAction(p, action);
  const idx = players.findIndex(x => x.id === humanId);
  if (bettingComplete()) await advanceRound();
  else { currentTurn = nextBetter(idx); processTurn(); }
}

startBtn.onclick = () => startHand();
foldBtn.onclick = () => humanAction('fold');
checkBtn.onclick = () => humanAction('check');
callBtn.onclick = () => humanAction('call');
raiseBtn.onclick = () => humanAction('raise');
allinBtn.onclick = () => humanAction('allin');

init();
