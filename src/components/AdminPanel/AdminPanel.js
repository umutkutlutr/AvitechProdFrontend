import React, { useState, useEffect, useMemo } from 'react';
import { AiOutlineLoading3Quarters, AiOutlineReload } from 'react-icons/ai';
import { FaFileExcel } from 'react-icons/fa';
import projectService from '../../services/projectService';
import offerService from '../../services/offerService';
import accountingService from '../../services/accountingService';
import AdminFilterPanel from './AdminFilterPanel';
import SearchBar from '../ServiceReceipt/SearchBar';
import './AdminPanel.css';

const AdminPanel = () => {
  const [loading, setLoading] = useState(true);
  const [adminData, setAdminData] = useState([]);
  const [error, setError] = useState(null);
  const [activeFilters, setActiveFilters] = useState({});
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchAdminData();
  }, []);

  // Filter data based on active filters and search (frontend filtering)
  const filteredData = useMemo(() => {
    let result = adminData;

    // Apply search
    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      result = result.filter(item => {
        const fields = [
          item.projectCode, item.make, item.model, String(item.year ?? ''),
          item.companySold, item.status
        ].filter(Boolean);
        return fields.some(f => String(f).toLowerCase().includes(q));
      });
    }

    if (Object.keys(activeFilters).length === 0) {
      return result;
    }

    return result.filter(item => {
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
  }, [adminData, activeFilters, searchTerm]);

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

          const rate = (costSummary?.salesExchangeRate != null && costSummary.salesExchangeRate > 0) ? parseFloat(costSummary.salesExchangeRate) : 38.5;
          const getSectionTotalEur = (key) => {
            const s = costSummary?.sections?.find(x => x.sectionKey === key);
            return parseFloat(s?.totalEur) ?? (rate > 0 ? (parseFloat(s?.totalTry) || 0) / rate : 0);
          };
          const getItemAmountEur = (sectionKey, label) => {
            const s = costSummary?.sections?.find(x => x.sectionKey === sectionKey);
            const item = s?.items?.find(i => i.label === label);
            const eur = parseFloat(item?.amountEur);
            if (!isNaN(eur)) return eur;
            return rate > 0 ? (parseFloat(item?.amountTry) || 0) / rate : 0;
          };

          const purchasePriceEur = getItemAmountEur('MACHINE_PURCHASE', 'Makine Alım Bedeli') || getSectionTotalEur('MACHINE_PURCHASE');
          const visitCostEur = getSectionTotalEur('MACHINE_VISIT');
          const logisticsTotalEur = getSectionTotalEur('LOGISTICS');
          const insuranceEur = getItemAmountEur('LOGISTICS', 'Sigorta');
          const logisticsWithoutInsuranceEur = logisticsTotalEur - insuranceEur;
          const customsEur = getSectionTotalEur('CUSTOMS');
          const installationItem = costSummary?.sections?.find(s => s.sectionKey === 'GENERAL_COSTS')?.items?.find(i =>
            /kurulum|montaj|installation/i.test(i.label || '')
          );
          const installationEur = installationItem ? (parseFloat(installationItem.amountEur) ?? (rate > 0 ? (parseFloat(installationItem.amountTry) || 0) / rate : 0)) : 0;
          const financingItem = costSummary?.sections?.find(s => s.sectionKey === 'MACHINE_PURCHASE')?.items?.find(i =>
            /finansman|financing|finans/i.test(i.label || '')
          );
          const financingEur = financingItem ? (parseFloat(financingItem.amountEur) ?? (rate > 0 ? (parseFloat(financingItem.amountTry) || 0) / rate : 0)) : 0;
          const totalCostEur = costSummary?.totalCostEur != null ? parseFloat(costSummary.totalCostEur) : (rate > 0 ? (parseFloat(costSummary?.totalCostTry) || 0) / rate : 0);
          const otherCostsEur = totalCostEur - purchasePriceEur;

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

          const salePriceEurVal = salePrice != null ? salePrice : (costSummary?.salesPriceEur ?? costSummary?.actualSalePriceOriginal ?? (costSummary?.actualSalePriceOriginal != null ? parseFloat(costSummary.actualSalePriceOriginal) : (project.status === 'SOLD' && costSummary?.salesPriceOriginal != null ? parseFloat(costSummary.salesPriceOriginal) : null)));
          let grossProfitEurVal = costSummary?.netProfitEur != null ? parseFloat(costSummary.netProfitEur) : null;
          if (grossProfitEurVal == null && project.status === 'SOLD' && salePriceEurVal != null && totalCostEur >= 0) {
            grossProfitEurVal = salePriceEurVal - totalCostEur;
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
            purchasePriceEur,
            visitCostEur,
            logisticsEur: logisticsWithoutInsuranceEur,
            insuranceEur,
            customsEur,
            financingEur,
            installationEur,
            otherCostsEur,
            totalCostEur,
            salePriceEur: salePriceEurVal,
            grossProfitEur: grossProfitEurVal,
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
            purchasePriceEur: 0,
            visitCostEur: 0,
            logisticsEur: 0,
            insuranceEur: 0,
            customsEur: 0,
            financingEur: 0,
            installationEur: 0,
            otherCostsEur: 0,
            totalCostEur: 0,
            salePriceEur: null,
            grossProfitEur: null,
            companySold: null,
            status: project.status === 'SOLD' ? 'SATILDI' : 'STOKTA',
            rawStatus: project.status,
            rate: 38.5
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

      <div className="admin-toolbar">
        <SearchBar
          onSearch={setSearchTerm}
          placeholder="Proje kodu, marka, model, firma ile ara..."
        />
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
                <th>MODEL YILI</th>
                <th>ALIŞ TARİHİ</th>
                <th>SATIŞ TARİHİ</th>
                <th>Alım-Satım Gün</th>
                <th>ALIŞ BEDELİ</th>
                <th>Ziyaret Masrafları</th>
                <th>LOJİSTİK</th>
                <th>SİGORTA</th>
                <th>GÜMRÜK-ANTREPO</th>
                <th>FİNASMAN</th>
                <th>Kurulum Bedeli</th>
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
                    const purchaseEur = item.purchasePriceEur ?? 0;
                    const visitEur = item.visitCostEur ?? 0;
                    const logisticsEur = item.logisticsEur ?? 0;
                    const insuranceEur = item.insuranceEur ?? 0;
                    const customsEur = item.customsEur ?? 0;
                    const financingEur = item.financingEur ?? 0;
                    const installationEur = item.installationEur ?? 0;
                    const otherEur = item.otherCostsEur ?? 0;
                    const totalCostEur = item.totalCostEur ?? 0;
                    const grossProfitEur = item.grossProfitEur;
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
                        <td className="currency">{item.salePriceEur != null && !isNaN(item.salePriceEur) ? fmt(item.salePriceEur) + ' €' : '-'}</td>
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
    </div>
  );
};

export default AdminPanel;

