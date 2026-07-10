const BALANCE_KEY = 'casino_balance';
const STARTING_BALANCE = 10000;

let cachedBalance = null;
let balanceReady = false;
let balanceReadyPromise = null;

function readLocalBalance() {
  const stored = localStorage.getItem(BALANCE_KEY);
  return stored !== null ? parseInt(stored, 10) : STARTING_BALANCE;
}

function writeLocalBalance(amount) {
  localStorage.setItem(BALANCE_KEY, String(Math.max(0, Math.floor(amount))));
}

async function ensureBalanceReady() {
  if (balanceReady) return;
  if (!balanceReadyPromise) balanceReadyPromise = initAccountBalance();
  await balanceReadyPromise;
}

async function initAccountBalance() {
  if (typeof fetchMe !== 'function') {
    cachedBalance = readLocalBalance();
    balanceReady = true;
    return cachedBalance;
  }
  const user = await fetchMe();
  if (user) {
    cachedBalance = user.balance;
    writeLocalBalance(user.balance);
  } else {
    cachedBalance = readLocalBalance();
  }
  balanceReady = true;
  return cachedBalance;
}

function getBalance() {
  if (cachedBalance !== null) return cachedBalance;
  return readLocalBalance();
}

function setBalance(amount) {
  const value = Math.max(0, Math.floor(amount));
  cachedBalance = value;
  writeLocalBalance(value);
  if (typeof syncBalanceToAccount === 'function') syncBalanceToAccount(value);
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
