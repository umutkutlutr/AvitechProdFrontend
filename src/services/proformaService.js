import authService from './authService';
import { fetchWithAuth, extractFilenameFromResponse } from '../utils/apiUtils';
import _API_BASE_URL from '../config';

const API_BASE_URL = _API_BASE_URL + '/api';

// fetchWithAuth: 401/403'te otomatik logout+yönlendirme; non-ok yanıtlarda sunucunun
// (Türkçe) mesajıyla exception. Böylece oturum bitince kullanıcı /login'e gider ve
// İngilizce hata metinleri kullanıcıya sızmaz.
const proformaService = {
  // data: ProformaCreateRequest gövdesi (offerId, price, terms, ccEmails vb.) —
  // olduğu gibi JSON body olarak gönderilir; ccEmails yalnızca gönderimde kullanılır, saklanmaz.
  async createProforma(data) {
    const response = await fetchWithAuth(`${API_BASE_URL}/proformas`, {
      method: 'POST',
      headers: { ...authService.getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return response.json();
  },

  async getProformasByProject(projectId) {
    const response = await fetchWithAuth(`${API_BASE_URL}/proformas/by-project/${projectId}`, {
      headers: authService.getAuthHeaders(),
    });
    return response.json();
  },

  async getProformasByOffer(offerId) {
    const response = await fetchWithAuth(`${API_BASE_URL}/proformas/by-offer/${offerId}`, {
      headers: authService.getAuthHeaders(),
    });
    return response.json();
  },

  async hasProformaForOffer(offerId) {
    // Bu uç, "proforma yok" durumunu da kapsar; hata/olumsuz durumda sessizce false döner.
    try {
      const response = await fetchWithAuth(`${API_BASE_URL}/proformas/has-proforma/${offerId}`, {
        headers: authService.getAuthHeaders(),
      });
      return response.json();
    } catch (e) {
      return false;
    }
  },

  async getOfferProformaSummary(projectId) {
    const response = await fetchWithAuth(`${API_BASE_URL}/projects/${projectId}/offer-proforma-summary`, {
      headers: authService.getAuthHeaders(),
    });
    return response.json();
  },

  async downloadProformaPdf(proformaId) {
    const response = await fetchWithAuth(`${API_BASE_URL}/proformas/${proformaId}/pdf`, {
      method: 'GET',
      headers: authService.getAuthHeaders(),
    });
    return response;
  },
};

export default proformaService;
