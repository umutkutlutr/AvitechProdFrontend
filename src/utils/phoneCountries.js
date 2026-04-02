export const TOP_PHONE_COUNTRIES = [
  { iso: 'TR', name: 'Turkey', dialCode: '90', flag: '🇹🇷' },
  { iso: 'US', name: 'United States', dialCode: '1', flag: '🇺🇸' },
  { iso: 'GB', name: 'United Kingdom', dialCode: '44', flag: '🇬🇧' },
  { iso: 'DE', name: 'Germany', dialCode: '49', flag: '🇩🇪' },
  { iso: 'FR', name: 'France', dialCode: '33', flag: '🇫🇷' },
  { iso: 'IT', name: 'Italy', dialCode: '39', flag: '🇮🇹' },
  { iso: 'ES', name: 'Spain', dialCode: '34', flag: '🇪🇸' },
  { iso: 'NL', name: 'Netherlands', dialCode: '31', flag: '🇳🇱' },
  { iso: 'BE', name: 'Belgium', dialCode: '32', flag: '🇧🇪' },
  { iso: 'CH', name: 'Switzerland', dialCode: '41', flag: '🇨🇭' },
  { iso: 'AT', name: 'Austria', dialCode: '43', flag: '🇦🇹' },
  { iso: 'SE', name: 'Sweden', dialCode: '46', flag: '🇸🇪' },
  { iso: 'NO', name: 'Norway', dialCode: '47', flag: '🇳🇴' },
  { iso: 'DK', name: 'Denmark', dialCode: '45', flag: '🇩🇰' },
  { iso: 'PL', name: 'Poland', dialCode: '48', flag: '🇵🇱' },
  { iso: 'RU', name: 'Russia', dialCode: '7', flag: '🇷🇺' },
  { iso: 'AE', name: 'United Arab Emirates', dialCode: '971', flag: '🇦🇪' },
  { iso: 'SA', name: 'Saudi Arabia', dialCode: '966', flag: '🇸🇦' },
  { iso: 'CN', name: 'China', dialCode: '86', flag: '🇨🇳' },
  { iso: 'IN', name: 'India', dialCode: '91', flag: '🇮🇳' },
];

export const DEFAULT_PHONE_COUNTRY_ISO = 'TR';

export function getPhoneCountryByIso(iso) {
  return TOP_PHONE_COUNTRIES.find((c) => c.iso === iso) || TOP_PHONE_COUNTRIES[0];
}

export function detectPhoneCountryFromValue(rawValue) {
  const raw = String(rawValue || '').trim();
  const digits = raw.replace(/\D/g, '');
  if (!digits) return getPhoneCountryByIso(DEFAULT_PHONE_COUNTRY_ISO);

  const sortedByDialLength = [...TOP_PHONE_COUNTRIES].sort((a, b) => b.dialCode.length - a.dialCode.length);
  const fromPlus = raw.startsWith('+') ? digits : '';
  const candidate = fromPlus || (digits.length > 10 ? digits : '');
  const hit = sortedByDialLength.find((c) => candidate.startsWith(c.dialCode));
  return hit || getPhoneCountryByIso(DEFAULT_PHONE_COUNTRY_ISO);
}

export function extractNationalDigits(rawValue, country) {
  const raw = String(rawValue || '').trim();
  let digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  if (raw.startsWith('+') && country && digits.startsWith(country.dialCode)) {
    digits = digits.slice(country.dialCode.length);
  }
  if (country?.iso === 'TR' && digits.startsWith('0') && digits.length >= 11) {
    digits = digits.slice(1);
  }
  return digits.slice(0, 14);
}

