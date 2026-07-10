const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const { generateRoomCode } = require('./deck');
const blackjack = require('./blackjack');
const baccarat = require('./baccarat');
const holdem = require('./holdem');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(express.static(path.join(__dirname, '..', 'public')));

const rooms = new Map();
const playerRooms = new Map();

function getRoom(code) {
  return rooms.get(code.toUpperCase());
}

function broadcastRoom(room) {
  io.to(room.code).emit('state', getPublicForAll(room));
}

function getPublicForAll(room) {
  const sockets = io.sockets.adapter.rooms.get(room.code);
  const states = {};
  if (sockets) {
    for (const sid of sockets) {
      const viewerId = io.sockets.sockets.get(sid)?.data?.playerId;
      states[sid] = getPublicState(room, viewerId);
    }
  }
  return states;
}

function getPublicState(room, viewerId) {
  if (room.game === 'blackjack') return blackjack.publicState(room, viewerId);
  if (room.game === 'baccarat') return baccarat.publicState(room, viewerId);
  if (room.game === 'holdem') return holdem.publicState(room, viewerId);
  return {};
}

function emitToRoom(room) {
  const sockets = io.sockets.adapter.rooms.get(room.code);
  if (!sockets) return;
  for (const sid of sockets) {
    const sock = io.sockets.sockets.get(sid);
    if (sock) sock.emit('state', getPublicState(room, sock.data.playerId));
  }
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
  socket.on('create-room', ({ game, name }, cb) => {
    const room = createRoom(game);
    if (!room) return cb({ error: 'Invalid game' });

    const player = joinRoom(socket, room, name);
    if (!player) return cb({ error: 'Could not join' });

    if (game === 'blackjack') room.phase = 'betting';
    cb({ ok: true, code: room.code, playerId: player.id });
    emitToRoom(room);
  });

  socket.on('join-room', ({ code, name }, cb) => {
    const room = getRoom(code);
    if (!room) return cb({ error: 'Room not found' });

    const player = joinRoom(socket, room, name);
    if (!player) return cb({ error: 'Room full or in progress' });

    cb({ ok: true, code: room.code, playerId: player.id });
    emitToRoom(room);
  });

  socket.on('list-rooms', (_, cb) => {
    const list = [];
    for (const [code, room] of rooms) {
      list.push({
        code,
        game: room.game,
        players: room.players.length,
        phase: room.phase
      });
    }
    cb(list);
  });

  // Blackjack
  socket.on('bj-bet', ({ amount }, cb) => {
    const room = getPlayerRoom(socket);
    if (!room) return cb({ error: 'Not in room' });
    const result = blackjack.placeBet(room, socket.data.playerId, amount);
    cb(result);
    emitToRoom(room);
  });

  socket.on('bj-deal', (_, cb) => {
    const room = getPlayerRoom(socket);
    if (!room) return cb({ error: 'Not in room' });
    const result = blackjack.startDealing(room);
    cb(result);
    emitToRoom(room);
  });

  socket.on('bj-hit', (_, cb) => {
    const room = getPlayerRoom(socket);
    if (!room) return cb({ error: 'Not in room' });
    const result = blackjack.playerHit(room, socket.data.playerId);
    cb(result);
    emitToRoom(room);
  });

  socket.on('bj-stand', (_, cb) => {
    const room = getPlayerRoom(socket);
    if (!room) return cb({ error: 'Not in room' });
    const result = blackjack.playerStand(room, socket.data.playerId);
    cb(result);
    emitToRoom(room);
  });

  socket.on('bj-double', (_, cb) => {
    const room = getPlayerRoom(socket);
    if (!room) return cb({ error: 'Not in room' });
    const result = blackjack.playerDouble(room, socket.data.playerId);
    cb(result);
    emitToRoom(room);
  });

  socket.on('bj-new-round', (_, cb) => {
    const room = getPlayerRoom(socket);
    if (!room) return cb({ error: 'Not in room' });
    blackjack.newRound(room);
    cb({ ok: true });
    emitToRoom(room);
  });

  // Baccarat
  socket.on('bac-bet', ({ type, amount }, cb) => {
    const room = getPlayerRoom(socket);
    if (!room) return cb({ error: 'Not in room' });
    const result = baccarat.placeBet(room, socket.data.playerId, type, amount);
    cb(result);
    emitToRoom(room);
  });

  socket.on('bac-deal', (_, cb) => {
    const room = getPlayerRoom(socket);
    if (!room) return cb({ error: 'Not in room' });
    const result = baccarat.dealBaccarat(room);
    cb(result);
    emitToRoom(room);
  });

  socket.on('bac-new-round', (_, cb) => {
    const room = getPlayerRoom(socket);
    if (!room) return cb({ error: 'Not in room' });
    baccarat.newRound(room);
    cb({ ok: true });
    emitToRoom(room);
  });

  // Hold'em
  socket.on('holdem-start', (_, cb) => {
    const room = getPlayerRoom(socket);
    if (!room) return cb({ error: 'Not in room' });
    const result = holdem.startHand(room);
    cb(result);
    emitToRoom(room);
  });

  socket.on('holdem-action', ({ action, amount }, cb) => {
    const room = getPlayerRoom(socket);
    if (!room) return cb({ error: 'Not in room' });
    const result = holdem.playerAction(room, socket.data.playerId, action, amount);
    cb(result);
    emitToRoom(room);
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
    if (room.players.length === 0) {
      rooms.delete(code);
    } else {
      emitToRoom(room);
    }
  });
});

function joinRoom(socket, room, name) {
  if (!name || name.trim().length < 2) return null;
  const cleanName = name.trim().slice(0, 16);

  let player;
  if (room.game === 'blackjack') player = blackjack.addPlayer(room, socket.id, cleanName);
  else if (room.game === 'baccarat') player = baccarat.addPlayer(room, socket.id, cleanName);
  else if (room.game === 'holdem') player = holdem.addPlayer(room, socket.id, cleanName);

  if (!player) return null;

  socket.data.playerId = socket.id;
  socket.join(room.code);
  playerRooms.set(socket.id, room.code);
  return player;
}

function getPlayerRoom(socket) {
  const code = playerRooms.get(socket.id);
  return code ? rooms.get(code) : null;
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Barona casino server running at http://localhost:${PORT}`);
});
