import authService from './authService';
import {
  fetchWithAuth,
  handleApiResponse,
  extractFilenameFromResponse,
  handleProjectMultipartAuthResponse,
} from '../utils/apiUtils';

import API_BASE_URL from '../config';

class ProjectService {
  async getProjects() {
    try {
      const response = await fetchWithAuth(`${API_BASE_URL}/api/projects`, {
        method: 'GET',
        headers: authService.getAuthHeaders(),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Get projects error:', error);
      throw error;
    }
  }

  async getProjectById(id) {
    try {
      const response = await fetchWithAuth(`${API_BASE_URL}/api/projects/${id}`, {
        method: 'GET',
        headers: authService.getAuthHeaders(),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Get project by id error:', error);
      throw error;
    }
  }

  async createProject(projectData, photoFiles = []) {
    try {
      // Create FormData for multipart/form-data request
      const formData = new FormData();

      // Remove photos from projectData since we'll send them separately as files
      const { photos, ...projectDataWithoutPhotos } = projectData;

      // Add projectData as a JSON Blob with proper content type
      // This ensures the backend can properly parse the JSON field
      const projectDataJson = JSON.stringify(projectDataWithoutPhotos);
      const projectDataBlob = new Blob([projectDataJson], { type: 'application/json' });
      formData.append('projectData', projectDataBlob, 'projectData.json');

      // Add photo files
      if (photoFiles && photoFiles.length > 0) {
        photoFiles.forEach((photo, index) => {
          if (photo.file) {
            // Append actual file object
            formData.append('photos', photo.file, photo.name || `photo_${index}.jpg`);
          }
        });
      }

      // Log the request details
      console.log('=== PROJECT SERVICE REQUEST (WITH FILES) ===');
      console.log('URL:', `${API_BASE_URL}/api/projects`);
      console.log('Method: POST');
      console.log('Content-Type: multipart/form-data');
      console.log('Project Data:', projectDataWithoutPhotos);
      console.log('Number of photos:', photoFiles.length);
      console.log('==========================================');

      // Get auth headers but remove Content-Type to let browser set it with boundary
      const authHeaders = authService.getAuthHeaders();
      const headersWithoutContentType = { ...authHeaders };
      delete headersWithoutContentType['Content-Type'];

      const response = await fetch(`${API_BASE_URL}/api/projects`, {
        method: 'POST',
        headers: {
          ...headersWithoutContentType,
          // Don't set Content-Type - let browser set it with boundary for multipart/form-data
        },
        body: formData,
      });

      console.log('=== RESPONSE DETAILS ===');
      console.log('Status:', response.status);
      console.log('Status Text:', response.statusText);
      console.log('Headers:', Object.fromEntries(response.headers.entries()));

      await handleProjectMultipartAuthResponse(response);

      if (!response.ok) {
        const errorData = await response.json();
        console.log('Error Response Data:', errorData);
        const error = new Error(errorData.message || 'Request failed');
        error.response = {
          status: response.status,
          statusText: response.statusText,
          data: errorData,
        };
        throw error;
      }

      const data = await response.json();
      console.log('Success Response:', data);
      console.log('=======================');
      return data;
    } catch (error) {
      console.error('Create project error:', error);
      throw error;
    }
  }

  async updateProject(id, projectData, photoFiles = [], existingPhotoUrls = []) {
    try {
      // Create FormData for multipart/form-data request
      const formData = new FormData();

      // DON'T remove photos from projectData - we need to include existing photo URLs in it
      // Add existing photo URLs to the projectData.photos array
      const projectDataWithPhotos = {
        ...projectData,
        photos: existingPhotoUrls // This will be the array of existing photo URLs
      };

      // Add projectData as a JSON Blob with proper content type
      // This ensures the backend can properly parse the JSON field
      const projectDataJson = JSON.stringify(projectDataWithPhotos);
      const projectDataBlob = new Blob([projectDataJson], { type: 'application/json' });
      formData.append('projectData', projectDataBlob, 'projectData.json');

      // Add new photo files to multipart 'photos' field
      if (photoFiles && photoFiles.length > 0) {
        photoFiles.forEach((photo, index) => {
          if (photo.file) {
            // Append actual file object
            formData.append('photos', photo.file, photo.name || `photo_${index}.jpg`);
          }
        });
      }

      // Log the request details
      console.log('=== PROJECT UPDATE REQUEST (WITH FILES) ===');
      console.log('URL:', `${API_BASE_URL}/api/projects/${id}`);
      console.log('Method: PUT');
      console.log('Content-Type: multipart/form-data');
      console.log('Project Data (with existing photo URLs):', projectDataWithPhotos);
      console.log('Existing Photo URLs in projectData.photos:', existingPhotoUrls);
      console.log('Number of new photo files in multipart:', photoFiles.length);
      console.log('==========================================');

      // Get auth headers but remove Content-Type to let browser set it with boundary
      const authHeaders = authService.getAuthHeaders();
      const headersWithoutContentType = { ...authHeaders };
      delete headersWithoutContentType['Content-Type'];

      const response = await fetch(`${API_BASE_URL}/api/projects/${id}`, {
        method: 'PUT',
        headers: {
          ...headersWithoutContentType,
          // Don't set Content-Type - let browser set it with boundary for multipart/form-data
        },
        body: formData,
      });

      console.log('=== UPDATE RESPONSE DETAILS ===');
      console.log('Status:', response.status);
      console.log('Status Text:', response.statusText);
      console.log('Headers:', Object.fromEntries(response.headers.entries()));

      await handleProjectMultipartAuthResponse(response);

      if (!response.ok) {
        const errorData = await response.json();
        console.log('Error Response Data:', errorData);
        const error = new Error(errorData.message || 'Request failed');
        error.response = {
          status: response.status,
          statusText: response.statusText,
          data: errorData,
        };
        throw error;
      }

      const data = await response.json();
      console.log('Success Response:', data);
      console.log('==============================');
      return data;
    } catch (error) {
      console.error('Update project error:', error);
      throw error;
    }
  }

  async deleteProject(id) {
    try {
      const response = await fetchWithAuth(`${API_BASE_URL}/api/projects/${id}`, {
        method: 'DELETE',
        headers: authService.getAuthHeaders(),
      });

      return true;
    } catch (error) {
      console.error('Delete project error:', error);
      throw error;
    }
  }

  async getProjectsByStatus(status) {
    try {
      const response = await fetchWithAuth(`${API_BASE_URL}/api/projects/status/${status}`, {
        method: 'GET',
        headers: authService.getAuthHeaders(),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Get projects by status error:', error);
      throw error;
    }
  }

  async getOffers() {
    try {
      const response = await fetchWithAuth(`${API_BASE_URL}/api/offers`, {
        method: 'GET',
        headers: authService.getAuthHeaders(),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Get offers error:', error);
      throw error;
    }
  }

  async getDeletedProjects() {
    try {
      const response = await fetchWithAuth(`${API_BASE_URL}/api/projects/deleted`, {
        method: 'GET',
        headers: authService.getAuthHeaders(),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Get deleted projects error:', error);
      throw error;
    }
  }

  async undeleteProject(id) {
    try {
      const response = await fetchWithAuth(`${API_BASE_URL}/api/projects/deleted/${id}/undelete`, {
        method: 'POST',
        headers: authService.getAuthHeaders(),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Undelete project error:', error);
      throw error;
    }
  }

  async hardDeleteProject(id) {
    try {
      const response = await fetchWithAuth(`${API_BASE_URL}/api/projects/deleted/${id}`, {
        method: 'DELETE',
        headers: authService.getAuthHeaders(),
      });

      return true;
    } catch (error) {
      console.error('Hard delete project error:', error);
      throw error;
    }
  }

  async sendOffer(id, offerData) {
    try {
      const response = await fetchWithAuth(`${API_BASE_URL}/api/projects/${id}/send-offer`, {
        method: 'POST',
        headers: {
          ...authService.getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(offerData),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Send offer error:', error);
      throw error;
    }
  }

  async sendOfferToClients(projectId, clientIds, ccEmails = [], price, description, senderSignature = null) {
    try {
      // Send individual requests for each client
      const promises = clientIds.map(async (clientId) => {
        const payload = {
          projectId: projectId,
          clientId: clientId,
          ccEmails: ccEmails,
          price: price,
          description: description,
        };
        if (senderSignature) {
          payload.senderSignature = senderSignature;
        }
        const response = await fetchWithAuth(`${API_BASE_URL}/api/offers`, {
          method: 'POST',
          headers: {
            ...authService.getAuthHeaders(),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        return await response.json();
      });

      // Wait for all requests to complete
      const results = await Promise.all(promises);
      return results;
    } catch (error) {
      console.error('Send offer to clients error:', error);
      throw error;
    }
  }

  async getProjectCountsByStatus() {
    try {
      const response = await fetchWithAuth(`${API_BASE_URL}/api/projects/count-by-status`, {
        method: 'POST',
        headers: {
          ...authService.getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          statuses: ["TEMPLATE", "SOLD", "BOUGHT", "OFFER_SENT", "CANCELLED"]
        }),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Get project counts by status error:', error);
      throw error;
    }
  }

  async searchProjects(query) {
    try {
      const response = await fetchWithAuth(`${API_BASE_URL}/api/projects/search?q=${encodeURIComponent(query)}`, {
        method: 'GET',
        headers: authService.getAuthHeaders(),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Search projects error:', error);
      throw error;
    }
  }

  async getFilterOptions() {
    try {
      const response = await fetchWithAuth(`${API_BASE_URL}/api/projects/filter-options`, {
        method: 'GET',
        headers: authService.getAuthHeaders(),
      });
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Get filter options error:', error);
      return {};
    }
  }

  async filterProjects(filters) {
    try {
      // Build query string from filters object
      const queryParams = new URLSearchParams();

      Object.keys(filters).forEach(key => {
        if (filters[key] !== '' && filters[key] !== null && filters[key] !== undefined) {
          queryParams.append(key, filters[key]);
        }
      });

      const response = await fetchWithAuth(`${API_BASE_URL}/api/projects/filter?${queryParams.toString()}`, {
        method: 'GET',
        headers: authService.getAuthHeaders(),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Filter projects error:', error);
      throw error;
    }
  }

  // Utility function to get the next AVEMAK project code
  getNextAvemakProjectCode(existingProjects = []) {
    try {
      console.log('=== AVEMAK PROJECT CODE GENERATION ===');
      console.log('Existing projects:', existingProjects);
      console.log('Number of existing projects:', existingProjects.length);

      // Extract AVEMAK codes from existing projects
      const avemakCodes = existingProjects
        .map(project => {
          console.log('Processing project:', project);
          if (project.projectCode && typeof project.projectCode === 'string' && project.projectCode.startsWith('AVEMAK-')) {
            const match = project.projectCode.match(/AVEMAK-(\d+)/);
            const code = match ? parseInt(match[1]) : 0;
            console.log('Found AVEMAK code:', project.projectCode, '->', code);
            return code;
          }
          console.log('No AVEMAK code found for project:', project.projectCode);
          return 0;
        })
        .filter(code => code > 0);

      console.log('Extracted AVEMAK codes:', avemakCodes);

      // Find the highest existing code, default to 0 if none exist
      const maxCode = avemakCodes.length > 0 ? Math.max(...avemakCodes) : 0;
      console.log('Max existing code:', maxCode);

      // Return the next code in AVEMAK-XXX format
      const nextCode = maxCode + 1;
      const result = `AVEMAK-${nextCode.toString().padStart(3, '0')}`;
      console.log('Next AVEMAK code:', result);
      console.log('=====================================');

      return result;
    } catch (error) {
      console.error('Error generating next AVEMAK project code:', error);
      // Fallback to AVEMAK-001 if there's an error
      return 'AVEMAK-001';
    }
  }

  /**
   * Next AVEMAK-* display hint from API project list only (single source of truth; no localStorage).
   */
  async getNextAvemakProjectCodeSafe() {
    try {
      let apiProjects = [];
      try {
        apiProjects = await this.getProjects();
      } catch (apiError) {
        console.warn('Could not fetch projects from API for safe numbering:', apiError);
      }
      return this.getNextAvemakProjectCode(apiProjects);
    } catch (error) {
      console.error('Error in safe AVEMAK project code generation:', error);
      return 'AVEMAK-001';
    }
  }

  async sentToAccounting(id) {
    try {
      const response = await fetchWithAuth(`${API_BASE_URL}/api/projects/${id}/sendToAccounting`, {
        method: 'POST',
        headers: authService.getAuthHeaders(),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Send to accounting error:', error);
      throw error;
    }
  }

  async exportProjectsToExcel() {
    try {
      const response = await fetchWithAuth(`${API_BASE_URL}/api/projects/export/excel`, {
        method: 'GET',
        headers: authService.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error('Excel dışa aktarma başarısız oldu');
      }

      // Extract filename from response header
      const filename = extractFilenameFromResponse(response, 'projects.xlsx');

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
      console.error('Export projects to Excel error:', error);
      throw error;
    }
  }

  async exportCostSummaryToExcel(id) {
    try {
      const response = await fetchWithAuth(`${API_BASE_URL}/api/projects/export/${id}/cost-summary`, {
        method: 'GET',
        headers: authService.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error('Maliyet özeti Excel dışa aktarma başarısız oldu');
      }

      // Extract filename from response header
      const filename = extractFilenameFromResponse(response, `cost_summary_${id}.xlsx`);

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
      console.error('Export cost summary to Excel error:', error);
      throw error;
    }
  }

  async getExpenseItems() {
    try {
      const response = await fetchWithAuth(`${API_BASE_URL}/api/expense-items`, {
        method: 'GET',
        headers: authService.getAuthHeaders(),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Get expense items error:', error);
      throw error;
    }
  }

  async createExpenseItems(expenseItemsArray) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/expense-items/bulk`, {
        method: 'POST',
        headers: {
          ...authService.getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(expenseItemsArray),
      });

      // Handle 409 Conflict (duplicate resource) before calling handleApiResponse
      if (response.status === 409) {
        const errorData = await response.json();
        const error = new Error(errorData.message || 'Duplicate resource');
        error.errorCode = errorData.errorCode;
        error.status = 409;
        throw error;
      }

      // For other errors, use the standard error handling
      await handleApiResponse(response);

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Create expense items error:', error);
      throw error;
    }
  }

  async getOperatingSystems() {
    try {
      const response = await fetchWithAuth(`${API_BASE_URL}/api/operating-systems`, {
        method: 'GET',
        headers: authService.getAuthHeaders(),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Get operating systems error:', error);
      throw error;
    }
  }

  async createOperatingSystem(operatingSystemData) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/operating-systems`, {
        method: 'POST',
        headers: {
          ...authService.getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(operatingSystemData),
      });

      // Handle 409 Conflict (duplicate resource) before calling handleApiResponse
      if (response.status === 409) {
        const errorData = await response.json();
        const error = new Error(errorData.message || 'Duplicate resource');
        error.errorCode = errorData.errorCode;
        error.status = 409;
        throw error;
      }

      // For other errors, use the standard error handling
      await handleApiResponse(response);

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Create operating system error:', error);
      throw error;
    }
  }
}

export default new ProjectService();

