import React, { createContext, useContext, useState, useEffect } from 'react';
import authService from '../services/authService';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    const userData = authService.getUser();

    // isAuthenticated() token süresini de kontrol eder; süresi geçmişse oturumu temizler.
    if (authService.isAuthenticated() && userData) {
      setUser(userData);
    } else {
      // If no token or user data, clear everything
      authService.logout();
      setUser(null);
    }
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    try {
      const response = await authService.login(username, password);
      setUser(response);
      return response;
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    authService.logout();
    setUser(null);
  };

  const handleSessionExpired = () => {
    // Clear auth data
    authService.logout();
    setUser(null);

    // Redirect to login page immediately without showing any message
    window.location.href = '/login';
  };

  const isAuthenticated = () => {
    return authService.isAuthenticated();
  };

  const isAdmin = () => {
    return user && user.role === 'ADMIN';
  };

  const canEdit = () => {
    // Users with VIEWER or SALES roles cannot edit
    return user && user.role !== 'VIEWER' && user.role !== 'SALES';
  };

  const canAccessUserManagement = () => {
    // Only ADMIN users can access user management
    return user && user.role === 'ADMIN';
  };

  const canDelete = () => {
    // Users with VIEWER or SALES roles cannot delete
    return user && user.role !== 'VIEWER' && user.role !== 'SALES';
  };

  const canSubmitOffer = () => {
    // Only VIEWER role cannot submit offers (SALES and ADMIN can)
    return user && user.role !== 'VIEWER';
  };

  const canAddCompany = () => {
    // Only VIEWER role cannot add companies (SALES and ADMIN can)
    return user && user.role !== 'VIEWER';
  };

  const canCreateProject = () => {
    // VIEWER and SALES roles cannot create new projects
    return user && user.role !== 'VIEWER' && user.role !== 'SALES';
  };

  const canExportData = () => {
    // VIEWER and SALES roles cannot export data to Excel
    return user && user.role !== 'VIEWER' && user.role !== 'SALES';
  };

  const value = {
    user,
    login,
    logout,
    handleSessionExpired,
    isAuthenticated,
    isAdmin,
    canEdit,
    canAccessUserManagement,
    canDelete,
    canSubmitOffer,
    canAddCompany,
    canCreateProject,
    canExportData,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
