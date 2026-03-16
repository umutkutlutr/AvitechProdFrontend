import authService from './authService';
import { fetchWithAuth, extractFilenameFromResponse } from '../utils/apiUtils';
import API_BASE_URL from '../config';

const BASE = `${API_BASE_URL}/api/campaigns`;

const campaignService = {
  async getCampaigns() {
    const response = await fetchWithAuth(BASE, {
      method: 'GET',
      headers: authService.getAuthHeaders(),
    });
    return response.json();
  },

  async createCampaign(data) {
    const payload = {
      name: data.name,
      customerSelection: data.customerSelection || 'all',
      selectedCustomers: (data.selectedCustomers || []).map(Number).filter(Boolean),
      selectedMachines: (data.selectedMachines || []).map(Number).filter(Boolean),
      description: data.description || null,
      emailSubject: data.emailSubject || null,
      emailBody: data.emailBody || null,
    };
    const response = await fetchWithAuth(BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authService.getAuthHeaders() },
      body: JSON.stringify(payload),
    });
    return response.json();
  },

  async getCampaignById(id) {
    const response = await fetchWithAuth(`${BASE}/${id}`, {
      method: 'GET',
      headers: authService.getAuthHeaders(),
    });
    return response.json();
  },

  async exportCampaign(id) {
    const response = await fetchWithAuth(`${BASE}/${id}/export`, {
      method: 'GET',
      headers: authService.getAuthHeaders(),
    });
    const blob = await response.blob();
    const filename = extractFilenameFromResponse(response, `kampanya_${id}.xlsx`);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
  },
};

export default campaignService;
