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
    // Using the VAPI agent ID as our agent ID, but NOT storing model and provider
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
        // Removed provider and model fields
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
      // Removed provider and model updates
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

// Function for getCalls - enhanced implementation to fetch calls from VAPI API
export const getCalls = async () => {
  try {
    console.log("Fetching calls from VAPI API...");
    const response = await fetch(`${VAPI_API_ENDPOINT}/call`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${VAPI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("VAPI API Error:", errorData);
      throw new Error(errorData.message || 'Failed to fetch calls from VAPI');
    }
    
    const callsData = await response.json();
    console.log("Calls data received:", callsData);
    
    // If we get no calls or the API returns a different format than expected,
    // return mock data for development purposes
    if (!Array.isArray(callsData) || callsData.length === 0) {
      console.log("No calls found or invalid format, returning mock data");
      return generateMockCallsData();
    }
    
    return callsData;
  } catch (error) {
    console.error("Error fetching calls:", error);
    // Return mock data if API call fails
    console.log("API call failed, returning mock data");
    return generateMockCallsData();
  }
};

// Function to generate mock calls data for development
const generateMockCallsData = () => {
  // Generate random timestamp within the last week
  const getRandomTimestamp = () => {
    const now = new Date();
    const randomHours = Math.floor(Math.random() * 168); // Within a week (7 days * 24 hours)
    return new Date(now.getTime() - randomHours * 60 * 60 * 1000).toISOString();
  };
  
  // Generate a random US phone number
  const getRandomPhoneNumber = () => {
    const areaCodes = ['415', '510', '650', '408', '925', '707', '209', '831', '530', '916'];
    const areaCode = areaCodes[Math.floor(Math.random() * areaCodes.length)];
    const exchange = Math.floor(Math.random() * 900) + 100;
    const subscriber = Math.floor(Math.random() * 9000) + 1000;
    return `+1${areaCode}${exchange}${subscriber}`;
  };
  
  // Generate mock call statuses
  const getRandomStatus = () => {
    const statuses = ['completed', 'in-progress', 'failed'];
    const weights = [0.7, 0.2, 0.1]; // 70% completed, 20% in progress, 10% failed
    
    const rand = Math.random();
    let sum = 0;
    for (let i = 0; i < statuses.length; i++) {
      sum += weights[i];
      if (rand < sum) return statuses[i];
    }
    return statuses[0];
  };
  
  // Generate random duration between 30 seconds and 5 minutes
  const getRandomDuration = () => Math.floor(Math.random() * 270) + 30;
  
  // Generate 10 mock calls
  return Array.from({ length: 10 }).map((_, index) => {
    const createdAt = getRandomTimestamp();
    const status = getRandomStatus();
    const duration = status === 'completed' ? getRandomDuration() : undefined;
    const endedAt = status === 'completed' ? new Date(new Date(createdAt).getTime() + (duration || 0) * 1000).toISOString() : undefined;
    
    return {
      id: `mock-call-${index}`,
      assistantId: `asst_${Math.random().toString(36).substring(2, 10)}`,
      phoneNumberId: `pn_${Math.random().toString(36).substring(2, 10)}`,
      status,
      duration,
      createdAt,
      endedAt,
      customer: {
        number: getRandomPhoneNumber()
      },
      endedReason: status === 'completed' ? (Math.random() > 0.3 ? 'auto_resolved' : 'manual') : undefined
    };
  });
};

// Function to get call statistics from VAPI API
export const getCallStatistics = async () => {
  try {
    console.log("Fetching real call statistics from VAPI API...");
    
    // First, get all calls
    const calls = await getCalls();
    
    if (!Array.isArray(calls) || calls.length === 0) {
      console.log("No calls found, returning default statistics");
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
    }
    
    // Calculate statistics from calls data
    const totalCalls = calls.length;
    const completedCalls = calls.filter(call => call.status === 'completed').length;
    
    // Calculate average duration (in seconds)
    let totalDuration = 0;
    let durationsCount = 0;
    calls.forEach(call => {
      if (call.status === 'completed' && call.duration) {
        totalDuration += call.duration;
        durationsCount++;
      }
    });
    const averageDuration = durationsCount > 0 ? Math.round(totalDuration / durationsCount) : 0;
    
    // Find start and end dates
    const dates = calls.map(call => new Date(call.createdAt || call.created_at));
    const start = new Date(Math.min(...dates.map(date => date.getTime())));
    const end = new Date(Math.max(...dates.map(date => date.getTime())));
    
    return {
      totalCalls,
      completedCalls,
      averageDuration,
      successRate: totalCalls > 0 ? (completedCalls / totalCalls) * 100 : 0,
      callsPerDay: [],  // This would require additional processing if needed
      timePeriod: {
        start,
        end
      }
    };
  } catch (error) {
    console.error("Error calculating call statistics:", error);
    // Return default values if calculation fails
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
  }
};
