import React, { useState } from 'react';
import { AiOutlineClose } from 'react-icons/ai';
import clientService from '../../services/clientService';
import './AddCompanyModal.css';

// Phone number formatting utility - formats as +90 5XX XXX XX XX
const formatPhoneNumber = (value) => {
  // Remove all non-digit characters
  const digits = value.replace(/\D/g, '');

  // Remove leading 90 if user types it (since we show +90 prefix)
  let cleanDigits = digits;
  if (digits.startsWith('90') && digits.length > 2) {
    cleanDigits = digits.slice(2);
  }

  // Limit to 10 digits (Turkish mobile number length)
  const limitedDigits = cleanDigits.slice(0, 10);

  // Format with spaces: 5XX XXX XX XX
  let formatted = '';
  for (let i = 0; i < limitedDigits.length; i++) {
    if (i === 3 || i === 6 || i === 8) {
      formatted += ' ';
    }
    formatted += limitedDigits[i];
  }

  return formatted;
};

// Get display value with +90 prefix
const getPhoneDisplayValue = (value) => {
  if (!value) return '+90 ';
  const formatted = formatPhoneNumber(value);
  return '+90 ' + formatted;
};

// Extract raw digits from formatted value (without +90)
const extractPhoneDigits = (displayValue) => {
  // Remove +90 prefix and all spaces
  const withoutPrefix = displayValue.replace(/^\+90\s*/, '');
  return withoutPrefix.replace(/\s/g, '');
};

const AddCompanyModal = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    companyName: '',
    contactName: '',
    email: '',
    phone: '',
    businessPhone: '',
    address: '',
    vergiDairesi: '',
    vergiNo: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Special handler for phone fields with formatting
  const handlePhoneChange = (e) => {
    const { name, value } = e.target;

    // Extract just the digits (excluding +90 prefix)
    const rawDigits = extractPhoneDigits(value);

    // Store the raw digits in formData
    setFormData(prev => ({
      ...prev,
      [name]: rawDigits
    }));
  };

  // Handle cursor position to prevent jumping
  const handlePhoneKeyDown = (e) => {
    const input = e.target;
    const cursorPos = input.selectionStart;

    // Prevent deleting the +90 prefix
    if (cursorPos <= 4 && (e.key === 'Backspace' || e.key === 'Delete')) {
      e.preventDefault();
    }

    // Prevent cursor from going into the +90 prefix area
    if (e.key === 'ArrowLeft' && cursorPos <= 4) {
      e.preventDefault();
    }
  };

  // Handle focus to set cursor after +90 prefix
  const handlePhoneFocus = (e) => {
    const input = e.target;
    // Set cursor position after "+90 " (4 characters)
    setTimeout(() => {
      if (input.selectionStart < 4) {
        input.setSelectionRange(4, 4);
      }
    }, 0);
  };

  // Handle click to prevent selecting the +90 prefix
  const handlePhoneClick = (e) => {
    const input = e.target;
    if (input.selectionStart < 4) {
      input.setSelectionRange(4, 4);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.companyName.trim() || !formData.contactName.trim() || !formData.email.trim()) {
      setError('Firma adı, iletişim kişisi ve e-posta alanları zorunludur');
      return;
    }

    try {
      setLoading(true);
      setError('');

      // Prepare data with formatted phone numbers (as displayed to user)
      const dataToSend = {
        ...formData,
        phone: formData.phone ? getPhoneDisplayValue(formData.phone).trim() : '',
        businessPhone: formData.businessPhone ? getPhoneDisplayValue(formData.businessPhone).trim() : '',
      };

      await clientService.createClient(dataToSend);
      if (onSuccess) {
        onSuccess();
      }
      handleClose();
    } catch (err) {
      console.error('Error creating client:', err);
      setError(err.message || 'Müşteri oluşturulurken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      companyName: '',
      contactName: '',
      email: '',
      phone: '',
      businessPhone: '',
      address: '',
      vergiDairesi: '',
      vergiNo: ''
    });
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="add-company-modal-overlay" onClick={handleClose}>
      <div className="add-company-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Yeni Firma Ekle</h2>
          <button className="close-button" onClick={handleClose}>
            <AiOutlineClose />
          </button>
        </div>

        <form className="modal-body" onSubmit={handleSubmit}>
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="companyName">
              Firma Adı <span className="required">*</span>
            </label>
            <input
              type="text"
              id="companyName"
              name="companyName"
              value={formData.companyName}
              onChange={handleChange}
              placeholder="Firma adını girin"
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="contactName">
              İletişim Kişisi <span className="required">*</span>
            </label>
            <input
              type="text"
              id="contactName"
              name="contactName"
              value={formData.contactName}
              onChange={handleChange}
              placeholder="İletişim kişisini girin"
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">
              E-posta <span className="required">*</span>
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="E-posta adresini girin"
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="phone">Telefon</label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={getPhoneDisplayValue(formData.phone)}
              onChange={handlePhoneChange}
              onKeyDown={handlePhoneKeyDown}
              onFocus={handlePhoneFocus}
              onClick={handlePhoneClick}
              placeholder="+90 5XX XXX XX XX"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="businessPhone">İş Telefonu</label>
            <input
              type="tel"
              id="businessPhone"
              name="businessPhone"
              value={getPhoneDisplayValue(formData.businessPhone)}
              onChange={handlePhoneChange}
              onKeyDown={handlePhoneKeyDown}
              onFocus={handlePhoneFocus}
              onClick={handlePhoneClick}
              placeholder="+90 5XX XXX XX XX"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="address">Adres</label>
            <input
              type="text"
              id="address"
              name="address"
              value={formData.address}
              onChange={handleChange}
              placeholder="Adresi girin"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="vergiDairesi">Vergi Dairesi</label>
            <input
              type="text"
              id="vergiDairesi"
              name="vergiDairesi"
              value={formData.vergiDairesi}
              onChange={handleChange}
              placeholder="Vergi dairesini girin"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="vergiNo">Vergi No</label>
            <input
              type="text"
              id="vergiNo"
              name="vergiNo"
              value={formData.vergiNo}
              onChange={handleChange}
              placeholder="Vergi numarasını girin"
              disabled={loading}
            />
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="cancel-button"
              onClick={handleClose}
              disabled={loading}
            >
              İptal
            </button>
            <button
              type="submit"
              className="submit-button"
              disabled={loading}
            >
              {loading ? 'Oluşturuluyor...' : 'Oluştur'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddCompanyModal;



