const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const api = require('../lib/api');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/api/rooms', (req, res) => api.handleRooms(req, res));
app.post('/api/rooms', (req, res) => api.handleRooms(req, res));
app.get('/api/poll', (req, res) => api.handlePoll(req, res));
app.post('/api/game', (req, res) => api.handleGame(req, res));
app.get('/api/auth', (req, res) => api.handleAuth(req, res));
app.post('/api/auth', (req, res) => api.handleAuth(req, res));

// Legacy Socket.io handlers kept for backwards compatibility — client uses HTTP API
const { generateRoomCode } = require('./deck');
const blackjack = require('./blackjack');
const baccarat = require('./baccarat');
const holdem = require('./holdem');

const rooms = new Map();
const playerRooms = new Map();

function getRoom(code) {
  return rooms.get(code.toUpperCase());
}

function emitToRoom(room) {
  const sockets = io.sockets.adapter.rooms.get(room.code);
  if (!sockets) return;
  for (const sid of sockets) {
    const sock = io.sockets.sockets.get(sid);
    if (sock) sock.emit('state', getPublicState(room, sock.data.playerId));
  }
}

function getPublicState(room, viewerId) {
  if (room.game === 'blackjack') return blackjack.publicState(room, viewerId);
  if (room.game === 'baccarat') return baccarat.publicState(room, viewerId);
  if (room.game === 'holdem') return holdem.publicState(room, viewerId);
  return {};
}

function createRoom(game) {
  let code;
  do { code = generateRoomCode(); } while (rooms.has(code));
  let room;
  if (game === 'blackjack') room = blackjack.createBlackjackRoom(code);
  else if (game === 'baccarat') room = baccarat.createBaccaratRoom(code);
  else if (game === 'holdem') room = holdem.createHoldemRoom(code);
  else return null;
  rooms.set(code, room);
  return room;
}

io.on('connection', (socket) => {
  socket.on('list-rooms', (_, cb) => {
    const list = [];
    for (const [code, room] of rooms) {
      list.push({ code, game: room.game, players: room.players.length, phase: room.phase });
    }
    cb(list);
  });
  socket.on('disconnect', () => {
    const code = playerRooms.get(socket.id);
    if (!code) return;
    const room = rooms.get(code);
    if (!room) return;
    if (room.game === 'blackjack') blackjack.removePlayer(room, socket.data.playerId);
    else if (room.game === 'baccarat') baccarat.removePlayer(room, socket.data.playerId);
    else if (room.game === 'holdem') holdem.removePlayer(room, socket.data.playerId);
    playerRooms.delete(socket.id);
    if (room.players.length === 0) rooms.delete(code);
    else emitToRoom(room);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Barona casino server running at http://localhost:${PORT}`);
  const store = require('../lib/store');
  console.log(store.usingRedis() ? 'Using Redis for rooms & accounts' : 'Using in-memory store (add Redis for production)');
});
