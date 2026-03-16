import React, { useState, useEffect, useRef } from 'react';
import { AiOutlineFilter, AiOutlineClear, AiOutlinePlus, AiOutlineClose } from 'react-icons/ai';
import './AdminFilterPanel.css';

const AdminFilterPanel = ({ onFilter, onClear, adminData }) => {
    const [activeFilters, setActiveFilters] = useState([]); // Array of { field: '', value: '' }
    const [isExpanded, setIsExpanded] = useState(false);
    const [showAddDropdown, setShowAddDropdown] = useState(false);
    const [filterSearchTerm, setFilterSearchTerm] = useState('');
    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
    const addFilterContainerRef = useRef(null);
    const addFilterButtonRef = useRef(null);
    const dropdownRef = useRef(null);

    // Format date to Turkish format (DD.MM.YYYY)
    const formatDateTurkish = (dateString) => {
        if (!dateString) return '';
        try {
            // If already in Turkish format, return as is
            if (/^\d{2}\.\d{2}\.\d{4}$/.test(dateString)) {
                return dateString;
            }
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return dateString;
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();
            return `${day}.${month}.${year}`;
        } catch {
            return dateString;
        }
    };

    // Parse Turkish date format (DD.MM.YYYY) to ISO format (YYYY-MM-DD)
    const parseTurkishDate = (turkishDate) => {
        if (!turkishDate) return '';
        // Check if it's in Turkish format
        const match = turkishDate.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
        if (match) {
            const [, day, month, year] = match;
            return `${year}-${month}-${day}`;
        }
        return turkishDate;
    };

    // Handle Turkish date input change
    const handleDateInputChange = (index, value) => {
        // Allow typing with auto-formatting
        let formatted = value.replace(/[^\d.]/g, ''); // Only digits and dots

        // Auto-add dots as user types
        if (formatted.length === 2 && !formatted.includes('.')) {
            formatted += '.';
        } else if (formatted.length === 5 && formatted.split('.').length === 2) {
            formatted += '.';
        }

        // Limit to DD.MM.YYYY format (10 chars)
        if (formatted.length > 10) {
            formatted = formatted.substring(0, 10);
        }

        // Store in ISO format for filtering, but display in Turkish format
        if (/^\d{2}\.\d{2}\.\d{4}$/.test(formatted)) {
            // Complete date - convert to ISO for filtering
            const isoDate = parseTurkishDate(formatted);
            handleInputChange(index, isoDate);
        } else {
            // Incomplete date - store the Turkish format temporarily
            handleInputChange(index, formatted);
        }
    };

    // Get display value for date input
    const getDateDisplayValue = (value) => {
        if (!value) return '';
        // If it's an ISO date, convert to Turkish
        if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
            return formatDateTurkish(value);
        }
        return value;
    };

    // Extract unique values from existing data for each field
    const getUniqueValues = (field) => {
        if (!adminData || !adminData.length) return [];

        const values = adminData
            .map(item => {
                switch (field) {
                    case 'make':
                        return item.make;
                    case 'model':
                        return item.model;
                    case 'companySold':
                        return item.companySold;
                    case 'status':
                        return item.status;
                    default:
                        return item[field];
                }
            })
            .filter(value => value && value !== '' && value !== 'N/A')
            .filter((value, index, self) => self.indexOf(value) === index) // Remove duplicates
            .sort();

        return values;
    };

    // Available filter options based on admin panel columns (Excel kolonlarına uyumlu)
    const availableFilterOptions = [
        { key: 'projectCode', label: 'Proje Kodu', type: 'text', placeholder: 'Proje kodunu girin' },
        { key: 'make', label: 'Marka Model', type: 'select-or-text', placeholder: 'Marka/model seçin veya girin', options: () => getUniqueValues('make') },
        { key: 'model', label: 'Model (Yıl)', type: 'select-or-text', placeholder: 'Model/yıl seçin veya girin', options: () => getUniqueValues('model') },
        { key: 'year', label: 'Yıl', type: 'select-or-text', placeholder: 'Yıl seçin veya girin', options: () => getUniqueValues('year') },
        { key: 'status', label: 'Durum', type: 'select', placeholder: 'Durum seçin', options: () => ['SATILDI', 'STOKTA'] },
        { key: 'companySold', label: 'Satılan Firma', type: 'select-or-text', placeholder: 'Firma seçin veya girin', options: () => getUniqueValues('companySold') },
        { key: 'purchaseDate', label: 'Alış Tarihi', type: 'date', placeholder: 'Tarih seçin' },
        { key: 'saleDate', label: 'Satış Tarihi', type: 'date', placeholder: 'Tarih seçin' },
    ];

    // Get available options that haven't been added yet
    const getAvailableOptions = () => {
        const activeFields = activeFilters.map(f => f.field);
        let available = availableFilterOptions.filter(opt => !activeFields.includes(opt.key));

        // Apply search filter
        if (filterSearchTerm.trim()) {
            const searchLower = filterSearchTerm.toLowerCase();
            available = available.filter(opt =>
                opt.label.toLowerCase().includes(searchLower) ||
                opt.key.toLowerCase().includes(searchLower)
            );
        }

        return available;
    };

    // Handle adding a new filter field
    const handleAddFilter = (fieldKey) => {
        const option = availableFilterOptions.find(opt => opt.key === fieldKey);
        if (option) {
            setActiveFilters(prev => [...prev, {
                field: fieldKey,
                value: '',
                label: option.label,
                type: option.type,
                placeholder: option.placeholder,
                options: option.options ? option.options() : []
            }]);
        }
        setShowAddDropdown(false);
        setFilterSearchTerm('');
    };

    // Handle opening/closing dropdown
    const toggleAddDropdown = () => {
        if (!showAddDropdown && addFilterButtonRef.current) {
            const buttonRect = addFilterButtonRef.current.getBoundingClientRect();
            const dropdownHeight = 350;
            const spacing = 8;
            const viewportHeight = window.innerHeight;

            let topPosition = buttonRect.top - dropdownHeight - spacing;

            if (topPosition < 0) {
                topPosition = buttonRect.bottom + spacing;
                if (topPosition + dropdownHeight > viewportHeight) {
                    topPosition = Math.max(10, viewportHeight - dropdownHeight - 10);
                }
            }

            const dropdownWidth = 350;
            let leftPosition = buttonRect.left;
            if (leftPosition + dropdownWidth > window.innerWidth) {
                leftPosition = window.innerWidth - dropdownWidth - 10;
            }
            if (leftPosition < 10) {
                leftPosition = 10;
            }

            setDropdownPosition({
                top: topPosition,
                left: leftPosition
            });
            setFilterSearchTerm('');
        }
        setShowAddDropdown(!showAddDropdown);
    };

    // Handle removing a filter field
    const handleRemoveFilter = (index) => {
        const updatedFilters = activeFilters.filter((_, i) => i !== index);
        setActiveFilters(updatedFilters);

        // Apply remaining filters
        const filters = {};
        updatedFilters.forEach(filter => {
            if (filter.value !== '') {
                filters[filter.field] = filter.value;
            }
        });

        if (Object.keys(filters).length > 0) {
            onFilter(filters);
        } else {
            onClear();
        }
    };

    // Handle input value change
    const handleInputChange = (index, value) => {
        setActiveFilters(prev => prev.map((filter, i) =>
            i === index ? { ...filter, value } : filter
        ));
    };

    // Convert active filters to object format
    const getFiltersObject = () => {
        const filters = {};
        activeFilters.forEach(filter => {
            if (filter.value !== '') {
                filters[filter.field] = filter.value;
            }
        });
        return filters;
    };

    // Auto-apply filter when values change (debounced)
    useEffect(() => {
        const timer = setTimeout(() => {
            if (activeFilters.length > 0) {
                const filters = getFiltersObject();
                if (Object.keys(filters).length > 0) {
                    onFilter(filters);
                }
            }
        }, 300);

        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeFilters]);

    // Clear all filters
    const handleClearFilters = () => {
        setActiveFilters([]);
        onClear();
    };

    const hasActiveFilters = activeFilters.some(f => f.value !== '');
    const availableOptions = getAvailableOptions();

    // Close dropdown when clicking outside
    useEffect(() => {
        if (!showAddDropdown) return;

        const handleClickOutside = (event) => {
            const isClickOutside =
                addFilterContainerRef.current &&
                !addFilterContainerRef.current.contains(event.target) &&
                !event.target.closest('.admin-filter-dropdown');

            if (isClickOutside) {
                setShowAddDropdown(false);
                setFilterSearchTerm('');
            }
        };

        const handleScroll = () => {
            setShowAddDropdown(false);
            setFilterSearchTerm('');
        };

        document.addEventListener('mousedown', handleClickOutside);
        window.addEventListener('scroll', handleScroll, false);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            window.removeEventListener('scroll', handleScroll, false);
        };
    }, [showAddDropdown]);

    return (
        <div className="admin-filter-panel-container">
            <div className="admin-filter-header">
                <button
                    className="admin-filter-toggle-button"
                    onClick={() => setIsExpanded(!isExpanded)}
                >
                    <AiOutlineFilter className="admin-filter-icon" />
                    <span>Filtreler</span>
                    {hasActiveFilters && <span className="admin-active-indicator"></span>}
                </button>

                {hasActiveFilters && (
                    <button
                        className="admin-clear-filters-button"
                        onClick={handleClearFilters}
                        title="Filtreleri Temizle"
                    >
                        <AiOutlineClear />
                        <span>Temizle</span>
                    </button>
                )}
            </div>

            {isExpanded && (
                <div className="admin-filter-content">
                    <div className="admin-filter-fields-container">
                        {activeFilters.map((filter, index) => (
                            <div key={`${filter.field}-${index}`} className="admin-filter-field-row">
                                <div className="admin-filter-field">
                                    <label>{filter.label}</label>

                                    {/* Select dropdown */}
                                    {filter.type === 'select' && (
                                        <select
                                            value={filter.value}
                                            onChange={(e) => handleInputChange(index, e.target.value)}
                                        >
                                            <option value="">{filter.placeholder}</option>
                                            {filter.options && filter.options.map(opt => (
                                                <option key={opt} value={opt}>{opt}</option>
                                            ))}
                                        </select>
                                    )}

                                    {/* Select or text input with datalist */}
                                    {filter.type === 'select-or-text' && (
                                        <>
                                            <input
                                                type="text"
                                                list={`admin-${filter.field}-datalist-${index}`}
                                                placeholder={filter.placeholder}
                                                value={filter.value}
                                                onChange={(e) => handleInputChange(index, e.target.value)}
                                            />
                                            <datalist id={`admin-${filter.field}-datalist-${index}`}>
                                                {filter.options && filter.options.map(opt => (
                                                    <option key={opt} value={opt} />
                                                ))}
                                            </datalist>
                                        </>
                                    )}

                                    {/* Date input - Turkish format (GG.AA.YYYY) */}
                                    {filter.type === 'date' && (
                                        <div className="admin-date-filter-wrapper">
                                            <input
                                                type="text"
                                                placeholder="GG.AA.YYYY"
                                                value={getDateDisplayValue(filter.value)}
                                                onChange={(e) => handleDateInputChange(index, e.target.value)}
                                                maxLength={10}
                                                className="admin-date-input"
                                            />
                                            <span className="admin-date-hint">Örn: 23.12.2025</span>
                                        </div>
                                    )}

                                    {/* Regular text input */}
                                    {filter.type === 'text' && (
                                        <input
                                            type="text"
                                            placeholder={filter.placeholder}
                                            value={filter.value}
                                            onChange={(e) => handleInputChange(index, e.target.value)}
                                        />
                                    )}
                                </div>
                                <button
                                    className="admin-remove-filter-button"
                                    onClick={() => handleRemoveFilter(index)}
                                    title="Filtreyi Kaldır"
                                >
                                    <AiOutlineClose />
                                </button>
                            </div>
                        ))}

                        {(availableOptions.length > 0 || filterSearchTerm) && (
                            <div className="admin-add-filter-container" ref={addFilterContainerRef}>
                                <button
                                    ref={addFilterButtonRef}
                                    className="admin-add-filter-button"
                                    onClick={toggleAddDropdown}
                                >
                                    <AiOutlinePlus />
                                    <span>Filtre Ekle</span>
                                </button>
                                {showAddDropdown && (
                                    <div
                                        ref={dropdownRef}
                                        className="admin-filter-dropdown"
                                        style={{
                                            top: `${dropdownPosition.top}px`,
                                            left: `${dropdownPosition.left}px`
                                        }}
                                    >
                                        <div className="admin-filter-dropdown-search">
                                            <input
                                                type="text"
                                                placeholder="Filtre ara..."
                                                value={filterSearchTerm}
                                                onChange={(e) => setFilterSearchTerm(e.target.value)}
                                                className="admin-filter-search-input"
                                                autoFocus
                                            />
                                        </div>
                                        <div
                                            className="admin-filter-dropdown-list"
                                            onScroll={(e) => e.stopPropagation()}
                                        >
                                            {availableOptions.length > 0 ? (
                                                availableOptions.map(option => (
                                                    <button
                                                        key={option.key}
                                                        className="admin-filter-dropdown-item"
                                                        onClick={() => handleAddFilter(option.key)}
                                                    >
                                                        {option.label}
                                                    </button>
                                                ))
                                            ) : (
                                                <div className="admin-filter-dropdown-empty">
                                                    Filtre bulunamadı
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminFilterPanel;
