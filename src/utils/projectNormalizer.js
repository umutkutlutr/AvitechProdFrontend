/**
 * Project data normalizer - maps backend DTOs to canonical frontend field names.
 * Backend ProjectCardDto returns: make, model, title, year, serialNumber, projectCode, status
 * Some frontend components expect: machineMake, machineModel, machineName, machineYear
 * This module provides a single source of truth for field mapping.
 */

/**
 * Normalize project card/list data for consistent display across screens.
 * @param {Object} p - Raw project from API (ProjectCardDto or similar)
 * @returns {Object} Normalized object with canonical fields
 */
export function normalizeProjectCard(p) {
  if (!p) return null;
  const machineName = p.title || p.machineName || p.make || p.name || '';
  const make = p.make || p.machineMake || p.brand || '';
  const model = p.model || p.machineModel || p.machineType || '';
  const year = p.year ?? p.machineYear ?? null;
  const serialNumber = p.serialNumber || p.serialNo || '';
  return {
    ...p,
    machineName: String(machineName).trim() || '-',
    make: String(make).trim(),
    machineMake: String(make).trim(),
    model: String(model).trim(),
    machineModel: String(model).trim(),
    year,
    machineYear: year,
    serialNumber: String(serialNumber).trim(),
    projectCode: p.projectCode || p.project_code || '',
    status: p.status || '',
  };
}

/**
 * Normalize project detail data for modals and detail views.
 * Includes photos, dates, and all canonical machine fields.
 * @param {Object} p - Raw project detail from API (ProjectDetailDto or similar)
 * @returns {Object} Normalized object with canonical fields
 */
export function normalizeProjectDetail(p) {
  if (!p) return null;
  const card = normalizeProjectCard(p);
  if (!card) return null;
  const photos = Array.isArray(p.photos) ? p.photos : [];
  const photoUrls = photos.map(x => (typeof x === 'string' ? x : (x?.url || x))).filter(Boolean);
  return {
    ...card,
    ...p,
    photos: photoUrls,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    saleDate: p.saleDate,
  };
}

/**
 * Get searchable text from a normalized project for filtering.
 * @param {Object} p - Normalized or raw project
 * @returns {string} Concatenated searchable string
 */
export function getProjectSearchText(p) {
  if (!p) return '';
  const n = normalizeProjectCard(p);
  return [
    n.projectCode,
    n.machineName,
    n.make,
    n.model,
    n.serialNumber,
    n.year != null ? String(n.year) : '',
  ].filter(Boolean).join(' ').toLowerCase();
}
