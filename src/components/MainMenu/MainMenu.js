import React, { useState, useEffect, useCallback } from 'react';
import {
  FaFileInvoice,
  FaPaperPlane,
  FaClock,
  FaExchangeAlt,
  FaSearch,
  FaEye,
  FaLock,
  FaChevronDown
} from 'react-icons/fa';
import {
  AiOutlineInfoCircle,
  AiOutlineEdit,
  AiOutlineCalendar,
  AiOutlineSetting,
  AiOutlineClose,
  AiOutlineLoading3Quarters
} from 'react-icons/ai';
import { useAuth } from '../../contexts/AuthContext';
import ServiceDetailsModal from '../ServiceReceipt/ServiceDetailsModal';
import SendOfferModal from '../ServiceReceipt/SendOfferModal';
import SearchBar from '../ServiceReceipt/SearchBar';
import FilterPanel from '../ServiceReceipt/FilterPanel';
import Pagination from '../shared/Pagination';
import FilterChips from '../shared/FilterChips';
import projectService from '../../services/projectService';
import { normalizeProjectCard } from '../../utils/projectNormalizer';
import { getStatusLabel } from '../../utils/statusDateDictionary';
import { getProjectStatusBadgeClass } from '../../utils/projectStatusUi';
import './MainMenu.css';

