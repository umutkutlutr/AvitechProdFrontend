import React from 'react';
import { AiOutlineCaretUp, AiOutlineCaretDown } from 'react-icons/ai';
import './SortableHeader.css';

/**
 * sortKey: current sort field
 * sortDir: 'asc' | 'desc'
 * fieldKey: this column's field
 * onSort: (fieldKey, dir) => void
 */
const SortableHeader = ({ children, sortKey, sortDir, fieldKey, onSort, className }) => {
  const isActive = sortKey === fieldKey;
  const handleClick = () => {
    if (!onSort) return;
    const nextDir = isActive && sortDir === 'asc' ? 'desc' : 'asc';
    onSort(fieldKey, nextDir);
  };

  return (
    <th
      className={`sortable-header ${isActive ? 'active' : ''} ${className || ''}`}
      onClick={onSort ? handleClick : undefined}
      style={onSort ? { cursor: 'pointer' } : {}}
    >
      <span className="sortable-header-content">
        {children}
        {onSort && (
          <span className="sortable-header-icons">
            <AiOutlineCaretUp className={isActive && sortDir === 'asc' ? 'active' : ''} />
            <AiOutlineCaretDown className={isActive && sortDir === 'desc' ? 'active' : ''} />
          </span>
        )}
      </span>
    </th>
  );
};

export default SortableHeader;
