function sanitizeId(value) {
	return value
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9-_]/g, '-');
}

module.exports = {
	sanitizeId,
};
