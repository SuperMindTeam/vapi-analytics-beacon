
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
import { Loader2 } from "lucide-react";

// Sample voice options - would be fetched from the API
const voiceOptions = [
  { id: "alloy", name: "Alloy", description: "Versatile, general purpose" },
  { id: "echo", name: "Echo", description: "High energy, enthusiastic" },
  { id: "fable", name: "Fable", description: "British accent, storyteller" },
  { id: "nova", name: "Nova", description: "Professional, friendly" },
  { id: "shimmer", name: "Shimmer", description: "Clear, expressive" }
];

interface CreateAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CreateAgentModal: React.FC<CreateAgentModalProps> = ({ 
  isOpen, 
  onClose 
}) => {
  const [name, setName] = useState("");
  const [voiceId, setVoiceId] = useState("");
  const [prompt, setPrompt] = useState("");
  const queryClient = useQueryClient();

  // Create agent mutation using Tanstack Query
  const createAgentMutation = useMutation({
    mutationFn: (agentData: { name: string; voice_id: string; prompt: string }) => 
      createAgent(agentData),
    onSuccess: () => {
      // Reset form
      setName("");
      setVoiceId("");
      setPrompt("");
      
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
    
    if (!name || !voiceId || !prompt) {
      toast.error("Please fill in all fields");
      return;
    }
    
    // Create agent with VAPI
    createAgentMutation.mutate({
      name,
      voice_id: voiceId,
      prompt
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
