
import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createAgent, getVoices } from "@/services/vapiService";
import { toast } from "sonner";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Define the props interface for CreateAgentModal
interface CreateAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  organizations?: {
    id: string;
    name: string;
    email?: string | null;
    business_name?: string | null;
    isDefault?: boolean;
    [key: string]: any;
  }[];
}

// Predefined voices list as a fallback
const predefinedVoices = [
  { voice_id: "marissa", name: "Marissa" },
  { voice_id: "andrea", name: "Andrea" },
  { voice_id: "sarah", name: "Sarah" },
  { voice_id: "phillip", name: "Phillip" },
  { voice_id: "steve", name: "Steve" },
  { voice_id: "joseph", name: "Joseph" },
  { voice_id: "myra", name: "Myra" },
  { voice_id: "paula", name: "Paula" },
  { voice_id: "ryan", name: "Ryan" },
  { voice_id: "drew", name: "Drew" },
  { voice_id: "paul", name: "Paul" },
  { voice_id: "mrb", name: "Mr. B" },
  { voice_id: "matilda", name: "Matilda" },
  { voice_id: "mark", name: "Mark" },
];

const CreateAgentModal: React.FC<CreateAgentModalProps> = ({ isOpen, onClose, organizations = [] }) => {
  const [name, setName] = useState("");
  const [voiceId, setVoiceId] = useState<string | undefined>(undefined);
  const [prompt, setPrompt] = useState("");
  const [firstMessage, setFirstMessage] = useState("");
  const [orgId, setOrgId] = useState<string | undefined>(undefined);
  const [validationErrors, setValidationErrors] = useState<Record<string, boolean>>({});
  const [isCreating, setIsCreating] = useState(false);
  const [useDefaultVoices, setUseDefaultVoices] = useState(false);

  const { data: voices, isLoading: isLoadingVoices, error: voicesError } = useQuery({
    queryKey: ['voices'],
    queryFn: getVoices,
    retry: 3,
  });

  // Handle errors and empty data with effect hooks to properly set useDefaultVoices
  React.useEffect(() => {
    if (voicesError) {
      console.error("Error fetching voices, using predefined list");
      setUseDefaultVoices(true);
    }
  }, [voicesError]);

  React.useEffect(() => {
    if (voices && voices.length === 0) {
      console.error("Empty voice response, using predefined list");
      setUseDefaultVoices(true);
    }
  }, [voices]);

  const createAgentMutation = useMutation({
    mutationFn: createAgent,
    onSuccess: () => {
      toast.success("Agent created successfully!");
      onClose();
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

  // Validation function that doesn't check for organization
  const validateForm = () => {
    const errors: Record<string, boolean> = {};
    
    if (!name.trim()) errors.name = true;
    if (!voiceId) errors.voiceId = true;
    if (!prompt.trim()) errors.prompt = true;
    if (!firstMessage.trim()) errors.firstMessage = true;
    
    // We don't validate orgId as it should be handled automatically
    setValidationErrors(errors);
    
    // Form is valid if there are no errors
    return Object.keys(errors).length === 0;
  };

  // Handle form submission
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
    const finalOrgId = orgId || (organizations && organizations.length > 0 ? organizations[0].id : undefined);
    
    setIsCreating(true);
    
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

  // Determine which voice list to use
  const voicesToDisplay = useDefaultVoices || voicesError || !voices || voices.length === 0 
    ? predefinedVoices 
    : voices;

  if (isLoadingVoices) {
    return (
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Create New Agent</DialogTitle>
          </DialogHeader>
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin mr-2 h-6 w-6 border-b-2 border-gray-500 rounded-full"></div>
            <p>Loading voice options...</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        setName("");
        setVoiceId(undefined);
        setPrompt("");
        setFirstMessage("");
        setOrgId(undefined);
        setValidationErrors({});
        onClose();
      }
    }}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Agent</DialogTitle>
          <DialogDescription>
            Create a new AI agent for your organization
          </DialogDescription>
        </DialogHeader>
        
        {useDefaultVoices && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Unable to fetch voices from API. Using predefined voice list instead.
            </AlertDescription>
          </Alert>
        )}
        
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
          
          {/* Organization information */}
          {organizations && organizations.length > 0 && (
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

          <div className="grid gap-2">
            <Label htmlFor="voice">Voice</Label>
            <Select onValueChange={handleVoiceSelect} value={voiceId} disabled={createAgentMutation.isPending}>
              <SelectTrigger className="flex items-center gap-2">
                <SelectValue placeholder="Select a voice" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {voicesToDisplay.map((voice) => (
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
