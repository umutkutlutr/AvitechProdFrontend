import React, { useState, useEffect, useMemo } from 'react';
import { AiOutlineLoading3Quarters, AiOutlineReload } from 'react-icons/ai';
import { FaFileExcel } from 'react-icons/fa';
import projectService from '../../services/projectService';
import offerService from '../../services/offerService';
import accountingService from '../../services/accountingService';
import AdminFilterPanel from './AdminFilterPanel';
import './AdminPanel.css';

const AdminPanel = () => {
  const [loading, setLoading] = useState(true);
  const [adminData, setAdminData] = useState([]);
  const [error, setError] = useState(null);
  const [activeFilters, setActiveFilters] = useState({});
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);

  useEffect(() => {
    fetchAdminData();
  }, []);

  // Filter data based on active filters (frontend filtering)
  const filteredData = useMemo(() => {
    if (Object.keys(activeFilters).length === 0) {
      return adminData;
    }

    return adminData.filter(item => {
      for (const [key, value] of Object.entries(activeFilters)) {
        if (!value) continue;

        const lowerValue = value.toLowerCase();

        switch (key) {
          case 'projectCode':
            if (!item.projectCode?.toLowerCase().includes(lowerValue)) return false;
            break;
          case 'make':
            if (!item.make?.toLowerCase().includes(lowerValue)) return false;
            break;
          case 'model':
            if (!item.model?.toLowerCase().includes(lowerValue)) return false;
            break;
          case 'year':
            if (!String(item.year ?? '').toLowerCase().includes(lowerValue)) return false;
            break;
          case 'status':
            if (item.status !== value) return false;
            break;
          case 'companySold':
            if (!item.companySold?.toLowerCase().includes(lowerValue)) return false;
            break;
          case 'purchaseDate':
            if (item.purchaseDate) {
              const itemDate = new Date(item.purchaseDate);
              const filterDate = new Date(value);
              // Compare only date part (year, month, day)
              if (itemDate.toDateString() !== filterDate.toDateString()) return false;
            } else {
              return false;
            }
            break;
          case 'saleDate':
            if (item.saleDate) {
              const itemDate = new Date(item.saleDate);
              const filterDate = new Date(value);
              // Compare only date part (year, month, day)
              if (itemDate.toDateString() !== filterDate.toDateString()) return false;
            } else {
              return false;
            }
            break;
          default:
            break;
        }
      }
      return true;
    });
  }, [adminData, activeFilters]);

  // Handle filter changes
  const handleFilter = (filters) => {
    setActiveFilters(filters);
  };

  // Handle clear filters
  const handleClearFilters = () => {
    setActiveFilters({});
  };

  // Extract numeric value from currency string
  const extractNumericValue = (value) => {
    if (!value || value === 'N/A') return 0;
    const valueStr = String(value);
    const currencyMatch = valueStr.match(/(EUR|TRY|USD)?\s*([\d.,]+)/i);
    if (currencyMatch) {
      let numericStr = currencyMatch[2];
      // Check if it's European format (dots as thousands, comma as decimal)
      // or standard format (commas as thousands, dot as decimal)
      if (numericStr.includes(',') && numericStr.includes('.')) {
        // Has both - determine which is decimal separator
        const lastComma = numericStr.lastIndexOf(',');
        const lastDot = numericStr.lastIndexOf('.');
        if (lastComma > lastDot) {
          // European format: 1.234,56
          numericStr = numericStr.replace(/\./g, '').replace(',', '.');
        } else {
          // US format: 1,234.56
          numericStr = numericStr.replace(/,/g, '');
        }
      } else if (numericStr.includes(',')) {
        // Only comma - could be decimal separator
        numericStr = numericStr.replace(',', '.');
      }
      // Don't remove the decimal point - keep it for proper parsing
      const numericValue = parseFloat(numericStr);
      return isNaN(numericValue) ? 0 : numericValue;
    }
    return 0;
  };

  const fetchAdminData = async () => {
    setLoading(true);
    setError(null);

    try {
      const projects = await projectService.getProjects();

      const dataPromises = projects.map(async (project, index) => {
        try {
          let costSummary = null;
          try {
            costSummary = await accountingService.getCostSummary(project.id);
          } catch (costError) {
            console.warn(`Could not fetch cost summary for project ${project.id}:`, costError);
          }

          const rate = costSummary?.salesExchangeRate || 1;
          const getSectionTotal = (key) => {
            const s = costSummary?.sections?.find(x => x.sectionKey === key);
            return parseFloat(s?.totalTry) || 0;
          };
          const getItemAmount = (sectionKey, label) => {
            const s = costSummary?.sections?.find(x => x.sectionKey === sectionKey);
            const item = s?.items?.find(i => i.label === label);
            return parseFloat(item?.amountTry) || 0;
          };

          const purchasePriceTry = getItemAmount('MACHINE_PURCHASE', 'Makine Alım Bedeli') || getSectionTotal('MACHINE_PURCHASE');
          const visitCostTry = getSectionTotal('MACHINE_VISIT');
          const logisticsTotalTry = getSectionTotal('LOGISTICS');
          const insuranceTry = getItemAmount('LOGISTICS', 'Sigorta');
          const logisticsWithoutInsuranceTry = logisticsTotalTry - insuranceTry;
          const customsTry = getSectionTotal('CUSTOMS');
          const transferTry = getSectionTotal('TRANSFER');
          const generalTry = getSectionTotal('GENERAL_COSTS');
          const installationItem = costSummary?.sections?.find(s => s.sectionKey === 'GENERAL_COSTS')?.items?.find(i =>
            /kurulum|montaj|installation/i.test(i.label || '')
          );
          const installationTry = installationItem ? (parseFloat(installationItem.amountTry) || 0) : 0;
          const financingItem = costSummary?.sections?.find(s => s.sectionKey === 'MACHINE_PURCHASE')?.items?.find(i =>
            /finansman|financing|finans/i.test(i.label || '')
          );
          const financingTry = financingItem ? (parseFloat(financingItem.amountTry) || 0) : 0;
          const totalCostTry = parseFloat(costSummary?.totalCostTry) || 0;
          const otherCostsTry = totalCostTry - purchasePriceTry;

          let saleDate = null;
          let salePrice = null;
          let companySold = null;

          if (project.status === 'SOLD') {
            try {
              const offers = await offerService.getOffersByProject(project.id);
              const completedOffer = offers.find(o => o.status === 'COMPLETED');
              if (completedOffer) {
                saleDate = costSummary?.actualSaleDate || completedOffer.sentAt;
                const actualSalePrice = costSummary?.actualSalePriceOriginal ?? completedOffer.salePrice ?? completedOffer.price;
                salePrice = actualSalePrice != null ? parseFloat(actualSalePrice) : null;
                companySold = completedOffer.clientCompanyName;
              }
            } catch (offerError) {
              console.warn(`Could not fetch offers for project ${project.id}:`, offerError);
            }
          }

          const purchaseDate = project.createdAt ? new Date(project.createdAt) : null;
          const saleDateObj = saleDate ? new Date(saleDate) : null;
          let buySellDays = null;
          if (purchaseDate && saleDateObj && !isNaN(purchaseDate) && !isNaN(saleDateObj)) {
            buySellDays = Math.round((saleDateObj - purchaseDate) / (1000 * 60 * 60 * 24));
          }

          const salePriceEur = salePrice != null ? salePrice : (costSummary?.actualSalePriceOriginal != null ? parseFloat(costSummary.actualSalePriceOriginal) : (costSummary?.salesPriceOriginal != null ? parseFloat(costSummary.salesPriceOriginal) : null));
          let grossProfitTry = costSummary?.netProfitTry != null ? parseFloat(costSummary.netProfitTry) : null;
          if (grossProfitTry == null && salePriceEur != null && totalCostTry >= 0) {
            grossProfitTry = salePriceEur * rate - totalCostTry;
          }

          const formatEur = (val) => {
            if (val == null || (typeof val === 'number' && isNaN(val))) return null;
            const n = typeof val === 'number' ? val : parseFloat(val);
            if (isNaN(n)) return null;
            return n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
          };

          return {
            id: project.id,
            projectCode: project.projectCode || 'N/A',
            make: project.make || 'N/A',
            model: project.model || 'N/A',
            year: project.year,
            purchaseDate: project.createdAt,
            saleDate,
            buySellDays,
            purchasePriceTry,
            visitCostTry,
            logisticsTry: logisticsWithoutInsuranceTry,
            insuranceTry,
            customsTry,
            financingTry,
            installationTry,
            otherCostsTry,
            totalCostTry,
            salePriceEur,
            grossProfitTry,
            companySold,
            status: project.status === 'SOLD' ? 'SATILDI' : 'STOKTA',
            rawStatus: project.status,
            rate
          };
        } catch (projectError) {
          console.error(`Error processing project ${project.id}:`, projectError);
          return {
            id: project.id,
            projectCode: project.projectCode || 'N/A',
            make: project.make || 'N/A',
            model: project.model || 'N/A',
            year: project.year,
            purchaseDate: project.createdAt,
            saleDate: null,
            buySellDays: null,
            purchasePriceTry: 0,
            visitCostTry: 0,
            logisticsTry: 0,
            insuranceTry: 0,
            customsTry: 0,
            financingTry: 0,
            installationTry: 0,
            otherCostsTry: 0,
            totalCostTry: 0,
            salePriceEur: null,
            grossProfitTry: null,
            companySold: null,
            status: project.status === 'SOLD' ? 'SATILDI' : 'STOKTA',
            rawStatus: project.status,
            rate: 1
          };
        }
      });

      const data = await Promise.all(dataPromises);
      console.log('Complete admin data:', data);
      setAdminData(data);
    } catch (err) {
      console.error('Error fetching admin data:', err);
      setError('Veriler yüklenirken bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('tr-TR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    } catch {
      return 'N/A';
    }
  };

  // Format number with dots as thousand separators and preserve decimals
  const formatNumberWithDots = (number) => {
    if (number === null || number === undefined || number === '' || isNaN(number)) {
      return null;
    }
    const num = typeof number === 'number' ? number : parseFloat(number);
    if (isNaN(num)) return null;

    const isNegative = num < 0;
    const absNum = Math.abs(num);

    // Check if number has decimal places
    const hasDecimals = absNum % 1 !== 0;
    let integerPart, decimalPart;

    if (hasDecimals) {
      // Format with 2 decimal places
      const fixedNum = absNum.toFixed(2);
      const parts = fixedNum.split('.');
      integerPart = parts[0];
      decimalPart = parts[1];
    } else {
      integerPart = Math.round(absNum).toString();
      decimalPart = null;
    }

    // Add thousand separators (dots) to integer part
    const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

    // Combine with decimal part using comma as decimal separator (European format)
    let formatted = decimalPart ? `${formattedInteger},${decimalPart}` : formattedInteger;
    return isNegative ? '-' + formatted : formatted;
  };

  const formatCurrency = (value) => {
    if (!value || value === 'N/A') return 'N/A';

    // Extract numeric value from string like "EUR 18000" or "18000" or "EUR -5000"
    const valueStr = String(value);
    const currencyMatch = valueStr.match(/(EUR|TRY|USD)?\s*([-\d.,]+)/i);

    if (currencyMatch) {
      const currency = currencyMatch[1] || 'EUR';
      let numericStr = currencyMatch[2];

      // Check if it's European format (dots as thousands, comma as decimal)
      // or standard format (commas as thousands, dot as decimal)
      if (numericStr.includes(',') && numericStr.includes('.')) {
        // Has both - determine which is decimal separator
        const lastComma = numericStr.lastIndexOf(',');
        const lastDot = numericStr.lastIndexOf('.');
        if (lastComma > lastDot) {
          // European format: 1.234,56
          numericStr = numericStr.replace(/\./g, '').replace(',', '.');
        } else {
          // US format: 1,234.56
          numericStr = numericStr.replace(/,/g, '');
        }
      } else if (numericStr.includes(',')) {
        // Only comma - could be decimal separator
        numericStr = numericStr.replace(',', '.');
      }
      // If only dots, it could be US decimal or European thousands
      // Since we're outputting values with toFixed(2), a single dot is decimal

      const numericValue = parseFloat(numericStr);

      if (!isNaN(numericValue)) {
        const formatted = formatNumberWithDots(numericValue);
        return formatted ? `${currency} ${formatted}` : value;
      }
    }

    return value;
  };

  const handleExportToExcel = async () => {
    try {
      await projectService.exportProjectsToExcel();
    } catch (err) {
      console.error('Error exporting to Excel:', err);
      alert('Excel dışa aktarma sırasında bir hata oluştu. Lütfen tekrar deneyin.');
    }
  };

  if (loading) {
    return (
      <div className="admin-panel">
        <div className="admin-panel-header">
          <h1>Yönetici Paneli</h1>
        </div>
        <div className="admin-panel-loading">
          <AiOutlineLoading3Quarters className="loading-spinner" />
          <p>Veriler yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-panel">
        <div className="admin-panel-header">
          <h1>Yönetici Paneli</h1>
        </div>
        <div className="admin-panel-error">
          <p>{error}</p>
          <button className="retry-button" onClick={fetchAdminData}>
            <AiOutlineReload /> Tekrar Dene
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-panel">
      <div className="admin-panel-header">
        <h1>Yönetici Paneli</h1>
        <button className="export-excel-button" onClick={handleExportToExcel}>
          <FaFileExcel /> Excel ile Dışa Aktar
        </button>
      </div>

      <AdminFilterPanel
        onFilter={handleFilter}
        onClear={handleClearFilters}
        adminData={adminData}
      />

      {Object.keys(activeFilters).length > 0 && (
        <div className="filter-results-info">
          <span>{filteredData.length} / {adminData.length} kayıt gösteriliyor</span>
        </div>
      )}

      <div className="admin-panel-table-wrapper">
        <div className="admin-panel-table-container">
          <table className="admin-panel-table">
            <thead>
              <tr>
                <th>PROJE KODU</th>
                <th>MARKA MODEL</th>
                <th>MODEL</th>
                <th>ALIŞ TARİHİ</th>
                <th>SATIŞ TARİHİ</th>
                <th>Alım-Satım Gün</th>
                <th>ALIŞ BEDELİ</th>
                <th>Ziyaret Masrafları</th>
                <th>LOJİSTİK</th>
                <th>SİGORTA</th>
                <th>GÜMRÜK-ANTREPO</th>
                <th>FİNASMAN</th>
                <th>BESTTECH Makine Kurulum</th>
                <th>Gider Toplam</th>
                <th>Makine Alış Maliyeti</th>
                <th>Satış Bedeli</th>
                <th>Vergi Öncesi Brüt Kar</th>
                <th>Satılan Firma</th>
                <th>Durum</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan="19" className="no-data">
                    {Object.keys(activeFilters).length > 0
                      ? 'Filtrelere uygun veri bulunamadı.'
                      : 'Gösterilecek veri bulunmamaktadır.'}
                  </td>
                </tr>
              ) : (
                <>
                  {filteredData.map((item) => {
                    const purchaseEur = item.rate > 0 ? item.purchasePriceTry / item.rate : item.purchasePriceTry;
                    const visitEur = item.rate > 0 ? item.visitCostTry / item.rate : item.visitCostTry;
                    const logisticsEur = item.rate > 0 ? item.logisticsTry / item.rate : item.logisticsTry;
                    const insuranceEur = item.rate > 0 ? item.insuranceTry / item.rate : item.insuranceTry;
                    const customsEur = item.rate > 0 ? item.customsTry / item.rate : item.customsTry;
                    const financingEur = item.rate > 0 ? item.financingTry / item.rate : item.financingTry;
                    const installationEur = item.rate > 0 ? item.installationTry / item.rate : item.installationTry;
                    const otherEur = item.rate > 0 ? item.otherCostsTry / item.rate : item.otherCostsTry;
                    const totalCostEur = item.rate > 0 ? item.totalCostTry / item.rate : item.totalCostTry;
                    const grossProfitEur = item.grossProfitTry != null && item.rate > 0 ? item.grossProfitTry / item.rate : item.grossProfitTry;
                    const fmt = (n) => n != null && !isNaN(n) ? n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-';
                    return (
                      <tr key={item.id}>
                        <td className="project-code">{item.projectCode}</td>
                        <td className="make-model">{item.make} {item.model}</td>
                        <td>{item.year ?? '-'}</td>
                        <td>{formatDate(item.purchaseDate)}</td>
                        <td>{formatDate(item.saleDate)}</td>
                        <td>{item.buySellDays != null ? item.buySellDays : '-'}</td>
                        <td className="currency">{fmt(purchaseEur)} €</td>
                        <td className="currency">{fmt(visitEur)} €</td>
                        <td className="currency">{fmt(logisticsEur)} €</td>
                        <td className="currency">{fmt(insuranceEur)} €</td>
                        <td className="currency">{fmt(customsEur)} €</td>
                        <td className="currency">{fmt(financingEur)} €</td>
                        <td className="currency">{fmt(installationEur)} €</td>
                        <td className="currency">{fmt(otherEur)} €</td>
                        <td className="currency">{fmt(totalCostEur)} €</td>
                        <td className="currency">{item.salePriceEur != null ? fmt(item.salePriceEur) + ' €' : '-'}</td>
                        <td className={`currency ${grossProfitEur != null && grossProfitEur < 0 ? 'negative' : ''}`}>
                          {grossProfitEur != null ? fmt(grossProfitEur) + ' €' : '-'}
                        </td>
                        <td>{item.companySold || '-'}</td>
                        <td className={`status-cell ${item.status === 'SATILDI' ? 'sold' : 'instock'}`}>
                          {item.status}
                        </td>
                      </tr>
                    );
                  })}
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {filteredData.length > 0 && (
        <div className="admin-panel-analysis-section">
          <button
            type="button"
            className="analysis-button"
            onClick={() => setShowAnalysisModal(true)}
          >
            Ortalama Analizlerini Gör
          </button>
        </div>
      )}

      {showAnalysisModal && filteredData.length > 0 && (() => {
        const daysList = filteredData.map(i => i.buySellDays).filter(d => d != null && !isNaN(d));
        const avgDays = daysList.length > 0 ? Math.round(daysList.reduce((a, b) => a + b, 0) / daysList.length) : null;
        const sumPurchase = filteredData.reduce((a, i) => a + (i.rate > 0 ? i.purchasePriceTry / i.rate : 0), 0);
        const sumVisit = filteredData.reduce((a, i) => a + (i.rate > 0 ? i.visitCostTry / i.rate : 0), 0);
        const sumLogistics = filteredData.reduce((a, i) => a + (i.rate > 0 ? i.logisticsTry / i.rate : 0), 0);
        const sumInsurance = filteredData.reduce((a, i) => a + (i.rate > 0 ? i.insuranceTry / i.rate : 0), 0);
        const sumCustoms = filteredData.reduce((a, i) => a + (i.rate > 0 ? i.customsTry / i.rate : 0), 0);
        const sumFinancing = filteredData.reduce((a, i) => a + (i.rate > 0 ? i.financingTry / i.rate : 0), 0);
        const sumInstallation = filteredData.reduce((a, i) => a + (i.rate > 0 ? i.installationTry / i.rate : 0), 0);
        const sumOther = filteredData.reduce((a, i) => a + (i.rate > 0 ? i.otherCostsTry / i.rate : 0), 0);
        const sumTotalCost = filteredData.reduce((a, i) => a + (i.rate > 0 ? i.totalCostTry / i.rate : 0), 0);
        const sumSale = filteredData.reduce((a, i) => a + (i.salePriceEur != null ? i.salePriceEur : 0), 0);
        const sumGross = filteredData.reduce((a, i) => a + (i.grossProfitTry != null && i.rate > 0 ? i.grossProfitTry / i.rate : 0), 0);
        const fmt = (n) => n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        const rows = [
          { label: 'Alım-Satım Gün (Ortalama)', value: avgDays != null ? `${avgDays} gün` : '-' },
          { label: 'ALIŞ BEDELİ', value: `${fmt(sumPurchase)} €` },
          { label: 'Ziyaret Masrafları', value: `${fmt(sumVisit)} €` },
          { label: 'LOJİSTİK', value: `${fmt(sumLogistics)} €` },
          { label: 'SİGORTA', value: `${fmt(sumInsurance)} €` },
          { label: 'GÜMRÜK-ANTREPO', value: `${fmt(sumCustoms)} €` },
          { label: 'FİNASMAN', value: `${fmt(sumFinancing)} €` },
          { label: 'BESTTECH Makine Kurulum', value: `${fmt(sumInstallation)} €` },
          { label: 'Gider Toplam', value: `${fmt(sumOther)} €` },
          { label: 'Makine Alış Maliyeti', value: `${fmt(sumTotalCost)} €` },
          { label: 'Satış Bedeli', value: `${fmt(sumSale)} €` },
          { label: 'Vergi Öncesi Brüt Kar', value: sumGross < 0 ? `${fmt(sumGross)} €` : `${fmt(sumGross)} €`, isNegative: sumGross < 0 }
        ];
        return (
          <div className="analysis-modal-overlay" onClick={() => setShowAnalysisModal(false)}>
            <div className="analysis-modal" onClick={(e) => e.stopPropagation()}>
              <div className="analysis-modal-header">
                <h3>Ortalama ve Toplam Analizleri</h3>
                <button type="button" className="analysis-modal-close" onClick={() => setShowAnalysisModal(false)}>×</button>
              </div>
              <div className="analysis-modal-body">
                <table className="analysis-summary-table">
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.label}>
                        <td className="analysis-label">{r.label}</td>
                        <td className={`analysis-value ${r.isNegative ? 'negative' : ''}`}>{r.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default AdminPanel;

