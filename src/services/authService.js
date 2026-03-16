import API_BASE_URL from '../config';

class AuthService {
  constructor() {
    this.token = localStorage.getItem('authToken');
    this.user = JSON.parse(localStorage.getItem('user') || 'null');
  }

  async login(username, password) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          password,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Giriş başarısız');
      }

      const data = await response.json();
      
      console.log('=== LOGIN RESPONSE ===');
      console.log('Full login response data:', data);
      console.log('User role from login response:', data.role);
      
      // Store token
      this.token = data.token;
      localStorage.setItem('authToken', this.token);

      // Create user object with role from login response
      this.user = {
        id: data.id,
        username: data.username,
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role || 'VIEWER', // Use role from login response, default to VIEWER if not provided
      };

      console.log('=== FINAL USER OBJECT ===');
      console.log('User object:', this.user);
      console.log('User role:', this.user.role);
      console.log('Storing to localStorage...');
      localStorage.setItem('user', JSON.stringify(this.user));
      console.log('Stored in localStorage:', localStorage.getItem('user'));
      console.log('=== END LOGIN PROCESS ===');

      return this.user;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  logout() {
    this.token = null;
    this.user = null;
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
  }

  isAuthenticated() {
    return !!this.token;
  }

  getToken() {
    return this.token;
  }

  getUser() {
    return this.user;
  }

  getAuthHeaders() {
    return {
      'Authorization': `Bearer ${this.token}`,
      'Content-Type': 'application/json',
    };
  }
}

export default new AuthService();
