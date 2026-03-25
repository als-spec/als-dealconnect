import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./layout/Sidebar";
import TopBar from "./layout/TopBar";
import { cn } from "@/lib/utils";

export default function Layout({ user }) {
  const [collapsed, setCollapsed] = useState(false);
  const userRole = user?.role || "pending";

  return (
    <div className="min-h-screen bg-background">
      <Sidebar
        userRole={userRole}
        userId={user?.id}
        collapsed={collapsed}
        onToggle={() => setCollapsed(!collapsed)}
      />
      <div className={cn(
        "transition-all duration-300",
        collapsed ? "ml-[68px]" : "ml-[260px]"
      )}>
        <TopBar user={user} />
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}