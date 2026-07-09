const BALANCE_KEY = 'casino_balance';
const STARTING_BALANCE = 10000;

function getBalance() {
  const stored = localStorage.getItem(BALANCE_KEY);
  return stored !== null ? parseInt(stored, 10) : STARTING_BALANCE;
}

function setBalance(amount) {
  const value = Math.max(0, Math.floor(amount));
  localStorage.setItem(BALANCE_KEY, value.toString());
  return value;
}

function formatMoney(amount) {
  return '$' + (amount || 0).toLocaleString('en-US');
}

function uid() {
  return 'p-' + Math.random().toString(36).slice(2, 10);
}

function updateChipDisplay(el, amount) {
  if (el) el.textContent = formatMoney(amount);
}

function markAi(seat, isAi) {
  if (isAi) seat.classList.add('ai-player');
}
