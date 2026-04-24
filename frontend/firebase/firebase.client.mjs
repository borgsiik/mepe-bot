import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAnalytics, isSupported } from 'firebase/analytics';

export const firebaseConfig = {
	apiKey: 'AIzaSyAV4s-AXzmcrzuxcRjPjlETQaid-uqeBtc',
	authDomain: 'mepe-bot.firebaseapp.com',
	projectId: 'mepe-bot',
	storageBucket: 'mepe-bot.firebasestorage.app',
	messagingSenderId: '587558007675',
	appId: '1:587558007675:web:192fdfa005badbdbf483de',
	measurementId: 'G-P7X7JW79SZ',
};

export function initFirebaseClient() {
	const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
	return app;
}

export async function initAnalyticsIfSupported(app = initFirebaseClient()) {
	if (typeof window === 'undefined') {
		return null;
	}

	const supported = await isSupported();
	if (!supported) {
		return null;
	}

	return getAnalytics(app);
}
