/**
 * Formats a numeric money value to a currency string.
 * Example: 245000 -> ₹2,45,000.00
 * @param {number} amount - The numeric amount
 * @param {string} currency - The currency code (default: INR)
 * @returns {string} Formatted currency string
 */
export const formatMoney = (amount, currency = 'INR') => {
  if (amount === undefined || amount === null) return '';
  
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

/**
 * Formats an ISO date string to a human-readable date.
 * Example: 2026-09-05T10:30:00Z -> Sep 5, 2026
 * @param {string} isoString - The ISO date string
 * @returns {string} Formatted date string
 */
export const formatDate = (isoString) => {
  if (!isoString) return '';
  const date = new Date(isoString);
  
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
};

/**
 * Formats an ISO date string to a human-readable date and time.
 * @param {string} isoString - The ISO date string
 * @returns {string} Formatted date and time string
 */
export const formatDateTime = (isoString) => {
  if (!isoString) return '';
  const date = new Date(isoString);
  
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
};

/**
 * Formats a percentage.
 * Example: 24.5 -> 24.5%
 * @param {number} value - The percentage value
 * @returns {string} Formatted percentage
 */
export const formatPercent = (value) => {
  if (value === undefined || value === null) return '';
  return `${value}%`;
};
