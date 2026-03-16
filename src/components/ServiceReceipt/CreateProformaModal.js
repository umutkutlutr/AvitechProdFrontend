import React, { useState, useEffect } from 'react';
import { FaTimes, FaFileInvoice, FaPaperPlane } from 'react-icons/fa';
import proformaService from '../../services/proformaService';
import bankService from '../../services/bankService';
import accountingService from '../../services/accountingService';
import './CreateProformaModal.css';

const CreateProformaModal = ({ offer, onClose, onProformaComplete }) => {
  const [price, setPrice] = useState('');
  const [gtipCode, setGtipCode] = useState('');
  const [gtipOption, setGtipOption] = useState('eu');
  const [terms, setTerms] = useState({
    deliveryTerms: 'EXW',
    paymentTerms: 'Proforma fatura tarihinden itibaren 30 gün',
    deliveryDate: 'Ödeme sonrası 4-6 hafta',
  });

  const [isLeasing, setIsLeasing] = useState(false);
  const [banks, setBanks] = useState([]);
  const [selectedBankId, setSelectedBankId] = useState('');
  const [showNewBankForm, setShowNewBankForm] = useState(false);
  const [newBank, setNewBank] = useState({ companyName: '', address: '', taxOffice: '', taxNumber: '' });
  const [saveNewBank, setSaveNewBank] = useState(true);

  const [isSending, setIsSending] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successInfo, setSuccessInfo] = useState(null);
  const [error, setError] = useState('');

  const GTIP_ROOT = '8457.10.';
  const GTIP_EU_SUFFIX = '10';
  const GTIP_OTHER_SUFFIX = '90';

  useEffect(() => {
    if (offer?.price != null) {
      const p = parseFloat(offer.price);
      if (!isNaN(p)) setPrice(p.toLocaleString('tr-TR'));
      else setPrice(String(offer.price));
    }
  }, [offer]);

  useEffect(() => {
    if (gtipOption !== 'custom') {
      setGtipCode(GTIP_ROOT + (gtipOption === 'eu' ? GTIP_EU_SUFFIX : GTIP_OTHER_SUFFIX));
    }
  }, [gtipOption]);

  useEffect(() => {
    const fetchBanks = async () => {
      try {
        const data = await bankService.getBanks();
        setBanks(data);
      } catch (e) {
        console.error('Failed to fetch banks:', e);
      }
    };
    fetchBanks();
  }, []);

  useEffect(() => {
    const checkLeasing = async () => {
      if (!offer?.projectId) return;
      try {
        const draft = await accountingService.getDraft(offer.projectId);
        if (draft?.machinePurchase?.paymentMethod === 'leasing' || (parseFloat(draft?.machinePurchase?.creditAmount) || 0) > 0) {
          setIsLeasing(true);
        }
      } catch (e) {
        console.error('Failed to check leasing status:', e);
      }
    };
    checkLeasing();
  }, [offer?.projectId]);

  const formatPrice = (val) => {
    const clean = val.replace(/[^\d]/g, '');
    if (!clean) return '';
    return parseInt(clean).toLocaleString('tr-TR');
  };

  const handlePriceChange = (e) => {
    setPrice(formatPrice(e.target.value));
  };

  const buildTermsString = () => {
    return Object.entries(terms)
      .map(([, v], i) => {
        const keys = ['Teslimat Şartları', 'Ödeme Şartları', 'Teslimat Tarihi'];
        return `${keys[i]}:${v}`;
      })
      .join('|');
  };

  const handleSendClick = () => {
    setError('');
    const numericPrice = parseInt(price.replace(/\./g, ''));
    if (!numericPrice || numericPrice <= 0) {
      setError('Geçerli bir fiyat giriniz.');
      return;
    }
    if (isLeasing && !selectedBankId && !showNewBankForm) {
      setError('Leasing için banka seçimi veya yeni banka girişi gereklidir.');
      return;
    }
    if (isLeasing && showNewBankForm && !newBank.companyName.trim()) {
      setError('Banka ünvanı zorunludur.');
      return;
    }
    setShowConfirm(true);
  };

  const handleConfirmSend = async () => {
    setShowConfirm(false);
    setIsSending(true);
    setError('');

    try {
      const numericPrice = parseInt(price.replace(/\./g, ''));
      const requestData = {
        offerId: offer.id,
        price: numericPrice,
        gtipCode: gtipCode,
        terms: buildTermsString(),
      };

      if (isLeasing) {
        if (showNewBankForm && newBank.companyName.trim()) {
          requestData.newBank = newBank;
          requestData.saveNewBank = saveNewBank;
        } else if (selectedBankId) {
          requestData.bankId = parseInt(selectedBankId);
        }
      }

      const result = await proformaService.createProforma(requestData);
      setSuccessInfo(result || null);
      setShowSuccess(true);
      setTimeout(() => {
        if (onProformaComplete) onProformaComplete();
      }, 2000);
    } catch (e) {
      setError(e.message || 'Proforma gönderilirken bir hata oluştu.');
    } finally {
      setIsSending(false);
    }
  };

  if (!offer) return null;

  return (
    <div className="create-proforma-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="create-proforma-modal">
        <div className="modal-header">
          <h2><FaFileInvoice style={{ color: '#3b82f6' }} /> Proforma Gönder</h2>
          <button className="close-button" onClick={onClose}><FaTimes /></button>
        </div>

        <div className="modal-body">
          {/* Offer Info */}
          <div className="proforma-section">
            <h3>Teklif Bilgileri</h3>
            <div className="proforma-info-grid">
              <div className="proforma-info-item">
                <span className="label">Proje Kodu:</span>
                <span className="value">{offer.projectCode || '-'}</span>
              </div>
              <div className="proforma-info-item">
                <span className="label">Müşteri:</span>
                <span className="value">{offer.clientCompanyName || '-'}</span>
              </div>
              <div className="proforma-info-item">
                <span className="label">Teklif Fiyatı:</span>
                <span className="value">{offer.price ? `${parseInt(offer.price).toLocaleString('tr-TR')} €` : '-'}</span>
              </div>
              <div className="proforma-info-item">
                <span className="label">Tarih:</span>
                <span className="value">{offer.sentAt ? new Date(offer.sentAt).toLocaleDateString('tr-TR') : '-'}</span>
              </div>
            </div>
          </div>

          {/* Price */}
          <div className="proforma-form-group">
            <label>Proforma Fiyatı (EUR)</label>
            <input
              type="text"
              value={price}
              onChange={handlePriceChange}
              placeholder="Fiyat giriniz"
            />
          </div>

          {/* GTIP */}
          <div className="proforma-form-group">
            <label>GTİP Kodu</label>
            <div className="gtip-radio-group">
              <label>
                <input type="radio" name="gtip" value="eu" checked={gtipOption === 'eu'} onChange={() => setGtipOption('eu')} />
                AB Ülkeleri ({GTIP_ROOT}{GTIP_EU_SUFFIX})
              </label>
              <label>
                <input type="radio" name="gtip" value="other" checked={gtipOption === 'other'} onChange={() => setGtipOption('other')} />
                Diğer ({GTIP_ROOT}{GTIP_OTHER_SUFFIX})
              </label>
              <label>
                <input type="radio" name="gtip" value="custom" checked={gtipOption === 'custom'} onChange={() => setGtipOption('custom')} />
                Özel giriş
              </label>
            </div>
            {gtipOption === 'custom' && (
              <input
                type="text"
                value={gtipCode}
                onChange={(e) => setGtipCode(e.target.value)}
                placeholder="Örn: 8457.10.10"
                style={{ marginTop: '8px', padding: '8px 12px', width: '100%', maxWidth: '200px' }}
              />
            )}
          </div>

          {/* Terms */}
          <div className="proforma-section">
            <h3>Şartlar</h3>
            <div className="proforma-form-group">
              <label>Teslimat Şartları</label>
              <input type="text" value={terms.deliveryTerms} onChange={(e) => setTerms({ ...terms, deliveryTerms: e.target.value })} />
            </div>
            <div className="proforma-form-group">
              <label>Ödeme Şartları</label>
              <input type="text" value={terms.paymentTerms} onChange={(e) => setTerms({ ...terms, paymentTerms: e.target.value })} />
            </div>
            <div className="proforma-form-group">
              <label>Teslimat Tarihi</label>
              <input type="text" value={terms.deliveryDate} onChange={(e) => setTerms({ ...terms, deliveryDate: e.target.value })} />
            </div>
          </div>

          {/* Bank Section - always visible for bank selection */}
          <div className="bank-section">
            <h3>Banka Bilgileri {isLeasing && <span className="leasing-badge">LEASING</span>}</h3>
            <div className="proforma-form-group">
              <label>Banka Seçimi {isLeasing && <span style={{ color: '#dc2626' }}>*</span>}</label>
              <select
                value={showNewBankForm ? 'new' : selectedBankId}
                onChange={(e) => {
                  if (e.target.value === 'new') {
                    setShowNewBankForm(true);
                    setSelectedBankId('');
                  } else {
                    setShowNewBankForm(false);
                    setSelectedBankId(e.target.value);
                  }
                }}
              >
                <option value="">Banka seçiniz...</option>
                {banks.map(b => (
                  <option key={b.id} value={b.id}>{b.companyName}</option>
                ))}
                <option value="new">+ Yeni Banka Ekle</option>
              </select>
            </div>

            {showNewBankForm && (
              <div className="new-bank-form">
                <div className="proforma-form-group">
                  <label>Banka Ünvanı *</label>
                  <input type="text" value={newBank.companyName} onChange={(e) => setNewBank({ ...newBank, companyName: e.target.value })} placeholder="Banka ünvanı" />
                </div>
                <div className="proforma-form-group">
                  <label>Adres</label>
                  <input type="text" value={newBank.address} onChange={(e) => setNewBank({ ...newBank, address: e.target.value })} placeholder="Banka adresi" />
                </div>
                <div className="proforma-form-group">
                  <label>Vergi Dairesi</label>
                  <input type="text" value={newBank.taxOffice} onChange={(e) => setNewBank({ ...newBank, taxOffice: e.target.value })} placeholder="Vergi dairesi" />
                </div>
                <div className="proforma-form-group">
                  <label>Vergi No</label>
                  <input type="text" value={newBank.taxNumber} onChange={(e) => setNewBank({ ...newBank, taxNumber: e.target.value })} placeholder="Vergi numarası" />
                </div>
                <div className="save-bank-checkbox">
                  <input type="checkbox" id="saveBankCheck" checked={saveNewBank} onChange={(e) => setSaveNewBank(e.target.checked)} />
                  <label htmlFor="saveBankCheck">Bu bankayı kayıtlı bankalara ekle</label>
                </div>
              </div>
            )}
          </div>

          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '12px', marginBottom: '16px' }}>
              <p style={{ color: '#dc2626', margin: 0, fontSize: '0.9rem' }}>{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="proforma-actions">
            <button className="cancel-btn" onClick={onClose} disabled={isSending}>İptal</button>
            <button className="submit-btn" onClick={handleSendClick} disabled={isSending}>
              {isSending ? <><span className="loading-spinner-small"></span> Gönderiliyor...</> : <><FaPaperPlane /> Proforma Gönder</>}
            </button>
          </div>
        </div>

        {/* Confirmation */}
        {showConfirm && (
          <div className="confirm-overlay">
            <div className="confirm-box">
              <h3>Proforma Gönderilsin mi?</h3>
              <p>
                <strong>{offer.clientCompanyName}</strong> müşterisine proforma fatura gönderilecektir.
                {isLeasing && (selectedBankId || showNewBankForm) && ' Ayrıca banka proforması da oluşturulacaktır.'}
              </p>
              <div className="confirm-buttons">
                <button className="confirm-no" onClick={() => setShowConfirm(false)}>Vazgeç</button>
                <button className="confirm-yes" onClick={handleConfirmSend}>Onayla ve Gönder</button>
              </div>
            </div>
          </div>
        )}

        {/* Success */}
        {showSuccess && (
          <div className="success-overlay">
            <div className="success-box">
              <div className="success-icon"><FaFileInvoice /></div>
              <h3>Proforma Gönderildi!</h3>
              <p>Proforma fatura başarıyla oluşturuldu.</p>
              {successInfo?.emailSent === false ? (
                <p style={{ color: '#b45309', fontWeight: 600 }}>
                  E-posta gönderilemedi: {successInfo.emailError || 'Bilinmeyen hata'}
                </p>
              ) : (
                <p>Proforma müşteriye e-posta ile gönderildi.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreateProformaModal;
