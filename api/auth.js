const { handleAuth } = require('../lib/api');

module.exports = async (req, res) => handleAuth(req, res);
