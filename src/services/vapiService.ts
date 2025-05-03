
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface CreateAgentParams {
  name: string;
  voiceId: string;
  prompt: string;
  provider: string;
  model: string;
}

// Function to get all agents
export const getAgents = async () => {
  const { data, error } = await supabase
    .from('agents')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching agents:', error);
    throw new Error(error.message);
  }

  return data || [];
};

// Function to get agent by ID
export const getAgentById = async (id: string) => {
  const { data, error } = await supabase
    .from('agents')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error(`Error fetching agent with id ${id}:`, error);
    throw new Error(error.message);
  }

  return data;
};

// Function to create a new agent
export const createAgent = async ({ name, voiceId, prompt, provider, model }: CreateAgentParams) => {
  // Get the current user's organization ID
  const auth = useAuth();
  const orgId = auth.orgId;

  if (!orgId) {
    throw new Error('User organization not found');
  }

  const { data, error } = await supabase
    .from('agents')
    .insert({
      name,
      voice_id: voiceId,
      prompt,
      status: 'active',
      org_id: orgId,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating agent:', error);
    throw new Error(error.message);
  }

  return data;
};

// Function to update an agent
export const updateAgent = async (id: string, updates: Partial<CreateAgentParams>) => {
  const { data, error } = await supabase
    .from('agents')
    .update({
      ...(updates.name && { name: updates.name }),
      ...(updates.voiceId && { voice_id: updates.voiceId }),
      ...(updates.prompt && { prompt: updates.prompt }),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error(`Error updating agent with id ${id}:`, error);
    throw new Error(error.message);
  }

  return data;
};

// Function to delete an agent
export const deleteAgent = async (id: string) => {
  const { error } = await supabase
    .from('agents')
    .delete()
    .eq('id', id);

  if (error) {
    console.error(`Error deleting agent with id ${id}:`, error);
    throw new Error(error.message);
  }

  return true;
};
