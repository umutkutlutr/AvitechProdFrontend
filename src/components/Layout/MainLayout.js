import React, { useState } from 'react';
import Sidebar from '../Sidebar/Sidebar';
import { AiOutlineMenu, AiOutlineClose } from 'react-icons/ai';
import './MainLayout.css';

const MainLayout = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  return (
    <div className="main-layout">
      {/* Hamburger menu button for mobile */}
      <button className="mobile-menu-toggle" onClick={toggleSidebar}>
        {isSidebarOpen ? <AiOutlineClose /> : <AiOutlineMenu />}
      </button>

      {/* Overlay for mobile when sidebar is open */}
      {isSidebarOpen && <div className="sidebar-overlay" onClick={closeSidebar}></div>}

      <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} />
      <div className="main-content">
        {children}
      </div>
    </div>
  );
};

export default MainLayout;
