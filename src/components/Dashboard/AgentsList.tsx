
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
import { getAgents, deleteAgent } from "@/services/vapiService";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useOrganization } from "@/contexts/OrganizationContext";

const AgentsList: React.FC = () => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const queryClient = useQueryClient();
  const { currentOrganization } = useOrganization();
  
  // Fetch agents data with better error handling
  const { 
    data: agents, 
    isLoading, 
    error,
    refetch
  } = useQuery({
    queryKey: ["agents", currentOrganization?.id],
    queryFn: () => getAgents(currentOrganization?.id),
    retry: 1,
    staleTime: 30000, // 30 seconds
    enabled: !!currentOrganization?.id,
    meta: {
      onError: (err: Error) => {
        console.error('Error fetching agents:', err);
        // Log the full error to help with debugging
        const errorMessage = err instanceof Error 
          ? err.message 
          : 'Unknown error occurred';
        toast.error(`Failed to fetch agents: ${errorMessage}`);
      }
    }
  });
  
  // Delete agent mutation
  const deleteAgentMutation = useMutation({
    mutationFn: deleteAgent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agents", currentOrganization?.id] });
      toast.success("Agent deleted successfully!");
    },
    onError: (error) => {
      console.error('Error deleting agent:', error);
      toast.error(`Failed to delete agent: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });

  // Handle agent deletion with confirmation
  const handleDeleteAgent = (agentId: string, agentName: string) => {
    if (confirm(`Are you sure you want to delete agent "${agentName}"?`)) {
      deleteAgentMutation.mutate(agentId);
    }
  };

  // If no organization is selected yet
  if (!currentOrganization) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Agents</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-10">
          <div className="text-center">
            <p className="text-muted-foreground">Loading organization data...</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
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
  
  // Render error state with detailed error message and retry button
  if (error) {
    // Extract a more detailed error message
    let errorMessage = 'Unknown error occurred';
    let errorDetails = '';
    
    if (error instanceof Error) {
      errorMessage = error.message;
      
      // Check for common Supabase policy errors
      if (errorMessage.includes("policy")) {
        errorDetails = "This may be related to database access permissions.";
      } else if (errorMessage.includes("infinite recursion")) {
        errorDetails = "There appears to be an issue with the database policies.";
      }
      
      // Log additional details if available
      if ('cause' in error) {
        console.error('Error cause:', error.cause);
      }
    }
      
    return (
      <Card>
        <CardHeader>
          <CardTitle>Agents</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertDescription>
              Failed to load data. {errorMessage}
              {errorDetails && <p className="mt-1 text-sm">{errorDetails}</p>}
            </AlertDescription>
          </Alert>
          <Button 
            onClick={() => refetch()}
            variant="outline"
            className="mt-4"
          >
            Retry
          </Button>
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
                        <span>{agent.org_name || 'Unknown'}</span>
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
                          onClick={() => handleDeleteAgent(agent.id, agent.name)}
                          disabled={deleteAgentMutation.isPending && agent.id === deleteAgentMutation.variables}
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
                onClick={() => refetch()}
                variant="outline"
                className="mt-4"
              >
                Retry Loading Agents
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      
      <CreateAgentModal 
        isOpen={isCreateModalOpen} 
        onClose={() => {
          setIsCreateModalOpen(false);
          // Refresh agents list after creating a new agent
          queryClient.invalidateQueries({ queryKey: ["agents", currentOrganization?.id] });
        }}
        orgId={currentOrganization.id}
      />
    </>
  );
};

export default AgentsList;
