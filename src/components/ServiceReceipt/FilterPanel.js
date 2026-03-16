import React, { useState, useEffect, useRef } from 'react';
import { AiOutlineFilter, AiOutlineClear, AiOutlinePlus, AiOutlineClose } from 'react-icons/ai';
import projectService from '../../services/projectService';
import { normalizeProjectCard } from '../../utils/projectNormalizer';
import './FilterPanel.css';

const FilterPanel = ({ onFilter, onClear }) => {
  const [activeFilters, setActiveFilters] = useState([]); // Array of { field: '', value: '' }
  const [isExpanded, setIsExpanded] = useState(false);
  const [isFiltering, setIsFiltering] = useState(false);
  const [showAddDropdown, setShowAddDropdown] = useState(false);
  const [existingProjects, setExistingProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [filterSearchTerm, setFilterSearchTerm] = useState('');
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const addFilterContainerRef = useRef(null);
  const addFilterButtonRef = useRef(null);
  const dropdownRef = useRef(null);

  // Load existing projects for autocomplete options
  useEffect(() => {
    const loadProjects = async () => {
      setLoadingProjects(true);
      try {
        const projects = await projectService.getProjects();
        setExistingProjects(projects);
      } catch (error) {
        console.error('Error loading projects for filters:', error);
      } finally {
        setLoadingProjects(false);
      }
    };
    loadProjects();
  }, []);

  // Extract unique values from existing projects for each field (use normalizer for canonical fields)
  const getUniqueValues = (field) => {
    if (!existingProjects.length) return [];
    
    const values = existingProjects
      .map(project => {
        const n = normalizeProjectCard(project);
        switch(field) {
          case 'make':
          case 'machineName':
            return n.machineName || n.make || n.title;
          case 'model':
            return n.model;
          case 'year':
            return n.year != null ? n.year : project.year;
          case 'serialNumber':
            return n.serialNumber;
          case 'xMovement':
            return project.xmovement || project.xMovement;
          case 'yMovement':
            return project.ymovement || project.yMovement;
          case 'zMovement':
            return project.zmovement || project.zMovement;
          case 'aMovement':
            return project.amovement || project.aMovement;
          case 'bMovement':
            return project.bmovement || project.bMovement;
          case 'cMovement':
            return project.cmovement || project.cMovement;
          case 'holderType':
            return project.holderType;
          case 'operatingSystem':
            return project.operatingSystem;
          default:
            return project[field];
        }
      })
      .filter(value => value && value !== '' && value !== 'N/A')
      .filter((value, index, self) => self.indexOf(value) === index) // Remove duplicates
      .sort();
    
    return values;
  };

  // Available filter options - ALL fields from CreateServiceReceipt
  const availableFilterOptions = [
    { key: 'projectCode', label: 'Proje Kodu', type: 'text', placeholder: 'Proje kodunu girin' },
    { key: 'machineName', label: 'Makine Markası', type: 'select-or-text', placeholder: 'Marka seçin veya girin', options: () => getUniqueValues('machineName') },
    { key: 'model', label: 'Makine Modeli', type: 'select-or-text', placeholder: 'Model seçin veya girin', options: () => getUniqueValues('model') },
    { key: 'year', label: 'Yıl', type: 'number', placeholder: 'Yıl girin', min: '1900', max: '2030' },
    { key: 'workingHours', label: 'Çalışma Saati', type: 'number', placeholder: 'Minimum saat' },
    { key: 'serialNumber', label: 'Seri Numarası', type: 'text', placeholder: 'Seri numarasını girin' },
    { key: 'teamCount', label: 'Takım Sayısı', type: 'number', placeholder: 'Minimum takım sayısı' },
    { key: 'machineNetWeight', label: 'Makine Net Kilo', type: 'number', placeholder: 'Minimum kg' },
    { key: 'additionalWeight', label: 'Ek Kilo', type: 'number', placeholder: 'Minimum kg' },
    { key: 'xMovement', label: 'X Hareketi', type: 'select-or-text', placeholder: 'Seçin veya girin (örn: 1000mm)', options: () => getUniqueValues('xMovement') },
    { key: 'yMovement', label: 'Y Hareketi', type: 'select-or-text', placeholder: 'Seçin veya girin (örn: 500mm)', options: () => getUniqueValues('yMovement') },
    { key: 'zMovement', label: 'Z Hareketi', type: 'select-or-text', placeholder: 'Seçin veya girin (örn: 300mm)', options: () => getUniqueValues('zMovement') },
    { key: 'aMovement', label: 'A Hareketi', type: 'select-or-text', placeholder: 'Seçin veya girin (örn: 360°)', options: () => getUniqueValues('aMovement') },
    { key: 'bMovement', label: 'B Hareketi', type: 'select-or-text', placeholder: 'Seçin veya girin (örn: 360°)', options: () => getUniqueValues('bMovement') },
    { key: 'cMovement', label: 'C Hareketi', type: 'select-or-text', placeholder: 'Seçin veya girin (örn: 360°)', options: () => getUniqueValues('cMovement') },
    { key: 'machineOrigin', label: 'Makine Menşei', type: 'select-or-text', placeholder: 'Seçin veya girin (örn: Almanya)', options: () => getUniqueValues('machineOrigin') },
    { key: 'machinePower', label: 'Makinenin Çektiği Güç', type: 'select-or-text', placeholder: 'Seçin veya girin (örn: 25 Kw)', options: () => getUniqueValues('machinePower') },
    { key: 'holderType', label: 'Tutucu Tipi', type: 'select-or-text', placeholder: 'Seçin veya girin (örn: HSK-63A)', options: () => getUniqueValues('holderType') },
    { key: 'machineWidth', label: 'Makine Genişliği', type: 'number', placeholder: 'Minimum cm' },
    { key: 'machineLength', label: 'Makine Uzunluğu', type: 'number', placeholder: 'Minimum cm' },
    { key: 'machineHeight', label: 'Makine Yüksekliği', type: 'number', placeholder: 'Minimum cm' },
    { key: 'maxMaterialWeight', label: 'Maksimum Malzeme Ağırlığı', type: 'number', placeholder: 'Minimum kg' },
    { key: 'operatingSystem', label: 'İşletim Sistemi', type: 'select', placeholder: 'İşletim sistemi seçin', options: () => ['Heidenhain', 'Siemens', 'Fanuc', ...getUniqueValues('operatingSystem').filter(v => !['Heidenhain', 'Siemens', 'Fanuc'].includes(v))] },
    { key: 'teamMeasurementProbe', label: 'Takım Ölçme Probu', type: 'select', placeholder: 'Seçin', options: () => ['Var', 'Yok'] },
    { key: 'partMeasurementProbe', label: 'Parça Ölçme Probu', type: 'select', placeholder: 'Seçin', options: () => ['Var', 'Yok'] },
    { key: 'insideWaterGiving', label: 'İçten Su Verme', type: 'select', placeholder: 'Seçin', options: () => ['Var', 'Yok'] },
    { key: 'conveyor', label: 'Konveyör', type: 'select', placeholder: 'Seçin', options: () => ['Var', 'Yok'] },
    { key: 'paperFilter', label: 'Kağıt Filtre', type: 'select', placeholder: 'Seçin', options: () => ['Var', 'Yok'] },
    { key: 'accessoryData', label: 'Ek Aksesuar', type: 'text', placeholder: 'Aksesuar ara' },
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
        min: option.min,
        max: option.max,
        options: option.options ? option.options() : []
      }]);
    }
    setShowAddDropdown(false);
    setFilterSearchTerm(''); // Clear search when adding a filter
  };

  // Handle opening/closing dropdown
  const toggleAddDropdown = () => {
    if (!showAddDropdown && addFilterButtonRef.current) {
      // Calculate position for fixed dropdown
      const buttonRect = addFilterButtonRef.current.getBoundingClientRect();
      const dropdownHeight = 450; // max-height of dropdown
      const spacing = 8;
      const viewportHeight = window.innerHeight;
      
      // Try to position above the button
      let topPosition = buttonRect.top - dropdownHeight - spacing;
      
      // If not enough space above, position below
      if (topPosition < 0) {
        topPosition = buttonRect.bottom + spacing;
        // If still doesn't fit, adjust to viewport
        if (topPosition + dropdownHeight > viewportHeight) {
          topPosition = Math.max(10, viewportHeight - dropdownHeight - 10);
        }
      }
      
      // Ensure dropdown doesn't go off screen to the right
      const dropdownWidth = 400; // max-width
      let leftPosition = buttonRect.left;
      if (leftPosition + dropdownWidth > window.innerWidth) {
        leftPosition = window.innerWidth - dropdownWidth - 10;
      }
      // Ensure it doesn't go off screen to the left
      if (leftPosition < 10) {
        leftPosition = 10;
      }
      
      setDropdownPosition({
        top: topPosition,
        left: leftPosition
      });
      setFilterSearchTerm(''); // Clear search when opening
    }
    setShowAddDropdown(!showAddDropdown);
  };

  // Handle removing a filter field
  const handleRemoveFilter = async (index) => {
    // Remove the filter
    const updatedFilters = activeFilters.filter((_, i) => i !== index);
    setActiveFilters(updatedFilters);
    
    // Immediately apply remaining filters or clear all
    setIsFiltering(true);
    try {
      const filters = {};
      updatedFilters.forEach(filter => {
        if (filter.value !== '') {
          filters[filter.field] = filter.value;
        }
      });
      
      // If there are active filter values, apply them, otherwise clear all
      if (Object.keys(filters).length > 0) {
        await onFilter(filters);
      } else {
        // No filters remaining, show all projects
        onClear();
      }
    } finally {
      setIsFiltering(false);
    }
  };

  // Handle input value change
  const handleInputChange = (index, value) => {
    setActiveFilters(prev => prev.map((filter, i) => 
      i === index ? { ...filter, value } : filter
    ));
  };

  // Convert active filters to the format expected by the API
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
          handleApplyFilter();
        }
      }
    }, 500); // Wait 500ms after user stops typing

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFilters]);

  // Apply filter
  const handleApplyFilter = async () => {
    setIsFiltering(true);
    try {
      const filters = getFiltersObject();
      await onFilter(filters);
    } finally {
      setIsFiltering(false);
    }
  };

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
      // Check if click is outside both the button and the dropdown
      const isClickOutside = 
        addFilterContainerRef.current && 
        !addFilterContainerRef.current.contains(event.target) &&
        !event.target.closest('.filter-dropdown');
      
      if (isClickOutside) {
        setShowAddDropdown(false);
        setFilterSearchTerm(''); // Clear search when closing
      }
    };

    // Handle scroll to close dropdown - only for page scroll
    const handleScroll = () => {
      // Close dropdown on page scroll (scroll events from dropdown are stopped)
      setShowAddDropdown(false);
      setFilterSearchTerm('');
    };

    document.addEventListener('mousedown', handleClickOutside);
    // Listen to scroll events on window only (dropdown scroll is stopped from bubbling)
    window.addEventListener('scroll', handleScroll, false);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, false);
    };
  }, [showAddDropdown]);

  return (
    <div className="filter-panel-container">
      <div className="filter-header">
        <button 
          className="filter-toggle-button"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <AiOutlineFilter className="filter-icon" />
          <span>Filtreler</span>
          {hasActiveFilters && <span className="active-indicator"></span>}
        </button>
        
        {hasActiveFilters && (
          <button 
            className="clear-filters-button"
            onClick={handleClearFilters}
            title="Filtreleri Temizle"
          >
            <AiOutlineClear />
            <span>Temizle</span>
          </button>
        )}
      </div>

      {isExpanded && (
        <div className="filter-content">
          <div className="filter-fields-container">
            {activeFilters.map((filter, index) => (
              <div key={`${filter.field}-${index}`} className="filter-field-row">
                <div className="filter-field">
                  <label>{filter.label}</label>
                  
                  {/* Select dropdown */}
                  {filter.type === 'select' && (
                    <select
                      value={filter.value}
                      onChange={(e) => handleInputChange(index, e.target.value)}
                      required
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
                        list={`${filter.field}-datalist-${index}`}
                        placeholder={filter.placeholder}
                        value={filter.value}
                        onChange={(e) => handleInputChange(index, e.target.value)}
                      />
                      <datalist id={`${filter.field}-datalist-${index}`}>
                        {filter.options && filter.options.map(opt => (
                          <option key={opt} value={opt} />
                        ))}
                      </datalist>
                    </>
                  )}
                  
                  {/* Regular text/number input */}
                  {(filter.type === 'text' || filter.type === 'number') && (
                    <input
                      type={filter.type}
                      placeholder={filter.placeholder}
                      value={filter.value}
                      onChange={(e) => handleInputChange(index, e.target.value)}
                      min={filter.min}
                      max={filter.max}
                    />
                  )}
                </div>
                <button
                  className="remove-filter-button"
                  onClick={() => handleRemoveFilter(index)}
                  title="Filtreyi Kaldır"
                >
                  <AiOutlineClose />
                </button>
              </div>
            ))}

            {(availableOptions.length > 0 || filterSearchTerm) && (
              <div className="add-filter-container" ref={addFilterContainerRef}>
                <button
                  ref={addFilterButtonRef}
                  className="add-filter-button"
                  onClick={toggleAddDropdown}
                >
                  <AiOutlinePlus />
                  <span>Filtre Ekle</span>
                </button>
                {showAddDropdown && (
                  <div 
                    ref={dropdownRef}
                    className="filter-dropdown"
                    style={{
                      top: `${dropdownPosition.top}px`,
                      left: `${dropdownPosition.left}px`
                    }}
                  >
                    <div className="filter-dropdown-search">
                      <input
                        type="text"
                        placeholder="Filtre ara..."
                        value={filterSearchTerm}
                        onChange={(e) => setFilterSearchTerm(e.target.value)}
                        className="filter-search-input"
                        autoFocus
                      />
                    </div>
                    <div 
                      className="filter-dropdown-list"
                      onScroll={(e) => {
                        // Stop scroll event from bubbling to window
                        e.stopPropagation();
                      }}
                    >
                      {availableOptions.length > 0 ? (
                        availableOptions.map(option => (
                          <button
                            key={option.key}
                            className="filter-dropdown-item"
                            onClick={() => handleAddFilter(option.key)}
                          >
                            {option.label}
                          </button>
                        ))
                      ) : (
                        <div className="filter-dropdown-empty">
                          Filtre bulunamadı
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {isFiltering && (
            <div className="filter-loading">
              <div className="loading-spinner-small"></div>
              <span>Filtreleniyor...</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FilterPanel;



