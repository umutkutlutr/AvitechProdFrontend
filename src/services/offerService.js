import authService from './authService';
import { fetchWithAuth } from '../utils/apiUtils';

import API_BASE_URL from '../config';

class OfferService {
  async getOffersByClient(clientId) {
    try {
      const response = await fetchWithAuth(`${API_BASE_URL}/api/offers/by-client/${clientId}`, {
        method: 'GET',
        headers: authService.getAuthHeaders(),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Get offers by client error:', error);
      throw error;
    }
  }

  async getOffersByProject(projectId) {
    try {
      const response = await fetchWithAuth(`${API_BASE_URL}/api/offers/by-project/${projectId}`, {
        method: 'GET',
        headers: authService.getAuthHeaders(),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Get offers by project error:', error);
      throw error;
    }
  }

  async downloadOfferPdf(offerId) {
    return fetchWithAuth(`${API_BASE_URL}/api/offers/${offerId}/quote-pdf`, {
      method: 'GET',
      headers: authService.getAuthHeaders(),
    });
  }

  async previewOfferPdf(projectId, clientId, price, description, invalidTermKeys = []) {
    const response = await fetchWithAuth(`${API_BASE_URL}/api/offers/preview-pdf`, {
      method: 'POST',
      headers: {
        ...authService.getAuthHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        projectId,
        clientId,
        price,
        description,
        invalidTermKeys,
      }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'PDF önizleme alınamadı');
    }
    return response.blob();
  }

  async getOfferById(offerId) {
    try {
      const response = await fetchWithAuth(`${API_BASE_URL}/api/offers`, {
        method: 'GET',
        headers: authService.getAuthHeaders(),
      });

      const data = await response.json();
      // Find the offer with matching ID
      const offer = Array.isArray(data) ? data.find(o => o.id === offerId) : null;
      if (!offer) {
        throw new Error('Teklif bulunamadı');
      }
      return offer;
    } catch (error) {
      console.error('Get offer by id error:', error);
      throw error;
    }
  }
}

export default new OfferService();
