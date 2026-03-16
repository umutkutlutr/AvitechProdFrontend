import authService from './authService';
import _API_BASE_URL from '../config';

const API_BASE_URL = _API_BASE_URL + '/api/banks';

const bankService = {
  async getBanks() {
    const response = await fetch(API_BASE_URL, {
      headers: authService.getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch banks');
    return response.json();
  },

  async getBankById(id) {
    const response = await fetch(`${API_BASE_URL}/${id}`, {
      headers: authService.getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch bank');
    return response.json();
  },

  async createBank(data) {
    const response = await fetch(API_BASE_URL, {
      method: 'POST',
      headers: { ...authService.getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create bank');
    return response.json();
  },

  async updateBank(id, data) {
    const response = await fetch(`${API_BASE_URL}/${id}`, {
      method: 'PUT',
      headers: { ...authService.getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update bank');
    return response.json();
  },

  async deleteBank(id) {
    const response = await fetch(`${API_BASE_URL}/${id}`, {
      method: 'DELETE',
      headers: authService.getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to delete bank');
  },
};

export default bankService;
