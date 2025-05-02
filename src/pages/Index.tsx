
import React, { useState } from "react";
import Sidebar from "@/components/Dashboard/Sidebar";
import Header from "@/components/Dashboard/Header";
import CallsOverview from "@/components/Dashboard/CallsOverview";
import AgentsList from "@/components/Dashboard/AgentsList";

const Index: React.FC = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="dashboard-layout">
      <Sidebar 
        collapsed={sidebarCollapsed} 
        setCollapsed={setSidebarCollapsed} 
      />
      
      <div className="dashboard-main">
        <Header />
        
        <main className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Overview</h2>
          </div>
          
          <CallsOverview />
          
          <div className="mt-8">
            <AgentsList />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Index;
