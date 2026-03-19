import React, { useState, useEffect } from 'react';
import { AiOutlineClose } from 'react-icons/ai';
import offerService from '../../services/offerService';
import './OfferPdfPreviewModal.css';

/**
 * Müşteriye gönderilen teklif PDF'inin önizlemesini gösterir.
 * @param {boolean} isOpen - Modal açık mı
 * @param {function} onClose - Kapatma callback
 * @param {number} offerId - Teklif ID (PDF almak için)
 */
const OfferPdfPreviewModal = ({ isOpen, onClose, offerId }) => {
  const [pdfUrl, setPdfUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen || !offerId) {
      setPdfUrl(null);
      setError(null);
      return;
    }

    let blobUrl = null;

    const loadPdf = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await offerService.downloadOfferPdf(offerId);
        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.message || 'PDF yüklenemedi');
        }
        const blob = await response.blob();
        blobUrl = window.URL.createObjectURL(blob);
        setPdfUrl(blobUrl);
      } catch (err) {
        console.error('Offer PDF load error:', err);
        setError(err.message || 'Teklif PDF\'i yüklenirken bir hata oluştu');
      } finally {
        setLoading(false);
      }
    };

    loadPdf();

    return () => {
      if (blobUrl) {
        window.URL.revokeObjectURL(blobUrl);
      }
    };
  }, [isOpen, offerId]);

  useEffect(() => {
    if (!isOpen) {
      setPdfUrl(null);
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="offer-pdf-preview-overlay" onClick={onClose}>
      <div className="offer-pdf-preview-modal" onClick={(e) => e.stopPropagation()}>
        <div className="offer-pdf-preview-header">
          <h2>Teklif Önizlemesi</h2>
          <button type="button" className="offer-pdf-preview-close" onClick={onClose} aria-label="Kapat">
            <AiOutlineClose />
          </button>
        </div>
        <div className="offer-pdf-preview-body">
          {loading && (
            <div className="offer-pdf-preview-loading">
              <div className="loading-spinner"></div>
              <p>PDF yükleniyor...</p>
            </div>
          )}
          {error && (
            <div className="offer-pdf-preview-error">
              <p>{error}</p>
              <button type="button" onClick={onClose}>Kapat</button>
            </div>
          )}
          {pdfUrl && !loading && !error && (
            <iframe
              src={pdfUrl}
              title="Teklif PDF Önizlemesi"
              className="offer-pdf-preview-iframe"
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default OfferPdfPreviewModal;
