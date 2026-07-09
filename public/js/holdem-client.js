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

  playersArea.innerHTML = '';
  for (const p of state.players) {
    const seat = document.createElement('div');
    seat.className = 'holdem-seat' + (p.isYou ? ' is-you' : '') + (state.currentTurn === p.id ? ' active-turn' : '') + (p.folded ? ' folded' : '');
    seat.innerHTML = `
      <div class="player-name">${p.name}${p.isYou ? ' (You)' : ''}</div>
      <div class="player-chips">${formatMoney(p.chips)}</div>
      <div class="player-bet">${p.bet ? 'Bet: '+formatMoney(p.bet) : ''} ${p.lastAction || ''}</div>
      <div class="hole-cards" id="hole-${p.id}"></div>
      ${p.handName ? '<div style="color:var(--gold);font-size:0.8rem">'+p.handName+'</div>' : ''}
    `;
    playersArea.appendChild(seat);
    renderCards(seat.querySelector('.hole-cards'), p.hole);
  }

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
