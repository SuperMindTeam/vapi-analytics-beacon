import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getCalls } from '@/services/vapiService';
import { format } from 'date-fns';
import { Phone, Clock, User, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

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
}

const Calls: React.FC = () => {
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCalls = async () => {
      try {
        setLoading(true);
        const callsData = await getCalls();
        if (Array.isArray(callsData)) {
          setCalls(callsData);
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

  const formatDuration = (seconds?: number): string => {
    if (!seconds) return 'N/A';
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatPhoneNumber = (number?: string): string => {
    return number || 'Unknown';
  };

  const getStatusColor = (status: string): string => {
    switch (status.toLowerCase()) {
      case 'completed': return 'bg-green-500';
      case 'in-progress': return 'bg-blue-500';
      case 'failed': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Call History</h1>
      
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md flex items-center text-red-700">
          <AlertCircle className="h-5 w-5 mr-2" />
          <p>{error}</p>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, index) => (
            <Card key={index} className="overflow-hidden">
              <CardHeader className="pb-3">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {calls.length > 0 ? (
            calls.map((call) => (
              <Card key={call.id} className="overflow-hidden">
                <div className={`h-1 ${getStatusColor(call.status)}`}></div>
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-lg">
                      Call {call.id.substring(0, 8)}...
                    </CardTitle>
                    <Badge variant={call.status.toLowerCase() === 'completed' ? 'default' : call.status.toLowerCase() === 'in-progress' ? 'secondary' : 'destructive'}>
                      {call.status}
                    </Badge>
                  </div>
                  <CardDescription>
                    {format(new Date(call.createdAt), 'MMM d, yyyy h:mm a')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center">
                      <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span className="text-muted-foreground">Number:</span>
                      <span className="ml-2">{formatPhoneNumber(call.customer?.number)}</span>
                    </div>
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span className="text-muted-foreground">Duration:</span>
                      <span className="ml-2">{formatDuration(call.duration)}</span>
                    </div>
                    <div className="flex items-center">
                      <User className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span className="text-muted-foreground">Agent ID:</span>
                      <span className="ml-2 truncate" title={call.assistantId}>
                        {call.assistantId ? call.assistantId.substring(0, 8) + '...' : 'N/A'}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="col-span-full text-center p-12">
              <p className="text-xl font-medium">No calls found</p>
              <p className="text-muted-foreground mt-1">Your call history will appear here</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Calls;
