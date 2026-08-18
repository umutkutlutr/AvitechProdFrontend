import React, { useState, useEffect, useCallback } from 'react';
import SearchBar from '../ServiceReceipt/SearchBar';
import EditProjectModal from '../ServiceReceipt/EditProjectModal';
import SendOfferModal from '../ServiceReceipt/SendOfferModal';
import CreateProformaModal from '../ServiceReceipt/CreateProformaModal';
import projectService from '../../services/projectService';
import offerService from '../../services/offerService';
import { normalizeProjectCard, getProjectSearchText } from '../../utils/projectNormalizer';
import { useAuth } from '../../contexts/AuthContext';
import {
  AiOutlineEdit,
  AiOutlineDelete,
  AiOutlineLoading3Quarters,
  AiOutlineInbox
} from 'react-icons/ai';
import { FaPaperPlane, FaFileInvoice } from 'react-icons/fa';
import './PotentialMachines.css';

const PotentialMachines = () => {
  const { canEdit, canDelete, canSubmitOffer } = useAuth();
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingProjectId, setEditingProjectId] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [pullTarget, setPullTarget] = useState(null); // stoğa çekme onayı bekleyen makine
  const [isPulling, setIsPulling] = useState(false);
  const [sendOfferTarget, setSendOfferTarget] = useState(null); // SendOfferModal açık olan makine (AllServices ile aynı desen)
  const [proformaLoadingId, setProformaLoadingId] = useState(null); // proforma için teklifleri yüklenen makine
  const [proformaOfferChoices, setProformaOfferChoices] = useState(null); // çoklu teklif seçimi: { machine, offers }
  const [proformaOfferTarget, setProformaOfferTarget] = useState(null); // CreateProformaModal açık olan teklif

  const loadMachines = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const data = await projectService.getPotentialProjects();
      setMachines(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Potansiyel makineler yüklenirken bir hata oluştu');
      console.error('Error loading potential machines:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMachines();
  }, [loadMachines]);

  const handleSearch = useCallback((query) => {
    setSearchTerm(query);
  }, []);

  // Arama: kod / marka / model / yıl / seri no üzerinde istemci tarafında filtrelenir
  // (backend aramasi potansiyelleri hariç tuttuğu için liste kendi içinde aranır).
  const filteredMachines = machines.filter((m) => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return true;
    return getProjectSearchText(m).includes(q);
  });

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const handleEditClick = async (machine) => {
    try {
      setEditingProjectId(machine.id);
      // Fetch full project details from API (AllServices ile aynı desen)
      const fullProjectData = await projectService.getProjectById(machine.id);
      setSelectedProject(fullProjectData);
      setIsEditModalOpen(true);
    } catch (err) {
      console.error('Error fetching project details:', err);
      alert(`Proje detayları yüklenirken bir hata oluştu: ${err.message}`);
    } finally {
      setEditingProjectId(null);
    }
  };

  const handleEditSaveComplete = () => {
    loadMachines();
  };

  // Teklif seçim listesinde fiyat gösterimi (ViewOfferModal ile aynı biçim, EUR)
  const formatOfferPrice = (amount) => {
    const num = typeof amount === 'number' ? amount : parseFloat(amount);
    if (num == null || isNaN(num)) return 'Belirtilmemiş';
    return `€${num.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const handleSubmitOffer = (machine) => {
    // AllServices ile aynı desen: liste öğesi doğrudan SendOfferModal'a verilir
    setSendOfferTarget(machine);
  };

  const handleSendOfferClose = () => {
    setSendOfferTarget(null);
    // Gönderim başarısında modal otomatik kapanır; listeyi yenile
    // (makinenin durumu backend gereği POTANSİYEL kalır)
    loadMachines();
  };

  const handleProformaClick = async (machine) => {
    try {
      setProformaLoadingId(machine.id);
      // Proforma teklife bağlıdır: ViewOfferModal ile aynı desen — projenin teklifleri çekilir
      const offers = await offerService.getOffersByProject(machine.id);
      const list = Array.isArray(offers) ? offers : [];
      if (list.length === 0) {
        alert('Bu makine için henüz gönderilmiş teklif bulunmuyor. Proforma oluşturmak için önce teklif gönderin.');
      } else if (list.length === 1) {
        setProformaOfferTarget(list[0]);
      } else {
        setProformaOfferChoices({ machine, offers: list });
      }
    } catch (err) {
      console.error('Error loading offers for proforma:', err);
      alert(`Teklifler yüklenirken bir hata oluştu: ${err.message}`);
    } finally {
      setProformaLoadingId(null);
    }
  };

  const handleProformaComplete = () => {
    // ViewOfferModal ile aynı desen: kapat + listeyi yenile
    setProformaOfferTarget(null);
    loadMachines();
  };

  const handlePullToStockClick = (machine) => {
    setPullTarget(machine);
  };

  const handleConfirmPullToStock = async () => {
    if (!pullTarget || isPulling) return;
    setIsPulling(true);
    try {
      const result = await projectService.pullToStock(pullTarget.id);
      // Başarıda listeden düş
      setMachines((prev) => prev.filter((m) => m.id !== pullTarget.id));
      const oldCode = pullTarget.projectCode;
      const newCode = result && result.projectCode ? result.projectCode : 'AVMAK';
      setPullTarget(null);
      alert(`${oldCode} stoğa çekildi. Yeni proje kodu: ${newCode}. Makine artık "Aktif Projeler" sayfasında.`);
    } catch (err) {
      console.error('Pull to stock error:', err);
      alert(`Stoğa çekme sırasında bir hata oluştu: ${err.message}`);
    } finally {
      setIsPulling(false);
    }
  };

  const handleDeleteMachine = async (machine) => {
    if (window.confirm('Bu potansiyel makineyi silmek istediğinizden emin misiniz?')) {
      try {
        await projectService.deleteProject(machine.id);
        loadMachines();
        alert('Potansiyel makine başarıyla silindi!');
      } catch (err) {
        console.error('Delete potential machine error:', err);
        alert(`Makine silinirken bir hata oluştu: ${err.message}`);
      }
    }
  };

  return (
    <div className="potential-machines">
      <div className="pm-header">
        <div className="pm-header-text">
          <h1>Potansiyel Makineler</h1>
          <p>
            Henüz stoğa alınmamış aday makineler (PMAK kodlu). Teklif gönderebilirsiniz;
            satış ve muhasebe için önce makineyi stoğa çekin.
          </p>
        </div>
      </div>

      <SearchBar
        onSearch={handleSearch}
        placeholder="Potansiyel makinelerde ara... (proje kodu, marka, model, yıl, seri numarası)"
      />

      {error && (
        <div className="pm-error-message">
          <p>{error}</p>
          <button onClick={loadMachines} className="pm-retry-button">
            Tekrar Dene
          </button>
        </div>
      )}

      <div className="pm-table-container">
        {loading ? (
          <div className="pm-loading">
            <AiOutlineLoading3Quarters className="pm-loading-spinner" />
            <p>Potansiyel makineler yükleniyor...</p>
          </div>
        ) : filteredMachines.length === 0 ? (
          <div className="pm-empty-state">
            <p>
              {searchTerm.trim()
                ? 'Arama kriterlerinize uygun potansiyel makine bulunamadı.'
                : 'Henüz potansiyel makine yok.'}
            </p>
          </div>
        ) : (
          <table className="pm-table">
            <thead>
              <tr>
                <th>PROJE KODU</th>
                <th>MARKA</th>
                <th>MODEL</th>
                <th>YIL</th>
                <th>SERİ NO</th>
                <th>OLUŞTURULMA</th>
                <th>İŞLEMLER</th>
              </tr>
            </thead>
            <tbody>
              {filteredMachines.map((machine) => {
                const n = normalizeProjectCard(machine);
                return (
                  <tr key={machine.id} className="pm-row">
                    <td className="pm-code">{n.projectCode}</td>
                    <td>{n.make || n.machineName || '-'}</td>
                    <td>{n.model || '-'}</td>
                    <td>{n.year ?? '-'}</td>
                    <td>{n.serialNumber || '-'}</td>
                    <td>{formatDate(machine.createdAt)}</td>
                    <td>
                      <div className="pm-actions">
                        {canEdit() && (
                          <button
                            className="pm-btn pm-btn-edit"
                            onClick={() => handleEditClick(machine)}
                            title="Düzenle"
                            disabled={editingProjectId === machine.id}
                          >
                            {editingProjectId === machine.id ? (
                              <AiOutlineLoading3Quarters className="pm-btn-spinner" />
                            ) : (
                              <AiOutlineEdit />
                            )}
                            <span>Düzenle</span>
                          </button>
                        )}
                        <button
                          className="pm-btn pm-btn-stock"
                          onClick={() => handlePullToStockClick(machine)}
                          title="Stoğa Çek"
                        >
                          <AiOutlineInbox />
                          <span>Stoğa Çek</span>
                        </button>
                        {canSubmitOffer() && (
                          <>
                            <button
                              className="operation-btn submit-btn-enhanced"
                              onClick={() => handleSubmitOffer(machine)}
                              title="Teklif Gönder"
                            >
                              <FaPaperPlane />
                            </button>
                            <button
                              className="operation-btn pm-proforma-btn"
                              onClick={() => handleProformaClick(machine)}
                              title="Proforma Oluştur"
                              disabled={proformaLoadingId === machine.id}
                            >
                              {proformaLoadingId === machine.id ? (
                                <AiOutlineLoading3Quarters className="pm-btn-spinner" />
                              ) : (
                                <FaFileInvoice />
                              )}
                            </button>
                          </>
                        )}
                        {canDelete() && (
                          <button
                            className="pm-btn pm-btn-delete"
                            onClick={() => handleDeleteMachine(machine)}
                            title="Sil"
                          >
                            <AiOutlineDelete />
                            <span>Sil</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {isEditModalOpen && selectedProject && (
        <EditProjectModal
          project={selectedProject}
          onClose={() => setIsEditModalOpen(false)}
          onSaveComplete={handleEditSaveComplete}
        />
      )}

      {pullTarget && (
        <div className="pm-modal-overlay" onClick={() => !isPulling && setPullTarget(null)}>
          <div className="pm-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Stoğa Çek</h3>
            <p>
              {pullTarget.projectCode} stoğa çekilecek ve sıradaki AVMAK kodunu alacak. Devam?
            </p>
            <div className="pm-modal-actions">
              <button
                className="pm-modal-cancel"
                onClick={() => setPullTarget(null)}
                disabled={isPulling}
              >
                Vazgeç
              </button>
              <button
                className="pm-modal-confirm"
                onClick={handleConfirmPullToStock}
                disabled={isPulling}
              >
                {isPulling ? 'Stoğa çekiliyor...' : 'Stoğa Çek'}
              </button>
            </div>
          </div>
        </div>
      )}

      {sendOfferTarget && (
        <SendOfferModal
          service={sendOfferTarget}
          onClose={handleSendOfferClose}
        />
      )}

      {proformaOfferChoices && (
        <div className="pm-modal-overlay" onClick={() => setProformaOfferChoices(null)}>
          <div className="pm-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Proforma İçin Teklif Seçin</h3>
            <p>
              {proformaOfferChoices.machine.projectCode} için birden fazla teklif gönderilmiş.
              Proformanın oluşturulacağı teklifi seçin:
            </p>
            <div className="pm-offer-choice-list">
              {proformaOfferChoices.offers.map((offer) => (
                <button
                  key={offer.id}
                  type="button"
                  className="pm-offer-choice"
                  onClick={() => {
                    setProformaOfferChoices(null);
                    setProformaOfferTarget(offer);
                  }}
                >
                  <span className="pm-offer-choice-client">{offer.clientCompanyName || 'Müşteri belirtilmemiş'}</span>
                  <span className="pm-offer-choice-meta">
                    {formatOfferPrice(offer.price)} &middot; {formatDate(offer.sentAt)}
                  </span>
                </button>
              ))}
            </div>
            <div className="pm-modal-actions">
              <button className="pm-modal-cancel" onClick={() => setProformaOfferChoices(null)}>
                Vazgeç
              </button>
            </div>
          </div>
        </div>
      )}

      {proformaOfferTarget && (
        <CreateProformaModal
          offer={proformaOfferTarget}
          onClose={() => setProformaOfferTarget(null)}
          onProformaComplete={handleProformaComplete}
        />
      )}
    </div>
  );
};

export default PotentialMachines;
