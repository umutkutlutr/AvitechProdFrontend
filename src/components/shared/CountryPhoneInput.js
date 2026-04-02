import React, { useEffect, useMemo, useState } from 'react';
import {
  TOP_PHONE_COUNTRIES,
  DEFAULT_PHONE_COUNTRY_ISO,
  getPhoneCountryByIso,
  detectPhoneCountryFromValue,
  extractNationalDigits
} from '../../utils/phoneCountries';

function formatNationalDisplay(countryIso, nationalDigits) {
  const d = String(nationalDigits || '').replace(/\D/g, '');
  if (!d) return '';
  if (countryIso === 'TR') {
    if (d.length <= 3) return `(${d}`;
    let s = `(${d.slice(0, 3)}) ${d.slice(3, 6)}`;
    if (d.length > 6) s += ` ${d.slice(6, 8)}`;
    if (d.length > 8) s += ` ${d.slice(8, 10)}`;
    return s;
  }
  return d.replace(/(\d{3})(?=\d)/g, '$1 ').trim();
}

const CountryPhoneInput = ({
  id,
  name,
  value,
  onChange,
  disabled,
  placeholder = 'Telefon numarası'
}) => {
  const initialCountry = useMemo(() => detectPhoneCountryFromValue(value), [value]);
  const [countryIso, setCountryIso] = useState(initialCountry.iso || DEFAULT_PHONE_COUNTRY_ISO);
  const [nationalDigits, setNationalDigits] = useState(extractNationalDigits(value, initialCountry));

  useEffect(() => {
    const nextCountry = detectPhoneCountryFromValue(value);
    setCountryIso(nextCountry.iso || DEFAULT_PHONE_COUNTRY_ISO);
    setNationalDigits(extractNationalDigits(value, nextCountry));
  }, [value]);

  const displayValue = formatNationalDisplay(countryIso, nationalDigits);

  const emit = (iso, national) => {
    const c = getPhoneCountryByIso(iso);
    const digits = String(national || '').replace(/\D/g, '');
    const normalized = digits ? `+${c.dialCode}${digits}` : '';
    if (typeof onChange === 'function') {
      onChange({ target: { name, value: normalized } });
    }
  };

  const handleCountryChange = (e) => {
    const nextIso = e.target.value;
    setCountryIso(nextIso);
    emit(nextIso, nationalDigits);
  };

  const handlePhoneChange = (e) => {
    const nextDigits = String(e.target.value || '').replace(/\D/g, '').slice(0, 14);
    setNationalDigits(nextDigits);
    emit(countryIso, nextDigits);
  };

  return (
    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
      <select
        value={countryIso}
        onChange={handleCountryChange}
        disabled={disabled}
        style={{ width: '92px', minWidth: '92px' }}
      >
        {TOP_PHONE_COUNTRIES.map((c) => (
          <option key={c.iso} value={c.iso}>
            {c.flag} +{c.dialCode}
          </option>
        ))}
      </select>
      <input
        id={id}
        name={name}
        type="text"
        value={displayValue}
        onChange={handlePhoneChange}
        placeholder={placeholder}
        disabled={disabled}
        style={{ flex: 1 }}
      />
    </div>
  );
};

export default CountryPhoneInput;

