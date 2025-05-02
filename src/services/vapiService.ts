import { toast } from "sonner";

// API key should be stored securely in production
const VAPI_API_KEY = "86a2dd3f-cb06-4544-85c5-cde554064763";
// Updated base URL - no version prefix
const VAPI_API_URL = "https://api.vapi.ai";

interface Call {
  id: string;
  agent_id: string;
  phone_number: string;
  status: string;
  duration: number;
  created_at: string;
  ended_at: string | null;
  transcript?: string;
}

interface Agent {
  id: string;
  name: string;
  voice_id: string;
  prompt: string;
  status: string;
  created_at: string;
  active_calls: number;
}

interface AgentCreateParams {
  name: string;
  voice_id: string;
  prompt: string;
}

interface VapiResponse<T> {
  data: T;
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

    return await response.json();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown API error occurred";
    toast.error(errorMessage);
    throw error;
  }
};

// Agent related API calls - using /agent endpoint
export const getAgents = async (): Promise<Agent[]> => {
  try {
    const response = await fetchFromVapi<VapiResponse<Agent[]>>("/agent");
    return response.data;
  } catch (error) {
    console.error("Failed to fetch agents:", error);
    return [];
  }
};

export const createAgent = async (agentData: AgentCreateParams): Promise<Agent | null> => {
  try {
    const response = await fetchFromVapi<VapiResponse<Agent>>("/agent", {
      method: "POST",
      body: JSON.stringify(agentData),
    });
    toast.success("Agent created successfully!");
    return response.data;
  } catch (error) {
    console.error("Failed to create agent:", error);
    return null;
  }
};

export const deleteAgent = async (agentId: string): Promise<boolean> => {
  try {
    await fetchFromVapi(`/agent/${agentId}`, {
      method: "DELETE",
    });
    toast.success("Agent deleted successfully!");
    return true;
  } catch (error) {
    console.error("Failed to delete agent:", error);
    return false;
  }
};

// Call related API calls - using /call endpoint
export const getCalls = async (limit = 10): Promise<Call[]> => {
  try {
    const response = await fetchFromVapi<VapiResponse<Call[]>>(`/call?limit=${limit}`);
    return response.data;
  } catch (error) {
    console.error("Failed to fetch calls:", error);
    return [];
  }
};

export const getCallsByAgent = async (agentId: string): Promise<Call[]> => {
  try {
    const response = await fetchFromVapi<VapiResponse<Call[]>>(`/call?agent_id=${agentId}`);
    return response.data;
  } catch (error) {
    console.error("Failed to fetch agent calls:", error);
    return [];
  }
};

// Updated getCallStatistics function to return default stats directly without requiring an ID
export const getCallStatistics = async () => {
  // We can't use the /call/analytics endpoint as it requires an ID parameter
  // Instead, we'll calculate statistics from the calls we fetch
  try {
    const calls = await getCalls(100); // Get a larger sample to analyze
    
    // Calculate statistics from calls data
    const total = calls.length;
    const completed = calls.filter(call => call.status === "completed").length;
    const inProgress = calls.filter(call => call.status === "in-progress").length;
    const failed = calls.filter(call => 
      call.status !== "completed" && call.status !== "in-progress"
    ).length;
    
    // Calculate average duration for completed calls with duration
    const completedCallsWithDuration = calls.filter(
      call => call.status === "completed" && call.duration
    );
    const averageDuration = completedCallsWithDuration.length > 0
      ? completedCallsWithDuration.reduce((sum, call) => sum + (call.duration || 0), 0) / completedCallsWithDuration.length
      : 0;
    
    return {
      total,
      completed,
      in_progress: inProgress,
      failed,
      average_duration: averageDuration,
    };
  } catch (error) {
    console.error("Failed to calculate call statistics:", error);
    return {
      total: 0,
      completed: 0,
      in_progress: 0,
      failed: 0,
      average_duration: 0,
    };
  }
};

// Voice options - using /voice endpoint
export const getVoices = async () => {
  try {
    const response = await fetchFromVapi<VapiResponse<any[]>>("/voice");
    return response.data;
  } catch (error) {
    console.error("Failed to fetch voices:", error);
    return [];
  }
};
