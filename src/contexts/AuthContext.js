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
    const token = authService.getToken();
    const userData = authService.getUser();

    console.log('AuthContext - Initial load:', { token, userData });

    if (token && userData) {
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
      console.log('AuthContext - Login response:', response);
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
    const result = user && user.role === 'ADMIN';
    console.log('AuthContext - isAdmin check:', { user, role: user?.role, isAdmin: result });
    return result;
  };

  const canEdit = () => {
    // Users with VIEWER or SALES roles cannot edit
    const result = user && user.role !== 'VIEWER' && user.role !== 'SALES';
    console.log('AuthContext - canEdit check:', { user, role: user?.role, canEdit: result });
    return result;
  };

  const canAccessUserManagement = () => {
    // Only ADMIN users can access user management
    const result = user && user.role === 'ADMIN';
    console.log('AuthContext - canAccessUserManagement check:', { user, role: user?.role, canAccess: result });
    return result;
  };

  const canDelete = () => {
    // Users with VIEWER or SALES roles cannot delete
    const result = user && user.role !== 'VIEWER' && user.role !== 'SALES';
    console.log('AuthContext - canDelete check:', { user, role: user?.role, canDelete: result });
    return result;
  };

  const canSubmitOffer = () => {
    // Only VIEWER role cannot submit offers (SALES and ADMIN can)
    const result = user && user.role !== 'VIEWER';
    console.log('AuthContext - canSubmitOffer check:', { user, role: user?.role, canSubmitOffer: result });
    return result;
  };

  const canAddCompany = () => {
    // Only VIEWER role cannot add companies (SALES and ADMIN can)
    const result = user && user.role !== 'VIEWER';
    console.log('AuthContext - canAddCompany check:', { user, role: user?.role, canAddCompany: result });
    return result;
  };

  const canCreateProject = () => {
    // VIEWER and SALES roles cannot create new projects
    const result = user && user.role !== 'VIEWER' && user.role !== 'SALES';
    console.log('AuthContext - canCreateProject check:', { user, role: user?.role, canCreateProject: result });
    return result;
  };

  const canExportData = () => {
    // VIEWER and SALES roles cannot export data to Excel
    const result = user && user.role !== 'VIEWER' && user.role !== 'SALES';
    console.log('AuthContext - canExportData check:', { user, role: user?.role, canExportData: result });
    return result;
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
