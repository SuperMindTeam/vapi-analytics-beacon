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

// Updated Agent interface to match both our database structure and API responses
interface Agent {
  id: string;
  name: string;
  voice_id: string | null;
  prompt: string | null;
  status: string | null;
  created_at: string;
  active_calls: number;
  org_id?: string;
  org_name?: string;
  vapi_details?: any; // Add this field to store additional VAPI details
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
}

// API request helper with improved error handling
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
    console.log(`API response for ${endpoint}:`, jsonResponse);
    
    // Check if response has a data property, if not return the response directly
    return (jsonResponse.data !== undefined) ? jsonResponse : jsonResponse as T;
  } catch (error) {
    console.error(`API request failed for ${endpoint}:`, error);
    
    // Rethrow for proper error handling up the chain
    throw error;
  }
};

// Get a single agent from VAPI API
const getVapiAgentDetails = async (agentId: string): Promise<any> => {
  try {
    const response = await fetchFromVapi<any>(`/assistant/${agentId}`);
    console.log(`Got VAPI details for agent ${agentId}:`, response);
    return response;
  } catch (error) {
    console.error(`Failed to fetch VAPI details for agent ${agentId}:`, error);
    return null;
  }
};

// Agent related API calls with better error handling
export const getAgents = async (): Promise<Agent[]> => {
  try {
    console.log("Fetching agents from Supabase database");
    
    // Get user info
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) {
      console.error("Authentication error:", authError);
      throw new Error(`Authentication error: ${authError.message}`);
    }
    
    if (!user) {
      console.warn("No authenticated user found");
      throw new Error("You must be logged in to view agents");
    }
    
    console.log("Current authenticated user:", user.id);
    
    // Use the security definer function to get the user's organizations first
    console.log("Fetching user's organizations");
    const orgs = await getUserOrganizations();
    
    if (!orgs || orgs.length === 0) {
      console.warn("No organizations found for the user");
      return []; // Return empty array instead of throwing an error
    }
    
    console.log("User's organizations:", orgs);
    
    // Get all agents for organizations the user is a member of
    const orgIds = orgs.map(org => org.id);
    
    console.log("Querying agents for org IDs:", orgIds);
    
    // Query agents using IN condition with org IDs
    const { data: agents, error } = await supabase
      .from('agents')
      .select(`
        *,
        orgs (name)
      `)
      .in('org_id', orgIds);
    
    if (error) {
      console.error("Failed to fetch agents:", error);
      throw error;
    }
    
    if (!agents) {
      return [];
    }
    
    console.log("Agents fetched from database:", agents.length);
    
    // Transform to match expected format and enrich with VAPI data
    const agentPromises = agents.map(async agent => {
      try {
        // Get additional details from VAPI API - handle case where this fails
        const vapiDetails = await getVapiAgentDetails(agent.id).catch(err => {
          console.warn(`Could not fetch VAPI details for agent ${agent.id}:`, err);
          return null;
        });
        
        return {
          id: agent.id,
          name: agent.name,
          voice_id: agent.voice_id || 'default',
          prompt: agent.prompt || '',
          status: agent.status || 'active',
          created_at: agent.created_at,
          active_calls: vapiDetails?.active_calls || 0,
          org_id: agent.org_id,
          org_name: agent.orgs?.name || 'Unknown',
          vapi_details: vapiDetails
        };
      } catch (err) {
        console.error(`Error processing agent ${agent.id}:`, err);
        // Return the agent with minimal data rather than failing completely
        return {
          id: agent.id,
          name: agent.name,
          voice_id: agent.voice_id || 'default',
          prompt: agent.prompt || '',
          status: agent.status || 'active',
          created_at: agent.created_at,
          active_calls: 0,
          org_id: agent.org_id,
          org_name: agent.orgs?.name || 'Unknown'
        };
      }
    });
    
    // Wait for all agent details to be fetched
    const formattedAgents = await Promise.all(agentPromises);
    
    console.log("Final formatted agents:", formattedAgents.length);
    return formattedAgents;
  } catch (error) {
    console.error("Failed to fetch agents:", error);
    throw error; // Let the calling component handle the error display
  }
};

