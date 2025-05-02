
import React from "react";
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

// Sample data - would be replaced by actual data from the API
const sampleCallsData = [
  { day: "Mon", calls: 12 },
  { day: "Tue", calls: 19 },
  { day: "Wed", calls: 15 },
  { day: "Thu", calls: 22 },
  { day: "Fri", calls: 30 },
  { day: "Sat", calls: 18 },
  { day: "Sun", calls: 14 },
];

const CallsOverview: React.FC = () => {
  // This would be fetched from the API in a real implementation
  const callStats = {
    totalCalls: 130,
    completedCalls: 115,
    avgDuration: 182, // in seconds
    callsChange: 12, // percentage increase from previous period
  };
  
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Calls Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Calls</CardDescription>
            <CardTitle className="text-3xl font-bold">
              {formatNumber(callStats.totalCalls)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm flex items-center">
              <span className={callStats.callsChange >= 0 ? "stat-trend-up" : "stat-trend-down"}>
                {callStats.callsChange >= 0 ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
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
              {formatNumber(callStats.completedCalls)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              {Math.round((callStats.completedCalls / callStats.totalCalls) * 100)}% completion rate
            </div>
          </CardContent>
        </Card>
        
        {/* Average Duration Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Average Duration</CardDescription>
            <CardTitle className="text-3xl font-bold">
              {formatDuration(callStats.avgDuration)}
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
                {sampleCallsData.reduce((sum, day) => sum + day.calls, 0)} total
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={sampleCallsData}
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
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CallsOverview;
