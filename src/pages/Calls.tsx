import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { getCalls } from '@/services/vapiService';
import { format } from 'date-fns';
import { Phone, Clock, User, MessageSquare, Check, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from '@/components/ui/input';

interface Message {
  role: string;
  content: string;
  timestamp: string;
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
  previewMessage?: string;
  agentName?: string; // Added agent name property
}

const Calls: React.FC = () => {
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCall, setSelectedCall] = useState<Call | null>(null);
  const [activeTab, setActiveTab] = useState<string>("all");
  const [newMessage, setNewMessage] = useState<string>("");

  useEffect(() => {
    const fetchCalls = async () => {
      try {
        setLoading(true);
        const callsData = await getCalls();
        
        if (Array.isArray(callsData)) {
          // Process calls data to include real messages and agent names
          const enhancedCalls = callsData.map(call => ({
            ...call,
            // Use real messages if they exist, otherwise provide mock messages for demo
            messages: call.messages || generateMessagesForCall(call.id),
            previewMessage: call.previewMessage || getFirstCustomerMessage(call.messages) || "No message content",
            agentName: getAgentName(call.assistantId) // Get agent name based on assistantId
          }));
          
          setCalls(enhancedCalls);
          // Select the first call by default if available
          if (enhancedCalls.length > 0) {
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
  }, []);

  // Helper function to get the first customer message as preview
  const getFirstCustomerMessage = (messages?: Message[]): string | undefined => {
    if (!messages || messages.length === 0) return undefined;
    const firstCustomerMessage = messages.find(msg => msg.role.toLowerCase() === 'customer' || msg.role.toLowerCase() === 'user');
    return firstCustomerMessage?.content;
  };

  // Helper function to get agent name - in a real app, this would fetch from your agents database
  const getAgentName = (assistantId?: string): string => {
    // This is a placeholder. In a real app, you would fetch the agent name based on the ID
    // For now, we'll use a mapping of agent IDs to names or return a default
    const agentNameMap: Record<string, string> = {
      'asst_123456': 'Restaurant Assistant',
      'asst_789012': 'Booking Agent',
      'asst_345678': 'Support Rep',
      // Add more mappings as needed
    };
    
    if (!assistantId) return 'AI Assistant';
    return agentNameMap[assistantId] || 'AI Assistant';
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

  const formatDuration = (seconds?: number): string => {
    if (!seconds) return 'N/A';
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return <Badge className="bg-green-500">Completed</Badge>;
      case 'in-progress':
        return <Badge variant="secondary">In Progress</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedCall) return;
    
    // In a real app, we would send the message to the API here
    console.log("Sending message:", newMessage);
    
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

  const getFilteredCalls = () => {
    switch (activeTab) {
      case "unresolved":
        return calls.filter(call => call.status.toLowerCase() === 'in-progress');
      case "resolved":
        return calls.filter(call => call.status.toLowerCase() === 'completed');
      case "autoresolved":
        return calls.filter(call => call.status.toLowerCase() === 'completed' && call.endedReason === 'auto_resolved');
      default:
        return calls;
    }
  };

  return (
    <div className="flex h-[calc(100vh-64px)] bg-background">
      {/* Left sidebar - Call list */}
      <div className="w-1/3 border-r overflow-y-auto p-4">
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
        
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-center text-red-700 text-sm">
            <AlertTriangle className="h-4 w-4 mr-2 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

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

      {/* Right content - Conversation */}
      <div className="flex-1 flex flex-col">
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
              <div>
                {getStatusBadge(selectedCall.status)}
              </div>
            </div>
            
            {/* Conversation messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {selectedCall.messages?.map((message, index) => (
                <div 
                  key={index} 
                  className={`flex ${message.role === 'ai' ? 'justify-start' : 'justify-end'}`}
                >
                  <div 
                    className={`max-w-[70%] p-3 rounded-lg ${
                      message.role === 'ai' 
                        ? 'bg-gray-100 text-gray-800' 
                        : 'bg-primary text-primary-foreground'
                    }`}
                  >
                    <div className="text-sm">{message.content}</div>
                    <div className="text-xs mt-1 opacity-70 text-right">
                      {format(new Date(message.timestamp), 'h:mm a')}
                      {message.role === 'ai' && (
                        <span className="ml-1 text-xs">Sent by {selectedCall.agentName || 'AI'}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
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
