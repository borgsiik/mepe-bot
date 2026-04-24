const { db, FieldValue } = require('../core/firebase_admin');
const { sanitizeId } = require('../core/utils');
const { config } = require('../core/config');

async function upsertArticle({ articleId, name, boatId = config.DEFAULT_BOAT_ID }) {
	const cleanId = sanitizeId(articleId);
	const docRef = db.collection('articles').doc(cleanId);

	await docRef.set(
		{
			articleId: cleanId,
			name,
			boatId,
			updatedAt: FieldValue.serverTimestamp(),
			createdAt: FieldValue.serverTimestamp(),
		},
		{ merge: true }
	);

	return { articleId: cleanId, name, boatId };
}

async function getArticle(articleId) {
	return db.collection('articles').doc(articleId).get();
}

async function listArticles(boatId = config.DEFAULT_BOAT_ID) {
	const snapshot = await db.collection('articles').where('boatId', '==', boatId).get();
	return snapshot.docs.map((doc) => doc.data());
}

module.exports = {
	upsertArticle,
	getArticle,
	listArticles,
};
