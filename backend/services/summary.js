const { GoogleGenAI } = require('@google/genai');
const { config } = require('../core/config');
const { buildSummaryPrompt } = require('../../ai/prompts/summaryPrompt');

function uniqueReports(reports) {
	const seen = new Set();
	const result = [];

	for (const report of reports) {
		const key = [
			report.articleId || '',
			report.articleName || '',
			report.reportedBy || '',
			report.note || '',
			report.suitId || '',
			report.faultDescription || '',
		]
			.map((value) => String(value).trim().toLowerCase())
			.join('|');

		if (seen.has(key)) {
			continue;
		}

		seen.add(key);
		result.push(report);
	}

	return result;
}

function buildFallbackSummary(reports, boatId) {
	const dedupedReports = uniqueReports(reports);

	if (!dedupedReports.length) {
		return `Veneellä ${boatId} ei ole tällä hetkellä puuttuvia artikkeleita.`;
	}

	const normalReports = dedupedReports.filter((report) => report.articleId !== 'drysuit');
	const drysuitReports = dedupedReports.filter((report) => report.articleId === 'drysuit');

	const lines = [];

	if (normalReports.length) {
		const grouped = normalReports.reduce((acc, report) => {
			const person = report.reportedBy || 'Miehistö';
			if (!acc[person]) acc[person] = [];
			acc[person].push(report.articleName || report.articleId);
			return acc;
		}, {});

		for (const [person, articles] of Object.entries(grouped)) {
			const uniqueArticles = [...new Set(articles)];
			const articlePart = uniqueArticles.join(', ');
			lines.push(`${person}ltä puuttuu ${articlePart}, tilaa näitä lisää.`);
		}
	}

	if (drysuitReports.length) {
		const drysuitLines = drysuitReports.map((report) => {
			const suitPart = report.suitId ? `Kuivapuvulle ${report.suitId}` : 'Kuivapuvulle';
			const issuePart = report.faultDescription
				? ` on ilmoitettu huoltotarve: ${report.faultDescription}`
				: ' on ilmoitettu huoltotarve';
			return `${suitPart}${issuePart}, tilaa puvulle huolto.`;
		});

		lines.push(...drysuitLines);
	}

	return lines.join(' ');
}


function getGeminiClient() {
	if (!config.GEMINI_PROJECT_ID) {
		return null;
	}

	return new GoogleGenAI({
		vertexai: true,
		project: config.GEMINI_PROJECT_ID,
		location: config.GEMINI_LOCATION,
	});
}

async function generateSummaryWithGemini(reports, boatId) {
	const dedupedReports = uniqueReports(reports);

	const client = getGeminiClient();
	if (!client) {
		return buildFallbackSummary(dedupedReports, boatId);
	}

	if (!dedupedReports.length) {
		return `Veneellä ${boatId} ei ole tällä hetkellä puuttuvia artikkeleita.`;
	}

	const compactData = dedupedReports.map((r) => ({
		articleName: r.articleName,
		articleId: r.articleId,
		reportedBy: r.reportedBy,
		note: r.note,
		suitId: r.suitId || null,
		faultDescription: r.faultDescription || null,
		createdAt: r.createdAt?.toDate?.()?.toISOString?.() || null,
	}));

	const prompt = buildSummaryPrompt({ boatId, compactData });

	try {
		const result = await client.models.generateContent({
			model: config.GEMINI_MODEL,
			contents: prompt,
		});

		const text = String(result?.text || '').trim();

		return text || buildFallbackSummary(dedupedReports, boatId);
	} catch (error) {
		console.error('[summary] Gemini generation failed, using fallback summary:', error.message);
		return buildFallbackSummary(dedupedReports, boatId);
	}
}

module.exports = {
	buildFallbackSummary,
	generateSummaryWithGemini,
};
