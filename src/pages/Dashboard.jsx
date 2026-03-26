import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import TCDashboard from "./dashboard/TCDashboard";
import InvestorDashboard from "./dashboard/InvestorDashboard";
import PMLDashboard from "./dashboard/PMLDashboard";
import AdminDashboard from "./dashboard/AdminDashboard";

export default function Dashboard() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  if (!user) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-4 border-muted border-t-teal rounded-full animate-spin" />
      </div>
    );
  }

  if (user.role === "tc") return <TCDashboard user={user} />;
  if (user.role === "investor") return <InvestorDashboard user={user} />;
  if (user.role === "pml") return <PMLDashboard user={user} />;
  if (user.role === "admin") return <AdminDashboard user={user} />;

  return (
    <div className="flex items-center justify-center py-24 text-muted-foreground">
      Your account is pending approval.
    </div>
  );
}