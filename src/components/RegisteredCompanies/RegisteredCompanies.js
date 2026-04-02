import React, { useState, useEffect } from 'react';
import clientService from '../../services/clientService';
import { formatPhoneDisplayOrDash } from '../../utils/phoneFormat';
import { useAuth } from '../../contexts/AuthContext';
import {
  AiOutlineReload,
  AiOutlineHome,
  AiOutlineUser,
  AiOutlineMail,
  AiOutlinePhone,
  AiOutlineFileText,
  AiOutlineEdit,
  AiOutlineIdcard,
  AiOutlinePlus,
  AiOutlineFileExcel,
  AiOutlineLoading3Quarters
} from 'react-icons/ai';
import ViewOfferModal from './ViewOfferModal';
import EditCompanyModal from './EditCompanyModal';
import AddCompanyModal from './AddCompanyModal';
import Pagination from '../shared/Pagination';
import './RegisteredCompanies.css';

const RegisteredCompanies = () => {
  const { canAddCompany, canExportData } = useAuth();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedClient, setSelectedClient] = useState(null);
  const [isViewOfferModalOpen, setIsViewOfferModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(() => {
    try {
      return parseInt(localStorage.getItem('registeredCompanies_pageSize') || '25', 10);
    } catch { return 25; }
  });

  useEffect(() => {
    loadClients();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const loadClients = async () => {
    try {
      setLoading(true);
      setError('');
      const clientsData = await clientService.getClients();
      setClients(clientsData);
    } catch (err) {
      console.error('Error loading clients:', err);
      setError(err.message || 'Müşteriler yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    loadClients();
  };

  const handleViewOffers = (client) => {
    setSelectedClient(client);
    setIsViewOfferModalOpen(true);
  };

  const handleCloseViewOfferModal = () => {
    setIsViewOfferModalOpen(false);
    setSelectedClient(null);
  };

  const handleEditCompany = (client) => {
    setEditingClient(client);
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setEditingClient(null);
  };

  const handleEditSuccess = () => {
    loadClients();
  };

  const handleAddCompany = () => {
    setIsAddModalOpen(true);
  };

  const handleCloseAddModal = () => {
    setIsAddModalOpen(false);
  };

  const handleAddSuccess = () => {
    loadClients();
  };

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
  };

  const handleExportToExcel = async () => {
    try {
      await clientService.exportClientsToExcel();
    } catch (err) {
      console.error('Error exporting to Excel:', err);
      alert('Excel dışa aktarma sırasında bir hata oluştu. Lütfen tekrar deneyin.');
    }
  };

  const normalizedSearchTerm = searchTerm.trim().toLowerCase();
  const filteredClients = clients.filter((client) => {
    if (!normalizedSearchTerm) {
      return true;
    }

    const fieldsToSearch = [
      client.companyName,
      client.contactName,
      client.email,
      client.phone,
      client.businessPhone,
      client.vergiDairesi,
      client.vergiNo
    ];

    return fieldsToSearch
      .filter(Boolean)
      .some((field) => String(field).toLowerCase().includes(normalizedSearchTerm));
  });

  const totalPages = Math.ceil(filteredClients.length / itemsPerPage);
  const startIdx = (currentPage - 1) * itemsPerPage;
  const paginatedClients = filteredClients.slice(startIdx, startIdx + itemsPerPage);

  if (loading) {
    return (
      <div className="registered-companies">
        <div className="page-loading">
          <AiOutlineLoading3Quarters className="page-loading-spinner" />
          <p>Müşteriler yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="registered-companies">
        <div className="error-container">
          <h2>Hata</h2>
          <p>{error}</p>
          <button onClick={handleRefresh} className="retry-button">
            <AiOutlineReload className="icon" />
            Tekrar Dene
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="registered-companies">
      <div className="companies-header">
        <div className="header-content">
          <div className="header-text">
            <h1>Kayıtlı Firmalar</h1>
            <p>Kayıtlı müşteri firmalarının listesi</p>
            {canAddCompany() && (
              <button
                className="add-company-button"
                onClick={handleAddCompany}
              >
                <AiOutlinePlus className="button-icon" />
                Firma Ekle
              </button>
            )}
            <div className="search-export-row">
              <div className="company-search">
                <input
                  type="text"
                  className="company-search-input"
                  placeholder="Firmalarda ara... (firma, iletişim kişisi, e-posta, telefon)"
                  value={searchTerm}
                  onChange={handleSearchChange}
                />
              </div>
              {canExportData() && (
                <button
                  className="export-excel-button"
                  onClick={handleExportToExcel}
                >
                  <AiOutlineFileExcel className="button-icon" />
                  Excel ile Dışa Aktar
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="companies-content">
        {clients.length === 0 ? (
          <div className="empty-state">
            <AiOutlineHome className="empty-icon" />
            <h3>Henüz kayıtlı firma bulunmuyor</h3>
            <p>Kayıtlı müşteri firmaları burada görüntülenecek.</p>
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="empty-state">
            <AiOutlineHome className="empty-icon" />
            <h3>Arama kriterlerinize uygun firma bulunamadı</h3>
            <p>Farklı bir anahtar kelime deneyerek tekrar arama yapabilirsiniz.</p>
          </div>
        ) : (
          <>
          <div className="companies-toolbar">
            <Pagination
              inline
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredClients.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={(v) => {
                setItemsPerPage(v);
                setCurrentPage(1);
                try { localStorage.setItem('registeredCompanies_pageSize', String(v)); } catch (_) {}
              }}
              storageKey="registeredCompanies_pageSize"
              label="firma"
            />
          </div>
          <div className="companies-grid">
            {paginatedClients.map((client) => (
              <div key={client.id} className="company-card">
                <div className="company-header">
                  <AiOutlineHome className="company-icon" />
                  <h3 className="company-name">{client.companyName}</h3>
                </div>

                <div className="company-details">
                  <div className="detail-item">
                    <AiOutlineUser className="detail-icon" />
                    <div className="detail-content">
                      <span className="detail-label">İletişim Kişisi</span>
                      <span className="detail-value">{client.contactName}</span>
                    </div>
                  </div>

                  <div className="detail-item">
                    <AiOutlineMail className="detail-icon" />
                    <div className="detail-content">
                      <span className="detail-label">E-posta</span>
                      <span className="detail-value">{client.email}</span>
                    </div>
                  </div>

                  <div className="detail-item">
                    <AiOutlinePhone className="detail-icon" />
                    <div className="detail-content">
                      <span className="detail-label">Telefon</span>
                      <span className="detail-value">{formatPhoneDisplayOrDash(client.phone)}</span>
                    </div>
                  </div>

                  {client.businessPhone && (
                    <div className="detail-item">
                      <AiOutlinePhone className="detail-icon" />
                      <div className="detail-content">
                        <span className="detail-label">İş Telefonu</span>
                        <span className="detail-value">{formatPhoneDisplayOrDash(client.businessPhone)}</span>
                      </div>
                    </div>
                  )}

                  {client.vergiDairesi && (
                    <div className="detail-item">
                      <AiOutlineFileText className="detail-icon" />
                      <div className="detail-content">
                        <span className="detail-label">Vergi Dairesi</span>
                        <span className="detail-value">{client.vergiDairesi}</span>
                      </div>
                    </div>
                  )}

                  {client.vergiNo && (
                    <div className="detail-item">
                      <AiOutlineIdcard className="detail-icon" />
                      <div className="detail-content">
                        <span className="detail-label">Vergi No</span>
                        <span className="detail-value">{client.vergiNo}</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="company-actions">
                  <button
                    className="edit-button"
                    onClick={() => handleEditCompany(client)}
                  >
                    <AiOutlineEdit className="button-icon" />
                    Düzenle
                  </button>
                  <button
                    className="view-offer-button"
                    onClick={() => handleViewOffers(client)}
                  >
                    <AiOutlineFileText className="button-icon" />
                    Teklifleri Görüntüle
                  </button>
                </div>
              </div>
            ))}
          </div>
          </>
        )}
      </div>

      <ViewOfferModal
        isOpen={isViewOfferModalOpen}
        onClose={handleCloseViewOfferModal}
        clientId={selectedClient?.id}
        clientName={selectedClient?.companyName}
      />

      <EditCompanyModal
        isOpen={isEditModalOpen}
        onClose={handleCloseEditModal}
        client={editingClient}
        onSuccess={handleEditSuccess}
      />

      <AddCompanyModal
        isOpen={isAddModalOpen}
        onClose={handleCloseAddModal}
        onSuccess={handleAddSuccess}
      />
    </div>
  );
};

export default RegisteredCompanies;
