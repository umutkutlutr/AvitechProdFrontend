import React from 'react';
import { AiOutlineLeft, AiOutlineRight } from 'react-icons/ai';
import './Pagination.css';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

const Pagination = ({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
  storageKey,
  label = 'kayıt',
  inline = false
}) => {
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  const handleItemsPerPageChange = (e) => {
    const val = parseInt(e.target.value, 10);
    onItemsPerPageChange(val);
    onPageChange(1);
    if (storageKey) {
      try {
        localStorage.setItem(storageKey, String(val));
      } catch (_) {}
    }
  };

  if (totalPages <= 1 && !onItemsPerPageChange) return null;

  return (
    <div className={`pagination-wrapper ${inline ? 'pagination-inline' : ''}`}>
      <div className="pagination-left">
        {onItemsPerPageChange && (
          <div className="pagination-page-size">
            <label>Sayfa başına:</label>
            <select
              value={itemsPerPage}
              onChange={handleItemsPerPageChange}
              className="pagination-select"
            >
              {PAGE_SIZE_OPTIONS.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
            <span className="pagination-page-size-label">{label}</span>
          </div>
        )}
        <span className="pagination-info">
          {totalItems > 0
            ? `${startItem}-${endItem} / ${totalItems} ${label}`
            : `0 ${label}`}
        </span>
      </div>
      {totalPages > 1 && (
        <div className="pagination-controls">
          <button
            type="button"
            className="pagination-btn"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            aria-label="Önceki sayfa"
          >
            <AiOutlineLeft />
          </button>
          <span className="pagination-pages">
            Sayfa {currentPage} / {totalPages}
          </span>
          <button
            type="button"
            className="pagination-btn"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            aria-label="Sonraki sayfa"
          >
            <AiOutlineRight />
          </button>
        </div>
      )}
    </div>
  );
};

export default Pagination;
export { PAGE_SIZE_OPTIONS };
