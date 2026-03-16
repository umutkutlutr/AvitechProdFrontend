import React, { useState, useEffect } from 'react';
import ServiceDetailsModal from './ServiceDetailsModal';
import ProfitAnalysisModal from './ProfitAnalysisModal';
import SendOfferModal from './SendOfferModal';
import ViewOfferModal from './ViewOfferModal';
import API_BASE_URL from '../../config';
import projectService from '../../services/projectService';
import authService from '../../services/authService';
import { normalizeProjectDetail } from '../../utils/projectNormalizer';
import { extractFilenameFromResponse } from '../../utils/apiUtils';
import {
  AiOutlineInfoCircle,
  AiOutlineEdit,
  AiOutlineCalendar,
  AiOutlineSetting,
  AiOutlineEuro,
  AiOutlineEye,
  AiOutlineDownload,
  AiOutlineClose
} from 'react-icons/ai';
import { FaChartLine, FaPaperPlane } from 'react-icons/fa';
import offerService from '../../services/offerService';
import './AllServices.css';
import './ProposalInformationModal.css'; // For offer form styles

const QuotesSent = ({ onEditService }) => {
  const [services, setServices] = useState([]);
  const [selectedService, setSelectedService] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProfitModalOpen, setIsProfitModalOpen] = useState(false);
  const [isSendOfferModalOpen, setIsSendOfferModalOpen] = useState(false);
  const [isViewOfferModalOpen, setIsViewOfferModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showOfferForm, setShowOfferForm] = useState(false);
  const [selectedOfferData, setSelectedOfferData] = useState(null);
  const [downloadingOfferId, setDownloadingOfferId] = useState(null);

  // Map API status to Turkish display text
  const getStatusDisplayText = (status) => {
    switch (status) {
      case 'COMPLETED':
        return 'ONAYLANDI';
      case 'CLOSED':
        return 'KAPALI';
      case 'OFFER_SENT':
        return 'ONAY BEKLİYOR';
      default:
        return 'ONAY BEKLİYOR';
    }
  };

  // Fetch offers from the new API endpoint
  useEffect(() => {
    const fetchQuotesSentProjects = async () => {
      try {
        setLoading(true);
        setError(null);
        const offersData = await projectService.getOffers();

        // Transform offers data to match the expected format
        const transformedServices = await Promise.all(offersData.map(async (offer) => {
          try {
            // Fetch project details for each offer
            const projectDetails = await projectService.getProjectById(offer.projectId);
            const n = normalizeProjectDetail(projectDetails);
            const cleanTitle = (title) => {
              if (!title || title === 'N/A') return title;
              return title.replace(/\s*\([^)]*\)\s*/g, '').trim();
            };
            const derivedMachineTitle = cleanTitle(n.machineName || n.title || offer.projectCode);
            const derivedOperatingSystem = n.model || projectDetails.operatingSystem || projectDetails.controlUnit || '-';
            const derivedYear = n.year ?? (projectDetails.createdAt ? new Date(projectDetails.createdAt).getFullYear() : null);

            return {
              id: offer.projectId, // Use projectId as the main ID for modals
              offerId: offer.id, // Keep offer ID for reference
              projectId: offer.projectId,
              projectCode: offer.projectCode,
              clientId: offer.clientId,
              clientCompanyName: offer.clientCompanyName,
              senderUserName: offer.senderUserName,
              sentAt: offer.sentAt,
              machineName: derivedMachineTitle,
              machineTitle: derivedMachineTitle,
              operatingSystem: derivedOperatingSystem,
              year: derivedYear != null ? String(derivedYear) : '-',
              serialNumber: n.serialNumber || projectDetails.serialNumber || '-',
              createdDate: offer.sentAt ? new Date(offer.sentAt).toLocaleDateString('tr-TR') : '-',
              originalStatus: offer.status, // Keep original API status for conditional logic
              status: getStatusDisplayText(offer.status),
              rawStatus: projectDetails?.status || offer.status,
              totalCost: projectDetails.totalCost || 0,
              salesPrice: projectDetails.salesPrice || 0,
              netProfit: projectDetails.netProfit || 0,
              profitMargin: projectDetails.profitMargin || 0,
              workingHours: projectDetails.hoursOperated || '-',
              repairHours: projectDetails.repairHours || '-',
              teamCount: projectDetails.teamCount || '-',
              teamMeasurementProbe: projectDetails.takimOlcmeProbu ? 'Var' : 'Yok',
              partMeasurementProbe: projectDetails.parcaOlcmeProbu ? 'Var' : 'Yok',
              insideWaterGiving: projectDetails.ictenSuVerme ? 'Var' : 'Yok',
              accessoryData: projectDetails.additionalEquipment || '-'
            };
          } catch (projectError) {
            console.error(`Error fetching project details for offer ${offer.id}:`, projectError);
            // Return basic offer data if project details can't be fetched
            const cleanTitle = (title) => {
              if (!title || title === 'N/A') return title;
              return title.replace(/\s*\([^)]*\)\s*/g, '').trim();
            };

            return {
              id: offer.projectId, // Use projectId as the main ID for modals
              offerId: offer.id, // Keep offer ID for reference
              projectId: offer.projectId,
              projectCode: offer.projectCode,
              clientId: offer.clientId,
              clientCompanyName: offer.clientCompanyName,
              senderUserName: offer.senderUserName,
              sentAt: offer.sentAt,
              machineName: cleanTitle(offer.projectCode),
              machineTitle: cleanTitle(offer.projectCode),
              operatingSystem: '-',
              year: '-',
              serialNumber: '-',
              createdDate: offer.sentAt ? new Date(offer.sentAt).toLocaleDateString('tr-TR') : '-',
              originalStatus: offer.status, // Keep original API status for conditional logic
              status: getStatusDisplayText(offer.status),
              rawStatus: offer.status,
              totalCost: 0,
              salesPrice: 0,
              netProfit: 0,
              profitMargin: 0,
              workingHours: '-',
              repairHours: '-',
              teamCount: '-',
              teamMeasurementProbe: 'Yok',
              partMeasurementProbe: 'Yok',
              insideWaterGiving: 'Yok',
              accessoryData: '-'
            };
          }
        }));

        setServices(transformedServices);
      } catch (err) {
        console.error('Error fetching quotes sent projects:', err);
        setError(err.message || 'Teklif gönderilen projeler yüklenirken bir hata oluştu');
      } finally {
        setLoading(false);
      }
    };

    fetchQuotesSentProjects();
  }, []);

  const handleInfoClick = (service) => {
    setSelectedService(service);
    setIsModalOpen(true);
  };

  const handleEditClick = (service) => {
    setSelectedService(service);
    setIsSendOfferModalOpen(true);
  };

  const handleViewOfferClick = (service) => {
    setSelectedService(service);
    setIsViewOfferModalOpen(true);
  };

  const handleCostDetailClick = (service) => {
    setSelectedService(service);
    setIsProfitModalOpen(true);
  };

  const handleDownloadOffer = async (service) => {
    if (!service?.offerId) {
      alert('Teklif ID bulunamadı');
      return;
    }

    setDownloadingOfferId(service.offerId);

    try {
      const response = await fetch(`${API_BASE_URL}/api/offers/${service.offerId}/quote-pdf`, {
        method: 'GET',
        headers: authService.getAuthHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'PDF indirilirken bir hata oluştu');
      }

      // Get the PDF blob
      const blob = await response.blob();

      // Extract filename from response header
      const filename = extractFilenameFromResponse(response, `teklif-${service.offerId}.pdf`);

      // Create a download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();

      // Clean up
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading offer PDF:', err);
      alert(err.message || 'PDF indirilirken bir hata oluştu');
    } finally {
      setDownloadingOfferId(null);
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'ONAY BEKLİYOR':
        return 'status-sent';
      case 'ONAYLANDI':
        return 'status-sold'; // Green badge for approved
      case 'KAPALI':
        return 'status-closed'; // Red badge for closed
      case 'Taslak':
        return 'status-draft';
      case 'Onaylandı':
        return 'status-approved';
      case 'Satıldı':
        return 'status-sold';
      default:
        return 'status-default';
    }
  };

  const formatCurrency = (amount, currency = 'EUR') => {
    if (currency === 'TRY') {
      return `₺${amount.toLocaleString('tr-TR')}`;
    }
    return `€${amount.toLocaleString('de-DE')}`;
  };

  // Clean machine name by removing project code
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

  const handleCardClick = async (service) => {
    try {
      // Fetch offer details
      const offers = await offerService.getOffersByProject(service.projectId);
      if (offers && offers.length > 0) {
        // Use the offer that matches the clicked card (by offerId), not always the first one
        const selectedOffer = offers.find((o) => o.id === service.offerId) || offers[0];
        setSelectedOfferData(selectedOffer);
        setSelectedService(service);
        setShowOfferForm(true);
      }
    } catch (err) {
      console.error('Error fetching offer details:', err);
      alert('Teklif bilgileri yüklenirken bir hata oluştu');
    }
  };

  const handleCloseForm = () => {
    setShowOfferForm(false);
    setSelectedOfferData(null);
  };

  return (
    <div className="all-services">
      <div className="services-header">
        <h1>Teklifler</h1>
        <p>Teklif gönderilmiş projelerinizi buradan görüntüleyebilir ve yönetebilirsiniz.</p>
      </div>

      {loading && (
        <div className="loading-state">
          <p>Projeler yükleniyor...</p>
        </div>
      )}

      {error && (
        <div className="error-state">
          <p>Hata: {error}</p>
        </div>
      )}

      {!loading && !error && services.length === 0 && (
        <div className="empty-state">
          <p>Teklif gönderilmiş proje bulunmamaktadır.</p>
        </div>
      )}

      {!loading && !error && services.length > 0 && (
        <div className="services-grid">
          {services.map((service) => (
            <div
              key={`${service.projectId}-${service.offerId}`}
              className="service-card clickable-card"
              onClick={() => handleCardClick(service)}
              style={{ cursor: 'pointer' }}
            >
              <div className="card-header">
                <h3 className="machine-name">{service.projectCode}</h3>
                <div className={`status-badge ${getStatusClass(service.status)}`}>
                  {service.status}
                </div>
              </div>

              <div className="sender-info">
                <span className="sender-label">Gönderen:</span>
                <span className="sender-name">{service.senderUserName || 'Bilinmiyor'}</span>
              </div>

              <div className="card-details">
                <div className="detail-row">
                  <AiOutlineSetting className="detail-icon" />
                  <span className="detail-value">{service.operatingSystem}</span>
                  <span className="detail-value">{service.machineTitle}</span>
                  <AiOutlineCalendar className="detail-icon" />
                  <span className="detail-value">{service.year}</span>
                </div>

                <div className="detail-row">
                  <span className="detail-label">Seri No:</span>
                  <span className="detail-value serial-number">{service.serialNumber}</span>
                </div>

                <div className="detail-row">
                  <span className="detail-label">Müşteri:</span>
                  <span className="detail-value client-company-name">{service.clientCompanyName || '-'}</span>
                </div>

                <div className="detail-row">
                  <span className="detail-label">Oluşturma:</span>
                  <span className="detail-value creation-date">{service.createdDate}</span>
                </div>
              </div>

              <div className="card-actions">
                <button
                  className="btn-info"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleInfoClick(service);
                  }}
                >
                  <AiOutlineInfoCircle className="btn-icon" />
                  Bilgi
                </button>
                <button
                  className="btn-cost-detail"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCostDetailClick(service);
                  }}
                >
                  <AiOutlineEuro className="btn-icon" />
                  Maliyet
                </button>
                <button
                  className="btn-download"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownloadOffer(service);
                  }}
                  title="Teklif PDF İndir"
                  disabled={downloadingOfferId === service.offerId}
                >
                  <AiOutlineDownload className="btn-icon" />
                  {downloadingOfferId === service.offerId ? 'İndiriliyor' : 'İndir'}
                </button>

              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && selectedService && (
        <ServiceDetailsModal
          service={selectedService}
          onClose={() => setIsModalOpen(false)}
        />
      )}

      {isProfitModalOpen && selectedService && (
        <ProfitAnalysisModal
          service={selectedService}
          onClose={() => setIsProfitModalOpen(false)}
          showSalesPrice={true}
        />
      )}

      {isSendOfferModalOpen && selectedService && (
        <SendOfferModal
          service={selectedService}
          onClose={() => setIsSendOfferModalOpen(false)}
        />
      )}

      {isViewOfferModalOpen && selectedService && (
        <ViewOfferModal
          isOpen={isViewOfferModalOpen}
          onClose={() => setIsViewOfferModalOpen(false)}
          projectId={selectedService.projectId}
          projectCode={selectedService.projectCode}
        />
      )}

      {/* Offer Form Modal */}
      {showOfferForm && selectedOfferData && selectedService && (
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
                      <span className="info-value">{selectedOfferData.clientCompanyName || 'N/A'}</span>
                    </div>
                    <div className="info-row">
                      <strong>Proje Kodu:</strong>
                      <span className="info-value">{selectedOfferData.projectCode || 'N/A'}</span>
                    </div>
                    <div className="info-row">
                      <strong>Belge Tarihi:</strong>
                      <span className="info-value">{formatDate(selectedOfferData.sentAt)}</span>
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
                        <td className="machine-name">{cleanMachineName(selectedService?.machineTitle || 'Makine Adı')}</td>
                        <td className="quantity">1</td>
                        <td className="machine-price">{formatCurrencyDetailed(selectedOfferData.price || 0)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Offer Footer */}
                <div className="offer-footer">
                  <div className="total-section">
                    <div className="total-row">
                      <span>TOPLAM:</span>
                      <span className="total-price">{formatCurrencyDetailed(selectedOfferData.price || 0)}</span>
                    </div>
                  </div>

                  {/* Description Section */}
                  {selectedOfferData.description && (
                    <div className="description-section">
                      <div className="description-header">
                        <strong>Açıklama:</strong>
                      </div>
                      <div className="description-content">
                        {selectedOfferData.description}
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
  );
};

export default QuotesSent;