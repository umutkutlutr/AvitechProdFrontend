import React, { useState, useEffect } from 'react';
import ServiceDetailsModal from './ServiceDetailsModal';
import ProposalInformationModal from './ProposalInformationModal';
import CostInformationModal from './CostInformationModal';
import projectService from '../../services/projectService';
import { normalizeProjectCard } from '../../utils/projectNormalizer';
import { getStatusLabel } from '../../utils/statusDateDictionary';
import { getProjectStatusBadgeClass } from '../../utils/projectStatusUi';
import Pagination from '../shared/Pagination';
import ViewToggle from '../shared/ViewToggle';
import SearchBar from './SearchBar';
import {
  AiOutlineInfoCircle,
  AiOutlineCalendar,
  AiOutlineSetting,
  AiOutlineEuro,
  AiOutlineLoading3Quarters
} from 'react-icons/ai';
import { FaPaperPlane } from 'react-icons/fa';
import './AllServices.css';

const ClosedProjects = ({ onEditService }) => {
  const [services, setServices] = useState([]);
  const [selectedService, setSelectedService] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProposalModalOpen, setIsProposalModalOpen] = useState(false);
  const [isCostModalOpen, setIsCostModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(() => {
    try {
      return parseInt(localStorage.getItem('closedProjects_pageSize') || '12', 10);
    } catch { return 12; }
  });
  const [viewMode, setViewMode] = useState(() => {
    try {
      return localStorage.getItem('closedProjects_viewMode') || 'card';
    } catch { return 'card'; }
  });
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch projects with SOLD status from API
  useEffect(() => {
    const fetchClosedProjects = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await projectService.getProjectsByStatus('SOLD');

        // Transform API data to align center card fields with MainMenu (use normalizer for canonical fields)
        const transformedServices = data.map(project => {
          const n = normalizeProjectCard(project);
          const cleanTitle = (title) => {
            if (!title || title === 'N/A') return title;
            return title.replace(/\s*\([^)]*\)\s*/g, '').trim();
          };
          const machineTitle = cleanTitle(n.machineName || n.title || project.projectCode);
          const operatingSystem = n.model || project.operatingSystem || project.controlUnit || 'N/A';
          const year = n.year ?? (project.createdAt ? new Date(project.createdAt).getFullYear() : null);

          return {
            id: project.id,
            projectCode: n.projectCode || project.projectCode,
            machineName: machineTitle,
            machineTitle,
            operatingSystem,
            year: year != null ? String(year) : 'N/A',
            serialNumber: n.serialNumber || project.serialNumber,
            createdDate: project.createdAt ? new Date(project.createdAt).toLocaleDateString('tr-TR') : '-',
            status: project.status || 'SOLD',
            rawStatus: project.status || 'SOLD',
            workingHours: project.hoursOperated || '-',
            repairHours: project.repairHours || '-',
            teamCount: project.teamCount || '-',
            teamMeasurementProbe: project.takimOlcmeProbu ? 'Var' : 'Yok',
            partMeasurementProbe: project.parcaOlcmeProbu ? 'Var' : 'Yok',
            insideWaterGiving: project.ictenSuVerme ? 'Var' : 'Yok',
            accessoryData: project.additionalEquipment || '-'
          };
        });

        setServices(transformedServices);
      } catch (err) {
        console.error('Error fetching closed projects:', err);
        setError(err.message || 'Kapatılan projeler yüklenirken bir hata oluştu');
      } finally {
        setLoading(false);
      }
    };

    fetchClosedProjects();
  }, []);

  const handleInfoClick = (service) => {
    setSelectedService(service);
    setIsModalOpen(true);
  };

  const handleEditClick = (service) => {
    if (onEditService) {
      onEditService(service);
    }
  };

  const handleProposalInfoClick = (service) => {
    setSelectedService(service);
    setIsProposalModalOpen(true);
  };

  const handleCostInfoClick = (service) => {
    setSelectedService(service);
    setIsCostModalOpen(true);
  };

  const formatCurrency = (amount, currency = 'EUR') => {
    if (currency === 'TRY') {
      return `₺${amount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return `€${amount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredServices = normalizedSearch
    ? services.filter((s) => {
        const fields = [s.projectCode, s.machineName, s.operatingSystem, s.year, s.serialNumber].filter(Boolean);
        return fields.some((f) => String(f).toLowerCase().includes(normalizedSearch));
      })
    : services;

  return (
    <div className="all-services">
      <div className="services-header">
        <h1>Tamamlanan Projeler</h1>
        <p>Satılmış ve tamamlanmış projelerinizi buradan görüntüleyebilirsiniz.</p>
      </div>

      {loading && (
        <div className="page-loading">
          <AiOutlineLoading3Quarters className="page-loading-spinner" />
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
          <p>Tamamlanmış proje bulunmamaktadır.</p>
        </div>
      )}

      {!loading && !error && services.length > 0 && filteredServices.length === 0 && (
        <div className="empty-state">
          <p>Arama kriterlerinize uygun proje bulunamadı.</p>
        </div>
      )}

      {!loading && !error && services.length > 0 && filteredServices.length > 0 && (() => {
        const totalPages = Math.ceil(filteredServices.length / itemsPerPage);
        const startIdx = (currentPage - 1) * itemsPerPage;
        const paginatedServices = filteredServices.slice(startIdx, startIdx + itemsPerPage);
        return (
        <>
          <SearchBar
            onSearch={(q) => { setSearchTerm(q); setCurrentPage(1); }}
            placeholder="Proje kodu, makine, model, yıl veya seri no ile ara..."
          />
          <div className="quotes-sent-toolbar">
            <ViewToggle viewMode={viewMode} onViewModeChange={setViewMode} storageKey="closedProjects_viewMode" />
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
                try { localStorage.setItem('closedProjects_pageSize', String(v)); } catch (_) {}
              }}
              storageKey="closedProjects_pageSize"
              label="proje"
            />
          </div>
          {viewMode === 'table' ? (
            <div className="quotes-sent-table-wrapper">
              <table className="quotes-sent-table">
                <thead>
                  <tr>
                    <th>Proje Kodu</th>
                    <th>Makine</th>
                    <th>Model</th>
                    <th>Yıl</th>
                    <th>Seri No</th>
                    <th>İşlemler</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedServices.map((service) => (
                    <tr key={service.id}>
                      <td>{service.projectCode}</td>
                      <td>{service.machineName}</td>
                      <td>{service.operatingSystem}</td>
                      <td>{service.year}</td>
                      <td>{service.serialNumber}</td>
                      <td>
                        <button className="operation-btn" onClick={() => handleProposalInfoClick(service)}><FaPaperPlane /></button>
                        <button className="operation-btn" onClick={() => handleCostInfoClick(service)}><AiOutlineEuro /></button>
                        <button className="operation-btn" onClick={() => handleInfoClick(service)}><AiOutlineInfoCircle /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
          <div className="services-grid">
            {paginatedServices.map((service) => (
              <div key={service.id} className="service-card">
                <div className="card-header">
                  <h3 className="machine-name">{service.projectCode || service.machineName}</h3>
                  <div className={`status-badge ${getProjectStatusBadgeClass(service.status)}`}>
                    {getStatusLabel(service.status)}
                  </div>
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
                    <span className="detail-label">Oluşturma:</span>
                    <span className="detail-value creation-date">{service.createdDate}</span>
                  </div>
                </div>

                <div className="card-actions sold-item">
                  <button
                    className="btn-proposal-info"
                    onClick={() => handleProposalInfoClick(service)}
                  >
                    <FaPaperPlane className="btn-icon" />
                    Teklif
                  </button>
                  <button
                    className="btn-cost-info"
                    onClick={() => handleCostInfoClick(service)}
                  >
                    <AiOutlineEuro className="btn-icon" />
                    Maliyet
                  </button>
                  <button
                    className="btn-info"
                    onClick={() => handleInfoClick(service)}
                  >
                    <AiOutlineInfoCircle className="btn-icon" />
                    Bilgi
                  </button>
                </div>
              </div>
            ))}
          </div>
          )}
        </>
        );
      })()}

      {isModalOpen && selectedService && (
        <ServiceDetailsModal
          service={selectedService}
          onClose={() => setIsModalOpen(false)}
          isCompletedProject={true}
        />
      )}

      {isProposalModalOpen && selectedService && (
        <ProposalInformationModal
          service={selectedService}
          onClose={() => setIsProposalModalOpen(false)}
        />
      )}

      {isCostModalOpen && selectedService && (
        <CostInformationModal
          service={selectedService}
          onClose={() => setIsCostModalOpen(false)}
        />
      )}

    </div>
  );
};

export default ClosedProjects;
