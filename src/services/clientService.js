import authService from './authService';
import { fetchWithAuth, extractFilenameFromResponse } from '../utils/apiUtils';

import API_BASE_URL from '../config';

class ClientService {
  async getClients() {
    try {
      const response = await fetchWithAuth(`${API_BASE_URL}/api/clients`, {
        method: 'GET',
        headers: authService.getAuthHeaders(),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Get clients error:', error);
      throw error;
    }
  }

  async getClientById(clientId) {
    try {
      const response = await fetchWithAuth(`${API_BASE_URL}/api/clients/${clientId}`, {
        method: 'GET',
        headers: authService.getAuthHeaders(),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Get client by ID error:', error);
      throw error;
    }
  }

  async createClient(clientData) {
    try {
      const response = await fetchWithAuth(`${API_BASE_URL}/api/clients`, {
        method: 'POST',
        headers: {
          ...authService.getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(clientData),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Create client error:', error);
      throw error;
    }
  }

  async updateClient(clientId, clientData) {
    try {
      const response = await fetchWithAuth(`${API_BASE_URL}/api/clients/${clientId}`, {
        method: 'PUT',
        headers: {
          ...authService.getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(clientData),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Update client error:', error);
      throw error;
    }
  }

  async exportClientsToExcel() {
    try {
      const response = await fetchWithAuth(`${API_BASE_URL}/api/clients/export/excel`, {
        method: 'GET',
        headers: authService.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error('Excel dışa aktarma başarısız oldu');
      }

      // Extract filename from response header
      const filename = extractFilenameFromResponse(response, 'clients.xlsx');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;

      document.body.appendChild(link);
      link.click();

      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export clients to Excel error:', error);
      throw error;
    }
  }
}

export default new ClientService();
