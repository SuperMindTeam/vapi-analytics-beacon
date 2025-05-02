
import { toast } from "sonner";

// API key should be stored securely in production
const VAPI_API_KEY = "86a2dd3f-cb06-4544-85c5-cde554064763";
// Fixed URL structure - proper version prefix
const VAPI_API_URL = "https://api.vapi.ai/v1";

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

// Agent related API calls
export const getAgents = async (): Promise<Agent[]> => {
  try {
    const response = await fetchFromVapi<VapiResponse<Agent[]>>("/agents");
    return response.data;
  } catch (error) {
    console.error("Failed to fetch agents:", error);
    return [];
  }
};

export const createAgent = async (agentData: AgentCreateParams): Promise<Agent | null> => {
  try {
    const response = await fetchFromVapi<VapiResponse<Agent>>("/agents", {
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
    await fetchFromVapi(`/agents/${agentId}`, {
      method: "DELETE",
    });
    toast.success("Agent deleted successfully!");
    return true;
  } catch (error) {
    console.error("Failed to delete agent:", error);
    return false;
  }
};

// Call related API calls
export const getCalls = async (limit = 10): Promise<Call[]> => {
  try {
    const response = await fetchFromVapi<VapiResponse<Call[]>>(`/calls?limit=${limit}`);
    return response.data;
  } catch (error) {
    console.error("Failed to fetch calls:", error);
    return [];
  }
};

export const getCallsByAgent = async (agentId: string): Promise<Call[]> => {
  try {
    const response = await fetchFromVapi<VapiResponse<Call[]>>(`/calls?agent_id=${agentId}`);
    return response.data;
  } catch (error) {
    console.error("Failed to fetch agent calls:", error);
    return [];
  }
};

export const getCallStatistics = async () => {
  try {
    // Updated analytics endpoint to match API structure
    const response = await fetchFromVapi<any>("/calls/analytics");
    return response.data;
  } catch (error) {
    console.error("Failed to fetch call statistics:", error);
    return {
      total: 0,
      completed: 0,
      in_progress: 0,
      failed: 0,
      average_duration: 0,
    };
  }
};

// Voice options
export const getVoices = async () => {
  try {
    const response = await fetchFromVapi<VapiResponse<any[]>>("/voices");
    return response.data;
  } catch (error) {
    console.error("Failed to fetch voices:", error);
    return [];
  }
};
