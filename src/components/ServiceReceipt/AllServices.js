import React, { useState, useEffect, useCallback, useRef } from 'react';
import ServiceDetailsModal from './ServiceDetailsModal';
import ProfitAnalysisModal from './ProfitAnalysisModal';
import ViewProposalsModal from './ViewProposalsModal';
import SendOfferModal from './SendOfferModal';
import EditProjectModal from './EditProjectModal';
import ViewOfferModal from './ViewOfferModal';
import CreateSaleModal from './CreateSaleModal';
import SearchBar from './SearchBar';
import FilterPanel from './FilterPanel';
import projectService from '../../services/projectService';
import proformaService from '../../services/proformaService';
import { normalizeProjectCard } from '../../utils/projectNormalizer';
import OfferProformaDetailModal from './OfferProformaDetailModal';
import { useAuth } from '../../contexts/AuthContext';
import {
  AiOutlineInfoCircle,
  AiOutlineEdit,
  AiOutlineCalendar,
  AiOutlineSetting,
  AiOutlineEuro,
  AiOutlineEye,
  AiOutlineReload,
  AiOutlineDelete,
  AiOutlineLoading3Quarters
} from 'react-icons/ai';
import { FaChartLine, FaPaperPlane } from 'react-icons/fa';
import './AllServicesTable.css';

