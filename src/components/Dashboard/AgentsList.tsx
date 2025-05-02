
import React, { useState } from "react";
import { 
  Card,
  CardContent,
  CardHeader,
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash, Edit } from "lucide-react";
import { formatDate, capitalize } from "@/utils/formatters";
import CreateAgentModal from "./CreateAgentModal";

// Sample data - would be replaced by actual data from the API
const sampleAgents = [
  {
    id: "agt_1",
    name: "Customer Support Agent",
    voice_id: "alloy",
    status: "active",
    active_calls: 2,
    created_at: "2023-11-15T14:48:00Z",
  },
  {
    id: "agt_2",
    name: "Sales Representative",
    voice_id: "shimmer",
    status: "active",
    active_calls: 0,
    created_at: "2023-12-03T09:32:00Z",
  },
  {
    id: "agt_3",
    name: "Appointment Scheduler",
    voice_id: "nova",
    status: "inactive",
    active_calls: 0,
    created_at: "2024-01-07T16:15:00Z",
  }
];

const AgentsList: React.FC = () => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  
  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Agents</CardTitle>
          <Button 
            onClick={() => setIsCreateModalOpen(true)} 
            size="sm"
            className="bg-[hsl(var(--dashboard-purple))] hover:bg-[hsl(var(--dashboard-purple))/0.9]"
          >
            <Plus size={16} className="mr-2" />
            New Agent
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Voice</TableHead>
                <TableHead>Active Calls</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sampleAgents.map((agent) => (
                <TableRow key={agent.id}>
                  <TableCell className="font-medium">{agent.name}</TableCell>
                  <TableCell>
                    <Badge 
                      variant={agent.status === "active" ? "default" : "secondary"}
                      className={
                        agent.status === "active" 
                          ? "bg-green-500 hover:bg-green-600" 
                          : ""
                      }
                    >
                      {capitalize(agent.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>{capitalize(agent.voice_id)}</TableCell>
                  <TableCell>{agent.active_calls}</TableCell>
                  <TableCell>{formatDate(agent.created_at)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <Button variant="ghost" size="icon" title="Edit agent">
                        <Edit size={16} />
                      </Button>
                      <Button variant="ghost" size="icon" title="Delete agent">
                        <Trash size={16} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <CreateAgentModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)}
      />
    </>
  );
};

export default AgentsList;
