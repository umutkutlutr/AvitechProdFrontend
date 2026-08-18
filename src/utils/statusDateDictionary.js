/**
 * Status and date label dictionary for consistent UI display.
 * Maps backend raw values to Turkish display labels.
 */

export const STATUS_LABELS = {
  TEMPLATE: 'Şablon',
  DRAFT: 'Taslak',
  POTENTIAL: 'POTANSİYEL',
  OFFER_SENT: 'Teklif Gönderildi',
  SOLD: 'Satıldı',
  COMPLETED: 'Tamamlandı',
  CANCELLED: 'İptal',
  ONAYLANDI: 'Onaylandı',
  ONAY_BEKLIYOR: 'Onay Bekliyor',
  SATILDI: 'Satıldı',
  CLOSED: 'Kapatıldı',
};

export const DATE_LABELS = {
  createdAt: 'Proje Oluşturma',
  sentAt: 'Teklif Gönderim',
  saleDate: 'Satış Tarihi',
  updatedAt: 'Son Güncelleme',
  proformaSentAt: 'Proforma Gönderim',
};

/**
 * Get display label for a status value.
 * @param {string} status - Raw status from backend
 * @returns {string} Turkish label
 */
export function getStatusLabel(status) {
  if (!status) return '-';
  const key = String(status).toUpperCase().replace(/\s/g, '_');
  return STATUS_LABELS[key] || status;
}

/**
 * Get display label for a date field key.
 * @param {string} fieldKey - Field name (createdAt, sentAt, saleDate, etc.)
 * @returns {string} Turkish label
 */
export function getDateLabel(fieldKey) {
  if (!fieldKey) return '-';
  return DATE_LABELS[fieldKey] || fieldKey;
}
