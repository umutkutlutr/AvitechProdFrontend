import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import projectService from '../../services/projectService';
import accountingService from '../../services/accountingService';
import { getExchangeRates } from '../../services/currencyService';
import {
  AiOutlineSearch,
  AiOutlineReload,
  AiOutlineCheckCircle,
  AiOutlineSave,
  AiOutlineUpload,
  AiOutlinePlus,
  AiOutlineDelete,
  AiOutlineRight,
  AiOutlineDown,
  AiOutlineInfoCircle,
  AiOutlineWarning,
  AiOutlineArrowLeft,
  AiOutlineLoading3Quarters,
  AiOutlineBell,
  AiOutlineDownload,
} from 'react-icons/ai';
import { parseFormattedNumber, formatNumberForInput } from '../../utils/numberFormat';
import { normalizeProjectCard, getProjectSearchText } from '../../utils/projectNormalizer';
import { getStatusLabel } from '../../utils/statusDateDictionary';
import { getProjectStatusBadgeClass } from '../../utils/projectStatusUi';
import './ProjeMuhasebesi.css';

// ─── helpers ─────────────────────────────────────────────────────────────────

const CURRENCIES = ['EUR', 'USD', 'TRY'];

const SECTION_LABELS = {
  machinePurchase: '1a. Makine Alım Maliyeti',
  machineVisit: '1b. Makine Ziyareti',
  logistics: '2. Lojistik',
  customs: '3. Gümrük',
  transfer: '4. Devir İşlemleri',
  generalCosts: '5. Genel Maliyetler',
  costSummary: '6. Maliyet Özeti',
};

const SALES_ONLY_ITEMS = ['Satış Faturası', 'Sözleşme'];
const getMissingItems = (n) => {
  if (n.missingItems && Array.isArray(n.missingItems)) return n.missingItems;
  if (n.missingSections) {
    if (Array.isArray(n.missingSections)) return n.missingSections;
    if (typeof n.missingSections === 'object') return Object.values(n.missingSections).flat();
  }
  return [];
};
const isSalesOnlyNotification = (n) => {
  const items = getMissingItems(n);
  return items.length > 0 && items.every((item) => SALES_ONLY_ITEMS.includes(item));
};

const emptyDraftForm = () => ({
  machinePurchase: {
    purchasePrice: '',
    purchaseCurrency: 'EUR',
    purchaseExchangeRate: '',
    purchasePriceTry: '',
    externalCommission: '',
    externalCommissionCurrency: 'EUR',
    externalCommissionRate: '',
    externalCommissionTry: '',
    machineCondition: '',
    equityAmount: '',
    creditAmount: '',
    creditInterestRate: '',
    purchaseInvoiceKey: '',
    externalCommissionInvoiceKey: '',
    additionalCosts: [],
  },
  machineVisit: {
    visited: true,
    flightCost: '',
    flightCurrency: 'EUR',
    flightExchangeRate: '',
    flightCostTry: '',
    flightInvoiceKey: '',
    hotelCost: '',
    hotelCurrency: 'EUR',
    hotelExchangeRate: '',
    hotelCostTry: '',
    hotelInvoiceKey: '',
    carRentalCost: '',
    carRentalCurrency: 'EUR',
    carRentalExchangeRate: '',
    carRentalCostTry: '',
    carRentalInvoiceKey: '',
    additionalExpenseCost: '',
    additionalExpenseCurrency: 'EUR',
    additionalExpenseExchangeRate: '',
    additionalExpenseCostTry: '',
    additionalExpenseInvoiceKey: '',
    additionalCosts: [],
  },
  logistics: {
    agreedCompany: '',
    vehiclePlate: '',
    freightCost: '',
    freightCurrency: 'EUR',
    freightExchangeRate: '',
    freightCostTry: '',
    freightInvoiceKey: '',
    additionalLogisticsCost: '',
    additionalLogisticsCurrency: 'EUR',
    additionalLogisticsExchangeRate: '',
    additionalLogisticsCostTry: '',
    additionalLogisticsInvoiceKey: '',
    brandingCost: '',
    brandingCurrency: 'EUR',
    brandingExchangeRate: '',
    brandingCostTry: '',
    brandingInvoiceKey: '',
    hasEx1: false,
    hasT1T2: false,
    hasSmr: false,
    hasAtr: false,
    hasPackingList: false,
    ex1DocumentKey: '',
    t1t2DocumentKey: '',
    smrDocumentKey: '',
    atrDocumentKey: '',
    packingListDocumentKey: '',
    insuranceDone: false,
    insuranceCost: '',
    insuranceCurrency: 'EUR',
    insuranceExchangeRate: '',
    insuranceCostTry: '',
    insuranceDocumentKey: '',
    additionalCosts: [],
  },
  customs: {
    entryCustomsCost: '',
    entryCustomsCurrency: 'EUR',
    entryCustomsExchangeRate: '',
    entryCustomsCostTry: '',
    entryCustomsInvoiceKey: '',
    hasDeclarationDocument: false,
    declarationDocumentKey: '',
    hasCountReportDocument: false,
    countReportDocumentKey: '',
    warehouseUnloadingCost: '',
    warehouseUnloadingCurrency: 'EUR',
    warehouseUnloadingExchangeRate: '',
    warehouseUnloadingCostTry: '',
    warehouseUnloadingInvoiceKey: '',
    storageCost: '',
    storageCurrency: 'EUR',
    storageExchangeRate: '',
    storageCostTry: '',
    storageInvoiceKey: '',
    warehousePaidByBuyer: false,
    additionalCosts: [],
  },
  transfer: {
    transferCost: '',
    transferCurrency: 'EUR',
    transferExchangeRate: '',
    transferCostTry: '',
    transferInvoiceKey: '',
    hasTransferDeclaration: false,
    transferDeclarationKey: '',
    hasTransferCountReport: false,
    transferCountReportKey: '',
    additionalCosts: [],
  },
  generalCosts: {
    installationCost: '',
    installationCurrency: 'EUR',
    installationExchangeRate: '',
    installationCostTry: '',
    installationInvoiceKey: '',
    salesPrice: '',
    salesCurrency: 'EUR',
    salesExchangeRate: '',
    salesPriceTry: '',
    financingDays: '',
    hasSalesInvoice: false,
    salesInvoiceKey: '',
    hasContract: false,
    contractKey: '',
    additionalCosts: [],
  },
});

// Map backend DTO fields → local form fields
const mapDraftToForm = (dto) => {
  if (!dto) return emptyDraftForm();
  const form = emptyDraftForm();

  // Helper: get additional costs from DTO-level map (preferred) or section-level (fallback)
  const getAdditionalCosts = (sectionType, sectionObj) => {
    const items = (dto.additionalCosts && dto.additionalCosts[sectionType]) || sectionObj.additionalCosts || [];
    return items.map(ac => ({
      id: ac.id,
      itemName: ac.itemName || '',
      amount: ac.amount != null ? String(ac.amount) : '',
      currency: ac.currency || 'EUR',
      amountTry: ac.amountTry != null ? String(ac.amountTry) : '',
      exchangeRate: ac.exchangeRate != null ? String(ac.exchangeRate) : '',
      invoiceKey: ac.invoiceKey || '',
    }));
  };

  const mp = dto.machinePurchase || {};
  form.machinePurchase = {
    purchasePrice: mp.purchasePrice != null ? String(mp.purchasePrice) : '',
    purchaseCurrency: mp.purchaseCurrency || 'EUR',
    purchaseExchangeRate: mp.purchaseExchangeRate != null ? String(mp.purchaseExchangeRate) : '',
    purchasePriceTry: mp.purchasePriceTry != null ? String(mp.purchasePriceTry) : '',
    externalCommission: mp.externalCommission != null ? String(mp.externalCommission) : '',
    externalCommissionCurrency: mp.externalCommissionCurrency || 'EUR',
    externalCommissionRate: mp.externalCommissionRate != null ? String(mp.externalCommissionRate) : '',
    externalCommissionTry: mp.externalCommissionTry != null ? String(mp.externalCommissionTry) : '',
    machineCondition: mp.machineCondition || '',
    equityAmount: mp.equityAmount != null ? String(mp.equityAmount) : '',
    creditAmount: mp.creditAmount != null ? String(mp.creditAmount) : '',
    creditInterestRate: mp.creditInterestRate != null ? String(mp.creditInterestRate) : '',
    purchaseInvoiceKey: mp.purchaseInvoiceKey || '',
    externalCommissionInvoiceKey: mp.externalCommissionInvoiceKey || '',
    additionalCosts: getAdditionalCosts('MACHINE_PURCHASE', mp),
  };

  const mv = dto.machineVisit || {};
  form.machineVisit = {
    visited: mv.visited === false ? false : true,
    flightCost: mv.flightCost != null ? String(mv.flightCost) : '',
    flightCurrency: mv.flightCurrency || 'EUR',
    flightExchangeRate: mv.flightExchangeRate != null ? String(mv.flightExchangeRate) : '',
    flightCostTry: mv.flightCostTry != null ? String(mv.flightCostTry) : '',
    flightInvoiceKey: mv.flightInvoiceKey || '',
    hotelCost: mv.hotelCost != null ? String(mv.hotelCost) : '',
    hotelCurrency: mv.hotelCurrency || 'EUR',
    hotelExchangeRate: mv.hotelExchangeRate != null ? String(mv.hotelExchangeRate) : '',
    hotelCostTry: mv.hotelCostTry != null ? String(mv.hotelCostTry) : '',
    hotelInvoiceKey: mv.hotelInvoiceKey || '',
    carRentalCost: mv.carRentalCost != null ? String(mv.carRentalCost) : '',
    carRentalCurrency: mv.carRentalCurrency || 'EUR',
    carRentalExchangeRate: mv.carRentalExchangeRate != null ? String(mv.carRentalExchangeRate) : '',
    carRentalCostTry: mv.carRentalCostTry != null ? String(mv.carRentalCostTry) : '',
    carRentalInvoiceKey: mv.carRentalInvoiceKey || '',
    additionalExpenseCost: mv.additionalExpense != null ? String(mv.additionalExpense) : '',
    additionalExpenseCurrency: mv.additionalExpenseCurrency || 'EUR',
    additionalExpenseExchangeRate: mv.additionalExpenseRate != null ? String(mv.additionalExpenseRate) : '',
    additionalExpenseCostTry: mv.additionalExpenseTry != null ? String(mv.additionalExpenseTry) : '',
    additionalExpenseInvoiceKey: mv.additionalExpenseInvoiceKey || '',
    additionalCosts: getAdditionalCosts('MACHINE_VISIT', mv),
  };

  const lg = dto.logistics || {};
  form.logistics = {
    agreedCompany: lg.agreedCompany || '',
    vehiclePlate: lg.vehiclePlate || '',
    freightCost: lg.freightCost != null ? String(lg.freightCost) : '',
    freightCurrency: lg.freightCurrency || 'EUR',
    freightExchangeRate: lg.freightExchangeRate != null ? String(lg.freightExchangeRate) : '',
    freightCostTry: lg.freightCostTry != null ? String(lg.freightCostTry) : '',
    freightInvoiceKey: lg.freightInvoiceKey || '',
    additionalLogisticsCost: lg.additionalLogisticsCost != null ? String(lg.additionalLogisticsCost) : '',
    additionalLogisticsCurrency: lg.additionalLogisticsCurrency || 'EUR',
    additionalLogisticsExchangeRate: lg.additionalLogisticsRate != null ? String(lg.additionalLogisticsRate) : '',
    additionalLogisticsCostTry: lg.additionalLogisticsTry != null ? String(lg.additionalLogisticsTry) : '',
    additionalLogisticsInvoiceKey: lg.additionalLogisticsInvoiceKey || '',
    brandingCost: lg.brandingCost != null ? String(lg.brandingCost) : '',
    brandingCurrency: lg.brandingCurrency || 'EUR',
    brandingExchangeRate: lg.brandingExchangeRate != null ? String(lg.brandingExchangeRate) : '',
    brandingCostTry: lg.brandingCostTry != null ? String(lg.brandingCostTry) : '',
    brandingInvoiceKey: lg.brandingInvoiceKey || '',
    hasEx1: !!lg.hasEx1Document,
    hasT1T2: !!lg.hasT1t2Document,
    hasSmr: !!lg.hasSmrDocument,
    hasAtr: !!lg.hasAtrDocument,
    hasPackingList: !!lg.hasPackingListDocument,
    ex1DocumentKey: lg.ex1DocumentKey || '',
    t1t2DocumentKey: lg.t1t2DocumentKey || '',
    smrDocumentKey: lg.smrDocumentKey || '',
    atrDocumentKey: lg.atrDocumentKey || '',
    packingListDocumentKey: lg.packingListDocumentKey || '',
    insuranceDone: !!lg.insuranceDone,
    insuranceCost: lg.insuranceCost != null ? String(lg.insuranceCost) : '',
    insuranceCurrency: lg.insuranceCurrency || 'EUR',
    insuranceExchangeRate: lg.insuranceExchangeRate != null ? String(lg.insuranceExchangeRate) : '',
    insuranceCostTry: lg.insuranceCostTry != null ? String(lg.insuranceCostTry) : '',
    insuranceDocumentKey: lg.insuranceDocumentKey || '',
    additionalCosts: getAdditionalCosts('LOGISTICS', lg),
  };

  const cu = dto.customs || {};
  form.customs = {
    entryCustomsCost: cu.entryCustomsCost != null ? String(cu.entryCustomsCost) : '',
    entryCustomsCurrency: cu.entryCustomsCurrency || 'EUR',
    entryCustomsExchangeRate: cu.entryCustomsExchangeRate != null ? String(cu.entryCustomsExchangeRate) : '',
    entryCustomsCostTry: cu.entryCustomsCostTry != null ? String(cu.entryCustomsCostTry) : '',
    entryCustomsInvoiceKey: cu.entryCustomsInvoiceKey || '',
    hasDeclarationDocument: !!cu.hasDeclarationDocument,
    declarationDocumentKey: cu.declarationDocumentKey || '',
    hasCountReportDocument: !!cu.hasCountReportDocument,
    countReportDocumentKey: cu.countReportDocumentKey || '',
    warehouseUnloadingCost: cu.warehouseUnloadingCost != null ? String(cu.warehouseUnloadingCost) : '',
    warehouseUnloadingCurrency: cu.warehouseUnloadingCurrency || 'EUR',
    warehouseUnloadingExchangeRate: cu.warehouseUnloadingRate != null ? String(cu.warehouseUnloadingRate) : '',
    warehouseUnloadingCostTry: cu.warehouseUnloadingTry != null ? String(cu.warehouseUnloadingTry) : '',
    warehouseUnloadingInvoiceKey: cu.warehouseUnloadingInvoiceKey || '',
    storageCost: cu.storageCost != null ? String(cu.storageCost) : '',
    storageCurrency: cu.storageCurrency || 'EUR',
    storageExchangeRate: cu.storageExchangeRate != null ? String(cu.storageExchangeRate) : '',
    storageCostTry: cu.storageCostTry != null ? String(cu.storageCostTry) : '',
    storageInvoiceKey: cu.storageInvoiceKey || '',
    warehousePaidByBuyer: !!cu.warehousePaidByBuyer,
    additionalCosts: getAdditionalCosts('CUSTOMS', cu),
  };

  const tr = dto.transfer || {};
  form.transfer = {
    transferCost: tr.transferCost != null ? String(tr.transferCost) : '',
    transferCurrency: tr.transferCurrency || 'EUR',
    transferExchangeRate: tr.transferExchangeRate != null ? String(tr.transferExchangeRate) : '',
    transferCostTry: tr.transferCostTry != null ? String(tr.transferCostTry) : '',
    transferInvoiceKey: tr.transferInvoiceKey || '',
    hasTransferDeclaration: !!tr.hasTransferDeclaration,
    transferDeclarationKey: tr.transferDeclarationKey || '',
    hasTransferCountReport: !!tr.hasTransferCountReport,
    transferCountReportKey: tr.transferCountReportKey || '',
    additionalCosts: getAdditionalCosts('TRANSFER', tr),
  };

  const gc = dto.generalCosts || {};
  form.generalCosts = {
    installationCost: gc.installationCost != null ? String(gc.installationCost) : '',
    installationCurrency: gc.installationCurrency || 'EUR',
    installationExchangeRate: gc.installationExchangeRate != null ? String(gc.installationExchangeRate) : '',
    installationCostTry: gc.installationCostTry != null ? String(gc.installationCostTry) : '',
    installationInvoiceKey: gc.installationInvoiceKey || '',
    salesPrice: gc.salesPrice != null ? String(gc.salesPrice) : '',
    salesCurrency: gc.salesCurrency || 'EUR',
    salesExchangeRate: gc.salesExchangeRate != null ? String(gc.salesExchangeRate) : '',
    salesPriceTry: gc.salesPriceTry != null ? String(gc.salesPriceTry) : '',
    financingDays: gc.financingDays != null ? String(gc.financingDays) : '',
    hasSalesInvoice: !!gc.hasSalesInvoice,
    salesInvoiceKey: gc.salesInvoiceKey || '',
    hasContract: !!gc.hasContract,
    contractKey: gc.contractKey || '',
    additionalCosts: getAdditionalCosts('GENERAL_COSTS', gc),
  };

  return form;
};

