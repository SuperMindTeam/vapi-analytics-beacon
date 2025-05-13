
import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import { usePagePersistence } from '@/hooks/usePagePersistence';

const DashboardLayout = () => {
  // Add state for sidebar collapse
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  // Use the page persistence hook to remember the current page
  usePagePersistence();
  
  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#F7F7F7]">
      <Sidebar collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
