import React, { useState } from 'react';
import { AiOutlineClose, AiOutlineEuro } from 'react-icons/ai';
import { FaCheck } from 'react-icons/fa';
import './ViewProposalsModal.css';

const ViewProposalsModal = ({ service, onClose, onSell }) => {
  const [selectedProposalId, setSelectedProposalId] = useState(null);

  if (!service) return null;

  const formatCurrency = (amount, currency = 'EUR') => {
    if (currency === 'TRY') {
      return `₺${amount.toLocaleString('tr-TR')}`;
    }
    return `€${amount.toLocaleString('de-DE')}`;
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleSell = () => {
    if (onSell) {
      onSell(service);
    }
    onClose();
  };

  const handleProposalClick = (proposalId) => {
    setSelectedProposalId(selectedProposalId === proposalId ? null : proposalId);
  };

  const handleComplete = () => {
    if (selectedProposalId && onSell) {
      onSell(service);
    }
    onClose();
  };

  // Mock proposal data - in real app this would come from API/database
  const proposals = [
    {
      id: 1,
      proposalNumber: 'TEK-2024-001',
      sentDate: '15.01.2024',
      clientName: 'ABC Makine Ltd. Şti.',
      contactPerson: 'Ahmet Yılmaz',
      email: 'ahmet@abcmakine.com',
      phone: '+90 212 555 0123',
      proposedPrice: 22000,
      currency: 'EUR',
      status: 'Beklemede',
      notes: 'Müşteri fiyat konusunda değerlendirme yapıyor.'
    },
    {
      id: 2,
      proposalNumber: 'TEK-2024-002',
      sentDate: '18.01.2024',
      clientName: 'XYZ Endüstri A.Ş.',
      contactPerson: 'Mehmet Demir',
      email: 'mehmet@xyzendustri.com',
      phone: '+90 216 555 0456',
      proposedPrice: 23500,
      currency: 'EUR',
      status: 'Pozitif Yanıt',
      notes: 'Müşteri teklifi beğendi, detayları görüşmek istiyor.'
    }
  ];

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-content proposals-modal">
        <div className="modal-header">
          <h2>{service.machineName} - Gönderilen Teklifler</h2>
          <button className="close-button" onClick={onClose}>
            <AiOutlineClose />
          </button>
        </div>

        <div className="modal-body">
          <div className="service-summary">
            <div className="summary-row">
              <span className="summary-label">Makine:</span>
              <span className="summary-value">{service.machineName}</span>
            </div>
            <div className="summary-row">
              <span className="summary-label">Seri No:</span>
              <span className="summary-value">{service.serialNumber}</span>
            </div>
            <div className="summary-row">
              <span className="summary-label">Toplam Maliyet:</span>
              <span className="summary-value cost">{formatCurrency(service.totalCost, 'EUR')}</span>
            </div>
            <div className="summary-row">
              <span className="summary-label">Önerilen Satış Fiyatı:</span>
              <span className="summary-value sales">{formatCurrency(service.salesPrice, 'EUR')}</span>
            </div>
          </div>

          <div className="proposals-section">
            <h3>Gönderilen Teklifler</h3>
            <p className="selection-instruction">Bir teklif seçmek için tıklayın:</p>
            <div className="proposals-list">
              {proposals.map((proposal) => (
                <div
                  key={proposal.id}
                  className={`proposal-card ${selectedProposalId === proposal.id ? 'selected' : ''}`}
                  onClick={() => handleProposalClick(proposal.id)}
                >
                  <div className="proposal-header">
                    <div className="proposal-info">
                      <h4>{proposal.proposalNumber}</h4>
                      <span className="proposal-date">{proposal.sentDate}</span>
                    </div>
                    <div className={`proposal-status ${proposal.status === 'Pozitif Yanıt' ? 'positive' : 'pending'}`}>
                      {proposal.status}
                    </div>
                  </div>

                  <div className="proposal-details">
                    <div className="client-info">
                      <div className="client-name">{proposal.clientName}</div>
                      <div className="contact-info">
                        <span>{proposal.contactPerson}</span>
                        <span>{proposal.email}</span>
                        <span>{proposal.phone}</span>
                      </div>
                    </div>

                    <div className="proposal-price">
                      <span className="price-label">Teklif Edilen Fiyat:</span>
                      <span className="price-value">{formatCurrency(proposal.proposedPrice, proposal.currency)}</span>
                    </div>

                    <div className="proposal-notes">
                      <span className="notes-label">Notlar:</span>
                      <span className="notes-text">{proposal.notes}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="modal-actions">
            {selectedProposalId ? (
              <button className="btn-complete" onClick={handleComplete}>
                <FaCheck className="btn-icon" />
                Tamamlandı
              </button>
            ) : (
              <button className="btn-sell" onClick={handleSell}>
                <FaCheck className="btn-icon" />
                Satışı Tamamla
              </button>
            )}
            <button className="btn-close" onClick={onClose}>
              Kapat
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewProposalsModal;
