import { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Search, Users, Pencil, ChevronLeft, ChevronRight } from "lucide-react";
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

// Pagination tuning.
// FETCH_CAP is a server-side hard ceiling — at 500+ members we'd need true
// server-side pagination (offset/cursor), which Base44's SDK in this
// codebase doesn't yet expose. Acceptable for beta; revisit when member
// count approaches the cap (admin will see a banner near the limit).
const FETCH_CAP = 500;
const PAGE_SIZE = 25;

/**
 * Build the array of page numbers to show in the pagination UI, with
 * ellipses ('...') for skipped ranges. Keeps the bar compact at any scale.
 *
 * Examples:
 *   compute(3, 5)   -> [1, 2, 3, 4, 5]
 *   compute(1, 20)  -> [1, 2, 3, '...', 20]
 *   compute(10, 20) -> [1, '...', 9, 10, 11, '...', 20]
 *   compute(20, 20) -> [1, '...', 18, 19, 20]
 */
function computePageNumbers(currentPage, totalPages) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const pages = new Set([1, totalPages, currentPage, currentPage - 1, currentPage + 1]);
  const sorted = Array.from(pages)
    .filter((n) => n >= 1 && n <= totalPages)
    .sort((a, b) => a - b);
  const result = [];
  for (let i = 0; i < sorted.length; i++) {
    result.push(sorted[i]);
    if (i < sorted.length - 1 && sorted[i + 1] - sorted[i] > 1) {
      result.push("...");
    }
  }
  return result;
}

export default function Members() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [selectedMember, setSelectedMember] = useState(null);
  const [editData, setEditData] = useState({});
  const [saving, setSaving] = useState(false);

  // Admin member-management. Fetch capped at FETCH_CAP (500) — at that
  // scale we'd need true server-side pagination, which Base44's SDK in
  // this codebase doesn't yet expose. Flagged with a banner near the cap.
  const { data: members = [], isLoading: loading } = useQuery({
    queryKey: ['User', 'list', { sort: '-created_date', limit: FETCH_CAP }],
    queryFn: () => base44.entities.User.list("-created_date", FETCH_CAP),
  });

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
    queryClient.invalidateQueries({ queryKey: ['User'] });
  };

  const filtered = useMemo(() => {
    return members.filter((m) => {
      const matchesSearch =
        !search ||
        m.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        m.email?.toLowerCase().includes(search.toLowerCase()) ||
        m.company_name?.toLowerCase().includes(search.toLowerCase());
      const matchesRole = roleFilter === "all" || m.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [members, search, roleFilter]);

  // Pagination: reset to page 1 when search or role filter changes so
  // admins don't land on a page that no longer exists in the new filter.
  useEffect(() => {
    setPage(1);
  }, [search, roleFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages); // clamp in case filter shrinks
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const pageEnd = pageStart + PAGE_SIZE;
  const pageMembers = filtered.slice(pageStart, pageEnd);
  const pageNumbers = computePageNumbers(currentPage, totalPages);
  const nearCap = members.length >= FETCH_CAP - 20; // show banner near the cap

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

      {nearCap && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm">
          <p className="font-semibold text-amber-900">Approaching member cap</p>
          <p className="text-amber-800 mt-0.5">
            Showing the {FETCH_CAP} most recent members. The full member table will be
            available after a server-side pagination upgrade.
          </p>
        </div>
      )}

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
              {pageMembers.map((m) => (
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

        {/* Pagination footer. Only render when there's more than one page
            of filtered results — a single page of <25 members doesn't
            need the nav clutter. */}
        {filtered.length > PAGE_SIZE && (
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 px-5 py-3 border-t border-border bg-muted/20">
            <p className="text-xs text-muted-foreground">
              Showing <span className="font-semibold text-navy">{pageStart + 1}</span>–
              <span className="font-semibold text-navy">{Math.min(pageEnd, filtered.length)}</span>
              {" "}of <span className="font-semibold text-navy">{filtered.length}</span>
              {filtered.length !== members.length && (
                <span className="text-muted-foreground/70"> (filtered from {members.length})</span>
              )}
            </p>
            <nav aria-label="Pagination" className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="h-8 gap-1 px-2"
                aria-label="Previous page"
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Prev</span>
              </Button>
              {pageNumbers.map((n, i) =>
                n === "..." ? (
                  <span
                    key={`ellipsis-${i}`}
                    className="px-2 text-xs text-muted-foreground"
                    aria-hidden="true"
                  >
                    …
                  </span>
                ) : (
                  <button
                    key={n}
                    onClick={() => setPage(n)}
                    aria-current={n === currentPage ? "page" : undefined}
                    aria-label={`Page ${n}`}
                    className={cn(
                      "h-8 min-w-8 px-2.5 rounded-md text-xs font-semibold transition-colors",
                      n === currentPage
                        ? "gradient-primary text-white"
                        : "bg-card border border-border text-foreground hover:border-teal/40"
                    )}
                  >
                    {n}
                  </button>
                )
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="h-8 gap-1 px-2"
                aria-label="Next page"
              >
                <span className="hidden sm:inline">Next</span>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </nav>
          </div>
        )}
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