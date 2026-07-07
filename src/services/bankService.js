import authService from './authService';
import { fetchWithAuth } from '../utils/apiUtils';
import _API_BASE_URL from '../config';

const API_BASE_URL = _API_BASE_URL + '/api/banks';

// fetchWithAuth: 401/403'te otomatik logout+yönlendirme yapar, non-ok yanıtlarda
// sunucunun (Türkçe) hata mesajıyla exception fırlatır. Bu yüzden burada ayrı
// response.ok kontrolü ve İngilizce hata metinleri gerekmez.
const bankService = {
  async getBanks() {
    const response = await fetchWithAuth(API_BASE_URL, {
      headers: authService.getAuthHeaders(),
    });
    return response.json();
  },

  async getBankById(id) {
    const response = await fetchWithAuth(`${API_BASE_URL}/${id}`, {
      headers: authService.getAuthHeaders(),
    });
    return response.json();
  },

  async createBank(data) {
    const response = await fetchWithAuth(API_BASE_URL, {
      method: 'POST',
      headers: { ...authService.getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return response.json();
  },

  async updateBank(id, data) {
    const response = await fetchWithAuth(`${API_BASE_URL}/${id}`, {
      method: 'PUT',
      headers: { ...authService.getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return response.json();
  },

  async deleteBank(id) {
    await fetchWithAuth(`${API_BASE_URL}/${id}`, {
      method: 'DELETE',
      headers: authService.getAuthHeaders(),
    });
  },
};

export default bankService;
