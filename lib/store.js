function getRooms() {
  if (!globalThis.__casinoRooms) globalThis.__casinoRooms = new Map();
  return globalThis.__casinoRooms;
}

module.exports = { getRooms };
