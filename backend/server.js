const { config, validateConfig } = require('./core/config');
const { createApp } = require('./http/app');
const { startTelegramBot } = require('./telegram/bot');

function startServer() {
	validateConfig();

	const app = createApp();
	const publicBaseUrl = config.BASE_URL || '(dynamic from incoming request host)';
	const server = app.listen(config.PORT, () => {
		console.log(`[web] Running at ${publicBaseUrl}`);
	});

	startTelegramBot();

	process.on('SIGINT', () => {
		server.close(() => process.exit(0));
	});

	return server;
}

module.exports = {
	startServer,
};
