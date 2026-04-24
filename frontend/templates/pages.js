function renderPage({ title, heading, subtitle = '', body, tone = 'default' }) {
	const toneStyles =
		tone === 'alert'
			? 'background: linear-gradient(135deg, #1f2937, #3f1d2e); border: 1px solid rgba(248,113,113,0.35);'
			: 'background: linear-gradient(135deg, #1f2937, #1d4ed8); border: 1px solid rgba(148,163,184,0.25);';

	return `
		<html>
			<head>
				<meta charset="utf-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1" />
				<title>${title}</title>
				<style>
					:root {
						color-scheme: light;
						--bg: #f8fafc;
						--text: #0f172a;
						--muted: #475569;
						--card: #ffffff;
						--border: #e2e8f0;
						--primary: #2563eb;
						--primary-hover: #1d4ed8;
						--danger: #dc2626;
						--danger-hover: #b91c1c;
					}

					* { box-sizing: border-box; }

					body {
						margin: 0;
						font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
						background: radial-gradient(circle at top, #dbeafe 0%, var(--bg) 45%);
						color: var(--text);
						min-height: 100dvh;
						padding: 2rem 1rem;
					}

					.container {
						max-width: 760px;
						margin: 0 auto;
					}

					.hero {
						${toneStyles}
						color: #f8fafc;
						padding: 1.25rem 1.5rem;
						border-radius: 16px;
						box-shadow: 0 12px 30px rgba(15, 23, 42, 0.18);
						margin-bottom: 1rem;
					}

					.hero h1 {
						margin: 0;
						font-size: clamp(1.35rem, 3vw, 1.8rem);
					}

					.hero p {
						margin: 0.5rem 0 0;
						opacity: 0.92;
					}

					.card {
						background: var(--card);
						border: 1px solid var(--border);
						border-radius: 16px;
						padding: 1.25rem;
						box-shadow: 0 10px 24px rgba(15, 23, 42, 0.07);
					}

					.info-grid {
						display: grid;
						grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
						gap: 0.75rem;
						margin-bottom: 1rem;
					}

					.pill {
						background: #f1f5f9;
						border: 1px solid #e2e8f0;
						padding: 0.6rem 0.75rem;
						border-radius: 12px;
						font-size: 0.92rem;
					}

					.pill strong { display: block; font-size: 0.78rem; color: #64748b; margin-bottom: 0.2rem; }

					label {
						display: block;
						font-weight: 600;
						margin-bottom: 0.35rem;
					}

					input,
					textarea {
						width: 100%;
						padding: 0.72rem 0.8rem;
						border: 1px solid #cbd5e1;
						border-radius: 10px;
						font: inherit;
						margin-bottom: 0.95rem;
					}

					input:focus,
					textarea:focus {
						outline: none;
						border-color: #60a5fa;
						box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.14);
					}

					button {
						border: 0;
						border-radius: 10px;
						padding: 0.78rem 1rem;
						font-weight: 700;
						font-size: 0.96rem;
						color: #fff;
						background: var(--primary);
						cursor: pointer;
						transition: 120ms ease;
					}

					button:hover { background: var(--primary-hover); transform: translateY(-1px); }
					button.danger { background: var(--danger); }
					button.danger:hover { background: var(--danger-hover); }

					ul { margin: 0.35rem 0 0; padding-left: 1.1rem; }
					li { margin: 0.3rem 0; color: var(--muted); }
				</style>
			</head>
			<body>
				<div class="container">
					<section class="hero">
						<h1>${heading}</h1>
						${subtitle ? `<p>${subtitle}</p>` : ''}
					</section>
					<section class="card">${body}</section>
				</div>
			</body>
		</html>
	`;
}

function homePage() {
	return renderPage({
		title: 'MEPE Supply Bot',
		heading: 'MEPE Supply Bot',
		subtitle: 'Ilmoita veneen tarvikkeiden puutteista nopeasti QR-koodilla.',
		body: `
			<p style="margin-top: 0; color: #475569;">Tämä sivu vastaanottaa puuteilmoituksia ja välittää ne Telegram-botille.</p>
			<ul>
				<li>Skannaa tuotteen QR-koodi.</li>
				<li>Täytä lyhyt ilmoituslomake.</li>
				<li>Botin <code>/summary</code> tekee yhteenvedon puuttuvista tuotteista.</li>
			</ul>
		`,
	});
}

function articleNotFoundPage() {
	return renderPage({
		title: 'Artikkelia ei löydy',
		heading: 'Artikkelia ei löytynyt',
		subtitle: 'Tarkista QR-koodi',
		tone: 'alert',
		body: '<p style="margin:0; color:#475569;">Jos ongelma jatkuu, lisää artikkeli uudelleen komennolla <code>/addarticle</code>.</p>',
	});
}

function reportPage({ articleId, articleName, boatId, reportedBy }) {
	return renderPage({
		title: `${articleName} | Out of stock`,
		heading: articleName,
		subtitle: `Onko ${articleName} loppunut? Tilaa lisää!`,
		tone: 'alert',
		body: `
			<div class="info-grid">
				<div class="pill"><strong>Vene</strong>${boatId}</div>
				<div class="pill"><strong>Ilmoittaja</strong>${reportedBy}</div>
			</div>

			<form method="POST" action="/api/report">
				<input type="hidden" name="articleId" value="${articleId}" />
				<input type="hidden" name="boatId" value="${boatId}" />
				<input type="hidden" name="reportedBy" value="${reportedBy}" />

				<label for="note">Lisätieto (valinnainen)</label>
				<textarea id="note" name="note" rows="4" placeholder="Esim. Kaikki on loppu!"></textarea>

				<button class="danger">Out of ${articleName}, order more</button>
			</form>
		`,
	});
}

function reportDrySuitPage({ articleId, articleName, boatId, reportedBy }) {
	return renderPage({
		title: `${articleName} | Huoltotarve`,
		heading: `${articleName} · huoltotarve`,
		subtitle: 'Ilmoita puvun numero ja lyhyt vikakuvaus.',
		body: `
			<div class="info-grid">
				<div class="pill"><strong>Vene</strong>${boatId}</div>
				<div class="pill"><strong>Ilmoittaja</strong>${reportedBy}</div>
			</div>

			<form method="POST" action="/api/report">
				<input type="hidden" name="articleId" value="${articleId}" />
				<input type="hidden" name="boatId" value="${boatId}" />
				<input type="hidden" name="reportedBy" value="${reportedBy}" />

				<label for="suitId">Kuivapuvun koodi</label>
				<input id="suitId" name="suitId" type="text" placeholder="Esim. XL36" />

				<label for="faultDescription">Vian kuvaus</label>
				<textarea id="faultDescription" name="faultDescription" rows="4" placeholder="Esim. vetoketju jumittaa, mansetissa pieni repeämä"></textarea>

				<button>Ilmoita huoltotarpeesta</button>
			</form>
		`,
	});
}

function reportSuccessPage(articleName) {
	return renderPage({
		title: 'Ilmoitus vastaanotettu',
		heading: 'Kiitos! ✅',
		subtitle: `Ilmoitus vastaanotettu (${articleName}).`,
		body: '<p style="margin:0; color:#475569;">Voit nyt sulkea tämän sivun. Tieto välittyy botille automaattisesti.</p>',
	});
}

module.exports = {
	homePage,
	articleNotFoundPage,
	reportPage,
	reportDrySuitPage,
	reportSuccessPage,
};
