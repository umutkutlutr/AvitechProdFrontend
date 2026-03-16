import React, { useState, useEffect } from 'react';
import { AiOutlineClose, AiOutlineEuro, AiOutlineUser, AiOutlineMail, AiOutlineCalendar, AiOutlineFileText } from 'react-icons/ai';
import { FaPaperPlane, FaFileAlt } from 'react-icons/fa';
import offerService from '../../services/offerService';
import './ProposalInformationModal.css';

const ProposalInformationModal = ({ service, onClose }) => {
  const [offerDetails, setOfferDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showProposalForm, setShowProposalForm] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState(null);

  useEffect(() => {
    const fetchProposalData = async () => {
      if (!service?.id) {
        setError('Proje ID bulunamadı');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Fetch offer details
        const offerData = await offerService.getOffersByProject(service.id);
        setOfferDetails(offerData);
      } catch (err) {
        console.error('Error fetching proposal data:', err);
        setError(err.message || 'Teklif bilgileri yüklenirken bir hata oluştu');
      } finally {
        setLoading(false);
      }
    };

    fetchProposalData();
  }, [service?.id]);

  const formatCurrency = (amount, currency = 'EUR') => {
    if (currency === 'TRY') {
      return `₺${amount.toLocaleString('tr-TR')}`;
    }
    return `€${amount.toLocaleString('de-DE')}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };


  const getStatusColor = (status) => {
    switch (status) {
      case 'SENT':
        return '#28a745';
      case 'DRAFT':
        return '#ffc107';
      case 'PENDING':
        return '#17a2b8';
      case 'COMPLETED':
        return '#28a745'; // Green for completed/approved
      case 'CLOSED':
        return '#dc3545'; // Red for closed
      default:
        return '#6c757d';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'SENT':
        return 'Gönderildi';
      case 'DRAFT':
        return 'Taslak';
      case 'PENDING':
        return 'Beklemede';
      case 'COMPLETED':
        return 'Tamamlandı';
      case 'CLOSED':
        return 'Kapatıldı';
      default:
        return status;
    }
  };

  // Clean machine name by removing project code in parentheses
  const cleanMachineName = (name) => {
    if (!name) return name;
    return name.replace(/\s*\(AVEMAK-\d+\)\s*$/, '').trim();
  };

  // Format number with dots
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

  const handleViewForm = (offer) => {
    setSelectedOffer(offer);
    setShowProposalForm(true);
  };

  const handleCloseForm = () => {
    setShowProposalForm(false);
    setSelectedOffer(null);
  };



  return (
    <div className="proposal-modal-overlay" onClick={onClose}>
      <div className="proposal-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-content">
          <div className="modal-header">
            <h2>Teklif Bilgileri</h2>
            <button className="close-button" onClick={onClose}>
              <AiOutlineClose />
            </button>
          </div>

          <div className="service-info">
            <h3>{service.machineName}</h3>
            <p className="service-id">Proje Kodu: {service.machineName}</p>
            {offerDetails && offerDetails.length > 0 && (
              <p className="offer-count">Toplam {offerDetails.length} teklif bulundu</p>
            )}
          </div>

          {loading && (
            <div className="loading-state">
              <p>Teklif bilgileri yükleniyor...</p>
            </div>
          )}

          {error && (
            <div className="error-state">
              <p>Hata: {error}</p>
            </div>
          )}

          {!loading && !error && (
            <div className="proposal-content">
              {/* Offer Information Section */}
              <div className="offer-section">
                <div className="section-header">
                  <FaPaperPlane className="section-icon" />
                  <h4>Teklif Detayları</h4>
                </div>

                {offerDetails && offerDetails.length > 0 ? (
                  <div className="offer-list">
                    {offerDetails.map((offer, index) => {
                      return (
                        <div key={offer.id || index} className="offer-card">
                          <div className="offer-header">
                            <div className="offer-info">
                              <span className="offer-id">Teklif</span>
                              <span
                                className={`offer-status ${offer.status === 'CLOSED' ? 'status-closed' :
                                  offer.status === 'COMPLETED' ? 'status-completed' : ''
                                  }`}
                                style={{ color: getStatusColor(offer.status) }}
                              >
                                {getStatusText(offer.status)}
                              </span>

                            </div>
                            <span className="offer-date">
                              {formatDate(offer.sentAt)}
                            </span>
                          </div>

                          <div className="offer-details">
                            <div className="detail-row">
                              <AiOutlineUser className="detail-icon" />
                              <span className="detail-label">Gönderen:</span>
                              <span className="detail-value">{offer.senderUserName}</span>
                            </div>

                            <div className="detail-row">
                              <AiOutlineUser className="detail-icon" />
                              <span className="detail-label">Müşteri:</span>
                              <span className="detail-value">{offer.clientCompanyName}</span>
                            </div>

                            <div className="detail-row">
                              <span className="detail-label">Proje Kodu:</span>
                              <span className="detail-value">{offer.projectCode}</span>
                            </div>

                            {offer.price && (
                              <div className="detail-row">
                                <AiOutlineEuro className="detail-icon" />
                                <span className="detail-label">Teklif Fiyatı:</span>
                                <span className="detail-value highlight-price">{formatCurrency(offer.price)}</span>
                              </div>
                            )}

                            {offer.salePrice && (
                              <div className="detail-row">
                                <AiOutlineEuro className="detail-icon" />
                                <span className="detail-label">Satış Fiyatı:</span>
                                <span className="detail-value highlight-price">{formatCurrency(offer.salePrice)}</span>
                              </div>
                            )}

                            {offer.ccEmails && offer.ccEmails.length > 0 && (
                              <div className="detail-row">
                                <AiOutlineMail className="detail-icon" />
                                <span className="detail-label">CC E-postalar:</span>
                                <span className="detail-value">{offer.ccEmails.join(', ')}</span>
                              </div>
                            )}
                          </div>

                          {/* View Form Button */}
                          <div className="offer-actions">
                            <button
                              className="btn-view-form"
                              onClick={() => handleViewForm(offer)}
                              title="Teklif formunu görüntüle"
                            >
                              <FaFileAlt /> Teklif Formunu Görüntüle
                            </button>
                          </div>


                          {/* Offer Note - always show description if exists */}
                          {offer.description && (
                            <div className="offer-description">
                              <div className="description-header">
                                <AiOutlineFileText className="detail-icon" />
                                <span className="description-label">Teklif Notu:</span>
                              </div>
                              <div className="description-content">
                                {offer.description}
                              </div>
                            </div>
                          )}

                          {/* Sales Note - only show if status is COMPLETED and saleNote exists */}
                          {offer.status === 'COMPLETED' && offer.saleNote && (
                            <div className="offer-description">
                              <div className="description-header">
                                <AiOutlineFileText className="detail-icon" />
                                <span className="description-label">Satış Notu:</span>
                              </div>
                              <div className="description-content">
                                {offer.saleNote}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="no-offers">
                    <p>Bu proje için henüz teklif gönderilmemiş.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Proposal Form Modal */}
          {showProposalForm && selectedOffer && (
            <div className="proposal-form-overlay" onClick={handleCloseForm}>
              <div className="proposal-form-modal" onClick={(e) => e.stopPropagation()}>
                <div className="form-modal-header">
                  <h2>Teklif Formu</h2>
                  <button className="close-button" onClick={handleCloseForm}>
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
                          <span className="info-value">{selectedOffer.clientCompanyName || 'N/A'}</span>
                        </div>
                        <div className="info-row">
                          <strong>Proje Kodu:</strong>
                          <span className="info-value">{selectedOffer.projectCode || 'N/A'}</span>
                        </div>
                        <div className="info-row">
                          <strong>Belge Tarihi:</strong>
                          <span className="info-value">{formatDate(selectedOffer.sentAt)}</span>
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
                            <td className="machine-name">{cleanMachineName(service?.machineTitle || 'Makine Adı')}</td>
                            <td className="quantity">1</td>
                            <td className="machine-price">{formatCurrencyDetailed(selectedOffer.price || 0)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Offer Footer */}
                    <div className="offer-footer">
                      <div className="total-section">
                        <div className="total-row">
                          <span>TOPLAM:</span>
                          <span className="total-price">{formatCurrencyDetailed(selectedOffer.price || 0)}</span>
                        </div>
                      </div>

                      {/* Description and Sales Note Section */}
                      {selectedOffer.description && (
                        <div className="description-section">
                          <div className="description-header">
                            <strong>Teklif Notu:</strong>
                          </div>
                          <div className="description-content">
                            {selectedOffer.description}
                          </div>
                        </div>
                      )}
                      {selectedOffer.status === 'COMPLETED' && selectedOffer.saleNote && (
                        <div className="description-section">
                          <div className="description-header">
                            <strong>Satış Notu:</strong>
                          </div>
                          <div className="description-content">
                            {selectedOffer.saleNote}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProposalInformationModal;  
