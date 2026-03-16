import React, { useState, useEffect } from 'react';
import { AiOutlineClose } from 'react-icons/ai';
import clientService from '../../services/clientService';
import './EditCompanyModal.css';

const EditCompanyModal = ({ isOpen, onClose, client, onSuccess }) => {
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
  const [loadingClientDetails, setLoadingClientDetails] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && client) {
      // Fetch full client details to ensure we have all fields including address
      const fetchClientDetails = async () => {
        setLoadingClientDetails(true);
        try {
          const fullClientDetails = await clientService.getClientById(client.id);
          setFormData({
            companyName: fullClientDetails.companyName || client.companyName || '',
            contactName: fullClientDetails.contactName || client.contactName || '',
            email: fullClientDetails.email || client.email || '',
            phone: fullClientDetails.phone || client.phone || '',
            businessPhone: fullClientDetails.businessPhone || client.businessPhone || '',
            address: fullClientDetails.address || client.address || '',
            // Handle both "tax Office" (from API) and "vergiDairesi" (expected format)
            vergiDairesi: fullClientDetails.vergiDairesi || fullClientDetails['tax Office'] || client.vergiDairesi || client['tax Office'] || '',
            vergiNo: fullClientDetails.vergiNo || client.vergiNo || ''
          });
          setError('');
        } catch (err) {
          console.error('Error fetching client details:', err);
          // Fallback to using the client object passed as prop
          setFormData({
            companyName: client.companyName || '',
            contactName: client.contactName || '',
            email: client.email || '',
            phone: client.phone || '',
            businessPhone: client.businessPhone || '',
            address: client.address || '',
            vergiDairesi: client.vergiDairesi || client['tax Office'] || '',
            vergiNo: client.vergiNo || ''
          });
        } finally {
          setLoadingClientDetails(false);
        }
      };

      fetchClientDetails();
    }
  }, [isOpen, client]);

  const handleChange = (e) => {
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
      await clientService.updateClient(client.id, formData);
      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (err) {
      console.error('Error updating client:', err);
      setError(err.message || 'Müşteri güncellenirken bir hata oluştu');
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

  if (!isOpen || !client) return null;

  return (
    <div className="edit-company-modal-overlay" onClick={handleClose}>
      <div className="edit-company-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Firma Düzenle</h2>
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

          {loadingClientDetails && (
            <div className="loading-message">
              Müşteri bilgileri yükleniyor...
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
              disabled={loading || loadingClientDetails}
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
              disabled={loading || loadingClientDetails}
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
              disabled={loading || loadingClientDetails}
            />
          </div>

          <div className="form-group">
            <label htmlFor="phone">Telefon</label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="Telefon numarasını girin"
              disabled={loading || loadingClientDetails}
            />
          </div>

          <div className="form-group">
            <label htmlFor="businessPhone">İş Telefonu</label>
            <input
              type="tel"
              id="businessPhone"
              name="businessPhone"
              value={formData.businessPhone}
              onChange={handleChange}
              placeholder="+902125555555"
              disabled={loading || loadingClientDetails}
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
              disabled={loading || loadingClientDetails}
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
              disabled={loading || loadingClientDetails}
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
              disabled={loading || loadingClientDetails}
            />
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="cancel-button"
              onClick={handleClose}
              disabled={loading || loadingClientDetails}
            >
              İptal
            </button>
            <button
              type="submit"
              className="submit-button"
              disabled={loading || loadingClientDetails}
            >
              {loading ? 'Güncelleniyor...' : loadingClientDetails ? 'Yükleniyor...' : 'Güncelle'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditCompanyModal;
