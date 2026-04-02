import React, { useState } from 'react';
import { AiOutlineClose } from 'react-icons/ai';
import clientService from '../../services/clientService';
import CountryPhoneInput from '../shared/CountryPhoneInput';
import './AddCompanyModal.css';

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

  // Country-aware phone input handler
  const handlePhoneChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
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

      const dataToSend = {
        ...formData,
        phone: formData.phone ? formData.phone.trim() : '',
        businessPhone: formData.businessPhone ? formData.businessPhone.trim() : '',
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
            <CountryPhoneInput
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handlePhoneChange}
              placeholder="Telefon numarası"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="businessPhone">İş Telefonu</label>
            <CountryPhoneInput
              id="businessPhone"
              name="businessPhone"
              value={formData.businessPhone}
              onChange={handlePhoneChange}
              placeholder="İş telefonu"
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



