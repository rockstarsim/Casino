const socket = io({ transports: ['websocket', 'polling'] });

let playerId = null;
let roomCode = null;
let onStateCallback = null;

socket.on('connect', () => {
  document.querySelectorAll('.server-status').forEach(el => {
    el.textContent = 'Online';
    el.classList.add('online');
  });
});

socket.on('disconnect', () => {
  document.querySelectorAll('.server-status').forEach(el => {
    el.textContent = 'Offline';
    el.classList.remove('online');
  });
});

socket.on('state', (state) => {
  if (onStateCallback) onStateCallback(state);
});

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
    onJoined(res);
  }

  createBtn.addEventListener('click', () => {
    const name = nameInput.value.trim();
    if (name.length < 2) { showError('Enter your name (2+ chars)'); return; }
    socket.emit('create-room', { game, name }, joinSuccess);
  });

  joinBtn.addEventListener('click', () => {
    const name = nameInput.value.trim();
    const code = joinCode.value.trim().toUpperCase();
    if (name.length < 2) { showError('Enter your name'); return; }
    if (code.length < 4) { showError('Enter room code'); return; }
    socket.emit('join-room', { code, name }, joinSuccess);
  });

  const params = new URLSearchParams(location.search);
  if (params.get('code')) joinCode.value = params.get('code');
}

function onState(cb) { onStateCallback = cb; }

function emit(event, data, cb) { socket.emit(event, data, cb || (() => {})); }