const AllServices = ({ onEditService }) => {
  const { canEdit, canDelete, canSubmitOffer } = useAuth();
  const [projects, setProjects] = useState([]);
  const [selectedService, setSelectedService] = useState(null);
  const [selectedProjectForOffers, setSelectedProjectForOffers] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProfitModalOpen, setIsProfitModalOpen] = useState(false);
  const [isProposalsModalOpen, setIsProposalsModalOpen] = useState(false);
  const [isSendOfferModalOpen, setIsSendOfferModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewOfferModalOpen, setIsViewOfferModalOpen] = useState(false);
  const [isCreateSaleModalOpen, setIsCreateSaleModalOpen] = useState(false);
  const [offerProformaSummaries, setOfferProformaSummaries] = useState({});
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [detailModalProjectId, setDetailModalProjectId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingProjectId, setEditingProjectId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilters, setActiveFilters] = useState({});
  const [isSearching, setIsSearching] = useState(false);
  const [isFiltering, setIsFiltering] = useState(false);
  const tableRef = useRef(null);

  // Load projects from API
  useEffect(() => {
    loadProjects();
  }, []);

  // Helper function to filter out SOLD projects
  const filterOutSoldProjects = (projectsData) => {
    return projectsData.filter(project => project.status !== 'SOLD');
  };

  const loadProjects = async () => {
    try {
      setLoading(true);
      setError('');
      const projectsData = await projectService.getProjects();
      const filteredProjects = filterOutSoldProjects(projectsData);
      setProjects(filteredProjects);
      loadOfferProformaSummaries(filteredProjects);
    } catch (err) {
      setError(err.message || 'Projeler yüklenirken bir hata oluştu');
      console.error('Error loading projects:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadOfferProformaSummaries = async (projectsList) => {
    const summaries = {};
    const promises = projectsList.map(async (project) => {
      try {
        const summary = await proformaService.getOfferProformaSummary(project.id);
        summaries[project.id] = summary;
      } catch (e) {
        summaries[project.id] = { offerCount: 0, proformaCount: 0, summaryText: '-', items: [] };
      }
    });
    await Promise.all(promises);
    setOfferProformaSummaries(summaries);
  };

  const handleRefresh = () => {
    loadProjects();
  };

  const handleSearch = useCallback(async (query) => {
    setSearchTerm(query);
    setIsSearching(true);
    setError('');

    try {
      if (query.trim()) {
        const searchResults = await projectService.searchProjects(query);
        const filteredResults = filterOutSoldProjects(searchResults);
        setProjects(filteredResults);
      } else {
        // If search is cleared, reload all projects or apply active filters
        if (Object.keys(activeFilters).length > 0 && Object.values(activeFilters).some(v => v !== '')) {
          await handleFilter(activeFilters);
        } else {
          loadProjects();
        }
      }
    } catch (err) {
      setError(err.message || 'Arama sırasında bir hata oluştu');
      console.error('Search error:', err);
    } finally {
      setIsSearching(false);
    }
  }, [activeFilters]);

  const handleFilter = useCallback(async (filters) => {
    setActiveFilters(filters);
    setIsFiltering(true);
    setError('');

    try {
      // Check if any filter has a value
      const hasActiveFilters = Object.values(filters).some(value => value !== '');

      if (hasActiveFilters) {
        const filterResults = await projectService.filterProjects(filters);
        const filteredResults = filterOutSoldProjects(filterResults);
        setProjects(filteredResults);
      } else {
        // If no filters, load all projects
        loadProjects();
      }
    } catch (err) {
      setError(err.message || 'Filtreleme sırasında bir hata oluştu');
      console.error('Filter error:', err);
    } finally {
      setIsFiltering(false);
    }
  }, []);

  const handleClearFilters = () => {
    setActiveFilters({});
    setSearchTerm('');
    loadProjects();
  };

  const handleInfoClick = (service) => {
    setSelectedService(service);
    setIsModalOpen(true);
  };

  const handleEditClick = async (service) => {
    try {
      setEditingProjectId(service.id);
      // Fetch full project details from API
      const fullProjectData = await projectService.getProjectById(service.id);
      setSelectedService(fullProjectData);
      setIsEditModalOpen(true);
    } catch (error) {
      console.error('Error fetching project details:', error);
      alert(`Proje detayları yüklenirken bir hata oluştu: ${error.message}`);
    } finally {
      setEditingProjectId(null);
    }
  };

  const handleCostDetailClick = (service) => {
    setSelectedService(service);
    setIsProfitModalOpen(true);
  };

  const handleViewProposalsClick = (service) => {
    setSelectedService(service);
    setIsProposalsModalOpen(true);
  };

  const handleSellProposal = (service) => {
    // Update the project status to 'Satıldı' (Sold)
    const updatedProjects = projects.map(p =>
      p.id === service.id ? { ...p, status: 'Satıldı' } : p
    );
    setProjects(updatedProjects);
  };

  const handleDeleteProject = async (projectId) => {
    if (window.confirm('Bu projeyi silmek istediğinizden emin misiniz?')) {
      try {
        await projectService.deleteProject(projectId);
        // Refresh the projects list after successful deletion
        loadProjects();
        alert('Proje başarıyla silindi!');
      } catch (error) {
        console.error('Delete project error:', error);
        alert(`Proje silinirken bir hata oluştu: ${error.message}`);
      }
    }
  };

  const handleSubmitOffer = (service) => {
    setSelectedService(service);
    setIsSendOfferModalOpen(true);
  };

  const handleEditSaveComplete = (updatedProject) => {
    // Refresh the projects list after successful update
    loadProjects();
  };

  const handleViewOffersClick = (service) => {
    setSelectedService(service);
    setSelectedProjectForOffers(service); // Store the project separately for ViewOfferModal
    setIsViewOfferModalOpen(true);
  };

  const handleCreateSaleClick = (offer) => {
    // Store the offer for CreateSaleModal
    // Keep selectedProjectForOffers unchanged so ViewOfferModal keeps the correct projectId
    setSelectedService(offer);
    setIsCreateSaleModalOpen(true);
  };

  const handleSaleClose = () => {
    // Only close CreateSaleModal, keep ViewOfferModal open
    setIsCreateSaleModalOpen(false);
    // Restore selectedService to the original project so ViewOfferModal doesn't break
    if (selectedProjectForOffers) {
      setSelectedService(selectedProjectForOffers);
    }
  };

  const handleSaleComplete = () => {
    // Close both CreateSaleModal and ViewOfferModal
    setIsCreateSaleModalOpen(false);
    setIsViewOfferModalOpen(false);
    setSelectedProjectForOffers(null);
    // Refresh the projects list after successful sale
    loadProjects();
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'Gönderildi':
        return 'status-sent';
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

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Helper function to remove parentheses and their contents from title
  const cleanTitle = (title) => {
    if (!title || title === 'N/A') return title;
    return title.replace(/\s*\([^)]*\)\s*/g, '').trim();
  };

  // Calculate and set column widths based on content
  useEffect(() => {
    // Skip column width calculations on narrow screens (including resized desktop windows)
    const isNarrowScreen = window.innerWidth <= 1100;
    if (!tableRef.current || projects.length === 0 || isNarrowScreen) {
      // Clear any previously set inline styles when screen is narrow
      if (tableRef.current && isNarrowScreen) {
        const table = tableRef.current;
        const headerCells = table.querySelectorAll('thead th');
        const bodyRows = table.querySelectorAll('tbody tr');

        headerCells.forEach(th => {
          th.style.width = '';
          th.style.minWidth = '';
          th.style.maxWidth = '';
        });

        bodyRows.forEach(row => {
          Array.from(row.children).forEach(cell => {
            cell.style.width = '';
            cell.style.minWidth = '';
            cell.style.maxWidth = '';
          });
        });
      }
      return;
    }

    // Wait for DOM to be fully rendered
    const timeoutId = setTimeout(() => {
      const table = tableRef.current;
      if (!table) return;

      const tableContainer = table.closest('.services-table-container');
      if (!tableContainer) return;

      const containerMaxWidth = tableContainer.offsetWidth || 1400;

      // Don't calculate widths if container is too narrow - let CSS handle it
      if (containerMaxWidth < 950) {
        // Clear any inline styles
        const headerCells = table.querySelectorAll('thead th');
        const bodyRows = table.querySelectorAll('tbody tr');

        headerCells.forEach(th => {
          th.style.width = '';
          th.style.minWidth = '';
          th.style.maxWidth = '';
        });

        bodyRows.forEach(row => {
          Array.from(row.children).forEach(cell => {
            cell.style.width = '';
            cell.style.minWidth = '';
            cell.style.maxWidth = '';
          });
        });
        return;
      }

      // Define max widths for each column (in pixels)
      const maxWidths = {
        'PROJE KODU': 200,
        'MAKİNE MARKASI': 300,
        'MAKİNE MODELİ': 300,
        'MAKİNE YILI': 150,
        'TEKLİF/PROFORMA': 200,
        'İŞLEMLER': 350,
        'SİL': 140
      };

      // Get all header cells
      const headerCells = table.querySelectorAll('thead th');
      const columnWidths = [];

      // Create a temporary measure element with same styles as table cells
      const measureElement = document.createElement('div');
      measureElement.style.position = 'absolute';
      measureElement.style.visibility = 'hidden';
      measureElement.style.height = 'auto';
      measureElement.style.width = 'auto';
      measureElement.style.whiteSpace = 'nowrap';
      measureElement.style.top = '-9999px';
      measureElement.style.left = '-9999px';

      const sampleTh = headerCells[0];
      const thStyle = window.getComputedStyle(sampleTh);
      measureElement.style.fontSize = thStyle.fontSize;
      measureElement.style.fontFamily = thStyle.fontFamily;
      measureElement.style.fontWeight = thStyle.fontWeight;
      measureElement.style.padding = '16px 20px';
      measureElement.style.boxSizing = 'border-box';

      document.body.appendChild(measureElement);

      // Calculate width for each column
      headerCells.forEach((th, index) => {
        const columnName = th.textContent.trim();
        let maxContentWidth = 0;

        // Measure header width
        measureElement.textContent = columnName;
        maxContentWidth = Math.max(maxContentWidth, measureElement.scrollWidth);

        // Measure all cell widths in this column
        const rows = table.querySelectorAll('tbody tr');
        rows.forEach(row => {
          const cell = row.children[index];
          if (cell) {
            // For operation buttons column, use a fixed measurement based on button container
            if (columnName === 'İŞLEMLER') {
              const buttonContainer = cell.querySelector('.operation-buttons');
              if (buttonContainer) {
                maxContentWidth = Math.max(maxContentWidth, buttonContainer.scrollWidth + 40);
              } else {
                maxContentWidth = Math.max(maxContentWidth, 330);
              }
            } else if (columnName === 'SİL') {
              const deleteButton = cell.querySelector('.delete-btn');
              if (deleteButton) {
                maxContentWidth = Math.max(maxContentWidth, deleteButton.offsetWidth + 40);
              } else {
                maxContentWidth = Math.max(maxContentWidth, 120);
              }
            } else {
              const cellText = cell.textContent.trim();
              if (cellText) {
                measureElement.textContent = cellText;
                maxContentWidth = Math.max(maxContentWidth, measureElement.scrollWidth);
              }
            }
          }
        });

        // Apply max width constraint
        const maxWidth = maxWidths[columnName] || 300;
        const calculatedWidth = Math.min(maxContentWidth, maxWidth);
        columnWidths.push(calculatedWidth);
      });

      // Clean up measure element
      document.body.removeChild(measureElement);

      // Check if total width exceeds container and scale down proportionally if needed
      const totalWidth = columnWidths.reduce((sum, width) => sum + width, 0);

      // Minimum widths to ensure usability (especially for operations column)
      const minWidths = {
        'PROJE KODU': 100,
        'MAKİNE MARKASI': 150,
        'MAKİNE MODELİ': 150,
        'MAKİNE YILI': 100,
        'TEKLİF/PROFORMA': 120,
        'İŞLEMLER': 300,
        'SİL': 100
      };

      let finalColumnWidths = [...columnWidths];

      if (totalWidth > containerMaxWidth) {
        // Scale down, but ensure minimum widths are maintained
        const headerNames = Array.from(headerCells).map(th => th.textContent.trim());
        const operationsIndex = headerNames.indexOf('İŞLEMLER');
        const deleteIndex = headerNames.indexOf('SİL');
        const operationsMinWidth = operationsIndex >= 0 ? minWidths['İŞLEMLER'] : 0;
        const deleteMinWidth = deleteIndex >= 0 ? minWidths['SİL'] : 0;
        const otherColumnsWidth = columnWidths
          .map((width, idx) => (idx === operationsIndex || idx === deleteIndex) ? 0 : width)
          .reduce((sum, width) => sum + width, 0);

        const availableWidthForOthers = containerMaxWidth - operationsMinWidth - deleteMinWidth;

        if (availableWidthForOthers > 0 && otherColumnsWidth > 0) {
          const scaleFactor = availableWidthForOthers / otherColumnsWidth;
          finalColumnWidths = columnWidths.map((width, index) => {
            if (index === operationsIndex) {
              return operationsMinWidth;
            }
            if (index === deleteIndex) {
              return deleteMinWidth;
            }
            return Math.floor(width * scaleFactor);
          });
        } else {
          // If we can't fit even with minimums, use proportional scaling
          const scaleFactor = containerMaxWidth / totalWidth;
          finalColumnWidths = columnWidths.map((width, index) => {
            if (index === operationsIndex) {
              return operationsMinWidth;
            }
            if (index === deleteIndex) {
              return deleteMinWidth;
            }
            return Math.floor(width * scaleFactor);
          });
        }
      }

      // Apply calculated widths to header and body cells
      headerCells.forEach((th, index) => {
        const finalWidth = finalColumnWidths[index];
        if (finalWidth) {
          th.style.width = `${finalWidth}px`;
          th.style.minWidth = `${finalWidth}px`;
          th.style.maxWidth = `${finalWidth}px`;
          // Preserve center alignment for machine brand header
          if (th.classList.contains('machine-brand-header')) {
            th.style.textAlign = 'center';
          }
        }
      });

      const bodyRows = table.querySelectorAll('tbody tr');
      bodyRows.forEach(row => {
        Array.from(row.children).forEach((cell, index) => {
          const finalWidth = finalColumnWidths[index];
          if (finalWidth) {
            cell.style.width = `${finalWidth}px`;
            cell.style.minWidth = `${finalWidth}px`;
            cell.style.maxWidth = `${finalWidth}px`;
            // Preserve center alignment for machine brand cells
            if (cell.classList.contains('machine-brand')) {
              cell.style.textAlign = 'center';
            }
          }
        });
      });
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [projects, loading, isSearching, isFiltering]);

  // Add resize listener to handle window resizing
  useEffect(() => {
    const handleResize = () => {
      if (tableRef.current && window.innerWidth <= 1100) {
        const table = tableRef.current;
        const headerCells = table.querySelectorAll('thead th');
        const bodyRows = table.querySelectorAll('tbody tr');

        headerCells.forEach(th => {
          th.style.width = '';
          th.style.minWidth = '';
          th.style.maxWidth = '';
        });

        bodyRows.forEach(row => {
          Array.from(row.children).forEach(cell => {
            cell.style.width = '';
            cell.style.minWidth = '';
            cell.style.maxWidth = '';
          });
        });
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);


  return (
    <div className="all-services">
      <div className="services-header">
        <div className="header-content">
          <div className="header-text">
            <h1>Aktif Projeler</h1>
            <p>Tüm makine projelerinizi buradan görüntüleyebilir ve yönetebilirsiniz.</p>
          </div>

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

      {error && (
        <div className="error-message">
          <p>{error}</p>
          <button onClick={handleRefresh} className="retry-button">
            Tekrar Dene
          </button>
        </div>
      )}

      <div className="services-table-container">
        {loading || isSearching || isFiltering ? (
          <div className="page-loading">
            <AiOutlineLoading3Quarters className="page-loading-spinner" />
            <p>
              {isSearching ? 'Aranıyor...' :
                isFiltering ? 'Filtreleniyor...' :
                  'Projeler yükleniyor...'}
            </p>
          </div>
        ) : projects.length === 0 ? (
          <div className="empty-state">
            <p>
              {searchTerm || Object.values(activeFilters).some(v => v !== '')
                ? 'Arama kriterlerinize uygun proje bulunamadı.'
                : 'Henüz proje bulunmuyor.'}
            </p>
          </div>
        ) : (
          <table className="services-table" ref={tableRef}>
            <thead>
              <tr>
                <th>PROJE KODU</th>
                <th className="machine-brand-header">MAKİNE MARKASI</th>
                <th>MAKİNE MODELİ</th>
                <th>MAKİNE YILI</th>
                <th>TEKLİF/PROFORMA</th>
                <th>İŞLEMLER</th>
                {canDelete() && <th>SİL</th>}
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => {
                const n = normalizeProjectCard(project);
                return (
                <tr key={project.id} className="service-row">
                  <td className="form-number">{n.projectCode}</td>
                  <td className="device-name machine-brand">{cleanTitle(n.machineName) || 'Belirtilmemiş'}</td>
                  <td className="device-name">{n.model}</td>
                  <td className="start-date">{n.year ?? '-'}</td>
                  <td className="offer-proforma-status" onClick={() => {
                    const summary = offerProformaSummaries[project.id];
                    if (summary && summary.summaryText !== '-') {
                      setDetailModalProjectId(project.id);
                      setIsDetailModalOpen(true);
                    }
                  }} style={{ cursor: offerProformaSummaries[project.id]?.summaryText !== '-' ? 'pointer' : 'default' }}>
                    <span className={`status-text ${offerProformaSummaries[project.id]?.summaryText !== '-' ? 'clickable' : ''}`}>
                      {offerProformaSummaries[project.id]?.summaryText || '-'}
                    </span>
                  </td>
                  <td className="operations">
                    <div className="operation-buttons">
                      <button
                        className="operation-btn info-btn-enhanced"
                        onClick={() => handleInfoClick(project)}
                        title="Bilgi"
                      >
                        <AiOutlineInfoCircle />
                      </button>
                      <button
                        className="operation-btn view-btn-enhanced"
                        onClick={() => handleViewOffersClick(project)}
                        title="Teklifleri Görüntüle"
                      >
                        <AiOutlineEye />
                      </button>
                      <button
                        className="operation-btn cost-btn-enhanced"
                        onClick={() => handleCostDetailClick(project)}
                        title="Maliyet"
                      >
                        <AiOutlineEuro />
                      </button>
                      {canSubmitOffer() && (
                        <button
                          className="operation-btn submit-btn-enhanced"
                          onClick={() => handleSubmitOffer(project)}
                          title="Teklif Gönder"
                        >
                          <FaPaperPlane />
                        </button>
                      )}
                      {canEdit() && (
                        <button
                          className="operation-btn edit-btn"
                          onClick={() => handleEditClick(project)}
                          title="Düzenle"
                          disabled={editingProjectId === project.id}
                        >
                          {editingProjectId === project.id ? (
                            <div className="loading-spinner-small"></div>
                          ) : (
                            <AiOutlineEdit />
                          )}
                        </button>
                      )}
                    </div>
                  </td>
                  {canDelete() && (
                    <td className="delete-column">
                      <div className="delete-button-wrapper">
                        <button
                          className="operation-btn delete-btn"
                          onClick={() => handleDeleteProject(project.id)}
                          title="Sil"
                        >
                          <AiOutlineDelete />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              );
              })}
            </tbody>
          </table>
        )}
      </div>

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
        />
      )}

      {isProposalsModalOpen && selectedService && (
        <ViewProposalsModal
          service={selectedService}
          onClose={() => setIsProposalsModalOpen(false)}
          onSell={handleSellProposal}
        />
      )}

      {isSendOfferModalOpen && selectedService && (
        <SendOfferModal
          service={selectedService}
          onClose={() => setIsSendOfferModalOpen(false)}
        />
      )}

      {isEditModalOpen && selectedService && (
        <EditProjectModal
          project={selectedService}
          onClose={() => setIsEditModalOpen(false)}
          onSaveComplete={handleEditSaveComplete}
        />
      )}

      {isViewOfferModalOpen && selectedProjectForOffers && (
        <ViewOfferModal
          isOpen={isViewOfferModalOpen}
          onClose={() => {
            setIsViewOfferModalOpen(false);
            setSelectedProjectForOffers(null);
          }}
          projectId={selectedProjectForOffers.id}
          projectCode={selectedProjectForOffers.projectCode}
          onCreateSale={handleCreateSaleClick}
        />
      )}

      {isCreateSaleModalOpen && selectedService && (
        <CreateSaleModal
          offer={selectedService}
          onClose={handleSaleClose}
          onSaleComplete={handleSaleComplete}
        />
      )}

      {isDetailModalOpen && detailModalProjectId && (
        <OfferProformaDetailModal
          projectId={detailModalProjectId}
          summary={offerProformaSummaries[detailModalProjectId]}
          onClose={() => {
            setIsDetailModalOpen(false);
            setDetailModalProjectId(null);
          }}
        />
      )}
    </div>
  );
};

export default AllServices;
