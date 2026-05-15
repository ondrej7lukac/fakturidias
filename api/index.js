// Basic Vercel API entry point that delegates to the refactored server handler
const server = require('../server');

module.exports = (req, res) => {
    return server(req, res);
};
