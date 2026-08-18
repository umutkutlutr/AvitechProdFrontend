import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import projectService from '../../services/projectService';
import autofillService from '../../services/autofillService';
import { useAuth } from '../../contexts/AuthContext';
import { FaPlus, FaCamera, FaTimes } from 'react-icons/fa';
import AutocompleteInput from './AutocompleteInput';
import './CreateServiceReceipt.css';

const CreateServiceReceipt = ({ editingService, onSaveComplete }) => {
  const navigate = useNavigate();
  useAuth();
  const [formData, setFormData] = useState({
    // Machine Information
    machineName: '',
    model: '', // New machine model field
    year: '',
    workingHours: '',
    repairHours: '', // This now represents "Devri/dakika"
    serialNumber: '',
    teamCount: '',
    machineNetWeight: '', // New field
    additionalWeight: '', // New field
    machineType: '', // Machine type (sent as string)
    condition: '', // Machine condition (sent as enum: NEW, VERY_GOOD, GOOD, POOR)

    // Operating System
    operatingSystem: 'Heidenhain',
    customOperatingSystem: '', // Custom OS input when "Other" is selected

    // Measurement Probes (boş başlar, kullanıcı seçene kadar kırmızı)
    teamMeasurementProbe: '',
    partMeasurementProbe: '',
    insideWaterGiving: '',

    // New Features
    conveyor: '',
    paperFilter: '',
    elCarki: '',

    // Movement Fields
    xMovement: '',
    yMovement: '',
    zMovement: '',
    aMovement: '',
    bMovement: '',
    cMovement: '',

    // Gripper Type
    holderType: '',

    // Machine Dimensions
    machineWidth: '',
    machineLength: '',
    machineHeight: '',

    // Max Material Weight
    maxMaterialWeight: '',

    // Machine Origin & Power
    machineOrigin: '',
    machinePower: '',

    // Accessory Data
    accessoryData: '',

    // Photos
    photos: []
  });

  const [keyInformation, setKeyInformation] = useState(1); // New state for key information tabs
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(null);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  // Drag-and-drop state
  const [draggedPhotoIndex, setDraggedPhotoIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [dragOverSide, setDragOverSide] = useState(null); // 'left' or 'right'


  const [isSaving, setIsSaving] = useState(false);
  // Makine türü: true → Potansiyel Makine (PMAK), false → Stok Makinesi (AVMAK). Varsayılan: Potansiyel.
  const [isPotential, setIsPotential] = useState(true);
  const [operatingSystems, setOperatingSystems] = useState([]);
  const [, setIsLoadingOperatingSystems] = useState(true);
  const [fieldErrors, setFieldErrors] = useState({});

  // Autofill data state - tüm alanlar tanımlı olmalı (undefined -> AutocompleteInput sonsuz döngüsü)
  const [autofillData, setAutofillData] = useState({
    machineNames: [],
    machineModels: [],
    years: [],
    serialNumbers: [],
    netWeights: [],
    xMovements: [],
    yMovements: [],
    zMovements: [],
    machineWidths: [],
    machineLengths: [],
    machineHeights: [],
    maxMaterialWeights: [],
    types: [],
    holderTypes: [],
    hoursOperateds: [],
    rpms: [],
    takimSayisis: [],
    aMovements: [],
    bMovements: [],
    cMovements: [],
    additionalWeights: [],
    additionalEquipments: [],
    conditions: [],
    machineOrigins: [],
    machinePowers: []
  });
  const [, setIsLoadingAutofill] = useState(true);

  // Parse formatted input (remove thousand separators, keep decimal point)
  const parseFormattedInput = (value) => {
    if (value === '' || value === '.') return value;

    // Remove all dots to get clean number
    const withoutDots = value.replace(/\./g, '');

    // If original had dots, try to determine if last part was decimal
    const parts = value.split('.');
    if (parts.length > 1) {
      const lastPart = parts[parts.length - 1];
      // If last part has 1-2 digits, it's likely a decimal part
      if (lastPart.length <= 2 && /^\d+$/.test(lastPart)) {
        // Reconstruct: all parts except last are integer, last is decimal
        const integerPart = parts.slice(0, -1).join('').replace(/\./g, '');
        return `${integerPart}.${lastPart}`;
      }
    }

    // No decimal detected, return without dots
    return withoutDots;
  };

  // Format input value with dots as thousand separators
  const formatInputValue = useCallback((value) => {
    if (value === '' || value === '.' || value === null || value === undefined) return value === null || value === undefined ? '' : value;

    // Convert to string if it's a number
    const strValue = String(value);
    if (strValue === '' || strValue === '.') return strValue;

    // Parse to get clean numeric string
    const cleaned = parseFormattedInput(strValue);
    if (cleaned === '' || cleaned === '.') return cleaned;

    // Split by decimal point
    const parts = cleaned.split('.');
    const integerPart = parts[0].replace(/\D/g, ''); // Remove non-digits
    const decimalPart = parts[1] || '';

    // Format integer part with dots
    const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

    // Combine with decimal part
    if (decimalPart) {
      return `${formattedInteger}.${decimalPart}`;
    }
    return formattedInteger;
  }, []);

  // Fetch operating systems from API
  useEffect(() => {
    const fetchOperatingSystems = async () => {
      setIsLoadingOperatingSystems(true);
      try {
        const systems = await projectService.getOperatingSystems();
        setOperatingSystems(systems);
      } catch (error) {
        console.error('Error fetching operating systems:', error);
        // Keep the default hardcoded values if API fails
      } finally {
        setIsLoadingOperatingSystems(false);
      }
    };

    fetchOperatingSystems();
  }, []);

  // Fetch autofill data from API
  useEffect(() => {
    const fetchAutofillData = async () => {
      setIsLoadingAutofill(true);
      try {
        const data = await autofillService.getAllAutofillData();
        setAutofillData({
          machineNames: data.machineNames || [],
          machineModels: data.machineModels || [],
          years: data.years || [],
          serialNumbers: data.serialNumbers || [],
          netWeights: data.netWeights || [],
          xMovements: data.xMovements || [],
          yMovements: data.yMovements || [],
          zMovements: data.zMovements || [],
          machineWidths: data.machineWidths || [],
          machineLengths: data.machineLengths || [],
          machineHeights: data.machineHeights || [],
          maxMaterialWeights: data.maxMaterialWeights || [],
          types: data.types || [],
          holderTypes: data.holderTypes || [],
          // New autofill data
          aMovements: data.aMovements || [],
          bMovements: data.bMovements || [],
          cMovements: data.cMovements || [],
          rpms: data.rpms || [],
          hoursOperateds: data.hoursOperateds || [],
          additionalWeights: data.additionalWeights || [],
          additionalEquipments: data.additionalEquipments || [],
          conditions: data.conditions || [],
          takimSayisis: data.takimSayisis || [],
          machineOrigins: data.machineOrigins || [],
          machinePowers: data.machinePowers || []
        });
      } catch (error) {
        console.error('Error fetching autofill data:', error);
        // Keep empty arrays if API fails
      } finally {
        setIsLoadingAutofill(false);
      }
    };

    fetchAutofillData();
  }, []);

  // Populate form when editing a service
  useEffect(() => {
    if (editingService) {
      // Check if operating system is a custom value (not one of the predefined options)
      const predefinedOS = ['Heidenhain', 'Siemens', 'Fanuc'];
      const osValue = editingService.operatingSystem || '';
      const isCustomOS = osValue && !predefinedOS.includes(osValue);

      // Helper to format numeric value with dots and unit
      const formatWithUnit = (value, unit) => {
        if (!value && value !== 0) return '';
        // If already has unit, return as is
        if (String(value).includes(unit)) return String(value);
        // Extract numeric value
        const num = typeof value === 'number' ? value : parseFloat(String(value).replace(/[^\d.]/g, ''));
        if (isNaN(num)) return '';
        // Format with dots and add unit
        const formatted = formatInputValue(String(Math.round(num)));
        return formatted ? `${formatted}${unit}` : '';
      };

      setFormData({
        machineName: editingService.machineName || '',
        model: editingService.model || '',
        year: editingService.year || '',
        workingHours: formatWithUnit(editingService.workingHours, ' saat'),
        repairHours: editingService.repairHours || '',
        serialNumber: editingService.serialNumber || '',
        teamCount: editingService.teamCount || '',
        machineNetWeight: formatWithUnit(editingService.machineNetWeight, 'kg'),
        additionalWeight: formatWithUnit(editingService.additionalWeight, 'kg'),
        operatingSystem: isCustomOS ? 'Other' : (editingService.operatingSystem || 'Heidenhain'),
        customOperatingSystem: isCustomOS ? osValue : (editingService.customOperatingSystem || ''),
        teamMeasurementProbe: (editingService.takimOlcmeProbu != null ? editingService.takimOlcmeProbu : true) ? 'Var' : 'Yok',
        partMeasurementProbe: (editingService.parcaOlcmeProbu != null ? editingService.parcaOlcmeProbu : true) ? 'Var' : 'Yok',
        insideWaterGiving: (editingService.ictenSuVerme != null ? editingService.ictenSuVerme : false) ? 'Var' : 'Yok',
        conveyor: (editingService.konveyor != null ? editingService.konveyor : false) ? 'Var' : 'Yok',
        paperFilter: (editingService.kagitFiltre != null ? editingService.kagitFiltre : false) ? 'Var' : 'Yok',
        elCarki: (editingService.elCarki != null ? editingService.elCarki : false) ? 'Var' : 'Yok',
        xMovement: editingService.xmovement || editingService.xMovement || '',
        yMovement: editingService.ymovement || editingService.yMovement || '',
        zMovement: editingService.zmovement || editingService.zMovement || '',
        aMovement: editingService.amovement || editingService.aMovement || '',
        bMovement: editingService.bmovement || editingService.bMovement || '',
        cMovement: editingService.cmovement || editingService.cMovement || '',
        holderType: editingService.holderType || '',
        machineWidth: editingService.machineWidth || '',
        machineLength: editingService.machineLength || '',
        machineHeight: editingService.machineHeight || '',
        maxMaterialWeight: editingService.maxMaterialWeight || '',
        machineOrigin: editingService.machineOrigin || '',
        machinePower: editingService.machinePower || '',
        accessoryData: editingService.accessoryData || '',
        photos: editingService.photos || []
      });

      // Set key information if it exists, otherwise default to 1
      setKeyInformation(editingService.keyInformation || 1);
    }
  }, [editingService, formatInputValue]);

  // ── Marka+Model+Yıl akıllı autofill (yalnızca yeni proje modunda) ──────────
  // Marka+model seçilince: yıl önerileri SADECE o marka+modelin önceki girişlerinden gelir.
  // Yıl da eşleşirse: en son eşleşen projeden tüm teknik alanlar doldurulur
  // (HARİÇ: seri no, kullanım saati, fotoğraflar — makine birimine özgü alanlar).
  const [previousProjects, setPreviousProjects] = useState([]);
  const autofillAppliedKeyRef = useRef('');

  useEffect(() => {
    if (editingService) return;
    // Autofill kaynağına potansiyel makineler de dahil edilir (iki hafif kart listesi birleştirilir).
    Promise.all([
      projectService.getProjects().catch(() => []),
      projectService.getPotentialProjects().catch(() => [])
    ])
      .then(([stockProjects, potentialProjects]) => {
        const stock = Array.isArray(stockProjects) ? stockProjects : [];
        const potential = Array.isArray(potentialProjects) ? potentialProjects : [];
        setPreviousProjects([...stock, ...potential]);
      })
      .catch(() => {});
  }, [editingService]);

  const makeModelMatches = useMemo(() => {
    const norm = (v) => String(v || '').trim().toLowerCase();
    const mk = norm(formData.machineName);
    const md = norm(formData.model);
    if (!mk || !md) return [];
    return previousProjects.filter(p =>
      norm(p.make || p.machineName) === mk &&
      norm(p.model || p.machineModel) === md
    );
  }, [previousProjects, formData.machineName, formData.model]);

  const yearSuggestions = useMemo(() => {
    const ys = [...new Set(
      makeModelMatches
        .map(p => (p.year != null && p.year !== '' ? String(p.year) : null))
        .filter(Boolean)
    )];
    ys.sort((a, b) => Number(b) - Number(a));
    return ys;
  }, [makeModelMatches]);

  const applyPreviousProjectAutofill = useCallback((src) => {
    const formatWithUnit = (value, unit) => {
      if (!value && value !== 0) return '';
      if (String(value).includes(unit)) return String(value);
      const num = typeof value === 'number' ? value : parseFloat(String(value).replace(/[^\d.]/g, ''));
      if (isNaN(num)) return '';
      const formatted = formatInputValue(String(Math.round(num)));
      return formatted ? `${formatted}${unit}` : '';
    };

    const predefinedOS = ['Heidenhain', 'Siemens', 'Fanuc'];
    const osValue = src.operatingSystem || '';
    const osOther = src.operatingSystemOther || src.customOperatingSystem || '';
    let nextOS = 'Heidenhain';
    let nextCustomOS = '';
    if (predefinedOS.includes(osValue)) {
      nextOS = osValue;
    } else if (osValue === 'Other' && osOther) {
      nextOS = 'Other';
      nextCustomOS = osOther;
    } else if (osValue) {
      nextOS = 'Other';
      nextCustomOS = osValue;
    }

    const asText = (v) => (v == null ? '' : String(v));

    setFormData(prev => ({
      ...prev,
      // DOLDURULMAYANLAR (bilinçli): serialNumber, workingHours (kullanım saati), photos
      repairHours: asText(src.rpm != null ? src.rpm : src.repairHours),
      teamCount: asText(src.takimSayisi != null ? src.takimSayisi : src.teamCount),
      machineNetWeight: formatWithUnit(src.netWeight != null ? src.netWeight : src.machineNetWeight, 'kg'),
      additionalWeight: formatWithUnit(src.additionalWeight, 'kg'),
      machineType: asText(src.type != null ? src.type : src.machineType),
      condition: src.condition || prev.condition || '',
      operatingSystem: nextOS,
      customOperatingSystem: nextCustomOS,
      teamMeasurementProbe: (src.takimOlcmeProbu != null ? src.takimOlcmeProbu : true) ? 'Var' : 'Yok',
      partMeasurementProbe: (src.parcaOlcmeProbu != null ? src.parcaOlcmeProbu : true) ? 'Var' : 'Yok',
      insideWaterGiving: (src.ictenSuVerme != null ? src.ictenSuVerme : false) ? 'Var' : 'Yok',
      conveyor: (src.konveyor != null ? src.konveyor : false) ? 'Var' : 'Yok',
      paperFilter: (src.kagitFiltre != null ? src.kagitFiltre : false) ? 'Var' : 'Yok',
      elCarki: (src.elCarki != null ? src.elCarki : false) ? 'Var' : 'Yok',
      xMovement: asText(src.xmovement || src.xMovement),
      yMovement: asText(src.ymovement || src.yMovement),
      zMovement: asText(src.zmovement || src.zMovement),
      aMovement: asText(src.amovement || src.aMovement),
      bMovement: asText(src.bmovement || src.bMovement),
      cMovement: asText(src.cmovement || src.cMovement),
      holderType: asText(src.holderType),
      machineWidth: asText(src.machineWidth),
      machineLength: asText(src.machineLength),
      machineHeight: asText(src.machineHeight),
      maxMaterialWeight: asText(src.maxMaterialWeight),
      machineOrigin: asText(src.machineOrigin),
      machinePower: asText(src.machinePower),
      accessoryData: asText(src.accessoryData || src.additionalEquipment),
    }));
    const rawKeyInfo = src.keyInformation != null ? src.keyInformation : src.anahtarBilgisi;
    const parsedKeyInfo = parseInt(rawKeyInfo, 10);
    setKeyInformation(!isNaN(parsedKeyInfo) && parsedKeyInfo > 0 ? parsedKeyInfo : 1);
  }, [formatInputValue]);

  useEffect(() => {
    if (editingService) return;
    const yr = String(formData.year || '').trim();
    if (!yr || makeModelMatches.length === 0) return;
    const candidates = makeModelMatches.filter(p => String(p.year) === yr);
    if (candidates.length === 0) return;
    const key = String(formData.machineName || '').trim().toLowerCase()
      + '|' + String(formData.model || '').trim().toLowerCase()
      + '|' + yr;
    if (autofillAppliedKeyRef.current === key) return; // aynı kombinasyon zaten dolduruldu
    autofillAppliedKeyRef.current = key;
    // En son girilen eşleşen projeyi kaynak al; liste hafif kart DTO'su olduğundan
    // teknik alanlar için tam proje detayını çek.
    const srcCard = candidates.reduce((a, b) => (((b && b.id) || 0) > ((a && a.id) || 0) ? b : a));
    if (!srcCard || srcCard.id == null) return;
    let cancelled = false;
    projectService.getProjectById(srcCard.id)
      .then(full => {
        if (!cancelled && full) applyPreviousProjectAutofill(full);
      })
      .catch(() => {
        // Detay alınamadıysa hiçbir alanı BOŞALTMA; tekrar denenebilsin diye anahtarı sıfırla.
        if (!cancelled) autofillAppliedKeyRef.current = '';
      });
    return () => { cancelled = true; };
  }, [editingService, formData.machineName, formData.model, formData.year, makeModelMatches, applyPreviousProjectAutofill]);

  const handleInputChange = (field, value) => {
    // Clear error for this field when user starts typing
    if (fieldErrors[field]) {
      setFieldErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }

    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleMovementBlur = (field, value) => {
    // Only process if there's a value
    if (!value || !value.trim()) {
      return;
    }

    let processedValue = value.trim();

    // Auto-add units for movement fields on blur
    if (['xMovement', 'yMovement', 'zMovement'].includes(field)) {
      // Only add 'mm' if not already present
      if (!processedValue.endsWith('mm') && !processedValue.endsWith(' mm')) {
        processedValue = processedValue + ' mm';
      }
    } else if (['aMovement', 'bMovement', 'cMovement'].includes(field)) {
      // Only add '°' if not already present
      if (!processedValue.endsWith('°') && !processedValue.endsWith(' °')) {
        processedValue = processedValue + ' °';
      }
    }

    setFormData(prev => ({
      ...prev,
      [field]: processedValue
    }));
  };

  // Generic: whether letters are allowed for a given field
  const isAlphabetAllowed = (field) => {
    return [
      'machineName',
      'model',
      'serialNumber',
      'holderType'
    ].includes(field);
  };

  // Sanitize input to remove letters (including Turkish letters) for numeric-only fields
  const sanitizeNumeric = (value) => {
    return value.replace(/[A-Za-zğüşöçıİĞÜŞÖÇ]/g, '');
  };

  // Unified handler that enforces numeric-only when letters are not allowed
  const handleRestrictedInput = (field, value) => {
    // Clear error for this field when user starts typing
    if (fieldErrors[field]) {
      setFieldErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }

    const nextValue = isAlphabetAllowed(field) ? value : sanitizeNumeric(value);
    setFormData(prev => ({
      ...prev,
      [field]: nextValue
    }));
  };

  // Round dimension fields to nearest cm and append unit on blur
  const handleDimensionBlur = (field, value) => {
    // Only process if there's a value
    if (!value || !value.trim()) {
      return;
    }

    // If already has 'cm', don't reprocess
    if (value.trim().endsWith('cm')) {
      return;
    }

    // Remove existing 'cm' or ' cm' if present
    const cleanedValue = String(value).replace(/\s*cm$/, '').trim();
    const numeric = parseFloat(cleanedValue.replace(/[^\d.,-]/g, '').replace(',', '.'));

    if (isNaN(numeric)) {
      setFormData(prev => ({
        ...prev,
        [field]: ''
      }));
      return;
    }

    const processedValue = `${Math.round(numeric)} cm`;
    setFormData(prev => ({
      ...prev,
      [field]: processedValue
    }));
  };

  // Handle weight input change (format with dots while typing)
  const handleWeightInput = (field, value) => {
    // If value ends with 'kg', allow editing before the unit
    let cleanedValue = value;
    const hasKg = value.endsWith('kg') || value.endsWith(' kg');

    if (hasKg) {
      // Remove 'kg' and any space before it for processing
      cleanedValue = value.replace(/\s*kg$/, '').trim();
    }

    // Allow empty string, numbers, dots, and decimal points
    if (cleanedValue === '' || cleanedValue === '.' || /^-?[\d.]*$/.test(cleanedValue)) {
      // Don't format while typing, just update the value
      setFormData(prev => ({
        ...prev,
        [field]: cleanedValue
      }));
    }
  };

  // Round weight to nearest kg and append unit on blur
  const handleWeightBlur = (field, value) => {
    // Only process if there's a value
    if (!value || !value.trim()) {
      return;
    }

    // If already properly formatted with 'kg', don't reprocess
    if (value.trim().endsWith('kg') && /^[\d.\s]+kg$/.test(value.trim())) {
      return;
    }

    // Remove "kg" if present
    let cleanedValue = value.replace(/\s*kg$/, '').trim();

    // Parse to get numeric value (remove dots, keep decimal)
    cleanedValue = parseFormattedInput(cleanedValue);
    const numeric = parseFloat(cleanedValue);

    if (isNaN(numeric) || cleanedValue === '' || cleanedValue === '.') {
      setFormData(prev => ({
        ...prev,
        [field]: ''
      }));
      return;
    }

    // Round to nearest integer and format with dots
    const rounded = Math.round(numeric);
    const formatted = formatInputValue(String(rounded));
    const processedValue = `${formatted} kg`;

    setFormData(prev => ({
      ...prev,
      [field]: processedValue
    }));
  };



  const handleRpmInput = (e) => {
    const value = e.target.value;

    // If value ends with 'Max 1/min', allow editing before the unit
    let cleanedValue = value;
    const hasUnit = value.includes('Max 1/min');

    if (hasUnit) {
      // Remove 'Max 1/min' and any space before it for processing
      cleanedValue = value.replace(/\s*Max 1\/min$/, '').trim();
    }

    // Allow empty string, numbers, commas, dots, and decimal points
    if (cleanedValue === '' || /^-?[\d.,]*$/.test(cleanedValue)) {
      // Don't format while typing, just update the value
      setFormData(prev => ({
        ...prev,
        repairHours: cleanedValue
      }));
    }
  };

  const handleRpmBlur = (e) => {
    const value = e.target.value;

    // Only process if there's a value
    if (!value || !value.trim()) {
      return;
    }

    // If already formatted with "Max 1/min", don't process again
    if (value.includes('Max 1/min')) {
      return;
    }

    // Parse to get numeric value (remove commas, dots, and any formatting)
    const cleanedValue = parseFormattedInput(value.replace(/,/g, ''));
    const numericValue = parseFloat(cleanedValue);

    // Check if it's a valid number
    if (cleanedValue !== '' && cleanedValue !== '.' && !isNaN(numericValue)) {
      // Round to integer and format with dots
      const rounded = Math.round(numericValue);
      const formattedValue = formatInputValue(String(rounded));
      // Add "Max 1/min" suffix
      const finalValue = `${formattedValue} Max 1/min`;

      setFormData(prev => ({
        ...prev,
        repairHours: finalValue
      }));
    } else {
      // Clear invalid input
      setFormData(prev => ({
        ...prev,
        repairHours: ''
      }));
    }
  };

  const handleMachinePowerInput = (e) => {
    const value = e.target.value;
    let cleanedValue = value;
    const hasKw = value.toLowerCase().endsWith('kw') || value.toLowerCase().endsWith(' kw');
    if (hasKw) {
      cleanedValue = value.replace(/\s*kw$/i, '').trim();
    }
    if (cleanedValue === '' || cleanedValue === '.' || /^-?[\d.]*$/.test(cleanedValue)) {
      setFormData(prev => ({ ...prev, machinePower: cleanedValue }));
    }
  };

  const handleMachinePowerBlur = (e) => {
    const value = e.target.value;
    if (!value || !value.trim()) return;
    if (value.trim().toLowerCase().endsWith('kw') && /^[\d.\s]+kw$/i.test(value.trim())) return;
    let cleanedValue = value.replace(/\s*kw$/i, '').trim();
    cleanedValue = parseFormattedInput(cleanedValue);
    const numeric = parseFloat(cleanedValue);
    if (cleanedValue !== '' && cleanedValue !== '.' && !isNaN(numeric)) {
      const formatted = formatInputValue(String(Math.round(numeric)));
      setFormData(prev => ({ ...prev, machinePower: `${formatted} kW` }));
    } else if (isNaN(numeric) || cleanedValue === '') {
      setFormData(prev => ({ ...prev, machinePower: '' }));
    }
  };

  const handleWorkingHoursInput = (e) => {
    const value = e.target.value;

    // If value ends with 'saat', allow editing before the unit
    let cleanedValue = value;
    const hasSaat = value.endsWith('saat') || value.endsWith(' saat');

    if (hasSaat) {
      // Remove 'saat' and any space before it for processing
      cleanedValue = value.replace(/\s*saat$/, '').trim();
    }

    // Allow empty string, numbers, dots, and decimal points
    if (cleanedValue === '' || cleanedValue === '.' || /^-?[\d.]*$/.test(cleanedValue)) {
      // Don't format while typing, just update the value
      setFormData(prev => ({
        ...prev,
        workingHours: cleanedValue
      }));
    }
  };

  const handleWorkingHoursBlur = (e) => {
    const value = e.target.value;

    // Only process if there's a value
    if (!value || !value.trim()) {
      return;
    }

    // If already properly formatted with 'saat', don't reprocess
    if (value.trim().endsWith('saat') && /^[\d.\s]+saat$/.test(value.trim())) {
      return;
    }

    // Remove "saat" if present
    let cleanedValue = value.replace(/\s*saat$/, '').trim();

    // Parse to get numeric value (remove dots, keep decimal)
    cleanedValue = parseFormattedInput(cleanedValue);
    const numeric = parseFloat(cleanedValue);

    if (isNaN(numeric) || cleanedValue === '' || cleanedValue === '.') {
      setFormData(prev => ({
        ...prev,
        workingHours: ''
      }));
      return;
    }

    // Round to nearest integer and format with dots
    const rounded = Math.round(numeric);
    const formatted = formatInputValue(String(rounded));
    const processedValue = `${formatted} saat`;

    setFormData(prev => ({
      ...prev,
      workingHours: processedValue
    }));
  };

  const handleWorkingHoursKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const input = e.target;
      // Trigger blur to format the value
      handleWorkingHoursBlur(e);
      // Move to next field
      moveToNextField(input);
    }
  };

  // Function to move focus to the next input field
  const moveToNextField = (currentInput) => {
    // Get all focusable inputs in the form
    const form = currentInput.closest('.create-service-receipt');
    if (!form) return;

    // Get all focusable elements (inputs, selects, textareas, but not buttons or hidden inputs)
    const focusableElements = form.querySelectorAll(
      'input:not([type="hidden"]):not([type="file"]):not([type="button"]):not([type="submit"]), select, textarea'
    );

    // Convert NodeList to Array for easier manipulation
    const focusableArray = Array.from(focusableElements);

    // Find current input index
    const currentIndex = focusableArray.indexOf(currentInput);

    // If there's a next field, focus it
    if (currentIndex < focusableArray.length - 1) {
      const nextField = focusableArray[currentIndex + 1];
      nextField.focus();
      // For select elements, we might want to open them
      if (nextField.tagName === 'SELECT') {
        nextField.focus();
      }
    }
  };

  // Generic handler for Enter key to move to next field
  const handleEnterKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      moveToNextField(e.target);
    }
  };

  const handleKeyInformationChange = (tabNumber) => {
    setKeyInformation(tabNumber);
  };

  // Photo handling functions
  const handlePhotoUpload = (event, source) => {
    const files = event.target.files;

    if (files && files.length > 0) {
      const newPhotos = Array.from(files).map(file => ({
        id: Date.now() + Math.random(),
        file: file,
        url: URL.createObjectURL(file),
        name: file.name
      }));


      setFormData(prev => ({
        ...prev,
        photos: [...prev.photos, ...newPhotos]
      }));
    }

    // Reset input
    event.target.value = '';
  };

  const handlePhotoDelete = (photoId) => {
    setFormData(prev => ({
      ...prev,
      photos: prev.photos.filter(photo => photo.id !== photoId)
    }));
  };

  // Drag-and-drop handlers for photo reordering
  const handleDragStart = (e, index) => {
    // Event'in yukarı (forma) sıçramasını engelle
    e.stopPropagation();

    // Safari için veri seti
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());

    // Create a clean, isolated drag image to prevent ghost elements
    const imgElement = e.currentTarget.querySelector('img');
    if (imgElement && e.dataTransfer.setDragImage) {
      // Clone the image to create a completely isolated drag preview
      const dragImage = imgElement.cloneNode(true);
      dragImage.style.position = 'absolute';
      dragImage.style.top = '-9999px'; // Move off-screen
      dragImage.style.width = '100px';
      dragImage.style.height = '100px';
      dragImage.style.objectFit = 'cover';
      dragImage.style.borderRadius = '8px';
      dragImage.style.pointerEvents = 'none';

      // Append to body temporarily
      document.body.appendChild(dragImage);

      // Set the cloned image as drag image
      e.dataTransfer.setDragImage(dragImage, 50, 50);

      // Clean up after drag starts (browser has already captured it)
      setTimeout(() => {
        if (dragImage && dragImage.parentNode) {
          dragImage.parentNode.removeChild(dragImage);
        }
      }, 0);
    }

    // Use requestAnimationFrame for smoother state update, avoiding "hangs"
    requestAnimationFrame(() => {
      setDraggedPhotoIndex(index);
    });
  };

  const handleDragEnter = (e, index) => {
    e.preventDefault();
    if (draggedPhotoIndex !== null && draggedPhotoIndex !== index) {
      setDragOverIndex(index);

      // Immediately set the side on enter
      const rect = e.currentTarget.getBoundingClientRect();
      const mouseX = e.clientX;
      const photoCenter = rect.left + rect.width / 2;
      const insertBefore = mouseX < photoCenter;
      setDragOverSide(insertBefore ? 'left' : 'right');
    }
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    // Always update the side indicator as mouse moves for smoother feedback
    if (draggedPhotoIndex !== null && draggedPhotoIndex !== index) {
      const rect = e.currentTarget.getBoundingClientRect();
      const mouseX = e.clientX;
      const photoCenter = rect.left + rect.width / 2;
      const insertBefore = mouseX < photoCenter;
      const newSide = insertBefore ? 'left' : 'right';

      // Update side and make sure index is set
      if (dragOverIndex !== index) {
        setDragOverIndex(index);
      }
      if (dragOverSide !== newSide) {
        setDragOverSide(newSide);
      }
    }
  };

  const handleDragLeave = (e, index) => {
    if (e.currentTarget === e.target) {
      if (dragOverIndex === index) {
        setDragOverIndex(null);
        setDragOverSide(null);
      }
    }
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();

    if (draggedPhotoIndex === null) {
      return;
    }

    // Determine the actual insert position based on which side was indicated
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX;
    const photoCenter = rect.left + rect.width / 2;
    const insertBefore = mouseX < photoCenter;

    // Calculate target index
    let targetIndex = dropIndex;
    if (!insertBefore) {
      targetIndex = dropIndex + 1;
    }


    // Calculate what the position will be after removal
    const finalPosition = draggedPhotoIndex < targetIndex ? targetIndex - 1 : targetIndex;

    // Only skip if we're dropping at the exact same position
    // (where the photo is currently located)
    if (finalPosition === draggedPhotoIndex) {
      setDragOverIndex(null);
      setDragOverSide(null);
      return;
    }

    setFormData(prev => {
      const newPhotos = [...prev.photos];

      const draggedPhoto = newPhotos[draggedPhotoIndex];

      // Remove the dragged photo from its original position
      newPhotos.splice(draggedPhotoIndex, 1);

      // Adjust target index if necessary
      const adjustedIndex = draggedPhotoIndex < targetIndex ? targetIndex - 1 : targetIndex;

      // Insert it at the target position
      newPhotos.splice(adjustedIndex, 0, draggedPhoto);

      return {
        ...prev,
        photos: newPhotos
      };
    });

    setDragOverIndex(null);
    setDragOverSide(null);
  };

  const handleDragEnd = (e) => {
    // Sadece state'leri sıfırla, React render edince class'lar otomatik düzelir
    setDraggedPhotoIndex(null);
    setDragOverIndex(null);
    setDragOverSide(null);

    // Manuel class silme işlemlerini kaldırabilirsin, React halleder.
  };

  const handlePhotoClick = (index) => {
    setSelectedPhotoIndex(index);
    setShowPhotoModal(true);
  };

  const closePhotoModal = () => {
    setShowPhotoModal(false);
    setSelectedPhotoIndex(null);
  };

  const openFileUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    } else {
      console.error('File input ref not found');
    }
  };

  const openCamera = () => {
    cameraInputRef.current?.click();
  };

  // Function to create a new operating system after project creation
  const createNewOperatingSystem = async () => {
    try {
      // Check if user selected "Other" and entered a custom OS
      if (formData.operatingSystem === 'Other' && formData.customOperatingSystem && formData.customOperatingSystem.trim()) {
        const customOSName = formData.customOperatingSystem.trim();

        // Double-check that it doesn't already exist (case-insensitive)
        const exists = operatingSystems.some(os =>
          os.name.toLowerCase() === customOSName.toLowerCase()
        );

        if (!exists) {
          await projectService.createOperatingSystem({ name: customOSName });

          // Refresh the operating systems list
          const systems = await projectService.getOperatingSystems();
          setOperatingSystems(systems);
        } else {
        }
      }
    } catch (error) {
      console.error('Error creating new operating system:', error);
      // Don't throw error - we don't want to fail project creation if OS creation fails
      // Just log it for debugging
    }
  };

  const generateServiceId = () => {
    const machinePrefix = formData.machineName
      .split(' ')
      .map(word => word.substring(0, 3).toUpperCase())
      .join('');
    const year = formData.year;
    const timestamp = Date.now().toString().slice(-3);
    return `${machinePrefix}-${year}-${timestamp}`;
  };

  // Validate and clean data for JSON serialization
  const validateAndCleanData = (data) => {
    try {
      // Test if data can be serialized
      JSON.stringify(data);
      return data;
    } catch (error) {
      console.error('JSON serialization error:', error);
      console.error('Problematic data:', data);
      throw new Error('Veri JSON formatına dönüştürülemiyor');
    }
  };

  // Map form data to API format - Exact structure as specified
  const mapFormDataToAPI = () => {
    const apiData = {
      machineName: formData.machineName || '',
      model: formData.model || '', // Required by API validation
      machineModel: formData.model || '', // Also sent as machineModel per user requirement
      make: formData.machineName || 'Unknown',
      year: parseInt(formData.year) || 2024,
      hoursOperated: (() => {
        // Extract numeric value from workingHours (remove "saat" and dots)
        const cleaned = String(formData.workingHours || '').replace(/saat$/, '').trim().replace(/\./g, '');
        const numeric = parseInt(cleaned) || 0;
        return numeric;
      })(),
      rpm: (() => {
        // Extract numeric value from repairHours (remove "Max 1/min", commas, and dots)
        const cleaned = String(formData.repairHours || '')
          .replace(/Max 1\/min$/, '') // Remove "Max 1/min" suffix
          .trim()
          .replace(/,/g, '') // Remove commas
          .replace(/\./g, ''); // Remove dots
        const numeric = parseInt(cleaned) || 0;
        return numeric;
      })(), // Using repairHours as rpm
      serialNumber: formData.serialNumber || '',
      takimSayisi: parseInt(formData.teamCount) || 0,
      netWeight: (() => {
        // Extract numeric value from machineNetWeight (remove "kg" and dots)
        const cleaned = String(formData.machineNetWeight || '').replace(/kg$/, '').trim().replace(/\./g, '');
        const numeric = parseFloat(cleaned);
        return (!isNaN(numeric) && cleaned !== '') ? Math.round(numeric) : null;
      })(),
      additionalWeight: (() => {
        // Extract numeric value from additionalWeight (remove "kg" and dots)
        const cleaned = String(formData.additionalWeight || '').replace(/kg$/, '').trim().replace(/\./g, '');
        const numeric = parseFloat(cleaned);
        return (!isNaN(numeric) && cleaned !== '') ? Math.round(numeric) : null;
      })(),
      type: formData.machineType || '', // Machine type sent as string
      condition: formData.condition || '', // Machine condition sent as enum
      operatingSystem: formData.operatingSystem === 'Other' ? (formData.customOperatingSystem || '') : (formData.operatingSystem || ''),
      anahtarBilgisi: keyInformation ? keyInformation.toString() : '',
      takimOlcmeProbu: formData.teamMeasurementProbe === 'Var',
      parcaOlcmeProbu: formData.partMeasurementProbe === 'Var',
      ictenSuVerme: formData.insideWaterGiving === 'Var',
      konveyor: formData.conveyor === 'Var',
      kagitFiltre: formData.paperFilter === 'Var',
      elCarki: formData.elCarki === 'Var',
      xMovement: formData.xMovement || '',
      yMovement: formData.yMovement || '',
      zMovement: formData.zMovement || '',
      aMovement: formData.aMovement || '',
      bMovement: formData.bMovement || '',
      cMovement: formData.cMovement || '',
      holderType: formData.holderType || '',
      machineWidth: (formData.machineWidth && !isNaN(parseFloat(formData.machineWidth))) ? parseFloat(formData.machineWidth) : null,
      machineLength: (formData.machineLength && !isNaN(parseFloat(formData.machineLength))) ? parseFloat(formData.machineLength) : null,
      machineHeight: (formData.machineHeight && !isNaN(parseFloat(formData.machineHeight))) ? parseFloat(formData.machineHeight) : null,
      maxMaterialWeight: (() => {
        // Extract numeric value from maxMaterialWeight (remove "kg" and dots)
        const cleaned = String(formData.maxMaterialWeight || '').replace(/kg$/, '').trim().replace(/\./g, '');
        const numeric = parseFloat(cleaned);
        return (!isNaN(numeric) && cleaned !== '') ? Math.round(numeric) : null;
      })(),
      machineOrigin: formData.machineOrigin || '',
      machinePower: formData.machinePower || '',
      additionalEquipment: formData.accessoryData || '',
      status: "TEMPLATE",
      // Yeni proje modunda makine türü: true → PMAK (POTENTIAL), false → AVMAK (mevcut davranış).
      potential: !editingService && isPotential
      // Note: photos are now sent separately as files, not as URLs
    };

    return validateAndCleanData(apiData);
  };

  const handleSave = async () => {
    if (isSaving) return; // Prevent multiple submissions

    // Var/Yok alanları zorunlu
    const varYokFields = [
      { key: 'teamMeasurementProbe', label: 'Takım Ölçme Probu' },
      { key: 'partMeasurementProbe', label: 'Parça Ölçme Probu' },
      { key: 'insideWaterGiving', label: 'İçten Su Verme' },
      { key: 'conveyor', label: 'Konveyör' },
      { key: 'paperFilter', label: 'Kağıt Filtre' },
      { key: 'elCarki', label: 'El Çarkı' }
    ];
    const emptyField = varYokFields.find(f => !formData[f.key]);
    if (emptyField) {
      alert(`Lütfen "${emptyField.label}" alanını Var veya Yok olarak seçin.`);
      return;
    }

    // Validate custom operating system before saving
    if (formData.operatingSystem === 'Other' && formData.customOperatingSystem && formData.customOperatingSystem.trim()) {
      const customOSName = formData.customOperatingSystem.trim();
      const exists = operatingSystems.some(os =>
        os.name.toLowerCase() === customOSName.toLowerCase()
      );

      if (exists) {
        alert('Bu işletim sistemi zaten mevcut. Lütfen farklı bir isim giriniz veya listeden seçiniz.');
        setIsSaving(false);
        return;
      }
    }

    setIsSaving(true);
    try {
      // Map form data to API format
      const apiData = mapFormDataToAPI();

      // Log the data being sent to API

      // Call API to create project with photo files
      const response = await projectService.createProject(apiData, formData.photos);

      // After successful project creation, create new operating system if needed
      await createNewOperatingSystem();

      const serviceData = {
        id: response.id || generateServiceId(),
        ...formData,
        keyInformation: keyInformation,
        createdDate: new Date().toLocaleDateString('tr-TR'),
        status: 'TEMPLATE',
        apiId: response.id
      };

      // Call the callback if provided
      if (onSaveComplete) {
        onSaveComplete(serviceData);
      }

      const createdAsPotential = !editingService && isPotential;

      // Navigate to the matching list page (potansiyel → Potansiyel Makineler)
      navigate(createdAsPotential ? '/potentialMachines' : '/allServices');

      // Reset form if creating new service
      if (!editingService) {
        setFormData({
          machineName: '',
          model: '',
          year: '',
          workingHours: '',
          repairHours: '',
          serialNumber: '',
          teamCount: '',
          machineNetWeight: '',
          additionalWeight: '',
          machineType: '',
          condition: '',
          operatingSystem: 'Heidenhain',
          teamMeasurementProbe: '',
          partMeasurementProbe: '',
          insideWaterGiving: '',
          conveyor: '',
          paperFilter: '',
          elCarki: '',
          xMovement: '',
          yMovement: '',
          zMovement: '',
          aMovement: '',
          bMovement: '',
          cMovement: '',
          holderType: '',
          machineWidth: '',
          machineLength: '',
          machineHeight: '',
          maxMaterialWeight: '',
          machineOrigin: '',
          machinePower: '',
          accessoryData: '',
          photos: []
        });
        setIsPotential(true); // Varsayılana dön: Potansiyel Makine
      }

      alert(editingService
        ? 'Proje güncellendi!'
        : (createdAsPotential
          ? 'Potansiyel makine başarıyla oluşturuldu! (PMAK kodu atandı)'
          : 'Stok makinesi başarıyla oluşturuldu! (AVMAK kodu atandı)'));
    } catch (error) {
      console.error('Proje kaydetme hatası:', error);

      // Check if the error response contains validationErrors
      const errorData = error.response?.data;

      if (errorData && errorData.validationErrors && Array.isArray(errorData.validationErrors) && errorData.validationErrors.length > 0) {
        const validationErrors = errorData.validationErrors;

        // Parse validation errors to extract field names and messages
        const errors = {};
        const errorMessagesList = [];

        validationErrors.forEach(errorMsg => {
          // Error format: "fieldName: Error message"
          const colonIndex = errorMsg.indexOf(':');
          if (colonIndex !== -1) {
            const fieldName = errorMsg.substring(0, colonIndex).trim();
            const errorMessage = errorMsg.substring(colonIndex + 1).trim();
            errors[fieldName] = errorMessage;
            errorMessagesList.push(`• ${fieldName}: ${errorMessage}`);
          } else {
            // If no colon, just add the error message as is
            errorMessagesList.push(`• ${errorMsg}`);
          }
        });

        setFieldErrors(errors);

        // Show validation errors in alert
        alert(`Doğrulama Hataları:\n\n${errorMessagesList.join('\n')}`);
      } else {
        // Generic error handling - show more detail if available
        let errorMessage = 'Proje kaydedilirken bir hata oluştu';

        if (errorData) {
          if (errorData.message) {
            errorMessage += `:\n${errorData.message}`;
          }
          if (errorData.status) {
            errorMessage += `\n(Status: ${errorData.status})`;
          }
        } else if (error.message) {
          errorMessage += `:\n${error.message}`;
        }

        alert(errorMessage);
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="create-service-receipt">

      {/* Machine Information Section */}
      <div className="form-section">
        <h2 className="section-title">Makine Bilgileri</h2>

        {/* Photo Upload Section */}
        <div className="form-row">
          <div className="form-group full-width">
            <label>Fotoğraf Ekle</label>
            <div className="photo-upload-container">
              <div className="photo-upload-buttons">
                <button
                  type="button"
                  className="photo-upload-btn"
                  onClick={openFileUpload}
                >
                  <FaPlus className="upload-icon" />
                  Dosyadan Ekle
                </button>
                <button
                  type="button"
                  className="photo-upload-btn camera-btn"
                  onClick={openCamera}
                >
                  <FaCamera className="upload-icon" />
                  Kamera ile Çek
                </button>
              </div>

              {/* Hidden file inputs */}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => handlePhotoUpload(e, 'file')}
                style={{ display: 'none' }}
              />
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => handlePhotoUpload(e, 'camera')}
                style={{ display: 'none' }}
              />

              {/* Photo previews */}
              {formData.photos.length > 0 && (
                <div className="photo-previews">
                  {formData.photos.map((photo, index) => (
                    <div
                      key={photo.id}
                      className={`photo-preview-container ${draggedPhotoIndex === index ? 'dragging' : ''} ${dragOverIndex === index && dragOverSide === 'left' ? 'drag-over-left' : ''} ${dragOverIndex === index && dragOverSide === 'right' ? 'drag-over-right' : ''}`}
                      draggable="true"
                      onDragStart={(e) => handleDragStart(e, index)}
                      onMouseDown={(e) => e.stopPropagation()}
                      onDragEnter={(e) => handleDragEnter(e, index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragLeave={(e) => handleDragLeave(e, index)}
                      onDrop={(e) => handleDrop(e, index)}
                      onDragEnd={handleDragEnd}
                    >
                      <div className="photo-order-number">{index + 1}</div>
                      <img
                        src={photo.url}
                        alt={`Proje ${index + 1}`}
                        className="photo-preview"
                        onClick={() => handlePhotoClick(index)}
                        draggable="false"  // <-- BU SATIRI EKLE
                        style={{ userSelect: 'none', WebkitUserSelect: 'none' }} // <-- BUNU DA EKLERSEN İYİ OLU
                      />
                      <button
                        type="button"
                        className="photo-delete-btn"
                        onClick={() => handlePhotoDelete(photo.id)}
                      >
                        <FaTimes />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="form-row machine-info-row">
          <div className="form-group machine-brand">
            <label>Makine Markası</label>
            <AutocompleteInput
              value={formData.machineName}
              onChange={(e) => handleInputChange('machineName', e.target.value)}
              onKeyPress={handleEnterKeyPress}
              suggestions={autofillData.machineNames}
              placeholder="Dmg Mori"
            />
          </div>
          <div className="form-group machine-model">
            <label>Makine Modeli</label>
            <AutocompleteInput
              value={formData.model}
              onChange={(e) => handleInputChange('model', e.target.value)}
              onKeyPress={handleEnterKeyPress}
              suggestions={autofillData.machineModels}
              placeholder="Model adı"
            />
          </div>
          <div className={`form-group machine-year ${fieldErrors.year ? 'has-error' : ''}`}>
            <label>Makine Yılı</label>
            <AutocompleteInput
              value={formData.year}
              onChange={(e) => handleRestrictedInput('year', e.target.value)}
              onKeyPress={handleEnterKeyPress}
              suggestions={editingService ? autofillData.years : yearSuggestions}
              placeholder="Makine yılı"
              errorClass={fieldErrors.year ? 'error' : ''}
            />
            {fieldErrors.year && (
              <div className="error-message">{fieldErrors.year}</div>
            )}
          </div>
        </div>

        <div className="form-row three-col">
          <div className="form-group">
            <label>Ticari Tanımı</label>
            <AutocompleteInput
              value={formData.machineType}
              onChange={(e) => handleInputChange('machineType', e.target.value)}
              onKeyPress={handleEnterKeyPress}
              suggestions={autofillData.types}
              placeholder="CNC İşleme Merkezi"
            />
          </div>
          <div className="form-group">
            <label>Makine Menşei</label>
            <AutocompleteInput
              value={formData.machineOrigin}
              onChange={(e) => handleInputChange('machineOrigin', e.target.value)}
              onKeyPress={handleEnterKeyPress}
              suggestions={autofillData.machineOrigins}
              placeholder="Almanya"
            />
          </div>
          <div className="form-group">
            <label>Makine Durumu</label>
            <select
              value={formData.condition}
              onChange={(e) => handleInputChange('condition', e.target.value)}
              className="form-select form-input-style"
            >
              <option value="">Seçiniz</option>
              <option value="NEW">Sıfır</option>
              <option value="USED">2. El</option>
            </select>
          </div>
        </div>

        <div className="form-row three-col">
          <div className="form-group">
            <label>Saati</label>
            <AutocompleteInput
              value={formData.workingHours}
              onChange={handleWorkingHoursInput}
              onBlur={handleWorkingHoursBlur}
              onKeyPress={handleWorkingHoursKeyPress}
              suggestions={autofillData.hoursOperateds}
              placeholder="Çalışma saati"
            />
          </div>
          <div className="form-group">
            <label>Devri</label>
            <AutocompleteInput
              value={formData.repairHours}
              onChange={handleRpmInput}
              onBlur={handleRpmBlur}
              onKeyPress={handleEnterKeyPress}
              suggestions={autofillData.rpms}
              placeholder="Devri/dakika"
            />
          </div>
          <div className="form-group">
            <label>Makinenin Çektiği Güç</label>
            <AutocompleteInput
              value={formData.machinePower}
              onChange={handleMachinePowerInput}
              onBlur={handleMachinePowerBlur}
              onKeyPress={handleEnterKeyPress}
              suggestions={autofillData.machinePowers}
              placeholder="25 kW"
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Seri No</label>
            <input
              type="text"
              value={formData.serialNumber}
              onChange={(e) => handleInputChange('serialNumber', e.target.value)}
              onKeyPress={handleEnterKeyPress}
              placeholder="Seri numarası"
            />
          </div>
          <div className="form-group">
            <label>Takım Sayısı</label>
            <AutocompleteInput
              value={formData.teamCount}
              onChange={(e) => handleRestrictedInput('teamCount', e.target.value)}
              onKeyPress={handleEnterKeyPress}
              suggestions={autofillData.takimSayisis}
              placeholder="Takım sayısı"
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Makine Net Kilo</label>
            <AutocompleteInput
              value={formData.machineNetWeight}
              onChange={(e) => handleWeightInput('machineNetWeight', e.target.value)}
              onBlur={(e) => handleWeightBlur('machineNetWeight', e.target.value)}
              onKeyPress={handleEnterKeyPress}
              suggestions={autofillData.netWeights}
              placeholder="kg"
            />
          </div>
          <div className="form-group">
            <label>Ek Kilo</label>
            <AutocompleteInput
              value={formData.additionalWeight}
              onChange={(e) => handleWeightInput('additionalWeight', e.target.value)}
              onBlur={(e) => handleWeightBlur('additionalWeight', e.target.value)}
              onKeyPress={handleEnterKeyPress}
              suggestions={autofillData.additionalWeights}
              placeholder="kg"
            />
          </div>
        </div>

        {/* Movement Fields Section */}
        <div className="form-row">
          <div className="form-group">
            <label>X Hareketi</label>
            <AutocompleteInput
              value={formData.xMovement}
              onChange={(e) => handleRestrictedInput('xMovement', e.target.value)}
              onBlur={(e) => handleMovementBlur('xMovement', e.target.value)}
              onKeyPress={handleEnterKeyPress}
              suggestions={autofillData.xMovements}
              placeholder="1000mm"
            />
          </div>
          <div className="form-group">
            <label>Y Hareketi</label>
            <AutocompleteInput
              value={formData.yMovement}
              onChange={(e) => handleRestrictedInput('yMovement', e.target.value)}
              onBlur={(e) => handleMovementBlur('yMovement', e.target.value)}
              onKeyPress={handleEnterKeyPress}
              suggestions={autofillData.yMovements}
              placeholder="500mm"
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Z Hareketi</label>
            <AutocompleteInput
              value={formData.zMovement}
              onChange={(e) => handleRestrictedInput('zMovement', e.target.value)}
              onBlur={(e) => handleMovementBlur('zMovement', e.target.value)}
              onKeyPress={handleEnterKeyPress}
              suggestions={autofillData.zMovements}
              placeholder="300mm"
            />
          </div>
          <div className="form-group">
            <label>A Hareketi</label>
            <AutocompleteInput
              value={formData.aMovement}
              onChange={(e) => handleRestrictedInput('aMovement', e.target.value)}
              onBlur={(e) => handleMovementBlur('aMovement', e.target.value)}
              onKeyPress={handleEnterKeyPress}
              suggestions={autofillData.aMovements}
              placeholder="360°"
            />
          </div>
        </div>

        <div className="form-row three-col">
          <div className="form-group">
            <label>B Hareketi</label>
            <AutocompleteInput
              value={formData.bMovement}
              onChange={(e) => handleRestrictedInput('bMovement', e.target.value)}
              onBlur={(e) => handleMovementBlur('bMovement', e.target.value)}
              onKeyPress={handleEnterKeyPress}
              suggestions={autofillData.bMovements}
              placeholder="360°"
            />
          </div>
          <div className="form-group">
            <label>C Hareketi</label>
            <AutocompleteInput
              value={formData.cMovement}
              onChange={(e) => handleRestrictedInput('cMovement', e.target.value)}
              onBlur={(e) => handleMovementBlur('cMovement', e.target.value)}
              onKeyPress={handleEnterKeyPress}
              suggestions={autofillData.cMovements}
              placeholder="360°"
            />
          </div>
          <div className="form-group">
            <label>Tutucu Tipi</label>
            <AutocompleteInput
              value={formData.holderType}
              onChange={(e) => handleInputChange('holderType', e.target.value)}
              onKeyPress={handleEnterKeyPress}
              suggestions={autofillData.holderTypes}
              placeholder="HSK-63A"
            />
          </div>
        </div>

        {/* Machine Dimensions Section */}
        <div className="form-row">
          <div className="form-group">
            <label>Makine Genişliği</label>
            <AutocompleteInput
              value={formData.machineWidth}
              onChange={(e) => handleRestrictedInput('machineWidth', e.target.value)}
              onBlur={(e) => handleDimensionBlur('machineWidth', e.target.value)}
              onKeyPress={handleEnterKeyPress}
              suggestions={autofillData.machineWidths}
              placeholder="2000cm"
            />
          </div>
          <div className="form-group">
            <label>Makine Uzunluğu</label>
            <AutocompleteInput
              value={formData.machineLength}
              onChange={(e) => handleRestrictedInput('machineLength', e.target.value)}
              onBlur={(e) => handleDimensionBlur('machineLength', e.target.value)}
              onKeyPress={handleEnterKeyPress}
              suggestions={autofillData.machineLengths}
              placeholder="3000cm"
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Makine Yüksekliği</label>
            <AutocompleteInput
              value={formData.machineHeight}
              onChange={(e) => handleRestrictedInput('machineHeight', e.target.value)}
              onBlur={(e) => handleDimensionBlur('machineHeight', e.target.value)}
              onKeyPress={handleEnterKeyPress}
              suggestions={autofillData.machineHeights}
              placeholder="2500cm"
            />
          </div>
          <div className="form-group">
            <label>Maksimum Malzeme Ağırlığı</label>
            <AutocompleteInput
              value={formData.maxMaterialWeight}
              onChange={(e) => handleRestrictedInput('maxMaterialWeight', e.target.value)}
              onBlur={(e) => handleWeightBlur('maxMaterialWeight', e.target.value)}
              onKeyPress={handleEnterKeyPress}
              suggestions={autofillData.maxMaterialWeights}
              placeholder="5000kg"
            />
          </div>
        </div>

        <div className="form-row os-key-el-row">
          <div className="form-group form-group-os-select">
            <label>İşletim Sistemi</label>
            <select
              value={formData.operatingSystem}
              onChange={(e) => handleInputChange('operatingSystem', e.target.value)}
              className="form-select form-input-style"
            >
              {/* Dynamically populate from API */}
              {operatingSystems.map(os => (
                <option key={os.id} value={os.name}>{os.name}</option>
              ))}
              {/* Fallback options if API hasn't loaded yet */}
              {operatingSystems.length === 0 && (
                <>
                  <option value="Heidenhain">Heidenhain</option>
                  <option value="Siemens">Siemens</option>
                  <option value="Fanuc">Fanuc</option>
                </>
              )}
              <option value="Other">Other</option>
            </select>
            {formData.operatingSystem === 'Other' && (
              <div style={{ marginTop: '8px' }}>
                <input
                  type="text"
                  placeholder="İşletim sistemi adını giriniz"
                  value={formData.customOperatingSystem}
                  onChange={(e) => {
                    const value = e.target.value;
                    handleInputChange('customOperatingSystem', value);

                    // Check if the entered value already exists in the API (case-insensitive)
                    const exists = operatingSystems.some(os =>
                      os.name.toLowerCase() === value.trim().toLowerCase()
                    );

                    // Show visual feedback if duplicate
                    if (exists && value.trim()) {
                      e.target.style.borderColor = 'red';
                      e.target.title = 'Bu işletim sistemi zaten mevcut';
                    } else {
                      e.target.style.borderColor = '';
                      e.target.title = '';
                    }
                  }}
                  onBlur={(e) => {
                    const value = e.target.value;
                    // Check if duplicate on blur
                    const exists = operatingSystems.some(os =>
                      os.name.toLowerCase() === value.trim().toLowerCase()
                    );

                    if (exists && value.trim()) {
                      alert('Bu işletim sistemi zaten mevcut. Lütfen farklı bir isim giriniz.');
                      e.target.focus();
                    }
                  }}
                  onKeyPress={handleEnterKeyPress}
                  className="form-input"
                />
              </div>
            )}
          </div>
          <div className="form-group justify-end">
            <label>Anahtar Bilgisi</label>
            <div className="tab-indicators">
              <span
                className={`tab-number ${keyInformation === 1 ? 'active' : ''}`}
                onClick={() => handleKeyInformationChange(1)}
              >
                1
              </span>
              <span
                className={`tab-number ${keyInformation === 2 ? 'active' : ''}`}
                onClick={() => handleKeyInformationChange(2)}
              >
                2
              </span>
              <span
                className={`tab-number ${keyInformation === 3 ? 'active' : ''}`}
                onClick={() => handleKeyInformationChange(3)}
              >
                3
              </span>
              <span
                className={`tab-number ${keyInformation === 4 ? 'active' : ''}`}
                onClick={() => handleKeyInformationChange(4)}
              >
                4
              </span>
            </div>
          </div>
        </div>

        {/* Measurement Probes Section */}
        <div className="measurement-section">
          <div className="measurement-row">
            <div className={`measurement-group ${!formData.teamMeasurementProbe ? 'required-empty' : ''}`}>
              <span className="measurement-label">Takım Ölçme Probu</span>
              <div className="radio-group-vertical">
                <label className="radio-option">
                  <input
                    type="radio"
                    name="teamMeasurementProbe"
                    value="Var"
                    checked={formData.teamMeasurementProbe === 'Var'}
                    onChange={(e) => handleInputChange('teamMeasurementProbe', e.target.value)}
                  />
                  <span className="radio-dot"></span>
                  Var
                </label>
                <label className="radio-option">
                  <input
                    type="radio"
                    name="teamMeasurementProbe"
                    value="Yok"
                    checked={formData.teamMeasurementProbe === 'Yok'}
                    onChange={(e) => handleInputChange('teamMeasurementProbe', e.target.value)}
                  />
                  <span className="radio-dot"></span>
                  Yok
                </label>
              </div>
            </div>

            <div className={`measurement-group ${!formData.partMeasurementProbe ? 'required-empty' : ''}`}>
              <span className="measurement-label">Parça Ölçme Probu</span>
              <div className="radio-group-vertical">
                <label className="radio-option">
                  <input
                    type="radio"
                    name="partMeasurementProbe"
                    value="Var"
                    checked={formData.partMeasurementProbe === 'Var'}
                    onChange={(e) => handleInputChange('partMeasurementProbe', e.target.value)}
                  />
                  <span className="radio-dot"></span>
                  Var
                </label>
                <label className="radio-option">
                  <input
                    type="radio"
                    name="partMeasurementProbe"
                    value="Yok"
                    checked={formData.partMeasurementProbe === 'Yok'}
                    onChange={(e) => handleInputChange('partMeasurementProbe', e.target.value)}
                  />
                  <span className="radio-dot"></span>
                  Yok
                </label>
              </div>
            </div>

            <div className={`measurement-group ${!formData.insideWaterGiving ? 'required-empty' : ''}`}>
              <span className="measurement-label">İçten Su Verme</span>
              <div className="radio-group-vertical">
                <label className="radio-option">
                  <input
                    type="radio"
                    name="insideWaterGiving"
                    value="Var"
                    checked={formData.insideWaterGiving === 'Var'}
                    onChange={(e) => handleInputChange('insideWaterGiving', e.target.value)}
                  />
                  <span className="radio-dot"></span>
                  Var
                </label>
                <label className="radio-option">
                  <input
                    type="radio"
                    name="insideWaterGiving"
                    value="Yok"
                    checked={formData.insideWaterGiving === 'Yok'}
                    onChange={(e) => handleInputChange('insideWaterGiving', e.target.value)}
                  />
                  <span className="radio-dot"></span>
                  Yok
                </label>
              </div>
            </div>

            <div className={`measurement-group ${!formData.conveyor ? 'required-empty' : ''}`}>
              <span className="measurement-label">Konveyör</span>
              <div className="radio-group-vertical">
                <label className="radio-option">
                  <input
                    type="radio"
                    name="conveyor"
                    value="Var"
                    checked={formData.conveyor === 'Var'}
                    onChange={(e) => handleInputChange('conveyor', e.target.value)}
                  />
                  <span className="radio-dot"></span>
                  Var
                </label>
                <label className="radio-option">
                  <input
                    type="radio"
                    name="conveyor"
                    value="Yok"
                    checked={formData.conveyor === 'Yok'}
                    onChange={(e) => handleInputChange('conveyor', e.target.value)}
                  />
                  <span className="radio-dot"></span>
                  Yok
                </label>
              </div>
            </div>

            <div className={`measurement-group ${!formData.paperFilter ? 'required-empty' : ''}`}>
              <span className="measurement-label">Kağıt Filtre</span>
              <div className="radio-group-vertical">
                <label className="radio-option">
                  <input
                    type="radio"
                    name="paperFilter"
                    value="Var"
                    checked={formData.paperFilter === 'Var'}
                    onChange={(e) => handleInputChange('paperFilter', e.target.value)}
                  />
                  <span className="radio-dot"></span>
                  Var
                </label>
                <label className="radio-option">
                  <input
                    type="radio"
                    name="paperFilter"
                    value="Yok"
                    checked={formData.paperFilter === 'Yok'}
                    onChange={(e) => handleInputChange('paperFilter', e.target.value)}
                  />
                  <span className="radio-dot"></span>
                  Yok
                </label>
              </div>
            </div>

            <div className={`measurement-group ${!formData.elCarki ? 'required-empty' : ''}`}>
              <span className="measurement-label">El Çarkı</span>
              <div className="radio-group-vertical">
                <label className="radio-option">
                  <input
                    type="radio"
                    name="elCarki"
                    value="Var"
                    checked={formData.elCarki === 'Var'}
                    onChange={(e) => handleInputChange('elCarki', e.target.value)}
                  />
                  <span className="radio-dot"></span>
                  Var
                </label>
                <label className="radio-option">
                  <input
                    type="radio"
                    name="elCarki"
                    value="Yok"
                    checked={formData.elCarki === 'Yok'}
                    onChange={(e) => handleInputChange('elCarki', e.target.value)}
                  />
                  <span className="radio-dot"></span>
                  Yok
                </label>
              </div>
            </div>

          </div>
        </div>

        <div className="form-row">
          <div className="form-group full-width">
            <label>Yanında Verilecek Ek Aksesuar</label>
            <AutocompleteInput
              value={formData.accessoryData}
              onChange={(e) => handleInputChange('accessoryData', e.target.value)}
              onKeyPress={handleEnterKeyPress}
              suggestions={autofillData.additionalEquipments}
              placeholder="Takım Çantası"
            />
          </div>
        </div>
      </div>

      {/* Makine Türü (yalnızca yeni proje modunda) */}
      {!editingService && (
        <div className="machine-kind-toggle">
          <span className="machine-kind-title">Makine Türü</span>
          <div className="machine-kind-options" role="radiogroup" aria-label="Makine Türü">
            <button
              type="button"
              className={`machine-kind-option ${isPotential ? 'selected' : ''}`}
              onClick={() => setIsPotential(true)}
              aria-pressed={isPotential}
            >
              Potansiyel Makine
            </button>
            <button
              type="button"
              className={`machine-kind-option ${!isPotential ? 'selected' : ''}`}
              onClick={() => setIsPotential(false)}
              aria-pressed={!isPotential}
            >
              Stok Makinesi
            </button>
          </div>
          <span className="machine-kind-hint">
            {isPotential
              ? 'PMAK kodu atanır; makine yalnızca "Potansiyel Makineler" sayfasında listelenir.'
              : 'AVMAK kodu atanır; makine aktif projelere eklenir.'}
          </span>
        </div>
      )}

      {/* Action Buttons */}
      <div className="form-actions">
        <button type="button" className="btn-cancel">İptal</button>
        <button
          type="button"
          className="btn-save"
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving ? 'Kaydediliyor...' : (editingService ? 'Güncelle' : 'Kaydet')}
        </button>
      </div>

      {/* Photo Modal */}
      {showPhotoModal && selectedPhotoIndex !== null && (
        <div className="photo-modal-overlay" onClick={closePhotoModal}>
          <div className="photo-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="photo-modal-close" onClick={closePhotoModal}>
              <FaTimes />
            </button>
            <img
              src={formData.photos[selectedPhotoIndex].url}
              alt={`Proje ${selectedPhotoIndex + 1}`}
              className="photo-modal-image"
            />
            <div className="photo-modal-nav">
              <button
                className="photo-nav-btn"
                onClick={() => setSelectedPhotoIndex(Math.max(0, selectedPhotoIndex - 1))}
                disabled={selectedPhotoIndex === 0}
              >
                ‹
              </button>
              <span className="photo-counter">
                {selectedPhotoIndex + 1} / {formData.photos.length}
              </span>
              <button
                className="photo-nav-btn"
                onClick={() => setSelectedPhotoIndex(Math.min(formData.photos.length - 1, selectedPhotoIndex + 1))}
                disabled={selectedPhotoIndex === formData.photos.length - 1}
              >
                ›
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateServiceReceipt;

