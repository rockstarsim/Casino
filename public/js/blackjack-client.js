setupLobby('blackjack', () => {
  onState(render);
});

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

betBtn.onclick = () => {
  const amount = parseInt(betInput.value, 10);
  emit('bj-bet', { amount }, (res) => {
    if (res.error) messageEl.textContent = res.error;
  });
};

dealBtn.onclick = () => emit('bj-deal', {}, (res) => { if (res.error) messageEl.textContent = res.error; });
hitBtn.onclick = () => emit('bj-hit');
standBtn.onclick = () => emit('bj-stand');
doubleBtn.onclick = () => emit('bj-double');
newRoundBtn.onclick = () => emit('bj-new-round');

function render(state) {
  if (!state) return;

  renderCards(dealerCards, state.dealer.hand);
  dealerScore.textContent = state.dealer.total;

  playersArea.innerHTML = '';
  for (const p of state.players) {
    const seat = document.createElement('div');
    seat.className = 'player-seat' + (p.isYou ? ' is-you' : '') + (state.currentTurn === p.id ? ' active-turn' : '');
    seat.innerHTML = `
      <div class="player-name">${p.name}${p.isYou ? ' (You)' : ''}</div>
      <div class="player-chips">${formatMoney(p.chips)}</div>
      <div class="player-bet">${p.bet ? 'Bet: ' + formatMoney(p.bet) : ''}</div>
      <div class="card-row" id="seat-${p.id}"></div>
      <div>Total: ${p.total || 0} ${p.result ? `<span class="result-${p.result}">${p.result}</span>` : ''}</div>
    `;
    playersArea.appendChild(seat);
    renderCards(seat.querySelector('.card-row'), p.hand);
  }

  const me = state.players.find(p => p.isYou);
  const phase = state.phase;

  if (phase === 'betting') {
    messageEl.textContent = me?.bet ? 'Waiting for other bets...' : 'Place your bet.';
    betBtn.disabled = !!me?.bet;
    dealBtn.disabled = !me?.bet;
    hitBtn.disabled = true; standBtn.disabled = true; doubleBtn.disabled = true;
    newRoundBtn.disabled = true;
  } else if (phase === 'playing') {
    messageEl.textContent = state.yourTurn ? 'Your turn!' : `Waiting for ${state.players.find(p => p.id === state.currentTurn)?.name || 'player'}...`;
    betBtn.disabled = true; dealBtn.disabled = true;
    hitBtn.disabled = !state.yourTurn;
    standBtn.disabled = !state.yourTurn;
    doubleBtn.disabled = !state.yourTurn || (me?.hand?.length !== 2);
    newRoundBtn.disabled = true;
  } else if (phase === 'results' || phase === 'dealer') {
    messageEl.textContent = 'Round complete!';
    betBtn.disabled = true; dealBtn.disabled = true;
    hitBtn.disabled = true; standBtn.disabled = true; doubleBtn.disabled = true;
    newRoundBtn.disabled = false;
  }
}
