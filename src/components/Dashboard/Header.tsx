
import React from "react";
import { Bell, Search, User, LogOut } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

const Header: React.FC = () => {
  const { signOut, user } = useAuth();
  
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-3">
      <div className="flex items-center justify-between">
        {/* Left side - Title */}
        <div>
          <h1 className="text-xl font-semibold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Welcome back to your VAPI dashboard
            {user?.email && <>, {user.email}</>}
          </p>
        </div>

        {/* Right side - Search and actions */}
        <div className="flex items-center space-x-4">
          <div className="relative hidden md:block">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search..."
              className="w-64 pl-8 bg-gray-50"
            />
          </div>
          
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            <span className="absolute top-1 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
          </Button>
          
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => signOut()} 
            title="Sign out"
          >
            <LogOut className="h-5 w-5" />
          </Button>
          
          <div className="flex items-center">
            <div className="h-8 w-8 rounded-full bg-[hsl(var(--dashboard-purple))] flex items-center justify-center text-white">
              <User size={16} />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
