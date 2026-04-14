import React, { useState, useEffect, useRef } from 'react';
import AutocompleteInput from './AutocompleteInput';
import projectService from '../../services/projectService';
import autofillService from '../../services/autofillService';
import { FaPlus, FaCamera, FaTimes } from 'react-icons/fa';
import './CreateServiceReceipt.css';
import './EditProjectModal.css';

const EditProjectModal = ({ project, onClose, onSaveComplete }) => {
  const [formData, setFormData] = useState({
    // Machine Information
    machineName: '',
    model: '', // New machine model field
    year: '2024',
    workingHours: '',
    repairHours: '', // This now represents "Devri/dakika"
    serialNumber: '',
    teamCount: '2',
    machineNetWeight: '', // New field
    additionalWeight: '', // New field
    machineType: '', // Machine type (sent as string)
    condition: '', // Machine condition (sent as enum: NEW, VERY_GOOD, GOOD, POOR)

    // Operating System
    operatingSystem: 'Heidenhain',
    customOperatingSystem: '', // Custom OS input when "Other" is selected

    // Measurement Probes
    teamMeasurementProbe: 'Var',
    partMeasurementProbe: 'Var',
    insideWaterGiving: 'Yok',

    // New Features
    conveyor: 'Yok',
    paperFilter: 'Yok',
    elCarki: 'Yok',

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
  const [projectCode, setProjectCode] = useState('AVEMAK-001'); // Project code starting at AVEMAK-001
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(null);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [showPhotoGalleryModal, setShowPhotoGalleryModal] = useState(false);
  const [deletedExistingPhotos, setDeletedExistingPhotos] = useState([]); // Track deleted existing photo URLs
  const [originalExistingPhotoUrls, setOriginalExistingPhotoUrls] = useState([]); // Safe fallback if API payload is incomplete
  const [customerPhotoOrder, setCustomerPhotoOrder] = useState([]); // Track order of first 10 photos for customer
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  // Drag-and-drop state for main photos
  const [draggedPhotoIndex, setDraggedPhotoIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [dragOverSide, setDragOverSide] = useState(null); // 'left' or 'right'


  // Drag-and-drop state for customer photos in gallery
  const [draggedCustomerPhotoIndex, setDraggedCustomerPhotoIndex] = useState(null);
  const [dragOverCustomerIndex, setDragOverCustomerIndex] = useState(null);

  const [isSaving, setIsSaving] = useState(false);

  // Autofill data state
  const [autofillData, setAutofillData] = useState({
    machineNames: [],
    machineModels: [],
    years: [],
    serialNumbers: [],
    netWeights: [],
    xMovements: [],
    yMovements: [],
    zMovements: [],
    aMovements: [],
    bMovements: [],
    cMovements: [],
    machineWidths: [],
    machineLengths: [],
    machineHeights: [],
    maxMaterialWeights: [],
    types: [],
    holderTypes: [],
    additionalWeights: [],
    additionalEquipments: [],
    machineOrigins: [],
    machinePowers: []
  });
  const [isLoadingAutofill, setIsLoadingAutofill] = useState(false);

  const getPhotoId = (photo, fallbackIndex = 0) => {
    if (!photo) return `photo-${fallbackIndex}`;
    if (photo.id) return photo.id;
    if (photo.originalUrl) return photo.originalUrl;
    if (photo.url) return photo.url;
    if (typeof photo === 'string') return photo;
    return `photo-${fallbackIndex}`;
  };

  // Fetch autofill data from API
  useEffect(() => {
    const fetchAutofillData = async () => {
      setIsLoadingAutofill(true);
      try {
        const data = await autofillService.getAllAutofillData();
        console.log('Edit Modal - Fetched autofill data:', data);
        setAutofillData({
          machineNames: data.machineNames || [],
          machineModels: data.machineModels || [],
          years: data.years || [],
          serialNumbers: data.serialNumbers || [],
          netWeights: data.netWeights || [],
          xMovements: data.xMovements || [],
          yMovements: data.yMovements || [],
          zMovements: data.zMovements || [],
          aMovements: data.aMovements || [],
          bMovements: data.bMovements || [],
          cMovements: data.cMovements || [],
          machineWidths: data.machineWidths || [],
          machineLengths: data.machineLengths || [],
          machineHeights: data.machineHeights || [],
          maxMaterialWeights: data.maxMaterialWeights || [],
          types: data.types || [],
          holderTypes: data.holderTypes || [],
          additionalWeights: data.additionalWeights || [],
          additionalEquipments: data.additionalEquipments || [],
          machineOrigins: data.machineOrigins || [],
          machinePowers: data.machinePowers || []
        });
      } catch (error) {
        console.error('Error fetching autofill data:', error);
      } finally {
        setIsLoadingAutofill(false);
      }
    };

    fetchAutofillData();
  }, []);

  // Populate form when editing a project
  useEffect(() => {
    if (project) {
      console.log('=== PROJECT DATA FOR EDITING ===');
      console.log('Raw project data:', project);
      console.log('Project ID:', project.id);
      console.log('Machine Name:', project.machineName);
      console.log('Year:', project.year, 'Type:', typeof project.year);
      console.log('Hours Operated:', project.hoursOperated, 'Type:', typeof project.hoursOperated);
      console.log('RPM:', project.rpm, 'Type:', typeof project.rpm);
      console.log('Serial Number:', project.serialNumber);
      console.log('Team Number:', project.teamNumber, 'Type:', typeof project.teamNumber);
      console.log('Takim Sayisi (legacy):', project.takimSayisi, 'Type:', typeof project.takimSayisi);
      console.log('Net Weight:', project.netWeight, 'Type:', typeof project.netWeight);
      console.log('Additional Weight:', project.additionalWeight, 'Type:', typeof project.additionalWeight);
      console.log('Operating System:', project.operatingSystem);
      console.log('Key Info:', project.keyInfo, 'Type:', typeof project.keyInfo);
      console.log('Anahtar Bilgisi (legacy):', project.anahtarBilgisi, 'Type:', typeof project.anahtarBilgisi);
      console.log('Tool Measure Probe:', project.toolMeasureProbe, 'Type:', typeof project.toolMeasureProbe);
      console.log('Takim Olcme Probu (legacy):', project.takimOlcmeProbu, 'Type:', typeof project.takimOlcmeProbu);
      console.log('Part Measure Probe:', project.partMeasureProbe, 'Type:', typeof project.partMeasureProbe);
      console.log('Parca Olcme Probu (legacy):', project.parcaOlcmeProbu, 'Type:', typeof project.parcaOlcmeProbu);
      console.log('Internal Water:', project.internalWater, 'Type:', typeof project.internalWater);
      console.log('Icten Su Verme (legacy):', project.ictenSuVerme, 'Type:', typeof project.ictenSuVerme);
      console.log('Conveyor:', project.conveyor, 'Type:', typeof project.conveyor);
      console.log('Paper Filter:', project.paperFilter, 'Type:', typeof project.paperFilter);
      console.log('Kagit Filtre (legacy):', project.kagitFiltre, 'Type:', typeof project.kagitFiltre);
      console.log('================================');

      setFormData({
        machineName: project.machineName || project.title || '',
        model: project.model || '',
        year: project.year ? project.year.toString() : '2024',
        workingHours: project.hoursOperated ? project.hoursOperated.toString() : (project.workingHours || ''),
        repairHours: project.rpm ? project.rpm.toString() : (project.repairHours || ''),
        serialNumber: project.serialNumber || '',
        teamCount: (project.teamNumber || project.takimSayisi) ? (project.teamNumber || project.takimSayisi).toString() : (project.teamCount || '2'),
        machineNetWeight: project.netWeight ? project.netWeight.toString() : (project.machineNetWeight || ''),
        additionalWeight: project.additionalWeight ? project.additionalWeight.toString() : '',
        machineType: project.type || '',
        condition: project.condition || '',
        operatingSystem: (() => {
          const os = project.operatingSystem || 'Heidenhain';
          const predefinedOS = ['Heidenhain', 'Siemens', 'Fanuc'];
          if (predefinedOS.includes(os)) {
            return os;
          } else {
            return 'Other';
          }
        })(),
        customOperatingSystem: (() => {
          const os = project.operatingSystem || 'Heidenhain';
          const predefinedOS = ['Heidenhain', 'Siemens', 'Fanuc'];
          if (predefinedOS.includes(os)) {
            return '';
          } else {
            return os;
          }
        })(),
        teamMeasurementProbe: (project.takimOlcmeProbu != null ? project.takimOlcmeProbu : (project.toolMeasureProbe != null ? project.toolMeasureProbe : true)) ? 'Var' : 'Yok',
        partMeasurementProbe: (project.parcaOlcmeProbu != null ? project.parcaOlcmeProbu : (project.partMeasureProbe != null ? project.partMeasureProbe : true)) ? 'Var' : 'Yok',
        insideWaterGiving: (project.ictenSuVerme != null ? project.ictenSuVerme : (project.internalWater != null ? project.internalWater : false)) ? 'Var' : 'Yok',
        conveyor: (project.konveyor != null ? project.konveyor : (project.conveyor != null ? project.conveyor : false)) ? 'Var' : 'Yok',
        paperFilter: (project.kagitFiltre != null ? project.kagitFiltre : (project.paperFilter != null ? project.paperFilter : false)) ? 'Var' : 'Yok',
        elCarki: (project.elCarki != null ? project.elCarki : false) ? 'Var' : 'Yok',
        xMovement: project.xmovement || project.xMovement || '',
        yMovement: project.ymovement || project.yMovement || '',
        zMovement: project.zmovement || project.zMovement || '',
        aMovement: project.amovement || project.aMovement || '',
        bMovement: project.bmovement || project.bMovement || '',
        cMovement: project.cmovement || project.cMovement || '',
        holderType: project.holderType || '',
        machineWidth: project.machineWidth ? project.machineWidth.toString() : '',
        machineLength: project.machineLength ? project.machineLength.toString() : '',
        machineHeight: project.machineHeight ? project.machineHeight.toString() : '',
        maxMaterialWeight: project.maxMaterialWeight ? project.maxMaterialWeight.toString() : '',
        machineOrigin: project.machineOrigin || '',
        machinePower: project.machinePower || '',
        accessoryData: project.additionalEquipment || project.accessoryData || '',
        photos: (project.photos || []).map((photoUrl, index) => {
          // Transform existing photos from API (URLs) into the format expected by the component
          if (typeof photoUrl === 'string') {
            return {
              id: `existing-${index}-${Date.now()}`,
              url: photoUrl,
              existing: true, // Flag to identify existing photos
              originalUrl: photoUrl // Keep original URL for deletion tracking
            };
          }
          return photoUrl; // Already in correct format
        })
      });

      // Initialize customer photo order will be set in useEffect after formData is populated

      // Reset deleted photos when loading a new project
      setDeletedExistingPhotos([]);
      setOriginalExistingPhotoUrls((project.photos || []).filter((photoUrl) => typeof photoUrl === 'string'));

      console.log('=== FORM DATA SET ===');
      console.log('Form Data after setting:', {
        machineName: project.machineName || project.title || '',
        year: project.year ? project.year.toString() : '2024',
        workingHours: project.hoursOperated ? project.hoursOperated.toString() : (project.workingHours || ''),
        repairHours: project.rpm ? project.rpm.toString() : (project.repairHours || ''),
        teamCount: project.takimSayisi ? project.takimSayisi.toString() : (project.teamCount || '2'),
        teamMeasurementProbe: (project.takimOlcmeProbu != null ? project.takimOlcmeProbu : true) ? 'Var' : 'Yok',
        partMeasurementProbe: (project.parcaOlcmeProbu != null ? project.parcaOlcmeProbu : true) ? 'Var' : 'Yok',
        insideWaterGiving: (project.ictenSuVerme != null ? project.ictenSuVerme : false) ? 'Var' : 'Yok',
        conveyor: (project.konveyor != null ? project.konveyor : false) ? 'Var' : 'Yok',
        paperFilter: (project.kagitFiltre != null ? project.kagitFiltre : false) ? 'Var' : 'Yok',
        elCarki: (project.elCarki != null ? project.elCarki : false) ? 'Var' : 'Yok'
      });
      console.log('=====================');

      // Set key information if it exists, otherwise default to 1
      const keyInfo = project.keyInfo || project.anahtarBilgisi || project.keyInformation || 1;
      setKeyInformation(typeof keyInfo === 'string' ? parseInt(keyInfo) : keyInfo);

      // Set project code if it exists, otherwise get next available code
      if (project.projectCode) {
        // If it's already in AVEMAK format, use it directly
        if (project.projectCode.startsWith('AVEMAK-')) {
          setProjectCode(project.projectCode);
        } else {
          // If it's in old format (like PRJ-1001), convert to AVEMAK format
          const codeMatch = project.projectCode.match(/PRJ-(\d+)/);
          if (codeMatch) {
            const codeNumber = parseInt(codeMatch[1]);
            setProjectCode(`AVEMAK-${codeNumber.toString().padStart(3, '0')}`);
          } else {
            // Fallback to the original code
            setProjectCode(project.projectCode);
          }
        }
      }

    }
  }, [project]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // When both machineName and model are selected from suggestions, auto-fill specs
  const tryAutoFillSpecs = async (selectedField, selectedValue) => {
    const machineName = selectedField === 'machineName' ? selectedValue : formData.machineName;
    const model = selectedField === 'model' ? selectedValue : formData.model;
    if (!machineName || !model) return;

    try {
      const specs = await autofillService.getSpecsByMakeAndModel(machineName, model);
      if (!specs) return;

      const ok = window.confirm(
        `"${machineName} ${model}" için önceki projeden teknik özellikler bulundu. ` +
        `Seri no, yıl ve saat hariç tüm alanları otomatik doldurmak ister misiniz?`
      );
      if (!ok) return;

      setFormData(prev => ({
        ...prev,
        // Dimensions
        ...(specs.machineWidth != null && { machineWidth: String(specs.machineWidth) }),
        ...(specs.machineLength != null && { machineLength: String(specs.machineLength) }),
        ...(specs.machineHeight != null && { machineHeight: String(specs.machineHeight) }),
        // Weights
        ...(specs.netWeight != null && { machineNetWeight: String(specs.netWeight) }),
        ...(specs.additionalWeight != null && { additionalWeight: String(specs.additionalWeight) }),
        ...(specs.maxMaterialWeight != null && { maxMaterialWeight: String(specs.maxMaterialWeight) }),
        // Movements
        ...(specs.xMovement != null && { xMovement: String(specs.xMovement) }),
        ...(specs.yMovement != null && { yMovement: String(specs.yMovement) }),
        ...(specs.zMovement != null && { zMovement: String(specs.zMovement) }),
        ...(specs.aMovement != null && { aMovement: String(specs.aMovement) }),
        ...(specs.bMovement != null && { bMovement: String(specs.bMovement) }),
        ...(specs.cMovement != null && { cMovement: String(specs.cMovement) }),
        // Classification
        ...(specs.type != null && { machineType: specs.type }),
        ...(specs.condition != null && { condition: specs.condition }),
        ...(specs.machineOrigin != null && { machineOrigin: specs.machineOrigin }),
        ...(specs.machinePower != null && { machinePower: specs.machinePower }),
        ...(specs.rpm != null && { repairHours: String(specs.rpm) }),
        ...(specs.takimSayisi != null && { teamCount: String(specs.takimSayisi) }),
        // Operating system
        ...(specs.operatingSystem != null && { operatingSystem: specs.operatingSystem }),
        ...(specs.operatingSystemOther != null && { customOperatingSystem: specs.operatingSystemOther }),
        // Features
        ...(specs.takimOlcmeProbu != null && { teamMeasurementProbe: specs.takimOlcmeProbu ? 'Var' : 'Yok' }),
        ...(specs.parcaOlcmeProbu != null && { partMeasurementProbe: specs.parcaOlcmeProbu ? 'Var' : 'Yok' }),
        ...(specs.ictenSuVerme != null && { insideWaterGiving: specs.ictenSuVerme ? 'Var' : 'Yok' }),
        ...(specs.konveyor != null && { conveyor: specs.konveyor ? 'Var' : 'Yok' }),
        ...(specs.kagitFiltre != null && { paperFilter: specs.kagitFiltre ? 'Var' : 'Yok' }),
        ...(specs.elCarki != null && { elCarki: specs.elCarki ? 'Var' : 'Yok' }),
        // Holder & accessories
        ...(specs.holderType != null && { holderType: specs.holderType }),
        ...(specs.additionalEquipment != null && { accessoryData: specs.additionalEquipment }),
      }));
    } catch (err) {
      console.warn('Auto-fill specs failed:', err);
    }
  };

  const handleMovementBlur = (field, value) => {
    let processedValue = value;

    // Auto-add units for movement fields on blur
    if (['xMovement', 'yMovement', 'zMovement'].includes(field)) {
      // Remove existing 'mm' if present to avoid duplication
      processedValue = value.replace(/\s*mm$/, '').trim();
      // Add 'mm' with a space if there's a value and it doesn't already end with 'mm'
      if (processedValue && !processedValue.endsWith('mm')) {
        processedValue = processedValue + ' mm';
      }
    } else if (['aMovement', 'bMovement', 'cMovement'].includes(field)) {
      // Remove existing '°' if present to avoid duplication
      processedValue = value.replace(/\s*°$/, '').trim();
      // Add '°' with a space if there's a value and it doesn't already end with '°'
      if (processedValue && !processedValue.endsWith('°')) {
        processedValue = processedValue + ' °';
      }
    }

    setFormData(prev => ({
      ...prev,
      [field]: processedValue
    }));
  };

  const handleRpmInput = (e) => {
    const value = e.target.value;
    setFormData(prev => ({
      ...prev,
      repairHours: value
    }));
  };

  const handleRpmKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const input = e.target;
      const value = input.value.replace(/,/g, ''); // Remove existing commas

      // Check if it's a valid number
      if (!isNaN(value) && value !== '') {
        // Format with commas
        const formattedValue = parseInt(value).toLocaleString();
        // Add "Max 1/min" suffix
        const finalValue = `${formattedValue} Max 1/min`;

        setFormData(prev => ({
          ...prev,
          repairHours: finalValue
        }));

        // Close keyboard by blurring the input
        input.blur();
      }
    }
  };

  const handleWorkingHoursInput = (e) => {
    const value = e.target.value;
    setFormData(prev => ({
      ...prev,
      workingHours: value
    }));
  };

  const handleWorkingHoursKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const input = e.target;
      const value = input.value.replace(/,/g, ''); // Remove existing commas

      // Check if it's a valid number
      if (!isNaN(value) && value !== '') {
        // Format with commas
        const formattedValue = parseInt(value).toLocaleString();
        // Add "saat" suffix
        const finalValue = `${formattedValue} saat`;

        setFormData(prev => ({
          ...prev,
          workingHours: finalValue
        }));

        // Close keyboard by blurring the input
        input.blur();
      }
    }
  };

  const handleKeyInformationChange = (tabNumber) => {
    setKeyInformation(tabNumber);
  };

  // Photo handling functions
  const handlePhotoUpload = (event, source) => {
    console.log('Photo upload triggered:', source);
    const files = event.target.files;
    console.log('Selected files:', files);

    if (files && files.length > 0) {
      const newPhotos = Array.from(files).map(file => ({
        id: Date.now() + Math.random(),
        file: file,
        url: URL.createObjectURL(file),
        name: file.name
      }));

      console.log('New photos to add:', newPhotos);

      setFormData(prev => ({
        ...prev,
        photos: [...prev.photos, ...newPhotos]
      }));
    }

    // Reset input
    event.target.value = '';
  };

  const handlePhotoDelete = (photoId) => {
    setFormData(prev => {
      const photoToDelete = prev.photos.find(p => p.id === photoId);
      // If it's an existing photo, add to deletion list
      if (photoToDelete && photoToDelete.existing && photoToDelete.originalUrl) {
        setDeletedExistingPhotos(prevDeleted => [...prevDeleted, photoToDelete.originalUrl]);
      }
      return {
        ...prev,
        photos: prev.photos.filter(photo => photo.id !== photoId)
      };
    });
  };

  const handlePhotoClick = (index) => {
    setSelectedPhotoIndex(index);
    setShowPhotoModal(true);
  };

  const closePhotoModal = () => {
    setShowPhotoModal(false);
    setSelectedPhotoIndex(null);
  };

  const handlePhotoGalleryClick = () => {
    setShowPhotoGalleryModal(true);
  };

  const closePhotoGalleryModal = () => {
    setShowPhotoGalleryModal(false);
  };

  // Get the first photo (cover photo) for display
  const getCoverPhoto = () => {
    if (formData.photos.length === 0) return null;
    // Use customer photo order if available, otherwise use first photo
    if (customerPhotoOrder.length > 0) {
      const coverPhotoId = customerPhotoOrder[0].photoId;
      const photo = formData.photos.find(p => (p.id || p) === coverPhotoId) || formData.photos[0];
      return photo.url || photo;
    }
    const firstPhoto = formData.photos[0];
    return firstPhoto.url || firstPhoto;
  };

  // Drag-and-drop handlers for main photo section
  const handleDragStart = (e, index) => {
    setDraggedPhotoIndex(index);
    e.dataTransfer.effectAllowed = 'move';

    // Safari requires setData to be called for drag to work
    e.dataTransfer.setData('text/plain', index.toString());

    // Apply dragging class immediately (no setTimeout to avoid bugs)
    e.currentTarget.classList.add('dragging');
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

      const reorderedIds = newPhotos.map((photo, idx) => getPhotoId(photo, idx));
      setCustomerPhotoOrder((prevOrder) => {
        if (!prevOrder || prevOrder.length === 0) {
          return reorderedIds.slice(0, 10).map((photoId, idx) => ({ photoId, index: idx }));
        }
        const prevMap = new Map(prevOrder.map((item, idx) => [item.photoId, { ...item, index: idx }]));
        return reorderedIds
          .slice(0, 10)
          .map((photoId, idx) => prevMap.get(photoId) || { photoId, index: idx });
      });

      return {
        ...prev,
        photos: newPhotos
      };
    });

    setDragOverIndex(null);
    setDragOverSide(null);
  };

  const handleDragEnd = (e) => {
    // Remove dragging class from the element
    e.currentTarget.classList.remove('dragging');

    // Also remove from all elements as a safety measure (in case of bugs)
    document.querySelectorAll('.photo-preview-container.dragging').forEach(el => {
      el.classList.remove('dragging');
    });

    // Reset all drag states
    setDraggedPhotoIndex(null);
    setDragOverIndex(null);
    setDragOverSide(null);
  };

  // Drag-and-drop handlers for customer photo gallery
  const handleCustomerPhotoDragStart = (e, index) => {
    setDraggedCustomerPhotoIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    setTimeout(() => {
      e.target.classList.add('dragging');
    }, 0);
  };

  const handleCustomerPhotoDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedCustomerPhotoIndex !== null && draggedCustomerPhotoIndex !== index) {
      setDragOverCustomerIndex(index);
    }
  };

  const handleCustomerPhotoDrop = (e, dropIndex) => {
    e.preventDefault();

    if (draggedCustomerPhotoIndex === null || draggedCustomerPhotoIndex === dropIndex) {
      setDragOverCustomerIndex(null);
      return;
    }

    const newOrder = [...customerPhotoOrder];
    const draggedItem = newOrder[draggedCustomerPhotoIndex];

    // Remove from original position
    newOrder.splice(draggedCustomerPhotoIndex, 1);

    // Insert at drop position
    newOrder.splice(dropIndex, 0, draggedItem);

    setCustomerPhotoOrder(newOrder);
    setDragOverCustomerIndex(null);
  };

  const handleCustomerPhotoDragEnd = (e) => {
    e.target.classList.remove('dragging');
    setDraggedCustomerPhotoIndex(null);
    setDragOverCustomerIndex(null);
  };

  // Reorder customer photos (first 10) - Keep for backward compatibility
  const handleReorderCustomerPhoto = (index, direction) => {
    if (index === 0 && direction === 'up') return; // Can't move cover photo up
    if (index >= customerPhotoOrder.length - 1 && direction === 'down') return;

    const newOrder = [...customerPhotoOrder];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newOrder[index], newOrder[targetIndex]] = [newOrder[targetIndex], newOrder[index]];
    setCustomerPhotoOrder(newOrder);
  };

  // Update customer photo order when photos change
  useEffect(() => {
    if (formData.photos.length > 0) {
      if (customerPhotoOrder.length === 0) {
        // Initialize customer photo order only if empty
        const newOrder = formData.photos.slice(0, 10).map((photo, idx) => {
          const photoId = getPhotoId(photo, idx);
          return {
            photoId: photoId,
            index: idx
          };
        });
        setCustomerPhotoOrder(newOrder);
      } else {
        // Update order to remove deleted photos and add new ones if needed
        const allPhotoIds = formData.photos.map((p, idx) => getPhotoId(p, idx));
        const validOrder = customerPhotoOrder.filter(item => allPhotoIds.includes(item.photoId));

        // Add new photos if we have less than 10
        if (validOrder.length < 10) {
          const missingPhotos = formData.photos.filter(p => {
            const photoId = getPhotoId(p, formData.photos.indexOf(p));
            return !validOrder.some(item => item.photoId === photoId);
          });

          const newOrder = [
            ...validOrder,
            ...missingPhotos.slice(0, 10 - validOrder.length).map((photo, idx) => {
              const photoId = getPhotoId(photo, formData.photos.indexOf(photo));
              return {
                photoId: photoId,
                index: validOrder.length + idx
              };
            })
          ];
          setCustomerPhotoOrder(newOrder);
        } else {
          setCustomerPhotoOrder(validOrder);
        }
      }
    }
  }, [formData.photos.length]); // Only depend on length to avoid infinite loops

  const openFileUpload = () => {
    console.log('Opening file upload...');
    if (fileInputRef.current) {
      fileInputRef.current.click();
    } else {
      console.error('File input ref not found');
    }
  };

  const openCamera = () => {
    cameraInputRef.current?.click();
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

  // Map form data to API format - Using correct field names as per API structure
  const mapFormDataToAPI = () => {
    // Extract numeric values from formatted strings
    const extractNumericValue = (value) => {
      if (!value) return 0;
      const numericPart = value.toString().replace(/[^\d]/g, '');
      return parseInt(numericPart) || 0;
    };

    const apiData = {
      id: project.id, // Include the project ID for update
      projectCode: projectCode, // Use AVEMAK project code directly
      machineName: formData.machineName || '',
      model: formData.model || '', // Using separate model field
      make: formData.machineName || '',
      year: parseInt(formData.year) || 2024,
      hoursOperated: extractNumericValue(formData.workingHours),
      rpm: extractNumericValue(formData.repairHours),
      serialNumber: formData.serialNumber || '',
      takimSayisi: parseInt(formData.teamCount) || 0,
      netWeight: (formData.machineNetWeight && !isNaN(parseFloat(formData.machineNetWeight))) ? parseFloat(formData.machineNetWeight) : null,
      additionalWeight: (formData.additionalWeight && !isNaN(parseFloat(formData.additionalWeight))) ? parseFloat(formData.additionalWeight) : null,
      type: formData.machineType || '', // Machine type sent as string
      condition: formData.condition || '', // Machine condition sent as enum
      operatingSystem: formData.operatingSystem === 'Other' ? (formData.customOperatingSystem || '') : (formData.operatingSystem || 'Heidenhain'),
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
      status: "TEMPLATE"
    };

    console.log('=== VALIDATION CHECK ===');
    console.log('id:', apiData.id, 'Type:', typeof apiData.id);
    console.log('projectCode:', apiData.projectCode, 'Type:', typeof apiData.projectCode);
    console.log('machineName:', apiData.machineName, 'Type:', typeof apiData.machineName);
    console.log('model:', apiData.model, 'Type:', typeof apiData.model);
    console.log('make:', apiData.make, 'Type:', typeof apiData.make);
    console.log('year:', apiData.year, 'Type:', typeof apiData.year);
    console.log('hoursOperated:', apiData.hoursOperated, 'Type:', typeof apiData.hoursOperated);
    console.log('rpm:', apiData.rpm, 'Type:', typeof apiData.rpm);
    console.log('teamSayisi:', apiData.teamSayisi, 'Type:', typeof apiData.teamSayisi);
    console.log('netWeight:', apiData.netWeight, 'Type:', typeof apiData.netWeight);
    console.log('additionalWeight:', apiData.additionalWeight, 'Type:', typeof apiData.additionalWeight);
    console.log('keyInformation:', apiData.keyInformation, 'Type:', typeof apiData.keyInformation);
    console.log('teamMeasurementProbe:', apiData.teamMeasurementProbe, 'Type:', typeof apiData.teamMeasurementProbe);
    console.log('partMeasurementProbe:', apiData.partMeasurementProbe, 'Type:', typeof apiData.partMeasurementProbe);
    console.log('internalSuverme:', apiData.internalSuverme, 'Type:', typeof apiData.internalSuverme);
    console.log('conveyor:', apiData.conveyor, 'Type:', typeof apiData.conveyor);
    console.log('paperFilter:', apiData.paperFilter, 'Type:', typeof apiData.paperFilter);
    console.log('=======================');

    return validateAndCleanData(apiData);
  };

  const isPersistedPhotoUrl = (url) =>
    typeof url === 'string' && (url.startsWith('http://') || url.startsWith('https://'));

  const handleSave = async () => {
    if (isSaving) return; // Prevent multiple submissions

    setIsSaving(true);
    try {
      // Map form data to API format
      const apiData = mapFormDataToAPI();

      // Build photo URL list: use customerPhotoOrder for first 10 (PDF order), then rest
      const photoById = {};
      formData.photos.forEach(p => {
        const id = getPhotoId(p, formData.photos.indexOf(p));
        if (p.url) photoById[id] = p.url;
      });
      const orderedUrls = [];
      const seen = new Set();
      customerPhotoOrder.slice(0, 10).forEach(item => {
        const url = photoById[item.photoId];
        if (url && isPersistedPhotoUrl(url) && !seen.has(url)) {
          orderedUrls.push(url);
          seen.add(url);
        }
      });
      formData.photos.forEach(photo => {
        if (photo.existing && photo.url && isPersistedPhotoUrl(photo.url) && !seen.has(photo.url)) {
          orderedUrls.push(photo.url);
          seen.add(photo.url);
        }
      });
      const safeExistingPhotoUrls = orderedUrls.length > 0 || deletedExistingPhotos.length > 0
        ? orderedUrls
        : originalExistingPhotoUrls;

      const newFileKeys = new Set();
      const newPhotos = formData.photos.filter(photo => {
        if (!photo.file) return false;
        const k = `${photo.file.name}-${photo.file.size}-${photo.file.lastModified}`;
        if (newFileKeys.has(k)) return false;
        newFileKeys.add(k);
        return true;
      });

      // Log the data being sent to API
      console.log('=== API UPDATE REQUEST DATA ===');
      console.log('Raw API Data:', apiData);
      console.log('All Photos:', formData.photos);
      console.log('Existing Photo URLs to Keep:', safeExistingPhotoUrls);
      console.log('New Photo Files to Upload:', newPhotos);
      console.log('Number of existing photos:', safeExistingPhotoUrls.length);
      console.log('Number of new photos:', newPhotos.length);
      console.log('Deleted Existing Photos:', deletedExistingPhotos);
      console.log('Customer Photo Order:', customerPhotoOrder.slice(0, 10).map(item => item.photoId));
      console.log('==============================');

      // Call API to update project with both existing photo URLs and new photo files
      const response = await projectService.updateProject(
        project.id,
        apiData,
        newPhotos,
        safeExistingPhotoUrls
      );

      // Call the callback if provided
      if (onSaveComplete) {
        onSaveComplete(response);
      }

      // Close modal
      onClose();

      alert('Proje başarıyla güncellendi!');
    } catch (error) {
      console.error('Proje güncelleme hatası:', error);
      alert(`Proje güncellenirken bir hata oluştu: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="edit-project-modal-overlay">
      <div className="edit-project-modal">
        <div className="modal-header">
          <h2>Proje Düzenle</h2>
          <button className="close-button" onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        <div className="modal-content">
          <div className="create-service-receipt">

            {/* Machine Information Section */}
            <div className="form-section-with-photos">
              <div className="form-section-main">
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
                          {formData.photos.map((photo, index) => {
                            // Handle both existing photos (with url property) and new photos
                            const photoUrl = photo.url || photo;
                            const photoId = getPhotoId(photo, index);
                            return (
                              <div
                                key={photoId}
                                className={`photo-preview-container ${draggedPhotoIndex === index ? 'dragging' : ''} ${dragOverIndex === index && dragOverSide === 'left' ? 'drag-over-left' : ''} ${dragOverIndex === index && dragOverSide === 'right' ? 'drag-over-right' : ''}`}
                                draggable="true"
                                onDragStart={(e) => handleDragStart(e, index)}
                                onDragEnter={(e) => handleDragEnter(e, index)}
                                onDragOver={(e) => handleDragOver(e, index)}
                                onDragLeave={(e) => handleDragLeave(e, index)}
                                onDrop={(e) => handleDrop(e, index)}
                                onDragEnd={handleDragEnd}
                              >
                                <div className="photo-order-number">{index + 1}</div>
                                <img
                                  src={photoUrl}
                                  alt={`Photo ${index + 1}`}
                                  className="photo-preview"
                                  draggable="false"
                                  onClick={() => handlePhotoClick(index)}
                                  style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
                                />
                                <button
                                  type="button"
                                  className="photo-delete-btn"
                                  onClick={() => handlePhotoDelete(photoId)}
                                  title="Fotoğrafı Sil"
                                >
                                  <FaTimes />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Project Code Display */}
                <div className="project-code-display">
                  Proje Kodu: {projectCode}
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Makine Adı</label>
                    <AutocompleteInput
                      value={formData.machineName}
                      onChange={(e) => handleInputChange('machineName', e.target.value)}
                      onSelect={(val) => tryAutoFillSpecs('machineName', val)}
                      suggestions={autofillData.machineNames}
                      placeholder="Dmg Mori"
                    />
                  </div>
                  <div className="form-group">
                    <label>Makine Modeli</label>
                    <AutocompleteInput
                      value={formData.model}
                      onChange={(e) => handleInputChange('model', e.target.value)}
                      onSelect={(val) => tryAutoFillSpecs('model', val)}
                      suggestions={autofillData.machineModels}
                      placeholder="Model adı"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Yılı</label>
                    <AutocompleteInput
                      value={formData.year}
                      onChange={(e) => handleInputChange('year', e.target.value)}
                      suggestions={autofillData.years}
                      placeholder="2024"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Saati</label>
                    <input
                      type="text"
                      value={formData.workingHours}
                      onChange={handleWorkingHoursInput}
                      onKeyPress={handleWorkingHoursKeyPress}
                      placeholder="Çalışma saati"
                    />
                  </div>
                  <div className="form-group">
                    <label>Devri</label>
                    <input
                      type="text"
                      value={formData.repairHours}
                      onChange={handleRpmInput}
                      onKeyPress={handleRpmKeyPress}
                      placeholder="Devri/dakika"
                    />
                  </div>
                  <div className="form-group">
                    <label>Makinenin Çektiği Güç</label>
                    <AutocompleteInput
                      value={formData.machinePower}
                      onChange={(e) => handleInputChange('machinePower', e.target.value)}
                      suggestions={autofillData.machinePowers}
                      placeholder="25 Kw"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Seri No</label>
                    <AutocompleteInput
                      value={formData.serialNumber}
                      onChange={(e) => handleInputChange('serialNumber', e.target.value)}
                      suggestions={autofillData.serialNumbers}
                      placeholder="Seri numarası"
                    />
                  </div>
                  <div className="form-group">
                    <label>Takım Sayısı</label>
                    <input
                      type="text"
                      value={formData.teamCount}
                      onChange={(e) => handleInputChange('teamCount', e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Ticari Tanımı</label>
                    <AutocompleteInput
                      value={formData.machineType}
                      onChange={(e) => handleInputChange('machineType', e.target.value)}
                      suggestions={autofillData.types}
                      placeholder="CNC işleme merkezi"
                    />
                  </div>
                  <div className="form-group">
                    <label>Makine Durumu</label>
                    <select
                      value={formData.condition}
                      onChange={(e) => handleInputChange('condition', e.target.value)}
                      className="form-select"
                    >
                      <option value="">Seçiniz</option>
                      <option value="NEW">Sıfır</option>
                      <option value="USED">2. El</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Makine Menşei</label>
                    <AutocompleteInput
                      value={formData.machineOrigin}
                      onChange={(e) => handleInputChange('machineOrigin', e.target.value)}
                      suggestions={autofillData.machineOrigins}
                      placeholder="Almanya"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Makine Net Kilo</label>
                    <AutocompleteInput
                      value={formData.machineNetWeight}
                      onChange={(e) => handleInputChange('machineNetWeight', e.target.value)}
                      suggestions={autofillData.netWeights}
                      placeholder="kg"
                    />
                  </div>
                  <div className="form-group">
                    <label>Ek Kilo</label>
                    <AutocompleteInput
                      value={formData.additionalWeight}
                      onChange={(e) => handleInputChange('additionalWeight', e.target.value)}
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
                      onChange={(e) => handleInputChange('xMovement', e.target.value)}
                      onBlur={(e) => handleMovementBlur('xMovement', e.target.value)}
                      suggestions={autofillData.xMovements}
                      placeholder="1000mm"
                    />
                  </div>
                  <div className="form-group">
                    <label>Y Hareketi</label>
                    <AutocompleteInput
                      value={formData.yMovement}
                      onChange={(e) => handleInputChange('yMovement', e.target.value)}
                      onBlur={(e) => handleMovementBlur('yMovement', e.target.value)}
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
                      onChange={(e) => handleInputChange('zMovement', e.target.value)}
                      onBlur={(e) => handleMovementBlur('zMovement', e.target.value)}
                      suggestions={autofillData.zMovements}
                      placeholder="300mm"
                    />
                  </div>
                  <div className="form-group">
                    <label>A Hareketi</label>
                    <AutocompleteInput
                      value={formData.aMovement}
                      onChange={(e) => handleInputChange('aMovement', e.target.value)}
                      onBlur={(e) => handleMovementBlur('aMovement', e.target.value)}
                      suggestions={autofillData.aMovements}
                      placeholder="360°"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>B Hareketi</label>
                    <AutocompleteInput
                      value={formData.bMovement}
                      onChange={(e) => handleInputChange('bMovement', e.target.value)}
                      onBlur={(e) => handleMovementBlur('bMovement', e.target.value)}
                      suggestions={autofillData.bMovements}
                      placeholder="360°"
                    />
                  </div>
                  <div className="form-group">
                    <label>C Hareketi</label>
                    <AutocompleteInput
                      value={formData.cMovement}
                      onChange={(e) => handleInputChange('cMovement', e.target.value)}
                      onBlur={(e) => handleMovementBlur('cMovement', e.target.value)}
                      suggestions={autofillData.cMovements}
                      placeholder="360°"
                    />
                  </div>
                  <div className="form-group">
                    <label>Gripper Tipi</label>
                    <AutocompleteInput
                      value={formData.holderType}
                      onChange={(e) => handleInputChange('holderType', e.target.value)}
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
                      onChange={(e) => handleInputChange('machineWidth', e.target.value)}
                      suggestions={autofillData.machineWidths}
                      placeholder="2000"
                    />
                  </div>
                  <div className="form-group">
                    <label>Makine Uzunluğu</label>
                    <AutocompleteInput
                      value={formData.machineLength}
                      onChange={(e) => handleInputChange('machineLength', e.target.value)}
                      suggestions={autofillData.machineLengths}
                      placeholder="3000"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Makine Yüksekliği</label>
                    <AutocompleteInput
                      value={formData.machineHeight}
                      onChange={(e) => handleInputChange('machineHeight', e.target.value)}
                      suggestions={autofillData.machineHeights}
                      placeholder="2500"
                    />
                  </div>
                  <div className="form-group">
                    <label>Maksimum Malzeme Ağırlığı</label>
                    <AutocompleteInput
                      value={formData.maxMaterialWeight}
                      onChange={(e) => handleInputChange('maxMaterialWeight', e.target.value)}
                      suggestions={autofillData.maxMaterialWeights}
                      placeholder="5000"
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
                      <option value="Heidenhain">Heidenhain</option>
                      <option value="Siemens">Siemens</option>
                      <option value="Fanuc">Fanuc</option>
                      <option value="Other">Other</option>
                    </select>
                    {formData.operatingSystem === 'Other' && (
                      <input
                        type="text"
                        placeholder="İşletim sistemi adını giriniz"
                        value={formData.customOperatingSystem}
                        onChange={(e) => handleInputChange('customOperatingSystem', e.target.value)}
                        className="form-input"
                        style={{ marginTop: '8px' }}
                      />
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
                    <div className="measurement-group">
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

                    <div className="measurement-group">
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

                    <div className="measurement-group">
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

                    <div className="measurement-group">
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

                    <div className="measurement-group">
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

                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group full-width">
                    <label>Yanında Verilecek Ek Aksesuar</label>
                    <AutocompleteInput
                      value={formData.accessoryData}
                      onChange={(e) => handleInputChange('accessoryData', e.target.value)}
                      suggestions={autofillData.additionalEquipments}
                      placeholder="Takım Çantası"
                    />
                  </div>
                </div>
              </div>

              {/* Photo Display Section (Right Side) */}
              <div className="photo-display-section">
                <h3 className="photo-section-title">Fotolar</h3>
                {getCoverPhoto() ? (
                  <div
                    className="cover-photo-container"
                    onClick={handlePhotoGalleryClick}
                  >
                    <img
                      src={getCoverPhoto()}
                      alt="Kapak Fotoğrafı"
                      className="cover-photo"
                    />
                    {formData.photos.length > 1 && (
                      <div className="photo-count-overlay">
                        {formData.photos.length} Fotoğraf
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="cover-photo-placeholder" onClick={openFileUpload} style={{ cursor: 'pointer' }} title="Fotoğraf eklemek için tıklayın">
                    <span>Fotoğraf ekleyin</span>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="form-actions">
              <button type="button" className="btn-cancel" onClick={onClose}>İptal</button>
              <button
                type="button"
                className="btn-save"
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? 'Güncelleniyor...' : 'Güncelle'}
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
                    src={formData.photos[selectedPhotoIndex]?.url || formData.photos[selectedPhotoIndex]}
                    alt={`Photo ${selectedPhotoIndex + 1}`}
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
                  {formData.photos.length > 1 && (
                    <div className="photo-gallery-thumbnails">
                      {formData.photos.map((photo, index) => {
                        const photoUrl = photo.url || photo;
                        return (
                          <img
                            key={photo.id || `thumb-${index}`}
                            src={photoUrl}
                            alt={`Thumbnail ${index + 1}`}
                            className={`photo-thumbnail ${selectedPhotoIndex === index ? 'active' : ''}`}
                            onClick={() => setSelectedPhotoIndex(index)}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Photo Gallery Modal with Customer Photo Management */}
            {showPhotoGalleryModal && (
              <div className="photo-gallery-modal-overlay" onClick={closePhotoGalleryModal}>
                <div className="photo-gallery-modal-content" onClick={(e) => e.stopPropagation()}>
                  <div className="photo-gallery-modal-header">
                    <h3>Fotoğraf Galerisi</h3>
                    <button className="photo-gallery-modal-close" onClick={closePhotoGalleryModal}>
                      <FaTimes />
                    </button>
                  </div>

                  <div className="photo-gallery-modal-body">
                    <div className="customer-photos-section">
                      <h4>Müşteriye Gönderilecek Fotoğraflar (İlk 10)</h4>
                      <p className="photo-help-text">İlk fotoğraf kapak fotoğrafıdır. Fotoğrafları yeniden sıralamak için sürükleyip bırakın.</p>
                      <div className="customer-photos-list">
                        {customerPhotoOrder.slice(0, 10).map((orderItem, index) => {
                          const photo = formData.photos.find((p, idx) => getPhotoId(p, idx) === orderItem.photoId);
                          if (!photo) return null;
                          const photoUrl = photo.url || photo;
                          return (
                            <div
                              key={orderItem.photoId}
                              className={`customer-photo-item ${draggedCustomerPhotoIndex === index ? 'dragging' : ''} ${dragOverCustomerIndex === index ? 'drag-over' : ''}`}
                              draggable="true"
                              onDragStart={(e) => handleCustomerPhotoDragStart(e, index)}
                              onDragOver={(e) => handleCustomerPhotoDragOver(e, index)}
                              onDrop={(e) => handleCustomerPhotoDrop(e, index)}
                              onDragEnd={handleCustomerPhotoDragEnd}
                            >
                              <div className="customer-photo-number">{index === 0 ? 'Kapak' : index + 1}</div>
                              <img
                                src={photoUrl}
                                alt={`Customer photo ${index + 1}`}
                                className="customer-photo-thumb"
                                draggable="false"
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="all-photos-section">
                      <h4>Tüm Fotoğraflar</h4>
                      <div className="all-photos-grid">
                        {formData.photos.map((photo, index) => {
                          const photoUrl = photo.url || photo;
                          const photoId = getPhotoId(photo, index);
                          const isCustomerPhoto = customerPhotoOrder.slice(0, 10).some(item => item.photoId === photoId);
                          return (
                            <div
                              key={photoId}
                              className={`all-photo-item ${isCustomerPhoto ? 'customer-photo' : ''}`}
                            >
                              <img
                                src={photoUrl}
                                alt={`Photo ${index + 1}`}
                                className="all-photo-thumb"
                              />
                              {isCustomerPhoto && (
                                <div className="customer-photo-badge">
                                  {customerPhotoOrder.findIndex(item => item.photoId === photoId) === 0
                                    ? 'Kapak'
                                    : customerPhotoOrder.findIndex(item => item.photoId === photoId) + 1}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditProjectModal;

