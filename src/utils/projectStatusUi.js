/**
 * Maps backend status strings to CSS modifier classes used with `.status-badge` / `.project-status-badge`.
 * Always normalize on API enums (TEMPLATE, SOLD, OFFER_SENT, …).
 */

function normKey(status) {
  if (status == null || status === '') return '';
  return String(status).trim().toUpperCase().replace(/\s+/g, '_');
}

/**
 * @param {string|null|undefined} status - Project.status from API (or legacy dashboard labels)
 * @returns {string} e.g. status-approved (no leading dot)
 */
export function getProjectStatusBadgeClass(status) {
  const k = normKey(status);

  switch (k) {
    case 'SOLD':
    case 'TAMAMLANMIŞ':
    case 'SATILDI':
      return 'status-approved';
    case 'TEMPLATE':
    case 'DRAFT':
      return 'status-draft';
    case 'OFFER_SENT':
    case 'EXCHANGE_CIHAZ_TEKLİFİ':
    case 'EXCHANGE_CIHAZ_TEKLIFI':
      return 'status-sent';
    case 'CANCELLED':
      return 'status-cancelled';
    default:
      return 'status-default';
  }
}

/**
 * Offer entity statuses (OfferStatus enum).
 * @param {string|null|undefined} offerStatus
 * @returns {string} CSS modifier for `.status-badge`
 */
export function getOfferStatusBadgeClass(offerStatus) {
  const k = normKey(offerStatus);
  switch (k) {
    case 'OFFER_SENT':
      return 'status-sent';
    case 'COMPLETED':
      return 'status-sold';
    case 'CLOSED':
      return 'status-closed';
    default:
      return 'status-default';
  }
}

/**
 * @param {string|null|undefined} offerStatus
 * @returns {string} Turkish label for offer rows (QuotesSent, etc.)
 */
export function getOfferStatusLabel(offerStatus) {
  const k = normKey(offerStatus);
  switch (k) {
    case 'OFFER_SENT':
      return 'Onay Bekliyor';
    case 'COMPLETED':
      return 'Tamamlandı';
    case 'CLOSED':
      return 'Kapatıldı';
    default:
      return offerStatus ? String(offerStatus) : '-';
  }
}
