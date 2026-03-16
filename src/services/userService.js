import authService from './authService';
import { fetchWithAuth } from '../utils/apiUtils';

import API_BASE_URL from '../config';

class UserService {
  async getUsers() {
    try {
      const response = await fetchWithAuth(`${API_BASE_URL}/api/users`, {
        method: 'GET',
        headers: authService.getAuthHeaders(),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Get users error:', error);
      throw error;
    }
  }

  async getUserById(userId) {
    try {
      const response = await fetchWithAuth(`${API_BASE_URL}/api/users/${userId}`, {
        method: 'GET',
        headers: authService.getAuthHeaders(),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Get user by ID error:', error);
      throw error;
    }
  }

  async createUser(userData) {
    try {
      const payload = {
        ...userData,
        role: userData.role || 'VIEWER',
      };

      const response = await fetchWithAuth(`${API_BASE_URL}/api/users`, {
        method: 'POST',
        headers: authService.getAuthHeaders(),
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Create user error:', error);
      throw error;
    }
  }

  async updateUser(userId, userData) {
    try {
      const response = await fetchWithAuth(`${API_BASE_URL}/api/users/${userId}`, {
        method: 'PATCH',
        headers: authService.getAuthHeaders(),
        body: JSON.stringify(userData),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Update user error:', error);
      throw error;
    }
  }

  async deleteUser(userId) {
    try {
      const response = await fetchWithAuth(`${API_BASE_URL}/api/users/${userId}`, {
        method: 'DELETE',
        headers: authService.getAuthHeaders(),
      });

      return true;
    } catch (error) {
      console.error('Delete user error:', error);
      throw error;
    }
  }
}

export default new UserService();


