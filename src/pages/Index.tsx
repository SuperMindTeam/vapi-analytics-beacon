
import React from "react";
import CallsOverview from "@/components/Dashboard/CallsOverview";
import AgentsList from "@/components/Dashboard/AgentsList";

const Index: React.FC = () => {
  return (
    <div className="p-6 h-full overflow-auto">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Overview</h2>
        </div>
        
        <CallsOverview />
        
        <div className="mt-8">
          <AgentsList />
        </div>
      </div>
    </div>
  );
};

export default Index;
