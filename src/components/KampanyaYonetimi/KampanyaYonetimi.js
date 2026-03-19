import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import projectService from '../../services/projectService';
import clientService from '../../services/clientService';
import campaignService from '../../services/campaignService';
import {
  AiOutlinePlus,
  AiOutlineSearch,
  AiOutlineReload,
  AiOutlineRight,
  AiOutlineSend,
  AiOutlineCheckCircle,
  AiOutlineWarning,
  AiOutlineTeam,
  AiOutlineClose,
  AiOutlineEye,
  AiOutlineEdit,
  AiOutlineCalendar,
  AiOutlineInfoCircle,
  AiOutlineArrowLeft,
  AiOutlineArrowRight,
  AiOutlineLoading3Quarters,
  AiOutlineDownload,
} from 'react-icons/ai';
import { normalizeProjectCard, getProjectSearchText } from '../../utils/projectNormalizer';
import './KampanyaYonetimi.css';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, label: 'Tanıtım Detayları' },
  { id: 2, label: 'Makine Seçimi' },
  { id: 3, label: 'Önizleme & Gönderim' },
];

const emptyForm = () => ({
  name: '',
  customerSelection: 'all',
  selectedCustomers: [],
  selectedMachines: [],
  description: '',
  emailSubject: '',
  emailBody: '',
});

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  try {
    return new Date(dateStr).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return dateStr;
  }
};

// ─── Campaign list item ───────────────────────────────────────────────────────

const CampaignCard = ({ campaign, onView }) => (
  <div className="campaign-card">
    <div className="campaign-card-header">
      <div>
        <span className="campaign-id">{campaign.id ? `#${campaign.id}` : `TNTM-${String(campaign.campaignId || '').padStart(3, '0')}`}</span>
        <h3 className="campaign-name">{campaign.name}</h3>
      </div>
      <span className={`campaign-status-badge ${(campaign.isSent ?? campaign.sentAt) ? 'sent' : 'draft'}`}>
        {(campaign.isSent ?? campaign.sentAt) ? 'Gönderildi' : 'Taslak'}
      </span>
    </div>
    {campaign.description && (
      <p className="campaign-description">{campaign.description}</p>
    )}
    <div className="campaign-meta">
      <span><AiOutlineCalendar /> {campaign.createdDate || formatDate(campaign.createdAt)}</span>
      <span><AiOutlineTeam /> {campaign.recipientCount != null ? `${campaign.recipientCount} Alıcı` : (campaign.customerSelection === 'all' ? 'Tüm Müşteriler' : `${(campaign.selectedCustomers || []).length} Müşteri`)}</span>
      <span className="campaign-machine-count">{campaign.machineCount ?? (campaign.selectedMachines || []).length} Makine</span>
    </div>
    <div className="campaign-card-footer">
      <button className="btn-view-campaign" onClick={() => onView(campaign)}>
        <AiOutlineEye /> Detaylar
      </button>
    </div>
  </div>
);

// ─── Email preview template ───────────────────────────────────────────────────

