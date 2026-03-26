import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const ROLE_LABELS = {
  admin: "Admin",
  tc: "Transaction Coordinator",
  investor: "Investor / Agent",
  pml: "Private Money Lender",
  pending: "Pending",
};

const ROLE_COLORS = {
  admin: "bg-purple-50 text-purple-700 border-purple-200",
  tc: "bg-blue-50 text-blue-700 border-blue-200",
  investor: "bg-emerald-50 text-emerald-700 border-emerald-200",
  pml: "bg-amber-50 text-amber-700 border-amber-200",
  pending: "bg-gray-50 text-gray-700 border-gray-200",
};

const PLAN_LABELS = {
  "price_1TFKRbBBAWoOZVYC1HY2RQ7i": "TC Basic — $15/mo",
  "price_1TFKRcBBAWoOZVYCzDIdMCVO": "Investor — $29/mo",
  "price_1TFKRcBBAWoOZVYCxOzErcSG": "PML — $29/mo",
};

export default function Members() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  useEffect(() => {
    const load = async () => {
      const users = await base44.entities.User.list("-created_date");
      setMembers(users);
      setLoading(false);
    };
    load();
  }, []);

  const filtered = members.filter((m) => {
    const matchesSearch = !search ||
      m.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      m.email?.toLowerCase().includes(search.toLowerCase()) ||
      m.company_name?.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === "all" || m.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-muted border-t-teal rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-navy">Members</h1>
        <p className="text-muted-foreground mt-1">Manage all platform members</p>
      </div>

      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or company..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-card"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {["all", "admin", "tc", "investor", "pml", "pending"].map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all",
                roleFilter === r
                  ? "gradient-primary text-white"
                  : "bg-card border border-border text-muted-foreground hover:border-teal/40"
              )}
            >
              {r === "all" ? "All" : ROLE_LABELS[r]}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-5 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Member</th>
                <th className="text-left px-5 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Role</th>
                <th className="text-left px-5 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground hidden md:table-cell">Plan</th>
                <th className="text-left px-5 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground hidden lg:table-cell">Sub Status</th>
                <th className="text-left px-5 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground hidden xl:table-cell">Next Billing</th>
                <th className="text-left px-5 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground hidden lg:table-cell">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((m) => (
                <tr key={m.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-5 py-4">
                    <div>
                      <p className="text-sm font-semibold text-navy">{m.full_name || "—"}</p>
                      <p className="text-xs text-muted-foreground">{m.email}</p>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <Badge variant="outline" className={cn("text-xs", ROLE_COLORS[m.role || "pending"])}>
                      {ROLE_LABELS[m.role || "pending"]}
                    </Badge>
                  </td>
                  <td className="px-5 py-4 hidden md:table-cell text-sm text-muted-foreground">
                    {m.stripe_price_id ? PLAN_LABELS[m.stripe_price_id] || m.stripe_price_id : "—"}
                  </td>
                  <td className="px-5 py-4 hidden lg:table-cell">
                    {m.stripe_status ? (
                      <Badge variant="outline" className={m.stripe_status === "active" ? "bg-emerald-50 text-emerald-700 border-emerald-200 text-xs" : "bg-gray-50 text-gray-600 border-gray-200 text-xs"}>
                        {m.stripe_status}
                      </Badge>
                    ) : "—"}
                  </td>
                  <td className="px-5 py-4 hidden xl:table-cell text-sm text-muted-foreground">
                    {m.stripe_next_billing ? new Date(m.stripe_next_billing).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-5 py-4 hidden lg:table-cell text-sm text-muted-foreground">
                    {m.created_date ? new Date(m.created_date).toLocaleDateString() : "—"}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center">
                    <Users className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">No members found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}