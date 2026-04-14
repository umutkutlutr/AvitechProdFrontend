import React, { useState, useRef, useEffect } from 'react';
import './AutocompleteInput.css';

// Sabit boş dizi - undefined suggestions için aynı referans (sonsuz döngü önleme)
const EMPTY_SUGGESTIONS = [];

const AutocompleteInput = ({
    value,
    onChange,
    onBlur,
    onKeyPress,
    onSelect,
    suggestions,
    placeholder,
    className = '',
    errorClass = '',
    disabled = false,
    type = 'text'
}) => {
    const safeSuggestions = Array.isArray(suggestions) ? suggestions : EMPTY_SUGGESTIONS;
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [filteredSuggestions, setFilteredSuggestions] = useState([]);
    const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
    const wrapperRef = useRef(null);
    const suggestionsRef = useRef(null);

    // Close suggestions when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setShowSuggestions(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Filter suggestions based on input value
    useEffect(() => {
        if (value && safeSuggestions.length > 0) {
            const filtered = safeSuggestions.filter(suggestion =>
                String(suggestion).toLowerCase().includes(String(value).toLowerCase())
            );
            setFilteredSuggestions(filtered);
        } else {
            setFilteredSuggestions(safeSuggestions);
        }
    }, [value, safeSuggestions]);

    const handleInputChange = (e) => {
        const newValue = e.target.value;
        onChange(e);
        setShowSuggestions(true);
        setActiveSuggestionIndex(-1);
    };

    const handleInputFocus = () => {
        if (safeSuggestions.length > 0) {
            setShowSuggestions(true);
        }
    };

    const handleInputBlur = (e) => {
        // Delay to allow click on suggestion
        setTimeout(() => {
            setShowSuggestions(false);
            if (onBlur) {
                onBlur(e);
            }
        }, 200);
    };

    const handleSuggestionClick = (suggestion) => {
        // Create a synthetic event-like object
        const syntheticEvent = {
            target: {
                value: suggestion
            }
        };
        onChange(syntheticEvent);
        setShowSuggestions(false);
        setActiveSuggestionIndex(-1);
        if (onSelect) onSelect(suggestion);
    };

    const handleKeyDown = (e) => {
        // Arrow down
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveSuggestionIndex(prev =>
                prev < filteredSuggestions.length - 1 ? prev + 1 : prev
            );
        }
        // Arrow up
        else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveSuggestionIndex(prev => prev > 0 ? prev - 1 : -1);
        }
        // Enter
        else if (e.key === 'Enter') {
            e.preventDefault();
            if (activeSuggestionIndex >= 0 && activeSuggestionIndex < filteredSuggestions.length) {
                handleSuggestionClick(filteredSuggestions[activeSuggestionIndex]);
            } else if (onKeyPress) {
                onKeyPress(e);
            }
        }
        // Escape
        else if (e.key === 'Escape') {
            setShowSuggestions(false);
            setActiveSuggestionIndex(-1);
        }
    };

    // Scroll active suggestion into view
    useEffect(() => {
        if (activeSuggestionIndex >= 0 && suggestionsRef.current) {
            const activeElement = suggestionsRef.current.children[activeSuggestionIndex];
            if (activeElement) {
                activeElement.scrollIntoView({
                    block: 'nearest',
                    behavior: 'smooth'
                });
            }
        }
    }, [activeSuggestionIndex]);

    return (
        <div className={`autocomplete-wrapper ${showSuggestions && filteredSuggestions.length > 0 ? 'open' : ''}`} ref={wrapperRef}>
            <input
                type={type}
                value={value}
                onChange={handleInputChange}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                className={`${className} ${errorClass}`}
                disabled={disabled}
            />
            {showSuggestions && filteredSuggestions.length > 0 && (
                <div className="autocomplete-suggestions" ref={suggestionsRef}>
                    {filteredSuggestions.map((suggestion, index) => (
                        <div
                            key={index}
                            className={`autocomplete-suggestion-item ${index === activeSuggestionIndex ? 'active' : ''}`}
                            onClick={() => handleSuggestionClick(suggestion)}
                        >
                            {suggestion}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default AutocompleteInput;
