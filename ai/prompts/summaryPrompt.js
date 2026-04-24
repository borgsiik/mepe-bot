function buildSummaryPrompt({ boatId, compactData }) {
	return [
		'Olet MEPE-botin yhteenvetoassistentti.',
		'Laadi suomenkielinen yhteenveto meripelastusveneen puuttuvista tuotteista 1-3 virkkeellä.',
		'Kirjoita luonnollisella kielellä, vältä listoja ja JSONia.',
		'Tuo mukaan henkilön nimi jos reportedBy löytyy.',
		'Tärkeä sääntö drysuitille:',
		'- Jos reportin articleId on "drysuit", käsittele se huoltoasiana, ei pelkkänä puuttuvana tavarana.',
		'- Mainitse faultDescription luonnollisella suomen kielellä, jos se on annettu.',
		'- Mainitse suitId (puvun koodi), jos se on annettu.',
		'- Lisää lopuksi toimintakehotus tyyliin "tilaa puvulle huolto".',
		'Tyyli-esimerkki: "Jennyltä puuttuu vessapaperia ja limua, tilaa näitä lisää. Kuivapuvulle XL36 on ilmoitettu huoltotarve: mansetissa repeämä, tilaa puvulle huolto."',
		`Vene: ${boatId}`,
		`Data (JSON): ${JSON.stringify(compactData)}`,
	].join('\n');
}

module.exports = {
	buildSummaryPrompt,
};
