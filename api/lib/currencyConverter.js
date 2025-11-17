// lib/currencyConverter.js
// Basic currency conversion utility with static rates

// Static rates relative to USD (for demonstration; replace with live API in production)
const RATES = {
  USD: 1.0,
  EUR: 0.92,
  GBP: 0.79,
  INR: 83.0,
  CNY: 7.2,
};

/**
 * Convert an amount from one currency to another.
 * @param {number} amount - Amount in source currency
 * @param {string} from - Source currency code
 * @param {string} to - Target currency code
 * @returns {number} Converted amount rounded to 2 decimals
 */
function convertCurrency(amount, from, to) {
  const amountInUsd = amount / (RATES[from] || 1);
  const converted = amountInUsd * (RATES[to] || 1);
  return Math.round(converted * 100) / 100;
}

/**
 * Format a currency amount with symbol.
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency code
 * @returns {string} Formatted string
 */
function formatCurrency(amount, currency) {
  const symbols = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    INR: '₹',
    CNY: '¥',
  };
  return `${symbols[currency] || ''}${amount.toFixed(2)}`;
}

module.exports = { convertCurrency, formatCurrency };
