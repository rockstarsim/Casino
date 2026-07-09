const engine = require('../lib/engine');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { code, playerId } = req.query;
  if (!code || !playerId) return res.status(400).json({ error: 'Missing code or playerId' });

  const room = engine.getRoom(code);
  if (!room) return res.status(404).json({ error: 'Room not found' });

  return res.status(200).json(engine.getPublicState(room, playerId));
};
