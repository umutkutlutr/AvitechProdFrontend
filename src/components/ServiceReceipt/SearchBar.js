import React, { useState, useEffect } from 'react';
import { AiOutlineSearch, AiOutlineClear } from 'react-icons/ai';
import './SearchBar.css';

const SearchBar = ({ onSearch, placeholder = "Projelerde ara..." }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // Debounce search to avoid too many API calls
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm.trim()) {
        setIsSearching(true);
        onSearch(searchTerm.trim());
      } else {
        onSearch('');
      }
    }, 500);

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]); // onSearch is intentionally omitted to prevent infinite loop

  const handleClear = () => {
    setSearchTerm('');
    onSearch('');
  };

  const handleInputChange = (e) => {
    setSearchTerm(e.target.value);
  };

  return (
    <div className="search-bar-container">
      <div className="search-input-wrapper">
        <AiOutlineSearch className="search-icon" />
        <input
          type="text"
          className="search-input"
          placeholder={placeholder}
          value={searchTerm}
          onChange={handleInputChange}
        />
        {searchTerm && (
          <button 
            className="clear-button" 
            onClick={handleClear}
            title="Temizle"
          >
            <AiOutlineClear />
          </button>
        )}
      </div>
    </div>
  );
};

export default SearchBar;
