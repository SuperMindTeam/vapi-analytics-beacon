import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

// API key should be stored securely in production
const VAPI_API_KEY = "86a2dd3f-cb06-4544-85c5-cde554064763";
// Updated base URL with version prefix for assistants endpoint
const VAPI_API_URL = "https://api.vapi.ai";

interface Call {
  id: string;
  assistantId: string;
  phoneNumberId: string;
  type: string;
  status: string;
  duration?: number;
  createdAt: string;
  endedAt?: string;
  transcript?: string;
  recordingUrl?: string;
  summary?: string;
  customer?: {
    number: string;
  };
  endedReason?: string;
}

interface Agent {
  id: string;
  name: string;
  voice_id: string;
  prompt: string;
  status: string;
  created_at: string;
  active_calls: number;
  org_id?: string;
}

// Updated interface to match the API request structure
interface AgentCreateParams {
  name: string;
  model: {
    provider: string;
    model: string;
    messages: Array<{role: string; content: string}>;
  };
  voice: {
    provider: string;
    voiceId: string;
  };
  firstMessage?: string;
  org_id?: string;
}

// Updated interface to make data optional but properly typed
interface VapiResponse<T> {
  data?: T;
  total?: number;
}

// API request helper with error handling
const fetchFromVapi = async <T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  try {
    // Log the full URL to help with debugging
    const fullUrl = `${VAPI_API_URL}${endpoint}`;
    console.log(`Making API request to: ${fullUrl}`);
    
    const response = await fetch(fullUrl, {
      ...options,
      headers: {
        Authorization: `Bearer ${VAPI_API_KEY}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(`API Error: ${response.status}`, errorData);
      throw new Error(errorData.message || `API Error: ${response.status}`);
    }

    const jsonResponse = await response.json();
    
    // Check if response has a data property, if not return the response directly
    return (jsonResponse.data !== undefined) ? jsonResponse : jsonResponse as T;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown API error occurred";
    toast.error(errorMessage);
    throw error;
  }
};

// Agent related API calls - now using Supabase for database storage
export const getAgents = async (): Promise<Agent[]> => {
  try {
    console.log("Fetching agents from Supabase database");
    
    // Get user info to find their organizations
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.warn("No authenticated user found");
      return [];
    }
    
    // Get organizations the user belongs to
    const { data: orgMembers, error: orgError } = await supabase
      .from('org_members')
      .select('org_id')
      .eq('user_id', user.id);
    
    if (orgError) {
      console.error("Failed to fetch user organizations:", orgError);
      return [];
    }
    
    if (!orgMembers || orgMembers.length === 0) {
      console.warn("User doesn't belong to any organizations");
      return [];
    }
    
    // Get all organization IDs the user is a member of
    const orgIds = orgMembers.map(member => member.org_id);
    
    // Fetch agents from database
    const { data: agents, error } = await supabase
      .from('agents')
      .select('*')
      .in('org_id', orgIds);
    
    if (error) {
      console.error("Failed to fetch agents:", error);
      return [];
    }
    
    // Transform to match expected format
    const formattedAgents = agents.map(agent => ({
      id: agent.id,
      name: agent.name,
      voice_id: agent.voice_id || 'default',
      prompt: agent.prompt || '',
      status: agent.status || 'active',
      created_at: agent.created_at,
      active_calls: 0,
      org_id: agent.org_id
    }));
    
    return formattedAgents;
  } catch (error) {
    console.error("Failed to fetch agents:", error);
    return [];
  }
};

export const createAgent = async (agentData: AgentCreateParams): Promise<Agent | null> => {
  try {
    console.log("Creating agent with data:", agentData);
    
    // Get user info
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("No authenticated user found");
    }
    
    // Get user's default organization if not specified
    let orgId = agentData.org_id;
    if (!orgId) {
      const { data: orgMembers, error: orgError } = await supabase
        .from('org_members')
        .select('org_id')
        .eq('user_id', user.id)
        .eq('is_default', true)
        .single();
      
      if (orgError || !orgMembers) {
        throw new Error("No default organization found for user");
      }
      
      orgId = orgMembers.org_id;
    }
    
    // Create agent in VAPI
    const vapiResponse = await fetchFromVapi<Agent | VapiResponse<Agent>>("/assistant", {
      method: "POST",
      body: JSON.stringify({
        name: agentData.name,
        model: agentData.model,
        voice: agentData.voice,
        firstMessage: agentData.firstMessage
      }),
    });
    
    console.log("VAPI Create agent response:", vapiResponse);
    
    // Extract agent ID from VAPI response
    let vapiAgentId: string | null = null;
    
    if (vapiResponse && 'id' in vapiResponse) {
      vapiAgentId = (vapiResponse as Agent).id;
    } else if (vapiResponse && 'data' in vapiResponse && vapiResponse.data) {
      vapiAgentId = (vapiResponse.data as Agent).id;
    }
    
    if (!vapiAgentId) {
      throw new Error("Failed to get agent ID from VAPI response");
    }
    
    // Save agent to database
    const { data: agent, error } = await supabase
      .from('agents')
      .insert({
        id: vapiAgentId, // Use the VAPI agent ID as our ID
        org_id: orgId,
        name: agentData.name,
        voice_id: agentData.voice.voiceId,
        prompt: agentData.model.messages[0].content,
        status: 'active'
      })
      .select()
      .single();
    
    if (error) {
      console.error("Failed to save agent to database:", error);
      throw error;
    }
    
    // Format response to match expected format
    const formattedAgent = {
      id: agent.id,
      name: agent.name,
      voice_id: agent.voice_id || 'default',
      prompt: agent.prompt || '',
      status: agent.status || 'active',
      created_at: agent.created_at,
      active_calls: 0,
      org_id: agent.org_id
    };
    
    toast.success("Agent created successfully!");
    return formattedAgent;
  } catch (error) {
    console.error("Failed to create agent:", error);
    throw error;
  }
};

export const deleteAgent = async (agentId: string): Promise<boolean> => {
  try {
    // Delete from VAPI
    await fetchFromVapi(`/assistant/${agentId}`, {
      method: "DELETE",
    });
    
    // Delete from database
    const { error } = await supabase
      .from('agents')
      .delete()
      .eq('id', agentId);
    
    if (error) {
      console.error("Failed to delete agent from database:", error);
      throw error;
    }
    
    toast.success("Agent deleted successfully!");
    return true;
  } catch (error) {
    console.error("Failed to delete agent:", error);
    return false;
  }
};

// Call related API calls - using /call endpoint (kept unchanged)
export const getCalls = async (limit = 10): Promise<Call[]> => {
  try {
    // Explicitly type the response to handle both formats
    const response = await fetchFromVapi<Call[] | VapiResponse<Call[]>>(`/call?limit=${limit}`);
    
    // Properly check and extract data based on response structure
    if (Array.isArray(response)) {
      return response;
    } else if (response && 'data' in response && Array.isArray(response.data)) {
      return response.data;
    } else {
      console.warn("Unexpected response format from getCalls:", response);
      return [];
    }
  } catch (error) {
    console.error("Failed to fetch calls:", error);
    return [];
  }
};

export const getCallsByAgent = async (agentId: string): Promise<Call[]> => {
  try {
    // Explicitly type the response to handle both formats
    const response = await fetchFromVapi<Call[] | VapiResponse<Call[]>>(`/call?agent_id=${agentId}`);
    
    // Properly check and extract data based on response structure
    if (Array.isArray(response)) {
      return response;
    } else if (response && 'data' in response && Array.isArray(response.data)) {
      return response.data;
    } else {
      console.warn("Unexpected response format from getCallsByAgent:", response);
      return [];
    }
  } catch (error) {
    console.error("Failed to fetch agent calls:", error);
    return [];
  }
};

// Updated getCallStatistics function to return more accurate statistics with time period
export const getCallStatistics = async () => {
  // We can't use the /call/analytics endpoint as it requires an ID parameter
  // Instead, we'll calculate statistics from the calls we fetch
  try {
    // Get all calls - don't limit to 100 as that's causing the confusion
    // The API might have its own limits, but we're not artificially limiting
    const calls = await getCalls(1000); // Increased limit to get more accurate data
    
    if (!Array.isArray(calls)) {
      console.error("Invalid calls data format:", calls);
      return {
        total: 0,
        completed: 0,
        in_progress: 0,
        failed: 0,
        average_duration: 0,
        time_period: { start: null, end: null }
      };
    }
    
    console.log(`Processing ${calls.length} calls for statistics`);
    
    // Calculate statistics from calls data
    const total = calls.length;
    const completed = calls.filter(call => call.status === "completed").length;
    const inProgress = calls.filter(call => call.status === "in-progress").length;
    const failed = calls.filter(call => 
      call.status !== "completed" && call.status !== "in-progress"
    ).length;
    
    // Calculate average duration for completed calls with duration
    const completedCallsWithDuration = calls.filter(
      call => call.status === "completed" && typeof call.duration === 'number' && call.duration > 0
    );
    
    const averageDuration = completedCallsWithDuration.length > 0
      ? completedCallsWithDuration.reduce((sum, call) => sum + (call.duration || 0), 0) / completedCallsWithDuration.length
      : 0;
    
    // Determine time period of the data
    let startDate = null;
    let endDate = null;
    
    if (calls.length > 0) {
      // Sort calls by date
      const sortedCalls = [...calls].sort((a, b) => 
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      
      startDate = new Date(sortedCalls[0].createdAt);
      endDate = new Date(sortedCalls[sortedCalls.length - 1].createdAt);
    }
    
    const stats = {
      total,
      completed,
      in_progress: inProgress,
      failed,
      average_duration: averageDuration,
      time_period: {
        start: startDate,
        end: endDate
      }
    };
    
    console.log("Generated call statistics:", stats);
    return stats;
  } catch (error) {
    console.error("Failed to calculate call statistics:", error);
    return {
      total: 0,
      completed: 0,
      in_progress: 0,
      failed: 0,
      average_duration: 0,
      time_period: { start: null, end: null }
    };
  }
};

// Voice options - using /voice endpoint
export const getVoices = async () => {
  try {
    // Explicitly type the response to handle both formats
    const response = await fetchFromVapi<any[] | VapiResponse<any[]>>("/voice");
    
    // Properly check and extract data based on response structure
    if (Array.isArray(response)) {
      return response;
    } else if (response && 'data' in response && Array.isArray(response.data)) {
      return response.data;
    } else {
      console.warn("Unexpected response format from getVoices:", response);
      return [];
    }
  } catch (error) {
    console.error("Failed to fetch voices:", error);
    return [];
  }
};

// New function to get current user's organizations
export const getUserOrganizations = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return [];
    }
    
    // Get all orgs the user is a member of with role information
    const { data: orgMembers, error: membersError } = await supabase
      .from('org_members')
      .select('*, orgs:org_id(*)')
      .eq('user_id', user.id);
    
    if (membersError) {
      console.error("Failed to fetch user's organizations:", membersError);
      return [];
    }
    
    return orgMembers.map(member => ({
      ...member.orgs,
      role: member.role,
      isDefault: member.is_default
    }));
  } catch (error) {
    console.error("Failed to fetch organizations:", error);
    return [];
  }
};

// New function to create an organization
export const createOrganization = async (name: string) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("No authenticated user found");
    }
    
    // Create organization
    const { data: org, error: orgError } = await supabase
      .from('orgs')
      .insert({ name })
      .select()
      .single();
      
    if (orgError || !org) {
      throw orgError || new Error("Failed to create organization");
    }
    
    // Add user as owner
    const { error: memberError } = await supabase
      .from('org_members')
      .insert({
        org_id: org.id,
        user_id: user.id,
        role: 'owner',
        is_default: false
      });
      
    if (memberError) {
      throw memberError;
    }
    
    return org;
  } catch (error) {
    console.error("Failed to create organization:", error);
    throw error;
  }
};
