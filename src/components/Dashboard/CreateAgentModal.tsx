import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { createAgent, getVoices } from "@/services/vapiService";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";

// Define the form validation schema using Zod
const createAgentFormSchema = z.object({
  name: z.string().min(2, {
    message: "Agent name must be at least 2 characters.",
  }),
  voice: z.string().min(1, {
    message: "Please select a voice for the agent.",
  }),
  prompt: z.string().min(10, {
    message: "Prompt must be at least 10 characters.",
  }),
  firstMessage: z.string().optional(),
});

// Define a type for the form values based on the schema
type CreateAgentFormValues = z.infer<typeof createAgentFormSchema>;

// Add orgId prop to the component's props interface
interface CreateAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  orgId: string;
}

const CreateAgentModal: React.FC<CreateAgentModalProps> = ({ isOpen, onClose, orgId }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [voices, setVoices] = useState([]);

  useEffect(() => {
    const fetchVoices = async () => {
      try {
        const availableVoices = await getVoices();
        setVoices(availableVoices);
      } catch (error) {
        console.error("Failed to fetch voices:", error);
        toast.error("Failed to load voices. Please try again.");
      }
    };

    fetchVoices();
  }, []);

  // Use react-hook-form with Zod for form validation
  const { register, handleSubmit, formState: { errors }, setValue, control } = useForm<CreateAgentFormValues>({
    resolver: zodResolver(createAgentFormSchema),
    defaultValues: {
      name: "",
      voice: "",
      prompt: "",
      firstMessage: "",
    },
  });

  const handleSubmitWrapper: SubmitHandler<CreateAgentFormValues> = async (values) => {
    await handleSubmit(values);
  };

  const onSubmit: SubmitHandler<CreateAgentFormValues> = async (values) => {
    try {
      setIsSubmitting(true);
      
      // Add the organization ID to the request
      await createAgent({
        name: values.name,
        model: {
          provider: "openai",
          model: "gpt-4",
          messages: [
            {
              role: "system",
              content: values.prompt
            }
          ]
        },
        voice: {
          provider: "openai",
          voiceId: values.voice
        },
        firstMessage: values.firstMessage,
        org_id: orgId // Use the provided orgId
      });
      
      onClose();
      toast.success("Agent created successfully!");
    } catch (error) {
      console.error("Failed to create agent:", error);
      toast.error(error instanceof Error ? error.message : "Failed to create agent");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Agent</DialogTitle>
          <DialogDescription>
            Create a new agent to automate tasks and calls.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmitWrapper(onSubmit)} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Agent Name</Label>
            <Input
              id="name"
              placeholder="Enter agent name"
              type="text"
              {...register("name")}
            />
            {errors.name && (
              <p className="text-sm text-red-500">{errors.name.message}</p>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="voice">Voice</Label>
            <Select onValueChange={(value) => setValue("voice", value)} control={control}>
              <SelectTrigger>
                <SelectValue placeholder="Select a voice" />
              </SelectTrigger>
              <SelectContent>
                {voices.map((voice) => (
                  <SelectItem key={voice.id} value={voice.id}>
                    {voice.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.voice && (
              <p className="text-sm text-red-500">{errors.voice.message}</p>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="prompt">Prompt</Label>
            <Textarea
              id="prompt"
              placeholder="Enter prompt"
              className="resize-none"
              {...register("prompt")}
            />
            {errors.prompt && (
              <p className="text-sm text-red-500">{errors.prompt.message}</p>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="firstMessage">First Message (Optional)</Label>
            <Input
              id="firstMessage"
              placeholder="Enter first message"
              type="text"
              {...register("firstMessage")}
            />
            {errors.firstMessage && (
              <p className="text-sm text-red-500">{errors.firstMessage.message}</p>
            )}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  Creating <Loader2 className="ml-2 h-4 w-4 animate-spin" />
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