// ─── Sub-components ────────────────────────────────────────────────────────────

const StatusBadge = ({ status }) => {
  const map = {
    NOT_STARTED: { label: 'Başlanmadı', cls: 'badge-not-started' },
    IN_PROGRESS: { label: 'Devam Ediyor', cls: 'badge-in-progress' },
    SAVED: { label: 'Kaydedildi', cls: 'badge-saved' },
    COMPLETED: { label: 'Tamamlandı', cls: 'badge-completed' },
  };
  const { label, cls } = map[status] || { label: status, cls: '' };
  return <span className={`section-status-badge ${cls}`}>{label}</span>;
};

const CurrencyInput = ({ label, amountField, currencyField, rateField, tryField, section, form, onChange, rates, required }) => {
  const amount = form[section][amountField] || '';
  const currency = form[section][currencyField] || 'EUR';
  const rate = form[section][rateField] || '';
  const tryVal = form[section][tryField] || '';

  const handleAmountChange = (val) => {
    const numVal = parseFormattedNumber(val);
    const num = typeof numVal === 'number' ? numVal : parseFloat(String(numVal).replace(',', '.'));
    const storedVal = (val === '' || val === null) ? '' : (!isNaN(num) ? String(num) : val);
    let newRate = parseFloat(rate);
    let newTry = '';
    if (currency === 'TRY') {
      newTry = !isNaN(num) ? num.toFixed(2) : '';
    } else if (!isNaN(num) && !isNaN(newRate)) {
      newTry = (num * newRate).toFixed(2);
    }
    onChange(section, amountField, storedVal);
    if (tryField) onChange(section, tryField, newTry);
  };

  const handleAmountBlur = () => {
    const numVal = parseFormattedNumber(amount);
    const num = typeof numVal === 'number' ? numVal : parseFloat(String(numVal).replace(',', '.'));
    if (!isNaN(num) && amount !== '') {
      onChange(section, amountField, String(num));
    }
  };

  const handleRateChange = (val) => {
    onChange(section, rateField, val);
    const numVal = parseFormattedNumber(amount);
    const num = typeof numVal === 'number' ? numVal : parseFloat(String(numVal).replace(',', '.'));
    const numRate = parseFloat(String(val).replace(',', '.'));
    if (currency === 'TRY') {
      if (!isNaN(num)) onChange(section, tryField, num.toFixed(2));
    } else if (!isNaN(num) && !isNaN(numRate)) {
      onChange(section, tryField, (num * numRate).toFixed(2));
    }
  };

  const handleCurrencyChange = (val) => {
    const numVal = parseFormattedNumber(amount);
    const num = typeof numVal === 'number' ? numVal : parseFloat(String(numVal).replace(',', '.'));
    const currentRate = parseFloat(rate) || 1;
    onChange(section, currencyField, val);
    if (val === 'TRY') {
      const eurRate = rates?.EUR ?? currentRate;
      const newRate = parseFloat(eurRate) || 1;
      if (rateField) onChange(section, rateField, String(newRate));
      if (!isNaN(num)) onChange(section, tryField, num.toFixed(2));
      else if (tryField) onChange(section, tryField, amount);
    } else {
      const newRate = rates?.[val] ?? currentRate;
      const r = parseFloat(newRate) || 1;
      if (rateField) onChange(section, rateField, r.toFixed(4));
      if (!isNaN(num)) {
        const amountInOrig = currency === 'TRY' ? num / currentRate : num;
        const tryAmount = amountInOrig * r;
        onChange(section, tryField, tryAmount.toFixed(2));
      }
      if (currency === 'TRY' && !isNaN(num) && currentRate > 0) {
        onChange(section, amountField, (num / currentRate).toFixed(2));
      }
    }
  };

  return (
    <div className="currency-input-group">
      <label className="field-label">{label}{required && <span className="required-star">*</span>}</label>
      <div className="currency-row">
        <input
          type="text"
          inputMode="decimal"
          className="input-field amount-field"
          placeholder="0,00"
          value={formatNumberForInput(amount)}
          onChange={(e) => handleAmountChange(e.target.value)}
          onBlur={handleAmountBlur}
        />
        <select
          className="select-field currency-select"
          value={currency}
          onChange={(e) => handleCurrencyChange(e.target.value)}
        >
          {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <div className="exchange-row">
        <div className="exchange-rate-group">
          <label className="field-label-small">1 {currency === 'TRY' ? 'EUR' : currency} = </label>
          <input
            type="text"
            inputMode="decimal"
            className="input-field rate-field"
            placeholder="Kur"
            value={rate}
            onChange={(e) => handleRateChange(e.target.value)}
          />
          <span className="field-label-small">TRY</span>
        </div>
      </div>
    </div>
  );
};

const FileUploadField = ({ label, fieldKey, section, currentKey, projectId, onUploaded, onRemoved, onError }) => {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const result = await accountingService.uploadDocument(projectId, file);
      onUploaded(section, fieldKey, result.key);
    } catch (err) {
      onError('Dosya yüklenemedi: ' + (err.message || 'Bilinmeyen hata'));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleRemove = () => {
    if (onRemoved) onRemoved(section, fieldKey);
  };

  return (
    <div className="file-upload-field">
      <label className="field-label">{label}</label>
      <div className="file-upload-row">
        {currentKey ? (
          <div className="file-uploaded">
            <AiOutlineCheckCircle className="file-icon-ok" />
            <a href={currentKey} target="_blank" rel="noopener noreferrer" className="file-link">
              Yüklendi — görüntüle
            </a>
          </div>
        ) : (
          <span className="file-not-uploaded">Henüz yüklenmedi</span>
        )}
        <button
          type="button"
          className="btn-upload"
          onClick={() => fileRef.current && fileRef.current.click()}
          disabled={uploading}
        >
          <AiOutlineUpload />
          {uploading ? 'Yükleniyor...' : currentKey ? 'Değiştir' : 'Yükle'}
        </button>
        {currentKey && onRemoved && (
          <button type="button" className="btn-upload btn-remove" onClick={handleRemove} title="Belgeyi kaldır">
            <AiOutlineDelete /> Kaldır
          </button>
        )}
        <input type="file" ref={fileRef} style={{ display: 'none' }} onChange={handleFileChange} />
      </div>
    </div>
  );
};

const AdditionalCostRow = ({ item, index, section, projectId, onChange, onRemove, onUploaded, onError, rates }) => {
  const handleCurrencyChange = (val) => {
    onChange(section, index, 'currency', val);
    if (rates && val !== 'TRY') {
      const newRate = rates[val] || '';
      if (newRate) {
        onChange(section, index, 'exchangeRate', parseFloat(newRate).toFixed(4));
        const numVal = parseFormattedNumber(item.amount);
        const num = typeof numVal === 'number' ? numVal : parseFloat(String(numVal).replace(',', '.'));
        if (!isNaN(num)) {
          onChange(section, index, 'amountTry', (num * newRate).toFixed(2));
        }
      }
    } else if (val === 'TRY') {
      onChange(section, index, 'exchangeRate', '1');
      onChange(section, index, 'amountTry', item.amount);
    }
  };

  const handleAmountChange = (val) => {
    const numVal = parseFormattedNumber(val);
    const num = typeof numVal === 'number' ? numVal : parseFloat(String(numVal).replace(',', '.'));
    const storedVal = (val === '' || val === null) ? '' : (!isNaN(num) ? String(num) : val);
    onChange(section, index, 'amount', storedVal);
    const numRate = parseFloat(item.exchangeRate);
    if (!isNaN(num) && !isNaN(numRate)) {
      onChange(section, index, 'amountTry', (num * numRate).toFixed(2));
    }
  };

  const handleAmountBlur = () => {
    const numVal = parseFormattedNumber(item.amount);
    const num = typeof numVal === 'number' ? numVal : parseFloat(String(numVal).replace(',', '.'));
    if (!isNaN(num) && item.amount !== '') {
      onChange(section, index, 'amount', String(num));
    }
  };

  const handleRateChange = (val) => {
    onChange(section, index, 'exchangeRate', val);
    const numVal = parseFormattedNumber(item.amount);
    const num = typeof numVal === 'number' ? numVal : parseFloat(String(numVal).replace(',', '.'));
    const numRate = parseFloat(String(val).replace(',', '.'));
    if (!isNaN(num) && !isNaN(numRate)) {
      onChange(section, index, 'amountTry', (num * numRate).toFixed(2));
    }
  };

  return (
    <div className="additional-cost-row-wrap">
      <div className="additional-cost-row">
        <input
          type="text"
          className="input-field"
          placeholder="Kalem adı"
          value={item.itemName}
          onChange={(e) => onChange(section, index, 'itemName', e.target.value)}
        />
        <input
          type="text"
          inputMode="decimal"
          className="input-field amount-field"
          placeholder="Tutar"
          value={formatNumberForInput(item.amount)}
          onChange={(e) => handleAmountChange(e.target.value)}
          onBlur={handleAmountBlur}
        />
        <select
          className="select-field currency-select"
          value={item.currency}
          onChange={(e) => handleCurrencyChange(e.target.value)}
        >
          {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <button type="button" className="btn-icon-danger" onClick={() => onRemove(section, index)}>
          <AiOutlineDelete />
        </button>
      </div>
      {item.currency !== 'TRY' && (
        <div className="exchange-row additional-cost-exchange">
          <div className="exchange-rate-group">
            <label className="field-label-small">1 {item.currency} = </label>
            <input
              type="text"
              inputMode="decimal"
              className="input-field rate-field"
              placeholder="Kur"
              value={item.exchangeRate ?? ''}
              onChange={(e) => handleRateChange(e.target.value)}
            />
            <span className="field-label-small">TRY</span>
          </div>
          {item.amountTry && item.exchangeRate && parseFloat(item.exchangeRate) > 0 && (
            <div className="try-equivalent">
              ≈ <strong>€{(parseFloat(item.amountTry) / parseFloat(item.exchangeRate)).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
            </div>
          )}
        </div>
      )}
      <div className="additional-cost-upload-row">
        <FileUploadField label="Fatura" fieldKey="invoiceKey" section={section} currentKey={item.invoiceKey || ''} projectId={projectId} onUploaded={(sec, field, key) => onChange(section, index, 'invoiceKey', key)} onRemoved={() => onChange(section, index, 'invoiceKey', '')} onError={onError} />
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const ProjeMuhasebesi = () => {
  const { canEdit, isAdmin } = useAuth();

  // Project list
  const [projects, setProjects] = useState([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [projectsError, setProjectsError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected project + draft
  const [selectedProject, setSelectedProject] = useState(null);
  const [draft, setDraft] = useState(null); // raw DTO from backend
  const [form, setForm] = useState(emptyDraftForm());
  const [draftLoading, setDraftLoading] = useState(false);
  const [draftError, setDraftError] = useState('');

  // Section UI
  const [activeSection, setActiveSection] = useState('machinePurchase');
  const [saving, setSaving] = useState({});
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');

  // Exchange rates
  const [rates, setRates] = useState({ EUR: 1, USD: 1, TRY: 1 });
  const [ratesSource, setRatesSource] = useState('');
  const [ratesLoading, setRatesLoading] = useState(false);

  // Section panel scroll ref
  const sectionPanelRef = useRef(null);

  // Pending section to navigate to after project selection
  const pendingSectionRef = useRef(null);

  // Admin override for editing completed drafts
  const [adminEditMode, setAdminEditMode] = useState(false);

  // Determine if the current form is editable
  const isEditable = () => {
    if (!canEdit()) return false;
    // Lock editing if project has status OFFER_SENT or SOLD
    const projectStatus = selectedProject?.status;
    if (projectStatus === 'OFFER_SENT' || projectStatus === 'SOLD') return false;
    // If draft is completed, only admin can edit (with override)
    if (draft?.draftStatus === 'COMPLETED') {
      return isAdmin() && adminEditMode;
    }
    return true;
  };

  // ── Load exchange rates on mount ──
  useEffect(() => {
    setRatesLoading(true);
    getExchangeRates()
      .then(r => {
        setRates(r);
        setRatesSource(r.source || '');
      })
      .catch(() => {})
      .finally(() => setRatesLoading(false));
  }, []);

  // Notification bell state
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  // Accounting summaries for project cards
  const [accountingSummaries, setAccountingSummaries] = useState({});
  const [summariesLoading, setSummariesLoading] = useState(true);

  // Load notifications and accounting summaries on mount
  useEffect(() => {
    setNotificationsLoading(true);
    accountingService.getActiveNotifications()
      .then(data => setNotifications(Array.isArray(data) ? data : []))
      .catch(() => {
        // Fallback to legacy endpoint if new one not available yet
        accountingService.getMissingCostNotifications()
          .then(data => setNotifications(Array.isArray(data) ? data : []))
          .catch(() => {});
      })
      .finally(() => setNotificationsLoading(false));

    // Load accounting summaries for card display
    setSummariesLoading(true);
    accountingService.getProjectAccountingSummaries()
      .then(data => {
        const map = {};
        (Array.isArray(data) ? data : []).forEach(s => { map[s.projectId] = s; });
        setAccountingSummaries(map);
      })
      .catch(() => {})
      .finally(() => setSummariesLoading(false));
  }, []);

  // ── Refresh notifications and summaries ──
  const refreshNotificationsAndSummaries = useCallback(() => {
    accountingService.getActiveNotifications()
      .then(data => setNotifications(Array.isArray(data) ? data : []))
      .catch(() => {
        accountingService.getMissingCostNotifications()
          .then(data => setNotifications(Array.isArray(data) ? data : []))
          .catch(() => {});
      });
    accountingService.getProjectAccountingSummaries()
      .then(data => {
        const map = {};
        (Array.isArray(data) ? data : []).forEach(s => { map[s.projectId] = s; });
        setAccountingSummaries(map);
      })
      .catch(() => {});
  }, []);

  // ── Load projects on mount ──
  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    setProjectsLoading(true);
    setProjectsError('');
    try {
      const data = await projectService.getProjects();
      setProjects((data || []).map(normalizeProjectCard));
    } catch (err) {
      setProjectsError(err.message || 'Projeler yüklenirken hata oluştu');
    } finally {
      setProjectsLoading(false);
    }
  };

  // ── When a project is selected, load its draft ──
  const handleSelectProject = useCallback(async (project) => {
    setSelectedProject(project);
    setDraftLoading(true);
    setDraftError('');
    setDraft(null);
    setActiveSection('machinePurchase');
    setSaveError('');
    setSaveSuccess('');
    try {
      const dto = await accountingService.getDraft(project.id);
      setDraft(dto);
      setForm(mapDraftToForm(dto));
      // If there's a pending section from notification click, navigate to it
      if (pendingSectionRef.current) {
        setActiveSection(pendingSectionRef.current);
        pendingSectionRef.current = null;
      }
    } catch (err) {
      setDraftError(err.message || 'Muhasebe taslağı yüklenirken hata oluştu');
    } finally {
      setDraftLoading(false);
    }
  }, []);

  // ── Auto-fill empty exchange rate fields when draft loads and rates are available ──
  useEffect(() => {
    if (!draft || !rates || rates.EUR <= 1) return;
    setForm(prev => {
      const updated = { ...prev };
      // For each section, find currency/rate field pairs and auto-fill empty rates
      const rateFieldPairs = {
        machinePurchase: [
          ['purchaseCurrency', 'purchaseExchangeRate', 'purchasePrice', 'purchasePriceTry'],
          ['externalCommissionCurrency', 'externalCommissionRate', 'externalCommission', 'externalCommissionTry'],
        ],
        machineVisit: [
          ['flightCurrency', 'flightExchangeRate', 'flightCost', 'flightCostTry'],
          ['hotelCurrency', 'hotelExchangeRate', 'hotelCost', 'hotelCostTry'],
          ['carRentalCurrency', 'carRentalExchangeRate', 'carRentalCost', 'carRentalCostTry'],
          ['additionalExpenseCurrency', 'additionalExpenseExchangeRate', 'additionalExpenseCost', 'additionalExpenseCostTry'],
        ],
        logistics: [
          ['freightCurrency', 'freightExchangeRate', 'freightCost', 'freightCostTry'],
          ['additionalLogisticsCurrency', 'additionalLogisticsExchangeRate', 'additionalLogisticsCost', 'additionalLogisticsCostTry'],
          ['brandingCurrency', 'brandingExchangeRate', 'brandingCost', 'brandingCostTry'],
          ['insuranceCurrency', 'insuranceExchangeRate', 'insuranceCost', 'insuranceCostTry'],
        ],
        customs: [
          ['entryCustomsCurrency', 'entryCustomsExchangeRate', 'entryCustomsCost', 'entryCustomsCostTry'],
          ['warehouseUnloadingCurrency', 'warehouseUnloadingExchangeRate', 'warehouseUnloadingCost', 'warehouseUnloadingCostTry'],
          ['storageCurrency', 'storageExchangeRate', 'storageCost', 'storageCostTry'],
        ],
        transfer: [
          ['transferCurrency', 'transferExchangeRate', 'transferCost', 'transferCostTry'],
        ],
        generalCosts: [
          ['installationCurrency', 'installationExchangeRate', 'installationCost', 'installationCostTry'],
          ['salesCurrency', 'salesExchangeRate', 'salesPrice', 'salesPriceTry'],
        ],
      };

      for (const [section, pairs] of Object.entries(rateFieldPairs)) {
        for (const [currField, rateField, amountField, tryField] of pairs) {
          const sectionForm = updated[section];
          // Only auto-fill if rate is empty and currency is not TRY
          if (!sectionForm[rateField] && sectionForm[currField] && sectionForm[currField] !== 'TRY') {
            const newRate = rates[sectionForm[currField]];
            if (newRate) {
              sectionForm[rateField] = parseFloat(newRate).toFixed(4);
              // Also auto-compute TRY amount if there's an amount
              const numAmount = parseFloat(sectionForm[amountField]);
              if (!isNaN(numAmount) && tryField && !sectionForm[tryField]) {
                sectionForm[tryField] = (numAmount * newRate).toFixed(2);
              }
            }
          }
        }
        updated[section] = { ...updated[section], ...updated[section] };
      }
      return updated;
    });
  }, [draft, rates]);

  // ── Generic field change ──
  const handleChange = (section, field, value) => {
    setForm(prev => ({
      ...prev,
      [section]: { ...prev[section], [field]: value },
    }));
  };

  // ── Document uploaded callback ──
  const handleDocUploaded = (section, field, key) => {
    handleChange(section, field, key);
    if (field === 'salesInvoiceKey') handleChange(section, 'hasSalesInvoice', true);
    if (field === 'contractKey') handleChange(section, 'hasContract', true);
    setSaveSuccess('Dosya yüklendi: ' + key.split('/').pop());
    setTimeout(() => setSaveSuccess(''), 3000);
  };

  const handleDocRemoved = (section, field) => {
    handleChange(section, field, '');
    const pairedFields = { salesInvoiceKey: 'hasSalesInvoice', contractKey: 'hasContract', declarationDocumentKey: 'hasDeclarationDocument', countReportDocumentKey: 'hasCountReportDocument', transferDeclarationKey: 'hasTransferDeclaration', transferCountReportKey: 'hasTransferCountReport', insuranceDocumentKey: 'insuranceDone' };
    if (pairedFields[field]) handleChange(section, pairedFields[field], false);
    setSaveSuccess('Belge kaldırıldı. Değişiklikleri kaydetmeyi unutmayın.');
    setTimeout(() => setSaveSuccess(''), 3000);
  };

  const handleUploadError = (msg) => {
    setSaveError(msg);
    setTimeout(() => setSaveError(''), 5000);
  };

  // ── Additional cost management ──
  const addAdditionalCost = (section) => {
    // Auto-fill exchange rate from TCMB rates for the default currency (EUR)
    const defaultCurrency = 'EUR';
    const defaultRate = (rates && rates[defaultCurrency]) ? parseFloat(rates[defaultCurrency]).toFixed(4) : '';
    setForm(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        additionalCosts: [
          ...(prev[section].additionalCosts || []),
          { id: null, itemName: '', amount: '', currency: defaultCurrency, amountTry: '', exchangeRate: defaultRate, invoiceKey: '' },
        ],
      },
    }));
  };

  const updateAdditionalCost = (section, index, field, value) => {
    setForm(prev => {
      const items = [...(prev[section].additionalCosts || [])];
      items[index] = { ...items[index], [field]: value };
      return { ...prev, [section]: { ...prev[section], additionalCosts: items } };
    });
  };

  const removeAdditionalCost = (section, index) => {
    setForm(prev => {
      const items = [...(prev[section].additionalCosts || [])];
      items.splice(index, 1);
      return { ...prev, [section]: { ...prev[section], additionalCosts: items } };
    });
  };

  // ── Save section ──
  const saveSection = async (section) => {
    if (!selectedProject) return;
    // costSummary section saves generalCosts data (salesPrice lives in generalCosts)
    const actualSection = section === 'costSummary' ? 'generalCosts' : section;
    const invoiceErrs = validateInvoiceRequired([actualSection]);
    if (invoiceErrs) {
      setSaveError(invoiceErrs.join(' '));
      return;
    }
    setSaving(prev => ({ ...prev, [section]: true }));
    setSaveError('');
    setSaveSuccess('');

    try {
      const sectionData = buildSectionPayload(actualSection);
      let updatedDto;
      switch (actualSection) {
        case 'machinePurchase':
          updatedDto = await accountingService.saveMachinePurchase(selectedProject.id, sectionData);
          break;
        case 'machineVisit':
          updatedDto = await accountingService.saveMachineVisit(selectedProject.id, sectionData);
          break;
        case 'logistics':
          updatedDto = await accountingService.saveLogistics(selectedProject.id, sectionData);
          break;
        case 'customs':
          updatedDto = await accountingService.saveCustoms(selectedProject.id, sectionData);
          break;
        case 'transfer':
          updatedDto = await accountingService.saveTransfer(selectedProject.id, sectionData);
          break;
        case 'generalCosts':
          updatedDto = await accountingService.saveGeneralCosts(selectedProject.id, sectionData);
          break;
        default:
          break;
      }
      if (updatedDto) {
        setDraft(updatedDto);
        setForm(mapDraftToForm(updatedDto));
      }
      setSaveSuccess(`${SECTION_LABELS[section]} kaydedildi.`);
      setTimeout(() => setSaveSuccess(''), 4000);
      // Refresh notifications and summaries after save
      refreshNotificationsAndSummaries();
    } catch (err) {
      setSaveError(err.message || 'Kayıt sırasında hata oluştu');
    } finally {
      setSaving(prev => ({ ...prev, [section]: false }));
    }
  };

  // ── Save all sections at once ──
  const [savingAll, setSavingAll] = useState(false);
  const saveAllSections = async () => {
    if (!selectedProject) return;
    const invoiceErrs = validateInvoiceRequired();
    if (invoiceErrs) {
      setSaveError(invoiceErrs.join(' '));
      return;
    }
    setSavingAll(true);
    setSaveError('');
    setSaveSuccess('');

    try {
      const allData = {};
      sectionKeys.forEach(key => {
        allData[key] = buildSectionPayload(key);
      });
      const updatedDto = await accountingService.saveAllSections(selectedProject.id, allData);
      if (updatedDto) {
        setDraft(updatedDto);
        setForm(mapDraftToForm(updatedDto));
      }
      setSaveSuccess('Tüm bölümler kaydedildi.');
      setTimeout(() => setSaveSuccess(''), 4000);
      // Refresh notifications and summaries after save
      refreshNotificationsAndSummaries();
    } catch (err) {
      setSaveError(err.message || 'Toplu kayıt sırasında hata oluştu');
    } finally {
      setSavingAll(false);
    }
  };

  // Fatura zorunluluğu: Maliyet kaleminde tutar girilmişse fatura zorunludur (şirketten fatura olmadan para çıkmaz)
  const validateInvoiceRequired = (sectionsToValidate) => {
    const num = (v) => (v === '' || v == null ? 0 : parseFloat(v));
    const hasInvoice = (invoiceKey) => invoiceKey && String(invoiceKey).trim() !== '';
    const errs = [];
    const check = (amount, invoiceKey, label) => {
      if (num(amount) > 0 && !hasInvoice(invoiceKey)) errs.push(`${label} için fatura yüklenmelidir.`);
    };
    const checkAdditional = (items, sectionLabel) => {
      (items || []).forEach((ac, i) => {
        if (num(ac.amount) > 0 && !hasInvoice(ac.invoiceKey)) {
          errs.push(`${sectionLabel} - Ek maliyet "${ac.itemName || 'Kalem ' + (i + 1)}" için fatura yüklenmelidir.`);
        }
      });
    };

    const sections = sectionsToValidate || sectionKeys;
    sections.forEach((section) => {
      const s = form[section];
      if (!s) return;
      switch (section) {
        case 'machinePurchase':
          check(s.purchasePrice, s.purchaseInvoiceKey, 'Makine alım bedeli');
          check(s.externalCommission, s.externalCommissionInvoiceKey, 'Dış komisyon');
          checkAdditional(s.additionalCosts, '1a');
          break;
        case 'machineVisit':
          if (s.visited) {
            check(s.flightCost, s.flightInvoiceKey, 'Uçuş masrafı');
            check(s.hotelCost, s.hotelInvoiceKey, 'Otel masrafı');
            check(s.carRentalCost, s.carRentalInvoiceKey, 'Araç kiralama');
            check(s.additionalExpenseCost, s.additionalExpenseInvoiceKey, 'Diğer masraflar');
            checkAdditional(s.additionalCosts, '1b');
          }
          break;
        case 'logistics':
          check(s.freightCost, s.freightInvoiceKey, 'Navlun bedeli');
          check(s.additionalLogisticsCost, s.additionalLogisticsInvoiceKey, 'Ek lojistik');
          check(s.brandingCost, s.brandingInvoiceKey, 'Brandalama');
          check(s.insuranceCost, s.insuranceDocumentKey, 'Sigorta');
          checkAdditional(s.additionalCosts, 'Lojistik');
          break;
        case 'customs':
          check(s.entryCustomsCost, s.entryCustomsInvoiceKey, 'Giriş gümrük bedeli');
          if (!s.warehousePaidByBuyer) {
            check(s.warehouseUnloadingCost, s.warehouseUnloadingInvoiceKey, 'Antrepo indirme vinç maliyeti');
            check(s.storageCost, s.storageInvoiceKey, 'Ardiye');
          }
          checkAdditional(s.additionalCosts, 'Gümrük');
          break;
        case 'transfer':
          check(s.transferCost, s.transferInvoiceKey, 'Gümrükçü Devir Bedeli');
          checkAdditional(s.additionalCosts, 'Devir İşlemleri');
          break;
        case 'generalCosts':
          check(s.installationCost, s.installationInvoiceKey, 'Kurulum maliyeti');
          checkAdditional(s.additionalCosts, 'Genel maliyetler');
          break;
        default:
          break;
      }
    });
    return errs.length > 0 ? errs : null;
  };

  const buildSectionPayload = (section) => {
    const s = form[section];
    // Convert numeric strings to numbers for backend, leave nulls for empty
    const num = (v) => (v === '' || v == null ? null : parseFloat(v));
    const int = (v) => (v === '' || v == null ? null : parseInt(v, 10));
    const str = (v) => (v === '' || v == null ? null : v);

    const mapAdditional = (items) =>
      (items || []).map((ac, idx) => ({
        id: ac.id || null,
        sectionType: sectionTypeMap[section],
        itemName: str(ac.itemName),
        amount: num(ac.amount),
        currency: str(ac.currency),
        amountTry: num(ac.amountTry),
        exchangeRate: num(ac.exchangeRate),
        invoiceKey: str(ac.invoiceKey),
        sortOrder: idx,
      }));

    switch (section) {
      case 'machinePurchase':
        return {
          purchasePrice: num(s.purchasePrice),
          purchaseCurrency: str(s.purchaseCurrency),
          purchasePriceTry: num(s.purchasePriceTry),
          purchaseExchangeRate: num(s.purchaseExchangeRate),
          externalCommission: num(s.externalCommission),
          externalCommissionCurrency: str(s.externalCommissionCurrency),
          externalCommissionTry: num(s.externalCommissionTry),
          externalCommissionRate: num(s.externalCommissionRate),
          machineCondition: str(s.machineCondition),
          equityAmount: num(s.equityAmount),
          creditAmount: num(s.creditAmount),
          creditInterestRate: num(s.creditInterestRate),
          purchaseInvoiceKey: str(s.purchaseInvoiceKey),
          externalCommissionInvoiceKey: str(s.externalCommissionInvoiceKey),
          additionalCosts: mapAdditional(s.additionalCosts),
        };
      case 'machineVisit':
        return {
          visited: !!s.visited,
          flightCost: num(s.flightCost),
          flightCurrency: str(s.flightCurrency),
          flightExchangeRate: num(s.flightExchangeRate),
          flightCostTry: num(s.flightCostTry),
          flightInvoiceKey: str(s.flightInvoiceKey),
          hotelCost: num(s.hotelCost),
          hotelCurrency: str(s.hotelCurrency),
          hotelExchangeRate: num(s.hotelExchangeRate),
          hotelCostTry: num(s.hotelCostTry),
          hotelInvoiceKey: str(s.hotelInvoiceKey),
          carRentalCost: num(s.carRentalCost),
          carRentalCurrency: str(s.carRentalCurrency),
          carRentalExchangeRate: num(s.carRentalExchangeRate),
          carRentalCostTry: num(s.carRentalCostTry),
          carRentalInvoiceKey: str(s.carRentalInvoiceKey),
          additionalExpense: num(s.additionalExpenseCost),
          additionalExpenseCurrency: str(s.additionalExpenseCurrency),
          additionalExpenseRate: num(s.additionalExpenseExchangeRate),
          additionalExpenseTry: num(s.additionalExpenseCostTry),
          additionalExpenseInvoiceKey: str(s.additionalExpenseInvoiceKey),
          additionalCosts: mapAdditional(s.additionalCosts),
        };
      case 'logistics':
        return {
          agreedCompany: str(s.agreedCompany),
          vehiclePlate: str(s.vehiclePlate),
          freightCost: num(s.freightCost),
          freightCurrency: str(s.freightCurrency),
          freightExchangeRate: num(s.freightExchangeRate),
          freightCostTry: num(s.freightCostTry),
          freightInvoiceKey: str(s.freightInvoiceKey),
          additionalLogisticsCost: num(s.additionalLogisticsCost),
          additionalLogisticsCurrency: str(s.additionalLogisticsCurrency),
          additionalLogisticsRate: num(s.additionalLogisticsExchangeRate),
          additionalLogisticsTry: num(s.additionalLogisticsCostTry),
          additionalLogisticsInvoiceKey: str(s.additionalLogisticsInvoiceKey),
          brandingCost: num(s.brandingCost),
          brandingCurrency: str(s.brandingCurrency),
          brandingExchangeRate: num(s.brandingExchangeRate),
          brandingCostTry: num(s.brandingCostTry),
          brandingInvoiceKey: str(s.brandingInvoiceKey),
          hasEx1Document: !!s.hasEx1,
          hasT1t2Document: !!s.hasT1T2,
          hasSmrDocument: !!s.hasSmr,
          hasAtrDocument: !!s.hasAtr,
          hasPackingListDocument: !!s.hasPackingList,
          ex1DocumentKey: str(s.ex1DocumentKey),
          t1t2DocumentKey: str(s.t1t2DocumentKey),
          smrDocumentKey: str(s.smrDocumentKey),
          atrDocumentKey: str(s.atrDocumentKey),
          packingListDocumentKey: str(s.packingListDocumentKey),
          insuranceDone: !!s.insuranceDone,
          insuranceCost: num(s.insuranceCost),
          insuranceCurrency: str(s.insuranceCurrency),
          insuranceExchangeRate: num(s.insuranceExchangeRate),
          insuranceCostTry: num(s.insuranceCostTry),
          insuranceDocumentKey: str(s.insuranceDocumentKey),
          additionalCosts: mapAdditional(s.additionalCosts),
        };
      case 'customs':
        return {
          entryCustomsCost: num(s.entryCustomsCost),
          entryCustomsCurrency: str(s.entryCustomsCurrency),
          entryCustomsExchangeRate: num(s.entryCustomsExchangeRate),
          entryCustomsCostTry: num(s.entryCustomsCostTry),
          entryCustomsInvoiceKey: str(s.entryCustomsInvoiceKey),
          hasDeclarationDocument: !!s.hasDeclarationDocument,
          declarationDocumentKey: str(s.declarationDocumentKey),
          hasCountReportDocument: !!s.hasCountReportDocument,
          countReportDocumentKey: str(s.countReportDocumentKey),
          warehouseUnloadingCost: num(s.warehouseUnloadingCost),
          warehouseUnloadingCurrency: str(s.warehouseUnloadingCurrency),
          warehouseUnloadingRate: num(s.warehouseUnloadingExchangeRate),
          warehouseUnloadingTry: num(s.warehouseUnloadingCostTry),
          warehouseUnloadingInvoiceKey: str(s.warehouseUnloadingInvoiceKey),
          storageCost: num(s.storageCost),
          storageCurrency: str(s.storageCurrency),
          storageExchangeRate: num(s.storageExchangeRate),
          storageCostTry: num(s.storageCostTry),
          storageInvoiceKey: str(s.storageInvoiceKey),
          warehousePaidByBuyer: !!s.warehousePaidByBuyer,
          additionalCosts: mapAdditional(s.additionalCosts),
        };
      case 'transfer':
        return {
          transferCost: num(s.transferCost),
          transferCurrency: str(s.transferCurrency),
          transferExchangeRate: num(s.transferExchangeRate),
          transferCostTry: num(s.transferCostTry),
          transferInvoiceKey: str(s.transferInvoiceKey),
          hasTransferDeclaration: !!s.hasTransferDeclaration,
          transferDeclarationKey: str(s.transferDeclarationKey),
          hasTransferCountReport: !!s.hasTransferCountReport,
          transferCountReportKey: str(s.transferCountReportKey),
          additionalCosts: mapAdditional(s.additionalCosts),
        };
      case 'generalCosts':
        return {
          installationCost: num(s.installationCost),
          installationCurrency: str(s.installationCurrency),
          installationExchangeRate: num(s.installationExchangeRate),
          installationCostTry: num(s.installationCostTry),
          installationInvoiceKey: str(s.installationInvoiceKey),
          salesPrice: num(s.salesPrice),
          salesCurrency: str(s.salesCurrency),
          salesExchangeRate: num(s.salesExchangeRate),
          salesPriceTry: num(s.salesPriceTry),
          financingDays: int(s.financingDays),
          hasSalesInvoice: !!s.hasSalesInvoice,
          salesInvoiceKey: str(s.salesInvoiceKey),
          hasContract: !!s.hasContract,
          contractKey: str(s.contractKey),
          additionalCosts: mapAdditional(s.additionalCosts),
        };
      default:
        return {};
    }
  };

  const sectionTypeMap = {
    machinePurchase: 'MACHINE_PURCHASE',
    machineVisit: 'MACHINE_VISIT',
    logistics: 'LOGISTICS',
    customs: 'CUSTOMS',
    transfer: 'TRANSFER',
    generalCosts: 'GENERAL_COSTS',
  };

  // ── Complete draft ──
  const [completing, setCompleting] = useState(false);
  const handleCompleteDraft = async () => {
    if (!selectedProject) return;
    const invoiceErrs = validateInvoiceRequired();
    if (invoiceErrs) {
      setSaveError(invoiceErrs.join(' '));
      return;
    }
    if (!window.confirm('Tüm bölümlerin eksiksiz olduğundan emin misiniz? Tamamlandı olarak işaretlenecek.')) return;
    setCompleting(true);
    setSaveError('');
    try {
      await accountingService.completeDraft(selectedProject.id);
      // Navigate back to project list after completing
      setSelectedProject(null);
      setDraft(null);
      setForm(emptyDraftForm());
      loadProjects(); // Refresh project list
    } catch (err) {
      setSaveError(err.message || 'Tamamlama sırasında hata oluştu');
    } finally {
      setCompleting(false);
    }
  };

  // ── Filtered projects ──
  const filteredProjects = projects.filter(p => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return getProjectSearchText(p).includes(q) || (p.client?.name || '').toLowerCase().includes(q);
  });

  const sectionKeys = Object.keys(SECTION_LABELS);
  const getSectionStatus = (sectionKey) => {
    if (!draft) return 'NOT_STARTED';
    if (sectionKey === 'costSummary') {
      // Cost summary is "completed" if label price is set
      return form.generalCosts.salesPrice ? 'COMPLETED' : 'NOT_STARTED';
    }
    const statusMap = {
      machinePurchase: draft.sectionMachinePurchaseStatus,
      machineVisit: draft.sectionMachineVisitStatus,
      logistics: draft.sectionLogisticsStatus,
      customs: draft.sectionCustomsStatus,
      transfer: draft.sectionTransferStatus,
      generalCosts: draft.sectionGeneralCostsStatus,
    };
    return statusMap[sectionKey] || 'NOT_STARTED';
  };

  // ── Compute total costs from all sections (EUR bazlı) ──
  const computeTotalCosts = () => {
    const num = (v) => { const n = parseFloat(v); return isNaN(n) ? 0 : n; };
    const eurRate = num(rates?.EUR) || 38.5;
    const sumAdditionalEur = (items) => {
      if (!eurRate || eurRate <= 0) return 0;
      return (items || []).reduce((acc, ac) => acc + (num(ac.amountTry) / eurRate), 0);
    };
    const financingDays = Math.max(num(form.generalCosts.financingDays), 0);
    const purchaseRate = num(form.machinePurchase.purchaseExchangeRate) || num(rates?.EUR);
    const creditAmount = num(form.machinePurchase.creditAmount);
    const creditInterestRate = num(form.machinePurchase.creditInterestRate);
    const financingCostEur = creditAmount > 0 && creditInterestRate > 0 && financingDays > 0
      ? (creditAmount * creditInterestRate / 100) * (financingDays / 365)
      : 0;
    const financingCostTry = financingCostEur * purchaseRate;
    const toEur = (tryVal) => (eurRate > 0 ? tryVal / eurRate : 0);

    const sections = [
      {
        key: 'machinePurchase', label: '1a. Makine Alım',
        items: [
          { label: 'Makine Alım Bedeli', try: num(form.machinePurchase.purchasePriceTry), eur: toEur(num(form.machinePurchase.purchasePriceTry)), currency: form.machinePurchase.purchaseCurrency, amount: num(form.machinePurchase.purchasePrice) },
          { label: 'Dış Komisyon', try: num(form.machinePurchase.externalCommissionTry), eur: toEur(num(form.machinePurchase.externalCommissionTry)), currency: form.machinePurchase.externalCommissionCurrency, amount: num(form.machinePurchase.externalCommission) },
          { label: 'Finansman Maliyeti', try: financingCostTry, eur: financingCostEur, currency: 'EUR', amount: financingCostEur },
        ],
        additionalEur: sumAdditionalEur(form.machinePurchase.additionalCosts),
      },
      {
        key: 'machineVisit', label: '1b. Makine Ziyareti',
        items: [
          { label: 'Uçak', try: num(form.machineVisit.flightCostTry), eur: toEur(num(form.machineVisit.flightCostTry)), currency: form.machineVisit.flightCurrency, amount: num(form.machineVisit.flightCost) },
          { label: 'Otel', try: num(form.machineVisit.hotelCostTry), eur: toEur(num(form.machineVisit.hotelCostTry)), currency: form.machineVisit.hotelCurrency, amount: num(form.machineVisit.hotelCost) },
          { label: 'Araç Kiralama', try: num(form.machineVisit.carRentalCostTry), eur: toEur(num(form.machineVisit.carRentalCostTry)), currency: form.machineVisit.carRentalCurrency, amount: num(form.machineVisit.carRentalCost) },
          { label: 'Ek Masraf', try: num(form.machineVisit.additionalExpenseCostTry), eur: toEur(num(form.machineVisit.additionalExpenseCostTry)), currency: form.machineVisit.additionalExpenseCurrency, amount: num(form.machineVisit.additionalExpenseCost) },
        ],
        additionalEur: sumAdditionalEur(form.machineVisit.additionalCosts),
      },
      {
        key: 'logistics', label: '2. Lojistik',
        items: [
          { label: 'Nakliye', try: num(form.logistics.freightCostTry), eur: toEur(num(form.logistics.freightCostTry)), currency: form.logistics.freightCurrency, amount: num(form.logistics.freightCost) },
          { label: 'Ek Lojistik', try: num(form.logistics.additionalLogisticsCostTry), eur: toEur(num(form.logistics.additionalLogisticsCostTry)), currency: form.logistics.additionalLogisticsCurrency, amount: num(form.logistics.additionalLogisticsCost) },
          { label: 'Brandalama', try: num(form.logistics.brandingCostTry), eur: toEur(num(form.logistics.brandingCostTry)), currency: form.logistics.brandingCurrency, amount: num(form.logistics.brandingCost) },
          { label: 'Sigorta', try: num(form.logistics.insuranceCostTry), eur: toEur(num(form.logistics.insuranceCostTry)), currency: form.logistics.insuranceCurrency, amount: num(form.logistics.insuranceCost) },
        ],
        additionalEur: sumAdditionalEur(form.logistics.additionalCosts),
      },
      {
        key: 'customs', label: '3. Gümrük',
        items: [
          { label: 'Gümrükçü bedeli', try: num(form.customs.entryCustomsCostTry), eur: toEur(num(form.customs.entryCustomsCostTry)), currency: form.customs.entryCustomsCurrency, amount: num(form.customs.entryCustomsCost) },
          { label: 'Antrepo indirme vinç maliyeti', try: form.customs.warehousePaidByBuyer ? 0 : num(form.customs.warehouseUnloadingCostTry), eur: toEur(form.customs.warehousePaidByBuyer ? 0 : num(form.customs.warehouseUnloadingCostTry)), currency: form.customs.warehouseUnloadingCurrency, amount: num(form.customs.warehouseUnloadingCost) },
          { label: 'Ardiye', try: form.customs.warehousePaidByBuyer ? 0 : num(form.customs.storageCostTry), eur: toEur(form.customs.warehousePaidByBuyer ? 0 : num(form.customs.storageCostTry)), currency: form.customs.storageCurrency, amount: num(form.customs.storageCost) },
        ],
        additionalEur: sumAdditionalEur(form.customs.additionalCosts),
      },
      {
        key: 'transfer', label: '4. Devir İşlemleri',
        items: [
          { label: 'Gümrükçü Devir Bedeli', try: num(form.transfer.transferCostTry), eur: toEur(num(form.transfer.transferCostTry)), currency: form.transfer.transferCurrency, amount: num(form.transfer.transferCost) },
        ],
        additionalEur: sumAdditionalEur(form.transfer.additionalCosts),
      },
      {
        key: 'generalCosts', label: '5. Genel Maliyetler',
        items: [
          { label: 'Kurulum', try: num(form.generalCosts.installationCostTry), eur: toEur(num(form.generalCosts.installationCostTry)), currency: form.generalCosts.installationCurrency, amount: num(form.generalCosts.installationCost) },
        ],
        additionalEur: sumAdditionalEur(form.generalCosts.additionalCosts),
      },
    ];

    let grandTotalEur = 0;
    for (const sec of sections) {
      sec.sectionTotalEur = sec.items.reduce((acc, it) => acc + it.eur, 0) + sec.additionalEur;
      grandTotalEur += sec.sectionTotalEur;
    }

    return { sections, grandTotalEur, eurRate };
  };

  // ── Export cost summary as Excel (backend API - same format as admin/aktif projeler) ──
  const [exportingCostExcel, setExportingCostExcel] = useState(false);
  const handleExportCostExcel = async () => {
    if (!selectedProject?.id) return;
    setExportingCostExcel(true);
    try {
      await projectService.exportCostSummaryToExcel(selectedProject.id);
    } catch (err) {
      console.error('Maliyet Excel indirme hatası:', err);
      alert(err?.message || 'Maliyet Excel indirilemedi.');
    } finally {
      setExportingCostExcel(false);
    }
  };

  // ── Render cost summary (Section 6) - EUR bazlı ──
  const renderCostSummary = () => {
    const { sections, grandTotalEur, eurRate } = computeTotalCosts();
    const gc = form.generalCosts;
    const salesPrice = parseFloat(gc.salesPrice) || 0;
    const salesCurrency = gc.salesCurrency || 'EUR';
    const salesExchangeRate = parseFloat(gc.salesExchangeRate) || eurRate;
    const labelPriceEur = salesCurrency === 'EUR' ? salesPrice : (parseFloat(gc.salesPriceTry) || 0) / (salesExchangeRate || eurRate);
    const profitEur = labelPriceEur - grandTotalEur;
    const margin = labelPriceEur > 0 ? ((profitEur / labelPriceEur) * 100) : 0;
    const fmtEur = (v) => `€${v.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    return (
      <div className="section-form cost-summary-section">
        {/* Cost Breakdown */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, color: '#1a202c' }}>Maliyet Özeti (EUR)</h3>
          <button
            onClick={handleExportCostExcel}
            disabled={exportingCostExcel}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              background: '#059669', color: '#fff', border: 'none',
              borderRadius: '6px', padding: '8px 14px', fontSize: '13px',
              fontWeight: 600, cursor: exportingCostExcel ? 'wait' : 'pointer',
              opacity: exportingCostExcel ? 0.8 : 1
            }}
            title="Maliyet detaylarını Excel olarak indir (backend ile aynı format)"
          >
            {exportingCostExcel ? <AiOutlineLoading3Quarters className="spin" /> : <AiOutlineDownload />}
            {exportingCostExcel ? 'İndiriliyor...' : 'Maliyet Excel İndir'}
          </button>
        </div>
        <div style={{ background: '#f9fafb', borderRadius: '8px', padding: '16px', marginBottom: '24px' }}>
          {sections.map(sec => (
            sec.sectionTotalEur > 0 && (
              <div key={sec.key} style={{ marginBottom: '12px' }}>
                <div style={{ fontWeight: 600, fontSize: '13px', color: '#4a5568', marginBottom: '4px' }}>{sec.label}</div>
                {sec.items.filter(it => it.eur > 0).map((it, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: '2px 0 2px 16px' }}>
                    <span style={{ color: '#718096' }}>{it.label} {it.currency !== 'TRY' && it.amount > 0 ? `(${it.amount.toLocaleString('tr-TR', { maximumFractionDigits: 2 })} ${it.currency})` : ''}</span>
                    <span>{fmtEur(it.eur)}</span>
                  </div>
                ))}
                {sec.additionalEur > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: '2px 0 2px 16px' }}>
                    <span style={{ color: '#718096' }}>Ek Kalemler</span>
                    <span>{fmtEur(sec.additionalEur)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 600, padding: '4px 0 4px 16px', borderTop: '1px solid #e2e8f0', marginTop: '4px' }}>
                  <span>Alt Toplam</span>
                  <span>{fmtEur(sec.sectionTotalEur)}</span>
                </div>
              </div>
            )
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: 700, padding: '12px 0 0', borderTop: '2px solid #2563eb', marginTop: '8px', color: '#1a202c' }}>
            <span>TOPLAM MALİYET</span>
            <span>{fmtEur(grandTotalEur)}</span>
          </div>
        </div>

        <h3 style={{ marginBottom: '16px', color: '#1a202c' }}>Finansman</h3>
        <div className="form-grid">
          <div className="form-field">
            <label className="field-label">Finansman Gün Sayısı</label>
            <input
              type="number"
              className="input-field full-width"
              placeholder="Satış sırasında otomatik doldurulur"
              value={gc.financingDays}
              onChange={(e) => handleChange('generalCosts', 'financingDays', e.target.value)}
              step="1"
              min="0"
            />
            <div style={{ marginTop: '8px', fontSize: '12px', color: '#64748b' }}>
              Finansman maliyeti = kredi tutarı x faiz oranı x (gün / 365)
            </div>
          </div>
          <div className="form-field">
            <label className="field-label">Hesaplanan Finansman Maliyeti</label>
            <div style={{ padding: '12px 14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', color: '#334155' }}>
              {(() => {
                const days = parseFloat(gc.financingDays) || 0;
                const credit = parseFloat(form.machinePurchase.creditAmount) || 0;
                const rate = parseFloat(form.machinePurchase.creditInterestRate) || 0;
                const financeEur = credit > 0 && rate > 0 && days > 0 ? (credit * rate / 100) * (days / 365) : 0;
                return `${financeEur.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EUR`;
              })()}
            </div>
          </div>
        </div>

        {/* Label Price Input */}
        <h3 style={{ marginBottom: '16px', color: '#1a202c' }}>Etiket Fiyatı</h3>
        <div className="form-grid">
          <CurrencyInput label="Etiket Fiyatı" amountField="salesPrice" currencyField="salesCurrency" rateField="salesExchangeRate" tryField="salesPriceTry" section="generalCosts" form={form} onChange={handleChange} rates={rates} required />
        </div>

        {/* Profit Analysis */}
        {labelPriceEur > 0 && (
          <div style={{ marginTop: '24px' }}>
            <h3 style={{ marginBottom: '16px', color: '#1a202c' }}>Kâr Analizi (EUR)</h3>
            <div style={{ background: '#f9fafb', borderRadius: '8px', padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', padding: '6px 0' }}>
                <span>Toplam Maliyet</span>
                <span style={{ fontWeight: 600 }}>{fmtEur(grandTotalEur)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', padding: '6px 0' }}>
                <span>Etiket Fiyatı</span>
                <span style={{ fontWeight: 600 }}>{fmtEur(labelPriceEur)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: 700, padding: '12px 0 0', borderTop: '2px solid ' + (profitEur >= 0 ? '#38a169' : '#e53e3e'), marginTop: '8px', color: profitEur >= 0 ? '#38a169' : '#e53e3e' }}>
                <span>Net Kâr</span>
                <span>{fmtEur(profitEur)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', padding: '6px 0', color: profitEur >= 0 ? '#38a169' : '#e53e3e' }}>
                <span>Kâr Marjı</span>
                <span style={{ fontWeight: 600 }}>{margin.toFixed(1)}%</span>
              </div>
            </div>
          </div>
        )}

        {/* Sales Documents */}
        <div style={{ marginTop: '24px' }}>
          <h3 style={{ marginBottom: '16px', color: '#1a202c' }}>Satış Belgeleri</h3>
          <div className="doc-grid">
            <div className="doc-row">
              <label className="checkbox-label">
                <input type="checkbox" checked={!!gc.salesInvoiceKey} disabled />
                <span>Satış Faturası</span>
              </label>
              <FileUploadField label="" fieldKey="salesInvoiceKey" section="generalCosts" currentKey={gc.salesInvoiceKey} projectId={selectedProject?.id} onUploaded={(sec, field, key) => { handleDocUploaded(sec, field, key); handleChange(sec, 'hasSalesInvoice', true); }} onRemoved={handleDocRemoved} onError={handleUploadError} />
            </div>
            <div className="doc-row">
              <label className="checkbox-label">
                <input type="checkbox" checked={!!gc.contractKey} disabled />
                <span>Sözleşme</span>
              </label>
              <FileUploadField label="" fieldKey="contractKey" section="generalCosts" currentKey={gc.contractKey} projectId={selectedProject?.id} onUploaded={(sec, field, key) => { handleDocUploaded(sec, field, key); handleChange(sec, 'hasContract', true); }} onRemoved={handleDocRemoved} onError={handleUploadError} />
            </div>
          </div>
        </div>
        {isEditable() && (
          <div className="section-save-actions" style={{ marginTop: '24px' }}>
            <button className="btn-save" onClick={() => saveSection('generalCosts')} disabled={saving.generalCosts || savingAll}>
              <AiOutlineSave /> {saving.generalCosts ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
            <button className="btn-save" onClick={saveAllSections} disabled={savingAll} style={{ background: '#2b6cb0' }} title="Tüm bölümleri tek seferde kaydet">
              <AiOutlineSave /> {savingAll ? 'Kaydediliyor...' : 'Tümünü Kaydet'}
            </button>
          </div>
        )}
      </div>
    );
  };

  // ── Render section form ──
  const renderSection = () => {
    const s = activeSection;
    const f = form[s];

    switch (s) {
      case 'machinePurchase':
        return (
          <div className="section-form">
            <div className="form-grid">
              <CurrencyInput label="Makine Alım Bedeli" amountField="purchasePrice" currencyField="purchaseCurrency" rateField="purchaseExchangeRate" tryField="purchasePriceTry" section={s} form={form} onChange={handleChange} rates={rates} required />
              <CurrencyInput label="Dış Komisyon" amountField="externalCommission" currencyField="externalCommissionCurrency" rateField="externalCommissionRate" tryField="externalCommissionTry" section={s} form={form} onChange={handleChange} rates={rates} />
            </div>

            <div className="form-grid">
              <div className="form-field">
                <label className="field-label">Makine Durumu<span className="required-star">*</span></label>
                <select className="select-field full-width" value={f.machineCondition} onChange={(e) => handleChange(s, 'machineCondition', e.target.value)}>
                  <option value="">Seçin...</option>
                  <option value="new">Sıfır</option>
                  <option value="used">2. El</option>
                </select>
              </div>
              <div className="form-field">
                <label className="field-label">Ödeme Dağılımı (EUR)</label>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '10px' }}>
                  Makine alımı öz kaynak ve kredi ile birlikte yapılabilir. Kredi faiz maliyeti sadece kredi çekilen tutar üzerinden hesaplanır.
                </div>
              </div>
            </div>

            <div className="form-grid">
              <div className="form-field">
                <label className="field-label">Öz Kaynak Tutarı (EUR)</label>
                <input type="number" className="input-field full-width" placeholder="0.00" value={f.equityAmount} onChange={(e) => handleChange(s, 'equityAmount', e.target.value)} step="0.01" min="0" />
              </div>
              <div className="form-field">
                <label className="field-label">Kredi Tutarı (EUR)</label>
                <input type="number" className="input-field full-width" placeholder="0.00" value={f.creditAmount} onChange={(e) => handleChange(s, 'creditAmount', e.target.value)} step="0.01" min="0" />
              </div>
            </div>

            <div className="form-grid">
              <div className="form-field">
                <label className="field-label">Kredi Faiz Oranı (%)</label>
                <input type="number" className="input-field full-width" placeholder="0.00" value={f.creditInterestRate} onChange={(e) => handleChange(s, 'creditInterestRate', e.target.value)} step="0.01" min="0" />
              </div>
              <div className="form-field">
                <label className="field-label">Kontrol Toplamı</label>
                <div style={{ padding: '12px 14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', color: '#334155' }}>
                  {(parseFloat(f.equityAmount || 0) + parseFloat(f.creditAmount || 0)).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EUR
                </div>
              </div>
            </div>

            <div className="form-grid">
              <FileUploadField label="Alım Faturası" fieldKey="purchaseInvoiceKey" section={s} currentKey={f.purchaseInvoiceKey} projectId={selectedProject?.id} onUploaded={handleDocUploaded} onRemoved={handleDocRemoved} onError={handleUploadError} />
              <FileUploadField label="Dış Komisyon Faturası" fieldKey="externalCommissionInvoiceKey" section={s} currentKey={f.externalCommissionInvoiceKey} projectId={selectedProject?.id} onUploaded={handleDocUploaded} onRemoved={handleDocRemoved} onError={handleUploadError} />
            </div>

            <AdditionalCosts section={s} items={f.additionalCosts} projectId={selectedProject?.id} onAdd={addAdditionalCost} onChange={updateAdditionalCost} onRemove={removeAdditionalCost} onUploaded={handleDocUploaded} onError={handleUploadError} rates={rates} />
            {isEditable() && (
              <div className="section-save-actions">
                <button className="btn-save" onClick={() => saveSection(s)} disabled={saving[s] || savingAll}>
                  <AiOutlineSave /> {saving[s] ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
                <button className="btn-save" onClick={saveAllSections} disabled={savingAll} style={{ background: '#2b6cb0' }} title="Tüm bölümleri tek seferde kaydet">
                  <AiOutlineSave /> {savingAll ? 'Kaydediliyor...' : 'Tümünü Kaydet'}
                </button>
              </div>
            )}
          </div>
        );

      case 'machineVisit':
        return (
          <div className="section-form">
            <div className="toggle-row">
              <label className="toggle-label">Makine Ziyareti Yapıldı Mı?</label>
              <label className="switch">
                <input type="checkbox" checked={f.visited} onChange={(e) => handleChange(s, 'visited', e.target.checked)} />
                <span className="slider round"></span>
              </label>
              <span className={f.visited ? 'toggle-yes' : 'toggle-no'}>{f.visited ? 'Evet' : 'Hayır'}</span>
            </div>

            {f.visited && (
              <>
                <div className="form-grid">
                  <CurrencyInput label="Uçuş Masrafı" amountField="flightCost" currencyField="flightCurrency" rateField="flightExchangeRate" tryField="flightCostTry" section={s} form={form} onChange={handleChange} rates={rates} />
                  <CurrencyInput label="Otel Masrafı" amountField="hotelCost" currencyField="hotelCurrency" rateField="hotelExchangeRate" tryField="hotelCostTry" section={s} form={form} onChange={handleChange} rates={rates} />
                </div>
                <div className="form-grid">
                  <CurrencyInput label="Araç Kiralama" amountField="carRentalCost" currencyField="carRentalCurrency" rateField="carRentalExchangeRate" tryField="carRentalCostTry" section={s} form={form} onChange={handleChange} rates={rates} />
                  <CurrencyInput label="Diğer Masraflar" amountField="additionalExpenseCost" currencyField="additionalExpenseCurrency" rateField="additionalExpenseExchangeRate" tryField="additionalExpenseCostTry" section={s} form={form} onChange={handleChange} rates={rates} />
                </div>
                <div className="form-grid">
                  <FileUploadField label="Uçuş Faturası" fieldKey="flightInvoiceKey" section={s} currentKey={f.flightInvoiceKey} projectId={selectedProject?.id} onUploaded={handleDocUploaded} onRemoved={handleDocRemoved} onError={handleUploadError} />
                  <FileUploadField label="Otel Faturası" fieldKey="hotelInvoiceKey" section={s} currentKey={f.hotelInvoiceKey} projectId={selectedProject?.id} onUploaded={handleDocUploaded} onRemoved={handleDocRemoved} onError={handleUploadError} />
                </div>
                <div className="form-grid">
                  <FileUploadField label="Araç Kiralama Faturası" fieldKey="carRentalInvoiceKey" section={s} currentKey={f.carRentalInvoiceKey} projectId={selectedProject?.id} onUploaded={handleDocUploaded} onRemoved={handleDocRemoved} onError={handleUploadError} />
                  <FileUploadField label="Diğer Masraflar Faturası" fieldKey="additionalExpenseInvoiceKey" section={s} currentKey={f.additionalExpenseInvoiceKey} projectId={selectedProject?.id} onUploaded={handleDocUploaded} onRemoved={handleDocRemoved} onError={handleUploadError} />
                </div>
              </>
            )}
            <AdditionalCosts section={s} items={f.additionalCosts} projectId={selectedProject?.id} onAdd={addAdditionalCost} onChange={updateAdditionalCost} onRemove={removeAdditionalCost} onUploaded={handleDocUploaded} onError={handleUploadError} rates={rates} />
            {isEditable() && (
              <div className="section-save-actions">
                <button className="btn-save" onClick={() => saveSection(s)} disabled={saving[s] || savingAll}>
                  <AiOutlineSave /> {saving[s] ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
                <button className="btn-save" onClick={saveAllSections} disabled={savingAll} style={{ background: '#2b6cb0' }} title="Tüm bölümleri tek seferde kaydet">
                  <AiOutlineSave /> {savingAll ? 'Kaydediliyor...' : 'Tümünü Kaydet'}
                </button>
              </div>
            )}
          </div>
        );

      case 'logistics':
        return (
          <div className="section-form">
            <div className="form-grid">
              <div className="form-field">
                <label className="field-label">Anlaşılan Firma</label>
                <input type="text" className="input-field full-width" placeholder="Nakliye firması" value={f.agreedCompany} onChange={(e) => handleChange(s, 'agreedCompany', e.target.value)} />
              </div>
              <div className="form-field">
                <label className="field-label">Araç Plakası</label>
                <input type="text" className="input-field full-width" placeholder="34 AB 1234" value={f.vehiclePlate} onChange={(e) => handleChange(s, 'vehiclePlate', e.target.value)} />
              </div>
            </div>

            <div className="form-grid">
              <CurrencyInput label="Navlun Bedeli" amountField="freightCost" currencyField="freightCurrency" rateField="freightExchangeRate" tryField="freightCostTry" section={s} form={form} onChange={handleChange} rates={rates} />
              <CurrencyInput label="Ek Lojistik Maliyeti" amountField="additionalLogisticsCost" currencyField="additionalLogisticsCurrency" rateField="additionalLogisticsExchangeRate" tryField="additionalLogisticsCostTry" section={s} form={form} onChange={handleChange} rates={rates} />
            </div>

            <div className="form-grid">
              <CurrencyInput label="Brandalama Maliyeti" amountField="brandingCost" currencyField="brandingCurrency" rateField="brandingExchangeRate" tryField="brandingCostTry" section={s} form={form} onChange={handleChange} rates={rates} />
            </div>

            <div className="documents-section">
              <h4 className="subsection-title">Belgeler</h4>
              <div className="doc-grid">
                {[
                  { key: 'hasEx1', docKey: 'ex1DocumentKey', label: 'Ex-1 Belgesi' },
                  { key: 'hasT1T2', docKey: 't1t2DocumentKey', label: 'T1/T2 Belgesi' },
                  { key: 'hasSmr', docKey: 'smrDocumentKey', label: 'CMR Belgesi' },
                  { key: 'hasAtr', docKey: 'atrDocumentKey', label: 'ATR Belgesi' },
                  { key: 'hasPackingList', docKey: 'packingListDocumentKey', label: 'Packing List' },
                ].map(({ key, docKey, label }) => (
                  <div key={key} className="doc-row">
                    <label className="checkbox-label">
                      <input type="checkbox" checked={!!f[docKey]} disabled />
                      <span>{label}</span>
                    </label>
                    <FileUploadField label="" fieldKey={docKey} section={s} currentKey={f[docKey]} projectId={selectedProject?.id} onUploaded={(sec, field, fileKey) => { handleDocUploaded(sec, field, fileKey); handleChange(sec, key, true); }} onRemoved={handleDocRemoved} onError={handleUploadError} />
                  </div>
                ))}
              </div>
            </div>

            <div className="form-grid">
              <CurrencyInput label="Sigorta Bedeli" amountField="insuranceCost" currencyField="insuranceCurrency" rateField="insuranceExchangeRate" tryField="insuranceCostTry" section={s} form={form} onChange={handleChange} rates={rates} />
              <FileUploadField label="Sigorta Belgesi" fieldKey="insuranceDocumentKey" section={s} currentKey={f.insuranceDocumentKey} projectId={selectedProject?.id} onUploaded={(sec, field, key) => { handleDocUploaded(sec, field, key); handleChange(sec, 'insuranceDone', true); }} onRemoved={handleDocRemoved} onError={handleUploadError} />
            </div>

            <div className="form-grid">
              <FileUploadField label="Navlun Faturası" fieldKey="freightInvoiceKey" section={s} currentKey={f.freightInvoiceKey} projectId={selectedProject?.id} onUploaded={handleDocUploaded} onRemoved={handleDocRemoved} onError={handleUploadError} />
              <FileUploadField label="Ek Lojistik Faturası" fieldKey="additionalLogisticsInvoiceKey" section={s} currentKey={f.additionalLogisticsInvoiceKey} projectId={selectedProject?.id} onUploaded={handleDocUploaded} onRemoved={handleDocRemoved} onError={handleUploadError} />
            </div>

            <AdditionalCosts section={s} items={f.additionalCosts} projectId={selectedProject?.id} onAdd={addAdditionalCost} onChange={updateAdditionalCost} onRemove={removeAdditionalCost} onUploaded={handleDocUploaded} onError={handleUploadError} rates={rates} />
            {isEditable() && (
              <div className="section-save-actions">
                <button className="btn-save" onClick={() => saveSection(s)} disabled={saving[s] || savingAll}>
                  <AiOutlineSave /> {saving[s] ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
                <button className="btn-save" onClick={saveAllSections} disabled={savingAll} style={{ background: '#2b6cb0' }} title="Tüm bölümleri tek seferde kaydet">
                  <AiOutlineSave /> {savingAll ? 'Kaydediliyor...' : 'Tümünü Kaydet'}
                </button>
              </div>
            )}
          </div>
        );

      case 'customs':
        return (
          <div className="section-form">
            <div className="form-grid">
              <CurrencyInput label="Gümrükçü bedeli" amountField="entryCustomsCost" currencyField="entryCustomsCurrency" rateField="entryCustomsExchangeRate" tryField="entryCustomsCostTry" section={s} form={form} onChange={handleChange} rates={rates} required />
              <FileUploadField label="Gümrükçü Faturası" fieldKey="entryCustomsInvoiceKey" section={s} currentKey={f.entryCustomsInvoiceKey} projectId={selectedProject?.id} onUploaded={handleDocUploaded} onRemoved={handleDocRemoved} onError={handleUploadError} />
            </div>

            <div className="doc-grid">
              <div className="doc-row">
                <label className="checkbox-label">
                  <input type="checkbox" checked={!!f.declarationDocumentKey} disabled />
                  <span>Beyanname</span>
                </label>
                <FileUploadField label="" fieldKey="declarationDocumentKey" section={s} currentKey={f.declarationDocumentKey} projectId={selectedProject?.id} onUploaded={(sec, field, key) => { handleDocUploaded(sec, field, key); handleChange(sec, 'hasDeclarationDocument', true); }} onRemoved={handleDocRemoved} onError={handleUploadError} />
              </div>
              <div className="doc-row">
                <label className="checkbox-label">
                  <input type="checkbox" checked={!!f.countReportDocumentKey} disabled />
                  <span>Sayım Tutanağı</span>
                </label>
                <FileUploadField label="" fieldKey="countReportDocumentKey" section={s} currentKey={f.countReportDocumentKey} projectId={selectedProject?.id} onUploaded={(sec, field, key) => { handleDocUploaded(sec, field, key); handleChange(sec, 'hasCountReportDocument', true); }} onRemoved={handleDocRemoved} onError={handleUploadError} />
              </div>
            </div>

            <div className="toggle-row">
              <label className="toggle-label">Depo Alıcı Tarafından Ödenecek Mi?</label>
              <label className="switch">
                <input type="checkbox" checked={f.warehousePaidByBuyer} onChange={(e) => handleChange(s, 'warehousePaidByBuyer', e.target.checked)} />
                <span className="slider round"></span>
              </label>
              <span className={f.warehousePaidByBuyer ? 'toggle-yes' : 'toggle-no'}>{f.warehousePaidByBuyer ? 'Evet' : 'Hayır'}</span>
            </div>

            {!f.warehousePaidByBuyer && (
              <>
                <div className="form-grid">
                  <CurrencyInput label="Antrepo indirme vinç maliyeti" amountField="warehouseUnloadingCost" currencyField="warehouseUnloadingCurrency" rateField="warehouseUnloadingExchangeRate" tryField="warehouseUnloadingCostTry" section={s} form={form} onChange={handleChange} rates={rates} />
                  <CurrencyInput label="Ardiye" amountField="storageCost" currencyField="storageCurrency" rateField="storageExchangeRate" tryField="storageCostTry" section={s} form={form} onChange={handleChange} rates={rates} />
                </div>
                <div className="form-grid">
                  <FileUploadField label="Antrepo indirme vinç maliyeti Faturası" fieldKey="warehouseUnloadingInvoiceKey" section={s} currentKey={f.warehouseUnloadingInvoiceKey} projectId={selectedProject?.id} onUploaded={handleDocUploaded} onRemoved={handleDocRemoved} onError={handleUploadError} />
                  <FileUploadField label="Ardiye Faturası" fieldKey="storageInvoiceKey" section={s} currentKey={f.storageInvoiceKey} projectId={selectedProject?.id} onUploaded={handleDocUploaded} onRemoved={handleDocRemoved} onError={handleUploadError} />
                </div>
              </>
            )}

            <AdditionalCosts section={s} items={f.additionalCosts} projectId={selectedProject?.id} onAdd={addAdditionalCost} onChange={updateAdditionalCost} onRemove={removeAdditionalCost} onUploaded={handleDocUploaded} onError={handleUploadError} rates={rates} />
            {isEditable() && (
              <div className="section-save-actions">
                <button className="btn-save" onClick={() => saveSection(s)} disabled={saving[s] || savingAll}>
                  <AiOutlineSave /> {saving[s] ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
                <button className="btn-save" onClick={saveAllSections} disabled={savingAll} style={{ background: '#2b6cb0' }} title="Tüm bölümleri tek seferde kaydet">
                  <AiOutlineSave /> {savingAll ? 'Kaydediliyor...' : 'Tümünü Kaydet'}
                </button>
              </div>
            )}
          </div>
        );

      case 'transfer':
        return (
          <div className="section-form">
            <div className="form-grid">
              <CurrencyInput label="Gümrükçü Devir Bedeli" amountField="transferCost" currencyField="transferCurrency" rateField="transferExchangeRate" tryField="transferCostTry" section={s} form={form} onChange={handleChange} rates={rates} />
              <FileUploadField label="Gümrükçü Devir Bedeli Faturası" fieldKey="transferInvoiceKey" section={s} currentKey={f.transferInvoiceKey} projectId={selectedProject?.id} onUploaded={handleDocUploaded} onRemoved={handleDocRemoved} onError={handleUploadError} />
            </div>

            <div className="doc-grid">
              <div className="doc-row">
                <label className="checkbox-label">
                  <input type="checkbox" checked={!!f.transferDeclarationKey} disabled />
                  <span>Devir beyannamesi</span>
                </label>
                <FileUploadField label="" fieldKey="transferDeclarationKey" section={s} currentKey={f.transferDeclarationKey} projectId={selectedProject?.id} onUploaded={(sec, field, key) => { handleDocUploaded(sec, field, key); handleChange(sec, 'hasTransferDeclaration', true); }} onRemoved={handleDocRemoved} onError={handleUploadError} />
              </div>
              <div className="doc-row">
                <label className="checkbox-label">
                  <input type="checkbox" checked={!!f.transferCountReportKey} disabled />
                  <span>Devir sayım tutanağı</span>
                </label>
                <FileUploadField label="" fieldKey="transferCountReportKey" section={s} currentKey={f.transferCountReportKey} projectId={selectedProject?.id} onUploaded={(sec, field, key) => { handleDocUploaded(sec, field, key); handleChange(sec, 'hasTransferCountReport', true); }} onRemoved={handleDocRemoved} onError={handleUploadError} />
              </div>
            </div>

            <AdditionalCosts section={s} items={f.additionalCosts} projectId={selectedProject?.id} onAdd={addAdditionalCost} onChange={updateAdditionalCost} onRemove={removeAdditionalCost} onUploaded={handleDocUploaded} onError={handleUploadError} rates={rates} />
            {isEditable() && (
              <div className="section-save-actions">
                <button className="btn-save" onClick={() => saveSection(s)} disabled={saving[s] || savingAll}>
                  <AiOutlineSave /> {saving[s] ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
                <button className="btn-save" onClick={saveAllSections} disabled={savingAll} style={{ background: '#2b6cb0' }} title="Tüm bölümleri tek seferde kaydet">
                  <AiOutlineSave /> {savingAll ? 'Kaydediliyor...' : 'Tümünü Kaydet'}
                </button>
              </div>
            )}
          </div>
        );

      case 'generalCosts':
        return (
          <div className="section-form">
            <div className="form-grid">
              <CurrencyInput label="Kurulum Maliyeti" amountField="installationCost" currencyField="installationCurrency" rateField="installationExchangeRate" tryField="installationCostTry" section={s} form={form} onChange={handleChange} rates={rates} />
              <FileUploadField label="Kurulum Faturası" fieldKey="installationInvoiceKey" section={s} currentKey={f.installationInvoiceKey} projectId={selectedProject?.id} onUploaded={handleDocUploaded} onRemoved={handleDocRemoved} onError={handleUploadError} />
            </div>

            <AdditionalCosts section={s} items={f.additionalCosts} projectId={selectedProject?.id} onAdd={addAdditionalCost} onChange={updateAdditionalCost} onRemove={removeAdditionalCost} onUploaded={handleDocUploaded} onError={handleUploadError} rates={rates} />
            {isEditable() && (
              <div className="section-save-actions">
                <button className="btn-save" onClick={() => saveSection(s)} disabled={saving[s] || savingAll}>
                  <AiOutlineSave /> {saving[s] ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
                <button className="btn-save" onClick={saveAllSections} disabled={savingAll} style={{ background: '#2b6cb0' }} title="Tüm bölümleri tek seferde kaydet">
                  <AiOutlineSave /> {savingAll ? 'Kaydediliyor...' : 'Tümünü Kaydet'}
                </button>
              </div>
            )}
          </div>
        );

      case 'costSummary':
        return renderCostSummary();

      default:
        return null;
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  if (!selectedProject) {
    return (
      <div className="pm-container">
        <div className="pm-header">
          <h1 className="pm-title">Proje Muhasebesi</h1>
          <div className="pm-header-meta">
            {ratesLoading ? (
              <span className="rate-loading">Kurlar yükleniyor...</span>
            ) : (
              <span className="rate-source">
                <AiOutlineInfoCircle /> Kurlar: {ratesSource || 'bilinmiyor'}
                {rates.EUR && rates.EUR > 1 && (
                  <span> · 1 EUR = ₺{parseFloat(rates.EUR).toFixed(2)}</span>
                )}
                {rates.USD && rates.USD > 1 && (
                  <span> · 1 USD = ₺{parseFloat(rates.USD).toFixed(2)}</span>
                )}
              </span>
            )}
          </div>
        </div>

        <div className="pm-project-search">
          <div className="search-row">
            <div className="search-input-wrap">
              <AiOutlineSearch className="search-icon" />
              <input
                type="text"
                className="search-input"
                placeholder="Proje ara: Proje kodu, makine, müşteri..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {/* Notification Bell */}
              <div style={{ position: 'relative' }}>
                <button
                  className="btn-secondary"
                  onClick={() => setShowNotifications(prev => !prev)}
                  title="Eksik maliyet bildirimleri"
                  style={{ position: 'relative' }}
                >
                  <AiOutlineBell />
                  {notifications.length > 0 && (
                    <span style={{
                      position: 'absolute', top: '-4px', right: '-4px',
                      background: notifications.some(n => !isSalesOnlyNotification(n)) ? '#e53e3e' : '#dd6b20',
                      color: '#fff', borderRadius: '50%',
                      width: '18px', height: '18px', fontSize: '11px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 700
                    }}>
                      {notifications.length}
                    </span>
                  )}
                </button>
                {showNotifications && (
                  <>
                  {/* Click-outside backdrop */}
                  <div
                    style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99 }}
                    onClick={() => setShowNotifications(false)}
                  />
                  <div style={{
                    position: 'absolute', top: '100%', right: 0, zIndex: 100,
                    background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.18)', width: '400px',
                    maxHeight: '480px', overflowY: 'auto', marginTop: '6px'
                  }}>
                    {/* Header */}
                    <div style={{
                      padding: '14px 16px', borderBottom: '1px solid #e2e8f0',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      position: 'sticky', top: 0, background: '#fff', zIndex: 1, borderRadius: '12px 12px 0 0'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <AiOutlineBell style={{ fontSize: '16px', color: notifications.some(n => !isSalesOnlyNotification(n)) ? '#e53e3e' : '#dd6b20' }} />
                        <span style={{ fontWeight: 700, fontSize: '14px' }}>Bildirimler</span>
                        {notifications.length > 0 && (
                          <span style={{
                            background: notifications.some(n => !isSalesOnlyNotification(n)) ? '#e53e3e' : '#dd6b20',
                            color: '#fff', fontSize: '11px', fontWeight: 700,
                            padding: '1px 7px', borderRadius: '10px'
                          }}>{notifications.length}</span>
                        )}
                      </div>
                    </div>
                    {/* Content */}
                    {notifications.length === 0 ? (
                      <div style={{ padding: '32px 16px', color: '#a0aec0', textAlign: 'center', fontSize: '13px' }}>
                        <AiOutlineCheckCircle style={{ fontSize: '28px', marginBottom: '8px', display: 'block', margin: '0 auto 8px' }} />
                        Tüm projeler eksiksiz!
                      </div>
                    ) : (
                      notifications.map((n, idx) => {
                        const salesOnly = isSalesOnlyNotification(n);
                        const accentColor = salesOnly ? '#dd6b20' : '#e53e3e';
                        return (
                        <div key={idx} style={{
                          padding: '12px 16px', borderBottom: '1px solid #f0f0f0',
                          fontSize: '13px', borderLeft: `3px solid ${accentColor}`
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                            <div>
                              <div style={{ fontWeight: 700, color: '#1a202c', marginBottom: '2px' }}>
                                {n.projectCode}
                              </div>
                              <div style={{ fontSize: '12px', color: '#718096' }}>
                                {n.make || n.machineBrand || n.machineName} {n.model || n.machineModel}
                              </div>
                            </div>
                            <span style={{
                              fontSize: '10px', color: '#718096', background: '#edf2f7',
                              padding: '2px 6px', borderRadius: '4px', whiteSpace: 'nowrap'
                            }}>
                              %{n.completionPercent || 0}
                            </span>
                          </div>
                          {/* Missing items as tags - supports both new (missingItems) and legacy (missingSections) format */}
                          <div style={{ marginBottom: '8px' }}>
                            <div style={{ fontSize: '11px', color: '#718096', marginBottom: '4px' }}>
                              Eksik Alanlar ({getMissingItems(n).length}):
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                              {getMissingItems(n).map((item, si) => (
                                <span key={si} style={{
                                  background: salesOnly ? '#fffaf0' : '#fff5f5',
                                  color: salesOnly ? '#c05621' : '#c53030',
                                  fontSize: '11px',
                                  padding: '2px 8px', borderRadius: '4px',
                                  border: `1px solid ${salesOnly ? '#feebc8' : '#fed7d7'}`
                                }}>
                                  {item}
                                </span>
                              ))}
                            </div>
                          </div>
                          {/* Action button */}
                          <div style={{ display: 'flex' }}>
                            <button
                              style={{
                                flex: 1, padding: '6px 12px', fontSize: '12px', fontWeight: 600,
                                background: '#2563eb', color: '#fff', border: 'none',
                                borderRadius: '6px', cursor: 'pointer'
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                const proj = projects.find(p => p.id === n.projectId);
                                if (proj) {
                                  // Find first empty section from notification data (exclude Etiket Fiyatı)
                                  const sectionNameMap = {
                                    'Makine Alım': 'machinePurchase',
                                    'Makine Ziyaret': 'machineVisit',
                                    'Lojistik': 'logistics',
                                    'Gümrük & Depo': 'customs',
                                    'Devir İşlemleri': 'transfer',
                                    'Genel Gider': 'generalCosts',
                                    'Satış Belgeleri': 'generalCosts',
                                  };
                                  const orderedSections = ['Makine Alım', 'Makine Ziyaret', 'Lojistik', 'Gümrük & Depo', 'Devir İşlemleri', 'Genel Gider', 'Satış Belgeleri'];
                                  const missingSections = n.missingSections || {};
                                  let targetSection = null;
                                  for (const secName of orderedSections) {
                                    const items = missingSections[secName] || [];
                                    const relevant = items.filter(i => i !== 'Etiket Fiyatı');
                                    if (relevant.length > 0 && sectionNameMap[secName]) {
                                      targetSection = sectionNameMap[secName];
                                      break;
                                    }
                                  }
                                  // Set pending section before selecting project
                                  pendingSectionRef.current = targetSection;
                                  handleSelectProject(proj);
                                }
                                setShowNotifications(false);
                              }}
                            >
                              Tamamla
                            </button>
                          </div>
                        </div>
                      ); })
                    )}
                  </div>
                  </>
                )}
              </div>
              <button className="btn-secondary" onClick={loadProjects}>
                <AiOutlineReload /> Yenile
              </button>
            </div>
          </div>
        </div>

        {projectsLoading && (
          <div className="page-loading">
            <AiOutlineLoading3Quarters className="page-loading-spinner" />
            <p>Projeler yükleniyor...</p>
          </div>
        )}
        {projectsError && <div className="error-banner"><AiOutlineWarning /> {projectsError}</div>}

        {!projectsLoading && filteredProjects.length === 0 && (
          <div className="empty-state">Proje bulunamadı.</div>
        )}

        <div className="project-grid">
          {filteredProjects.map(project => {
            const summary = accountingSummaries[project.id];
            const draftStatusLabel = summary?.draftStatus === 'COMPLETED' ? 'Tamamlandı' : summary?.draftStatus === 'IN_PROGRESS' ? 'Devam Ediyor' : summary ? 'Taslak' : '';
            const projectNotifs = notifications.filter(n => n.projectId === project.id);
            const missingCount = projectNotifs.reduce((acc, n) => acc + (n.totalMissingCount || getMissingItems(n).length), 0);
            const projectSalesOnly = projectNotifs.length > 0 && projectNotifs.every(isSalesOnlyNotification);
            const badgeStyle = projectSalesOnly
              ? { background: '#feebc8', color: '#c05621' }
              : { background: '#fed7d7', color: '#c53030' };
            return (
              <div key={project.id} className="project-card" onClick={() => handleSelectProject(project)}>
                <div className="project-card-header">
                  <span className="project-code">{project.projectCode}</span>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    {missingCount > 0 && (
                      <span style={{
                        ...badgeStyle, fontSize: '10px', fontWeight: 700,
                        padding: '2px 6px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '3px'
                      }}>
                        <AiOutlineWarning style={{ fontSize: '11px' }} /> {missingCount}
                      </span>
                    )}
                    <span className={`project-status-badge ${getProjectStatusBadgeClass(project.status)}`}>
                      {getStatusLabel(project.status)}
                    </span>
                  </div>
                </div>

                {/* Machine info grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 12px', fontSize: '12px', marginBottom: '10px' }}>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <span style={{ color: '#9ca3af', display: 'block', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Marka / Model</span>
                    <span style={{ color: '#374151', fontWeight: 600 }}>{[project.make, project.model].filter(Boolean).join(' ') || '-'}</span>
                  </div>
                  <div>
                    <span style={{ color: '#9ca3af', display: 'block', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Seri No</span>
                    <span style={{ color: '#374151', fontWeight: 600, fontFamily: 'monospace' }}>{project.serialNumber || '-'}</span>
                  </div>
                  <div>
                    <span style={{ color: '#9ca3af', display: 'block', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Yıl</span>
                    <span style={{ color: '#374151', fontWeight: 600 }}>{project.year || '-'}</span>
                  </div>
                </div>

                {project.client?.name && (
                  <p style={{ fontSize: '12px', color: '#4b5563', margin: '0 0 8px', fontWeight: 500 }}>{project.client.name}</p>
                )}

                {/* Accounting summary bar */}
                {summariesLoading && !summary && (
                  <div style={{ padding: '8px', background: '#f7fafc', borderRadius: '6px', fontSize: '11px', marginBottom: '8px' }}>
                    <div style={{ height: '12px', background: '#e2e8f0', borderRadius: '3px', width: '60%', marginBottom: '6px', animation: 'pulse 1.5s infinite' }} />
                    <div style={{ height: '4px', background: '#e2e8f0', borderRadius: '4px' }} />
                  </div>
                )}
                {summary && (
                  <div style={{ padding: '8px', background: '#f7fafc', borderRadius: '6px', fontSize: '11px', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ color: '#718096' }}>Muhasebe</span>
                      <span style={{ fontWeight: 600, color: summary.draftStatus === 'COMPLETED' ? '#38a169' : '#718096' }}>{draftStatusLabel}</span>
                    </div>
                    {summary.completionPercent != null && (
                      <div style={{ background: '#e2e8f0', borderRadius: '4px', height: '4px', marginBottom: '4px' }}>
                        <div style={{ background: summary.draftStatus === 'COMPLETED' ? '#38a169' : '#2563eb', borderRadius: '4px', height: '100%', width: `${summary.completionPercent}%`, transition: 'width 0.3s' }} />
                      </div>
                    )}
                    {summary.labelPrice != null && (
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#718096' }}>Etiket:</span>
                        <span style={{ fontWeight: 600 }}>
                          {summary.labelCurrency === 'EUR' ? '€' : summary.labelCurrency === 'USD' ? '$' : '₺'}
                          {parseFloat(summary.labelPrice).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                <div className="project-card-footer">
                  <span style={{ fontSize: '11px', color: '#9ca3af' }}>
                    {project.createdAt ? new Date(project.createdAt).toLocaleDateString('tr-TR') : ''}
                  </span>
                  <button
                    className="btn-save"
                    style={{ fontSize: '11px', padding: '5px 12px', borderRadius: '6px' }}
                    onClick={(e) => { e.stopPropagation(); handleSelectProject(project); }}
                  >
                    {summary?.draftStatus === 'COMPLETED' ? 'Maliyet Düzenle' : 'Maliyet Gir'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Project selected — show the draft editor
  return (
    <div className="pm-container">
      {/* Header */}
      <div className="pm-header">
        <div className="pm-header-left">
          <button className="btn-back" onClick={() => { refreshNotificationsAndSummaries(); setSelectedProject(null); }}>
            <AiOutlineArrowLeft /> Projeler
          </button>
          <div>
            <h1 className="pm-title">{selectedProject.projectCode} — Proje Muhasebesi</h1>
            <p className="pm-subtitle">{selectedProject.machineName} {selectedProject.model || selectedProject.machineModel} · {selectedProject.client?.name}</p>
          </div>
        </div>
        <div className="pm-header-right">
          {draft && (
            <div className="draft-progress">
              <div className="progress-bar-wrap">
                <div className="progress-bar" style={{ width: `${draft.completionPercent || 0}%` }} />
              </div>
              <span className="progress-label">{draft.completionPercent || 0}% tamamlandı</span>
            </div>
          )}
          {draft && draft.draftStatus !== 'COMPLETED' && canEdit() && (
            <button
              className="btn-complete"
              onClick={() => {
                if (activeSection !== 'costSummary') {
                  setActiveSection('costSummary');
                  if (sectionPanelRef.current) sectionPanelRef.current.scrollTop = 0;
                } else {
                  handleCompleteDraft();
                }
              }}
              disabled={completing || (activeSection === 'costSummary' && !form.generalCosts.salesPrice)}
              title={activeSection !== 'costSummary' ? 'Maliyet özetine git' : 'Tamamla'}
            >
              <AiOutlineCheckCircle /> {completing ? 'Tamamlanıyor...' : activeSection !== 'costSummary' ? 'Maliyet Özeti & Tamamla' : 'Tamamla'}
            </button>
          )}
          {draft && draft.draftStatus === 'COMPLETED' && (
            <>
              <span className="completed-badge"><AiOutlineCheckCircle /> Tamamlandı</span>
              {isAdmin() && !adminEditMode && (
                <button
                  className="btn-save"
                  onClick={() => setAdminEditMode(true)}
                  style={{ marginLeft: '8px', background: '#e53e3e' }}
                >
                  Düzenle (Admin)
                </button>
              )}
              {isAdmin() && adminEditMode && (
                <button
                  className="btn-secondary"
                  onClick={() => setAdminEditMode(false)}
                  style={{ marginLeft: '8px' }}
                >
                  Düzenlemeyi Kapat
                </button>
              )}
            </>
          )}
          {selectedProject?.status === 'OFFER_SENT' && (
            <span style={{ color: '#e53e3e', fontSize: '13px', marginLeft: '8px' }}>
              (Teklif gönderildi — düzenleme kapalı)
            </span>
          )}
        </div>
      </div>

      {draftLoading && (
        <div className="page-loading">
          <AiOutlineLoading3Quarters className="page-loading-spinner" />
          <p>Muhasebe taslağı yükleniyor...</p>
        </div>
      )}
      {draftError && <div className="error-banner"><AiOutlineWarning /> {draftError}</div>}
      {saveError && <div className="error-banner"><AiOutlineWarning /> {saveError}</div>}
      {saveSuccess && <div className="success-banner"><AiOutlineCheckCircle /> {saveSuccess}</div>}

      {!draftLoading && !draftError && (
        <div className="pm-editor">
          {/* Section tabs */}
          <div className="section-tabs">
            {sectionKeys.map(key => (
              <button
                key={key}
                className={`section-tab ${activeSection === key ? 'active' : ''}`}
                onClick={() => { setActiveSection(key); if (sectionPanelRef.current) sectionPanelRef.current.scrollTop = 0; }}
              >
                <span className="tab-label">{SECTION_LABELS[key]}</span>
                <StatusBadge status={getSectionStatus(key)} />
              </button>
            ))}
          </div>

          {/* Section form */}
          <div className="section-panel" ref={sectionPanelRef}>
            <div className="section-panel-header">
              <h2 className="section-panel-title">{SECTION_LABELS[activeSection]}</h2>
            </div>
            {renderSection()}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── AdditionalCosts sub-component ────────────────────────────────────────────

const AdditionalCosts = ({ section, items, projectId, onAdd, onChange, onRemove, onUploaded, onError, rates }) => {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="additional-costs-block">
      <button type="button" className="additional-costs-toggle" onClick={() => setExpanded(e => !e)}>
        {expanded ? <AiOutlineDown /> : <AiOutlineRight />}
        Ek Maliyet Kalemleri {items && items.length > 0 ? `(${items.length})` : ''}
      </button>
      {expanded && (
        <div className="additional-costs-list">
          {(items || []).map((item, idx) => (
            <AdditionalCostRow
              key={idx}
              item={item}
              index={idx}
              section={section}
              projectId={projectId}
              onChange={onChange}
              onRemove={onRemove}
              onUploaded={onUploaded}
              onError={onError}
              rates={rates}
            />
          ))}
          <button type="button" className="btn-add-cost" onClick={() => onAdd(section)}>
            <AiOutlinePlus /> Kalem Ekle
          </button>
        </div>
      )}
    </div>
  );
};

export default ProjeMuhasebesi;
