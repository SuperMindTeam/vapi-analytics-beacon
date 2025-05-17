
import React from "react";
import CallsOverview from "@/components/Dashboard/CallsOverview";
import AgentsList from "@/components/Dashboard/AgentsList";
import { useAuth } from "@/contexts/AuthContext";

const Index: React.FC = () => {
  const { orgId } = useAuth();
  
  return (
    <div className="p-6 h-full overflow-auto">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Overview</h2>
        </div>
        
        <CallsOverview orgId={orgId} />
        
        <div className="mt-8">
          <AgentsList />
        </div>
      </div>
    </div>
  );
};

export default Index;
