import React, { useState, useEffect } from 'react';
import { AiOutlineClose, AiOutlineDollar, AiOutlineFileText, AiOutlineCalendar, AiOutlineUser, AiOutlineFilePdf } from 'react-icons/ai';
import { FaHandshake } from 'react-icons/fa';
import saleService from '../../services/saleService';
import projectService from '../../services/projectService';
import './CreateSaleModal.css';
import './ProposalInformationModal.css';

const CreateSaleModal = ({ offer, onClose, onSaleComplete }) => {
  const [salePrice, setSalePrice] = useState('');
  const [salePriceDisplay, setSalePriceDisplay] = useState('');
  const [saleNotes, setSaleNotes] = useState('');
  const [saleDate, setSaleDate] = useState('');
  const [financingDays, setFinancingDays] = useState('');
  const [financingDaysTouched, setFinancingDaysTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [showOfferForm, setShowOfferForm] = useState(false);
  const [projectDetails, setProjectDetails] = useState(null);



  // Helper function to format number with periods as thousand separators
  const formatNumberWithPeriods = (num) => {
    if (!num && num !== 0) return '';
    const numStr = num.toString().replace(/\./g, '');
    return numStr.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const cleanMachineName = (name) => {
    if (!name) return name;
    return name.replace(/\s*\(AVEMAK-\d+\)\s*$/, '').trim();
  };

  const formatNumberWithDots = (number) => {
    if (number === null || number === undefined || isNaN(number)) {
      return '0.00';
    }
    const numStr = Math.abs(number).toString();
    const parts = numStr.split('.');
    const integerPart = parts[0];
    const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    const decimalPart = parts.length > 1 ? parts[1].padEnd(2, '0').substring(0, 2) : '00';
    return `${formattedInteger}.${decimalPart}`;
  };

  const formatCurrencyDetailed = (amount) => {
    return `€${formatNumberWithDots(amount)}`;
  };

  const toDateTimeLocalValue = (value) => {
    const date = value ? new Date(value) : new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  const calculateFinancingDays = (startDate, endDate) => {
    if (!startDate || !endDate) return '';
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffMs = end.getTime() - start.getTime();
    if (Number.isNaN(diffMs)) return '';
    return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  };

  // Set initial price and store original description from offer when modal opens
  useEffect(() => {
    setSaleDate(toDateTimeLocalValue());
    if (offer?.price) {
      const priceValue = offer.price.toString();
      setSalePrice(priceValue);
      setSalePriceDisplay(formatNumberWithPeriods(offer.price));
    }

    // Fetch project details
    if (offer?.projectId) {
      const fetchProjectDetails = async () => {
        try {
          const project = await projectService.getProjectById(offer.projectId);
          setProjectDetails(project);
        } catch (err) {
          console.error('Error fetching project details:', err);
        }
      };
      fetchProjectDetails();
    }
  }, [offer]);

  useEffect(() => {
    if (projectDetails?.createdAt && saleDate && !financingDaysTouched) {
      setFinancingDays(String(calculateFinancingDays(projectDetails.createdAt, saleDate)));
    }
  }, [projectDetails, saleDate, financingDaysTouched]);

  const handlePriceChange = (e) => {
    const inputValue = e.target.value;
    // Remove all periods and check if remaining is numeric
    const numericOnly = inputValue.replace(/\./g, '');

    // Only allow empty string or numeric values
    if (numericOnly === '' || /^\d+$/.test(numericOnly)) {
      if (numericOnly === '') {
        setSalePriceDisplay('');
        setSalePrice('');
      } else {
        const num = parseInt(numericOnly, 10);
        if (!isNaN(num)) {
          // Store numeric value as string
          setSalePrice(num.toString());
          // Display formatted with periods
          setSalePriceDisplay(formatNumberWithPeriods(num));
        }
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // salePrice already contains the numeric value as string, parse it to int
    const numericPrice = salePrice ? parseInt(salePrice, 10) : 0;

    if (!numericPrice || numericPrice <= 0) {
      setError('Geçerli bir satış fiyatı giriniz');
      return;
    }

    if (!offer?.id) {
      setError('Teklif ID bulunamadı');
      return;
    }

    if (!offer?.projectId) {
      setError('Proje ID bulunamadı');
      return;
    }

    try {
      setLoading(true);
      setError('');

      // Send saleNote directly
      const saleNote = saleNotes.trim();

      // Use createSaleFromOffer endpoint with saleNote
      await saleService.createSaleFromOffer(
        offer.projectId,
        offer.id,
        saleNote,
        numericPrice,
        saleDate ? new Date(saleDate).toISOString() : null,
        financingDays === '' ? null : parseInt(financingDays, 10)
      );

      setShowSuccess(true);

      // Close modal and refresh after showing success message
      setTimeout(() => {
        onSaleComplete();
      }, 2000);
    } catch (err) {
      console.error('Create sale error:', err);
      setError(err.message || 'Satış oluşturulurken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSalePrice('');
    setSalePriceDisplay('');
    setSaleNotes('');
    setSaleDate('');
    setFinancingDays('');
    setFinancingDaysTouched(false);
    setError('');
    setShowOfferForm(false);
    onClose();
  };

  const handleViewOfferForm = () => {
    setShowOfferForm(true);
  };

  const handleCloseOfferForm = () => {
    setShowOfferForm(false);
  };

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('tr-TR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return dateString;
    }
  };

  if (!offer) return null;

  return (
    <>
      <div className="create-sale-modal-overlay">
        <div className="create-sale-modal">
          <div className="modal-header">
            <h2>
              <FaHandshake className="header-icon" />
              Satış Oluştur
            </h2>
            <button className="close-button" onClick={handleClose}>
              <AiOutlineClose />
            </button>
          </div>

          <div className="modal-body">
            <div className="offer-info-section">
              <div className="offer-info-header">
                <h3>Teklif Bilgileri</h3>
                <button
                  className="view-offer-btn"
                  onClick={handleViewOfferForm}
                  type="button"
                >
                  <AiOutlineFilePdf className="btn-icon" />
                  Teklifi Görüntüle
                </button>
              </div>
              <div className="offer-details">
                <div className="info-item">
                  <AiOutlineFileText className="info-icon" />
                  <span className="info-label">Proje Kodu:</span>
                  <span className="info-value">{offer.projectCode}</span>
                </div>
                <div className="info-item">
                  <AiOutlineUser className="info-icon" />
                  <span className="info-label">Müşteri:</span>
                  <span className="info-value">{offer.clientCompanyName}</span>
                </div>
                <div className="info-item">
                  <AiOutlineCalendar className="info-icon" />
                  <span className="info-label">Teklif Tarihi:</span>
                  <span className="info-value">{formatDate(offer.sentAt)}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Durum:</span>
                  <span className="info-value status">{offer.status}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Marka:</span>
                  <span className="info-value">{projectDetails?.make || projectDetails?.machineName || '-'}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Model:</span>
                  <span className="info-value">{projectDetails?.model || '-'}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Yıl:</span>
                  <span className="info-value">{projectDetails?.year || '-'}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Seri No:</span>
                  <span className="info-value">{projectDetails?.serialNumber || '-'}</span>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="sale-form">
              <div className="form-group">
                <label htmlFor="salePrice">
                  <AiOutlineDollar className="label-icon" />
                  Satış Fiyatı {offer?.price && `(${formatNumberWithPeriods(offer.price)} EUR)`} *
                </label>
                <div className="price-input-wrapper">
                  <input
                    type="text"
                    id="salePrice"
                    value={salePriceDisplay}
                    onChange={handlePriceChange}
                    placeholder={offer?.price ? `${formatNumberWithPeriods(offer.price)}` : "Satış fiyatını giriniz"}
                    required
                    inputMode="numeric"
                  />
                  <span className="currency-label">EUR</span>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="saleNotes">
                  <AiOutlineFileText className="label-icon" />
                  Satış Notları
                </label>
                <textarea
                  id="saleNotes"
                  value={saleNotes}
                  onChange={(e) => setSaleNotes(e.target.value)}
                  placeholder="Satış ile ilgili notlarınızı buraya yazabilirsiniz..."
                  rows="4"
                />
              </div>

              <div className="form-group">
                <label htmlFor="saleDate">
                  <AiOutlineCalendar className="label-icon" />
                  Satış Tarihi
                </label>
                <input
                  type="datetime-local"
                  id="saleDate"
                  value={saleDate}
                  onChange={(e) => setSaleDate(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label htmlFor="financingDays">
                  <AiOutlineCalendar className="label-icon" />
                  Finansman Gün Sayısı
                </label>
                <input
                  type="number"
                  id="financingDays"
                  value={financingDays}
                  onChange={(e) => {
                    setFinancingDaysTouched(true);
                    setFinancingDays(e.target.value);
                  }}
                  min="0"
                  step="1"
                  placeholder={projectDetails?.createdAt && saleDate ? String(calculateFinancingDays(projectDetails.createdAt, saleDate)) : '0'}
                />
                <small style={{ color: '#6b7280', marginTop: '6px', display: 'block' }}>
                  Varsayılan değer proje açılış tarihi ile satış tarihi arasındaki gün sayısından hesaplanır. Gerekirse değiştirebilirsiniz.
                </small>
              </div>

              {error && (
                <div className="error-message">
                  <p>{error}</p>
                </div>
              )}

              <div className="form-actions">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={handleClose}
                  disabled={loading}
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="submit-btn"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <div className="loading-spinner-small"></div>
                      Oluşturuluyor...
                    </>
                  ) : (
                    <>
                      <FaHandshake className="btn-icon" />
                      Satış Oluştur
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {showSuccess && (
          <div className="success-overlay">
            <div className="success-message-box">
              <div className="success-icon">
                <FaHandshake />
              </div>
              <h3>Satış Başarıyla Oluşturuldu!</h3>
              <p>Satış kaydı başarıyla oluşturuldu.</p>
              <p className="success-detail">Satış Fiyatı: {salePriceDisplay || formatNumberWithPeriods(salePrice)} EUR</p>
              {!financingDaysTouched && projectDetails?.createdAt && saleDate && (
                <p className="success-detail" style={{ fontSize: '12px', color: '#64748b', marginTop: '6px' }}>
                  Finansman gün sayısı proje açılış ve satış tarihi arasından otomatik hesaplandı.
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Offer Form Modal */}
      {showOfferForm && offer && (
        <div className="proposal-form-overlay" onClick={handleCloseOfferForm}>
          <div className="proposal-form-modal" onClick={(e) => e.stopPropagation()}>
            <div className="form-modal-header">
              <h2>Teklif Formu</h2>
              <button className="close-button" onClick={handleCloseOfferForm}>
                <AiOutlineClose />
              </button>
            </div>

            <div className="form-modal-content">
              <div className="offer-document">
                {/* Document Header */}
                <div className="document-header">
                  <div className="left-column">
                    <div className="info-row">
                      <strong>Şirket Adı:</strong>
                      <span className="info-value">{offer.clientCompanyName || 'N/A'}</span>
                    </div>
                    <div className="info-row">
                      <strong>Proje Kodu:</strong>
                      <span className="info-value">{offer.projectCode || 'N/A'}</span>
                    </div>
                    <div className="info-row">
                      <strong>Belge Tarihi:</strong>
                      <span className="info-value">{formatDate(offer.sentAt)}</span>
                    </div>
                  </div>

                  <div className="right-column">
                    <div className="company-name">Avitech Metal Teknolojileri Anonim Şirketi</div>
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

                {/* Offer Title */}
                <div className="offer-title">
                  <h3>TEKLİF</h3>
                </div>

                {/* Machine Details */}
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
                        <td className="machine-name">{cleanMachineName(projectDetails?.title || projectDetails?.machineName || 'Makine Adı')}</td>
                        <td className="quantity">1</td>
                        <td className="machine-price">{formatCurrencyDetailed(offer.price || 0)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Offer Footer */}
                <div className="offer-footer">
                  <div className="total-section">
                    <div className="total-row">
                      <span>TOPLAM:</span>
                      <span className="total-price">{formatCurrencyDetailed(offer.price || 0)}</span>
                    </div>
                  </div>

                  {/* Description Section */}
                  {offer.description && (
                    <div className="description-section">
                      <div className="description-header">
                        <strong>Açıklama:</strong>
                      </div>
                      <div className="description-content">
                        {offer.description}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CreateSaleModal;
