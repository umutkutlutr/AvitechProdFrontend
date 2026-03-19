import React, { useState, useEffect, useRef } from 'react';
import { FaTimes, FaPaperPlane, FaPlus, FaTrash, FaPencilAlt, FaSearch, FaChevronDown, FaCheck } from 'react-icons/fa';
import projectService from '../../services/projectService';
import clientService from '../../services/clientService';
import accountingService from '../../services/accountingService';
import offerService from '../../services/offerService';
import { getExchangeRates } from '../../services/currencyService';
import './SendOfferModal.css';

const SendOfferModal = ({ service, onClose }) => {
  const [formData, setFormData] = useState({
    ccList: '',
    documentDate: new Date().toLocaleDateString('tr-TR'),
    salesPrice: service?.salesPrice || service?.totalCost || 0
  });
  const [salesPriceDisplay, setSalesPriceDisplay] = useState('');
  const [selectedClient, setSelectedClient] = useState(null);
  const [availableClients, setAvailableClients] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successInfo, setSuccessInfo] = useState(null);
  const [error, setError] = useState(null);
  const [editingField, setEditingField] = useState(null);
  const [loadingClients, setLoadingClients] = useState(false);
  const [isAutoFilled, setIsAutoFilled] = useState(false);
  const [ccEmails, setCcEmails] = useState([]);
  const [newCcEmail, setNewCcEmail] = useState('');
  const [isAddingNewClient, setIsAddingNewClient] = useState(false);
  const [newClientDataReady, setNewClientDataReady] = useState(false);
  const [newClientData, setNewClientData] = useState({
    companyName: '',
    contactName: '',
    email: '',
    phone: '',
    businessPhone: '',
    address: '',
    vergiDairesi: '',
    vergiNo: ''
  });
  const [editableTexts, setEditableTexts] = useState({
    companyName: '',
    address: '',
    contactPerson: '',
    phone: '',
    businessPhone: '',
    email: '',
    country: '',
    vergiDairesi: '',
    vergiNo: '',
    deliveryTerms: 'Makinenin teslimatı, sözleşmede belirtilen tarihte veya tarafların mutabık kaldığı süre içerisinde yapılacaktır.',
    paymentTerms: 'Ödeme, taraflar arasında mutabık kalınan tutar ve vade planına göre, sözleşmede belirtilen yöntemlerle gerçekleştirilecektir.',
    deliveryDate: 'Ödeme onayının ardından, stok ve planlamaya bağlı olarak hemen / anlaşılan tarihte.'
  });
  const [machineFields, setMachineFields] = useState({
    machineModel: '',
    machineType: '',
    manufacturingYear: '',
    stockNumber: '',
    condition: ''
  });
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);
  const clientDropdownRef = useRef(null);
  const editOriginalValueRef = useRef(null);
  const [showConditionsWarning, setShowConditionsWarning] = useState(false);
  const [showPdfPreviewModal, setShowPdfPreviewModal] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState(null);
  const [loadingPdfPreview, setLoadingPdfPreview] = useState(false);
  const [accountingData, setAccountingData] = useState(null);
  const [rates, setRates] = useState(null);

  // Fetch exchange rates on mount
  useEffect(() => {
    getExchangeRates().then(r => setRates(r)).catch(() => {});
  }, []);

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
  const formatInputValue = (value) => {
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
  };

  // Update form data when service prop changes
  useEffect(() => {
    if (service) {
      const price = formData.salesPrice || service.salesPrice || service.totalCost || 0;
      setFormData(prev => ({
        ...prev,
        salesPrice: price
      }));
      // Format the display value
      setSalesPriceDisplay(formatInputValue(String(price)));
    }
  }, [service]);

  // Initialize machine fields from service (PDF layout)
  useEffect(() => {
    if (service) {
      const make = service.make || service.machineMake || service.brand || '';
      const model = service.model || service.machineModel || '';
      const machineModel = [make, model].filter(Boolean).join(' / ') || service.machineName || service.title || '';
      const machineType = service.type || 'CNC machining centre';
      const year = service.year ?? service.machineYear ?? null;
      const cond = service.condition;
      const conditionDisplay = typeof cond === 'string' ? cond : (cond?.displayName || cond);
      setMachineFields({
        machineModel: machineModel || '',
        machineType: machineType || '',
        manufacturingYear: year != null ? String(year) : '',
        stockNumber: service.id ? String(service.id) : '',
        condition: conditionDisplay || '2. El'
      });
    }
  }, [service]);

  // Fetch accounting data (label price + total cost) on mount
  useEffect(() => {
    const projectId = service?.id || service?.projectId;
    if (!projectId) return;

    accountingService.getDraft(projectId)
      .then(draft => {
        const gc = draft?.generalCosts;
        if (gc) {
          setAccountingData(prev => ({
            ...prev,
            labelPrice: gc.salesPrice,
            labelCurrency: gc.salesCurrency || 'EUR',
          }));
          if (gc.salesPrice && !salesPriceDisplay) {
            const price = gc.salesPrice;
            setSalesPriceDisplay(formatInputValue(String(price)));
            setFormData(prev => ({ ...prev, salesPrice: price }));
          }
        }
      })
      .catch(() => {});

    accountingService.getCostSummary(projectId)
      .then(summary => {
        if (summary && summary.totalCostTry != null) {
          setAccountingData(prev => ({ ...prev, totalCostTry: summary.totalCostTry }));
        }
      })
      .catch(() => {});
  }, [service?.id, service?.projectId]);

  // Initialize display value on mount
  useEffect(() => {
    const initialPrice = service?.salesPrice || service?.totalCost || 0;
    if (initialPrice && !salesPriceDisplay) {
      setSalesPriceDisplay(formatInputValue(String(initialPrice)));
    }
  }, []);

  // Fetch clients on component mount
  useEffect(() => {
    const fetchClients = async () => {
      setLoadingClients(true);
      try {
        const clients = await clientService.getClients();
        setAvailableClients(clients);
      } catch (error) {
        console.error('Error fetching clients:', error);
        setError('Müşteriler yüklenirken bir hata oluştu');
      } finally {
        setLoadingClients(false);
      }
    };

    fetchClients();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (clientDropdownRef.current && !clientDropdownRef.current.contains(event.target)) {
        setIsClientDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle sales price input change
  const handleSalesPriceChange = (e) => {
    const rawValue = e.target.value;

    // Allow empty string, numbers, dots, and decimal points
    if (rawValue === '' || rawValue === '.' || /^-?[\d.]*$/.test(rawValue)) {
      // Format the input value with dots
      const formattedValue = formatInputValue(rawValue);
      setSalesPriceDisplay(formattedValue);

      // Parse to get numeric value (remove dots, keep decimal)
      const cleanedValue = parseFormattedInput(formattedValue);
      const numericValue = parseFloat(cleanedValue);

      // Update the actual numeric value
      if (cleanedValue === '' || cleanedValue === '.' || isNaN(numericValue)) {
        setFormData(prev => ({
          ...prev,
          salesPrice: 0
        }));
      } else {
        setFormData(prev => ({
          ...prev,
          salesPrice: numericValue
        }));
      }
    }
  };

  // Handle sales price blur
  const handleSalesPriceBlur = (e) => {
    const rawValue = e.target.value;

    // Parse to get numeric value (remove dots, keep decimal)
    const cleanedValue = parseFormattedInput(rawValue);
    const numericValue = parseFloat(cleanedValue);

    if (cleanedValue === '' || cleanedValue === '.' || isNaN(numericValue)) {
      // Reset to current salesPrice
      setSalesPriceDisplay(formatInputValue(String(formData.salesPrice || '0')));
    } else {
      // Format the final value with dots
      const formatted = formatInputValue(String(numericValue));
      setSalesPriceDisplay(formatted);
      setFormData(prev => ({
        ...prev,
        salesPrice: numericValue
      }));
    }
  };

  // Filter clients based on search query
  const filteredClients = availableClients.filter(client => {
    const searchLower = clientSearchQuery.toLowerCase();
    return (
      client.companyName?.toLowerCase().includes(searchLower) ||
      client.contactName?.toLowerCase().includes(searchLower) ||
      client.email?.toLowerCase().includes(searchLower) ||
      client.phone?.toLowerCase().includes(searchLower) ||
      client.address?.toLowerCase().includes(searchLower)
    );
  });

  const handleClientSelect = (clientId) => {
    setSelectedClientId(clientId);
    setIsClientDropdownOpen(false);
    setClientSearchQuery('');
  };

  const toggleClientDropdown = () => {
    if (!selectedClient) {
      setIsClientDropdownOpen(!isClientDropdownOpen);
    }
  };

  // Auto-fill form when client is selected
  useEffect(() => {
    const handleClientSelection = async () => {
      if (selectedClientId && !selectedClient) {
        const client = availableClients.find(c => c.id === parseInt(selectedClientId));
        if (client) {
          try {
            // Fetch detailed client information
            const detailedClient = await clientService.getClientById(selectedClientId);

            // Auto-fill form fields with client information
            setEditableTexts(prev => ({
              ...prev,
              companyName: detailedClient.companyName || '',
              address: detailedClient.address || '',
              contactPerson: detailedClient.contactName || '',
              phone: detailedClient.phone || '',
              businessPhone: detailedClient.businessPhone || '',
              email: detailedClient.email || '',
              vergiDairesi: detailedClient.vergiDairesi || '',
              vergiNo: detailedClient.vergiNo || ''
            }));

            setSelectedClient(client);
            setIsAutoFilled(true);
          } catch (error) {
            console.error('Error fetching client details:', error);
            // Still add the client even if detailed fetch fails
            setSelectedClient(client);
            setIsAutoFilled(true);
          }
        }
      }
    };

    handleClientSelection();
  }, [selectedClientId, availableClients, selectedClient]);

  const handleAddClient = () => {
    // Only allow adding new client when no client is selected
    if (!selectedClientId && !selectedClient) {
      setIsAddingNewClient(true);
      setNewClientData({
        companyName: '',
        contactName: '',
        email: '',
        phone: '',
        businessPhone: '',
        address: '',
        vergiDairesi: '',
        vergiNo: ''
      });
      // Clear the editable texts to allow manual entry
      setEditableTexts(prev => ({
        ...prev,
        companyName: '',
        address: '',
        contactPerson: '',
        phone: '',
        businessPhone: '',
        email: '',
        vergiDairesi: '',
        vergiNo: ''
      }));
      // Scroll to company name section in the document
      setTimeout(() => {
        const companySection = document.querySelector('.left-column');
        if (companySection) {
          companySection.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    }
  };

  const handleCompanyFieldChange = (field, value) => {
    // Update editable texts
    setEditableTexts(prev => ({
      ...prev,
      [field]: value
    }));

    // Update new client data based on field mapping
    if (field === 'companyName') {
      setNewClientData(prev => ({ ...prev, companyName: value }));
    } else if (field === 'contactPerson') {
      setNewClientData(prev => ({ ...prev, contactName: value }));
    } else if (field === 'email') {
      setNewClientData(prev => ({ ...prev, email: value }));
    } else if (field === 'phone') {
      setNewClientData(prev => ({ ...prev, phone: value }));
    } else if (field === 'businessPhone') {
      setNewClientData(prev => ({ ...prev, businessPhone: value }));
    } else if (field === 'address') {
      setNewClientData(prev => ({ ...prev, address: value }));
    } else if (field === 'vergiDairesi') {
      setNewClientData(prev => ({ ...prev, vergiDairesi: value }));
    } else if (field === 'vergiNo') {
      const numericValue = value.replace(/\D/g, '');
      setNewClientData(prev => ({ ...prev, vergiNo: numericValue }));
    }
    // country: form-only, not in Client entity
  };

  const handleSaveNewClient = () => {
    // Validate all required fields
    if (!newClientData.companyName.trim()) {
      setError('Lütfen şirket adını girin');
      return;
    }
    if (!newClientData.contactName.trim()) {
      setError('Lütfen iletişim kişisini girin');
      return;
    }
    if (!newClientData.email.trim()) {
      setError('Lütfen e-posta adresini girin');
      return;
    }
    if (!newClientData.phone.trim()) {
      setError('Lütfen telefon numarasını girin');
      return;
    }
    if (!newClientData.address.trim()) {
      setError('Lütfen adresi girin');
      return;
    }

    // Mark new client data as ready
    setNewClientDataReady(true);
    setIsAddingNewClient(false);
    setError(null);
  };

  const handleCancelNewClient = () => {
    setIsAddingNewClient(false);
    setNewClientDataReady(false);
    setNewClientData({
      companyName: '',
      contactName: '',
      email: '',
      phone: '',
      businessPhone: '',
      address: '',
      vergiDairesi: '',
      vergiNo: ''
    });
    // Clear the preview as well
    setEditableTexts(prev => ({
      ...prev,
      companyName: '',
      address: '',
      contactPerson: '',
      phone: '',
      businessPhone: '',
      email: '',
      vergiDairesi: '',
      vergiNo: ''
    }));
  };

  const handleRemoveClient = () => {
    setSelectedClient(null);
    setSelectedClientId('');
    setIsAutoFilled(false);
    setIsAddingNewClient(false);
    setNewClientDataReady(false);
    setNewClientData({
      companyName: '',
      contactName: '',
      email: '',
      phone: '',
      businessPhone: '',
      address: '',
      vergiDairesi: '',
      vergiNo: ''
    });
    setEditableTexts(prev => ({
      ...prev,
      companyName: '',
      address: '',
      contactPerson: '',
      phone: '',
      businessPhone: '',
      email: '',
      vergiDairesi: '',
      vergiNo: ''
    }));
  };

  const handleAddCcEmail = () => {
    if (newCcEmail.trim() && !ccEmails.includes(newCcEmail.trim())) {
      setCcEmails(prev => [...prev, newCcEmail.trim()]);
      setNewCcEmail('');
    }
  };

  const handleRemoveCcEmail = (emailToRemove) => {
    setCcEmails(prev => prev.filter(email => email !== emailToRemove));
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddClient();
    }
  };

  const handleEditClick = (field) => {
    editOriginalValueRef.current = editableTexts[field];
    setEditingField(field);
    // Hide warning when user starts editing conditions
    if (['deliveryTerms', 'paymentTerms', 'deliveryDate'].includes(field)) {
      setShowConditionsWarning(false);
    }
  };

  const handleEditSave = (field, value) => {
    setEditableTexts(prev => ({
      ...prev,
      [field]: value
    }));
    editOriginalValueRef.current = null;
    setEditingField(null);
  };

  const handleEditCancel = () => {
    const field = editingField;
    if (field && editOriginalValueRef.current !== null) {
      setEditableTexts(prev => ({ ...prev, [field]: editOriginalValueRef.current }));
    }
    editOriginalValueRef.current = null;
    setEditingField(null);
  };

  const handleEditKeyPress = (e, field) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleEditSave(field, e.target.value);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleEditCancel();
    }
  };

  const validateConditions = () => {
    // Check if all three conditions are filled and meaningful
    const isDeliveryTermsValid = editableTexts.deliveryTerms && editableTexts.deliveryTerms.trim().length > 0;
    const isPaymentTermsValid = editableTexts.paymentTerms && editableTexts.paymentTerms.trim().length > 0;
    const isDeliveryDateValid = editableTexts.deliveryDate && editableTexts.deliveryDate.trim().length > 0;

    return isDeliveryTermsValid && isPaymentTermsValid && isDeliveryDateValid;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Validate client
    let clientToUse = selectedClient;
    if (newClientDataReady && !selectedClient) {
      try {
        const createdClient = await clientService.createClient(newClientData);
        clientToUse = createdClient;
        setSelectedClient(createdClient);
        setSelectedClientId(String(createdClient.id));
        setNewClientDataReady(false);
        setNewClientData({ companyName: '', contactName: '', email: '', phone: '', businessPhone: '', address: '', vergiDairesi: '', vergiNo: '' });
      } catch (createError) {
        setError(createError.message || 'Müşteri oluşturulurken bir hata oluştu');
        return;
      }
    } else if (!selectedClient && !clientToUse) {
      setError('Lütfen bir müşteri seçin veya yeni müşteri bilgilerini kaydedin');
      return;
    }

    const priceFromInput = parseFloat(parseFormattedInput(salesPriceDisplay || ''));
    const priceToSend = !isNaN(priceFromInput) && priceFromInput > 0 ? priceFromInput : formData.salesPrice;
    if (!priceToSend || priceToSend <= 0 || isNaN(priceToSend)) {
      setError('Geçerli bir teklif fiyatı giriniz (0\'dan büyük olmalı)');
      return;
    }

    const description = [
      `Teslimat Şartları: ${editableTexts.deliveryTerms}`,
      `Ödeme Şartları: ${editableTexts.paymentTerms}`,
      `Teslimat Tarihi: ${editableTexts.deliveryDate}`
    ].join('\n');

    // Validate conditions - collect invalid keys for PDF highlighting
    const invalidTermKeys = [];
    if (!editableTexts.deliveryTerms?.trim()) invalidTermKeys.push('Teslimat Şartları');
    if (!editableTexts.paymentTerms?.trim()) invalidTermKeys.push('Ödeme Şartları');
    if (!editableTexts.deliveryDate?.trim()) invalidTermKeys.push('Teslimat Tarihi');
    if (invalidTermKeys.length > 0) {
      setShowConditionsWarning(true);
      setTimeout(() => {
        const termsSection = document.querySelector('.terms-section');
        if (termsSection) termsSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    } else {
      setShowConditionsWarning(false);
    }

    // Fetch PDF preview and show modal
    setLoadingPdfPreview(true);
    try {
      const blob = await offerService.previewOfferPdf(
        service?.id || service?.projectId,
        clientToUse.id,
        priceToSend,
        description,
        invalidTermKeys
      );
      const url = URL.createObjectURL(blob);
      setPdfPreviewUrl(url);
      setShowPdfPreviewModal(true);
    } catch (err) {
      console.error('PDF preview error:', err);
      setError(err.message || 'PDF önizleme alınamadı');
    } finally {
      setLoadingPdfPreview(false);
    }
  };

  const handleConfirmSend = async () => {
    setError(null);
    setIsSubmitting(true);

    try {
      if (!selectedClient?.id) {
        setError('Müşteri bilgisi bulunamadı. Lütfen sayfayı yenileyip tekrar deneyin.');
        setIsSubmitting(false);
        return;
      }

      const description = [
        `Teslimat Şartları: ${editableTexts.deliveryTerms}`,
        `Ödeme Şartları: ${editableTexts.paymentTerms}`,
        `Teslimat Tarihi: ${editableTexts.deliveryDate}`
      ].join('\n');

      const priceFromInput = parseFloat(parseFormattedInput(salesPriceDisplay || ''));
      const priceToSend = !isNaN(priceFromInput) && priceFromInput > 0 ? priceFromInput : formData.salesPrice;
      const projectId = service?.id || service?.projectId;

      const results = await projectService.sendOfferToClients(
        projectId,
        [selectedClient.id],
        ccEmails,
        priceToSend,
        description
      );
      const firstResult = Array.isArray(results) ? results[0] : results;

      setSuccessInfo(firstResult || null);
      setShowSuccess(true);
      setShowPdfPreviewModal(false);
      if (pdfPreviewUrl) {
        URL.revokeObjectURL(pdfPreviewUrl);
        setPdfPreviewUrl(null);
      }

      setTimeout(() => onClose(), 2000);
    } catch (err) {
      console.error('Error sending offer:', err);
      setError(err.message || 'Teklif gönderilirken bir hata oluştu');
    } finally {
      setIsSubmitting(false);
    }
  };


  // Format number with dots as thousand separators (e.g., 12000.03 -> 12.000.03)
  const formatNumberWithDots = (number) => {
    if (number === null || number === undefined || isNaN(number)) {
      return '0.00';
    }

    // Handle negative numbers
    const isNegative = number < 0;
    const absNumber = Math.abs(number);

    // Convert to string and split by decimal point
    const numStr = absNumber.toString();
    const parts = numStr.split('.');

    // Format integer part with dots as thousand separators
    const integerPart = parts[0];
    const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

    // Handle decimal part
    let decimalPart = '00';
    if (parts.length > 1) {
      // Keep decimal part, pad to 2 digits if needed
      decimalPart = parts[1].padEnd(2, '0').substring(0, 2);
    }

    // Combine parts with negative sign if needed
    const formatted = `${formattedInteger}.${decimalPart}`;
    return isNegative ? `-${formatted}` : formatted;
  };

  const formatCurrency = (amount, currency = 'EUR') => {
    const formattedAmount = formatNumberWithDots(amount);
    if (currency === 'TRY') {
      return `₺${formattedAmount}`;
    }
    return `€${formattedAmount}`;
  };

  // Clean machine name by removing project code in parentheses (e.g., "brand (AVEMAK-097)" -> "brand")
  const cleanMachineName = (name) => {
    if (!name) return name;
    // Remove project code pattern like (AVEMAK-XXX) from the end
    return name.replace(/\s*\(AVEMAK-\d+\)\s*$/, '').trim();
  };

  return (
    <div className="send-offer-modal-overlay">
      <div className="send-offer-modal">
        <div className="modal-header">
          <h2>Teklif Gönder</h2>
          <div className="header-right">
            <img
              src="/assets/avitech_logo.png"
              alt="Avitech Logo"
              className="avitech-logo"
            />
            <button className="close-button" onClick={onClose}>
              <FaTimes />
            </button>
          </div>
        </div>

        <div className="email-form-container">
          {/* Cost Summary Banner - Toplam Maliyet, Etiket Fiyatı, Kar Analizi yan yana */}
          {accountingData && (accountingData.totalCostTry != null || accountingData.labelPrice != null || formData.salesPrice > 0) && (
            <div style={{
              display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap'
            }}>
              <div style={{
                flex: '1 1 120px', minWidth: '120px', background: '#fff5f5', border: '1px solid #fed7d7',
                borderRadius: '8px', padding: '10px 12px', textAlign: 'center'
              }}>
                <div style={{ fontSize: '10px', color: '#c53030', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '3px' }}>Toplam Maliyet</div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: '#c53030' }}>
                  {accountingData.totalCostTry != null ? (() => {
                    const eurRate = parseFloat(rates?.EUR) || 38.50;
                    const totalEur = parseFloat(accountingData.totalCostTry) / eurRate;
                    return <>€{totalEur.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}<br /><span style={{ fontSize: '12px', opacity: 0.9 }}>₺{parseFloat(accountingData.totalCostTry).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span></>;
                  })() : '-'}
                </div>
              </div>
              <div style={{
                flex: '1 1 120px', minWidth: '120px', background: '#f0fff4', border: '1px solid #c6f6d5',
                borderRadius: '8px', padding: '10px 12px', textAlign: 'center'
              }}>
                <div style={{ fontSize: '10px', color: '#276749', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '3px' }}>Etiket Fiyatı</div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: '#276749' }}>
                  {accountingData.labelPrice != null ? `${accountingData.labelCurrency === 'USD' ? '$' : '€'}${parseFloat(accountingData.labelPrice).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}` : '-'}
                </div>
              </div>
              <div style={{
                flex: '1 1 120px', minWidth: '120px', background: '#faf5ff', border: '1px solid #e9d8fd',
                borderRadius: '8px', padding: '10px 12px', textAlign: 'center'
              }}>
                <div style={{ fontSize: '10px', color: '#6b46c1', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '3px' }}>Kar Analizi</div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: '#6b46c1' }}>
                  {accountingData.totalCostTry != null && formData.salesPrice > 0 ? (() => {
                    const eurRate = parseFloat(rates?.EUR) || 38.50;
                    const salesTry = formData.salesPrice * eurRate;
                    const profitTry = salesTry - parseFloat(accountingData.totalCostTry);
                    const profitEur = profitTry / eurRate;
                    const profitPct = salesTry > 0 ? (profitTry / salesTry) * 100 : 0;
                    return (
                      <span style={{ color: profitTry >= 0 ? '#6b46c1' : '#c53030' }}>
                        €{profitEur.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} (%{profitPct.toLocaleString('tr-TR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })})<br />
                        <span style={{ fontSize: '12px', opacity: 0.9 }}>₺{profitTry.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </span>
                    );
                  })() : '-'}
                </div>
              </div>
            </div>
          )}
          <form onSubmit={handleSubmit}>
            <div className="email-inputs">
              <div className="input-group">
                <label>Teklif Fiyatı (EUR):</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={salesPriceDisplay}
                  onChange={handleSalesPriceChange}
                  onBlur={handleSalesPriceBlur}
                  placeholder="Teklif fiyatını girin"
                />
              </div>

              {/* Client Selection Section */}
              <div className="input-group">
                <div className="input-label-row">
                  <label>Müşteri Seçimi:</label>
                  <button
                    type="button"
                    onClick={handleAddClient}
                    className="btn-add-client"
                    disabled={selectedClient || selectedClientId || isAddingNewClient}
                    title={isAddingNewClient ? 'Yeni müşteri formu zaten açık' : 'Yeni müşteri ekle'}
                  >
                    <FaPlus />
                    <span style={{ marginLeft: 8 }}>Müşteri Ekle</span>
                  </button>
                </div>
                <div className="client-selection-container">
                  <div className="custom-client-dropdown" ref={clientDropdownRef}>
                    <div
                      className={`custom-dropdown-trigger ${selectedClient ? 'disabled' : ''} ${isClientDropdownOpen ? 'active' : ''}`}
                      onClick={toggleClientDropdown}
                    >
                      <span className="dropdown-trigger-text">
                        {loadingClients
                          ? 'Müşteriler yükleniyor...'
                          : selectedClient
                            ? `${selectedClient.companyName} - ${selectedClient.contactName}`
                            : 'Müşteri seçin'}
                      </span>
                      <FaChevronDown className="dropdown-trigger-icon" />
                    </div>

                    {isClientDropdownOpen && !selectedClient && (
                      <div className="custom-dropdown-menu">
                        <div className="custom-dropdown-search">
                          <input
                            type="text"
                            placeholder="Müşteri ara..."
                            value={clientSearchQuery}
                            onChange={(e) => setClientSearchQuery(e.target.value)}
                            className="custom-dropdown-search-input"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                        <div className="custom-dropdown-list">
                          {filteredClients.length > 0 ? (
                            filteredClients.map((client) => (
                              <div
                                key={client.id}
                                className="custom-dropdown-item custom-dropdown-item-full"
                                onClick={() => handleClientSelect(client.id)}
                              >
                                <div className="dropdown-item-main">
                                  {client.companyName}
                                </div>
                                <div className="dropdown-item-sub">
                                  {client.contactName && <span>{client.contactName}</span>}
                                  {client.email && <span> • {client.email}</span>}
                                </div>
                                {(client.phone || client.address || client.vergiDairesi || client.vergiNo) && (
                                  <div className="dropdown-item-extra">
                                    {client.phone && <span>Tel: {client.phone}</span>}
                                    {client.businessPhone && <span> • İş: {client.businessPhone}</span>}
                                    {client.address && <span> • {client.address}</span>}
                                    {(client.vergiDairesi || client.vergiNo) && (
                                      <span> • VD: {client.vergiDairesi || '-'} / VN: {client.vergiNo || '-'}</span>
                                    )}
                                  </div>
                                )}
                              </div>
                            ))
                          ) : (
                            <div className="custom-dropdown-empty">
                              Müşteri bulunamadı
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {selectedClient && (
                    <div className="client-list">
                      <div className="client-item">
                        <span className="client-text">
                          {selectedClient.companyName} - {selectedClient.contactName} ({selectedClient.email})
                        </span>
                        <button
                          type="button"
                          onClick={handleRemoveClient}
                          className="btn-remove-client"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* CC Email Section */}
              <div className="input-group">
                <label>CC E-postalar:</label>
                <div className="cc-email-container">
                  <div className="cc-email-input-row">
                    <input
                      type="email"
                      value={newCcEmail}
                      onChange={(e) => setNewCcEmail(e.target.value)}
                      placeholder="CC e-posta adresi girin. (Eklemek istediğiniz mailleri + tuşuna basarak ekleyebilirsiniz)"
                      className="cc-email-input"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddCcEmail();
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleAddCcEmail}
                      className="btn-add-cc"
                      disabled={!newCcEmail.trim()}
                    >
                      <FaPlus />
                    </button>
                  </div>

                  {ccEmails.length > 0 && (
                    <div className="cc-email-list">
                      {ccEmails.map((email, index) => (
                        <div key={index} className="cc-email-item">
                          <span className="cc-email-text">{email}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveCcEmail(email)}
                            className="btn-remove-cc"
                          >
                            <FaTrash />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="offer-document offer-document-pdf-layout">
              {/* PDF Header Bar */}
              <div className="offer-header-bar">
                <div className="offer-header-bar-inner">
                  <span>Proje Kodu: <strong>{service?.projectCode || '-'}</strong></span>
                  <span>
                    Teklif Tarihi:{' '}
                    <input
                      type="text"
                      value={formData.documentDate}
                      onChange={(e) => handleInputChange('documentDate', e.target.value)}
                      className="offer-date-input"
                      placeholder="gg.aa.yyyy"
                    />
                  </span>
                </div>
              </div>

              {/* PDF Meta Table: TEKLİF ÖZETİ | MÜŞTERİ BİLGİLERİ */}
              <div className="offer-meta-table">
                <div className="meta-left">
                  <div className="meta-title">TEKLİF ÖZETİ</div>
                  <div className="meta-row"><span className="meta-label">Proje Kodu:</span> <span className="meta-value">{service?.projectCode || '-'}</span></div>
                  <div className="meta-row"><span className="meta-label">Müşteri No:</span> <span className="meta-value">{selectedClient?.id || (newClientDataReady ? 'Yeni' : '-')}</span></div>
                  <div className="meta-row"><span className="meta-label">Teklif Tarihi:</span> <span className="meta-value"><input type="text" value={formData.documentDate} onChange={(e) => handleInputChange('documentDate', e.target.value)} className="meta-input" placeholder="gg.aa.yyyy" /></span></div>
                  <div className="meta-row"><span className="meta-label">Para Birimi:</span> <span className="meta-value">EUR (€)</span></div>
                </div>
                <div className="meta-right">
                  <div className="meta-title">MÜŞTERİ BİLGİLERİ</div>
                  <div className="customer-fields">
                    <div className="customer-field-row">
                      <span className="meta-label">Şirket:</span>
                      {(isAddingNewClient || newClientDataReady) ? (
                        <input type="text" value={editableTexts.companyName} onChange={(e) => handleCompanyFieldChange('companyName', e.target.value)} className="meta-input full-width" placeholder="Şirket adı" />
                      ) : (
                        <span className="meta-value-readonly">{editableTexts.companyName || '-'}</span>
                      )}
                    </div>
                    <div className="customer-field-row">
                      <span className="meta-label">İletişim:</span>
                      {(isAddingNewClient || newClientDataReady) ? (
                        <input type="text" value={editableTexts.contactPerson} onChange={(e) => handleCompanyFieldChange('contactPerson', e.target.value)} className="meta-input full-width" placeholder="İletişim kişisi" />
                      ) : (
                        <span className="meta-value-readonly">{editableTexts.contactPerson || '-'}</span>
                      )}
                    </div>
                    <div className="customer-field-row">
                      <span className="meta-label">Adres/Şehir:</span>
                      {(isAddingNewClient || newClientDataReady) ? (
                        <input type="text" value={editableTexts.address} onChange={(e) => handleCompanyFieldChange('address', e.target.value)} className="meta-input full-width" placeholder="Adres veya şehir" />
                      ) : (
                        <span className="meta-value-readonly">{editableTexts.address || '-'}</span>
                      )}
                    </div>
                    <div className="customer-field-row">
                      <span className="meta-label">Ülke:</span>
                      {(isAddingNewClient || newClientDataReady) ? (
                        <input type="text" value={editableTexts.country} onChange={(e) => handleCompanyFieldChange('country', e.target.value)} className="meta-input full-width" placeholder="Ülke" />
                      ) : (
                        <span className="meta-value-readonly">{editableTexts.country || '-'}</span>
                      )}
                    </div>
                    <div className="customer-field-row">
                      <span className="meta-label">E-posta:</span>
                      {(isAddingNewClient || newClientDataReady) ? (
                        <input type="email" value={editableTexts.email} onChange={(e) => handleCompanyFieldChange('email', e.target.value)} className="meta-input full-width" placeholder="E-posta" />
                      ) : (
                        <span className="meta-value-readonly">{editableTexts.email || '-'}</span>
                      )}
                    </div>
                    <div className="customer-field-row">
                      <span className="meta-label">Telefon:</span>
                      {(isAddingNewClient || newClientDataReady) ? (
                        <input type="text" value={editableTexts.phone} onChange={(e) => handleCompanyFieldChange('phone', e.target.value)} className="meta-input full-width" placeholder="Telefon" />
                      ) : (
                        <span className="meta-value-readonly">{editableTexts.phone || '-'}</span>
                      )}
                    </div>
                    <div className="customer-field-row">
                      <span className="meta-label">İş Tel:</span>
                      {(isAddingNewClient || newClientDataReady) ? (
                        <input type="text" value={editableTexts.businessPhone} onChange={(e) => handleCompanyFieldChange('businessPhone', e.target.value)} className="meta-input full-width" placeholder="İş telefonu" />
                      ) : (
                        <span className="meta-value-readonly">{editableTexts.businessPhone || '-'}</span>
                      )}
                    </div>
                    <div className="customer-field-row">
                      <span className="meta-label">Vergi Dairesi:</span>
                      {(isAddingNewClient || newClientDataReady) ? (
                        <input type="text" value={editableTexts.vergiDairesi} onChange={(e) => handleCompanyFieldChange('vergiDairesi', e.target.value)} className="meta-input full-width" placeholder="Vergi dairesi" />
                      ) : (
                        <span className="meta-value-readonly">{editableTexts.vergiDairesi || '-'}</span>
                      )}
                    </div>
                    <div className="customer-field-row">
                      <span className="meta-label">Vergi No:</span>
                      {(isAddingNewClient || newClientDataReady) ? (
                        <input type="text" value={editableTexts.vergiNo} onChange={(e) => handleCompanyFieldChange('vergiNo', e.target.value)} className="meta-input full-width" placeholder="Vergi no" />
                      ) : (
                        <span className="meta-value-readonly">{editableTexts.vergiNo || '-'}</span>
                      )}
                    </div>
                  </div>
                  {isAddingNewClient && (
                    <div className="inline-edit-actions">
                      <button type="button" onClick={handleCancelNewClient} className="btn-cancel-inline-edit">İptal</button>
                      <button type="button" onClick={handleSaveNewClient} className="btn-save-inline-edit">Kaydet</button>
                    </div>
                  )}
                </div>
              </div>

              <div className="offer-title">
                <h3>MAKİNE SATIŞ TEKLİFİ</h3>
                <div className="offer-subtitle">Tarafımıza iletmiş olduğunuz talep doğrultusunda aşağıda detayları verilen makine için satış teklifimizi bilgilerinize sunarız.</div>
              </div>

              {/* MAKİNE TANIMI VE FİYATLANDIRMA - PDF layout */}
              <div className="section-header-pdf">
                <div className="section-title-pdf">MAKİNE TANIMI VE FİYATLANDIRMA</div>
                <div className="section-line-pdf" />
              </div>
              <div className="machine-details-pdf">
                <table className="machine-table-pdf">
                  <thead>
                    <tr>
                      <th>AÇIKLAMA</th>
                      <th className="qty">ADET</th>
                      <th className="price">TOPLAM FİYAT</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>
                        <div className="desc-main-title">{machineFields.machineModel || '-'}</div>
                        <div className="desc-sub">
                          Tip: <span className="desc-value">{machineFields.machineType || '-'}</span>
                          <br />
                          Model: <span className="desc-value">{machineFields.machineModel || '-'}</span>
                          <br />
                          Üretim Yılı: <span className="desc-value">{machineFields.manufacturingYear || '-'}</span>
                          <br />
                          Stok No: <span className="desc-value">{machineFields.stockNumber || '-'}</span>
                          <br />
                          Kondisyon: <span className="desc-value">{machineFields.condition || '-'}</span>
                        </div>
                      </td>
                      <td className="qty">1</td>
                      <td className="price price-strong">
                        <input type="text" inputMode="decimal" value={salesPriceDisplay} onChange={handleSalesPriceChange} onBlur={handleSalesPriceBlur} className="machine-price-input" placeholder="Fiyat" /> €
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* TİCARİ ŞARTLAR - PDF layout */}
              <div className="section-header-pdf">
                <div className="section-title-pdf">TİCARİ ŞARTLAR</div>
                <div className="section-line-pdf" />
              </div>
              <div className="terms-section">
                  <div className={`terms-row ${showConditionsWarning ? 'terms-row-warning' : ''}`}>
                    <strong>Teslimat Şartları:</strong>
                    {editingField === 'deliveryTerms' ? (
                      <div className="edit-input-container">
                        <textarea
                          value={editableTexts.deliveryTerms}
                          onChange={(e) => setEditableTexts(prev => ({ ...prev, deliveryTerms: e.target.value }))}
                          onKeyDown={(e) => handleEditKeyPress(e, 'deliveryTerms')}
                          onBlur={() => handleEditSave('deliveryTerms', editableTexts.deliveryTerms)}
                          className="inline-edit-textarea"
                          rows={4}
                          autoFocus
                        />
                        <div className="edit-actions">
                          <button
                            type="button"
                            className="btn-save-edit"
                            onClick={() => handleEditSave('deliveryTerms', editableTexts.deliveryTerms)}
                            title="Kaydet (Enter)"
                          >
                            <FaCheck />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <span>
                        <span className="editable-text" onClick={() => handleEditClick('deliveryTerms')}>
                          {editableTexts.deliveryTerms}
                        </span>
                        <span
                          onClick={() => handleEditClick('deliveryTerms')}
                          title="Düzenle"
                          style={{ marginLeft: 8, cursor: 'pointer', color: '#555', display: 'inline-flex', alignItems: 'center' }}
                        >
                          <FaPencilAlt />
                        </span>
                      </span>
                    )}
                  </div>
                  <div className={`terms-row ${showConditionsWarning ? 'terms-row-warning' : ''}`}>
                    <strong>Ödeme Şartları:</strong>
                    {editingField === 'paymentTerms' ? (
                      <div className="edit-input-container">
                        <textarea
                          value={editableTexts.paymentTerms}
                          onChange={(e) => setEditableTexts(prev => ({ ...prev, paymentTerms: e.target.value }))}
                          onKeyDown={(e) => handleEditKeyPress(e, 'paymentTerms')}
                          onBlur={() => handleEditSave('paymentTerms', editableTexts.paymentTerms)}
                          className="inline-edit-textarea"
                          rows={4}
                          autoFocus
                        />
                        <div className="edit-actions">
                          <button
                            type="button"
                            className="btn-save-edit"
                            onClick={() => handleEditSave('paymentTerms', editableTexts.paymentTerms)}
                            title="Kaydet (Enter)"
                          >
                            <FaCheck />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <span>
                        <span className="editable-text" onClick={() => handleEditClick('paymentTerms')}>
                          {editableTexts.paymentTerms}
                        </span>
                        <span
                          onClick={() => handleEditClick('paymentTerms')}
                          title="Düzenle"
                          style={{ marginLeft: 8, cursor: 'pointer', color: '#555', display: 'inline-flex', alignItems: 'center' }}
                        >
                          <FaPencilAlt />
                        </span>
                      </span>
                    )}
                  </div>
                  <div className={`terms-row ${showConditionsWarning ? 'terms-row-warning' : ''}`}>
                    <strong>Teslimat Tarihi:</strong>
                    {editingField === 'deliveryDate' ? (
                      <div className="edit-input-container">
                        <textarea
                          value={editableTexts.deliveryDate}
                          onChange={(e) => setEditableTexts(prev => ({ ...prev, deliveryDate: e.target.value }))}
                          onKeyDown={(e) => handleEditKeyPress(e, 'deliveryDate')}
                          onBlur={() => handleEditSave('deliveryDate', editableTexts.deliveryDate)}
                          className="inline-edit-textarea"
                          rows={4}
                          autoFocus
                        />
                        <div className="edit-actions">
                          <button
                            type="button"
                            className="btn-save-edit"
                            onClick={() => handleEditSave('deliveryDate', editableTexts.deliveryDate)}
                            title="Kaydet (Enter)"
                          >
                            <FaCheck />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <span>
                        <span className="editable-text" onClick={() => handleEditClick('deliveryDate')}>
                          {editableTexts.deliveryDate}
                        </span>
                        <span
                          onClick={() => handleEditClick('deliveryDate')}
                          title="Düzenle"
                          style={{ marginLeft: 8, cursor: 'pointer', color: '#555', display: 'inline-flex', alignItems: 'center' }}
                        >
                          <FaPencilAlt />
                        </span>
                      </span>
                    )}
                  </div>

                {showConditionsWarning && (
                  <div className="conditions-warning">
                    <div className="warning-icon">⚠</div>
                    <div className="warning-text">
                      Lütfen teslimat şartlarını, ödeme şartlarını ve teslimat tarihini kontrol edin ve onaylayın.
                    </div>
                  </div>
                )}
              </div>
            </div>

            {error && (
              <div className="error-message">
                <p>Hata: {error}</p>
              </div>
            )}

            <div className="form-actions">
              <button type="button" className="btn-cancel" onClick={onClose} disabled={isSubmitting}>
                İptal
              </button>
              <button type="submit" className="btn-send" disabled={isSubmitting || loadingPdfPreview}>
                <FaPaperPlane />
                {loadingPdfPreview ? 'PDF hazırlanıyor...' : isSubmitting ? 'Gönderiliyor...' : 'Teklifi Gönder'}
              </button>
            </div>
          </form>
        </div>

        {showSuccess && (
          <div className="success-message">
            <div className="success-content">
              <h3>Teklif Başarıyla Gönderildi!</h3>
              <p>Fiyat: {formatCurrency(formData.salesPrice, 'EUR')}</p>
              {selectedClient && (
                <p>Gönderilen Müşteri: {selectedClient.companyName}</p>
              )}
              {successInfo?.emailSent === false && (
                <p style={{ color: '#b45309', fontWeight: 600 }}>
                  Teklif kaydı oluşturuldu ancak e-posta gönderilemedi: {successInfo.emailError || 'Bilinmeyen hata'}
                </p>
              )}
            </div>
          </div>
        )}

        {showPdfPreviewModal && (
          <div className="confirmation-modal-overlay pdf-preview-overlay">
            <div className="pdf-preview-modal">
              <div className="pdf-preview-header">
                <h3>Teklif PDF Önizlemesi</h3>
                <p className="pdf-preview-subtitle">Gönderilecek teklifi kontrol edin. Onayladığınızda müşteriye e-posta ile gönderilecektir.</p>
                <button
                  type="button"
                  className="pdf-preview-close"
                  onClick={() => {
                    setShowPdfPreviewModal(false);
                    if (pdfPreviewUrl) {
                      URL.revokeObjectURL(pdfPreviewUrl);
                      setPdfPreviewUrl(null);
                    }
                  }}
                >
                  <FaTimes />
                </button>
              </div>
              <div className="pdf-preview-body">
                {pdfPreviewUrl && (
                  <iframe
                    src={pdfPreviewUrl}
                    title="Teklif önizlemesi"
                    className="pdf-preview-iframe"
                  />
                )}
              </div>
              <div className="pdf-preview-actions">
                <button
                  type="button"
                  className="btn-confirmation-cancel"
                  onClick={() => {
                    setShowPdfPreviewModal(false);
                    if (pdfPreviewUrl) {
                      URL.revokeObjectURL(pdfPreviewUrl);
                      setPdfPreviewUrl(null);
                    }
                  }}
                  disabled={isSubmitting}
                >
                  İptal
                </button>
                <button
                  type="button"
                  className="btn-confirmation-confirm"
                  onClick={handleConfirmSend}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Gönderiliyor...' : 'Onayla ve Gönder'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SendOfferModal;
