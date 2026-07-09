setupLobby('holdem', () => {
  onState(render);
});

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

startBtn.onclick = () => emit('holdem-start', {}, (res) => { if (res.error) messageEl.textContent = res.error; });
foldBtn.onclick = () => emit('holdem-action', { action: 'fold' });
checkBtn.onclick = () => emit('holdem-action', { action: 'check' });
callBtn.onclick = () => emit('holdem-action', { action: 'call' });
raiseBtn.onclick = () => emit('holdem-action', { action: 'raise', amount: parseInt(raiseInput.value, 10) });
allinBtn.onclick = () => emit('holdem-action', { action: 'allin' });

function render(state) {
  if (!state) return;

  renderCards(communityCards, state.community);
  potEl.textContent = formatMoney(state.pot);
  roundInfo.textContent = state.round ? state.round.toUpperCase() : state.phase;

  const existingMap = new Map();
  playersArea.querySelectorAll('[data-player-id]').forEach(el => existingMap.set(el.dataset.playerId, el));

  for (const p of state.players) {
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
    seat.className = 'holdem-seat' + (p.isYou ? ' is-you' : '') + (state.currentTurn === p.id ? ' active-turn' : '') + (p.folded ? ' folded' : '');
    seat.querySelector('.seat-header').innerHTML = buildPlayerHeader(p);
    syncPlayerAvatar(seat.querySelector('.seat-header'), p);
    seat.querySelector('.seat-bet').innerHTML = `${p.bet ? 'Bet: ' + formatMoney(p.bet) : ''}${p.lastAction ? ` <span class="action-tag">${p.lastAction}</span>` : ''}`;
    const handEl = seat.querySelector('.seat-hand');
    handEl.textContent = p.handName || '';
    handEl.style.display = p.handName ? '' : 'none';
    renderCards(seat.querySelector('.hole-cards'), p.hole);
    existingMap.delete(p.id);
  }
  existingMap.forEach(el => el.remove());

  const me = state.players.find(p => p.isYou);
  const canAct = state.yourTurn && state.phase === 'betting';

  if (state.phase === 'lobby' || state.phase === 'results') {
    messageEl.textContent = state.players.length < 2 ? 'Need 2+ players to start.' : 'Ready to deal!';
    startBtn.disabled = state.players.length < 2;
  } else if (state.phase === 'betting') {
    const toCall = state.currentBet - (me?.bet || 0);
    messageEl.textContent = state.yourTurn ? `Your turn. Call: ${formatMoney(toCall)}` : 'Waiting...';
    startBtn.disabled = true;
  } else if (state.phase === 'showdown' || state.phase === 'results') {
    messageEl.textContent = state.winners?.map(w => `${w.name} wins ${formatMoney(w.amount)} (${w.hand || w.reason})`).join(' · ') || 'Hand over.';
    startBtn.disabled = state.players.length < 2;
  }

  foldBtn.disabled = !canAct;
  checkBtn.disabled = !canAct || (me && me.bet < state.currentBet);
  callBtn.disabled = !canAct;
  raiseBtn.disabled = !canAct;
  raiseInput.disabled = !canAct;
  allinBtn.disabled = !canAct;

  if (state.phase === 'results') startBtn.disabled = false;
}
