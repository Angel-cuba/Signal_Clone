/**
 * Normalizes a chat name to Title-like case and truncates it to 20 characters
 * with a trailing ellipsis if needed.
 *
 * Safe for empty / undefined input — returns '' rather than crashing.
 *
 * @param {string} name
 * @returns {string}
 */
export const truncateName = (name = '') => {
	if (!name) return '';
	const normalized = name[0].toUpperCase() + name.slice(1);
	return normalized.length > 20 ? normalized.slice(0, 19) + '…' : normalized;
};
