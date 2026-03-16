import React, { useState, useEffect } from 'react';
import { AiOutlineClose, AiOutlineEuro, AiOutlineLoading3Quarters, AiOutlineDownload } from 'react-icons/ai';
import { FaChartLine } from 'react-icons/fa';
import { normalizeProjectCard } from '../../utils/projectNormalizer';
import offerService from '../../services/offerService';
import accountingService from '../../services/accountingService';
import projectService from '../../services/projectService';
import './ProposalInformationModal.css';

const CostInformationModal = ({ service, onClose }) => {
    const [costSummary, setCostSummary] = useState(null);
    const [offerPrice, setOfferPrice] = useState(null);
    const [bidPrice, setBidPrice] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchCostData = async () => {
            if (!service?.id) {
                setError('Proje ID bulunamadı');
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                setError(null);

                const offerData = await offerService.getOffersByProject(service.id);
                if (offerData && Array.isArray(offerData) && offerData.length > 0) {
                    const offer = offerData[0];
                    if (offer.price) setBidPrice(offer.price);
                    const completedOffer = offerData.find(o => o.status === 'COMPLETED');
                    if (completedOffer) {
                        setOfferPrice(completedOffer.salePrice ?? completedOffer.price);
                    }
                }

                const summary = await accountingService.getCostSummary(service.id);
                setCostSummary(summary);
            } catch (err) {
                console.error('Error fetching cost data:', err);
                setError(err.message || 'Maliyet bilgileri yüklenirken bir hata oluştu');
            } finally {
                setLoading(false);
            }
        };

        fetchCostData();
    }, [service?.id]);

    const formatCurrency = (amount, currency = 'TRY') => {
        if (amount == null || isNaN(amount)) return '-';
        const num = typeof amount === 'number' ? amount : parseFloat(amount);
        const symbols = { EUR: '€', USD: '$', TRY: '₺' };
        const symbol = symbols[currency] || currency;
        const locale = currency === 'EUR' ? 'de-DE' : currency === 'USD' ? 'en-US' : 'tr-TR';
        return `${symbol}${num.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    // Excel export via backend API (real .xlsx format)
    const handleExportExcel = async () => {
        if (!service?.id) return;
        try {
            await projectService.exportCostSummaryToExcel(service.id);
        } catch (err) {
            console.error('Excel export error:', err);
        }
    };

    // Compute derived values - Satış Fiyatı: completed offer salePrice veya muhasebe genel maliyetlerinden
    const totalCostTry = costSummary?.totalCostTry ?? 0;
    const labelPriceOriginal = costSummary?.labelPriceOriginal;
    const isSold = service?.status === 'SOLD' || service?.rawStatus === 'SOLD' || service?.status === 'ONAYLANDI' || offerPrice != null;
    const actualSalePriceFromCost = costSummary?.actualSalePriceOriginal != null ? parseFloat(costSummary.actualSalePriceOriginal) : null;
    const salesPriceFromCost = costSummary?.salesPriceOriginal != null ? parseFloat(costSummary.salesPriceOriginal) : null;
    const salesPrice = actualSalePriceFromCost ?? offerPrice ?? (isSold ? salesPriceFromCost : null);
    const finalBidPrice = bidPrice ?? 0;
    const priceForProfit = salesPrice ?? (bidPrice || 0);
    const eurRate = costSummary?.salesCurrency === 'EUR' && costSummary?.salesExchangeRate > 0 ? parseFloat(costSummary.salesExchangeRate) : 38.5;
    const netProfit = costSummary?.netProfitTry ?? (priceForProfit > 0 ? (priceForProfit * eurRate - totalCostTry) : 0);
    const profitMargin = costSummary?.profitMarginPercent ?? (priceForProfit > 0 && priceForProfit * eurRate > 0 ? ((netProfit / (priceForProfit * eurRate)) * 100) : 0);

    const allCostItems = costSummary?.sections?.flatMap(section =>
        section.items.map(item => ({ ...item, sectionName: section.sectionName }))
    ) || [];

    return (
        <div className="proposal-modal-overlay" onClick={onClose}>
            <div className="proposal-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-content">
                    <div className="modal-header">
                        <h2>Maliyet Bilgileri</h2>
                        <div className="header-actions" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
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
                            <p>Maliyet bilgileri yükleniyor...</p>
                        </div>
                    )}

                    {error && (
                        <div className="error-state">
                            <p>Hata: {error}</p>
                        </div>
                    )}

                    {!loading && !error && (
                        <div className="proposal-content">
                            {/* Cost Details */}
                            <div className="cost-section">
                                <div className="section-header">
                                    <AiOutlineEuro className="section-icon" />
                                    <h4>Maliyet Detayları</h4>
                                </div>
                                <div className="cost-list">
                                    {costSummary?.sections?.map((section) => (
                                        <React.Fragment key={section.sectionKey}>
                                            {section.items.length > 0 && (
                                                <>
                                                    <div className="cost-section-label" style={{ fontWeight: 600, color: '#555', marginTop: '8px', fontSize: '13px' }}>
                                                        {section.sectionName}
                                                    </div>
                                                    {section.items.map((item, idx) => (
                                                        <div key={`${section.sectionKey}-${idx}`} className="cost-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                            <span className="cost-description">{item.label}</span>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                <span className="cost-amount" style={{ fontWeight: 600 }}>
                                                                    {formatCurrency(item.amount, item.currency || 'TRY')}
                                                                </span>
                                                                {item.currency && item.currency !== 'TRY' && item.exchangeRate && (
                                                                    <span style={{ fontSize: '10px', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                                                                        (kur: {parseFloat(item.exchangeRate).toFixed(2)})
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
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
                                        {totalCostTry > 0 && costSummary?.salesExchangeRate > 0 && costSummary?.salesCurrency === 'EUR' ? (
                                            <>€{(totalCostTry / parseFloat(costSummary.salesExchangeRate)).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}<span style={{ fontSize: '12px', marginLeft: '8px', opacity: 0.9 }}>(₺{totalCostTry.toLocaleString('tr-TR', { minimumFractionDigits: 2 })})</span></>
                                        ) : (
                                            formatCurrency(totalCostTry, 'TRY')
                                        )}
                                    </span>
                                </div>
                            </div>

                            {/* Sales and Profit */}
                            <div className="sales-profit-section">
                                <div className="sales-section">
                                    <div className="section-header">
                                        <FaChartLine className="section-icon" />
                                        <h4>Satış Bilgileri</h4>
                                    </div>
                                    <div className="sales-info">
                                        <div className="sales-item">
                                            <span>Teklif Fiyatı:</span>
                                            <span className="sales-price">{finalBidPrice ? formatCurrency(finalBidPrice, 'EUR') : '-'}</span>
                                        </div>
                                        {labelPriceOriginal != null && labelPriceOriginal > 0 && (
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
                                            <span className="sales-status">{service.status}</span>
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
                                            <span className={`profit-amount ${netProfit >= 0 ? 'positive' : 'negative'}`}>
                                                {eurRate > 0 ? (
                                                    <>€{(netProfit / eurRate).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}<span style={{ fontSize: '12px', marginLeft: '8px', opacity: 0.9 }}>(₺{netProfit.toLocaleString('tr-TR', { minimumFractionDigits: 2 })})</span></>
                                                ) : (
                                                    formatCurrency(netProfit, 'TRY')
                                                )}
                                            </span>
                                        </div>
                                        <div className="profit-item">
                                            <span>Net Kâr Marjı:</span>
                                            <span className={`profit-margin ${profitMargin >= 0 ? 'positive' : 'negative'}`}>
                                                {typeof profitMargin === 'number' ? profitMargin.toFixed(1) : parseFloat(profitMargin || 0).toFixed(1)}%
                                            </span>
                                        </div>
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

export default CostInformationModal;
