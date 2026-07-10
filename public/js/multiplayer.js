let playerId = null;
let roomCode = null;
let onStateCallback = null;
let pollTimer = null;

async function api(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(typeof authHeaders === 'function' ? authHeaders() : {})
  };
  const res = await fetch('/api/' + path, { headers, ...options });
  const data = await res.json().catch(() => ({}));
  if (!res.ok && data.error) data._httpError = true;
  return data;
}

function setOnline(online) {
  document.querySelectorAll('.server-status').forEach(el => {
    el.textContent = online ? 'Online' : 'Offline';
    el.classList.toggle('online', online);
  });
}

async function pollState() {
  if (!roomCode || !playerId) return;
  try {
    const state = await api(`poll?code=${encodeURIComponent(roomCode)}&playerId=${encodeURIComponent(playerId)}`);
    if (state.error) {
      if (state.error.includes('Room not found')) leaveRoomQuiet();
      return;
    }
    setOnline(true);
    if (onStateCallback) onStateCallback(state);
  } catch {
    setOnline(false);
  }
}

function startPolling() {
  stopPolling();
  pollState();
  pollTimer = setInterval(pollState, 800);
}

function stopPolling() {
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
}

async function leaveRoomQuiet() {
  if (roomCode && playerId) {
    try {
      await api('rooms', {
        method: 'POST',
        body: JSON.stringify({ type: 'leave', code: roomCode, playerId })
      });
    } catch { /* ignore */ }
  }
  stopPolling();
  playerId = null;
  roomCode = null;
  if (typeof clearSession === 'function') clearSession();
}

function setupLobby(game, onJoined) {
  const nameInput = document.getElementById('player-name');
  const createBtn = document.getElementById('create-room-btn');
  const joinBtn = document.getElementById('join-room-btn');
  const joinCode = document.getElementById('join-code');
  const lobbyPanel = document.getElementById('lobby-panel');
  const gamePanel = document.getElementById('game-panel');
  const lobbyError = document.getElementById('lobby-error');
  const roomCodeEl = document.getElementById('room-code');

  (async () => {
    const user = typeof fetchMe === 'function' ? await fetchMe() : null;
    if (user) {
      nameInput.value = user.displayName;
      nameInput.readOnly = true;
    } else {
      const saved = getPlayerName();
      if (saved) nameInput.value = saved;
    }
  })();

  function showError(msg) { lobbyError.textContent = msg || ''; }

  async function joinSuccess(res) {
    if (res.error) { showError(res.error); return; }
    playerId = res.playerId;
    roomCode = res.code;
    if (typeof saveSession === 'function') saveSession(playerId, roomCode);
    if (!nameInput.readOnly) savePlayerName(nameInput.value.trim());
    lobbyPanel.classList.add('hidden');
    gamePanel.classList.remove('hidden');
    roomCodeEl.textContent = 'Room: ' + roomCode;
    showError('');
    startPolling();
    onJoined(res);
  }

  async function doJoin(code) {
    const name = nameInput.value.trim();
    const normalized = String(code || '').trim().toUpperCase();
    if (name.length < 2) { showError('Enter your name (2+ chars)'); return; }
    if (normalized.length < 4) { showError('Enter a valid room code'); return; }
    try {
      const saved = typeof getSavedSession === 'function' ? getSavedSession() : {};
      const body = {
        type: 'join', code: normalized, name,
        playerId: saved.roomCode === normalized ? saved.playerId : undefined
      };
      if (typeof getToken === 'function' && getToken()) body.token = getToken();
      const res = await api('rooms', { method: 'POST', body: JSON.stringify(body) });
      if (res.error) { showError(res.error); return; }
      joinSuccess(res);
    } catch {
      showError('Could not reach server — check your connection and try again');
    }
  }

  createBtn.addEventListener('click', async () => {
    const name = nameInput.value.trim();
    if (name.length < 2) { showError('Enter your name (2+ chars)'); return; }
    createBtn.disabled = true;
    try {
      const body = { type: 'create', game, name };
      if (typeof getToken === 'function' && getToken()) body.token = getToken();
      const res = await api('rooms', { method: 'POST', body: JSON.stringify(body) });
      if (res.error) { showError(res.error); return; }
      joinSuccess(res);
    } catch {
      showError('Could not reach server — check your connection and try again');
    } finally {
      createBtn.disabled = false;
    }
  });

  joinBtn.addEventListener('click', () => doJoin(joinCode.value));

  const params = new URLSearchParams(location.search);
  const urlCode = params.get('code');
  if (urlCode) {
    joinCode.value = urlCode.trim().toUpperCase();
    setTimeout(() => doJoin(joinCode.value), 300);
  }

  window.addEventListener('beforeunload', () => {
    if (roomCode && playerId) {
      navigator.sendBeacon?.('/api/rooms', new Blob([JSON.stringify({
        type: 'leave', code: roomCode, playerId
      })], { type: 'application/json' }));
    }
  });

  setOnline(true);
}

function onState(cb) { onStateCallback = cb; }

async function emit(action, data = {}, cb) {
  if (!roomCode || !playerId) return;
  try {
    const res = await api('game', {
      method: 'POST',
      body: JSON.stringify({ code: roomCode, playerId, action, ...data })
    });
    if (res.state && onStateCallback) onStateCallback(res.state);
    if (cb) cb(res.result || res);
  } catch (e) {
    if (cb) cb({ error: 'Network error' });
  }
}