export const createAgent = async (agentData: AgentCreateParams): Promise<Agent | null> => {
  try {
    console.log("Creating agent with data:", agentData);
    
    // Get user info
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError) {
      console.error("Authentication error:", authError);
      throw new Error("Authentication failed. Please log in again.");
    }
    
    if (!authData || !authData.user) {
      console.error("No authenticated user found");
      throw new Error("No authenticated user found. Please log in again.");
    }
    
    // Use the provided org_id or get the default one
    let orgId = agentData.org_id;
    if (!orgId) {
      console.log("No org_id provided, looking for user's default organization");
      
      // Get the first organization the user is a member of
      const { data: orgMembers, error: memberError } = await supabase
        .from('org_members')
        .select('org_id, is_default')
        .eq('user_id', authData.user.id)
        .order('is_default', { ascending: false })
        .limit(1);
      
      if (memberError) {
        console.error("Error fetching org memberships:", memberError);
        throw new Error(`Failed to find organization memberships: ${memberError.message}`);
      }
      
      if (!orgMembers || orgMembers.length === 0) {
        console.error("No organization memberships found for user");
        throw new Error("No organizations found for your account. Please create an organization first.");
      }
      
      orgId = orgMembers[0].org_id;
      console.log("Using organization with ID:", orgId);
    }
    
    if (!orgId) {
      throw new Error("Could not determine organization ID");
    }
    
    // Create agent in VAPI
    console.log("Sending request to create agent in VAPI");
    
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
    
    console.log("Got VAPI agent ID:", vapiAgentId);
    console.log("Saving agent to Supabase database with org_id:", orgId);
    
    // Save agent to database using the ID provided by VAPI API
    const { data: agent, error } = await supabase
      .from('agents')
      .insert({
        id: vapiAgentId, // Use the VAPI agent ID
        org_id: orgId,
        name: agentData.name,
        voice_id: agentData.voice.voiceId,
        prompt: agentData.model.messages[0].content,
        status: 'active'
      })
      .select(`*, orgs (name)`)
      .single();
    
    if (error) {
      console.error("Failed to save agent to database:", error);
      throw error;
    }
    
    console.log("Agent saved successfully to database:", agent);
    
    // Format response to match expected format
    const formattedAgent: Agent = {
      id: agent.id,
      name: agent.name,
      voice_id: agent.voice_id || 'default',
      prompt: agent.prompt || '',
      status: agent.status || 'active',
      created_at: agent.created_at,
      active_calls: 0,
      org_id: agent.org_id,
      org_name: agent.orgs?.name || 'Unknown'
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

// Voice options - updating the endpoint to the correct one
export const getVoices = async () => {
  try {
    // Using /voices endpoint instead of /voice (which doesn't exist)
    const response = await fetchFromVapi<any[] | VapiResponse<any[]>>("/voices");
    
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

// Get current user's organizations using the security definer function
export const getUserOrganizations = async () => {
  try {
    console.log("Fetching user organizations");
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) {
      throw authError;
    }
    
    if (!user) {
      console.warn("No authenticated user found");
      return [];
    }
    
    console.log("Calling get_user_org_memberships function for user:", user.id);
    // Use the security definer function to get org memberships
    const { data: orgMembers, error: membersError } = await supabase
      .rpc('get_user_org_memberships', { user_id_param: user.id });
    
    if (membersError) {
      console.error("Failed to fetch user's organizations:", membersError);
      throw membersError;
    }
    
    console.log("Organization memberships response:", orgMembers);
    
    if (!orgMembers || orgMembers.length === 0) {
      console.warn("No organization memberships found");
      return [];
    }
    
    // Get the full organization details
    const orgIds = orgMembers.map(member => member.org_id);
    
    console.log("Fetching full details for org IDs:", orgIds);
    
    const { data: orgs, error: orgsError } = await supabase
      .from('orgs')
      .select('*')
      .in('id', orgIds);
      
    if (orgsError) {
      console.error("Failed to fetch organizations:", orgsError);
      throw orgsError;
    }
    
    console.log("Organizations fetched:", orgs?.length || 0);
    
    if (!orgs || orgs.length === 0) {
      return [];
    }
    
    // Combine org data with membership data
    const result = orgs.map(org => {
      const membership = orgMembers.find(member => member.org_id === org.id);
      return {
        ...org,
        isDefault: membership?.is_default || false
      };
    });
    
    console.log("Final processed organizations:", result.length);
    return result;
  } catch (error) {
    console.error("Failed to fetch organizations:", error);
    throw error;
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
