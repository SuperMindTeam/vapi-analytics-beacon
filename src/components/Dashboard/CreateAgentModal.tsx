
import React, { useState, useEffect } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter,
  DialogDescription
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
import { Badge } from "@/components/ui/badge";
import { createAgent } from "@/services/vapiService";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Building, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

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
  const [validationErrors, setValidationErrors] = useState<{[key: string]: boolean}>({});
  
  // Find default organization if available
  useEffect(() => {
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
      setValidationErrors({});
      
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

  const validateForm = () => {
    const errors: {[key: string]: boolean} = {};
    
    if (!name.trim()) errors.name = true;
    if (!voiceId) errors.voiceId = true;
    if (!prompt.trim()) errors.prompt = true;
    if (!firstMessage.trim()) errors.firstMessage = true;
    
    // Only validate orgId if we have multiple organizations and none is selected
    // If there's at least one organization available, we'll use it automatically
    if (organizations.length > 0 && !orgId) errors.orgId = true;
    
    setValidationErrors(errors);
    
    // Return true if no errors
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Perform validation
    const isValid = validateForm();
    
    if (!isValid) {
      // Filter out orgId from error messages if we have at least one organization
      const missingFields = Object.keys(validationErrors)
        .filter(field => {
          // If we have organizations and the field is 'orgId', don't include it in the error message
          if (field === 'orgId' && organizations.length > 0) {
            return false;
          }
          return true;
        })
        .map(field => {
          switch (field) {
            case 'name': return 'Agent Name';
            case 'voiceId': return 'Voice';
            case 'prompt': return 'Agent Prompt';
            case 'firstMessage': return 'First Message';
            case 'orgId': return 'Organization';
            default: return field;
          }
        }).join(', ');
      
      // Only show toast if there are other missing fields
      if (missingFields) {
        toast.error(`Please fill in all required fields: ${missingFields}`);
      }
      return;
    }
    
    // Set organization ID if not already set but organizations are available
    const finalOrgId = orgId || (organizations.length > 0 ? organizations[0].id : "");
    
    if (!finalOrgId && organizations.length === 0) {
      toast.error("No organization available. Please create an organization first.");
      return;
    }
    
    // Log to help with debugging
    console.log("Creating agent with:", {
      name,
      voiceId,
      prompt,
      firstMessage,
      orgId: finalOrgId,
    });
    
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
      org_id: finalOrgId
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create New Agent</DialogTitle>
            <DialogDescription>
              Fill all required fields to create a new voice agent.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-6 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name" className={validationErrors.name ? "text-destructive" : ""}>
                Agent Name *
              </Label>
              <Input
                id="name"
                placeholder="e.g., Customer Support Agent"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setValidationErrors({...validationErrors, name: false});
                }}
                className={validationErrors.name ? "border-destructive" : ""}
                required
                disabled={createAgentMutation.isPending}
              />
              {validationErrors.name && (
                <p className="text-xs text-destructive">Agent name is required</p>
              )}
            </div>
            
            {organizations.length > 0 && (
              <div className="grid gap-2">
                <Label htmlFor="organization" className={validationErrors.orgId ? "text-destructive" : ""}>
                  Organization
                </Label>
                <Select 
                  value={orgId} 
                  onValueChange={(value) => {
                    setOrgId(value);
                    setValidationErrors({...validationErrors, orgId: false});
                  }}
                  disabled={createAgentMutation.isPending || organizations.length <= 1}
                >
                  <SelectTrigger className={`flex items-center gap-2 ${validationErrors.orgId ? "border-destructive" : ""}`}>
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
                {organizations.length === 1 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Using your default organization: {organizations[0].name}
                  </p>
                )}
              </div>
            )}
            
            <div className="grid gap-2">
              <Label htmlFor="voice" className={validationErrors.voiceId ? "text-destructive" : ""}>
                Voice *
              </Label>
              <Select 
                value={voiceId} 
                onValueChange={(value) => {
                  setVoiceId(value);
                  setValidationErrors({...validationErrors, voiceId: false});
                }}
                required
                disabled={createAgentMutation.isPending}
              >
                <SelectTrigger className={validationErrors.voiceId ? "border-destructive" : ""}>
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
              {validationErrors.voiceId && (
                <p className="text-xs text-destructive">Voice is required</p>
              )}
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="prompt" className={validationErrors.prompt ? "text-destructive" : ""}>
                Agent Prompt *
              </Label>
              <Textarea
                id="prompt"
                placeholder="Define how your agent should behave and respond..."
                value={prompt}
                onChange={(e) => {
                  setPrompt(e.target.value);
                  setValidationErrors({...validationErrors, prompt: false});
                }}
                className={validationErrors.prompt ? "border-destructive" : ""}
                rows={6}
                required
                disabled={createAgentMutation.isPending}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Write a detailed prompt that defines your agent's persona, 
                knowledge, and how it should handle calls.
              </p>
              {validationErrors.prompt && (
                <p className="text-xs text-destructive">Agent prompt is required</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="firstMessage" className={validationErrors.firstMessage ? "text-destructive" : ""}>
                First Message *
              </Label>
              <Input
                id="firstMessage"
                placeholder="Hello! How can I assist you today?"
                value={firstMessage}
                onChange={(e) => {
                  setFirstMessage(e.target.value);
                  setValidationErrors({...validationErrors, firstMessage: false});
                }}
                className={validationErrors.firstMessage ? "border-destructive" : ""}
                required
                disabled={createAgentMutation.isPending}
              />
              <p className="text-xs text-muted-foreground mt-1">
                First message the agent will say when a call connects.
              </p>
              {validationErrors.firstMessage && (
                <p className="text-xs text-destructive">First message is required</p>
              )}
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
