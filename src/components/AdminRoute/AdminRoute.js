import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const AdminRoute = ({ children }) => {
  const { isAuthenticated, isAdmin, loading, user } = useAuth();

  // Debug logging
  console.log('AdminRoute - Loading:', loading);
  console.log('AdminRoute - User:', user);
  console.log('AdminRoute - isAuthenticated():', isAuthenticated());
  console.log('AdminRoute - isAdmin():', isAdmin());

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontSize: '18px',
        color: '#666'
      }}>
        Yükleniyor...
      </div>
    );
  }

  // First check if user is authenticated
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  // Then check if user has admin role
  if (!isAdmin()) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        gap: '20px'
      }}>
        <h2 style={{ color: '#e74c3c', fontSize: '24px' }}>Erişim Engellendi</h2>
        <p style={{ color: '#666', fontSize: '16px' }}>
          Bu sayfaya erişim yetkiniz bulunmamaktadır.
        </p>
        <p style={{ color: '#999', fontSize: '14px' }}>
          Sadece yönetici (ADMIN) yetkisine sahip kullanıcılar bu sayfayı görüntüleyebilir.
        </p>
      </div>
    );
  }

  return children;
};

export default AdminRoute;

