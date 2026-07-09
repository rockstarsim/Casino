const socket = io({ transports: ['websocket', 'polling'] });

socket.on('connect', () => {
  const el = document.getElementById('server-status');
  if (el) { el.textContent = 'Online'; el.classList.add('online'); }
  socket.emit('list-rooms', null, renderRooms);
});

socket.on('disconnect', () => {
  const el = document.getElementById('server-status');
  if (el) { el.textContent = 'Offline'; el.classList.remove('online'); }
});

function renderRooms(rooms) {
  const list = document.getElementById('room-list');
  if (!rooms || !rooms.length) {
    list.innerHTML = '<p class="muted">No open tables. Create one from a game page!</p>';
    return;
  }
  const gamePages = { blackjack: 'blackjack.html', baccarat: 'baccarat.html', holdem: 'holdem.html' };
  list.innerHTML = rooms.map(r => `
    <div class="room-item">
      <span><strong>${r.game}</strong> · ${r.players} player(s) · ${r.phase}</span>
      <a href="${gamePages[r.game]}?code=${r.code}">Join ${r.code} →</a>
    </div>
  `).join('');
}

setInterval(() => {
  if (socket.connected) socket.emit('list-rooms', null, renderRooms);
}, 5000);
