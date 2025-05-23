
import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"; // Using Dialog from shadcn instead of Modal
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { createAgent } from "@/services/vapiService";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "../ui/select";

interface CreateAgentModalProps {
  open: boolean;
  onClose: () => void;
}

const CreateAgentModal: React.FC<CreateAgentModalProps> = ({ open, onClose }) => {
  const { orgId } = useAuth();
  const [name, setName] = useState("");
  const [voiceId, setVoiceId] = useState("burt");
  const [prompt, setPrompt] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !voiceId || !prompt) {
      toast.error("All fields are required");
      return;
    }

    setIsSubmitting(true);

    try {
      await createAgent({
        name, 
        voiceId, 
        prompt,
        provider: "openai", // Adding the required provider field for VAPI API
        model: "gpt-3.5-turbo", // Adding the required model field for VAPI API
      });
      toast.success("Agent created successfully!");
      resetForm();
      onClose();
    } catch (error: any) {
      toast.error(error.message || "Failed to create agent");
      console.error("Create agent error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setName("");
    setVoiceId("burt");
    setPrompt("");
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Agent</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Agent Name</Label>
            <Input
              id="name"
              placeholder="Enter a name for your agent"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="voiceId">Voice</Label>
            <Select value={voiceId} onValueChange={setVoiceId}>
              <SelectTrigger id="voiceId" className="w-full">
                <SelectValue placeholder="Select a voice" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="burt">Burt</SelectItem>
                <SelectItem value="marissa">Marissa</SelectItem>
                <SelectItem value="andrea">Andrea</SelectItem>
                <SelectItem value="sarah">Sarah</SelectItem>
                <SelectItem value="phillip">Phillip</SelectItem>
                <SelectItem value="steve">Steve</SelectItem>
                <SelectItem value="joseph">Joseph</SelectItem>
                <SelectItem value="myra">Myra</SelectItem>
                <SelectItem value="paula">Paula</SelectItem>
                <SelectItem value="ryan">Ryan</SelectItem>
                <SelectItem value="drew">Drew</SelectItem>
                <SelectItem value="paul">Paul</SelectItem>
                <SelectItem value="mrb">Mr. B</SelectItem>
                <SelectItem value="matilda">Matilda</SelectItem>
                <SelectItem value="mark">Mark</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="prompt">Agent Prompt</Label>
            <Textarea
              id="prompt"
              placeholder="What should your agent say on calls?"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={5}
              required
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Agent"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateAgentModal;
