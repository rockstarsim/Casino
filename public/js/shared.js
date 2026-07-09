function formatMoney(amount) {
  return '$' + (amount || 0).toLocaleString('en-US');
}

function createCardElement(card) {
  const el = document.createElement('div');
  if (card?.hidden) {
    el.className = 'playing-card hidden';
    el.innerHTML = '<div class="card-back"></div>';
  } else if (card) {
    const suitClass = card.red ? 'red' : 'black';
    el.className = 'playing-card ' + suitClass;
    el.innerHTML = `
      <span class="card-corner top">${card.rank}<span class="card-suit">${card.suit}</span></span>
      <span class="card-suit center">${card.suit}</span>
      <span class="card-corner bottom">${card.rank}<span class="card-suit">${card.suit}</span></span>`;
  }
  return el;
}

function renderCards(container, cards) {
  if (!container) return;
  container.innerHTML = '';
  (cards || []).forEach(card => container.appendChild(createCardElement(card)));
}

function getPlayerName() {
  return localStorage.getItem('casino_player_name') || '';
}

function savePlayerName(name) {
  localStorage.setItem('casino_player_name', name);
}
