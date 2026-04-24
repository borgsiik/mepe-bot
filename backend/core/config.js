require('dotenv').config();

const fs = require('fs');
const os = require('os');
const path = require('path');

function isRunningInGcp() {
	return Boolean(process.env.K_SERVICE || process.env.GOOGLE_CLOUD_PROJECT || process.env.FUNCTION_TARGET);
}

function hasServiceAccountEnv() {
	return Boolean(
		process.env.FIREBASE_PROJECT_ID &&
			process.env.FIREBASE_CLIENT_EMAIL &&
			process.env.FIREBASE_PRIVATE_KEY
	);
}

function hasApplicationDefaultCredentials() {
	if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
		return true;
	}

	const adcPath = path.join(os.homedir(), '.config', 'gcloud', 'application_default_credentials.json');
	return fs.existsSync(adcPath);
}

const config = {
	PORT: Number(process.env.PORT || 3000),
	BASE_URL: process.env.BASE_URL || '',
	LOCAL_BASE_URL: `http://localhost:${process.env.PORT || 3000}`,
	TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
	GEMINI_MODEL: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
	GEMINI_LOCATION: process.env.GEMINI_LOCATION || 'us-central1',
	GEMINI_PROJECT_ID:
		process.env.GEMINI_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || process.env.FIREBASE_PROJECT_ID,
	FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
	FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL,
	FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY,
	DEFAULT_BOAT_ID: process.env.DEFAULT_BOAT_ID || 'jenny',
	IS_RUNNING_IN_GCP: isRunningInGcp(),
	HAS_SERVICE_ACCOUNT_ENV: hasServiceAccountEnv(),
	HAS_ADC_CREDENTIALS: hasApplicationDefaultCredentials(),
};

function validateConfig() {
	if (config.HAS_SERVICE_ACCOUNT_ENV || config.IS_RUNNING_IN_GCP || config.HAS_ADC_CREDENTIALS) {
		return;
	}

	throw new Error(
		[
			'Firebase Admin credentials missing.',
			'Local/dev: set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY in .env.',
			'Alternative local/dev: run `gcloud auth application-default login` (ADC).',
			'App Hosting / Cloud Run: default credentials are used automatically.',
		].join(' ')
	);
}

module.exports = {
	config,
	validateConfig,
};
