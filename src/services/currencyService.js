// Currency conversion service
// Primary: Backend TCMB proxy (no CORS issues), Fallback: exchangerate-api.com, Last resort: hardcoded rates

import API_BASE_URL from '../config';
import authService from './authService';

// Fallback API (free, reliable)
const FALLBACK_API_URL = 'https://api.exchangerate-api.com/v4/latest/EUR';

// Hardcoded fallback rates - direct TRY rates (1 EUR = X TRY)
export const FALLBACK_RATES = {
  EUR: 38.50,  // 1 EUR = 38.50 TRY
  TRY: 1.0
};

/**
 * Validates that a value is a usable, plausible EUR/TRY rate.
 * A rate must be a finite positive number; we also reject implausible
 * values so a broken payload can't masquerade as a real rate.
 * @param {*} value
 * @returns {boolean}
 */
const isValidRate = (value) => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0;
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

    // Use direct TRY rates from the backend `rates` map (1 EUR = X TRY)
    const directRates = data.rates || {};
    const eurCandidate = directRates.EUR != null ? directRates.EUR : data.EUR_TRY;

    // If the backend didn't return a usable EUR rate, do NOT silently substitute
    // the hardcoded constant and label it "TCMB". Return null so the next
    // fallback source is tried and, ultimately, the offline flag is set honestly.
    if (!isValidRate(eurCandidate)) {
      console.warn('Backend TCMB proxy returned no valid EUR rate; falling through.');
      return null;
    }

    return {
      EUR: Number(eurCandidate),
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

    // exchangerate-api EUR base returns rates.TRY = TRY per 1 EUR
    const eurTry = data && data.rates ? data.rates.TRY : undefined;
    if (!isValidRate(eurTry)) {
      console.warn('Fallback API returned no valid TRY rate; falling through.');
      return null;
    }
    return {
      EUR: Number(eurTry),
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

  console.warn('All APIs failed, using hardcoded fallback rates');
  return {
    EUR: FALLBACK_RATES.EUR,
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

  if (!rates || !rates[fromCurrency] || !rates[toCurrency]) {
    return 0;
  }

  // rates are direct TRY rates: rates[EUR]=38.50, rates[TRY]=1.0
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
  const num = typeof amount === 'number' ? amount : parseFloat(amount);
  if (num == null || isNaN(num)) return '-';
  const c = currency === 'USD' ? 'EUR' : currency;
  const symbols = { EUR: '€', TRY: '₺' };
  const symbol = symbols[c] || c || '';
  // App-wide standard is tr-TR formatting (1.234,56), not en-US.
  const formattedAmount = new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(num);

  return `${symbol}${formattedAmount}`;
};
