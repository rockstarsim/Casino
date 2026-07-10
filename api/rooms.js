const { handleRooms } = require('../lib/api');

module.exports = async (req, res) => handleRooms(req, res);
