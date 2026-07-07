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

      localStorage.setItem('user', JSON.stringify(this.user));

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
    if (!this.token) {
      return false;
    }
    const payload = this.decodeTokenPayload(this.token);
    // exp yoksa (beklenmedik token biçimi) mevcut davranışı koru: token varsa geçerli say.
    if (!payload || typeof payload.exp !== 'number') {
      return true;
    }
    const nowSeconds = Math.floor(Date.now() / 1000);
    if (payload.exp <= nowSeconds) {
      // Süresi dolmuş token: yerel oturumu temizle ki korumalı sayfa açılmasın.
      this.logout();
      return false;
    }
    return true;
  }

  // JWT payload'ını güvenli şekilde çözer (base64url + UTF-8). Hata olursa null döner.
  decodeTokenPayload(token) {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const json = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(json);
    } catch (e) {
      return null;
    }
  }

  getToken() {
    return this.token;
  }

  getUser() {
    return this.user;
  }

  getAuthHeaders(includeContentType = true) {
    const headers = {
      'Authorization': `Bearer ${this.token}`,
    };
    if (includeContentType) {
      headers['Content-Type'] = 'application/json';
    }
    return headers;
  }
}

export default new AuthService();
