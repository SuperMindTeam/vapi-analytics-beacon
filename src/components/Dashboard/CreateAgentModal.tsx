import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createAgent, getVoices, getUserOrganizations } from "@/services/vapiService";
import { toast } from "@/components/ui/sonner";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const CreateAgentModal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [voiceId, setVoiceId] = useState<string | undefined>(undefined);
  const [prompt, setPrompt] = useState("");
  const [firstMessage, setFirstMessage] = useState("");
  const [orgId, setOrgId] = useState<string | undefined>(undefined);
  const [validationErrors, setValidationErrors] = useState<Record<string, boolean>>({});
  const [isCreating, setIsCreating] = useState(false);

  const { data: voices, isLoading: isLoadingVoices, error: voicesError } = useQuery({
    queryKey: ['voices'],
    queryFn: getVoices,
  });

  const { data: organizations, isLoading: isLoadingOrgs, error: orgsError } = useQuery({
    queryKey: ['organizations'],
    queryFn: getUserOrganizations,
  });

  const createAgentMutation = useMutation({
    mutationFn: createAgent,
    onSuccess: () => {
      toast.success("Agent created successfully!");
      setIsOpen(false);
      setName("");
      setVoiceId(undefined);
      setPrompt("");
      setFirstMessage("");
      setOrgId(undefined);
      setIsCreating(false);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create agent");
      setIsCreating(false);
    },
  });

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      // Reset form when modal is closed
      setName("");
      setVoiceId(undefined);
      setPrompt("");
      setFirstMessage("");
      setOrgId(undefined);
      setValidationErrors({});
    }
  };

  // Validation function that doesn't check for organization since it should be automatically created
  const validateForm = () => {
    const errors: Record<string, boolean> = {};
    
    if (!name.trim()) errors.name = true;
    if (!voiceId) errors.voiceId = true;
    if (!prompt.trim()) errors.prompt = true;
    if (!firstMessage.trim()) errors.firstMessage = true;
    
    // Don't validate orgId as it should be handled automatically
    setValidationErrors(errors);
    
    // Form is valid if there are no errors
    return Object.keys(errors).length === 0;
  };

  // Handle form submission with updated logic for organizations
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const isValid = validateForm();
    
    if (!isValid) {
      const missingFields = Object.keys(validationErrors)
        .map(field => {
          switch (field) {
            case 'name': return 'Agent Name';
            case 'voiceId': return 'Voice';
            case 'prompt': return 'Agent Prompt';
            case 'firstMessage': return 'First Message';
            default: return field;
          }
        }).join(', ');
      
      toast.error(`Please fill in all required fields: ${missingFields}`);
      return;
    }
    
    // For organization, we'll use the available one or let the backend handle it
    // This assumes the backend will use the user's default organization if none is specified
    const finalOrgId = orgId || (organizations.length > 0 ? organizations[0].id : undefined);
    
    setIsCreating(true);
    
    console.log("Creating agent with data:", {
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
        model: "gpt-4-turbo",
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

  const handleVoiceSelect = (value: string) => {
    setVoiceId(value);
  };

  if (isLoadingVoices || isLoadingOrgs) return <div>Loading...</div>;
  if (voicesError || orgsError) return <div>Error loading data</div>;

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline">Create Agent</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Agent</DialogTitle>
          <DialogDescription>
            Create a new AI agent for your organization
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Agent Name</Label>
            <Input
              id="name"
              placeholder="Enter agent name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={createAgentMutation.isPending}
            />
            {validationErrors.name && (
              <p className="text-sm text-red-500">Agent name is required</p>
            )}
          </div>
          
          {/* Organization field - shown only when multiple organizations exist */}
          {organizations.length > 1 && (
            <div className="grid gap-2">
              <Label htmlFor="organization">
                Organization
              </Label>
              <Select 
                value={orgId} 
                onValueChange={(value) => {
                  setOrgId(value);
                }}
                disabled={createAgentMutation.isPending}
              >
                <SelectTrigger className="flex items-center gap-2">
                  <Building className="h-4 w-4 text-muted-foreground" />
                  <SelectValue placeholder="Select organization" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {organizations.map((org) => (
                      <SelectItem 
                        key={org.id} 
                        value={org.id}
                        className="flex items-center gap-2"
                      >
                        <span>{org.name}</span>
                        {org.isDefault && <Badge variant="outline">Default</Badge>}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Select which organization this agent belongs to
              </p>
            </div>
          )}
          
          {/* Show organization info if exactly one exists */}
          {organizations.length === 1 && (
            <div className="grid gap-2">
              <Label>Organization</Label>
              <div className="flex items-center gap-2 h-10 px-3 border rounded-md bg-muted/20">
                <Building className="h-4 w-4 text-muted-foreground" />
                <span>{organizations[0].name}</span>
                {organizations[0].isDefault && <Badge variant="outline" className="ml-2">Default</Badge>}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Using your organization: {organizations[0].name}
              </p>
            </div>
          )}
          
          {/* Show message if no organizations */}
          {organizations.length === 0 && (
            <div className="p-4 border rounded-md bg-amber-50 text-amber-800">
              <p className="text-sm font-medium">No organizations found</p>
              <p className="text-xs mt-1">
                You should have a default organization created with your account.
                The system will attempt to use your default organization.
              </p>
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="voice">Voice</Label>
            <Select onValueChange={handleVoiceSelect} value={voiceId} disabled={createAgentMutation.isPending}>
              <SelectTrigger className="flex items-center gap-2">
                <SelectValue placeholder="Select a voice" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {voices && voices.map((voice) => (
                    <SelectItem key={voice.voice_id} value={voice.voice_id}>
                      {voice.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            {validationErrors.voiceId && (
              <p className="text-sm text-red-500">Voice is required</p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="prompt">Agent Prompt</Label>
            <Input
              id="prompt"
              placeholder="Enter agent prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              required
              disabled={createAgentMutation.isPending}
            />
            {validationErrors.prompt && (
              <p className="text-sm text-red-500">Agent prompt is required</p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="firstMessage">First Message</Label>
            <Input
              id="firstMessage"
              placeholder="Enter first message"
              value={firstMessage}
              onChange={(e) => setFirstMessage(e.target.value)}
              required
              disabled={createAgentMutation.isPending}
            />
            {validationErrors.firstMessage && (
              <p className="text-sm text-red-500">First message is required</p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={createAgentMutation.isPending}>
            {createAgentMutation.isPending ? (
              <>Creating...</>
            ) : (
              "Create Agent"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateAgentModal;
