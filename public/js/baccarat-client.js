setupLobby('baccarat', () => {
  onState(render);
});

const playerCards = document.getElementById('bac-player-cards');
const bankerCards = document.getElementById('bac-banker-cards');
const playerTotal = document.getElementById('player-total');
const bankerTotal = document.getElementById('banker-total');
const playersArea = document.getElementById('players-area');
const messageEl = document.getElementById('message');
const betInput = document.getElementById('bet-amount');
const dealBtn = document.getElementById('deal-btn');
const newRoundBtn = document.getElementById('new-round-btn');

document.getElementById('bet-player-btn').onclick = () => placeBet('player');
document.getElementById('bet-banker-btn').onclick = () => placeBet('banker');
document.getElementById('bet-tie-btn').onclick = () => placeBet('tie');
dealBtn.onclick = () => emit('bac-deal', {}, (res) => { if (res.error) messageEl.textContent = res.error; });
newRoundBtn.onclick = () => emit('bac-new-round');

function placeBet(type) {
  const amount = parseInt(betInput.value, 10);
  emit('bac-bet', { type, amount }, (res) => {
    if (res.error) messageEl.textContent = res.error;
  });
}

function render(state) {
  if (!state) return;

  renderCards(playerCards, state.playerHand);
  renderCards(bankerCards, state.bankerHand);
  playerTotal.textContent = state.playerTotal;
  bankerTotal.textContent = state.bankerTotal;

  playersArea.innerHTML = state.players.map(p => buildPlayerRow(p)).join('');

  if (state.phase === 'betting') {
    messageEl.textContent = 'Place bets on Player, Banker, or Tie.';
    dealBtn.disabled = false;
    newRoundBtn.disabled = true;
  } else if (state.phase === 'results') {
    messageEl.textContent = `Winner: ${state.winner?.toUpperCase() || '—'} (${state.playerTotal} vs ${state.bankerTotal})`;
    dealBtn.disabled = true;
    newRoundBtn.disabled = false;
  } else {
    messageEl.textContent = 'Dealing...';
    dealBtn.disabled = true;
    newRoundBtn.disabled = true;
  }
}
