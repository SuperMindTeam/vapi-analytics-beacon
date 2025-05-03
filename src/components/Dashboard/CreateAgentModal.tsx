
import React, { useState } from "react";
import { Modal } from "../ui/modal";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { createAgent } from "@/services/vapiService";
import { toast } from "sonner";

interface CreateAgentModalProps {
  open: boolean;
  onClose: () => void;
}

const CreateAgentModal: React.FC<CreateAgentModalProps> = ({ open, onClose }) => {
  const [name, setName] = useState("");
  const [voiceId, setVoiceId] = useState("echo");
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
        provider: "openai", // Adding the required provider field
        model: "gpt-3.5-turbo", // Adding the required model field
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
    setVoiceId("echo");
    setPrompt("");
  };

  return (
    <Modal open={open} onClose={onClose} title="Create New Agent">
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
          <select
            id="voiceId"
            className="w-full border border-gray-300 rounded-md h-10 px-3"
            value={voiceId}
            onChange={(e) => setVoiceId(e.target.value)}
            required
          >
            <option value="echo">Echo</option>
            <option value="alloy">Alloy</option>
            <option value="fable">Fable</option>
            <option value="onyx">Onyx</option>
            <option value="nova">Nova</option>
            <option value="shimmer">Shimmer</option>
          </select>
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
    </Modal>
  );
};

export default CreateAgentModal;
