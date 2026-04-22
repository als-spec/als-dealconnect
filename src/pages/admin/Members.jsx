import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Search, Users, Pencil } from "lucide-react";
import GradientButton from "../../components/GradientButton";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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

const STATUS_COLORS = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  rejected: "bg-red-50 text-red-700 border-red-200",
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
  const [selectedMember, setSelectedMember] = useState(null);
  const [editData, setEditData] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    // Admin member-management needs the full user table. Pagination is tracked
    // as T3.4 — at scale this should become a paginated server-side query.
    const users = await base44.entities.User.list("-created_date");
    setMembers(users);
    setLoading(false);
  };

  const openEdit = (member) => {
    setSelectedMember(member);
    setEditData({
      role: member.role || "pending",
      member_status: member.member_status || "pending",
      selected_plan: member.selected_plan || "",
      onboarding_step: member.onboarding_step || "",
    });
  };

  const handleSave = async () => {
    setSaving(true);
    const updates = { ...editData };
    // If approving from this panel, set onboarding_step too
    if (editData.member_status === "approved" && editData.role !== "admin") {
      updates.onboarding_step = "approved";
    }
    await base44.entities.User.update(selectedMember.id, updates);
    toast.success("Member updated successfully");
    setSaving(false);
    setSelectedMember(null);
    load();
  };

  const filtered = members.filter((m) => {
    const matchesSearch =
      !search ||
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
                <th className="text-left px-5 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Status</th>
                <th className="text-left px-5 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground hidden md:table-cell">Plan</th>
                <th className="text-left px-5 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground hidden lg:table-cell">Joined</th>
                <th className="text-left px-5 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Actions</th>
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
                  <td className="px-5 py-4">
                    <Badge variant="outline" className={cn("text-xs capitalize", STATUS_COLORS[m.member_status || "pending"])}>
                      {m.member_status || "Pending"}
                    </Badge>
                  </td>
                  <td className="px-5 py-4 hidden md:table-cell text-sm text-muted-foreground">
                    {m.stripe_price_id ? PLAN_LABELS[m.stripe_price_id] || m.stripe_price_id : m.selected_plan || "—"}
                  </td>
                  <td className="px-5 py-4 hidden lg:table-cell text-sm text-muted-foreground">
                    {m.created_date ? new Date(m.created_date).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-5 py-4">
                    <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => openEdit(m)}>
                      <Pencil className="w-3.5 h-3.5" /> Edit
                    </Button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center">
                    <Users className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">No members found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Member Dialog */}
      <Dialog open={!!selectedMember} onOpenChange={() => setSelectedMember(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-navy">Edit Member</DialogTitle>
          </DialogHeader>
          {selectedMember && (
            <div className="space-y-5">
              <div className="bg-muted/30 rounded-xl p-4 text-sm space-y-1">
                <p className="font-semibold text-navy">{selectedMember.full_name}</p>
                <p className="text-muted-foreground">{selectedMember.email}</p>
                {selectedMember.company_name && <p className="text-muted-foreground">{selectedMember.company_name}</p>}
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold text-navy">Member Type / Role</Label>
                <Select value={editData.role} onValueChange={(v) => setEditData((p) => ({ ...p, role: v }))}>
                  <SelectTrigger className="bg-card">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tc">Transaction Coordinator</SelectItem>
                    <SelectItem value="investor">Investor / Agent</SelectItem>
                    <SelectItem value="pml">Private Money Lender</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold text-navy">Approval Status</Label>
                <Select value={editData.member_status} onValueChange={(v) => setEditData((p) => ({ ...p, member_status: v }))}>
                  <SelectTrigger className="bg-card">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold text-navy">Plan</Label>
                <Select value={editData.selected_plan || "__none__"} onValueChange={(v) => setEditData((p) => ({ ...p, selected_plan: v === "__none__" ? "" : v }))}>
                  <SelectTrigger className="bg-card">
                    <SelectValue placeholder="No plan assigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">No plan assigned</SelectItem>
                    <SelectItem value="TC Basic Plan">TC Basic Plan — $15/mo</SelectItem>
                    <SelectItem value="Investor Plan">Investor Plan — $29/mo</SelectItem>
                    <SelectItem value="Private Money Lender Plan">PML Plan — $29/mo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <Button variant="outline" onClick={() => setSelectedMember(null)}>Cancel</Button>
                <GradientButton onClick={handleSave} disabled={saving}>
                  {saving ? "Saving..." : "Save Changes"}
                </GradientButton>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}