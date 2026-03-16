/**
 * Parse formatted number string (e.g. "3.000" or "1.234,56") to numeric value.
 * Supports: dot as thousands separator, dot or comma as decimal separator.
 */
export function parseFormattedNumber(value) {
  if (value === '' || value === null || value === undefined) return '';
  const str = String(value).trim();
  if (str === '' || str === '.' || str === ',') return '';
  // Replace comma with dot for decimal
  const withDotDecimal = str.replace(',', '.');
  const parts = withDotDecimal.split('.');
  // If multiple parts: last part 1-2 digits = decimal, else thousands
  if (parts.length > 1) {
    const last = parts[parts.length - 1];
    if (last.length <= 2 && /^\d+$/.test(last)) {
      const intPart = parts.slice(0, -1).join('').replace(/\D/g, '');
      const decPart = last;
      const num = parseFloat(`${intPart}.${decPart}`);
      return isNaN(num) ? '' : num;
    }
  }
  const noThousands = withDotDecimal.replace(/\./g, '');
  const parsed = parseFloat(noThousands.replace(/[^\d.-]/g, ''));
  return isNaN(parsed) ? '' : parsed;
}

/**
 * Format number for display in input (3.000 format - dot as thousands separator).
 * Preserves decimals if present.
 */
export function formatNumberForInput(value) {
  if (value === '' || value === null || value === undefined) return value === null || value === undefined ? '' : value;
  const str = String(value).trim();
  if (str === '' || str === '.') return str;
  const num = typeof value === 'number' ? value : parseFormattedNumber(str);
  if (num === '' || (typeof num === 'string' && str !== '')) return str;
  const numVal = typeof num === 'number' ? num : parseFloat(String(num).replace(',', '.'));
  if (isNaN(numVal)) return str;
  const fixed = Number.isInteger(numVal) ? String(numVal) : numVal.toFixed(2);
  const parts = fixed.split('.');
  const intPart = parts[0].replace(/\D/g, '') || '0';
  const decPart = parts[1] || '';
  const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  // Türkçe format: binlik ayırıcı nokta, ondalık virgül (3.000,50)
  return decPart ? `${formattedInt},${decPart}` : formattedInt;
}
