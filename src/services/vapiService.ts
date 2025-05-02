
import { toast } from "sonner";

// API key should be stored securely in production
const VAPI_API_KEY = "86a2dd3f-cb06-4544-85c5-cde554064763";
const VAPI_API_URL = "https://api.vapi.ai";  // Removed the /api at the end

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
    const response = await fetch(`${VAPI_API_URL}${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${VAPI_API_KEY}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
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
    const response = await fetchFromVapi<VapiResponse<Agent[]>>("/v1/agents");
    return response.data;
  } catch (error) {
    console.error("Failed to fetch agents:", error);
    return [];
  }
};

export const createAgent = async (agentData: AgentCreateParams): Promise<Agent | null> => {
  try {
    const response = await fetchFromVapi<VapiResponse<Agent>>("/v1/agents", {
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
    await fetchFromVapi(`/v1/agents/${agentId}`, {
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
    const response = await fetchFromVapi<VapiResponse<Call[]>>(`/v1/calls?limit=${limit}`);
    return response.data;
  } catch (error) {
    console.error("Failed to fetch calls:", error);
    return [];
  }
};

export const getCallsByAgent = async (agentId: string): Promise<Call[]> => {
  try {
    const response = await fetchFromVapi<VapiResponse<Call[]>>(`/v1/calls?agent_id=${agentId}`);
    return response.data;
  } catch (error) {
    console.error("Failed to fetch agent calls:", error);
    return [];
  }
};

export const getCallStatistics = async () => {
  try {
    // This endpoint is now updated to use the correct path
    const response = await fetchFromVapi<any>("/v1/analytics/calls");
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
    const response = await fetchFromVapi<VapiResponse<any[]>>("/v1/voices");
    return response.data;
  } catch (error) {
    console.error("Failed to fetch voices:", error);
    return [];
  }
};
