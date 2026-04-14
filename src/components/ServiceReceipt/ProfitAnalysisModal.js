import React, { useState, useEffect, useRef } from 'react';
import { AiOutlineClose, AiOutlineEuro, AiOutlineLoading3Quarters, AiOutlineDownload } from 'react-icons/ai';
import { FaChartLine } from 'react-icons/fa';
import { normalizeProjectCard } from '../../utils/projectNormalizer';
import accountingService from '../../services/accountingService';
import offerService from '../../services/offerService';
import projectService from '../../services/projectService';
import { FALLBACK_RATES } from '../../services/currencyService';
import './ProfitAnalysisModal.css';

const ProfitAnalysisModal = ({ service, onClose, showSalesPrice = false }) => {
  const [costSummary, setCostSummary] = useState(null);
  const [offerPrice, setOfferPrice] = useState(null);
  const [bidPriceFromOffer, setBidPriceFromOffer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const modalRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      if (!service?.id) {
        setError('Proje ID bulunamadı');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        setCostSummary(null);
        setOfferPrice(null);
        setBidPriceFromOffer(null);

        // Fetch offer details from the offers endpoint to extract salePrice and price
        const offerData = await offerService.getOffersByProject(service.id);
        if (cancelled) return;

        // Extract salePrice and price from offers
        if (offerData && Array.isArray(offerData) && offerData.length > 0) {
          // Önce tıklanan teklif (QuotesSent'te offerId ile) varsa onu kullan
          const viewingOffer = service?.offerId ? offerData.find(o => o.id === service.offerId) : null;
          const completedOffer = offerData.find(offer => offer.status === 'COMPLETED');
          const salePriceSource = viewingOffer?.status === 'COMPLETED'
            ? (viewingOffer.salePrice ?? viewingOffer.price)
            : completedOffer
              ? (completedOffer.salePrice ?? completedOffer.price)
              : null;
          if (salePriceSource != null) {
            setOfferPrice(salePriceSource);
          }

          const firstOffer = offerData[0];
          if (firstOffer && firstOffer.price) {
            setBidPriceFromOffer(firstOffer.price);
          }
        }

        // Fetch cost summary from accounting API
        const summary = await accountingService.getCostSummary(service.id);
        if (cancelled) return;
        setCostSummary(summary);
      } catch (err) {
        if (cancelled) return;
        console.error('Error fetching cost data:', err);
        setError(err.message || 'Maliyet detayları yüklenirken bir hata oluştu');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchData();
    return () => { cancelled = true; };
  }, [service?.id, service?.offerId, service?.originalStatus, service?.offerStatus, service?.status, service?.rawStatus]);

  const formatCurrency = (amount, currency = 'TRY') => {
    if (amount == null || isNaN(amount)) return '₺0';
    const num = typeof amount === 'number' ? amount : parseFloat(amount);
    if (isNaN(num)) return currency === 'EUR' ? '€0,00' : '₺0,00';
    if (currency === 'EUR') {
      return `€${num.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return `₺${num.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getDisplayStatus = (status) => {
    switch (status) {
      case 'TEMPLATE': return 'Aktif';
      case 'SOLD': return 'Tamamlandı';
      case 'OFFER_SENT': return 'Teklif Gönderildi';
      case 'BOUGHT': return 'Satın Alındı';
      case 'CANCELLED': return 'İptal Edildi';
      default: return status;
    }
  };

  // Compute derived values - Satış Fiyatı: completed offer veya muhasebe genel maliyetlerinden
  const totalCostEur = costSummary?.totalCostEur ?? 0;
  const labelPriceOriginal = costSummary?.labelPriceOriginal;
  const bidPrice = bidPriceFromOffer ?? 0;
  // Satıldı: proje durumu, tamamlanmış teklif satırı veya muhasebe özetinde gerçek satış tutarı
  const projectSold = service?.status === 'SOLD' || service?.rawStatus === 'SOLD';
  const offerRowCompleted =
    service?.offerStatus === 'COMPLETED' || service?.originalStatus === 'COMPLETED';
  const hasActualSaleInSummary =
    costSummary != null &&
    costSummary.actualSalePriceOriginal != null &&
    String(costSummary.actualSalePriceOriginal).trim() !== '' &&
    !Number.isNaN(parseFloat(String(costSummary.actualSalePriceOriginal)));
  const isSold = projectSold || offerRowCompleted || hasActualSaleInSummary;
  const actualSalePriceFromCost = costSummary?.actualSalePriceOriginal != null ? parseFloat(costSummary.actualSalePriceOriginal) : null;
  const salesPriceFromCost = costSummary?.salesPriceOriginal != null ? parseFloat(costSummary.salesPriceOriginal) : null;
  const salesPrice = actualSalePriceFromCost ?? offerPrice ?? (isSold ? salesPriceFromCost : null);
  const salesPriceEur = costSummary?.salesPriceEur ?? (salesPrice != null ? salesPrice : null);
  const netProfitEur = costSummary?.netProfitEur ?? null;
  const profitMargin = costSummary?.profitMarginPercent ?? (salesPriceEur != null && salesPriceEur > 0 && netProfitEur != null ? Math.round((netProfitEur / salesPriceEur) * 10000) / 100 : 0);

  const allCostItems = costSummary?.sections?.flatMap(section =>
    (section.items || []).map(item => ({ ...item, sectionName: section.sectionName }))
  ) || [];

  const handleExportExcel = async () => {
    if (!service?.id) return;
    try {
      await projectService.exportCostSummaryToExcel(service.id);
    } catch (err) {
      console.error('Excel export error:', err);
      alert(err?.message || 'Excel indirilemedi.');
    }
  };

  // Force scroll recalculation after content loads
  useEffect(() => {
    if (!loading && !error && modalRef.current) {
      const forceScrollRecalculation = () => {
        if (modalRef.current) {
          void modalRef.current.scrollHeight;
          void modalRef.current.clientHeight;
          void modalRef.current.scrollTop;
        }
      };

      let resizeObserver;
      const contentElement = modalRef.current.querySelector('.modal-content');

      if (window.ResizeObserver && contentElement) {
        resizeObserver = new ResizeObserver(() => {
          setTimeout(forceScrollRecalculation, 0);
        });
        resizeObserver.observe(contentElement);
      }

      const timeout1 = setTimeout(() => {
        requestAnimationFrame(() => requestAnimationFrame(forceScrollRecalculation));
      }, 0);
      const timeout2 = setTimeout(forceScrollRecalculation, 100);

      return () => {
        clearTimeout(timeout1);
        clearTimeout(timeout2);
        if (resizeObserver) resizeObserver.disconnect();
      };
    }
  }, [loading, error, costSummary, offerPrice, bidPriceFromOffer]);

  return (
    <div className="profit-analysis-modal-overlay" onClick={onClose}>
      <div ref={modalRef} className="profit-analysis-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-content">
          <div className="profit-modal-header-row" style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            {costSummary && (
              <button
                onClick={handleExportExcel}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  background: '#059669', color: '#fff', border: 'none',
                  borderRadius: '6px', padding: '8px 14px', fontSize: '13px',
                  fontWeight: 600, cursor: 'pointer'
                }}
                title="Maliyet detaylarını Excel olarak indir"
              >
                <AiOutlineDownload /> Excel İndir
              </button>
            )}
            <button className="close-button" onClick={onClose}>
              <AiOutlineClose />
            </button>
          </div>

          <div className="service-info machine-identity-block">
            {(() => {
              const n = normalizeProjectCard(service);
              return (
                <>
                  <h3>{n.machineName}</h3>
                  <p className="service-id">Proje Kodu: {n.projectCode}</p>
                  <p className="machine-meta">{(n.make || n.model) ? `${n.make || ''} ${n.model || ''}`.trim() : ''} {n.year ? `· ${n.year}` : ''} {n.serialNumber ? `· SN: ${n.serialNumber}` : ''}</p>
                </>
              );
            })()}
          </div>

          {loading && (
            <div className="loading-state">
              <AiOutlineLoading3Quarters className="inline-loading-spinner" />
              <p>Maliyet detayları yükleniyor...</p>
            </div>
          )}

          {error && (
            <div className="error-state">
              <p>Hata: {error}</p>
            </div>
          )}

          {!loading && !error && (
            <div className="analysis-grid">
              <div className="cost-section">
                <div className="section-header">
                  <AiOutlineEuro className="section-icon" />
                  <h4>Maliyet Detayları</h4>
                </div>
                <div className="cost-list">
                  {costSummary?.sections?.map((section) => (
                    <React.Fragment key={section.sectionKey}>
                      {section.items?.length > 0 && (
                        <>
                          <div className="cost-section-label">{section.sectionName}</div>
                          {section.items.map((item, idx) => {
                            const parsedItemRate = parseFloat(item.exchangeRate);
                            const parsedSalesRate = parseFloat(costSummary?.salesExchangeRate);
                            const itemRate = (!isNaN(parsedItemRate) && parsedItemRate > 0) ? parsedItemRate : (!isNaN(parsedSalesRate) && parsedSalesRate > 0) ? parsedSalesRate : FALLBACK_RATES.EUR;
                            const eurAmount = (item.amountEur != null && !isNaN(item.amountEur))
                              ? parseFloat(item.amountEur)
                              : (itemRate > 0 ? Math.round(((parseFloat(item.amountTry) || 0) / itemRate) * 100) / 100 : 0);
                            return (
                            <div key={`${section.sectionKey}-${idx}`} className="cost-item">
                              <span className="cost-description">{item.label}</span>
                              <span className="cost-amount">
                                €{eurAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </div>
                            );
                          })}
                        </>
                      )}
                    </React.Fragment>
                  ))}
                  {allCostItems.length === 0 && (
                    <div className="cost-item">
                      <span className="cost-description" style={{ color: '#999' }}>Henüz maliyet verisi girilmemiş</span>
                    </div>
                  )}
                </div>
                <div className="total-cost">
                  <span>Toplam Maliyet:</span>
                  <span className="total-amount">
                    {totalCostEur > 0 ? (
                      <>€{totalCostEur.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</>
                    ) : (
                      '-'
                    )}
                  </span>
                </div>
              </div>

              <div className="sales-section">
                <div className="section-header">
                  <FaChartLine className="section-icon" />
                  <h4>Satış Bilgileri</h4>
                </div>
                <div className="sales-info">
                  <div className="sales-item">
                    <span>Teklif Fiyatı:</span>
                    <span className="sales-price">{bidPrice ? formatCurrency(bidPrice, 'EUR') : '-'}</span>
                  </div>
                  {(labelPriceOriginal != null && labelPriceOriginal > 0) && (
                    <div className="sales-item">
                      <span>Etiket Fiyatı:</span>
                      <span className="sales-price">{formatCurrency(labelPriceOriginal, costSummary?.salesCurrency || 'EUR')}</span>
                    </div>
                  )}
                  <div className="sales-item">
                    <span>Satış Fiyatı:</span>
                    <span className="sales-price">{salesPrice ? formatCurrency(salesPrice, 'EUR') : '-'}</span>
                  </div>
                  <div className="sales-item">
                    <span>Durum:</span>
                    <span className="sales-status">{getDisplayStatus(service.status)}</span>
                  </div>
                </div>
              </div>

              <div className="profit-section">
                <div className="section-header">
                  <FaChartLine className="section-icon" />
                  <h4>Kâr Analizi</h4>
                </div>
                <div className="profit-info">
                  <div className="profit-item">
                    <span>Net Kâr:</span>
                    <span className={`profit-amount ${(netProfitEur ?? 0) >= 0 ? 'positive' : 'negative'}`}>
                      {netProfitEur != null && !isNaN(netProfitEur) ? (
                        <>€{netProfitEur.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</>
                      ) : (
                        '-'
                      )}
                    </span>
                  </div>
                  <div className="profit-item">
                    <span>Net Kâr Marjı:</span>
                    <span className={`profit-margin ${profitMargin >= 0 ? 'positive' : 'negative'}`}>
                      {(isNaN(Number(profitMargin)) ? 0 : Number(profitMargin)).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfitAnalysisModal;
