
import React from "react";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  Phone, 
  Users, 
  Settings, 
  LogOut,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

interface SidebarProps {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ collapsed, setCollapsed }) => {
  const location = useLocation();
  const { signOut } = useAuth();
  
  const menuItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/" },
    { icon: Phone, label: "Calls", path: "/calls" },
    { icon: Users, label: "Agents", path: "/agents" },
    { icon: Settings, label: "Settings", path: "/settings" }
  ];

  return (
    <aside 
      className={cn(
        "bg-[hsl(var(--dashboard-sidebar))] text-white transition-all",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <div className="flex flex-col h-full">
        {/* Logo area */}
        <div className="p-4 flex items-center justify-between">
          {!collapsed && (
            <div className="font-bold text-xl">VAPI Dashboard</div>
          )}
          <button 
            onClick={() => setCollapsed(!collapsed)}
            className="p-1 rounded-full hover:bg-white/10 transition-colors"
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 mt-6">
          <ul className="px-2 space-y-1">
            {menuItems.map((item, index) => {
              const isActive = location.pathname === item.path;
              return (
                <li key={index}>
                  <Link
                    to={item.path}
                    className={cn(
                      "flex items-center px-4 py-3 text-sm rounded-lg transition-colors",
                      isActive 
                        ? "bg-[hsl(var(--dashboard-purple))] text-white" 
                        : "hover:bg-white/10"
                    )}
                  >
                    <item.icon size={20} />
                    {!collapsed && (
                      <span className="ml-3">{item.label}</span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer/logout */}
        <div className="p-4 mt-auto">
          <button
            onClick={() => signOut()}
            className="flex items-center w-full px-4 py-3 text-sm rounded-lg hover:bg-white/10 transition-colors"
          >
            <LogOut size={20} />
            {!collapsed && <span className="ml-3">Log Out</span>}
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
