setupLobby('blackjack', () => {
  onState(renderBlackjackState);
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

function renderBlackjackState(state) {
  if (!state) return;
  renderCards(dealerCards, state.dealer.hand);

  const dealerHeader = document.getElementById('dealer-header');
  if (dealerHeader) {
    dealerHeader.innerHTML = buildDealerHeader(state.dealer.total);
  } else if (dealerScore) {
    dealerScore.textContent = state.dealer.total;
  }

  playersArea.innerHTML = '';
  for (const p of state.players) {
    const seat = document.createElement('div');
    seat.className = 'player-seat' + (p.isYou ? ' is-you' : '') + (state.currentTurn === p.id ? ' active-turn' : '');
    seat.innerHTML = buildSeatCard(p, {
      bet: p.bet ? `<div class="player-bet">Bet: ${formatMoney(p.bet)}</div>` : '',
      total: p.hand?.length ? `<div class="hand-total">Total: <strong>${p.total || 0}</strong></div>` : '',
      result: p.result ? `<span class="result-tag result-${p.result}">${p.result}</span>` : ''
    });
    playersArea.appendChild(seat);
    renderCards(seat.querySelector('.seat-cards'), p.hand);
  }

  const me = state.players.find(p => p.isYou);
  const phase = state.phase;

  if (phase === 'betting') {
    messageEl.textContent = me?.bet ? 'Waiting for other players...' : 'Place your bet.';
    betBtn.disabled = !!me?.bet;
    dealBtn.disabled = !me?.bet;
    hitBtn.disabled = standBtn.disabled = doubleBtn.disabled = true;
    newRoundBtn.disabled = true;
  } else if (phase === 'playing') {
    messageEl.textContent = state.yourTurn ? 'Your turn!' : `Waiting for ${state.players.find(p => p.id === state.currentTurn)?.name || 'player'}...`;
    betBtn.disabled = dealBtn.disabled = true;
    hitBtn.disabled = !state.yourTurn;
    standBtn.disabled = !state.yourTurn;
    doubleBtn.disabled = !state.yourTurn || (me?.hand?.length !== 2);
    newRoundBtn.disabled = true;
  } else if (phase === 'results' || phase === 'dealer') {
    messageEl.textContent = 'Round complete!';
    betBtn.disabled = dealBtn.disabled = hitBtn.disabled = standBtn.disabled = doubleBtn.disabled = true;
    newRoundBtn.disabled = false;
  }
}
