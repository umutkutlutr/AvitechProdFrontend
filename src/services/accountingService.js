import authService from './authService';
import { fetchWithAuth } from '../utils/apiUtils';

import API_BASE_URL from '../config';

class AccountingService {
  /**
   * Get or create the accounting draft for a project.
   * If no draft exists, the backend creates an empty one automatically.
   */
  async getDraft(projectId) {
    try {
      const response = await fetchWithAuth(
        `${API_BASE_URL}/api/accounting/projects/${projectId}/draft`,
        {
          method: 'GET',
          headers: authService.getAuthHeaders(),
        }
      );
      return await response.json();
    } catch (error) {
      console.error('AccountingService.getDraft error:', error);
      throw error;
    }
  }

  /**
   * Save (upsert) the Machine Purchase section.
   * Only non-null fields are updated on the backend.
   */
  async saveMachinePurchase(projectId, data) {
    try {
      const response = await fetchWithAuth(
        `${API_BASE_URL}/api/accounting/projects/${projectId}/draft/machine-purchase`,
        {
          method: 'PUT',
          headers: authService.getAuthHeaders(),
          body: JSON.stringify(data),
        }
      );
      return await response.json();
    } catch (error) {
      console.error('AccountingService.saveMachinePurchase error:', error);
      throw error;
    }
  }

  /**
   * Save (upsert) the Machine Visit section.
   */
  async saveMachineVisit(projectId, data) {
    try {
      const response = await fetchWithAuth(
        `${API_BASE_URL}/api/accounting/projects/${projectId}/draft/machine-visit`,
        {
          method: 'PUT',
          headers: authService.getAuthHeaders(),
          body: JSON.stringify(data),
        }
      );
      return await response.json();
    } catch (error) {
      console.error('AccountingService.saveMachineVisit error:', error);
      throw error;
    }
  }

  /**
   * Save (upsert) the Logistics section.
   */
  async saveLogistics(projectId, data) {
    try {
      const response = await fetchWithAuth(
        `${API_BASE_URL}/api/accounting/projects/${projectId}/draft/logistics`,
        {
          method: 'PUT',
          headers: authService.getAuthHeaders(),
          body: JSON.stringify(data),
        }
      );
      return await response.json();
    } catch (error) {
      console.error('AccountingService.saveLogistics error:', error);
      throw error;
    }
  }

  /**
   * Save (upsert) the Customs section.
   */
  async saveCustoms(projectId, data) {
    try {
      const response = await fetchWithAuth(
        `${API_BASE_URL}/api/accounting/projects/${projectId}/draft/customs`,
        {
          method: 'PUT',
          headers: authService.getAuthHeaders(),
          body: JSON.stringify(data),
        }
      );
      return await response.json();
    } catch (error) {
      console.error('AccountingService.saveCustoms error:', error);
      throw error;
    }
  }

  /**
   * Save (upsert) the Transfer section.
   */
  async saveTransfer(projectId, data) {
    try {
      const response = await fetchWithAuth(
        `${API_BASE_URL}/api/accounting/projects/${projectId}/draft/transfer`,
        {
          method: 'PUT',
          headers: authService.getAuthHeaders(),
          body: JSON.stringify(data),
        }
      );
      return await response.json();
    } catch (error) {
      console.error('AccountingService.saveTransfer error:', error);
      throw error;
    }
  }

  /**
   * Save (upsert) the General Costs section.
   */
  async saveGeneralCosts(projectId, data) {
    try {
      const response = await fetchWithAuth(
        `${API_BASE_URL}/api/accounting/projects/${projectId}/draft/general-costs`,
        {
          method: 'PUT',
          headers: authService.getAuthHeaders(),
          body: JSON.stringify(data),
        }
      );
      return await response.json();
    } catch (error) {
      console.error('AccountingService.saveGeneralCosts error:', error);
      throw error;
    }
  }

