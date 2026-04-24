const { db, FieldValue } = require('../core/firebase_admin');
const { config } = require('../core/config');

function byCreatedAtDesc(a, b) {
	const aMillis = a.createdAt?.toMillis?.() || 0;
	const bMillis = b.createdAt?.toMillis?.() || 0;
	return bMillis - aMillis;
}

async function getPendingReports(boatId = config.DEFAULT_BOAT_ID) {
	const baseQuery = db.collection('reports').where('boatId', '==', boatId).where('status', '==', 'pending');

	try {
		const snapshot = await baseQuery.orderBy('createdAt', 'desc').get();
		return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
	} catch (error) {
		const isMissingIndex =
			error?.code === 9 ||
			error?.code === 'failed-precondition' ||
			String(error?.message || '').includes('The query requires an index');

		if (!isMissingIndex) {
			throw error;
		}

		console.warn('[reports] Missing Firestore composite index, using fallback query without orderBy');
		const snapshot = await baseQuery.get();
		return snapshot.docs
			.map((doc) => ({ id: doc.id, ...doc.data() }))
			.sort(byCreatedAtDesc);
	}
}

async function addReport({
	articleId,
	articleName,
	boatId,
	reportedBy,
	note,
	suitId,
	faultDescription,
	source = 'qr-page',
}) {
	const report = {
		articleId,
		articleName,
		boatId,
		reportedBy,
		note,
		source,
		status: 'pending',
		createdAt: FieldValue.serverTimestamp(),
	};

	if (suitId) {
		report.suitId = suitId;
	}

	if (faultDescription) {
		report.faultDescription = faultDescription;
	}

	await db.collection('reports').add(report);
}

async function resolveAllPending(boatId = config.DEFAULT_BOAT_ID) {
	const reports = await getPendingReports(boatId);

	if (!reports.length) {
		return 0;
	}

	const batch = db.batch();
	reports.forEach((report) => {
		const ref = db.collection('reports').doc(report.id);
		batch.update(ref, {
			status: 'resolved',
			resolvedAt: FieldValue.serverTimestamp(),
		});
	});

	await batch.commit();
	return reports.length;
}

module.exports = {
	getPendingReports,
	addReport,
	resolveAllPending,
};
