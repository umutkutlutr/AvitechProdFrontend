import React, { useState, useEffect } from 'react';
import bankService from '../../services/bankService';
import {
  AiOutlineReload,
  AiOutlineBank,
  AiOutlineEdit,
  AiOutlinePlus,
  AiOutlineLoading3Quarters,
  AiOutlineEnvironment,
  AiOutlineIdcard,
  AiOutlineFileText
} from 'react-icons/ai';
import './RegisteredBanks.css';

const RegisteredBanks = () => {
  const [banks, setBanks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingBank, setEditingBank] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  useEffect(() => {
    loadBanks();
  }, []);

  const loadBanks = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await bankService.getBanks();
      setBanks(data || []);
    } catch (err) {
      console.error('Error loading banks:', err);
      setError(err.message || 'Bankalar yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => loadBanks();

  const handleEditBank = (bank) => {
    setEditingBank(bank);
  };

  const handleCloseEditModal = () => {
    setEditingBank(null);
  };

  const handleEditSuccess = () => {
    loadBanks();
    setEditingBank(null);
  };

  const handleAddBank = () => setIsAddModalOpen(true);
  const handleCloseAddModal = () => setIsAddModalOpen(false);
  const handleAddSuccess = () => {
    loadBanks();
    setIsAddModalOpen(false);
  };

  const handleDeleteBank = async (bank) => {
    if (!window.confirm(`"${bank.companyName}" bankasını silmek istediğinize emin misiniz?`)) return;
    try {
      await bankService.deleteBank(bank.id);
      loadBanks();
    } catch (err) {
      setError(err.message || 'Banka silinirken bir hata oluştu');
    }
  };

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredBanks = banks.filter((bank) => {
    if (!normalizedSearch) return true;
    const fields = [bank.companyName, bank.address, bank.taxOffice, bank.taxNumber].filter(Boolean);
    return fields.some((f) => String(f).toLowerCase().includes(normalizedSearch));
  });

  if (loading) {
    return (
      <div className="registered-banks">
        <div className="page-loading">
          <AiOutlineLoading3Quarters className="page-loading-spinner" />
          <p>Bankalar yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="registered-banks">
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
    <div className="registered-banks">
      <div className="banks-header">
        <div className="header-content">
          <div className="header-text">
            <h1>Kayıtlı Bankalar</h1>
            <p>Proforma ve leasing işlemlerinde kullanılan banka bilgileri</p>
            <button className="add-bank-button" onClick={handleAddBank}>
              <AiOutlinePlus className="button-icon" />
              Banka Ekle
            </button>
            <div className="search-row">
              <input
                type="text"
                className="bank-search-input"
                placeholder="Bankalarda ara... (ünvan, adres, vergi dairesi, vergi no)"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="banks-content">
        {banks.length === 0 ? (
          <div className="empty-state">
            <AiOutlineBank className="empty-icon" />
            <h3>Henüz kayıtlı banka bulunmuyor</h3>
            <p>Proforma gönderirken banka ekleyebilir veya buradan kayıt oluşturabilirsiniz.</p>
          </div>
        ) : filteredBanks.length === 0 ? (
          <div className="empty-state">
            <AiOutlineBank className="empty-icon" />
            <h3>Arama kriterlerinize uygun banka bulunamadı</h3>
          </div>
        ) : (
          <div className="banks-grid">
            {filteredBanks.map((bank) => (
              <div key={bank.id} className="bank-card">
                <div className="bank-header">
                  <AiOutlineBank className="bank-icon" />
                  <h3 className="bank-name">{bank.companyName || 'Ünvan belirtilmemiş'}</h3>
                </div>
                <div className="bank-details">
                  {bank.address && (
                    <div className="detail-item">
                      <AiOutlineEnvironment className="detail-icon" />
                      <div className="detail-content">
                        <span className="detail-label">Adres</span>
                        <span className="detail-value">{bank.address}</span>
                      </div>
                    </div>
                  )}
                  {bank.taxOffice && (
                    <div className="detail-item">
                      <AiOutlineFileText className="detail-icon" />
                      <div className="detail-content">
                        <span className="detail-label">Vergi Dairesi</span>
                        <span className="detail-value">{bank.taxOffice}</span>
                      </div>
                    </div>
                  )}
                  {bank.taxNumber && (
                    <div className="detail-item">
                      <AiOutlineIdcard className="detail-icon" />
                      <div className="detail-content">
                        <span className="detail-label">Vergi No</span>
                        <span className="detail-value">{bank.taxNumber}</span>
                      </div>
                    </div>
                  )}
                </div>
                <div className="bank-actions">
                  <button className="btn-edit" onClick={() => handleEditBank(bank)}>
                    <AiOutlineEdit /> Düzenle
                  </button>
                  <button className="btn-delete" onClick={() => handleDeleteBank(bank)}>
                    Sil
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {editingBank && (
        <EditBankModal
          bank={editingBank}
          onClose={handleCloseEditModal}
          onSuccess={handleEditSuccess}
        />
      )}

      {isAddModalOpen && (
        <AddBankModal
          onClose={handleCloseAddModal}
          onSuccess={handleAddSuccess}
        />
      )}
    </div>
  );
};

const EditBankModal = ({ bank, onClose, onSuccess }) => {
  const [form, setForm] = useState({
    companyName: bank.companyName || '',
    address: bank.address || '',
    taxOffice: bank.taxOffice || '',
    taxNumber: bank.taxNumber || ''
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.companyName.trim()) {
      setErr('Ünvan zorunludur.');
      return;
    }
    setSaving(true);
    setErr('');
    try {
      await bankService.updateBank(bank.id, form);
      onSuccess();
    } catch (e) {
      setErr(e.message || 'Güncelleme başarısız');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <h2>Banka Düzenle</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Ünvan *</label>
            <input
              type="text"
              value={form.companyName}
              onChange={(e) => setForm({ ...form, companyName: e.target.value })}
              placeholder="Banka ünvanı"
            />
          </div>
          <div className="form-group">
            <label>Adres</label>
            <input
              type="text"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="Adres"
            />
          </div>
          <div className="form-group">
            <label>Vergi Dairesi</label>
            <input
              type="text"
              value={form.taxOffice}
              onChange={(e) => setForm({ ...form, taxOffice: e.target.value })}
              placeholder="Vergi dairesi"
            />
          </div>
          <div className="form-group">
            <label>Vergi No</label>
            <input
              type="text"
              value={form.taxNumber}
              onChange={(e) => setForm({ ...form, taxNumber: e.target.value })}
              placeholder="Vergi numarası"
            />
          </div>
          {err && <p className="modal-error">{err}</p>}
          <div className="modal-actions">
            <button type="button" onClick={onClose}>İptal</button>
            <button type="submit" disabled={saving}>{saving ? 'Kaydediliyor...' : 'Kaydet'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const AddBankModal = ({ onClose, onSuccess }) => {
  const [form, setForm] = useState({
    companyName: '',
    address: '',
    taxOffice: '',
    taxNumber: ''
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.companyName.trim()) {
      setErr('Ünvan zorunludur.');
      return;
    }
    setSaving(true);
    setErr('');
    try {
      await bankService.createBank(form);
      onSuccess();
    } catch (e) {
      setErr(e.message || 'Ekleme başarısız');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <h2>Yeni Banka Ekle</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Ünvan *</label>
            <input
              type="text"
              value={form.companyName}
              onChange={(e) => setForm({ ...form, companyName: e.target.value })}
              placeholder="Banka ünvanı"
            />
          </div>
          <div className="form-group">
            <label>Adres</label>
            <input
              type="text"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="Adres"
            />
          </div>
          <div className="form-group">
            <label>Vergi Dairesi</label>
            <input
              type="text"
              value={form.taxOffice}
              onChange={(e) => setForm({ ...form, taxOffice: e.target.value })}
              placeholder="Vergi dairesi"
            />
          </div>
          <div className="form-group">
            <label>Vergi No</label>
            <input
              type="text"
              value={form.taxNumber}
              onChange={(e) => setForm({ ...form, taxNumber: e.target.value })}
              placeholder="Vergi numarası"
            />
          </div>
          {err && <p className="modal-error">{err}</p>}
          <div className="modal-actions">
            <button type="button" onClick={onClose}>İptal</button>
            <button type="submit" disabled={saving}>{saving ? 'Ekleniyor...' : 'Ekle'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RegisteredBanks;
