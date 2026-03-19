import React, { useState, useRef, useEffect } from 'react';
import { AiOutlineEye, AiOutlineDown } from 'react-icons/ai';
import './ColumnVisibility.css';

/**
 * columns: [{ key, label }]
 * visibleKeys: Set or array of visible column keys
 * onVisibilityChange: (visibleKeys) => void
 * storageKey: optional
 */
const ColumnVisibility = ({ columns, visibleKeys, onVisibilityChange, storageKey }) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef(null);

  const visibleSet = new Set(Array.isArray(visibleKeys) ? visibleKeys : [...(visibleKeys || [])]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleColumn = (key) => {
    const next = new Set(visibleSet);
    if (next.has(key)) {
      if (next.size <= 1) return;
      next.delete(key);
    } else {
      next.add(key);
    }
    onVisibilityChange(next);
    if (storageKey) {
      try {
        localStorage.setItem(storageKey, JSON.stringify([...next]));
      } catch (_) {}
    }
  };

  return (
    <div className="column-visibility" ref={ref}>
      <button
        type="button"
        className="column-visibility-trigger"
        onClick={() => setIsOpen(!isOpen)}
        title="Sütunları özelleştir"
      >
        <AiOutlineEye />
        <AiOutlineDown className={`column-visibility-arrow ${isOpen ? 'open' : ''}`} />
      </button>
      {isOpen && (
        <div className="column-visibility-dropdown">
          {columns.map((col) => (
            <label key={col.key} className="column-visibility-item">
              <input
                type="checkbox"
                checked={visibleSet.has(col.key)}
                onChange={() => toggleColumn(col.key)}
                disabled={visibleSet.has(col.key) && visibleSet.size === 1}
              />
              <span>{col.label}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
};

export default ColumnVisibility;
