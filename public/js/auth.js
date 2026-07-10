const TOKEN_KEY = 'barona_token';
const SESSION_ROOM = 'barona_room';
const SESSION_PLAYER = 'barona_player';
const PLAYER_ID_PREFIX = 'barona_player_';

let cachedUser = null;
let balanceSyncTimer = null;

function getToken() {
  return localStorage.getItem(TOKEN_KEY) || '';
}

function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
  cachedUser = null;
}

function saveSession(playerId, roomCode) {
  if (playerId) localStorage.setItem(SESSION_PLAYER, playerId);
  if (roomCode) localStorage.setItem(SESSION_ROOM, roomCode);
  if (roomCode && playerId) localStorage.setItem(PLAYER_ID_PREFIX + roomCode, playerId);
}

function getSavedSession() {
  const roomCode = localStorage.getItem(SESSION_ROOM) || '';
  const playerId = localStorage.getItem(SESSION_PLAYER)
    || (roomCode ? localStorage.getItem(PLAYER_ID_PREFIX + roomCode) : '')
    || '';
  return { playerId, roomCode };
}

function clearSession() {
  const roomCode = localStorage.getItem(SESSION_ROOM) || '';
  localStorage.removeItem(SESSION_PLAYER);
  localStorage.removeItem(SESSION_ROOM);
  if (roomCode) localStorage.removeItem(PLAYER_ID_PREFIX + roomCode);
}

async function authApi(body) {
  const res = await fetch('/api/auth', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(getToken() ? { Authorization: 'Bearer ' + getToken() } : {})
    },
    body: JSON.stringify(body)
  });
  return res.json();
}

async function fetchMe(force) {
  const token = getToken();
  if (!token) { cachedUser = null; return null; }
  if (!force && cachedUser) return cachedUser;
  try {
    const res = await fetch('/api/auth', {
      headers: { Authorization: 'Bearer ' + token }
    });
    if (res.status === 401) { setToken(''); cachedUser = null; return null; }
    if (!res.ok) return cachedUser;
    const data = await res.json();
    cachedUser = data.user || null;
    return cachedUser;
  } catch {
    return cachedUser;
  }
}

async function registerAccount({ username, password, displayName, characterIndex }) {
  const result = await authApi({ action: 'register', username, password, displayName, characterIndex });
  if (result.token) {
    setToken(result.token);
    cachedUser = result.user || null;
    if (cachedUser && typeof setBalance === 'function') setBalance(cachedUser.balance);
  }
  return result;
}

async function loginAccount({ username, password }) {
  const result = await authApi({ action: 'login', username, password });
  if (result.token) {
    setToken(result.token);
    cachedUser = result.user || null;
    if (cachedUser && typeof setBalance === 'function') setBalance(cachedUser.balance);
  }
  return result;
}

async function logoutAccount() {
  await authApi({ action: 'logout' });
  setToken('');
  cachedUser = null;
  clearSession();
}

function authHeaders() {
  const token = getToken();
  return token ? { Authorization: 'Bearer ' + token } : {};
}

async function syncBalanceToAccount(amount) {
  const token = getToken();
  if (!token) return;
  clearTimeout(balanceSyncTimer);
  balanceSyncTimer = setTimeout(async () => {
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ action: 'updateBalance', balance: amount })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          cachedUser = data.user;
          if (typeof updateHeaderAccount === 'function') updateHeaderAccount(data.user);
        }
      }
    } catch { /* retry on next change */ }
  }, 400);
}

async function updateHeaderAccount(user) {
  const el = document.getElementById('account-chip');
  if (!el) return;
  const u = user || await fetchMe();
  if (u) {
    el.innerHTML = `<span class="chip-label">${u.displayName}</span><span class="chip-amount">${formatMoney(u.balance)}</span>`;
    el.href = 'account.html';
  } else {
    el.innerHTML = '<span class="chip-label">Guest</span><span class="chip-amount">Log in</span>';
    el.href = 'login.html';
  }
}

document.addEventListener('DOMContentLoaded', () => updateHeaderAccount());
