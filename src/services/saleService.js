import authService from './authService';
import { fetchWithAuth } from '../utils/apiUtils';

import API_BASE_URL from '../config';

class SaleService {
  async createSale(saleData) {
    try {
      const response = await fetchWithAuth(`${API_BASE_URL}/api/sales`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authService.getAuthHeaders(),
        },
        body: JSON.stringify(saleData),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Create sale error:', error);
      throw error;
    }
  }

  async getSales() {
    try {
      const response = await fetchWithAuth(`${API_BASE_URL}/api/sales`, {
        method: 'GET',
        headers: authService.getAuthHeaders(),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Get sales error:', error);
      throw error;
    }
  }

  async getSalesByProject(projectId) {
    try {
      const response = await fetchWithAuth(`${API_BASE_URL}/api/sales/by-project/${projectId}`, {
        method: 'GET',
        headers: authService.getAuthHeaders(),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Get sales by project error:', error);
      throw error;
    }
  }

  async createSaleFromOffer(projectId, offerId, saleNote, salePrice, saleDate, financingDays) {
    try {
      const response = await fetchWithAuth(`${API_BASE_URL}/api/projects/${projectId}/createSaleFromOffer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authService.getAuthHeaders(),
        },
        body: JSON.stringify({
          offerId: offerId,
          saleNote: saleNote,
          salePrice: salePrice,
          saleDate: saleDate,
          financingDays: financingDays
        }),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Create sale from offer error:', error);
      throw error;
    }
  }

  async createSaleWithPrice(projectId, projectData) {
    try {
      const response = await fetchWithAuth(`${API_BASE_URL}/api/projects/${projectId}/createSale`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authService.getAuthHeaders(),
        },
        body: JSON.stringify(projectData),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Create sale with price error:', error);
      throw error;
    }
  }
}

export default new SaleService();
