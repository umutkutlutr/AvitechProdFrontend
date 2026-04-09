/**
 * Parse formatted number string (e.g. "3.000" or "1.234,56") to numeric value.
 * Supports: dot as thousands separator, dot or comma as decimal separator.
 */
export function parseFormattedNumber(value) {
  if (value === '' || value === null || value === undefined) return '';
  const str = String(value).trim();
  if (str === '' || str === '.' || str === ',') return '';
  // Trailing comma = user typing decimals (e.g. "1.234,") → parse as integer part only
  if (str.endsWith(',')) {
    const base = str.slice(0, -1).trim();
    if (base === '') return '';
    return parseFormattedNumber(base);
  }
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
  if (str === ',') return ',';

  // In-progress Turkish decimal: binlik nokta + virgül + en fazla 2 ondalık (yazarken kaybolmasın)
  const lastComma = str.lastIndexOf(',');
  if (lastComma !== -1) {
    const intPartStr = str.slice(0, lastComma);
    const decPartStr = str.slice(lastComma + 1);
    if (/^[\d.]*$/.test(intPartStr) && /^\d*$/.test(decPartStr) && decPartStr.length <= 2) {
      const intDigits = intPartStr.replace(/\./g, '');
      if (intDigits === '' && decPartStr === '') return ',';
      const intForFormat = intDigits === '' ? '0' : intDigits;
      const formattedInt = intForFormat.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
      if (decPartStr.length === 0) return `${formattedInt},`;
      return `${formattedInt},${decPartStr}`;
    }
  }

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
