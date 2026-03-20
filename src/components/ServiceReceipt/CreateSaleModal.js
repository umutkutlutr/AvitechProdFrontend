import React, { useState, useEffect } from 'react';
import { AiOutlineClose, AiOutlineDollar, AiOutlineFileText, AiOutlineCalendar, AiOutlineUser, AiOutlineFilePdf } from 'react-icons/ai';
import { FaHandshake } from 'react-icons/fa';
import saleService from '../../services/saleService';
import projectService from '../../services/projectService';
import OfferPdfPreviewModal from '../shared/OfferPdfPreviewModal';
import { parseFormattedNumber, formatNumberForInput } from '../../utils/numberFormat';
import './CreateSaleModal.css';
import './ProposalInformationModal.css';

/** Parse display string to a positive EUR amount (2 decimal places max for API). */
function parseSalePriceEur(display) {
  const n = parseFormattedNumber(display);
  if (n === '' || typeof n !== 'number' || Number.isNaN(n)) return null;
  return Math.round(n * 100) / 100;
}

const CreateSaleModal = ({ offer, onClose, onSaleComplete }) => {
  const [salePriceDisplay, setSalePriceDisplay] = useState('');
  const [saleNotes, setSaleNotes] = useState('');
  const [saleDate, setSaleDate] = useState('');
  const [financingDays, setFinancingDays] = useState('');
  const [financingDaysTouched, setFinancingDaysTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [showOfferPdfId, setShowOfferPdfId] = useState(null);
  const [projectDetails, setProjectDetails] = useState(null);



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
    if (offer?.price != null && offer.price !== '') {
      setSalePriceDisplay(formatNumberForInput(offer.price));
    } else {
      setSalePriceDisplay('');
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
    const raw = e.target.value.replace(/\s/g, '');
    if (raw === '' || /^[\d.,]*$/.test(raw)) {
      setSalePriceDisplay(raw);
    }
  };

  const handlePriceBlur = () => {
    const n = parseSalePriceEur(salePriceDisplay);
    if (n === null || n < 0) {
      setSalePriceDisplay('');
      return;
    }
    if (n === 0) {
      setSalePriceDisplay('');
      return;
    }
    setSalePriceDisplay(formatNumberForInput(n));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const numericPrice = parseSalePriceEur(salePriceDisplay);
    if (numericPrice === null || numericPrice <= 0) {
      setError('Geçerli bir satış fiyatı giriniz (EUR, ondalık için virgül veya nokta kullanabilirsiniz)');
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
    setSalePriceDisplay('');
    setSaleNotes('');
    setSaleDate('');
    setFinancingDays('');
    setFinancingDaysTouched(false);
    setError('');
    setShowOfferPdfId(null);
    onClose();
  };

  const handleViewOfferForm = () => {
    if (offer?.id) setShowOfferPdfId(offer.id);
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
                  Satış Fiyatı {offer?.price != null && offer.price !== '' && `(${formatNumberForInput(offer.price)} EUR)`} *
                </label>
                <div className="price-input-wrapper">
                  <input
                    type="text"
                    id="salePrice"
                    value={salePriceDisplay}
                    onChange={handlePriceChange}
                    onBlur={handlePriceBlur}
                    placeholder={offer?.price != null && offer.price !== '' ? formatNumberForInput(offer.price) : 'Satış fiyatını giriniz'}
                    required
                    inputMode="decimal"
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
              <p className="success-detail">Satış Fiyatı: {formatNumberForInput(parseSalePriceEur(salePriceDisplay) ?? 0)} EUR</p>
              {!financingDaysTouched && projectDetails?.createdAt && saleDate && (
                <p className="success-detail" style={{ fontSize: '12px', color: '#64748b', marginTop: '6px' }}>
                  Finansman gün sayısı proje açılış ve satış tarihi arasından otomatik hesaplandı.
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Teklif PDF Önizleme - Müşteriye gönderilen teklifin PDF'i */}
      <OfferPdfPreviewModal
        isOpen={!!showOfferPdfId}
        onClose={() => setShowOfferPdfId(null)}
        offerId={showOfferPdfId}
      />
    </>
  );
};

export default CreateSaleModal;
