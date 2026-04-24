const TelegramBot = require('node-telegram-bot-api');
const { config } = require('../core/config');
const { sanitizeId } = require('../core/utils');
const { getArticle, listArticles, upsertArticle } = require('../services/articles');
const { getPendingReports, resolveAllPending } = require('../services/reports');
const { generateSummaryWithGemini } = require('../services/summary');

function getPublicBaseUrl() {
	return config.BASE_URL || config.LOCAL_BASE_URL;
}

const pendingByChat = new Map();

function parseAddArticleInput(input) {
	let articleId = '';
	let name = '';

	if (input.includes('|')) {
		const parts = input.split('|');
		articleId = (parts.shift() || '').trim();
		name = parts.join('|').trim();
	} else {
		const parts = input.split(/\s+/);
		articleId = (parts.shift() || '').trim();
		name = parts.join(' ').trim();
	}

	return { articleId, name };
}

async function saveArticleFromInput(bot, chatId, input) {
	const { articleId, name } = parseAddArticleInput(input.trim());

	if (!articleId || !name) {
		await bot.sendMessage(
			chatId,
			'Käyttö: /addarticle <id> <nimi> (esim. /addarticle toilet-paper Vessapaperi)'
		);
		return false;
	}

	const article = await upsertArticle({ articleId, name });
	const qrUrl = `${getPublicBaseUrl()}/api/articles/${article.articleId}/qr`;
	await bot.sendMessage(
		chatId,
		`Tallennettu: ${article.name} (${article.articleId})\nQR: ${qrUrl}`
	);

	return true;
}

async function sendQrFromInput(bot, chatId, input) {
	const articleId = sanitizeId(input);
	if (!articleId) {
		await bot.sendMessage(chatId, 'Käyttö: /qr <id> (esim. /qr toilet-paper)');
		return false;
	}

	const doc = await getArticle(articleId);
	if (!doc.exists) {
		await bot.sendMessage(chatId, `Artikkelia '${articleId}' ei löydy.`);
		return false;
	}

	const link = `${getPublicBaseUrl()}/api/articles/${articleId}/qr`;
	await bot.sendMessage(chatId, `QR-kuva artikkelille ${articleId}: ${link}`);
	return true;
}

const BOT_COMMANDS = [
	{ command: 'start', description: 'Näytä aloitus ja komennot' },
	{ command: 'help', description: 'Näytä komentolista' },
	{ command: 'addarticle', description: 'Lisää tai päivitä artikkeli' },
	{ command: 'cancel', description: 'Peruuta kesken oleva syöttö' },
	{ command: 'articles', description: 'Listaa artikkelit' },
	{ command: 'qr', description: 'Hae QR-linkki artikkelille' },
	{ command: 'summary', description: 'Gemini-yhteenveto puuttuvista tarvikkeista' },
	{ command: 'resolveone', description: 'Valitse raportti, joka on käsitelty' },
	{ command: 'resolveall', description: 'Merkitse avoimet raportit käsitellyiksi' },
];

function getHelpText() {
	return [
		'MEPE Supply Bot käytössä ✅',
		'',
		'Komennot:',
		...BOT_COMMANDS.map(({ command, description }) => {
			if (command === 'addarticle') {
				return '/addarticle <id> <nimi> — lisää tai päivitä artikkeli';
			}

			if (command === 'qr') {
				return '/qr <id> — hae QR-linkki artikkelille';
			}

			return `/${command} — ${description}`;
		}),
	].join('\n');
}

