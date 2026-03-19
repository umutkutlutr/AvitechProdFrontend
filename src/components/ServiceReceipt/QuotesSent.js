import React, { useState, useEffect } from 'react';
import ServiceDetailsModal from './ServiceDetailsModal';
import ProfitAnalysisModal from './ProfitAnalysisModal';
import SendOfferModal from './SendOfferModal';
import ViewOfferModal from './ViewOfferModal';
import OfferPdfPreviewModal from '../shared/OfferPdfPreviewModal';
import API_BASE_URL from '../../config';
import projectService from '../../services/projectService';
import authService from '../../services/authService';
import { normalizeProjectDetail } from '../../utils/projectNormalizer';
import { extractFilenameFromResponse } from '../../utils/apiUtils';
import {
  AiOutlineInfoCircle,
  AiOutlineCalendar,
  AiOutlineSetting,
  AiOutlineEuro,
  AiOutlineDownload
} from 'react-icons/ai';
import { FaPaperPlane } from 'react-icons/fa';
import Pagination from '../shared/Pagination';
import ViewToggle from '../shared/ViewToggle';
import SearchBar from './SearchBar';
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
  const [downloadingOfferId, setDownloadingOfferId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(() => {
    try {
      return parseInt(localStorage.getItem('quotesSent_pageSize') || '12', 10);
    } catch { return 12; }
  });
  const [viewMode, setViewMode] = useState(() => {
    try {
      return localStorage.getItem('quotesSent_viewMode') || 'card';
    } catch { return 'card'; }
  });
  const [searchTerm, setSearchTerm] = useState('');

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

  // Clean machine name by removing project code
  const cleanMachineName = (name) => {
    if (!name) return name;
    return name.replace(/\s*\(AVEMAK-\d+\)\s*$/, '').trim();
  };

  const [showOfferPdfId, setShowOfferPdfId] = useState(null);

  const handleCardClick = (service) => {
    setSelectedService(service);
    setShowOfferPdfId(service.offerId);
  };

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredServices = normalizedSearch
    ? services.filter((s) => {
        const fields = [s.projectCode, s.machineName, s.clientCompanyName, s.year, s.serialNumber].filter(Boolean);
        return fields.some((f) => String(f).toLowerCase().includes(normalizedSearch));
      })
    : services;
  const totalPages = Math.ceil(filteredServices.length / itemsPerPage);
  const startIdx = (currentPage - 1) * itemsPerPage;
  const paginatedServices = filteredServices.slice(startIdx, startIdx + itemsPerPage);

  const handleSearch = (q) => {
    setSearchTerm(q);
    setCurrentPage(1);
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

      {!loading && !error && services.length > 0 && filteredServices.length === 0 && (
        <div className="empty-state">
          <p>Arama kriterlerinize uygun teklif bulunamadı.</p>
        </div>
      )}

      {!loading && !error && services.length > 0 && filteredServices.length > 0 && (
        <>
          <div className="quotes-sent-toolbar">
            <SearchBar
              onSearch={handleSearch}
              placeholder="Proje kodu, makine, müşteri, yıl veya seri no ile ara..."
            />
            <ViewToggle
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              storageKey="quotesSent_viewMode"
            />
            <Pagination
              inline
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredServices.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={(v) => {
                setItemsPerPage(v);
                setCurrentPage(1);
                try { localStorage.setItem('quotesSent_pageSize', String(v)); } catch (_) {}
              }}
              storageKey="quotesSent_pageSize"
              label="teklif"
            />
          </div>
          {viewMode === 'table' ? (
            <div className="quotes-sent-table-wrapper">
              <table className="quotes-sent-table">
                <thead>
                  <tr>
                    <th>Proje Kodu</th>
                    <th>Makine</th>
                    <th>Müşteri</th>
                    <th>Gönderen</th>
                    <th>Tarih</th>
                    <th>Durum</th>
                    <th>İşlemler</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedServices.map((service) => (
                    <tr key={`${service.projectId}-${service.offerId}`} onClick={() => handleCardClick(service)}>
                      <td>{service.projectCode}</td>
                      <td>{cleanMachineName(service.machineTitle)}</td>
                      <td>{service.clientCompanyName || '-'}</td>
                      <td>{service.senderUserName || '-'}</td>
                      <td>{service.createdDate}</td>
                      <td><span className={`status-badge ${getStatusClass(service.status)}`}>{service.status}</span></td>
                      <td>
                        <button className="operation-btn info-btn-enhanced" onClick={(e) => { e.stopPropagation(); handleInfoClick(service); }}><AiOutlineInfoCircle /></button>
                        <button className="operation-btn submit-btn-enhanced" onClick={(e) => { e.stopPropagation(); handleEditClick(service); }}><FaPaperPlane /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
        <div className="services-grid">
          {paginatedServices.map((service) => (
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
        </>
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

      {/* Teklif PDF Önizleme - Müşteriye gönderilen teklifin PDF'i */}
      <OfferPdfPreviewModal
        isOpen={!!showOfferPdfId}
        onClose={() => setShowOfferPdfId(null)}
        offerId={showOfferPdfId}
      />
    </div>
  );
};

export default QuotesSent;