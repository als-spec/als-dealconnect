import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import PMLCard from "../components/directory/PMLCard";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, DollarSign } from "lucide-react";

const LOAN_TYPES = ["All Types","Bridge","Fix & Flip","DSCR","Ground-Up Construction","Short-Term Rental","Multi-Family","Mixed-Use","Cash-Out Refi"];
const US_STATES = ["All States","Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut","Delaware","Florida","Georgia","Hawaii","Idaho","Illinois","Indiana","Iowa","Kansas","Kentucky","Louisiana","Maine","Maryland","Massachusetts","Michigan","Minnesota","Mississippi","Missouri","Montana","Nebraska","Nevada","New Hampshire","New Jersey","New Mexico","New York","North Carolina","North Dakota","Ohio","Oklahoma","Oregon","Pennsylvania","Rhode Island","South Carolina","South Dakota","Tennessee","Texas","Utah","Vermont","Virginia","Washington","West Virginia","Wisconsin","Wyoming"];
const LTV_OPTIONS = [
  { label: "Any LTV", value: "any" },
  { label: "65%+", value: "65" },
  { label: "70%+", value: "70" },
  { label: "75%+", value: "75" },
  { label: "80%+", value: "80" },
];

export default function PMLDirectory() {
  const [search, setSearch] = useState("");
  const [loanType, setLoanType] = useState("All Types");
  const [state, setState] = useState("All States");
  const [minLtv, setMinLtv] = useState("any");

  // Published PML profiles.
  const { data: profiles = [], isLoading: loadingProfiles } = useQuery({
    queryKey: ['PMLProfile', { is_published: true }],
    queryFn: () => base44.entities.PMLProfile.filter({ is_published: true }),
  });

  // PML-role users — only fetch if there are profiles to enrich.
  const { data: users = [] } = useQuery({
    queryKey: ['User', { role: 'pml' }],
    queryFn: () => base44.entities.User.filter({ role: "pml" }),
    enabled: profiles.length > 0,
  });

  // Derive userMap from the users query — no extra state, no extra effect.
  const userMap = useMemo(() => {
    const map = {};
    users.forEach((u) => { map[u.id] = u; });
    return map;
  }, [users]);

  const loading = loadingProfiles;

  const parseLtv = (ltvStr) => {
    if (!ltvStr) return 0;
    return parseFloat(ltvStr.replace(/[^0-9.]/g, "")) || 0;
  };

  const filtered = profiles.filter((p) => {
    const user = userMap[p.user_id];
    const name = user?.full_name?.toLowerCase() || "";
    const company = (p.company_name || user?.company_name || "").toLowerCase();
    const matchesSearch = !search || name.includes(search.toLowerCase()) || company.includes(search.toLowerCase());
    const matchesLoanType = loanType === "All Types" || p.loan_types?.includes(loanType);
    const matchesState = state === "All States" || p.state === state || p.geographic_markets?.some((m) => m.toLowerCase().includes(state.toLowerCase()));
    const matchesLtv = minLtv === "any" || parseLtv(p.max_ltv) >= parseInt(minLtv);
    return matchesSearch && matchesLoanType && matchesState && matchesLtv;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-navy">PML Directory</h1>
        <p className="text-muted-foreground mt-1">Browse and connect with verified Private Money Lenders</p>
      </div>

      <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search by name or company..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-background" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Select value={loanType} onValueChange={setLoanType}>
            <SelectTrigger className="bg-background text-sm"><SelectValue placeholder="Loan Type" /></SelectTrigger>
            <SelectContent>{LOAN_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={state} onValueChange={setState}>
            <SelectTrigger className="bg-background text-sm"><SelectValue placeholder="Market / State" /></SelectTrigger>
            <SelectContent>{US_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={minLtv} onValueChange={setMinLtv}>
            <SelectTrigger className="bg-background text-sm"><SelectValue placeholder="Min LTV" /></SelectTrigger>
            <SelectContent>{LTV_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        {loading ? "Loading..." : `${filtered.length} Private Money Lender${filtered.length !== 1 ? "s" : ""} found`}
      </p>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {Array(6).fill(0).map((_, i) => (
            <div key={i} className="bg-card rounded-2xl border border-border p-5 animate-pulse">
              <div className="flex gap-3 mb-4">
                <div className="w-14 h-14 rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              </div>
              <div className="space-y-2"><div className="h-3 bg-muted rounded" /><div className="h-3 bg-muted rounded w-2/3" /></div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border py-20 text-center">
          <DollarSign className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-lg font-bold text-navy">No lenders found</p>
          <p className="text-sm text-muted-foreground mt-1">Try adjusting your filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filtered.map((p) => <PMLCard key={p.id} profile={p} user={userMap[p.user_id]} />)}
        </div>
      )}
    </div>
  );
}