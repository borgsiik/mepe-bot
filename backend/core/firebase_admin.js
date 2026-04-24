const admin = require('firebase-admin');
const { config } = require('./config');

if (!admin.apps.length) {
	if (config.HAS_SERVICE_ACCOUNT_ENV) {
		admin.initializeApp({
			credential: admin.credential.cert({
				projectId: config.FIREBASE_PROJECT_ID,
				clientEmail: config.FIREBASE_CLIENT_EMAIL,
				privateKey: config.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
			}),
		});
	} else {
		admin.initializeApp();
	}
}

const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;

module.exports = {
	db,
	FieldValue,
};
