const { Redis } = require('@upstash/redis');

const ROOM_PREFIX = 'casino:room:';
const ROOM_INDEX = 'casino:room:codes';
const USER_PREFIX = 'casino:user:';
const USERNAME_INDEX = 'casino:usernames';
const SESSION_PREFIX = 'casino:session:';

const ROOM_TTL_SEC = 3600;
const SESSION_TTL_SEC = 60 * 60 * 24 * 30;

let redis = null;
let memoryRooms = null;
let memoryUsers = null;
let memorySessions = null;
let memoryUsernames = null;

function redisUrl() {
  return process.env.KV_REST_API_URL
    || process.env.UPSTASH_REDIS_REST_URL
    || process.env.REDIS_URL;
}

function redisToken() {
  return process.env.KV_REST_API_TOKEN
    || process.env.UPSTASH_REDIS_REST_TOKEN;
}

function getRedis() {
  if (redis !== null) return redis;
  const url = redisUrl();
  const token = redisToken();
  if (url && token) {
    redis = new Redis({ url, token });
  } else {
    redis = false;
  }
  return redis;
}

function memRooms() {
  if (!memoryRooms) memoryRooms = new Map();
  return memoryRooms;
}

function memUsers() {
  if (!memoryUsers) memoryUsers = new Map();
  return memoryUsers;
}

function memSessions() {
  if (!memorySessions) memorySessions = new Map();
  return memorySessions;
}

function memUsernames() {
  if (!memoryUsernames) memoryUsernames = new Map();
  return memoryUsernames;
}

function usingRedis() {
  return !!getRedis();
}

async function saveRoom(room) {
  if (!room?.code) return;
  const r = getRedis();
  const payload = JSON.stringify(room);
  if (r) {
    await r.set(ROOM_PREFIX + room.code, payload, { ex: ROOM_TTL_SEC });
    await r.sadd(ROOM_INDEX, room.code);
  } else {
    memRooms().set(room.code, room);
  }
}

async function getRoom(code) {
  if (!code) return null;
  const key = String(code).toUpperCase();
  const r = getRedis();
  if (r) {
    const raw = await r.get(ROOM_PREFIX + key);
    if (!raw) return null;
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  }
  return memRooms().get(key) || null;
}

async function deleteRoom(code) {
  const key = String(code).toUpperCase();
  const r = getRedis();
  if (r) {
    await r.del(ROOM_PREFIX + key);
    await r.srem(ROOM_INDEX, key);
  } else {
    memRooms().delete(key);
  }
}

async function listRoomCodes() {
  const r = getRedis();
  if (r) return r.smembers(ROOM_INDEX);
  return [...memRooms().keys()];
}

async function saveUser(user) {
  const r = getRedis();
  const payload = JSON.stringify(user);
  if (r) {
    await r.set(USER_PREFIX + user.id, payload);
    await r.hset(USERNAME_INDEX, user.username.toLowerCase(), user.id);
  } else {
    memUsers().set(user.id, user);
    memUsernames().set(user.username.toLowerCase(), user.id);
  }
}

async function getUserById(id) {
  const r = getRedis();
  if (r) {
    const raw = await r.get(USER_PREFIX + id);
    if (!raw) return null;
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  }
  return memUsers().get(id) || null;
}

async function getUserByUsername(username) {
  const r = getRedis();
  let id;
  if (r) {
    id = await r.hget(USERNAME_INDEX, username.toLowerCase());
  } else {
    id = memUsernames().get(username.toLowerCase());
  }
  return id ? getUserById(id) : null;
}

async function saveSession(token, userId) {
  const r = getRedis();
  if (r) {
    await r.set(SESSION_PREFIX + token, userId, { ex: SESSION_TTL_SEC });
  } else {
    memSessions().set(token, { userId, expires: Date.now() + SESSION_TTL_SEC * 1000 });
  }
}

async function getSessionUserId(token) {
  if (!token) return null;
  const r = getRedis();
  if (r) return r.get(SESSION_PREFIX + token);
  const s = memSessions().get(token);
  if (!s || s.expires < Date.now()) return null;
  return s.userId;
}

async function deleteSession(token) {
  const r = getRedis();
  if (r) await r.del(SESSION_PREFIX + token);
  else memSessions().delete(token);
}

module.exports = {
  usingRedis,
  saveRoom,
  getRoom,
  deleteRoom,
  listRoomCodes,
  saveUser,
  getUserById,
  getUserByUsername,
  saveSession,
  getSessionUserId,
  deleteSession,
  getRooms: memRooms
};
