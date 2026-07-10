const engine = require('../lib/engine');
const auth = require('../lib/auth');

function parseBody(req) {
  return typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
}

function getToken(req) {
  const authHeader = req.headers?.authorization || req.headers?.Authorization || '';
  if (authHeader.startsWith('Bearer ')) return authHeader.slice(7);
  return null;
}

async function handleRooms(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    const list = await engine.listRooms();
    return res.status(200).json(list);
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const body = parseBody(req);
  const token = getToken(req) || body.token;
  const { type, game, name, code, playerId } = body;

  if (type === 'leave') {
    await engine.leaveRoom(code, playerId);
    return res.status(200).json({ ok: true });
  }

  if (type === 'create') {
    const room = await engine.createRoom(game);
    if (!room) return res.status(400).json({ error: 'Invalid game' });
    const joined = await engine.joinRoom(room.code, { name, token, playerId });
    if (joined.error) return res.status(400).json(joined);
    return res.status(200).json(joined);
  }

  if (type === 'join') {
    const joined = await engine.joinRoom(code, { name, token, playerId });
    if (joined.error) return res.status(joined.error === 'Room not found' ? 404 : 400).json(joined);
    return res.status(200).json(joined);
  }

  return res.status(400).json({ error: 'Invalid request' });
}

async function handlePoll(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { code, playerId } = req.query;
  if (!code || !playerId) return res.status(400).json({ error: 'Missing code or playerId' });

  const state = await engine.pollRoom(code, playerId);
  if (state.error) return res.status(404).json(state);
  return res.status(200).json(state);
}

async function handleGame(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const body = parseBody(req);
  const { code, playerId, action, ...data } = body;
  const result = await engine.handleAction(code, playerId, action, data);
  if (result.error && !result.state) return res.status(404).json(result);
  return res.status(200).json(result);
}

async function handleAuth(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const token = getToken(req);

  if (req.method === 'GET') {
    const user = await auth.getUserFromToken(token);
    if (!user) return res.status(401).json({ error: 'Not logged in' });
    return res.status(200).json({ user });
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const body = parseBody(req);
  const { action } = body;

  if (action === 'register') {
    const result = await auth.register(body);
    if (result.error) return res.status(400).json(result);
    return res.status(200).json(result);
  }

  if (action === 'login') {
    const result = await auth.login(body);
    if (result.error) return res.status(401).json(result);
    return res.status(200).json(result);
  }

  if (action === 'logout') {
    await auth.logout(token);
    return res.status(200).json({ ok: true });
  }

  return res.status(400).json({ error: 'Invalid action' });
}

module.exports = { handleRooms, handlePoll, handleGame, handleAuth };
