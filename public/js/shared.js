function formatMoney(amount) {
  return '$' + (amount || 0).toLocaleString('en-US');
}

function createCardElement(card) {
  const el = document.createElement('div');
  if (card?.hidden) {
    el.className = 'playing-card hidden';
    el.innerHTML = '<div class="card-back"></div>';
  } else if (card) {
    el.className = 'playing-card' + (card.red ? ' red' : '');
    el.innerHTML = `<span class="card-rank">${card.rank}</span><span class="card-suit">${card.suit}</span>`;
  }
  return el;
}

function renderCards(container, cards) {
  container.innerHTML = '';
  (cards || []).forEach(card => container.appendChild(createCardElement(card)));
}

function getPlayerName() {
  return localStorage.getItem('casino_player_name') || '';
}

function savePlayerName(name) {
  localStorage.setItem('casino_player_name', name);
}
