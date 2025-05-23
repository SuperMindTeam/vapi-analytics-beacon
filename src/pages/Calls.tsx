
import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { getCalls } from '@/services/vapiService';
import { format, isAfter, isBefore, isSameDay, parseISO } from 'date-fns';
import { Phone, Clock, User, MessageSquare, Check, AlertTriangle, X, Filter, CalendarRange, ChevronDown, Play, Pause, AudioWaveform } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Calendar } from '@/components/ui/calendar';
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import AudioPlayer from '@/components/AudioPlayer';
import { formatDuration } from '@/utils/formatters';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from "@/integrations/supabase/client";

interface Message {
  role: string;
  content: string;
  timestamp: string;
  time?: number;
  message?: string;
}

interface Call {
  id: string;
  assistantId: string;
  phoneNumberId: string;
  status: string;
  duration?: number;
  createdAt: string;
  endedAt?: string;
  customer?: {
    number: string;
  };
  endedReason?: string;
  messages?: Message[];
  transcript?: string;
  recordingUrl?: string;
  summary?: string;
  previewMessage?: string;
  agentName?: string;
  orgId?: string; // Added orgId property to filter calls
}

interface Agent {
  id: string;
  name: string;
  org_id: string;
}

const Calls: React.FC = () => {
  const { orgId } = useAuth(); // Get the current user's org ID
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCall, setSelectedCall] = useState<Call | null>(null);
  const [activeTab, setActiveTab] = useState<string>("all");
  const [newMessage, setNewMessage] = useState<string>("");
  const [orgAgents, setOrgAgents] = useState<Agent[]>([]);
  
  // For audio player
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  
  // Updated to use "all" as the default value instead of empty string
  const [selectedAgentFilter, setSelectedAgentFilter] = useState<string>("all");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [uniqueAgents, setUniqueAgents] = useState<{id: string, name: string}[]>([]);
  
  // Add new state for audio duration and current time
  const [audioDuration, setAudioDuration] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  
  // Fetch agents associated with the user's organization
  useEffect(() => {
    const fetchOrgAgents = async () => {
      if (!orgId) return;
      
      try {
        console.log("Calls: Fetching agents for org ID:", orgId);
        const { data: agents, error } = await supabase
          .from('agents')
          .select('id, name, org_id')
          .eq('org_id', orgId);
          
        if (error) {
          console.error('Error fetching organization agents:', error);
          return;
        }
        
        if (agents && agents.length > 0) {
          console.log(`Calls: Found ${agents.length} agents for org:`, agents);
          setOrgAgents(agents);
        } else {
          console.log("Calls: No agents found for this organization");
        }
      } catch (err) {
        console.error('Failed to fetch organization agents:', err);
      }
    };
    
    fetchOrgAgents();
  }, [orgId]);
  
  useEffect(() => {
    const fetchCalls = async () => {
      try {
        setLoading(true);
        
        if (!orgId) {
          console.log("No organization ID available");
          setCalls([]);
          setLoading(false);
          return;
        }

        console.log("Fetching calls with orgId:", orgId);
        
        // Get agent IDs from the organization
        const orgAgentIds = orgAgents.map(agent => agent.id);
        
        if (orgAgentIds.length === 0) {
          console.log("No agents found for this organization");
          setCalls([]);
          setLoading(false);
          return;
        }
        
        console.log("Filtering calls by org agent IDs:", orgAgentIds);
        
        // Fetch calls from VAPI with agent IDs filter
        const callsData = await getCalls(orgAgentIds);
        
        if (Array.isArray(callsData)) {
          console.log(`Received ${callsData.length} calls data:`, callsData);
          
          // Process calls data to include real messages and agent names
          const enhancedCalls = callsData.map(call => {
            // Check if call has a real transcript
            const hasRealTranscript = !!call.transcript;
            
            // Process call messages
            let parsedMessages: Message[] = [];
            
            if (hasRealTranscript && call.transcript) {
              // If we have a transcript, parse it into messages
              parsedMessages = parseTranscriptToMessages(call.transcript);
            } else if (call.messages && call.messages.length > 0) {
              // If the API returned messages directly, use those
              parsedMessages = call.messages;
            } else if (call.status === 'ended' && call.endedReason?.includes('error')) {
              // If the call failed, we'll show an error message
              parsedMessages = [
                {
                  role: 'system',
                  content: `Call failed: ${formatEndedReason(call.endedReason)}`,
                  timestamp: call.updatedAt || call.createdAt
                }
              ];
            } else {
              // Otherwise use mock messages for demo purposes
              parsedMessages = generateMessagesForCall(call.id);
            }
            
            return {
              ...call,
              messages: parsedMessages,
              previewMessage: call.previewMessage || getPreviewMessage(call, parsedMessages),
              agentName: getAgentName(call.assistantId || call.phoneNumberId)
            };
          });
          
          setCalls(enhancedCalls);
          
          // Extract unique agents for filter dropdown
          const agents = enhancedCalls
            .map(call => ({ id: call.assistantId || call.phoneNumberId, name: call.agentName || 'Unknown' }))
            .filter((agent, index, self) => 
              index === self.findIndex(a => a.id === agent.id)
            );
          setUniqueAgents(agents);
          
          // Select the first call by default if available
          if (enhancedCalls.length > 0 && !selectedCall) {
            setSelectedCall(enhancedCalls[0]);
          }
        } else {
          console.error('Invalid calls data format:', callsData);
          setError('Failed to fetch calls data. Invalid data format.');
        }
      } catch (error) {
        console.error('Error fetching calls:', error);
        setError('Failed to fetch calls data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchCalls();
  }, [orgId, orgAgents]);

  // Function for generating mock calls for specific org agents when no real calls are found
  const generateMockCallsForOrgAgents = (agentIds: string[], orgId: string): Call[] => {
    console.log("Generating mock calls for agents:", agentIds);
    
    const statuses = ['completed', 'in-progress', 'ended'];
    const mockCalls: Call[] = [];
    
    // Generate 5-10 random mock calls
    const numCalls = Math.floor(Math.random() * 6) + 5;
    
    for (let i = 0; i < numCalls; i++) {
      const createdAt = new Date(Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000)).toISOString();
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const duration = status === 'completed' ? Math.floor(Math.random() * 300) + 60 : undefined;
      const endedAt = status !== 'in-progress' ? new Date(new Date(createdAt).getTime() + (duration || 0) * 1000).toISOString() : undefined;
      
      // Use one of the org's agents or a random ID if no agents
      const assistantId = agentIds.length > 0 
        ? agentIds[Math.floor(Math.random() * agentIds.length)]
        : `mock-agent-${Math.random().toString(36).substring(2, 10)}`;
      
      mockCalls.push({
        id: `mock-call-${i}-${Math.random().toString(36).substring(2, 10)}`,
        assistantId,
        phoneNumberId: `pn-${Math.random().toString(36).substring(2, 10)}`,
        status,
        duration,
        createdAt,
        endedAt,
        customer: {
          number: `+1${Math.floor(Math.random() * 9000000000) + 1000000000}`
        },
        orgId,
        endedReason: status === 'completed' ? 'customer-ended-call' : status === 'ended' ? 'auto-resolved' : undefined
      });
    }
    
    return mockCalls;
  };

  // Function for playing and controlling audio
  const toggleAudio = () => {
    if (!selectedCall?.recordingUrl) {
      console.log("No recording available for this call");
      return;
    }

    if (!audio) {
      const newAudio = new Audio(selectedCall.recordingUrl);
      
      // Add event listeners for time updates
      newAudio.ontimeupdate = () => {
        setCurrentTime(newAudio.currentTime);
      };
      
      newAudio.onloadedmetadata = () => {
        setAudioDuration(newAudio.duration);
      };
      
      newAudio.onended = () => {
        setIsPlaying(false);
        setCurrentTime(0);
      };
      
      newAudio.onpause = () => {
        setIsPlaying(false);
      };
      
      newAudio.onplay = () => {
        setIsPlaying(true);
      };
      
      newAudio.onerror = () => {
        console.error("Failed to load audio recording");
        // Removed the toast notification to avoid unnecessary error messages
      };
      
      setAudio(newAudio);
      newAudio.play().catch(err => {
        console.error("Error playing audio:", err);
      });
      setIsPlaying(true);
    } else {
      if (isPlaying) {
        audio.pause();
      } else {
        audio.play().catch(err => {
          console.error("Error playing audio:", err);
        });
      }
    }
  };

  // Clean up audio when changing selected call
  useEffect(() => {
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      setAudio(null);
      setIsPlaying(false);
      setCurrentTime(0);
      setAudioDuration(0);
    }
  }, [selectedCall]);

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
    };
  }, [audio]);
  
  // Parse transcript string into message objects
  const parseTranscriptToMessages = (transcript: string): Message[] => {
    try {
      if (!transcript) return [];
      
      // Split the transcript by new lines
      const lines = transcript.split('\n').filter(line => line.trim() !== '');
      const messages: Message[] = [];
      
      lines.forEach(line => {
        // Check if line starts with AI: or User: (common transcript format)
        const aiMatch = line.match(/^AI: (.*)/);
        const userMatch = line.match(/^User: (.*)/);
        
        if (aiMatch) {
          messages.push({
            role: 'ai',
            content: aiMatch[1],
            timestamp: new Date().toISOString() // Approximation as transcript doesn't have timestamps
          });
        } else if (userMatch) {
          messages.push({
            role: 'customer',
            content: userMatch[1],
            timestamp: new Date().toISOString()
          });
        } else {
          // If line doesn't match expected format, try to determine role based on context
          // Default to system message if can't determine
          messages.push({
            role: 'system',
            content: line,
            timestamp: new Date().toISOString()
          });
        }
      });
      
      return messages;
    } catch (e) {
      console.error('Error parsing transcript:', e);
      return [];
    }
  };
  
  // Format ended reason to be more user-friendly
  const formatEndedReason = (reason?: string): string => {
    if (!reason) return 'Unknown reason';
    
    // Remove technical prefixes
    const cleanReason = reason.replace('call.in-progress.error-', '')
      .replace('call.in-progress.', '')
      .replace('-', ' ');
    
    // Capitalize and improve readability
    return cleanReason.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  // Get preview message for call list
  const getPreviewMessage = (call: Call, messages: Message[]): string => {
    // If call failed, show the failure reason
    if (call.status === 'ended' && call.endedReason && call.endedReason.includes('error')) {
      return `Call failed: ${formatEndedReason(call.endedReason)}`;
    }
    
    // If we have a summary from the API, use it
    if (call.summary) {
      return call.summary;
    }
    
    // Otherwise use the first customer message as preview
    if (messages && messages.length > 0) {
      const firstCustomerMessage = messages.find(msg => 
        msg.role.toLowerCase() === 'customer' || msg.role.toLowerCase() === 'user'
      );
      if (firstCustomerMessage) {
        return firstCustomerMessage.content;
      }
    }
    
    return call.previewMessage || "No message content";
  };

  // Helper function to get agent name - updated to prioritize org agents
  const getAgentName = (assistantId?: string): string => {
    if (!assistantId) return 'AI Assistant';
    
    // First, check if this is one of our organization's agents
    const orgAgent = orgAgents.find(agent => agent.id === assistantId);
    if (orgAgent) {
      return orgAgent.name;
    }
    
    // Then, try to find the agent in our uniqueAgents state
    const agent = uniqueAgents.find(agent => agent.id === assistantId);
    if (agent && agent.name && agent.name !== 'Unknown') {
      return agent.name;
    }
    
    // If not found, use a default name based on ID
    return `Agent ${assistantId.slice(0, 6)}`;
  };

  // Generate consistent messages for a specific call ID
  const generateMessagesForCall = (callId: string): Message[] => {
    // Use the call ID to determine which conversation to show
    const conversationSets = [
      [
        { role: 'customer', content: 'Hi, I need to cancel my reservation.', timestamp: new Date(Date.now() - 3600000).toISOString() },
        { role: 'ai', content: 'No problem! Just so you know, you may cancel before 2 hours of the reservation with no charge. After that, canceling may trigger a fee of 20 dollars per guest. What\'s the name for the reservation?', timestamp: new Date(Date.now() - 3500000).toISOString() },
        { role: 'customer', content: 'Aaron, aaron Last name is Judd, j u d d.', timestamp: new Date(Date.now() - 3400000).toISOString() },
        { role: 'ai', content: "I'll cancel your reservation, so you're all set. Is there anything else I can help you with?", timestamp: new Date(Date.now() - 3300000).toISOString() },
        { role: 'customer', content: "That's all.", timestamp: new Date(Date.now() - 3200000).toISOString() }
      ],
      [
        { role: 'customer', content: 'I wanted to confirm my booking for tonight.', timestamp: new Date(Date.now() - 4600000).toISOString() },
        { role: 'ai', content: 'I\'d be happy to help you confirm your booking. Could you please provide your name and the time of your reservation?', timestamp: new Date(Date.now() - 4500000).toISOString() },
        { role: 'customer', content: 'My name is Sarah Johnson and the reservation is for 7:30 PM.', timestamp: new Date(Date.now() - 4400000).toISOString() },
        { role: 'ai', content: "I've found your reservation for tonight at 7:30 PM for a party of 4. Would you like me to make any changes to it?", timestamp: new Date(Date.now() - 4300000).toISOString() },
        { role: 'customer', content: "No, that's perfect. Thanks!", timestamp: new Date(Date.now() - 4200000).toISOString() }
      ],
      [
        { role: 'customer', content: 'Do you have any availability for dinner tomorrow?', timestamp: new Date(Date.now() - 5600000).toISOString() },
        { role: 'ai', content: 'Yes, we do have some availability tomorrow. How many people would be in your party and what time would you prefer?', timestamp: new Date(Date.now() - 5500000).toISOString() },
        { role: 'customer', content: "There will be 6 of us, and we'd prefer around 6 PM if possible.", timestamp: new Date(Date.now() - 5400000).toISOString() },
        { role: 'ai', content: "I have an opening at 6:15 PM for a party of 6. Would that work for you?", timestamp: new Date(Date.now() - 5300000).toISOString() },
        { role: 'customer', content: "That's perfect. Please book it under the name Mark Wilson.", timestamp: new Date(Date.now() - 5200000).toISOString() },
        { role: 'ai', content: "Great! I've booked your reservation for tomorrow at 6:15 PM for 6 people under Mark Wilson. Anything else you need help with?", timestamp: new Date(Date.now() - 5100000).toISOString() },
        { role: 'customer', content: "No thank you, that's all I needed.", timestamp: new Date(Date.now() - 5000000).toISOString() }
      ]
    ];
    
    // Use the call ID to determine which conversation to return
    // For simplicity, we'll use the last digit of the ID to choose
    const lastDigit = parseInt(callId.slice(-1), 36) % conversationSets.length;
    return conversationSets[lastDigit];
  };

  const formatPhoneNumber = (number?: string): string => {
    if (!number) return 'Unknown';
    // Format phone number as (XXX) XXX-XXXX
    const cleaned = ('' + number).replace(/\D/g, '');
    const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
    if (match) {
      return '(' + match[1] + ') ' + match[2] + '-' + match[3];
    }
    return number;
  };

  // Format time (mm:ss)
  const formatTime = (time: number): string => {
    if (isNaN(time) || time === undefined) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return <Badge className="bg-green-500">Completed</Badge>;
      case 'in-progress':
        return <Badge variant="secondary">In Progress</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'ended':
        if (selectedCall?.endedReason && selectedCall.endedReason.includes('error')) {
          return <Badge variant="destructive">Failed</Badge>;
        }
        return <Badge className="bg-green-500">Completed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedCall) return;
    
    // In a real app, we would send the message to the API here
    toast.info("Message sending functionality is currently in demo mode");
    
    // For now, just add it to the UI
    const updatedCalls = calls.map(call => {
      if (call.id === selectedCall.id) {
        return {
          ...call,
          messages: [
            ...(call.messages || []),
            {
              role: 'agent',
              content: newMessage,
              timestamp: new Date().toISOString()
            }
          ]
        };
      }
      return call;
    });
    
    setCalls(updatedCalls);
    setSelectedCall(updatedCalls.find(call => call.id === selectedCall.id) || null);
    setNewMessage("");
  };
  
  // Function to clear all filters
  const clearFilters = () => {
    setSelectedAgentFilter("all");
    setSelectedDate(undefined);
  };

  const getFilteredCalls = () => {
    // First, filter by tab status
    let filtered = calls;
    
    switch (activeTab) {
      case "unresolved":
        filtered = calls.filter(call => call.status.toLowerCase() === 'in-progress');
        break;
      case "resolved":
        filtered = calls.filter(call => 
          call.status.toLowerCase() === 'completed' || 
          (call.status.toLowerCase() === 'ended' && !call.endedReason?.includes('error'))
        );
        break;
      case "autoresolved":
        filtered = calls.filter(call => call.status.toLowerCase() === 'completed' && call.endedReason === 'auto_resolved');
        break;
    }
    
    // Then filter by agent if selected
    if (selectedAgentFilter && selectedAgentFilter !== "all") {
      filtered = filtered.filter(call => call.assistantId === selectedAgentFilter);
    }
    
    // Then filter by date if selected
    if (selectedDate) {
      filtered = filtered.filter(call => {
        const callDate = new Date(call.createdAt);
        return isSameDay(callDate, selectedDate);
      });
    }
    
    return filtered;
  };

  return (
    <div className="h-full flex bg-background">
      {/* Left sidebar - Call list */}
      <div className="w-1/3 border-r h-full flex flex-col">
        <div className="p-4">
          <div className="mb-4">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid grid-cols-3 mb-4">
                <TabsTrigger 
                  value="all" 
                  className={`text-sm ${activeTab === "all" ? "bg-[#9c90ff] text-white" : ""}`}
                >
                  All
                  {calls.length > 0 && (
                    <span className={`ml-1 ${activeTab === "all" ? "bg-white text-[#9c90ff]" : "bg-gray-200 text-gray-700"} rounded-full px-2 py-0.5 text-xs`}>
                      {calls.length}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger 
                  value="unresolved" 
                  className={`text-sm ${activeTab === "unresolved" ? "bg-[#9c90ff] text-white" : ""}`}
                >
                  Unresolved
                  {calls.filter(c => c.status.toLowerCase() === 'in-progress').length > 0 && (
                    <span className={`ml-1 ${activeTab === "unresolved" ? "bg-white text-[#9c90ff]" : "bg-gray-200 text-gray-700"} rounded-full px-2 py-0.5 text-xs`}>
                      {calls.filter(c => c.status.toLowerCase() === 'in-progress').length}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger 
                  value="resolved" 
                  className={`text-sm ${activeTab === "resolved" ? "bg-[#9c90ff] text-white" : ""}`}
                >
                  Resolved
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          
          {/* Filter section */}
          <div className="mb-4">
            <Button 
              variant="outline" 
              className="w-full flex items-center justify-between mb-2"
              onClick={() => setShowFilters(!showFilters)}
            >
              <div className="flex items-center">
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </div>
              <ChevronDown className={`h-4 w-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </Button>
            
            {showFilters && (
              <div className="p-3 border rounded-md space-y-3">
                {/* Agent filter */}
                <div>
                  <label className="text-sm font-medium block mb-1">Agent</label>
                  <Select value={selectedAgentFilter} onValueChange={setSelectedAgentFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Any Agent" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Any Agent</SelectItem>
                      {uniqueAgents.map(agent => (
                        <SelectItem key={agent.id} value={agent.id}>
                          {agent.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Date filter */}
                <div>
                  <label className="text-sm font-medium block mb-1">Date</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarRange className="mr-2 h-4 w-4" />
                        {selectedDate ? format(selectedDate, 'PPP') : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                
                {/* Clear filters button */}
                <Button 
                  variant="ghost" 
                  className="w-full text-sm"
                  onClick={clearFilters}
                >
                  Clear filters
                </Button>
              </div>
            )}
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-center text-red-700 text-sm">
              <AlertTriangle className="h-4 w-4 mr-2 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}
        </div>

        {/* Call list with scroll area */}
        <ScrollArea className="flex-1">
          <div className="p-4">
            {loading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, index) => (
                  <div key={index} className="p-3 border rounded-md">
                    <div className="flex justify-between items-start">
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-5 w-5 rounded-full" />
                    </div>
                    <Skeleton className="h-4 w-3/4 mt-2" />
                    <Skeleton className="h-3 w-1/2 mt-1" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {getFilteredCalls().length > 0 ? (
                  getFilteredCalls().map((call) => (
                    <div 
                      key={call.id}
                      onClick={() => setSelectedCall(call)}
                      className={`p-3 border rounded-md cursor-pointer hover:bg-gray-50 transition-colors ${
                        selectedCall?.id === call.id ? 'border-primary bg-gray-50' : ''
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="font-medium">
                          {formatPhoneNumber(call.customer?.number)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {format(new Date(call.createdAt), 'MMM d h:mma')}
                        </div>
                      </div>
                      <div className="text-sm text-gray-600 mt-1 truncate">
                        {call.previewMessage || "No message content"}
                      </div>
                      <div className="flex justify-between items-center mt-1">
                        <div className="text-xs text-gray-500">
                          {call.agentName || 'AI Assistant'}
                        </div>
                        {call.endedReason && call.endedReason.includes('error') ? (
                          <Badge variant="outline" className="text-red-500 border-red-200 text-xs">
                            <X className="h-3 w-3 mr-1" /> Failed
                          </Badge>
                        ) : null}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center p-6 text-gray-500">
                    No calls match the current filter
                  </div>
                )}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Right content - Conversation */}
      <div className="flex-1 h-full flex flex-col">
        {selectedCall ? (
          <>
            {/* Header with call details */}
            <div className="p-4 border-b flex justify-between items-center">
              <div>
                <div className="flex items-center">
                  <Phone className="h-5 w-5 mr-2" />
                  <h2 className="text-lg font-medium">
                    {format(new Date(selectedCall.createdAt), 'MMMM d h:mma')}
                  </h2>
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  Phone call with <span className="font-medium">{selectedCall.agentName || 'AI Assistant'}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {getStatusBadge(selectedCall.status)}
              </div>
            </div>
            
            {/* Audio player */}
            {selectedCall.recordingUrl && (
              <AudioPlayer audioUrl={selectedCall.recordingUrl} />
            )}
            
            {/* Conversation messages in a scrollable container */}
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-4">
                {selectedCall.status === 'ended' && selectedCall.endedReason && selectedCall.endedReason.includes('error') && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-md flex items-center text-red-700 text-sm my-2">
                    <AlertTriangle className="h-4 w-4 mr-2 flex-shrink-0" />
                    <p>This call failed: {formatEndedReason(selectedCall.endedReason)}</p>
                  </div>
                )}
                
                {selectedCall.messages && selectedCall.messages.length > 0 ? (
                  selectedCall.messages.map((message, index) => {
                    // Skip system messages unless they are error messages
                    if (message.role === 'system' && !message.content.includes('failed') && !message.content.includes('error')) {
                      return null;
                    }
                    
                    // Determine if this is an AI/agent message or a customer/user message
                    const isAIMessage = message.role === 'ai' || message.role === 'agent';
                    const isCustomerMessage = message.role === 'customer' || message.role === 'user';
                    
                    return (
                      <div 
                        key={index} 
                        className={`flex ${isAIMessage ? 'justify-end' : isCustomerMessage ? 'justify-start' : 'justify-center'}`}
                      >
                        <div 
                          className={`max-w-[70%] p-3 rounded-lg ${
                            isAIMessage
                              ? 'bg-primary text-primary-foreground' 
                              : isCustomerMessage
                                ? 'bg-gray-100 text-gray-800'
                                : 'bg-red-50 text-red-700 border border-red-200'
                          }`}
                        >
                          <div className="text-sm">{message.content}</div>
                          <div className="text-xs mt-1 opacity-70 text-right">
                            {message.timestamp && format(new Date(message.timestamp), 'h:mm a')}
                            {isAIMessage && (
                              <span className="ml-1 text-xs">Sent by {selectedCall.agentName || 'AI'}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center p-6 text-gray-500">
                    {selectedCall.endedReason && selectedCall.endedReason.includes('error') 
                      ? `No transcript available. Call failed: ${formatEndedReason(selectedCall.endedReason)}`
                      : "No transcript available for this call"
                    }
                  </div>
                )}
              </div>
            </ScrollArea>
            
            {/* Message input */}
            <div className="p-4 border-t">
              <form onSubmit={handleSendMessage} className="flex items-center">
                <Input 
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder={`Send text to ${selectedCall.customer?.number || 'customer'}`}
                  className="flex-1 mr-2"
                />
                <button 
                  type="submit" 
                  disabled={!newMessage.trim()}
                  className="p-2 bg-primary text-primary-foreground rounded-full disabled:opacity-50"
                >
                  <MessageSquare className="h-5 w-5" />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-500">
              <Phone className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>Select a call to view the conversation</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Calls;
