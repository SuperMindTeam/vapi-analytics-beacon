
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
import { Plus, Trash, Edit, Loader2, Building } from "lucide-react";
import { formatDate, capitalize } from "@/utils/formatters";
import CreateAgentModal from "./CreateAgentModal";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAgents, deleteAgent, getUserOrganizations } from "@/services/vapiService";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";

const AgentsList: React.FC = () => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const queryClient = useQueryClient();
  
  // Fetch user organizations
  const { data: organizations } = useQuery({
    queryKey: ["organizations"],
    queryFn: getUserOrganizations,
  });
  
  // Fetch agents data with retry and longer staleTime
  const { data: agents, isLoading, error } = useQuery({
    queryKey: ["agents"],
    queryFn: getAgents,
    retry: 2,
    staleTime: 30000, // 30 seconds
  });
  
  // Delete agent mutation
  const deleteAgentMutation = useMutation({
    mutationFn: deleteAgent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agents"] });
      toast.success("Agent deleted successfully!");
    },
    onError: (error) => {
      toast.error(`Failed to delete agent: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });

  // Handle agent deletion
  const handleDeleteAgent = (agentId: string) => {
    if (confirm("Are you sure you want to delete this agent?")) {
      deleteAgentMutation.mutate(agentId);
    }
  };
  
  // Get organization name by id
  const getOrgName = (orgId: string) => {
    if (!organizations) return "Unknown";
    const org = organizations.find(org => org.id === orgId);
    return org ? org.name : "Unknown";
  };
  
  // Render loading state
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Agents</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-10">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Loading agents...</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Render error state with detailed error message
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Agents</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertDescription>
              Failed to load agents. Please try again later.
              {error instanceof Error ? ` Error: ${error.message}` : ''}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }
  
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
          {agents && agents.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Voice</TableHead>
                  <TableHead>Organization</TableHead>
                  <TableHead>Active Calls</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agents.map((agent) => (
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
                        {capitalize(agent.status || 'unknown')}
                      </Badge>
                    </TableCell>
                    <TableCell>{capitalize(agent.voice_id || 'default')}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Building size={16} className="text-muted-foreground" />
                        <span>{getOrgName(agent.org_id || '')}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {agent.active_calls > 0 ? (
                        <Badge variant="outline" className="bg-blue-50">
                          {agent.active_calls}
                        </Badge>
                      ) : (
                        "0"
                      )}
                    </TableCell>
                    <TableCell>{formatDate(agent.created_at)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button variant="ghost" size="icon" title="Edit agent">
                          <Edit size={16} />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          title="Delete agent"
                          onClick={() => handleDeleteAgent(agent.id)}
                          disabled={deleteAgentMutation.isPending}
                        >
                          {deleteAgentMutation.isPending && agent.id === deleteAgentMutation.variables ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : (
                            <Trash size={16} />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="py-8 text-center">
              <p className="text-muted-foreground">No agents found. Create your first agent to get started.</p>
              <p className="text-sm text-muted-foreground mt-2">
                If you believe this is an error, please check your API key or connection.
              </p>
              <Button 
                onClick={() => queryClient.refetchQueries({ queryKey: ["agents"] })}
                variant="outline"
                className="mt-4"
              >
                Retry Loading Agents
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Pass the required props to the CreateAgentModal component */}
      <CreateAgentModal 
        isOpen={isCreateModalOpen} 
        onClose={() => {
          setIsCreateModalOpen(false);
          // Refresh agents list after creating a new agent
          queryClient.invalidateQueries({ queryKey: ["agents"] });
        }}
        organizations={organizations || []}
      />
    </>
  );
};

export default AgentsList;
