
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

interface CallStats {
  totalCalls: number;
  completedCalls: number;
  avgDuration: number;
  callsChange: number;
}

interface CallChartData {
  day: string;
  calls: number;
  date: Date;
}

const CallsOverview: React.FC = () => {
  const [callStats, setCallStats] = useState<CallStats>({
    totalCalls: 0,
    completedCalls: 0,
    avgDuration: 0,
    callsChange: 0,
  });
  const [callsData, setCallsData] = useState<CallChartData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch calls data
        const calls = await getCalls(100); // Get a larger sample to analyze
        
        // Get call statistics
        const stats = await getCallStatistics();
        
        // Process calls data for stats and chart
        processCallsData(calls);
        
        // Set statistics
        setCallStats({
          totalCalls: stats.total || calls.length,
          completedCalls: stats.completed || calls.filter(call => call.status === "completed").length,
          avgDuration: stats.average_duration || calculateAverageDuration(calls),
          callsChange: calculateCallsChange(calls),
        });
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const processCallsData = (calls: any[]) => {
    // Create a map to group calls by day
    const lastSevenDays = Array.from({ length: 7 }, (_, i) => {
      const date = subDays(new Date(), 6 - i);
      return {
        day: format(date, 'EEE'),
        date: date,
        calls: 0
      };
    });

    // Count calls per day
    calls.forEach(call => {
      const callDate = new Date(call.created_at);
      const dayIndex = lastSevenDays.findIndex(day => 
        format(day.date, 'yyyy-MM-dd') === format(callDate, 'yyyy-MM-dd')
      );
      
      if (dayIndex >= 0) {
        lastSevenDays[dayIndex].calls += 1;
      }
    });

    setCallsData(lastSevenDays);
  };

  const calculateAverageDuration = (calls: any[]): number => {
    const completedCalls = calls.filter(call => call.status === "completed" && call.duration);
    if (completedCalls.length === 0) return 0;
    
    const totalDuration = completedCalls.reduce((sum, call) => sum + (call.duration || 0), 0);
    return totalDuration / completedCalls.length;
  };

  const calculateCallsChange = (calls: any[]): number => {
    // Calculate percentage change compared to previous period
    const today = new Date();
    const last7Days = calls.filter(call => {
      const callDate = new Date(call.created_at);
      return (today.getTime() - callDate.getTime()) / (1000 * 3600 * 24) <= 7;
    }).length;
    
    const previous7Days = calls.filter(call => {
      const callDate = new Date(call.created_at);
      const dayDiff = (today.getTime() - callDate.getTime()) / (1000 * 3600 * 24);
      return dayDiff > 7 && dayDiff <= 14;
    }).length;
    
    if (previous7Days === 0) return last7Days > 0 ? 100 : 0;
    return Math.round(((last7Days - previous7Days) / previous7Days) * 100);
  };
  
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                {Math.abs(callStats.callsChange)}% from last week
              </span>
            </div>
          </CardContent>
        </Card>
        
        {/* Completed Calls Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Completed Calls</CardDescription>
            <CardTitle className="text-3xl font-bold">
              {isLoading ? "Loading..." : formatNumber(callStats.completedCalls)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              {isLoading ? "Calculating..." : `${Math.round((callStats.completedCalls / (callStats.totalCalls || 1)) * 100)}% completion rate`}
            </div>
          </CardContent>
        </Card>
        
        {/* Average Duration Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Average Duration</CardDescription>
            <CardTitle className="text-3xl font-bold">
              {isLoading ? "Loading..." : formatDuration(callStats.avgDuration)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              Per completed call
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
              <CardDescription>Last 7 days call activity</CardDescription>
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
