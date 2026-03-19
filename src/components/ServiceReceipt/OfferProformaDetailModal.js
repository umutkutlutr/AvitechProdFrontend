import React, { useState } from 'react';
import { FaTimes } from 'react-icons/fa';
import proformaService from '../../services/proformaService';
import offerService from '../../services/offerService';
import OfferPdfPreviewModal from '../shared/OfferPdfPreviewModal';
import { extractFilenameFromResponse } from '../../utils/apiUtils';
import './OfferProformaDetailModal.css';

const statusToTurkish = (status) => {
  if (!status) return '-';
  const map = {
    OFFER_SENT: 'Onay Bekliyor',
    COMPLETED: 'Onaylandı',
    CLOSED: 'Kapatıldı',
    PENDING: 'Beklemede',
    SENT: 'Gönderildi',
    ACCEPTED: 'Kabul Edildi',
    REJECTED: 'Reddedildi'
  };
  return map[status] || status;
};

const OfferProformaDetailModal = ({ projectId, summary, onClose }) => {
  const [downloadingOfferId, setDownloadingOfferId] = useState(null);
  const [downloadingProformaId, setDownloadingProformaId] = useState(null);
  const [viewOfferPdfId, setViewOfferPdfId] = useState(null);

  if (!summary) return null;

  const handleDownloadOffer = async (offer) => {
    if (!offer?.id) return;
    try {
      setDownloadingOfferId(offer.id);
      const response = await offerService.downloadOfferPdf(offer.id);
      const blob = await response.blob();
      const filename = extractFilenameFromResponse(response, `teklif-${offer.id}.pdf`);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Teklif indirme hatası:', err);
      alert(err.message || 'Teklif indirilirken bir hata oluştu');
    } finally {
      setDownloadingOfferId(null);
    }
  };

  const handleDownloadProforma = async (proforma) => {
    if (!proforma?.id) return;
    try {
      setDownloadingProformaId(proforma.id);
      const response = await proformaService.downloadProformaPdf(proforma.id);
      const blob = await response.blob();
      const suffix = proforma.proformaType === 'BANK' ? '-banka' : '-musteri';
      const filename = extractFilenameFromResponse(response, `proforma-${proforma.id}${suffix}.pdf`);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Proforma indirme hatası:', err);
      alert(err.message || 'Proforma indirilirken bir hata oluştu');
    } finally {
      setDownloadingProformaId(null);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleDateString('tr-TR', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  const formatPrice = (amount) => {
    if (!amount && amount !== 0) return '-';
    const num = parseFloat(amount);
    if (isNaN(num)) return '-';
    return `${num.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
  };

  return (
    <div className="offer-proforma-detail-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="offer-proforma-detail-modal">
        <div className="detail-header">
          <h2>Teklif / Proforma Durumu</h2>
          <button className="close-button" onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.3rem', color: '#6b7280', cursor: 'pointer' }}>
            <FaTimes />
          </button>
        </div>
        <div className="detail-body">
          <div className="detail-summary">
            <span className="summary-badge offer-badge">
              {summary.offerCount} Teklif
            </span>
            <span className="summary-badge proforma-badge">
              {summary.proformaCount} Proforma
            </span>
          </div>

          {(!summary.items || summary.items.length === 0) ? (
            <div className="empty-detail">
              <p>Bu proje için gönderilmiş teklif veya proforma bulunmuyor.</p>
            </div>
          ) : (
            <table className="detail-items-table">
              <thead>
                <tr>
                  <th>Firma</th>
                  <th>Tür</th>
                  <th>Tarih</th>
                  <th style={{ textAlign: 'right' }}>Fiyat</th>
                  <th>Durum</th>
                  <th title="Her satır için indirme işlemi.">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {summary.items.map((item, index) => (
                  <tr key={`${item.type}-${item.id}-${index}`} className={item.type === 'Proforma' ? 'proforma-row' : 'offer-row'}>
                    <td>{item.companyName || '-'}</td>
                    <td>
                      <span className={`type-tag ${item.type === 'Teklif' ? 'teklif' : 'proforma'}`}>
                        {item.type === 'Proforma' && item.proformaType
                          ? `${item.type} (${item.proformaType === 'BANK' ? 'Banka' : 'Müşteri'})`
                          : item.type}
                      </span>
                    </td>
                    <td>{formatDate(item.sentAt)}</td>
                    <td className="price-cell">{formatPrice(item.price)}</td>
                    <td>{statusToTurkish(item.status)}</td>
                    <td>
                      {item.type === 'Teklif' && item.id ? (
                        <button
                          type="button"
                          className="btn-download-inline"
                          onClick={() => handleDownloadOffer(item)}
                          disabled={downloadingOfferId != null}
                          title="Teklif PDF indir"
                        >
                          {downloadingOfferId === item.id ? 'İndiriliyor...' : 'Teklif İndir'}
                        </button>
                      ) : item.type === 'Proforma' && item.id ? (
                        <button
                          type="button"
                          className="btn-download-inline"
                          onClick={() => handleDownloadProforma(item)}
                          disabled={downloadingProformaId != null}
                          title="Proforma PDF indir"
                        >
                          {downloadingProformaId === item.id ? 'İndiriliyor...' : 'Proforma İndir'}
                        </button>
                      ) : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <OfferPdfPreviewModal
        isOpen={!!viewOfferPdfId}
        onClose={() => setViewOfferPdfId(null)}
        offerId={viewOfferPdfId}
      />
    </div>
  );
};

export default OfferProformaDetailModal;
