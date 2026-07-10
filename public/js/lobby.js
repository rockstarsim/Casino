async function api(path, options = {}) {
  const res = await fetch('/api/' + path, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  return res.json();
}

async function renderRooms() {
  const list = document.getElementById('room-list');
  try {
    const res = await fetch('/api/rooms');
    const backend = res.headers.get('X-Store-Backend');
    const rooms = await res.json();
    if (backend === 'memory') {
      const warn = document.getElementById('store-warn');
      if (warn) warn.classList.remove('hidden');
    }
    if (!rooms || !rooms.length) {
      list.innerHTML = '<p class="muted">No open tables. Create one from a game page!</p>';
      return;
    }
    const gamePages = { blackjack: 'blackjack.html', baccarat: 'baccarat.html', holdem: 'holdem.html' };
    list.innerHTML = rooms.map(r => `
      <div class="room-item">
        <span><strong>${r.game}</strong> · ${r.waiting ? 'waiting for host' : r.players + ' player(s)'} · ${r.phase}</span>
        <a href="${gamePages[r.game]}?code=${r.code}">Join ${r.code} →</a>
      </div>
    `).join('');
    const el = document.getElementById('server-status');
    if (el) { el.textContent = 'Online'; el.classList.add('online'); }
  } catch {
    list.innerHTML = '<p class="muted">Could not load tables.</p>';
  }
}

renderRooms();
setInterval(renderRooms, 5000);
