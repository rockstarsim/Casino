const crypto = require('crypto');
const store = require('./store');

const STARTING_BALANCE = 10000;

function hashPassword(password, salt) {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

function createPasswordHash(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  return { salt, hash: hashPassword(password, salt) };
}

function verifyPassword(password, salt, hash) {
  return hashPassword(password, salt) === hash;
}

function newToken() {
  return crypto.randomBytes(32).toString('hex');
}

function newUserId() {
  return crypto.randomUUID();
}

async function register({ username, password, displayName, characterIndex }) {
  const user = String(username || '').trim().toLowerCase();
  const pass = String(password || '');
  const name = String(displayName || '').trim().slice(0, 16);
  const charIdx = Number(characterIndex);

  if (user.length < 3) return { error: 'Username must be at least 3 characters' };
  if (!/^[a-z0-9_]+$/.test(user)) return { error: 'Username: letters, numbers, underscore only' };
  if (pass.length < 6) return { error: 'Password must be at least 6 characters' };
  if (name.length < 2) return { error: 'Display name must be at least 2 characters' };
  if (!Number.isInteger(charIdx) || charIdx < 0 || charIdx >= 34) return { error: 'Pick a character' };

  if (await store.getUserByUsername(user)) return { error: 'Username already taken' };

  const { salt, hash } = createPasswordHash(pass);
  const record = {
    id: newUserId(),
    username: user,
    salt,
    passwordHash: hash,
    displayName: name,
    characterIndex: charIdx,
    balance: STARTING_BALANCE,
    createdAt: Date.now()
  };
  await store.saveUser(record);

  const token = newToken();
  await store.saveSession(token, record.id);
  return {
    token,
    user: publicUser(record)
  };
}

async function login({ username, password }) {
  const user = String(username || '').trim().toLowerCase();
  const pass = String(password || '');
  const record = await store.getUserByUsername(user);
  if (!record || !verifyPassword(pass, record.salt, record.passwordHash)) {
    return { error: 'Invalid username or password' };
  }
  const token = newToken();
  await store.saveSession(token, record.id);
  return { token, user: publicUser(record) };
}

async function logout(token) {
  if (token) await store.deleteSession(token);
  return { ok: true };
}

async function getUserFromToken(token) {
  const userId = await store.getSessionUserId(token);
  if (!userId) return null;
  const record = await store.getUserById(userId);
  return record ? publicUser(record) : null;
}

async function updateUserBalance(userId, balance) {
  const record = await store.getUserById(userId);
  if (!record) return null;
  record.balance = Math.max(0, Math.floor(balance));
  await store.saveUser(record);
  return publicUser(record);
}

function publicUser(record) {
  return {
    id: record.id,
    username: record.username,
    displayName: record.displayName,
    characterIndex: record.characterIndex,
    balance: record.balance
  };
}

async function updateBalanceFromToken(token, balance) {
  const userId = await store.getSessionUserId(token);
  if (!userId) return { error: 'Not logged in' };
  const user = await updateUserBalance(userId, balance);
  if (!user) return { error: 'User not found' };
  return { user };
}

module.exports = {
  STARTING_BALANCE,
  register,
  login,
  logout,
  getUserFromToken,
  updateUserBalance,
  updateBalanceFromToken,
  getUserById: (id) => store.getUserById(id).then(u => u ? publicUser(u) : null)
};
