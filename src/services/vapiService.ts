
import { toast } from "sonner";

// API key should be stored securely in production
const VAPI_API_KEY = "86a2dd3f-cb06-4544-85c5-cde554064763";
// Updated base URL - no version prefix
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
}

interface AgentCreateParams {
  name: string;
  voice_id: string;
  prompt: string;
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

// Agent related API calls - using /agent endpoint
export const getAgents = async (): Promise<Agent[]> => {
  try {
    // Explicitly type the response to handle both formats
    const response = await fetchFromVapi<Agent[] | VapiResponse<Agent[]>>("/agent");
    
    // Properly check and extract data based on response structure
    if (Array.isArray(response)) {
      return response;
    } else if (response && 'data' in response && Array.isArray(response.data)) {
      return response.data;
    } else {
      console.warn("Unexpected response format from getAgents:", response);
      return [];
    }
  } catch (error) {
    console.error("Failed to fetch agents:", error);
    return [];
  }
};

export const createAgent = async (agentData: AgentCreateParams): Promise<Agent | null> => {
  try {
    const response = await fetchFromVapi<Agent | VapiResponse<Agent>>("/agent", {
      method: "POST",
      body: JSON.stringify(agentData),
    });
    
    // Properly check and extract agent based on response structure
    let agent: Agent | null = null;
    
    if (response && 'id' in response) {
      agent = response as Agent;
    } else if (response && 'data' in response) {
      agent = response.data as Agent;
    }
    
    if (agent) {
      toast.success("Agent created successfully!");
      return agent;
    }
    return null;
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

// Updated getCallStatistics function to return more accurate statistics
export const getCallStatistics = async () => {
  // We can't use the /call/analytics endpoint as it requires an ID parameter
  // Instead, we'll calculate statistics from the calls we fetch
  try {
    const calls = await getCalls(100); // Get a larger sample to analyze
    
    if (!Array.isArray(calls)) {
      console.error("Invalid calls data format:", calls);
      return {
        total: 0,
        completed: 0,
        in_progress: 0,
        failed: 0,
        average_duration: 0
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
    
    const stats = {
      total,
      completed,
      in_progress: inProgress,
      failed,
      average_duration: averageDuration,
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
