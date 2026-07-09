function formatMoney(amount) {
  return '$' + (amount || 0).toLocaleString('en-US');
}

function cardKey(card) {
  if (card?.hidden) return 'hidden';
  if (!card) return '';
  return `${card.rank}${card.suit}`;
}

function createCardElement(card) {
  const el = document.createElement('div');
  el.dataset.cardKey = cardKey(card);
  if (card?.hidden) {
    el.className = 'playing-card hidden';
    el.innerHTML = '<div class="card-back"></div>';
  } else if (card) {
    const suitClass = card.red ? 'red' : 'black';
    el.className = 'playing-card ' + suitClass;
    el.innerHTML = `
      <span class="card-corner top">
        <span class="card-rank">${card.rank}</span>
        <span class="card-suit">${card.suit}</span>
      </span>
      <span class="card-center"><span class="card-suit">${card.suit}</span></span>
      <span class="card-corner bottom">
        <span class="card-rank">${card.rank}</span>
        <span class="card-suit">${card.suit}</span>
      </span>`;
  }
  return el;
}

function renderCards(container, cards) {
  if (!container) return;
  cards = cards || [];

  while (container.children.length > cards.length) {
    container.removeChild(container.lastChild);
  }

  cards.forEach((card, i) => {
    const key = cardKey(card);
    const existing = container.children[i];
    if (existing && existing.dataset.cardKey === key) return;

    const el = createCardElement(card);
    if (existing) container.replaceChild(el, existing);
    else container.appendChild(el);
  });
}

function getPlayerName() {
  return localStorage.getItem('casino_player_name') || '';
}

function savePlayerName(name) {
  localStorage.setItem('casino_player_name', name);
}
