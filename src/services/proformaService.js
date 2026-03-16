import authService from './authService';
import { extractFilenameFromResponse } from '../utils/apiUtils';
import _API_BASE_URL from '../config';

const API_BASE_URL = _API_BASE_URL + '/api';

const proformaService = {
  async createProforma(data) {
    const response = await fetch(`${API_BASE_URL}/proformas`, {
      method: 'POST',
      headers: authService.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to create proforma');
    }
    return response.json();
  },

  async getProformasByProject(projectId) {
    const response = await fetch(`${API_BASE_URL}/proformas/by-project/${projectId}`, {
      headers: authService.getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch proformas');
    return response.json();
  },

  async getProformasByOffer(offerId) {
    const response = await fetch(`${API_BASE_URL}/proformas/by-offer/${offerId}`, {
      headers: authService.getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch proformas');
    return response.json();
  },

  async hasProformaForOffer(offerId) {
    const response = await fetch(`${API_BASE_URL}/proformas/has-proforma/${offerId}`, {
      headers: authService.getAuthHeaders(),
    });
    if (!response.ok) return false;
    return response.json();
  },

  async getOfferProformaSummary(projectId) {
    const response = await fetch(`${API_BASE_URL}/projects/${projectId}/offer-proforma-summary`, {
      headers: authService.getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch summary');
    return response.json();
  },

  async downloadProformaPdf(proformaId) {
    const response = await fetch(`${API_BASE_URL}/proformas/${proformaId}/pdf`, {
      method: 'GET',
      headers: authService.getAuthHeaders(),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Proforma PDF indirilirken bir hata oluştu');
    }
    return response;
  },
};

export default proformaService;