  /**
   * Save all sections at once.
   * Only non-null section payloads are updated on the backend.
   */
  async saveAllSections(projectId, data) {
    try {
      const response = await fetchWithAuth(
        `${API_BASE_URL}/api/accounting/projects/${projectId}/draft/save-all`,
        {
          method: 'PUT',
          headers: authService.getAuthHeaders(),
          body: JSON.stringify(data),
        }
      );
      return await response.json();
    } catch (error) {
      console.error('AccountingService.saveAllSections error:', error);
      throw error;
    }
  }

  /**
   * Get missing cost notifications for projects sent to accounting (legacy).
   */
  async getMissingCostNotifications() {
    try {
      const response = await fetchWithAuth(
        `${API_BASE_URL}/api/accounting/notifications/missing-costs`,
        {
          method: 'GET',
          headers: authService.getAuthHeaders(),
        }
      );
      return await response.json();
    } catch (error) {
      console.error('AccountingService.getMissingCostNotifications error:', error);
      throw error;
    }
  }

  /**
   * Get active notifications from the persistent notifications table.
   * Returns notifications grouped by project with missing cost items per section.
   * Only returns projects whose accounting status is NOT COMPLETED or CANCELLED.
   */
  async getActiveNotifications() {
    try {
      const response = await fetchWithAuth(
        `${API_BASE_URL}/api/accounting/notifications/active`,
        {
          method: 'GET',
          headers: authService.getAuthHeaders(),
        }
      );
      return await response.json();
    } catch (error) {
      console.error('AccountingService.getActiveNotifications error:', error);
      throw error;
    }
  }

  /**
   * Get accounting summaries for all projects (label price, completion, status).
   */
  async getProjectAccountingSummaries() {
    try {
      const response = await fetchWithAuth(
        `${API_BASE_URL}/api/accounting/projects/summaries`,
        {
          method: 'GET',
          headers: authService.getAuthHeaders(),
        }
      );
      return await response.json();
    } catch (error) {
      console.error('AccountingService.getProjectAccountingSummaries error:', error);
      throw error;
    }
  }

  /**
   * Mark the draft as COMPLETED.
   * Requires completionPercent == 100 on the backend.
   */
  async completeDraft(projectId) {
    try {
      const response = await fetchWithAuth(
        `${API_BASE_URL}/api/accounting/projects/${projectId}/draft/complete`,
        {
          method: 'POST',
          headers: authService.getAuthHeaders(),
        }
      );
      return await response.json();
    } catch (error) {
      console.error('AccountingService.completeDraft error:', error);
      throw error;
    }
  }

  /**
   * Get aggregated cost summary for a project.
   * Returns structured cost data from accounting tables (replaces legacy costDetails/priceDetails).
   */
  async getCostSummary(projectId) {
    try {
      const response = await fetchWithAuth(
        `${API_BASE_URL}/api/accounting/projects/${projectId}/cost-summary`,
        {
          method: 'GET',
          headers: authService.getAuthHeaders(),
        }
      );
      return await response.json();
    } catch (error) {
      console.error('AccountingService.getCostSummary error:', error);
      throw error;
    }
  }

  /**
   * Upload a document to S3 for the given project.
   * Returns { key: <public S3 URL> }
   */
  async uploadDocument(projectId, file) {
    try {
      const formData = new FormData();
      formData.append('file', file);

      // For multipart requests we must NOT set Content-Type manually —
      // the browser sets it with the correct boundary automatically.
      const headers = {
        Authorization: `Bearer ${authService.getToken()}`,
      };

      const response = await fetchWithAuth(
        `${API_BASE_URL}/api/accounting/projects/${projectId}/draft/upload`,
        {
          method: 'POST',
          headers,
          body: formData,
        }
      );
      return await response.json(); // { key: "https://..." }
    } catch (error) {
      console.error('AccountingService.uploadDocument error:', error);
      throw error;
    }
  }
}

export default new AccountingService();
