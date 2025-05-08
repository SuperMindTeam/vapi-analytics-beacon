
import React, { useEffect, useState } from "react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from "recharts";
import { formatNumber, formatDuration } from "@/utils/formatters";
import { ArrowUp, ArrowDown, Phone } from "lucide-react";
import { getCalls, getCallStatistics } from "@/services/vapiService";
import { format, subDays } from "date-fns";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface CallStats {
  totalCalls: number;
  completedCalls: number;
  timeSaved: number;
  callsChange: number;
  timePeriod?: {
    start: Date | null;
    end: Date | null;
  };
}

interface CallChartData {
  day: string;
  calls: number;
  date: Date;
}

type TimePeriod = 'today' | '7days' | '30days';

const CallsOverview: React.FC = () => {
  const [callStats, setCallStats] = useState<CallStats>({
    totalCalls: 0,
    completedCalls: 0,
    timeSaved: 0,
    callsChange: 0,
    timePeriod: {
      start: null,
      end: null
    }
  });
  const [callsData, setCallsData] = useState<CallChartData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('7days');

  useEffect(() => {
    fetchData(selectedPeriod);
  }, [selectedPeriod]);

  const fetchData = async (period: TimePeriod) => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log(`Fetching calls data for period: ${period}...`);
      
      // Calculate time period based on selected filter
      const today = new Date();
      let startDate: Date;
      
      switch(period) {
        case 'today':
          startDate = new Date(today.setHours(0, 0, 0, 0));
          break;
        case '7days':
          startDate = subDays(today, 6);
          break;
        case '30days':
          startDate = subDays(today, 29);
          break;
        default:
          startDate = subDays(today, 6); // Default to 7 days
      }
      
      // Fetch calls data
      const calls = await getCalls();
      console.log("Calls data received:", calls);
      
      if (!Array.isArray(calls)) {
        console.error("Calls data is not an array:", calls);
        setError("Invalid calls data format received from API");
        setIsLoading(false);
        return;
      }
      
      // Filter calls based on selected period
      const filteredCalls = calls.filter(call => {
        if (!call || !call.createdAt) return false;
        const callDate = new Date(call.createdAt);
        return callDate >= startDate && callDate <= today;
      });
      
      console.log(`Filtered ${filteredCalls.length} calls for the selected period`);
      
      // Process calls data for chart
      processCallsData(filteredCalls, period);
      
      // Calculate stats from filtered calls
      const completedCalls = filteredCalls.filter(call => call.status === 'completed').length;
      
      // Calculate total duration for time saved (in seconds)
      let totalDuration = 0;
      filteredCalls.forEach(call => {
        if (call.duration) {
          totalDuration += call.duration;
        }
      });
      
      // If no duration data, estimate 3 minutes (180 seconds) per completed call
      if (totalDuration === 0) {
        totalDuration = completedCalls * 180;
      }
      
      // Calculate calls change percentage compared to previous period
      const callsChange = calculateCallsChange(calls, startDate, today);
      
      setCallStats({
        totalCalls: filteredCalls.length,
        completedCalls: completedCalls,
        timeSaved: Math.floor(totalDuration / 60), // Convert seconds to minutes
        callsChange: callsChange,
        timePeriod: {
          start: startDate,
          end: today
        }
      });
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      setError("Unable to fetch call data. Please check API configuration.");
    } finally {
      setIsLoading(false);
    }
  };

  const processCallsData = (calls: any[], period: TimePeriod) => {
    if (!Array.isArray(calls)) {
      console.error("Cannot process calls data: not an array");
      return;
    }
    
    let daysToShow: number;
    switch(period) {
      case 'today':
        daysToShow = 1;
        break;
      case '7days':
        daysToShow = 7;
        break;
      case '30days':
        daysToShow = 30;
        break;
      default:
        daysToShow = 7;
    }
    
    // Create a map to group calls by day
    const days = Array.from({ length: daysToShow }, (_, i) => {
      const date = subDays(new Date(), daysToShow - 1 - i);
      return {
        day: format(date, period === 'today' ? 'HH:00' : 'EEE'),
        date: date,
        calls: 0
      };
    });

    // Count calls per day
    calls.forEach(call => {
      if (call && call.createdAt) {
        const callDate = new Date(call.createdAt);
        const dayIndex = days.findIndex(day => 
          period === 'today' 
            ? format(day.date, 'HH') === format(callDate, 'HH')
            : format(day.date, 'yyyy-MM-dd') === format(callDate, 'yyyy-MM-dd')
        );
        
        if (dayIndex >= 0) {
          days[dayIndex].calls += 1;
        }
      }
    });

    setCallsData(days);
  };

  const calculateCallsChange = (calls: any[], startDate: Date, endDate: Date): number => {
    // Calculate percentage change compared to previous period of the same length
    const periodLength = endDate.getTime() - startDate.getTime();
    const previousStartDate = new Date(startDate.getTime() - periodLength);
    
    const currentPeriodCalls = calls.filter(call => {
      if (!call.createdAt) return false;
      const callDate = new Date(call.createdAt);
      return callDate >= startDate && callDate <= endDate;
    }).length;
    
    const previousPeriodCalls = calls.filter(call => {
      if (!call.createdAt) return false;
      const callDate = new Date(call.createdAt);
      return callDate >= previousStartDate && callDate < startDate;
    }).length;
    
    if (previousPeriodCalls === 0) return currentPeriodCalls > 0 ? 100 : 0;
    return Math.round(((currentPeriodCalls - previousPeriodCalls) / previousPeriodCalls) * 100);
  };
  
  return (
    <div className="space-y-6">
      {/* Time Period Selection */}
      <div className="flex justify-end gap-2">
        <div className="flex gap-2">
          <Button 
            variant={selectedPeriod === 'today' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setSelectedPeriod('today')}
          >
            Today
          </Button>
          <Button 
            variant={selectedPeriod === '7days' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setSelectedPeriod('7days')}
          >
            Past 7 Days
          </Button>
          <Button 
            variant={selectedPeriod === '30days' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setSelectedPeriod('30days')}
          >
            Past 30 Days
          </Button>
        </div>
      </div>
      
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Total Calls Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Calls</CardDescription>
            <CardTitle className="text-3xl font-bold">
              {isLoading ? "Loading..." : formatNumber(callStats.totalCalls)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm flex items-center">
              <span className={callStats.callsChange >= 0 ? "text-green-500 flex items-center" : "text-red-500 flex items-center"}>
                {callStats.callsChange >= 0 ? <ArrowUp size={16} className="mr-1" /> : <ArrowDown size={16} className="mr-1" />}
                {Math.abs(callStats.callsChange)}% from last period
              </span>
            </div>
          </CardContent>
        </Card>
        
        {/* Time Saved Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Time Saved</CardDescription>
            <CardTitle className="text-3xl font-bold">
              {isLoading ? "Loading..." : formatDuration(callStats.timeSaved * 60)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              {isLoading ? "Calculating..." : `Based on ${callStats.completedCalls} completed calls`}
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Calls Chart */}
      <Card className="col-span-full">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Call Volume</CardTitle>
              <CardDescription>
                {selectedPeriod === 'today' ? 'Today\'s' : selectedPeriod === '7days' ? 'Last 7 days' : 'Last 30 days'} call activity
              </CardDescription>
            </div>
            <div className="flex items-center text-muted-foreground">
              <Phone size={18} className="mr-1" />
              <span className="text-sm font-medium">
                {isLoading ? "Loading..." : callsData.reduce((sum, day) => sum + day.calls, 0)} total
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <p>Loading chart data...</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={callsData}
                  margin={{
                    top: 10,
                    right: 30,
                    left: 0,
                    bottom: 0,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="day" stroke="#888" fontSize={12} />
                  <YAxis stroke="#888" fontSize={12} />
                  <Tooltip />
                  <Area 
                    type="monotone" 
                    dataKey="calls" 
                    stroke="hsl(var(--dashboard-purple))" 
                    fill="hsl(var(--dashboard-purple)/0.2)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CallsOverview;
