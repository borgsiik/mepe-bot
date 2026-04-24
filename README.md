# MEPE Supply Bot (Telegram + Firestore + QR)

MVP-botti meripelastusveneen tarvikkeille:

- Jokaisella artikkelilla on oma QR-linkki/QR-kuva
- Skannaus avaa yksinkertaisen sivun, jossa voi ilmoittaa tuotteen loppuneeksi
- Ilmoitus tallennetaan Firestoreen (`reports`)
- Telegram-komento `/summary` tuottaa yhteenvedon puuttuvista tuotteista (Gemini, fallback ilman AI-kutsua)

## Arkkitehtuuri

### Projektirakenne

```text
mepe-bot/
   index.js                     # ohut entrypoint (käynnistää backend/serverin)
   backend/
      server.js                  # käynnistys (web + telegram)
      core/
         config.js               # ympäristömuuttujat + validointi
         firebase_admin.js       # Firebase Admin SDK + Firestore-init (backend)
         firebase.js             # alias -> firebase_admin (yhteensopivuus)
         utils.js                # apufunktiot (esim. sanitizeId)
      http/
         app.js                  # Express-reitit
      telegram/
         bot.js                  # Telegram-komennot
      services/
         articles.js              # artikkelioperaatiot
         reports.js               # report-operaatiot
         summary.js               # Gemini/fallback-yhteenveto
   ai/
      prompts/
         summaryPrompt.js         # AI-promptin rakennus
   frontend/
      firebase/
         firebase.client.mjs      # Firebase Web SDK init (frontend hosting/client)
      templates/
         pages.js                 # QR-sivun ja muiden sivujen HTML-templatet
```

### Firestore-kokoelmat

- `articles/{articleId}`
  - `articleId`, `name`, `boatId`, `createdAt`, `updatedAt`
- `reports/{reportId}`
  - `articleId`, `articleName`, `boatId`, `reportedBy`, `note`, `status`, `source`, `createdAt`

### API-endpointit

- `GET /` — info
- `GET /r/:articleId` — QR:n avaama ilmoitussivu
- `POST /api/report` — tallentaa loppuneen tuotteen ilmoituksen
- `POST /api/articles` — lisää/päivittää artikkelin
- `GET /api/articles` — listaa artikkelit
- `GET /api/articles/:articleId/qr` — palauttaa QR-kuvan (png)
- `GET /api/summary` — palauttaa yhteenvedon puuttuvista tuotteista

### Telegram-komennot

- `/start`
- `/addarticle <id> | <nimi>`
- `/articles`
- `/qr <id>`
- `/summary`
- `/resolveall`

## Käyttöönotto

1. Kopioi ympäristömuuttujatiedosto:
   - `.env.example` -> `.env`
2. Täytä lokaalissa ajossa Firebase service account -arvot, Telegram token ja Gemini-asetukset.
3. Asenna riippuvuudet ja käynnistä.

### Firebase App Hosting (Blaze)

- `firebase init` loi tiedostot: `.firebaserc`, `firebase.json`, `apphosting.yaml`.
- `firebase.json` käyttää nyt projektijuurta (`rootDir: "."`).
- `apphosting.yaml` rajoittaa instanssimäärän yhteen (`maxInstances: 1`), jotta Telegram polling ei käynnisty rinnakkain useassa instanssissa.
- Cloud-ajossa (`App Hosting / Cloud Run`) `firebase-admin` käyttää oletusarvoisesti Application Default Credentials -tunnistusta, joten service account envit eivät ole pakollisia.
- Aseta `BASE_URL` App Hostingin runtime-environmentiin, jotta Telegramissa jaetut QR-linkit osoittavat omaan tuotantodomainiin.

## Käyttöesimerkki

1. Lisää tuote Telegramissa:
   - `/addarticle toilet-paper | Vessapaperi`
2. Hae QR-linkki:
   - `/qr toilet-paper`
3. Avaa QR-linkki (tai skannaa QR) ja paina out-of-stock -nappia.
4. Pyydä yhteenveto:
   - `/summary`

## Huomiot

- Jos Gemini-kutsu ei onnistu tai projektiasetuksia puuttuu, botti tekee fallback-yhteenvedon ilman AI:ta.
- Tuotantoon vietäessä aseta `BASE_URL` julkiseen HTTPS-osoitteeseen.
- Firestore-indeksit voivat vaatia yhdistelmäindeksin kyselylle `boatId + status + createdAt` riippuen projektin asetuksista.
- `backend/core/firebase_admin.js` on backendin palvelinpuolen yhteys Firestoreen.
- `frontend/firebase/firebase.client.mjs` on frontendin Firebase Web SDK -alustus (sopii Firebase Hostingiin).
