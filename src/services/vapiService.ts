
import { supabase } from "@/integrations/supabase/client";

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
  // Get the current user's organization ID from the context
  try {
    const { data: user } = await supabase.auth.getUser();
    
    if (!user || !user.user) {
      throw new Error('User not authenticated');
    }
    
    // Get the org_id from the user's metadata or from org_members table
    const { data: orgMemberships, error: membershipError } = await supabase
      .from('org_members')
      .select('org_id')
      .eq('user_id', user.user.id)
      .single();
    
    if (membershipError || !orgMemberships) {
      throw new Error('User organization not found');
    }
    
    const orgId = orgMemberships.org_id;
    
    const { data, error } = await supabase
      .from('agents')
      .insert({
        name,
        voice_id: voiceId,
        prompt,
        status: 'active',
        org_id: orgId,
        provider: provider,
        model: model
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating agent:', error);
      throw new Error(error.message);
    }
    
    return data;
  } catch (error: any) {
    console.error('Error in createAgent:', error);
    throw new Error(error.message);
  }
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

// Function for getCalls - definition that matches how it's being called
export const getCalls = async () => {
  // This is a placeholder implementation
  return [];
};

// Dummy function for getCallStatistics - adjusted to match expected return structure
export const getCallStatistics = async () => {
  // This is a placeholder implementation
  return {
    totalCalls: 0,
    completedCalls: 0,
    averageDuration: 0,
    successRate: 0,
    callsPerDay: [],
    timePeriod: {
      start: new Date(),
      end: new Date()
    }
  };
};
