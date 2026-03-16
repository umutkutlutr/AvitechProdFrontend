import React, { useState, useEffect, useRef } from 'react';
import { FaTimes, FaPaperPlane, FaPlus, FaTrash, FaPencilAlt, FaSearch, FaChevronDown, FaCheck } from 'react-icons/fa';
import projectService from '../../services/projectService';
import clientService from '../../services/clientService';
import accountingService from '../../services/accountingService';
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
    vergiDairesi: '',
    vergiNo: '',
    deliveryTerms: 'Makinenin teslimatı, sözleşmede belirtilen tarihte veya tarafların mutabık kaldığı süre içerisinde yapılacaktır.',
    paymentTerms: 'Ödeme, taraflar arasında mutabık kalınan tutar ve vade planına göre, sözleşmede belirtilen yöntemlerle gerçekleştirilecektir.',
    deliveryDate: 'Ödeme onayının ardından, stok ve planlamaya bağlı olarak hemen / anlaşılan tarihte.'
  });
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);
  const clientDropdownRef = useRef(null);
  const editOriginalValueRef = useRef(null);
  const [conditionsValidated, setConditionsValidated] = useState(false);
  const [showConditionsWarning, setShowConditionsWarning] = useState(false);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
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
      // Only allow numbers for tax number
      const numericValue = value.replace(/\D/g, '');
      setNewClientData(prev => ({ ...prev, vergiNo: numericValue }));
    }
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

    // Step 1: First click - always show warning to review conditions
    if (!conditionsValidated) {
      // Validate that conditions are filled
      if (!validateConditions()) {
        setShowConditionsWarning(true);
        // Scroll to the conditions section
        setTimeout(() => {
          const termsSection = document.querySelector('.terms-section');
          if (termsSection) {
            termsSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 100);
        return;
      }
      // Show warning for user to review
      setShowConditionsWarning(true);
      setConditionsValidated(true);
      // Scroll to the conditions section
      setTimeout(() => {
        const termsSection = document.querySelector('.terms-section');
        if (termsSection) {
          termsSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
      return;
    }

    // Step 2: Second click - show confirmation modal
    if (conditionsValidated && !showConfirmationModal) {
      setShowConditionsWarning(false);
      setShowConfirmationModal(true);
      return;
    }

    // Step 2: If conditions already validated, proceed with sending
    // This will be called from the confirmation modal
    setIsSubmitting(true);

    try {
      let clientToUse = selectedClient;

      // If we have new client data ready, create the client first
      if (newClientDataReady && !selectedClient) {
        try {
          const createdClient = await clientService.createClient(newClientData);
          clientToUse = createdClient;

          // Reset new client state
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
        } catch (createError) {
          console.error('Error creating client:', createError);
          setError(createError.message || 'Müşteri oluşturulurken bir hata oluştu');
          setIsSubmitting(false);
          return;
        }
      } else if (!selectedClient) {
        // Check if a client is selected or new client data is ready
        setError('Lütfen bir müşteri seçin veya yeni müşteri bilgilerini kaydedin');
        setIsSubmitting(false);
        return;
      }

      // Combine delivery terms, payment terms, and delivery date into description
      const description = [
        `Teslimat Şartları: ${editableTexts.deliveryTerms}`,
        `Ödeme Şartları: ${editableTexts.paymentTerms}`,
        `Teslimat Tarihi: ${editableTexts.deliveryDate}`
      ].join('\n');

      // Kullanıcının input'a yazdığı fiyatı kullan (display'den parse et) - tutar kontrolü
      const priceFromInput = parseFloat(parseFormattedInput(salesPriceDisplay || ''));
      const priceToSend = !isNaN(priceFromInput) && priceFromInput > 0 ? priceFromInput : formData.salesPrice;
      if (!priceToSend || priceToSend <= 0 || isNaN(priceToSend)) {
        setError('Geçerli bir teklif fiyatı giriniz (0\'dan büyük olmalı)');
        setIsSubmitting(false);
        setShowConfirmationModal(false);
        return;
      }
      const projectId = service?.id || service?.projectId;

      const results = await projectService.sendOfferToClients(
        projectId,
        [clientToUse.id],
        ccEmails,
        priceToSend,
        description
      );
      const firstResult = Array.isArray(results) ? results[0] : results;

      setIsSubmitting(false);
      setSuccessInfo(firstResult || null);
      setShowSuccess(true);
      setShowConfirmationModal(false);

      // Close modal after showing success message
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      console.error('Error sending offer:', err);
      setError(err.message || 'Teklif gönderilirken bir hata oluştu');
      setIsSubmitting(false);
      setShowConfirmationModal(false);
    }
  };

  const handleConfirmSend = () => {
    // Close confirmation modal and proceed with sending
    handleSubmit(new Event('submit'));
  };

  const handleCancelConfirmation = () => {
    setShowConfirmationModal(false);
    setConditionsValidated(false); // Reset validation state
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
                                className="custom-dropdown-item"
                                onClick={() => handleClientSelect(client.id)}
                              >
                                <div className="dropdown-item-main">
                                  {client.companyName}
                                </div>
                                <div className="dropdown-item-sub">
                                  {client.contactName} • {client.email}
                                </div>
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

            <div className="offer-document">
              <div className="document-header">
                <div className="left-column">
                  <div className="info-row">
                    <strong>Şirket Adı:</strong>
                    {isAddingNewClient ? (
                      <input
                        type="text"
                        value={editableTexts.companyName}
                        onChange={(e) => handleCompanyFieldChange('companyName', e.target.value)}
                        placeholder="Şirket adını girin"
                        className="inline-edit-input"
                        autoFocus
                      />
                    ) : (
                      <span className="info-value">{editableTexts.companyName || 'Şirket Adı'}</span>
                    )}
                  </div>
                  <div className="info-row">
                    <strong>Adres:</strong>
                    {isAddingNewClient ? (
                      <input
                        type="text"
                        value={editableTexts.address}
                        onChange={(e) => handleCompanyFieldChange('address', e.target.value)}
                        placeholder="Adresi girin"
                        className="inline-edit-input"
                      />
                    ) : (
                      <span className="info-value">{editableTexts.address || 'Adres'}</span>
                    )}
                  </div>
                  <div className="info-row">
                    <strong>İletişim Kişisi:</strong>
                    {isAddingNewClient ? (
                      <input
                        type="text"
                        value={editableTexts.contactPerson}
                        onChange={(e) => handleCompanyFieldChange('contactPerson', e.target.value)}
                        placeholder="İletişim kişisini girin"
                        className="inline-edit-input"
                      />
                    ) : (
                      <span className="info-value">{editableTexts.contactPerson || 'İletişim Kişisi'}</span>
                    )}
                  </div>
                  <div className="info-row">
                    <strong>Telefon:</strong>
                    {isAddingNewClient ? (
                      <input
                        type="tel"
                        value={editableTexts.phone}
                        onChange={(e) => handleCompanyFieldChange('phone', e.target.value)}
                        placeholder="+905551234567"
                        className="inline-edit-input"
                      />
                    ) : (
                      <span className="info-value">{editableTexts.phone || 'Telefon'}</span>
                    )}
                  </div>
                  <div className="info-row">
                    <strong>İş Telefonu:</strong>
                    {isAddingNewClient ? (
                      <input
                        type="tel"
                        value={editableTexts.businessPhone}
                        onChange={(e) => handleCompanyFieldChange('businessPhone', e.target.value)}
                        placeholder="+902125555555"
                        className="inline-edit-input"
                      />
                    ) : (
                      <span className="info-value">{editableTexts.businessPhone || 'İş Telefonu'}</span>
                    )}
                  </div>
                  <div className="info-row">
                    <strong>E-Mail:</strong>
                    {isAddingNewClient ? (
                      <input
                        type="email"
                        value={editableTexts.email}
                        onChange={(e) => handleCompanyFieldChange('email', e.target.value)}
                        placeholder="email@example.com"
                        className="inline-edit-input"
                      />
                    ) : (
                      <span className="info-value">{editableTexts.email || 'E-Mail'}</span>
                    )}
                  </div>
                  <div className="info-row">
                    <strong>Vergi Dairesi:</strong>
                    {isAddingNewClient ? (
                      <input
                        type="text"
                        value={editableTexts.vergiDairesi}
                        onChange={(e) => handleCompanyFieldChange('vergiDairesi', e.target.value)}
                        placeholder="Vergi dairesini girin"
                        className="inline-edit-input"
                      />
                    ) : (
                      <span className="info-value">{editableTexts.vergiDairesi || 'Vergi Dairesi'}</span>
                    )}
                  </div>
                  <div className="info-row">
                    <strong>Vergi No:</strong>
                    {isAddingNewClient ? (
                      <input
                        type="text"
                        inputMode="numeric"
                        value={editableTexts.vergiNo}
                        onChange={(e) => {
                          // Only allow numeric input
                          const numericValue = e.target.value.replace(/\D/g, '');
                          handleCompanyFieldChange('vergiNo', numericValue);
                        }}
                        placeholder="Vergi numarasını girin"
                        className="inline-edit-input"
                      />
                    ) : (
                      <span className="info-value">{editableTexts.vergiNo || 'Vergi No'}</span>
                    )}
                  </div>
                  <div className="info-row">
                    <strong>Belge Tarihi:</strong>
                    <span className="info-value">{formData.documentDate}</span>
                  </div>

                  {isAddingNewClient && (
                    <div className="inline-edit-actions">
                      <button
                        type="button"
                        onClick={handleCancelNewClient}
                        className="btn-cancel-inline-edit"
                      >
                        İptal
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveNewClient}
                        className="btn-save-inline-edit"
                      >
                        Kaydet
                      </button>
                    </div>
                  )}


                </div>

                <div className="right-column">
                  <div className="info-row">
                    <strong>Avitech Metal Teknolojileri Anonim Şirketi</strong>
                  </div>
                  <div className="info-row">
                    <strong>Adres:</strong> Rüzgarlıbahçe, K Plaza 34805 Beykoz/Istanbul, Turkey
                  </div>
                  <div className="info-row">
                    <strong>Telefon:</strong> +90 541 563 49 90
                  </div>
                  <div className="info-row">
                    <strong>İletişim Kişisi:</strong> Bora Urçar
                  </div>
                  <div className="info-row">
                    <strong>E-Mail:</strong> bora.urcar@avitech.com.tr
                  </div>
                </div>
              </div>

              <div className="offer-title">
                <h3>TEKLİF</h3>
              </div>

              <div className="machine-details">
                <table className="machine-table">
                  <thead>
                    <tr>
                      <th>Pos.</th>
                      <th>Item Description</th>
                      <th>Quantity</th>
                      <th>Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="position">1</td>
                      <td className="machine-name">{cleanMachineName(service?.machineName || service?.title || service?.machineTitle || 'Makine Adı')}</td>
                      <td className="quantity">1</td>
                      <td className="machine-price">{formatCurrency(formData.salesPrice, 'EUR')}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="offer-footer">
                <div className="total-section">
                  <div className="total-row">
                    <span>TOPLAM:</span>
                    <span className="total-price">{formatCurrency(formData.salesPrice, 'EUR')}</span>
                  </div>
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
              <button type="submit" className="btn-send" disabled={isSubmitting}>
                <FaPaperPlane />
                {isSubmitting ? 'Gönderiliyor...' : 'Teklifi Gönder'}
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

        {showConfirmationModal && (
          <div className="confirmation-modal-overlay">
            <div className="confirmation-modal">
              <div className="confirmation-header">
                <h3>Teklifi Onayla</h3>
              </div>
              <div className="confirmation-body">
                <p>Teklif bilgileri doğru mu?</p>
                <p className="confirmation-warning">
                  Onayladığınızda müşteriye teklif e-postası gönderilecektir.
                </p>
                <div className="confirmation-details">
                  <p><strong>Marka:</strong> {service?.make || service?.brand || '-'}</p>
                  <p><strong>Model:</strong> {service?.model || '-'}</p>
                  <p><strong>Müşteri:</strong> {selectedClient?.companyName || newClientData?.companyName}</p>
                  <p><strong>Fiyat:</strong> {formatCurrency(formData.salesPrice, 'EUR')}</p>
                  <p><strong>Teslimat Şartları:</strong> {editableTexts.deliveryTerms}</p>
                  <p><strong>Ödeme Şartları:</strong> {editableTexts.paymentTerms}</p>
                  <p><strong>Teslimat Tarihi:</strong> {editableTexts.deliveryDate}</p>
                </div>
              </div>
              <div className="confirmation-actions">
                <button
                  type="button"
                  className="btn-confirmation-cancel"
                  onClick={handleCancelConfirmation}
                  disabled={isSubmitting}
                >
                  Hayır
                </button>
                <button
                  type="button"
                  className="btn-confirmation-confirm"
                  onClick={handleConfirmSend}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Gönderiliyor...' : 'Evet, Gönder'}
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
