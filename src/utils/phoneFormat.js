/**
 * Türkiye telefonları: görünüm +90 (534) 597 72 36
 * Formlarda ulusal 10 hane (5xxxxxxxxx) saklanır.
 */
import { detectPhoneCountryFromValue, extractNationalDigits } from './phoneCountries';

export function digitsOnlyNational10(raw) {
  if (raw == null || String(raw).trim() === '') return '';
  let d = String(raw).replace(/\D/g, '');
  if (d.startsWith('90') && d.length > 2) {
    d = d.slice(2);
  }
  if (d.startsWith('0') && d.length >= 11) {
    d = d.slice(1);
  }
  return d.slice(0, 10);
}

export function normalizeNational10Digits(raw) {
  const d = digitsOnlyNational10(raw);
  return d.length === 10 ? d : null;
}

/** Salt okunur listeler / özet: 10 hane tanınmazsa ham metin */
export function formatPhoneTrDisplay(raw) {
  const d = normalizeNational10Digits(raw);
  if (!d) return null;
  return `+90 (${d.slice(0, 3)}) ${d.slice(3, 6)} ${d.slice(6, 8)} ${d.slice(8, 10)}`;
}

export function formatPhoneTrDisplayOrDash(raw) {
  if (raw == null || String(raw).trim() === '') return '-';
  return formatPhoneTrDisplay(raw) ?? String(raw).trim();
}

export function formatPhoneDisplay(raw) {
  const s = String(raw || '').trim();
  if (!s) return null;
  const tr = formatPhoneTrDisplay(s);
  if (tr) return tr;

  const country = detectPhoneCountryFromValue(s);
  const national = extractNationalDigits(s, country);
  if (!national) return s;
  return `+${country.dialCode} ${national.replace(/(\d{3})(?=\d)/g, '$1 ').trim()}`;
}

export function formatPhoneDisplayOrDash(raw) {
  if (raw == null || String(raw).trim() === '') return '-';
  return formatPhoneDisplay(raw) ?? String(raw).trim();
}

export function formatPhoneInputBodyFromDigits(rawDigits) {
  const d = digitsOnlyNational10(rawDigits);
  if (!d.length) return '';
  if (d.length <= 3) {
    return `(${d}`;
  }
  let s = `(${d.slice(0, 3)}) ${d.slice(3, 6)}`;
  if (d.length > 6) s += ` ${d.slice(6, 8)}`;
  if (d.length > 8) s += ` ${d.slice(8, 10)}`;
  return s.trim();
}

export function getPhoneInputDisplayValue(storedDigitsOrRaw) {
  const body = formatPhoneInputBodyFromDigits(storedDigitsOrRaw);
  if (!body) return '+90 ';
  return `+90 ${body}`;
}

export function extractNationalDigitsFromPhoneInput(displayValue) {
  return digitsOnlyNational10(String(displayValue || '').replace(/^\+90\s*/i, ''));
}

/** API’den gelen değer: 10 hane tanınırsa maske; değilse ham metin (ör. kısa kod). */
export function formatPhoneForEditableOfferField(raw) {
  if (raw == null || String(raw).trim() === '') return '';
  const d = digitsOnlyNational10(raw);
  if (d.length === 10) return getPhoneInputDisplayValue(d);
  return String(raw).trim();
}
