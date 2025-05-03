
import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { getCalls } from '@/services/vapiService';
import { format } from 'date-fns';
import { Phone, Clock, User, MessageSquare, Check, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from '@/components/ui/input';

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
  // Additional fields for conversation
  messages?: {
    role: string;
    content: string;
    timestamp: string;
  }[];
  // Preview message for the list view
  previewMessage?: string;
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
          // Add mock messages for demo purposes
          const enhancedCalls = callsData.map(call => ({
            ...call,
            messages: generateMockMessages(),
            previewMessage: generatePreviewMessage()
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

  // Helper functions to generate mock data
  const generateMockMessages = () => {
    const mockMessages = [
      {
        role: 'customer',
        content: 'Hi, I need to cancel my reservation.',
        timestamp: new Date(Date.now() - 3600000).toISOString()
      },
      {
        role: 'ai',
        content: 'No problem! Just so you know, you may cancel before 2 hours of the reservation with no charge. After that, canceling may trigger a fee of 20 dollars per guest. What\'s the name for the reservation?',
        timestamp: new Date(Date.now() - 3500000).toISOString()
      },
      {
        role: 'customer',
        content: 'Aaron, aaron Last name is Judd, j u d d.',
        timestamp: new Date(Date.now() - 3400000).toISOString()
      },
      {
        role: 'ai',
        content: "I'll cancel your reservation, so you're all set. Is there anything else I can help you with?",
        timestamp: new Date(Date.now() - 3300000).toISOString()
      },
      {
        role: 'customer',
        content: "That's all.",
        timestamp: new Date(Date.now() - 3200000).toISOString()
      }
    ];
    return mockMessages;
  };

  const generatePreviewMessage = () => {
    const previewMessages = [
      "Hi, I need to cancel my reservation.",
      "Yeah, I was wondering if I could...",
      "No messages exist",
      "Hi. Can I please speak to someone...",
      "Okay.",
      "Yeah. I'd like to get a reservation...",
      "Reservation.",
      "I wanted to change a reservation..."
    ];
    return previewMessages[Math.floor(Math.random() * previewMessages.length)];
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
              <TabsTrigger value="all" className="text-sm">
                All
                {calls.length > 0 && (
                  <span className="ml-1 bg-gray-200 text-gray-700 rounded-full px-2 py-0.5 text-xs">
                    {calls.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="unresolved" className="text-sm">
                Unresolved
                {calls.filter(c => c.status.toLowerCase() === 'in-progress').length > 0 && (
                  <span className="ml-1 bg-gray-200 text-gray-700 rounded-full px-2 py-0.5 text-xs">
                    {calls.filter(c => c.status.toLowerCase() === 'in-progress').length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="resolved" className="text-sm">
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
                  Phone call with <span className="font-medium">AI</span>
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
                        <span className="ml-1 text-xs">Sent by AI</span>
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