function startTelegramBot() {
	if (!config.TELEGRAM_BOT_TOKEN) {
		console.log('[telegram] TELEGRAM_BOT_TOKEN missing, Telegram bot disabled');
		return null;
	}

	const bot = new TelegramBot(config.TELEGRAM_BOT_TOKEN, { polling: true });

	bot
		.setMyCommands(BOT_COMMANDS)
		.then(() => {
			console.log('[telegram] Command menu registered');
		})
		.catch((error) => {
			console.error('[telegram] Failed to register command menu:', error.message);
		});

	bot.onText(/^\/start$/, async (msg) => {
		await bot.sendMessage(msg.chat.id, getHelpText());
	});

	bot.onText(/^\/$/, async (msg) => {
		await bot.sendMessage(msg.chat.id, getHelpText());
	});

	bot.onText(/^\/help$/, async (msg) => {
		await bot.sendMessage(msg.chat.id, getHelpText());
	});

	bot.onText(/^\/cancel$/, async (msg) => {
		if (!pendingByChat.has(msg.chat.id)) {
			return bot.sendMessage(msg.chat.id, 'Ei peruttavaa syöttöä.');
		}

		pendingByChat.delete(msg.chat.id);
		return bot.sendMessage(msg.chat.id, 'Syöttö peruttu.');
	});

	bot.onText(/^\/addarticle(?:\s+(.+))?$/, async (msg, match) => {
		try {
			const input = (match[1] || '').trim();
			if (!input) {
				pendingByChat.set(msg.chat.id, 'addArticle');
				return bot.sendMessage(
					msg.chat.id,
					'Anna lisättävä artikkeli muodossa: <id> <nimi>\nEsim: toilet-paper Vessapaperi'
				);
			}

			const ok = await saveArticleFromInput(bot, msg.chat.id, input);
			if (ok) {
				pendingByChat.delete(msg.chat.id);
			}
		} catch (error) {
			await bot.sendMessage(msg.chat.id, `Virhe artikkelin lisäyksessä: ${error.message}`);
		}
	});

	bot.on('message', async (msg) => {
		const text = (msg.text || '').trim();
		const action = pendingByChat.get(msg.chat.id);
		if (!text || text.startsWith('/')) {
			return;
		}

		if (!pendingByChat.has(msg.chat.id)) {
			return;
		}

		try {
			if (action === 'addArticle') {
				const ok = await saveArticleFromInput(bot, msg.chat.id, text);
				if (ok) {
					pendingByChat.delete(msg.chat.id);
				}
			} else if (action === 'qr') {
				const ok = await sendQrFromInput(bot, msg.chat.id, text);
				if (ok) {
					pendingByChat.delete(msg.chat.id);
				}
			}
		} catch (error) {
			await bot.sendMessage(msg.chat.id, `Virhe syötteen käsittelyssä: ${error.message}`);
		}
	});

	bot.onText(/^\/articles$/, async (msg) => {
		const items = await listArticles(config.DEFAULT_BOAT_ID);
		if (!items.length) {
			return bot.sendMessage(msg.chat.id, 'Ei artikkeleita vielä. Lisää komennolla /addarticle <id> <nimi>');
		}

		const list = items.map((a) => `• ${a.name} (${a.articleId})`).join('\n');
		return bot.sendMessage(msg.chat.id, `Artikkelit:\n${list}`);
	});

	bot.onText(/^\/qr(?:\s+(.+))?$/, async (msg, match) => {
		try {
			const items = await listArticles(config.DEFAULT_BOAT_ID);
			if (!items.length) {
				return bot.sendMessage(msg.chat.id, 'Ei artikkeleita vielä. Lisää komennolla /addarticle <id> <nimi>');
			}
			const list = items.map((a) => `• ${a.name} (${a.articleId})`).join('\n');

			const input = (match[1] || '').trim();
			if (!input) {
				pendingByChat.set(msg.chat.id, 'qr');
				return bot.sendMessage(
					msg.chat.id,
					'Pyydä artikkelin qr-koodi antamalla artikkelin id: <id>\nEsim: toilet-paper. Saatavilla olevat artikkelit:\n' + list
				);
			}

			const ok = await sendQrFromInput(bot, msg.chat.id, input);
			if (ok) {
				pendingByChat.delete(msg.chat.id);
			}
		} catch (error) {
			await bot.sendMessage(msg.chat.id, `Virhe QR-haussa: ${error.message}`);
		}
	});

	bot.onText(/^\/summary$/, async (msg) => {
		try {
			const reports = await getPendingReports(config.DEFAULT_BOAT_ID);
			const summary = await generateSummaryWithGemini(reports, config.DEFAULT_BOAT_ID);
			await bot.sendMessage(msg.chat.id, summary || 'Yhteenvetoa ei voitu muodostaa.');
		} catch (error) {
			await bot.sendMessage(msg.chat.id, `Summary-virhe: ${error.message}`);
		}
	});

	bot.onText(/^\/resolveall$/, async (msg) => {
		const count = await resolveAllPending(config.DEFAULT_BOAT_ID);
		if (!count) {
			return bot.sendMessage(msg.chat.id, 'Ei avoimia raportteja.');
		}

		return bot.sendMessage(msg.chat.id, `Merkitty käsitellyksi: ${count} raporttia.`);
	});

	console.log('[telegram] Bot polling started');
	return bot;
}

module.exports = {
	startTelegramBot,
};
