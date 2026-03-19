import React from 'react';
import { AiOutlineUnorderedList, AiOutlineAppstore } from 'react-icons/ai';
import './ViewToggle.css';

/**
 * viewMode: 'card' | 'table'
 * onViewModeChange: (mode) => void
 * storageKey: optional - to persist preference
 */
const ViewToggle = ({ viewMode, onViewModeChange, storageKey }) => {
  const handleChange = (mode) => {
    onViewModeChange(mode);
    if (storageKey) {
      try {
        localStorage.setItem(storageKey, mode);
      } catch (_) {}
    }
  };

  return (
    <div className="view-toggle">
      <button
        type="button"
        className={`view-toggle-btn ${viewMode === 'card' ? 'active' : ''}`}
        onClick={() => handleChange('card')}
        title="Kart görünümü"
      >
        <AiOutlineAppstore />
      </button>
      <button
        type="button"
        className={`view-toggle-btn ${viewMode === 'table' ? 'active' : ''}`}
        onClick={() => handleChange('table')}
        title="Tablo görünümü"
      >
        <AiOutlineUnorderedList />
      </button>
    </div>
  );
};

export default ViewToggle;
