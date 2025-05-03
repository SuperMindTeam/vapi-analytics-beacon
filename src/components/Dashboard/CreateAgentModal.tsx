import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createAgent } from "@/services/vapiService";
import { useAuth } from "@/contexts/AuthContext"; // Import useAuth

interface CreateAgentModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface VoiceOption {
  voiceId: string;
  name: string;
  provider: string;
}

const CreateAgentModal = ({ open, onClose, onSuccess }: CreateAgentModalProps) => {
  const [name, setName] = useState('');
  const [prompt, setPrompt] = useState('');
  const [selectedVoice, setSelectedVoice] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { orgId, userId } = useAuth(); // Get orgId from AuthContext
  
  const voiceOptions: VoiceOption[] = [
    {
      "voiceId": "pNInz6obpgDQGcFmaJgB",
      "name": "Nicole (Neural)",
      "provider": "PlayHT"
    },
    {
      "voiceId": "2EiwWnXFnvU5JabPjxzF",
      "name": "Matthew (Neural)",
      "provider": "PlayHT"
    },
    {
      "voiceId": "ErXwobaYiN019PkyGW6f",
      "name": "Callum (Neural)",
      "provider": "PlayHT"
    },
    {
      "voiceId": "CYw3kZ02Hs0563khs1fs",
      "name": "Salli (Neural)",
      "provider": "PlayHT"
    },
    {
      "voiceId": "jBpfuIE2acWjWxATptPF",
      "name": "Ryan (Neural)",
      "provider": "PlayHT"
    },
    {
      "voiceId": "VR6AewLTigWG4xSOukaG",
      "name": "Dorothy (Neural)",
      "provider": "PlayHT"
    },
    {
      "voiceId": "g5CIj3jQcpN4F9vjB13j",
      "name": "Arnold (Neural)",
      "provider": "PlayHT"
    },
    {
      "voiceId": "z9fAnlkpzviPz1M9Iz6M",
      "name": "Rachel (Neural)",
      "provider": "PlayHT"
    },
    {
      "voiceId": "ThT5uQzc52ke9UCeqrBM",
      "name": "Sam (Neural)",
      "provider": "PlayHT"
    },
    {
      "voiceId": "XB0fDUnXU5powFXDhJWa",
      "name": "Gwyneth (Neural)",
      "provider": "PlayHT"
    }
  ];

  const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setName(event.target.value);
  };

  const handlePromptChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPrompt(event.target.value);
  };

  const handleVoiceChange = (value: string) => {
    setSelectedVoice(value);
  };
  
  const handleCreateAgent = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    
    try {
      if (!orgId) { 
        throw new Error("Organization ID is not available"); 
      }
      
      // Pass the orgId to createAgent function
      const agent = await createAgent({
        name,
        voice: {
          voiceId: selectedVoice
        },
        model: {
          messages: [
            {
              role: "system",
              content: prompt
            }
          ]
        }
      }, orgId);
      
      console.log("Agent created:", agent);
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error("Error creating agent:", error);
      alert(error.message || "Failed to create agent");
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Agent</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleCreateAgent} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Agent Name</Label>
            <Input
              id="name"
              value={name}
              onChange={handleNameChange}
              placeholder="Enter agent name"
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="prompt">Agent Prompt</Label>
            <Textarea
              id="prompt"
              value={prompt}
              onChange={handlePromptChange}
              placeholder="Enter agent prompt"
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="voice">Agent Voice</Label>
            <Select onValueChange={handleVoiceChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a voice" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Voices</SelectLabel>
                  {voiceOptions.map((voice) => (
                    <SelectItem key={voice.voiceId} value={voice.voiceId}>
                      {voice.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Creating..." : "Create Agent"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateAgentModal;
