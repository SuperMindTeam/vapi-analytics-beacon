
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "../ui/button";
import { Plus, Trash, RefreshCcw, PhoneCall, Phone, MoreVertical } from "lucide-react";
import { getAgents, deleteAgent } from "@/services/vapiService";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { toast } from "sonner";
import CreateAgentModal from "./CreateAgentModal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Agent {
  id: string;
  name: string;
  phone_number?: string;
  status: string;
  created_at: string;
}

const AgentsList: React.FC = () => {
  const { orgId } = useAuth();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [selectedAgentName, setSelectedAgentName] = useState<string>("");
  const [isDeleting, setIsDeleting] = useState(false);

  console.log("AgentsList rendering with orgId:", orgId);

  // Fetch agents
  const {
    data: agents = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['agents', orgId],
    queryFn: () => getAgents(),
    enabled: !!orgId,
  });

  console.log("Agents data:", agents);

  const handleDeleteClick = (agentId: string, agentName: string) => {
    setSelectedAgentId(agentId);
    setSelectedAgentName(agentName);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedAgentId) return;

    setIsDeleting(true);
    try {
      await deleteAgent(selectedAgentId);
      toast.success(`Agent ${selectedAgentName} deleted successfully!`);
      refetch();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete agent");
      console.error("Delete agent error:", error);
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
      setSelectedAgentId(null);
      setSelectedAgentName("");
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-500";
      case "inactive":
        return "bg-gray-400";
      case "error":
        return "bg-red-500";
      default:
        return "bg-yellow-500";
    }
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Agents</h1>
          <p className="text-muted-foreground">
            Manage your voice agents.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => refetch()}
            title="Refresh"
          >
            <RefreshCcw size={16} />
          </Button>
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <Plus size={16} className="mr-2" />
            Create Agent
          </Button>
        </div>
      </div>

      {isLoading && (
        <div className="flex justify-center mt-12">
          <div className="animate-spin rounded-full border-t-2 border-b-2 border-primary h-8 w-8"></div>
        </div>
      )}

      {isError && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded mt-4">
          <p className="text-red-700">
            Error loading agents: {(error as Error)?.message || "Unknown error"}
          </p>
          <Button
            variant="ghost"
            className="mt-2 text-red-700"
            onClick={() => refetch()}
          >
            Try Again
          </Button>
        </div>
      )}

      {!isLoading && !isError && agents?.length === 0 && (
        <div className="bg-background border rounded-lg py-12 text-center">
          <h3 className="text-lg font-medium">No agents found</h3>
          <p className="text-muted-foreground mt-1">
            Create your first agent to get started
          </p>
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            className="mt-4"
          >
            <Plus size={16} className="mr-2" />
            Create Agent
          </Button>
        </div>
      )}

      {!isLoading && !isError && agents?.length > 0 && (
        <div className="overflow-hidden rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="whitespace-nowrap p-3 text-left font-medium">Name</th>
                <th className="whitespace-nowrap p-3 text-left font-medium">Phone Number</th>
                <th className="whitespace-nowrap p-3 text-left font-medium">Status</th>
                <th className="whitespace-nowrap p-3 text-left font-medium">Created</th>
                <th className="whitespace-nowrap p-3 text-center font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {agents.map((agent: Agent) => (
                <tr key={agent.id} className="border-t">
                  <td className="p-3">{agent.name}</td>
                  <td className="p-3">
                    {agent.phone_number ? (
                      <div className="flex items-center">
                        <Phone size={14} className="mr-1" />
                        {agent.phone_number}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">No phone number</span>
                    )}
                  </td>
                  <td className="p-3">
                    <div className="flex items-center">
                      <span
                        className={`inline-block w-2 h-2 rounded-full mr-2 ${getStatusColor(
                          agent.status
                        )}`}
                      ></span>
                      <span className="capitalize">{agent.status}</span>
                    </div>
                  </td>
                  <td className="p-3">{formatDate(agent.created_at)}</td>
                  <td className="p-3 text-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical size={16} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() =>
                            toast.info("Call feature coming soon!")
                          }
                        >
                          <PhoneCall size={16} className="mr-2" />
                          Call Agent
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() =>
                            handleDeleteClick(agent.id, agent.name)
                          }
                          className="text-red-600 focus:text-red-600"
                        >
                          <Trash size={16} className="mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Agent Modal */}
      <CreateAgentModal
        open={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Agent</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the agent "{selectedAgentName}"?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AgentsList;
