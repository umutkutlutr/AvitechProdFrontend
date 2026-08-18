import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import MainLayout from './components/Layout/MainLayout';
import CreateServiceReceipt from './components/ServiceReceipt/CreateServiceReceipt';
import AllServices from './components/ServiceReceipt/AllServices';
import PotentialMachines from './components/PotentialMachines/PotentialMachines';
import QuotesSent from './components/ServiceReceipt/QuotesSent';
import ClosedProjects from './components/ServiceReceipt/ClosedProjects';
import ErrorReceipts from './components/ServiceReceipt/ErrorReceipts';
import MainMenu from './components/MainMenu/MainMenu';
import Login from './components/Login/Login';
import ProtectedRoute from './components/ProtectedRoute/ProtectedRoute';
import AdminRoute from './components/AdminRoute/AdminRoute';
import './App.css';
import UserManagement from './components/UserManagement/UserManagement';
import RegisteredCompanies from './components/RegisteredCompanies/RegisteredCompanies';
import RegisteredBanks from './components/RegisteredBanks/RegisteredBanks';
import AdminPanel from './components/AdminPanel/AdminPanel';
import ProjeMuhasebesi from './components/ProjeMuhasebesi/ProjeMuhasebesi';
import KampanyaYonetimi from './components/KampanyaYonetimi/KampanyaYonetimi';

function AppContent() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [editingService, setEditingService] = useState(null);

  const handleEditService = (service) => {
    setEditingService(service);
    navigate('/createService');
  };

  const handleSaveComplete = (savedService) => {
    setEditingService(null);
    // Navigation will be handled by React Router
  };

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          isAuthenticated() ?
            <Navigate to="/mainMenu" replace /> :
            <Navigate to="/login" replace />
        }
      />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <MainLayout>
              <Routes>
                <Route path="/mainMenu" element={<MainMenu />} />
                <Route
                  path="/createService"
                  element={
                    <CreateServiceReceipt
                      editingService={editingService}
                      onSaveComplete={handleSaveComplete}
                    />
                  }
                />
                <Route
                  path="/userManagement"
                  element={
                    <AdminRoute>
                      <UserManagement />
                    </AdminRoute>
                  }
                />
                <Route
                  path="/registeredCompanies"
                  element={<RegisteredCompanies />}
                />
                <Route
                  path="/registeredBanks"
                  element={<RegisteredBanks />}
                />
                <Route
                  path="/allServices"
                  element={
                    <AllServices
                      onEditService={handleEditService}
                    />
                  }
                />
                <Route
                  path="/potentialMachines"
                  element={<PotentialMachines />}
                />
                <Route
                  path="/quotesSent"
                  element={
                    <QuotesSent
                      onEditService={handleEditService}
                    />
                  }
                />
                <Route
                  path="/closedProjects"
                  element={
                    <ClosedProjects
                      onEditService={handleEditService}
                    />
                  }
                />
                <Route
                  path="/allUsers"
                  element={
                    <div className="placeholder-content">
                      <h1>Tüm Kullanıcılar</h1>
                      <p>Bu sayfa henüz hazır değil.</p>
                    </div>
                  }
                />
                <Route
                  path="/newUser"
                  element={
                    <div className="placeholder-content">
                      <h1>Yeni Kullanıcı</h1>
                      <p>Bu sayfa henüz hazır değil.</p>
                    </div>
                  }
                />
                <Route
                  path="/profile"
                  element={
                    <div className="placeholder-content">
                      <h1>Profilim</h1>
                      <p>Bu sayfa henüz hazır değil.</p>
                    </div>
                  }
                />
                {/* /manual removed — redirect to home */}
                <Route path="/manual" element={<Navigate to="/" replace />} />
                <Route
                  path="/errorReceipts"
                  element={<ErrorReceipts />}
                />
                <Route
                  path="/projeMuhasebesi"
                  element={<ProjeMuhasebesi />}
                />
                <Route
                  path="/projeMuhasebesi/:projectId"
                  element={<ProjeMuhasebesi />}
                />
                <Route
                  path="/kampanyaYonetimi"
                  element={<KampanyaYonetimi />}
                />
                <Route
                  path="/adminPanel"
                  element={
                    <AdminRoute>
                      <AdminPanel />
                    </AdminRoute>
                  }
                />
                <Route
                  path="*"
                  element={
                    <div className="placeholder-content">
                      <h1>Sayfa Bulunamadı</h1>
                      <p>Aradığınız sayfa mevcut değil veya taşınmış olabilir.</p>
                      <a href="/mainMenu">Ana menüye dön</a>
                    </div>
                  }
                />
              </Routes>
            </MainLayout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <AppContent />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
