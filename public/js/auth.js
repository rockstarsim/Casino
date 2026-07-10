const TOKEN_KEY = 'barona_token';
const SESSION_ROOM = 'barona_room';
const SESSION_PLAYER = 'barona_player';

function getToken() {
  return localStorage.getItem(TOKEN_KEY) || '';
}

function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

function saveSession(playerId, roomCode) {
  if (playerId) sessionStorage.setItem(SESSION_PLAYER, playerId);
  if (roomCode) sessionStorage.setItem(SESSION_ROOM, roomCode);
}

function getSavedSession() {
  return {
    playerId: sessionStorage.getItem(SESSION_PLAYER) || '',
    roomCode: sessionStorage.getItem(SESSION_ROOM) || ''
  };
}

function clearSession() {
  sessionStorage.removeItem(SESSION_PLAYER);
  sessionStorage.removeItem(SESSION_ROOM);
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

async function fetchMe() {
  const token = getToken();
  if (!token) return null;
  try {
    const res = await fetch('/api/auth', {
      headers: { Authorization: 'Bearer ' + token }
    });
    if (!res.ok) { setToken(''); return null; }
    const data = await res.json();
    return data.user || null;
  } catch {
    return null;
  }
}

async function registerAccount({ username, password, displayName, characterIndex }) {
  const result = await authApi({ action: 'register', username, password, displayName, characterIndex });
  if (result.token) setToken(result.token);
  return result;
}

async function loginAccount({ username, password }) {
  const result = await authApi({ action: 'login', username, password });
  if (result.token) setToken(result.token);
  return result;
}

async function logoutAccount() {
  await authApi({ action: 'logout' });
  setToken('');
  clearSession();
}

function authHeaders() {
  const token = getToken();
  return token ? { Authorization: 'Bearer ' + token } : {};
}

async function updateHeaderAccount() {
  const el = document.getElementById('account-chip');
  if (!el) return;
  const user = await fetchMe();
  if (user) {
    el.innerHTML = `<span class="chip-label">${user.displayName}</span><span class="chip-amount">${formatMoney(user.balance)}</span>`;
    el.href = 'account.html';
  } else {
    el.innerHTML = '<span class="chip-label">Guest</span><span class="chip-amount">Log in</span>';
    el.href = 'login.html';
  }
}

document.addEventListener('DOMContentLoaded', () => updateHeaderAccount());
