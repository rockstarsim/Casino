function formatMoney(amount) {
  return '$' + (amount || 0).toLocaleString('en-US');
}

const SUIT_FILES = { '♠': 'spades', '♥': 'hearts', '♦': 'diamonds', '♣': 'clubs' };

function cardImageSrc(card) {
  const suit = SUIT_FILES[card.suit];
  if (!suit) return 'img/cards/back.svg';
  return `img/cards/${card.rank}-${suit}.svg`;
}

function createCardElement(card) {
  const el = document.createElement('div');
  el.className = 'playing-card';
  if (card?.hidden) {
    el.classList.add('hidden');
    el.innerHTML = '<img class="card-img" src="img/cards/back.svg" alt="Hidden card" draggable="false">';
  } else if (card) {
    const src = cardImageSrc(card);
    el.innerHTML = `<img class="card-img" src="${src}" alt="${card.rank}${card.suit}" draggable="false">`;
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