const MainMenu = () => {
  const { canSubmitOffer, canDelete } = useAuth();
  const [selectedService, setSelectedService] = useState(null);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [isSendOfferModalOpen, setIsSendOfferModalOpen] = useState(false);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [projectCounts, setProjectCounts] = useState(null);
  const [countsLoading, setCountsLoading] = useState(true);
  const [countsError, setCountsError] = useState(null);
  const [offersCount, setOffersCount] = useState(0);
  const [offersCountLoading, setOffersCountLoading] = useState(true);
  const [offersCountError, setOffersCountError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilters, setActiveFilters] = useState({});
  const [isSearching, setIsSearching] = useState(false);
  const [isFiltering, setIsFiltering] = useState(false);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [itemsPerPage, setItemsPerPage] = useState(() => {
    try {
      return parseInt(localStorage.getItem('mainMenu_pageSize') || '6', 10);
    } catch { return 6; }
  });

  // Fetch all data on component mount (single effect to prevent double rendering)
  useEffect(() => {
    let cancelled = false;

    const fetchAllData = async () => {
      setLoading(true);
      setCountsLoading(true);
      setOffersCountLoading(true);
      setError(null);
      setCountsError(null);
      setOffersCountError(null);

      try {
        const [projectsData, countsData, offersData] = await Promise.allSettled([
          projectService.getProjects(),
          projectService.getProjectCountsByStatus(),
          projectService.getOffers(),
        ]);

        if (cancelled) return;

        if (projectsData.status === 'fulfilled') {
          setProjects(projectsData.value || []);
        } else {
          console.error('Error fetching projects:', projectsData.reason);
          setError(projectsData.reason?.message || 'Projeler yüklenirken bir hata oluştu');
        }

        if (countsData.status === 'fulfilled') {
          setProjectCounts(countsData.value);
        } else {
          console.error('Error fetching project counts:', countsData.reason);
          setCountsError(countsData.reason?.message || 'Proje sayıları yüklenirken bir hata oluştu');
        }

        if (offersData.status === 'fulfilled') {
          const uniqueProjectIds = new Set((offersData.value || []).map(offer => offer.projectId));
          setOffersCount(uniqueProjectIds.size);
        } else {
          console.error('Error fetching offers count:', offersData.reason);
          setOffersCountError(offersData.reason?.message || 'Teklif sayısı yüklenirken bir hata oluştu');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setCountsLoading(false);
          setOffersCountLoading(false);
        }
      }
    };

    fetchAllData();

    return () => { cancelled = true; };
  }, []);

  // Search functionality
  const handleSearch = useCallback(async (query) => {
    setSearchTerm(query);
    setIsSearching(true);
    setError(null);

    try {
      if (query.trim()) {
        const searchResults = await projectService.searchProjects(query);
        setProjects(searchResults);
      } else {
        // If search is cleared, reload all projects or apply active filters
        if (Object.keys(activeFilters).length > 0 && Object.values(activeFilters).some(v => v !== '')) {
          await handleFilter(activeFilters);
        } else {
          const data = await projectService.getProjects();
          setProjects(data || []);
        }
      }
    } catch (err) {
      setError(err.message || 'Arama sırasında bir hata oluştu');
      console.error('Search error:', err);
    } finally {
      setIsSearching(false);
    }
  }, [activeFilters]);

  // Filter functionality
  const handleFilter = useCallback(async (filters) => {
    setActiveFilters(filters);
    setIsFiltering(true);
    setError(null);

    try {
      // Check if any filter has a value
      const hasActiveFilters = Object.values(filters).some(value => value !== '');

      if (hasActiveFilters) {
        const filterResults = await projectService.filterProjects(filters);
        setProjects(filterResults);
      } else {
        // If no filters, load all projects
        const data = await projectService.getProjects();
        setProjects(data || []);
      }
    } catch (err) {
      setError(err.message || 'Filtreleme sırasında bir hata oluştu');
      console.error('Filter error:', err);
    } finally {
      setIsFiltering(false);
    }
  }, []);

  // Clear filters functionality
  const handleClearFilters = () => {
    setActiveFilters({});
    setSearchTerm('');
    const fetchProjects = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await projectService.getProjects();
        setProjects(data || []);
      } catch (err) {
        console.error('Error fetching projects:', err);
        setError(err.message || 'Projeler yüklenirken bir hata oluştu');
      } finally {
        setLoading(false);
      }
    };
    fetchProjects();
  };

  // Calculate dashboard stats from API data
  const completedProjects = projectCounts?.statusCounts?.SOLD || 0;
  const submittedOffers = offersCount;

  const dashboardStats = [
    {
      title: 'Kapanan Projeler',
      count: completedProjects,
      icon: FaFileInvoice,
      color: 'green',
      loading: countsLoading,
      error: countsError
    },
    {
      title: 'Teklif Gönderilen Projeler',
      count: submittedOffers,
      icon: FaPaperPlane,
      color: 'blue',
      loading: offersCountLoading,
      error: offersCountError
    }
  ];

  // Helper function to remove parentheses and their contents from title
  const cleanTitle = (title) => {
    if (!title || title === 'N/A') return title;
    return title.replace(/\s*\([^)]*\)\s*/g, '').trim();
  };

  // Pagination logic
  const totalPages = Math.ceil(projects.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentProjects = projects.slice(startIndex, endIndex);

  // Transform API data to match the expected format for the cards (use normalizer for canonical fields)
  const serviceData = currentProjects.map(project => {
    const n = normalizeProjectCard(project);
    return {
    id: project.id || project._id,
    projectCode: n.projectCode || 'N/A',
    machineName: n.machineName || 'N/A',
    machineTitle: cleanTitle(n.machineName || n.title || 'N/A'),
    title: n.machineName || n.title || 'N/A',
    year: n.year ?? (project.createdAt ? new Date(project.createdAt).getFullYear() : null),
    operatingSystem: n.model || project.operatingSystem || project.controlUnit || 'N/A',
    serialNumber: n.serialNumber || 'N/A',
    createdDate: project.createdAt ? new Date(project.createdAt).toLocaleDateString('tr-TR') : 'N/A',
    status: project.status || 'UNKNOWN',
    workingHours: project.workingHours || '0',
    repairHours: project.repairHours || '0',
    teamCount: project.teamCount || '0',
    teamMeasurementProbe: project.teamMeasurementProbe || 'N/A',
    partMeasurementProbe: project.partMeasurementProbe || 'N/A',
    insideWaterGiving: project.insideWaterGiving || 'N/A',
    accessoryData: project.accessoryData || 'N/A',
    firmName: project.firmName || 'N/A',
    technician: project.technician || 'N/A',
    // Additional technical details for ServiceDetailsModal
    make: n.make || project.brand || 'N/A',
    brand: n.make || project.brand || 'N/A',
    model: n.model || 'N/A',
    controlUnit: project.controlUnit || 'CNC',
    xMovements: project.xmovement || project.xMovement || project.xMovements || 'N/A',
    yMovements: project.ymovement || project.yMovement || project.yMovements || 'N/A',
    zMovements: project.zmovement || project.zMovement || project.zMovements || 'N/A',
    aMovements: project.amovement || project.aMovement || project.aMovements || 'N/A',
    bMovements: project.bmovement || project.bMovement || project.bMovements || 'N/A',
    cMovements: project.cmovement || project.cMovement || project.cMovements || 'N/A',
    spindleSpeed: project.spindleSpeed || 'N/A',
    toolCount: project.toolCount || 'N/A',
    holderType: project.holderType || 'N/A',
    machineDimensions: project.machineDimensions || 'N/A',
    machinePower: project.machinePower || 'N/A',
    internalCoolant: project.internalCoolant || 'N/A',
    chipConveyor: project.chipConveyor || 'N/A',
    paperFilter: project.paperFilter || 'N/A',
    maxMaterialWeight: project.maxMaterialWeight || 'N/A',
    machineWeight: project.machineWeight || 'N/A',
    operatingHours: project.operatingHours || 'N/A',
    otherInfo: project.otherInfo || 'N/A'
  };
  });

  // Pagination handlers
  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (val) => {
    setItemsPerPage(val);
    setCurrentPage(1);
    try {
      localStorage.setItem('mainMenu_pageSize', String(val));
    } catch (_) {}
  };

  const handleFilterRemove = (fieldKey) => {
    const next = { ...activeFilters };
    delete next[fieldKey];
    setActiveFilters(next);
    handleFilter(next);
  };

  const handleInfoClick = (service) => {
    setSelectedService(service);
    setShowInfoModal(true);
  };

  const handleCloseModal = () => {
    setShowInfoModal(false);
    setSelectedService(null);
  };

  const handleEditClick = (service) => {
    setSelectedService(service);
    setIsSendOfferModalOpen(true);
  };

  // Select mode handlers
  const toggleSelectMode = () => {
    setIsSelectMode((prev) => {
      const next = !prev;
      if (!next) {
        setSelectedIds(new Set());
      } else {
        // When entering select mode, remove any SOLD items from selection
        setSelectedIds((prevIds) => {
          const filtered = new Set();
          prevIds.forEach((id) => {
            const service = serviceData.find((s) => s.id === id);
            if (service && isSelectable(service.status)) {
              filtered.add(id);
            }
          });
          return filtered;
        });
      }
      return next;
    });
  };

  const toggleSelectItem = (id) => {
    // Prevent selecting SOLD items
    const service = serviceData.find((s) => s.id === id);
    if (service && !isSelectable(service.status)) {
      return;
    }

    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    const confirmDelete = window.confirm(
      `${selectedIds.size} proje silinecek. Devam etmek istiyor musunuz?`
    );
    if (!confirmDelete) return;

    try {
      setLoading(true);
      setError(null);
      // delete sequentially to keep it simple and reliable
      for (const id of selectedIds) {
        await projectService.deleteProject(id);
      }
      // refresh list
      const data = await projectService.getProjects();
      setProjects(data || []);
      clearSelection();
      setIsSelectMode(false);
    } catch (err) {
      console.error('Batch delete error:', err);
      setError(err.message || 'Projeler silinirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  /** Legacy dashboard labels → same badge class as API enum */
  const projectBadgeClass = (status) => {
    if (status === 'TAMAMLANMIŞ') return getProjectStatusBadgeClass('SOLD');
    if (status === 'TEKLİF GÖNDERİLECEK') return getProjectStatusBadgeClass('TEMPLATE');
    if (status === 'EXCHANGE CIHAZ TEKLİFİ') return getProjectStatusBadgeClass('OFFER_SENT');
    return getProjectStatusBadgeClass(status);
  };

  const projectStatusText = (status) => {
    if (status === 'TAMAMLANMIŞ') return 'TAMAMLANMIŞ';
    if (status === 'TEKLİF GÖNDERİLECEK') return 'TEKLİF GÖNDERİLECEK';
    if (status === 'EXCHANGE CIHAZ TEKLİFİ') return 'EXCHANGE CIHAZ TEKLİFİ';
    return getStatusLabel(status);
  };

  const formatCurrency = (amount, currency = 'EUR') => {
    const num = typeof amount === 'number' ? amount : parseFloat(amount);
    if (num == null || isNaN(num)) return '-';
    const symbol = currency === 'TRY' ? '₺' : '€';
    return `${symbol}${num.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Helper function to check if a service can be selected
  const isSelectable = (status) => {
    return status !== 'SOLD';
  };

  return (
    <div className="main-menu">
      {/* Dashboard Stats Cards */}
      <div className="dashboard-stats">
        {dashboardStats.map((stat, index) => (
          <div key={index} className={`stat-card ${stat.color}`}>
            <div className="stat-icon">
              <stat.icon />
            </div>
            <div className="stat-content">
              <div className="stat-title">{stat.title}</div>
              <div className="stat-count">
                {stat.loading ? (
                  <AiOutlineLoading3Quarters className="inline-loading-spinner" />
                ) : stat.error ? (
                  <span className="error-text">Hata</span>
                ) : (
                  stat.count
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Services Section */}
      <div className="services-section">
        <div className="section-header">
          <h2>Son Projeler</h2>
          <div className="section-actions">
            {canDelete() && (
              <>
                {isSelectMode && (
                  <button
                    className="btn-danger"
                    onClick={handleDeleteSelected}
                    disabled={selectedIds.size === 0 || loading}
                  >
                    Seçileni Sil ({selectedIds.size})
                  </button>
                )}
                <button
                  className={`btn-select-toggle ${isSelectMode ? 'active' : ''}`}
                  onClick={toggleSelectMode}
                  disabled={loading || isSearching || isFiltering}
                >
                  {isSelectMode ? 'İptal' : 'Seç'}
                </button>
              </>
            )}
          </div>
        </div>

        <SearchBar
          onSearch={handleSearch}
          placeholder="Projelerde ara... (proje kodu, makine adı, model, marka, yıl, seri numarası)"
        />

        <FilterPanel
          onFilter={handleFilter}
          onClear={handleClearFilters}
        />

        <FilterChips
          activeFilters={activeFilters}
          onRemove={handleFilterRemove}
          onClearAll={handleClearFilters}
          fieldLabels={{
            projectCode: 'Proje Kodu',
            machineName: 'Marka',
            model: 'Model',
            make: 'Marka',
            yearMin: 'Yıl (Min)',
            yearMax: 'Yıl (Max)',
            conveyor: 'Konveyör'
          }}
        />

        {(loading || isSearching || isFiltering) && (
          <div className="page-loading">
            <AiOutlineLoading3Quarters className="page-loading-spinner" />
            <p>
              {isSearching ? 'Aranıyor...' :
                isFiltering ? 'Filtreleniyor...' :
                  'Projeler yükleniyor...'}
            </p>
          </div>
        )}

        {error && (
          <div className="error-state">
            <p>Hata: {error}</p>
          </div>
        )}

        {!loading && !isSearching && !isFiltering && !error && serviceData.length === 0 && (
          <div className="empty-state">
            <p>
              {searchTerm || Object.values(activeFilters).some(v => v !== '')
                ? 'Arama kriterlerinize uygun proje bulunamadı.'
                : 'Henüz proje bulunmuyor.'}
            </p>
          </div>
        )}

        {!loading && !isSearching && !isFiltering && !error && serviceData.length > 0 && (
          <>
            <div className="services-grid">
              {serviceData.map((service) => (
                <div
                  key={service.id}
                  className={`service-card ${isSelectMode && isSelectable(service.status) ? 'select-mode' : ''} ${isSelectMode && selectedIds.has(service.id) ? 'selected' : ''} ${isSelectMode && !isSelectable(service.status) ? 'non-selectable' : ''}`}
                  onClick={(e) => {
                    if (isSelectMode && isSelectable(service.status)) {
                      // Allow clicks on checkbox to handle selection via onChange
                      if (e.target.type === 'checkbox') {
                        return;
                      }
                      toggleSelectItem(service.id);
                    }
                  }}
                  style={isSelectMode && isSelectable(service.status) ? { cursor: 'pointer' } : isSelectMode && !isSelectable(service.status) ? { cursor: 'not-allowed', opacity: 0.6 } : {}}
                >
                  <div className="card-header">
                    <h3 className="machine-name">{service.projectCode}</h3>
                    <div className={`status-badge ${projectBadgeClass(service.status)}`}>
                      {projectStatusText(service.status)}
                    </div>
                  </div>

                  <div className="card-details">
                    {isSelectMode && isSelectable(service.status) && (
                      <div className="select-indicator">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(service.id)}
                          onChange={() => toggleSelectItem(service.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <span>Seç</span>
                      </div>
                    )}
                    <div className="detail-row single-line">
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

                  {!isSelectMode && (
                    <div className="card-actions">
                      {canSubmitOffer() && (
                        service.status === 'SOLD' ? (
                          <span className="sold-badge">Satıldı</span>
                        ) : (
                          <button
                            className="btn-offer"
                            onClick={() => handleEditClick(service)}
                          >
                            <FaPaperPlane className="btn-icon" />
                            Teklif Gönder
                          </button>
                        )
                      )}
                      <button
                        className="btn-info"
                        onClick={() => handleInfoClick(service)}
                      >
                        <AiOutlineInfoCircle className="btn-icon" />
                        Bilgi
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={projects.length}
              itemsPerPage={itemsPerPage}
              onPageChange={handlePageChange}
              onItemsPerPageChange={handleItemsPerPageChange}
              storageKey="mainMenu_pageSize"
              label="proje"
            />
          </>
        )}
      </div>

      {/* Service Details Modal */}
      {showInfoModal && selectedService && (
        <ServiceDetailsModal
          service={selectedService}
          onClose={handleCloseModal}
        />
      )}

      {/* Send Offer Modal */}
      {isSendOfferModalOpen && selectedService && (
        <SendOfferModal
          service={selectedService}
          onClose={() => setIsSendOfferModalOpen(false)}
        />
      )}
    </div>
  );
};

export default MainMenu;
