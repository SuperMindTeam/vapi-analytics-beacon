
import React, { useState, useEffect } from "react";
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
import { supabase } from "@/integrations/supabase/client";

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
  const [useDefaultVoices, setUseDefaultVoices] = useState(false);
  const [userOrgs, setUserOrgs] = useState<any[]>([]);
  const [isLoadingOrgs, setIsLoadingOrgs] = useState(false);

  // Directly get user organizations from database using RPC call
  const fetchUserOrgs = async () => {
    setIsLoadingOrgs(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No authenticated user found");
      
      // Use the security definer function to get user's organizations
      const { data, error } = await supabase.rpc('get_user_org_memberships', { 
        user_id_param: user.id 
      });
      
      if (error) throw error;
      
      // Fetch organization details
      if (data && data.length > 0) {
        const orgIds = data.map(org => org.org_id);
        const { data: orgsData, error: orgsError } = await supabase
          .from('orgs')
          .select('*')
          .in('id', orgIds);
          
        if (orgsError) throw orgsError;
        
        // Combine org data with membership data
        const orgsWithMembership = orgsData.map(org => {
          const membership = data.find(m => m.org_id === org.id);
          return {
            ...org,
            isDefault: membership?.is_default || false
          };
        });
        
        setUserOrgs(orgsWithMembership);
        
        // Set default organization
        if (orgsWithMembership.length > 0) {
          const defaultOrg = orgsWithMembership.find(org => org.isDefault);
          setOrgId(defaultOrg ? defaultOrg.id : orgsWithMembership[0].id);
        }
      }
    } catch (error) {
      console.error("Error fetching organizations:", error);
      toast.error("Failed to load organizations");
    } finally {
      setIsLoadingOrgs(false);
    }
  };

  // Reset form when modal closes and fetch organizations when modal opens
  useEffect(() => {
    if (!isOpen) {
      setName("");
      setVoiceId(undefined);
      setPrompt("");
      setFirstMessage("");
      setValidationErrors({});
    } else {
      fetchUserOrgs();
      
      // If organizations are provided via props, use those instead
      if (organizations && organizations.length > 0) {
        setUserOrgs(organizations);
        setOrgId(organizations[0].id);
      }
    }
  }, [isOpen, organizations]);

  const { data: voices, isLoading: isLoadingVoices, error: voicesError } = useQuery({
    queryKey: ['voices'],
    queryFn: getVoices,
    retry: 3,
  });

  // Handle errors and empty data with effect hooks to properly set useDefaultVoices
  useEffect(() => {
    if (voicesError) {
      console.error("Error fetching voices, using predefined list");
      setUseDefaultVoices(true);
    } else if (voices && voices.length === 0) {
      console.error("Empty voice response, using predefined list");
      setUseDefaultVoices(true);
    } else {
      setUseDefaultVoices(false);
    }
  }, [voicesError, voices]);

  const createAgentMutation = useMutation({
    mutationFn: createAgent,
    onSuccess: () => {
      toast.success("Agent created successfully!");
      onClose();
      // Form is reset when modal closes due to the useEffect above
    },
    onError: (error: any) => {
      console.error("Failed to create agent:", error);
      toast.error(error.message || "Failed to create agent");
    },
  });

  // Validation function that doesn't check for organization
  const validateForm = () => {
    const errors: Record<string, boolean> = {};
    
    if (!name.trim()) errors.name = true;
    if (!voiceId) errors.voiceId = true;
    if (!prompt.trim()) errors.prompt = true;
    if (!firstMessage.trim()) errors.firstMessage = true;
    if (!orgId) errors.orgId = true;
    
    setValidationErrors(errors);
    
    // Form is valid if there are no errors
    return Object.keys(errors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate the form
    const isValid = validateForm();
    
    if (!isValid) {
      const missingFields = Object.keys(validationErrors)
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
      
      toast.error(`Please fill in all required fields: ${missingFields}`);
      return;
    }
    
    // Create agent with updated structure for VAPI API
    try {
      console.log("Creating agent with organization:", orgId);
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
          voiceId: voiceId || ""
        },
        firstMessage,
        org_id: orgId
      });
    } catch (error) {
      console.error("Error in create agent submission:", error);
    }
  };

  const handleVoiceSelect = (value: string) => {
    setVoiceId(value);
    // Clear validation error for voiceId when selected
    if (validationErrors.voiceId) {
      setValidationErrors(prev => {
        const updated = { ...prev };
        delete updated.voiceId;
        return updated;
      });
    }
  };

  // Determine which voice list to use
  const voicesToDisplay = useDefaultVoices || voicesError || !voices || voices.length === 0 
    ? predefinedVoices 
    : voices;

  // Show loading state when loading voices or organizations
  if (isLoadingVoices || isLoadingOrgs) {
    return (
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Create New Agent</DialogTitle>
          </DialogHeader>
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin mr-2 h-6 w-6 border-b-2 border-gray-500 rounded-full"></div>
            <p>Loading required data...</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) onClose();
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
              onChange={(e) => {
                setName(e.target.value);
                // Clear validation error when typing
                if (validationErrors.name) {
                  setValidationErrors(prev => {
                    const updated = { ...prev };
                    delete updated.name;
                    return updated;
                  });
                }
              }}
              className={validationErrors.name ? "border-red-500" : ""}
              disabled={createAgentMutation.isPending}
            />
            {validationErrors.name && (
              <p className="text-sm text-red-500">Agent name is required</p>
            )}
          </div>
          
          {/* Organization selection */}
          {userOrgs.length > 0 && (
            <div className="grid gap-2">
              <Label>Organization</Label>
              <div className="flex items-center gap-2 h-10 px-3 border rounded-md bg-muted/20">
                <Building className="h-4 w-4 text-muted-foreground" />
                <span>{userOrgs[0].name}</span>
                {userOrgs[0].isDefault && <Badge variant="outline" className="ml-2">Default</Badge>}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Using your organization: {userOrgs[0].name}
              </p>
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="voice">Voice</Label>
            <Select 
              onValueChange={handleVoiceSelect} 
              value={voiceId} 
              disabled={createAgentMutation.isPending}
            >
              <SelectTrigger className={`flex items-center gap-2 ${validationErrors.voiceId ? "border-red-500" : ""}`}>
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
              onChange={(e) => {
                setPrompt(e.target.value);
                if (validationErrors.prompt) {
                  setValidationErrors(prev => {
                    const updated = { ...prev };
                    delete updated.prompt;
                    return updated;
                  });
                }
              }}
              className={validationErrors.prompt ? "border-red-500" : ""}
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
              onChange={(e) => {
                setFirstMessage(e.target.value);
                if (validationErrors.firstMessage) {
                  setValidationErrors(prev => {
                    const updated = { ...prev };
                    delete updated.firstMessage;
                    return updated;
                  });
                }
              }}
              className={validationErrors.firstMessage ? "border-red-500" : ""}
              disabled={createAgentMutation.isPending}
            />
            {validationErrors.firstMessage && (
              <p className="text-sm text-red-500">First message is required</p>
            )}
          </div>

          <Button 
            type="submit" 
            className="w-full" 
            disabled={createAgentMutation.isPending}
          >
            {createAgentMutation.isPending ? (
              <div className="flex items-center">
                <div className="animate-spin mr-2 h-4 w-4 border-b-2 border-white rounded-full"></div>
                <span>Creating...</span>
              </div>
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
