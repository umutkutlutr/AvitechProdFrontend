// Currency conversion service
// Primary: Backend TCMB proxy (no CORS issues), Fallback: exchangerate-api.com, Last resort: hardcoded rates

import API_BASE_URL from '../config';
import authService from './authService';

// Fallback API (free, reliable)
const FALLBACK_API_URL = 'https://api.exchangerate-api.com/v4/latest/EUR';

// Hardcoded fallback rates - direct TRY rates (1 EUR = X TRY)
const FALLBACK_RATES = {
  EUR: 38.50,  // 1 EUR = 38.50 TRY
  USD: 36.80,  // 1 USD = 36.80 TRY
  TRY: 1.0
};

/**
 * Fetches exchange rates from backend TCMB proxy
 * @returns {Promise<Object|null>} Exchange rates or null if failed
 */
const fetchTCMBRates = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/exchange-rates`, {
      headers: authService.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Backend TCMB proxy HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (data.source === 'fallback') {
      console.warn('Backend TCMB proxy returned fallback rates:', data.error);
      // Still use them as they come from the backend
    }

    // Use direct TRY rates from the backend `rates` map (1 EUR = X TRY, 1 USD = Y TRY)
    const directRates = data.rates || {};
    return {
      EUR: directRates.EUR || data.EUR_TRY || FALLBACK_RATES.EUR,
      USD: directRates.USD || data.USD_TRY || FALLBACK_RATES.USD,
      TRY: 1.0,
      source: data.source === 'TCMB' ? 'TCMB' : 'TCMB (fallback)',
      timestamp: data.timestamp || new Date().toISOString()
    };
  } catch (error) {
    console.warn('Backend TCMB proxy failed:', error.message);
    return null;
  }
};

/**
 * Fetches exchange rates from fallback API (exchangerate-api.com)
 * @returns {Promise<Object|null>} Exchange rates or null if failed
 */
const fetchFallbackRates = async () => {
  try {
    const response = await fetch(FALLBACK_API_URL);

    if (!response.ok) {
      throw new Error(`Fallback API HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    // Convert EUR-based rates to direct TRY rates (1 EUR = X TRY, 1 USD = Y TRY)
    const eurTry = data.rates.TRY || FALLBACK_RATES.EUR;
    const eurUsd = data.rates.USD || 1.05;
    return {
      EUR: eurTry,
      USD: eurTry / eurUsd,
      TRY: 1.0,
      source: 'exchangerate-api.com',
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.warn('Fallback API failed:', error.message);
    return null;
  }
};

/**
 * Fetches current exchange rates for EUR
 * Priority: 1. TCMB (via backend proxy), 2. exchangerate-api.com, 3. hardcoded fallback
 * @returns {Promise<Object>} Object containing exchange rates
 */
export const getExchangeRates = async () => {
  // Try TCMB first (via backend proxy - no CORS issues)
  let rates = await fetchTCMBRates();

  if (rates) {
    console.log('Using TCMB rates via backend proxy');
    return rates;
  }

  // If TCMB fails, try Exchange API
  rates = await fetchFallbackRates();

  if (rates) {
    console.log('Using exchangerate-api.com rates (TCMB unavailable)');
    return rates;
  }

  // If all APIs fail, use hardcoded fallback
  // Return direct TRY rates: 1 EUR = X TRY, 1 USD = Y TRY
  console.warn('All APIs failed, using hardcoded fallback rates');
  return {
    EUR: FALLBACK_RATES.EUR,
    USD: FALLBACK_RATES.USD,
    TRY: 1.0,
    source: 'fallback (offline)',
    timestamp: new Date().toISOString(),
    isOffline: true
  };
};

/**
 * Converts amount from one currency to another
 * @param {number} amount - Amount to convert
 * @param {string} fromCurrency - Source currency code
 * @param {string} toCurrency - Target currency code
 * @param {Object} rates - Exchange rates object
 * @returns {number} Converted amount
 */
export const convertCurrency = (amount, fromCurrency, toCurrency, rates) => {
  if (!fromCurrency || amount === '' || amount === null || amount === undefined) {
    return 0;
  }

  if (fromCurrency === toCurrency) {
    return amount;
  }

  if (!rates || !rates[fromCurrency]) {
    return 0;
  }

  // rates are direct TRY rates: rates[EUR]=38.50, rates[USD]=36.80, rates[TRY]=1.0
  const tryAmount = amount * rates[fromCurrency];
  const convertedAmount = tryAmount / rates[toCurrency];

  return convertedAmount;
};

/**
 * Formats currency value with proper symbol
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency code
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (amount, currency) => {
  const symbols = {
    EUR: '€',
    TRY: '₺',
    USD: '$'
  };

  const symbol = symbols[currency] || currency;
  const formattedAmount = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);

  return `${symbol}${formattedAmount}`;
};
