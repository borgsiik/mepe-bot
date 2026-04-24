const express = require('express');
const QRCode = require('qrcode');
const { config } = require('../core/config');
const { getArticle, listArticles, upsertArticle } = require('../services/articles');
const { addReport, getPendingReports } = require('../services/reports');
const { generateSummaryWithGemini } = require('../services/summary');
const {
	homePage,
	articleNotFoundPage,
	reportPage,
	reportDrySuitPage,
	reportSuccessPage,
} = require('../../frontend/templates/pages');

function resolveBaseUrl(req) {
	if (config.BASE_URL) {
		return config.BASE_URL;
	}

	return `${req.protocol}://${req.get('host')}`;
}

function createApp() {
	const app = express();

	app.use(express.json());
	app.use(express.urlencoded({ extended: true }));

	app.get('/', (_req, res) => {
		res.type('html').send(homePage());
	});

	app.get('/r/:articleId', async (req, res) => {
		const { articleId } = req.params;
		const boatId = req.query.boatId || config.DEFAULT_BOAT_ID;
		const reportedBy = req.query.user || 'Miehistö';

		const articleDoc = await getArticle(articleId);
		if (!articleDoc.exists) {
			return res.status(404).type('html').send(articleNotFoundPage());
		}

		const article = articleDoc.data();
		const articleName = article.name || articleId;

		const returnedPage = articleId === 'drysuit' ? reportDrySuitPage({ articleId, articleName, boatId, reportedBy }) : reportPage({ articleId, articleName, boatId, reportedBy });
		return res.type('html').send(returnedPage);
	});

	app.post('/api/report', async (req, res) => {
		const {
			articleId,
			boatId = config.DEFAULT_BOAT_ID,
			reportedBy = 'Miehistö',
			note = '',
			suitId,
			faultDescription,
		} = req.body;

		if (!articleId) {
			return res.status(400).json({ error: 'articleId is required' });
		}

		const articleDoc = await getArticle(articleId);
		const articleName = articleDoc.exists ? articleDoc.data().name : articleId;
		const normalizedSuitId = typeof suitId === 'string' ? suitId.trim() : '';
		const normalizedFaultDescription =
			typeof faultDescription === 'string' ? faultDescription.trim() : '';

		await addReport({
			articleId,
			articleName,
			boatId,
			reportedBy,
			note,
			source: 'qr-page',
			...(normalizedSuitId ? { suitId: normalizedSuitId } : {}),
			...(normalizedFaultDescription ? { faultDescription: normalizedFaultDescription } : {}),
		});

		if (req.headers.accept && req.headers.accept.includes('text/html')) {
			return res.type('html').send(reportSuccessPage(articleName));
		}

		return res.json({ ok: true, articleId, articleName, boatId });
	});

	app.post('/api/articles', async (req, res) => {
		const { articleId, name, boatId = config.DEFAULT_BOAT_ID } = req.body;

		if (!articleId || !name) {
			return res.status(400).json({ error: 'articleId and name are required' });
		}

		const article = await upsertArticle({ articleId, name, boatId });
		return res.status(201).json(article);
	});

	app.get('/api/articles', async (req, res) => {
		const boatId = req.query.boatId || config.DEFAULT_BOAT_ID;
		const items = await listArticles(boatId);
		res.json({ items });
	});

	app.get('/api/articles/:articleId/qr', async (req, res) => {
		const { articleId } = req.params;
		const boatId = req.query.boatId || config.DEFAULT_BOAT_ID;
		const user = req.query.user || 'Miehistö';
		const baseUrl = resolveBaseUrl(req);

		const reportUrl = `${baseUrl}/r/${articleId}?boatId=${encodeURIComponent(boatId)}&user=${encodeURIComponent(user)}`;
		const png = await QRCode.toBuffer(reportUrl, { type: 'png', width: 480 });

		res.setHeader('Content-Type', 'image/png');
		res.send(png);
	});

	app.get('/api/summary', async (req, res) => {
		const boatId = req.query.boatId || config.DEFAULT_BOAT_ID;
		const reports = await getPendingReports(boatId);
		const summary = await generateSummaryWithGemini(reports, boatId);
		res.json({ boatId, summary, count: reports.length });
	});

	return app;
}

module.exports = {
	createApp,
};
