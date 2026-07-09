let playerId = null;
let roomCode = null;
let onStateCallback = null;
let pollTimer = null;

async function api(path, options = {}) {
  const res = await fetch('/api/' + path, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  return res.json();
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
    const state = await api(`poll?code=${roomCode}&playerId=${playerId}`);
    if (state.error) return;
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

function setupLobby(game, onJoined) {
  const nameInput = document.getElementById('player-name');
  const createBtn = document.getElementById('create-room-btn');
  const joinBtn = document.getElementById('join-room-btn');
  const joinCode = document.getElementById('join-code');
  const lobbyPanel = document.getElementById('lobby-panel');
  const gamePanel = document.getElementById('game-panel');
  const lobbyError = document.getElementById('lobby-error');
  const roomCodeEl = document.getElementById('room-code');

  const saved = getPlayerName();
  if (saved) nameInput.value = saved;

  function showError(msg) { lobbyError.textContent = msg || ''; }

  function joinSuccess(res) {
    if (res.error) { showError(res.error); return; }
    playerId = res.playerId;
    roomCode = res.code;
    savePlayerName(nameInput.value.trim());
    lobbyPanel.classList.add('hidden');
    gamePanel.classList.remove('hidden');
    roomCodeEl.textContent = 'Room: ' + roomCode;
    showError('');
    startPolling();
    onJoined(res);
  }

  createBtn.addEventListener('click', async () => {
    const name = nameInput.value.trim();
    if (name.length < 2) { showError('Enter your name (2+ chars)'); return; }
    try {
      const res = await api('rooms', { method: 'POST', body: JSON.stringify({ type: 'create', game, name }) });
      joinSuccess(res);
    } catch { showError('Server error'); }
  });

  joinBtn.addEventListener('click', async () => {
    const name = nameInput.value.trim();
    const code = joinCode.value.trim().toUpperCase();
    if (name.length < 2) { showError('Enter your name'); return; }
    if (code.length < 4) { showError('Enter room code'); return; }
    try {
      const res = await api('rooms', { method: 'POST', body: JSON.stringify({ type: 'join', code, name }) });
      joinSuccess(res);
    } catch { showError('Server error'); }
  });

  const params = new URLSearchParams(location.search);
  if (params.get('code')) joinCode.value = params.get('code');
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
