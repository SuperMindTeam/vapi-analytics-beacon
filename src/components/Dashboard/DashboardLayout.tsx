
import React, { useState } from "react";
import Sidebar from "@/components/Dashboard/Sidebar";
import Header from "@/components/Dashboard/Header";
import { Outlet } from "react-router-dom";

const DashboardLayout: React.FC = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="dashboard-layout">
      <Sidebar 
        collapsed={sidebarCollapsed} 
        setCollapsed={setSidebarCollapsed} 
      />
      
      <div className="dashboard-main">
        <Header />
        
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
