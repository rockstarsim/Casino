const engine = require('../lib/engine');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    return res.status(200).json(engine.listRooms());
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const { type, game, name, code } = body;

  if (type === 'create') {
    const room = engine.createRoom(game);
    if (!room) return res.status(400).json({ error: 'Invalid game' });
    const joined = engine.joinRoom(room, name);
    if (!joined) return res.status(400).json({ error: 'Could not join' });
    return res.status(200).json({ ok: true, code: room.code, playerId: joined.playerId });
  }

  if (type === 'join') {
    const room = engine.getRoom(code);
    if (!room) return res.status(404).json({ error: 'Room not found' });
    const joined = engine.joinRoom(room, name);
    if (!joined) return res.status(400).json({ error: 'Room full' });
    return res.status(200).json({ ok: true, code: room.code, playerId: joined.playerId });
  }

  return res.status(400).json({ error: 'Invalid request' });
};
