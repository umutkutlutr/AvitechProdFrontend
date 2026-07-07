import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  AiOutlineHome,
  AiOutlinePlus,
  AiOutlineFolder,
  AiOutlineUser,
  AiOutlineTeam,
  AiOutlineDelete,
  AiOutlineWarning,
  AiOutlineSend,
  AiOutlineCheckCircle,
  AiOutlineLogout,
  AiOutlineBank,
  AiOutlineCreditCard,
  AiOutlineDashboard,
  AiOutlineCalculator,
  AiOutlineMail
} from 'react-icons/ai';
import './Sidebar.css';

const Sidebar = ({ isOpen, onClose }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user, isAdmin, canAccessUserManagement, canCreateProject } = useAuth();

  // Debug logging

  // Menü öğeleri, daha kolay yönetim için bir nesne içinde gruplandırıldı.
  const menuItems = {
    main: [
      { id: 'main-menu', label: '', icon: null, path: '/mainMenu', isLogo: true }
    ],
    services: [
      { id: 'create-service', label: 'Yeni Proje Oluştur', icon: AiOutlinePlus, path: '/createService', viewerHidden: true },
      { id: 'all-services', label: 'Aktif Projeler', icon: AiOutlineFolder, path: '/allServices' },
      { id: 'quotes-sent', label: 'Teklifler', icon: AiOutlineSend, path: '/quotesSent' },
      { id: 'closed-projects', label: 'Tamamlanan Projeler', icon: AiOutlineCheckCircle, path: '/closedProjects' }
    ],
    userActions: [
      { id: 'user-management', label: 'Kullanıcı İşlemleri', icon: AiOutlineTeam, path: '/userManagement', adminOnly: true },
      { id: 'registered-companies', label: 'Kayıtlı Firmalar', icon: AiOutlineBank, path: '/registeredCompanies' },
      { id: 'registered-banks', label: 'Kayıtlı Bankalar', icon: AiOutlineCreditCard, path: '/registeredBanks' }
    ],
    accounting: [
      { id: 'proje-muhasebesi', label: 'Proje Muhasebesi', icon: AiOutlineCalculator, path: '/projeMuhasebesi' },
      { id: 'kampanya-yonetimi', label: 'Stok Tanıtım Gönderimi', icon: AiOutlineMail, path: '/kampanyaYonetimi' }
    ],
    other: [
      { id: 'error-receipts', label: 'İptal Edilen Projeler', icon: AiOutlineDelete, path: '/errorReceipts' }
    ]
  };

  // Admin-only menu items - only visible to users with ADMIN role
  // Add to services section, right after "Completed Projects"
  if (isAdmin()) {
    menuItems.services.push({
      id: 'admin-panel',
      label: 'Yönetici Paneli',
      icon: AiOutlineDashboard,
      path: '/adminPanel'
    });
  }

  // Menü öğesine tıklandığında mobilde sidebar'ı kapat
  const handleMenuItemClick = (path) => {
    navigate(path);
    if (onClose && window.innerWidth <= 768) {
      onClose();
    }
  };

  // Belirli bir bölümdeki menü öğelerini render eden yardımcı fonksiyon
  const renderMenuItems = (items) => {
    return items
      .filter(item => {
        // If item is marked as adminOnly, only show to admin users
        if (item.adminOnly) {
          return canAccessUserManagement();
        }
        // If item is marked as viewerHidden, hide from VIEWER role users
        if (item.viewerHidden) {
          return canCreateProject();
        }
        return true;
      })
      .map(item => (
        <div
          key={item.id}
          className={`menu-item ${location.pathname === item.path ? 'active' : ''}`}
          onClick={() => handleMenuItemClick(item.path)}
        >
          {item.isLogo ? (
            <img
              src="/assets/avitech_logo.png"
              alt="Avitech Logo"
              className="menu-logo"
            />
          ) : (
            <item.icon className="menu-icon" />
          )}
          {!item.isLogo && <span className="menu-label">{item.label}</span>}
        </div>
      ));
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className={`sidebar ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-content">
        {/* Ana Menü */}
        <div className="menu-section">
          {renderMenuItems(menuItems.main)}
        </div>

        {/* Servis İşlemleri */}
        <div className="menu-section">
          <div className="section-header">
            <span className="section-title">PROJE İŞLEMLERİ</span>
          </div>
          {renderMenuItems(menuItems.services)}
        </div>

        {/* Muhasebe & Pazarlama */}
        <div className="menu-section">
          <div className="section-header">
            <span className="section-title">MUHASEBE & PAZARLAMA</span>
          </div>
          {renderMenuItems(menuItems.accounting)}
        </div>

        {/* Kullanıcı İşlemleri - Visible to all users, but User Management only to ADMIN */}
        <div className="menu-section">
          <div className="section-header">
            <span className="section-title">KULLANICI İŞLEMLERİ</span>
          </div>
          {renderMenuItems(menuItems.userActions)}
        </div>

        {/* Diğer İçerikler */}
        <div className="menu-section">
          <div className="section-header">
            <span className="section-title">DİĞER İÇERİKLER</span>
          </div>
          {renderMenuItems(menuItems.other)}
        </div>

        {/* Kullanıcı Bilgisi ve Çıkış */}
        <div className="menu-section user-section">

          <div
            className="menu-item logout-item"
            onClick={handleLogout}
          >
            <AiOutlineLogout className="menu-icon" />
            <span className="menu-label">Çıkış Yap</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;