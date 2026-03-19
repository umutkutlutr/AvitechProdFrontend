import React from 'react';
import { AiOutlineClose } from 'react-icons/ai';
import './FilterChips.css';

/**
 * activeFilters: object { fieldKey: value } or array of { field, value, label }
 * onRemove: (fieldKey) => void
 * onClearAll: () => void
 */
const FilterChips = ({ activeFilters, onRemove, onClearAll, fieldLabels = {} }) => {
  const entries = Array.isArray(activeFilters)
    ? activeFilters
    : Object.entries(activeFilters || {}).map(([k, v]) => ({ field: k, value: v }));

  const chips = entries.filter((e) => e.value != null && String(e.value).trim() !== '');

  if (chips.length === 0) return null;

  const getLabel = (field) => fieldLabels[field] || field;

  return (
    <div className="filter-chips-wrapper">
      <span className="filter-chips-title">Aktif filtreler:</span>
      <div className="filter-chips-list">
        {chips.map((chip) => {
          const field = chip.field || chip.key;
          const value = chip.value;
          const displayLabel = chip.label || `${getLabel(field)}: ${value}`;
          return (
            <span key={field} className="filter-chip">
              {displayLabel}
              <button
                type="button"
                className="filter-chip-remove"
                onClick={() => onRemove && onRemove(field)}
                aria-label={`${displayLabel} filtresini kaldır`}
              >
                <AiOutlineClose />
              </button>
            </span>
          );
        })}
      </div>
      {onClearAll && chips.length > 1 && (
        <button type="button" className="filter-chips-clear-all" onClick={onClearAll}>
          Tümünü temizle
        </button>
      )}
    </div>
  );
};

export default FilterChips;
