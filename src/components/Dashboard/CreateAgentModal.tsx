
import React, { useState } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectGroup, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createAgent } from "@/services/vapiService";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Building } from "lucide-react";

// Updated VAPI approved voice options for ElevenLabs
const voiceOptions = [
  { id: "burt", name: "Burt", description: "Deep, authoritative male voice" },
  { id: "marissa", name: "Marissa", description: "Professional female voice" },
  { id: "andrea", name: "Andrea", description: "Warm, friendly female voice" },
  { id: "sarah", name: "Sarah", description: "Clear, articulate female voice" },
  { id: "phillip", name: "Phillip", description: "Confident, mature male voice" },
  { id: "steve", name: "Steve", description: "Casual, approachable male voice" },
  { id: "joseph", name: "Joseph", description: "Warm, trusting male voice" },
  { id: "myra", name: "Myra", description: "Gentle, soothing female voice" },
  { id: "paula", name: "Paula", description: "Friendly, conversational female voice" },
  { id: "ryan", name: "Ryan", description: "Energetic male voice" },
  { id: "drew", name: "Drew", description: "Calm, measured male voice" },
  { id: "paul", name: "Paul", description: "Clear, professional male voice" },
  { id: "mrb", name: "MrB", description: "Distinctive character voice" },
  { id: "matilda", name: "Matilda", description: "Lively, expressive female voice" },
  { id: "mark", name: "Mark", description: "Natural, conversational male voice" }
];

interface Organization {
  id: string;
  name: string;
  role: string;
  isDefault: boolean;
}

interface CreateAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  organizations: Organization[];
}

const CreateAgentModal: React.FC<CreateAgentModalProps> = ({ 
  isOpen, 
  onClose,
  organizations = []
}) => {
  const [name, setName] = useState("");
  const [voiceId, setVoiceId] = useState("");
  const [prompt, setPrompt] = useState("");
  const [firstMessage, setFirstMessage] = useState("Hello! How can I assist you today?");
  const [orgId, setOrgId] = useState("");
  
  // Find default organization if available
  React.useEffect(() => {
    if (organizations.length > 0) {
      const defaultOrg = organizations.find(org => org.isDefault);
      setOrgId(defaultOrg ? defaultOrg.id : organizations[0].id);
    }
  }, [organizations]);
  
  const queryClient = useQueryClient();

  // Create agent mutation using Tanstack Query
  const createAgentMutation = useMutation({
    mutationFn: (agentData: { 
      name: string; 
      model: {
        provider: string;
        model: string;
        messages: Array<{role: string; content: string}>;
      };
      voice: {
        provider: string;
        voiceId: string;
      };
      firstMessage: string;
      org_id: string;
    }) => createAgent(agentData),
    onSuccess: () => {
      // Reset form
      setName("");
      setVoiceId("");
      setPrompt("");
      setFirstMessage("Hello! How can I assist you today?");
      
      // Refresh agents list and close modal
      queryClient.invalidateQueries({ queryKey: ["agents"] });
      toast.success("Agent created successfully!");
      onClose();
    },
    onError: (error) => {
      console.error("Error creating agent:", error);
      toast.error(`Failed to create agent: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name || !voiceId || !prompt || !orgId) {
      toast.error("Please fill in all required fields");
      return;
    }
    
    // Create agent with updated structure for VAPI API
    createAgentMutation.mutate({
      name,
      model: {
        provider: "openai",
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: prompt
          }
        ]
      },
      voice: {
        provider: "11labs",
        voiceId: voiceId
      },
      firstMessage,
      org_id: orgId
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create New Agent</DialogTitle>
          </DialogHeader>
          
          <div className="grid gap-6 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Agent Name</Label>
              <Input
                id="name"
                placeholder="e.g., Customer Support Agent"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={createAgentMutation.isPending}
              />
            </div>
            
            {organizations.length > 0 && (
              <div className="grid gap-2">
                <Label htmlFor="organization">Organization</Label>
                <Select 
                  value={orgId} 
                  onValueChange={setOrgId}
                  required
                  disabled={createAgentMutation.isPending}
                >
                  <SelectTrigger className="flex items-center gap-2">
                    <Building className="h-4 w-4 text-muted-foreground" />
                    <SelectValue placeholder="Select an organization" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {organizations.map((org) => (
                        <SelectItem key={org.id} value={org.id}>
                          <div className="flex items-center gap-2">
                            <Building className="h-4 w-4 text-muted-foreground" />
                            <span>{org.name}</span>
                            {org.isDefault && (
                              <Badge variant="outline" className="ml-2">Default</Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Organization the agent will belong to
                </p>
              </div>
            )}
            
            <div className="grid gap-2">
              <Label htmlFor="voice">Voice</Label>
              <Select 
                value={voiceId} 
                onValueChange={setVoiceId} 
                required
                disabled={createAgentMutation.isPending}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a voice" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {voiceOptions.map((voice) => (
                      <SelectItem key={voice.id} value={voice.id}>
                        <div>
                          <span className="font-medium">{voice.name}</span>
                          <span className="text-xs text-muted-foreground ml-2">
                            {voice.description}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="prompt">Agent Prompt</Label>
              <Textarea
                id="prompt"
                placeholder="Define how your agent should behave and respond..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={6}
                required
                disabled={createAgentMutation.isPending}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Write a detailed prompt that defines your agent's persona, 
                knowledge, and how it should handle calls.
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="firstMessage">First Message</Label>
              <Input
                id="firstMessage"
                placeholder="Hello! How can I assist you today?"
                value={firstMessage}
                onChange={(e) => setFirstMessage(e.target.value)}
                required
                disabled={createAgentMutation.isPending}
              />
              <p className="text-xs text-muted-foreground mt-1">
                First message the agent will say when a call connects.
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              disabled={createAgentMutation.isPending}
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              className="bg-[hsl(var(--dashboard-purple))] hover:bg-[hsl(var(--dashboard-purple))/0.9]"
              disabled={createAgentMutation.isPending}
            >
              {createAgentMutation.isPending ? (
                <>
                  <Loader2 size={16} className="mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Agent"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateAgentModal;
