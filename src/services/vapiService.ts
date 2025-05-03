
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// VAPI API endpoint - fixed to use the correct endpoint
const VAPI_API_ENDPOINT = "https://api.vapi.ai";
// Using the VAPI API key provided
const VAPI_API_KEY = "86a2dd3f-cb06-4544-85c5-cde554064763"; 

interface CreateAgentParams {
  name: string;
  voiceId: string;
  prompt: string;
  provider: string;
  model: string;
}

interface VAPIAgentResponse {
  id: string;
  phone_number?: string;
  status: string;
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
  try {
    // Get the current user's organization ID from the context
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
    
    // First, create the agent in VAPI - updated to use correct endpoint and payload structure
    console.log("Creating agent in VAPI...");
    const vapiResponse = await fetch(`${VAPI_API_ENDPOINT}/assistant`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${VAPI_API_KEY}`
      },
      body: JSON.stringify({
        name,
        model: {
          provider,
          model,
          messages: [
            {
              role: "system",
              content: prompt
            }
          ]
        },
        voice: {
          provider: "11labs",
          voiceId
        },
        firstMessage: "Hello! How can I assist you today?"
      })
    });

    if (!vapiResponse.ok) {
      const errorData = await vapiResponse.json();
      console.error("VAPI API Error:", errorData);
      throw new Error(errorData.message || 'Failed to create agent in VAPI');
    }
    
    const vapiAgent: VAPIAgentResponse = await vapiResponse.json();
    console.log("VAPI agent created:", vapiAgent);
    
    // Now, store the agent details in our database
    // Using the VAPI agent ID as our agent ID, and storing model and provider as separate columns
    const { data, error } = await supabase
      .from('agents')
      .insert({
        id: vapiAgent.id, // Use VAPI agent ID directly
        name,
        voice_id: voiceId,
        prompt,
        status: vapiAgent.status || 'active',
        phone_number: vapiAgent.phone_number,
        org_id: orgId,
        provider, // Store provider directly
        model, // Store model directly
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating agent in database:', error);
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
  // Update the agent in VAPI - adjust this based on their update API format
  console.log("Updating agent in VAPI...");
  const vapiResponse = await fetch(`${VAPI_API_ENDPOINT}/assistant/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${VAPI_API_KEY}`
    },
    body: JSON.stringify({
      ...(updates.name && { name: updates.name }),
      ...(updates.prompt && { 
        model: {
          messages: [
            {
              role: "system",
              content: updates.prompt
            }
          ]
        }
      }),
      ...(updates.voiceId && { 
        voice: {
          provider: "11labs",
          voiceId: updates.voiceId
        }
      })
    })
  });

  if (!vapiResponse.ok) {
    const errorData = await vapiResponse.json();
    console.error("VAPI API Error:", errorData);
    throw new Error(errorData.message || 'Failed to update agent in VAPI');
  }

  // Update the agent in our database
  const { data, error } = await supabase
    .from('agents')
    .update({
      ...(updates.name && { name: updates.name }),
      ...(updates.voiceId && { voice_id: updates.voiceId }),
      ...(updates.prompt && { prompt: updates.prompt }),
      ...(updates.provider && { provider: updates.provider }),
      ...(updates.model && { model: updates.model }),
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
  // Delete from VAPI
  console.log("Deleting agent from VAPI...");
  const vapiResponse = await fetch(`${VAPI_API_ENDPOINT}/assistant/${id}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${VAPI_API_KEY}`
    }
  });

  if (!vapiResponse.ok) {
    const errorData = await vapiResponse.json();
    console.error("VAPI API Error:", errorData);
    throw new Error(errorData.message || 'Failed to delete agent from VAPI');
  }

  // Delete from our database
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