const EmailPreview = ({ campaign, machines, customers, emailSubject, emailBody }) => {
  const recipientCustomers = campaign.customerSelection === 'all' ? customers : customers.filter(c => (campaign.selectedCustomers || []).includes(String(c.id)));
  const selectedMachineObjects = (campaign.selectedMachines || []).map(id => machines.find(p => String(p.id) === String(id))).filter(Boolean);

  return (
    <div className="email-preview">
      <div className="email-preview-header">
        <div className="email-from">
          <strong>Gönderen:</strong> Avitech &lt;info@avitech.com.tr&gt;
        </div>
        <div className="email-to">
          <strong>Alıcılar:</strong> {recipientCustomers.length > 0 ? recipientCustomers.map(c => c.name || c.companyName || 'İsim yok').slice(0, 3).join(', ') + (recipientCustomers.length > 3 ? ` +${recipientCustomers.length - 3} kişi` : '') : 'Müşteri seçilmedi'}
        </div>
        <div className="email-subject">
          <strong>Konu:</strong> {emailSubject || `Stok Tanıtımı — ${campaign.name || 'Yeni Tanıtım'}`}
        </div>
      </div>
      <div className="email-preview-body">
        {emailBody ? (
          <pre className="email-body-custom">{emailBody}</pre>
        ) : (
          <div className="email-body-auto">
            <p>Sayın Müşterimiz,</p>
            <p>Stokumuzdaki makineleri sizinle paylaşmaktan memnuniyet duyarız:</p>
            <table className="email-machine-table">
              <thead>
                <tr>
                  <th>Makine Adı</th>
                  <th>Marka / Model</th>
                  <th>Seri No</th>
                  <th>Yıl</th>
                </tr>
              </thead>
              <tbody>
                {selectedMachineObjects.length === 0 ? (
                  <tr><td colSpan="4" style={{ textAlign: 'center', color: '#9ca3af' }}>Makine seçilmedi</td></tr>
                ) : (
                  selectedMachineObjects.map(m => (
                    <tr key={m.id}>
                      <td>{m.machineName || m.name || '-'}</td>
                      <td>{m.machineMake || m.brand || ''} {m.machineModel || m.machineType || ''}</td>
                      <td style={{ fontFamily: 'monospace' }}>{m.serialNumber || m.serialNo || '-'}</td>
                      <td>{m.machineYear || m.year || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            <p>Detaylı bilgi için bizimle iletişime geçebilirsiniz.</p>
            <p>Saygılarımızla,<br /><strong>Avitech Ekibi</strong></p>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Campaign Details Modal ───────────────────────────────────────────────────

const CampaignDetailsModal = ({ campaign, machines, customers, onClose, onExport, exportLoading }) => {
  if (!campaign) return null;
  const hasApiData = Array.isArray(campaign.recipients) && Array.isArray(campaign.machines);
  const recipientList = hasApiData
    ? campaign.recipients
    : (campaign.customerSelection === 'all' ? customers : customers.filter(c => (campaign.selectedCustomers || []).includes(String(c.id))));
  const machineList = hasApiData
    ? campaign.machines
    : (campaign.selectedMachines || []).map(id => machines.find(p => String(p.id) === String(id))).filter(Boolean);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <span className="campaign-id">{campaign.id ? `#${campaign.id}` : campaign.id}</span>
            <h2 className="modal-title">{campaign.name}</h2>
          </div>
          <button className="modal-close-btn" onClick={onClose}><AiOutlineClose /></button>
        </div>
        <div className="modal-body">
          {campaign.description && (
            <div className="modal-section">
              <p className="modal-section-label">Açıklama</p>
              <p className="modal-text">{campaign.description}</p>
            </div>
          )}
          <div className="modal-section">
            <p className="modal-section-label">Alıcı Müşteriler ({recipientList.length})</p>
            <div className="tag-list">
              {recipientList.length === 0 ? <span className="tag-empty">Müşteri yok</span> : recipientList.map((c, idx) => (
                <span key={c.clientId ?? c.id ?? idx} className="tag">{c.companyName ?? c.name ?? 'İsim yok'}</span>
              ))}
            </div>
          </div>
          <div className="modal-section">
            <p className="modal-section-label">Seçili Makineler ({machineList.length})</p>
            <div className="tag-list">
              {machineList.length === 0 ? <span className="tag-empty">Makine yok</span> : machineList.map((m, idx) => (
                <span key={m.projectId ?? m.id ?? idx} className="tag">{m.make ?? m.machineMake ?? ''} {m.model ?? m.machineModel ?? m.machineType ?? ''} ({m.year ?? m.machineYear ?? '-'})</span>
              ))}
            </div>
          </div>
          <div className="modal-section">
            <p className="modal-section-label">Tarih</p>
            <p className="modal-text">{campaign.createdDate || formatDate(campaign.createdAt)}</p>
          </div>
        </div>
        <div className="modal-footer">
          {campaign.id && onExport && (
            <button className="btn-primary" onClick={() => onExport(campaign.id)} disabled={exportLoading}>
              {exportLoading ? <AiOutlineLoading3Quarters className="inline-loading-spinner" /> : <AiOutlineDownload />} Detay İndir
            </button>
          )}
          <button className="btn-secondary" onClick={onClose}>Kapat</button>
        </div>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const KampanyaYonetimi = () => {
  const { canEdit } = useAuth();

  const [projects, setProjects] = useState([]);
  const [clients, setClients] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState('');

  const [campaigns, setCampaigns] = useState([]);
  const [campaignsLoading, setCampaignsLoading] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  // New campaign wizard
  const [showWizard, setShowWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [campaignForm, setCampaignForm] = useState(emptyForm());
  const [machineSearch, setMachineSearch] = useState('');
  const [showEmailPreview, setShowEmailPreview] = useState(false);
  const [step3SummaryExpanded, setStep3SummaryExpanded] = useState(true);
  const [sendLoading, setSendLoading] = useState(false);
  const [sendSuccess, setSendSuccess] = useState('');
  const [sendError, setSendError] = useState('');

  // Load projects + clients + campaigns on mount
  useEffect(() => {
    const load = async () => {
      setDataLoading(true);
      setDataError('');
      try {
        const [projectsData, clientsData, campaignsData] = await Promise.all([
          projectService.getProjects(),
          clientService.getClients(),
          campaignService.getCampaigns(),
        ]);
        setProjects(projectsData);
        setClients(clientsData);
        setCampaigns(Array.isArray(campaignsData) ? campaignsData : []);
      } catch (err) {
        setDataError(err.message || 'Veriler yüklenirken hata oluştu');
      } finally {
        setDataLoading(false);
      }
    };
    load();
  }, []);

  // Only "active" (in stock) projects for machine selection - stoktaki makineler = SOLD ve CANCELLED olmayan projeler
  const stockProjects = useMemo(() =>
    projects
      .filter(p => {
        const s = (p.status || '').toUpperCase();
        return s !== 'SOLD' && s !== 'CANCELLED';
      })
      .map(p => normalizeProjectCard(p)),
    [projects]
  );

  const filteredMachines = useMemo(() => {
    if (!machineSearch.trim()) return stockProjects;
    const q = machineSearch.toLowerCase();
    return stockProjects.filter(p => getProjectSearchText(p).includes(q));
  }, [stockProjects, machineSearch]);

  // ── Wizard navigation ──
  const openWizard = () => {
    setCampaignForm(emptyForm());
    setWizardStep(1);
    setMachineSearch('');
    setShowEmailPreview(false);
    setStep3SummaryExpanded(true);
    setSendSuccess('');
    setSendError('');
    setShowWizard(true);
  };

  const closeWizard = () => setShowWizard(false);

  const nextStep = () => {
    if (wizardStep === 1) {
      if (!campaignForm.name.trim()) {
        setSendError('Tanıtım adı zorunludur.');
        return;
      }
      if (campaignForm.customerSelection === 'selected' && campaignForm.selectedCustomers.length === 0) {
        setSendError('En az bir müşteri seçmelisiniz.');
        return;
      }
      setSendError('');
    }
    if (wizardStep === 2) {
      if (campaignForm.selectedMachines.length === 0) {
        setSendError('En az bir makine seçmelisiniz.');
        return;
      }
      setSendError('');
    }
    setWizardStep(s => Math.min(s + 1, 3));
  };

  const prevStep = () => setWizardStep(s => Math.max(s - 1, 1));

  // ── Toggle machine selection ──
  const toggleMachine = (machineId) => {
    const id = String(machineId);
    setCampaignForm(prev => ({
      ...prev,
      selectedMachines: prev.selectedMachines.includes(id)
        ? prev.selectedMachines.filter(m => m !== id)
        : [...prev.selectedMachines, id],
    }));
  };

  const toggleCustomer = (clientId) => {
    const id = String(clientId);
    setCampaignForm(prev => ({
      ...prev,
      selectedCustomers: prev.selectedCustomers.includes(id)
        ? prev.selectedCustomers.filter(c => c !== id)
        : [...prev.selectedCustomers, id],
    }));
  };

  // ── Send ──
  const handleSend = async () => {
    setSendLoading(true);
    setSendError('');
    try {
      const newCampaign = await campaignService.createCampaign({
        name: campaignForm.name,
        customerSelection: campaignForm.customerSelection,
        selectedCustomers: campaignForm.selectedCustomers,
        selectedMachines: campaignForm.selectedMachines,
        description: campaignForm.description,
        emailSubject: campaignForm.emailSubject,
        emailBody: campaignForm.emailBody,
      });
      setCampaigns(prev => [newCampaign, ...prev]);
      setSendSuccess(`"${campaignForm.name}" başarıyla gönderildi!`);
      setShowWizard(false);
    } catch (err) {
      setSendError(err.message || 'Gönderim sırasında hata oluştu');
    } finally {
      setSendLoading(false);
    }
  };

  // ── View campaign details ──
  const handleViewCampaign = async (campaign) => {
    if (!campaign?.id) {
      setSelectedCampaign(campaign);
      setShowDetailsModal(true);
      return;
    }
    setCampaignsLoading(true);
    try {
      const detail = await campaignService.getCampaignById(campaign.id);
      setSelectedCampaign(detail);
      setShowDetailsModal(true);
    } catch (err) {
      setDataError(err.message || 'Kampanya detayı yüklenemedi');
    } finally {
      setCampaignsLoading(false);
    }
  };

  // ── Export campaign to Excel ──
  const handleExportCampaign = async (id) => {
    setExportLoading(true);
    try {
      await campaignService.exportCampaign(id);
    } catch (err) {
      setDataError(err.message || 'Excel indirilemedi');
    } finally {
      setExportLoading(false);
    }
  };

  // ── Computed values ──
  const recipientCustomers = useMemo(() => {
    if (campaignForm.customerSelection === 'all') return clients;
    return clients.filter(c => campaignForm.selectedCustomers.includes(String(c.id)));
  }, [campaignForm.customerSelection, campaignForm.selectedCustomers, clients]);

  const selectedMachineObjects = useMemo(() =>
    campaignForm.selectedMachines.map(id => stockProjects.find(p => String(p.id) === id)).filter(Boolean),
    [campaignForm.selectedMachines, stockProjects]
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="ky-container">
      {/* Page header */}
      <div className="ky-header">
        <div>
          <h1 className="ky-title">Stok Tanıtım Gönderimi</h1>
          <p className="ky-subtitle">Stoktaki makinelerinizi müşterilerinize e-posta ile tanıtın</p>
        </div>
        {canEdit() && (
          <button className="btn-primary" onClick={openWizard}>
            <AiOutlinePlus /> Yeni Tanıtım
          </button>
        )}
      </div>

      {/* Success / error banners */}
      {sendSuccess && (
        <div className="success-banner"><AiOutlineCheckCircle /> {sendSuccess}</div>
      )}
      {dataError && (
        <div className="error-banner"><AiOutlineWarning /> {dataError}</div>
      )}

      {/* Exchange rate info */}
      {!dataLoading && (
        <div className="info-banner">
          <AiOutlineInfoCircle />
          <span>
            Stokta <strong>{stockProjects.length}</strong> aktif makine, <strong>{clients.length}</strong> kayıtlı müşteri bulunuyor.
          </span>
        </div>
      )}

      {/* Campaign list */}
      {dataLoading && (
        <div className="page-loading">
          <AiOutlineLoading3Quarters className="page-loading-spinner" />
          <p>Veriler yükleniyor...</p>
        </div>
      )}

      {!dataLoading && campaigns.length === 0 && (
        <div className="empty-campaigns">
          <div className="empty-icon">📧</div>
          <h3>Henüz Tanıtım Gönderilmedi</h3>
          <p>Stoktaki makinelerinizi müşterilerinize tanıtmak için yeni bir tanıtım oluşturun.</p>
          {canEdit() && (
            <button className="btn-primary" onClick={openWizard}>
              <AiOutlinePlus /> İlk Tanıtımı Oluştur
            </button>
          )}
        </div>
      )}

      {!dataLoading && campaigns.length > 0 && (
        <div className="campaign-grid">
          {campaigns.map(campaign => (
            <CampaignCard
              key={campaign.id}
              campaign={campaign}
              onView={handleViewCampaign}
            />
          ))}
        </div>
      )}

      {/* Campaign Details Modal */}
      {showDetailsModal && selectedCampaign && (
        <CampaignDetailsModal
          campaign={selectedCampaign}
          machines={stockProjects}
          customers={clients}
          onClose={() => { setShowDetailsModal(false); setSelectedCampaign(null); }}
          onExport={handleExportCampaign}
          exportLoading={exportLoading}
        />
      )}

      {/* ── Wizard Modal ── */}
      {showWizard && (
        <div className="modal-overlay" onClick={closeWizard}>
          <div className="wizard-modal" onClick={e => e.stopPropagation()}>
            {/* Wizard header */}
            <div className="wizard-header">
              <div>
                <h2 className="wizard-title">Yeni Stok Tanıtımı</h2>
                <p className="wizard-subtitle">Adım {wizardStep} / {STEPS.length}: {STEPS[wizardStep - 1].label}</p>
              </div>
              <button className="modal-close-btn" onClick={closeWizard}><AiOutlineClose /></button>
            </div>

            {/* Step indicators */}
            <div className="wizard-steps">
              {STEPS.map((step, idx) => (
                <React.Fragment key={step.id}>
                  <div className={`wizard-step ${wizardStep === step.id ? 'active' : ''} ${wizardStep > step.id ? 'done' : ''}`}>
                    <div className="wizard-step-circle">
                      {wizardStep > step.id ? <AiOutlineCheckCircle /> : step.id}
                    </div>
                    <span className="wizard-step-label">{step.label}</span>
                    {wizardStep === step.id && step.id === 1 && (
                      <span className="wizard-step-badge">{recipientCustomers.length} alıcı</span>
                    )}
                    {wizardStep === step.id && step.id === 2 && (
                      <span className="wizard-step-badge">{campaignForm.selectedMachines.length} makine</span>
                    )}
                    {wizardStep === step.id && step.id === 3 && (
                      <span className="wizard-step-badge">{recipientCustomers.length} alıcı · {selectedMachineObjects.length} makine · {recipientCustomers.length} e-posta</span>
                    )}
                  </div>
                  {idx < STEPS.length - 1 && <div className="wizard-step-connector" />}
                </React.Fragment>
              ))}
            </div>

            {/* Error */}
            {sendError && <div className="wizard-error"><AiOutlineWarning /> {sendError}</div>}

            {/* Step content */}
            <div className="wizard-body">
              {/* STEP 1 */}
              {wizardStep === 1 && (
                <div className="wizard-step-content">
                  <div className="form-field">
                    <label className="field-label">Tanıtım Adı <span className="required-star">*</span></label>
                    <input
                      type="text"
                      className="input-field full-width"
                      placeholder="Örn: Yaz Dönemi Stok Tanıtımı 2026"
                      value={campaignForm.name}
                      onChange={e => setCampaignForm(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>

                  <div className="form-field">
                    <label className="field-label">Hedef Müşteriler <span className="required-star">*</span></label>
                    <div className="customer-type-btns">
                      <button
                        type="button"
                        className={`customer-type-btn ${campaignForm.customerSelection === 'all' ? 'active' : ''}`}
                        onClick={() => setCampaignForm(prev => ({ ...prev, customerSelection: 'all', selectedCustomers: [] }))}
                      >
                        <AiOutlineTeam /> Tüm Müşteriler
                      </button>
                      <button
                        type="button"
                        className={`customer-type-btn ${campaignForm.customerSelection === 'selected' ? 'active' : ''}`}
                        onClick={() => setCampaignForm(prev => ({ ...prev, customerSelection: 'selected' }))}
                      >
                        Seçili Müşteriler
                      </button>
                    </div>

                    {campaignForm.customerSelection === 'all' && (
                      <div className="info-box">
                        Tüm kayıtlı müşterilere ({clients.length} müşteri) gönderilecektir.
                      </div>
                    )}

                    {campaignForm.customerSelection === 'selected' && (
                      <div className="customer-select-area">
                        <div className="customer-list-scroll">
                          {clients.length === 0 ? (
                            <p className="empty-note">Kayıtlı müşteri bulunamadı.</p>
                          ) : (
                            clients.map(client => {
                              const id = String(client.id);
                              const selected = campaignForm.selectedCustomers.includes(id);
                              return (
                                <label key={client.id} className={`customer-item ${selected ? 'selected' : ''}`}>
                                  <input
                                    type="checkbox"
                                    checked={selected}
                                    onChange={() => toggleCustomer(client.id)}
                                  />
                                  <span className="customer-item-name">{client.name || client.companyName || 'İsimsiz'}</span>
                                  {client.email && <span className="customer-item-email">{client.email}</span>}
                                </label>
                              );
                            })
                          )}
                        </div>
                        <p className="selected-count">{campaignForm.selectedCustomers.length} müşteri seçildi</p>
                      </div>
                    )}
                  </div>

                  <div className="form-field">
                    <label className="field-label">Açıklama</label>
                    <textarea
                      className="textarea-field"
                      rows={3}
                      placeholder="Tanıtım hakkında kısa bir açıklama (isteğe bağlı)"
                      value={campaignForm.description}
                      onChange={e => setCampaignForm(prev => ({ ...prev, description: e.target.value }))}
                    />
                  </div>
                </div>
              )}

              {/* STEP 2 */}
              {wizardStep === 2 && (
                <div className="wizard-step-content">
                  <div className="info-box">
                    <strong>Stoktaki Makineler:</strong> Aşağıda yalnızca aktif (stokta bulunan) makineler listelenmektedir.
                    Tanıtıma dahil etmek istediklerinizi seçin.
                  </div>

                  <div className="machine-search-row">
                    <AiOutlineSearch className="search-icon-sm" />
                    <input
                      type="text"
                      className="input-field full-width"
                      style={{ paddingLeft: '42px' }}
                      placeholder="Makine adı, model, seri no ile ara..."
                      value={machineSearch}
                      onChange={e => setMachineSearch(e.target.value)}
                    />
                  </div>

                  <div className="machine-actions-row">
                    <span className="machine-count-info">
                      {filteredMachines.length} makine gösteriliyor
                      {machineSearch && ' (filtrelenmiş)'}
                    </span>
                    <div className="machine-action-btns">
                      <button
                        type="button"
                        className="btn-sm-secondary"
                        onClick={() => {
                          const ids = filteredMachines.map(p => String(p.id));
                          setCampaignForm(prev => ({ ...prev, selectedMachines: [...new Set([...prev.selectedMachines, ...ids])] }));
                        }}
                      >
                        {machineSearch ? 'Filtrelenenleri Seç' : 'Tümünü Seç'}
                      </button>
                      <button
                        type="button"
                        className="btn-sm-secondary"
                        disabled={campaignForm.selectedMachines.length === 0}
                        onClick={() => setCampaignForm(prev => ({ ...prev, selectedMachines: [] }))}
                      >
                        Temizle
                      </button>
                    </div>
                  </div>

                  <div className="machine-list">
                    {filteredMachines.length === 0 ? (
                      <div className="empty-note">Aramanızla eşleşen makine bulunamadı.</div>
                    ) : (
                      filteredMachines.map(project => {
                        const id = String(project.id);
                        const isSelected = campaignForm.selectedMachines.includes(id);
                        return (
                          <label
                            key={project.id}
                            className={`machine-item ${isSelected ? 'selected' : ''}`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleMachine(project.id)}
                            />
                            <div className="machine-item-info">
                              <div className="machine-item-header">
                                <span className="machine-item-name">{project.machineName || '-'}</span>
                                <span className="machine-item-code">{project.projectCode}</span>
                                <span className="badge-instock">Stokta</span>
                              </div>
                              <div className="machine-item-specs">
                                <span>{project.machineMake || ''}</span>
                                <span>{project.machineModel || ''}</span>
                                {project.machineYear && <span>{project.machineYear}</span>}
                                {project.serialNumber && <span className="serial-text">{project.serialNumber}</span>}
                              </div>
                            </div>
                          </label>
                        );
                      })
                    )}
                  </div>

                  <div className={`machine-summary ${campaignForm.selectedMachines.length > 0 ? 'summary-ok' : 'summary-warn'}`}>
                    {campaignForm.selectedMachines.length > 0 ? (
                      <>
                        <AiOutlineCheckCircle className="summary-icon-ok" />
                        <span>{campaignForm.selectedMachines.length} makine tanıtıma dahil edilecek.</span>
                      </>
                    ) : (
                      <>
                        <AiOutlineWarning className="summary-icon-warn" />
                        <span>Devam etmek için en az bir makine seçmelisiniz.</span>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* STEP 3 */}
              {wizardStep === 3 && (
                <div className="wizard-step-content">
                  {/* Summary */}
                  <div className="step3-summary-card">
                    <button
                      className="step3-summary-toggle"
                      onClick={() => setStep3SummaryExpanded(e => !e)}
                    >
                      <div className="step3-summary-left">
                        <span className="step3-summary-title">Tanıtım Özeti</span>
                        <span className="step3-summary-sub">
                          {campaignForm.name} · {selectedMachineObjects.length} makine · {recipientCustomers.length} alıcı · Toplam {recipientCustomers.length * selectedMachineObjects.length} alıcı-makine eşleşmesi
                        </span>
                      </div>
                      <span>{step3SummaryExpanded ? '▲' : '▼'}</span>
                    </button>
                    {step3SummaryExpanded && (
                      <div className="step3-summary-body">
                        <div className="summary-grid">
                          <div>
                            <p className="summary-label">Tanıtım Adı</p>
                            <p className="summary-value">{campaignForm.name || '-'}</p>
                          </div>
                          <div>
                            <p className="summary-label">Müşteri Seçimi</p>
                            <p className="summary-value">{campaignForm.customerSelection === 'all' ? 'Tüm Müşteriler' : 'Seçili Müşteriler'}</p>
                          </div>
                        </div>
                        <div className="summary-section">
                          <p className="summary-label">Seçili Makineler ({selectedMachineObjects.length})</p>
                          <div className="tag-list">
                            {selectedMachineObjects.map(m => (
                              <span key={m.id} className="tag">
                                {m.machineMake} {m.machineModel} ({m.machineYear || '-'})
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="summary-section">
                          <p className="summary-label">Alıcılar ({recipientCustomers.length})</p>
                          <div className="tag-list">
                            {recipientCustomers.map(c => (
                              <span key={c.id} className="tag">{c.name || c.companyName || 'İsimsiz'}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Email subject override */}
                  <div className="form-field">
                    <label className="field-label">E-posta Konusu (isteğe bağlı)</label>
                    <input
                      type="text"
                      className="input-field full-width"
                      placeholder={`Stok Tanıtımı — ${campaignForm.name || 'Yeni Tanıtım'}`}
                      value={campaignForm.emailSubject}
                      onChange={e => setCampaignForm(prev => ({ ...prev, emailSubject: e.target.value }))}
                    />
                  </div>

                  {/* Email body override */}
                  <div className="form-field">
                    <label className="field-label">E-posta İçeriği (isteğe bağlı — boş bırakırsanız otomatik oluşturulur)</label>
                    <textarea
                      className="textarea-field"
                      rows={4}
                      placeholder="Özel bir e-posta içeriği yazabilirsiniz..."
                      value={campaignForm.emailBody}
                      onChange={e => setCampaignForm(prev => ({ ...prev, emailBody: e.target.value }))}
                    />
                  </div>

                  {/* Preview toggle */}
                  <div className="preview-tabs">
                    <button
                      className={`preview-tab ${!showEmailPreview ? 'active' : ''}`}
                      onClick={() => setShowEmailPreview(false)}
                    >
                      <AiOutlineEdit /> Düzenle
                    </button>
                    <button
                      className={`preview-tab ${showEmailPreview ? 'active' : ''}`}
                      onClick={() => setShowEmailPreview(true)}
                    >
                      <AiOutlineEye /> E-posta Önizleme
                    </button>
                  </div>

                  {showEmailPreview && (
                    <EmailPreview
                      campaign={campaignForm}
                      machines={stockProjects}
                      customers={clients}
                      emailSubject={campaignForm.emailSubject}
                      emailBody={campaignForm.emailBody}
                    />
                  )}
                </div>
              )}
            </div>

            {/* Wizard footer */}
            <div className="wizard-footer">
              <button
                className="btn-secondary"
                onClick={wizardStep === 1 ? closeWizard : prevStep}
              >
                {wizardStep === 1 ? 'İptal' : <><AiOutlineArrowLeft /> Geri</>}
              </button>
              <div style={{ display: 'flex', gap: '8px' }}>
                {wizardStep < 3 ? (
                  <button className="btn-primary" onClick={nextStep}>
                    İleri <AiOutlineArrowRight />
                  </button>
                ) : (
                  <button
                    className="btn-send"
                    onClick={handleSend}
                    disabled={sendLoading}
                  >
                    <AiOutlineSend /> {sendLoading ? 'Gönderiliyor...' : 'Gönder'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KampanyaYonetimi;
