import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import InvestorCard from "../components/directory/InvestorCard";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const DEAL_TYPES = ["Fix & Flip", "DSCR", "Wholesale", "Creative Finance", "Buy & Hold", "Ground-Up Construction"];
const US_STATES = ["Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut","Delaware","Florida","Georgia","Hawaii","Idaho","Illinois","Indiana","Iowa","Kansas","Kentucky","Louisiana","Maine","Maryland","Massachusetts","Michigan","Minnesota","Mississippi","Missouri","Montana","Nebraska","Nevada","New Hampshire","New Jersey","New Mexico","New York","North Carolina","North Dakota","Ohio","Oklahoma","Oregon","Pennsylvania","Rhode Island","South Carolina","South Dakota","Tennessee","Texas","Utah","Vermont","Virginia","Washington","West Virginia","Wisconsin","Wyoming"];

export default function InvestorDirectory() {
  const [profiles, setProfiles] = useState([]);
  const [userMap, setUserMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterDealType, setFilterDealType] = useState("all");
  const [filterState, setFilterState] = useState("all");

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    const all = await base44.entities.InvestorProfile.filter({ is_published: true });
    try {
      // Only fetch users with the investor role instead of the full user table.
      // This directory only ever renders investor profiles, so any other roles
      // in the lookup map are wasted bytes + a PII disclosure.
      const users = await base44.entities.User.filter({ role: "investor" });
      const map = {};
      users.forEach((u) => { map[u.id] = u; });
      setUserMap(map);
    } catch {}
    setProfiles(all);
    setLoading(false);
  };

  const filtered = profiles.filter((p) => {
    const user = userMap[p.user_id] || {};
    const name = (user.full_name || "").toLowerCase();
    const company = (p.company_name || user.company_name || "").toLowerCase();
    const q = search.toLowerCase();
    if (q && !name.includes(q) && !company.includes(q) && !(p.investment_focus || "").toLowerCase().includes(q)) return false;
    if (filterDealType !== "all" && !(p.deal_types || []).includes(filterDealType)) return false;
    if (filterState !== "all" && p.state !== filterState && !(p.target_markets || []).includes(filterState)) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-navy">Investor Directory</h1>
        <p className="text-muted-foreground text-sm mt-1">Browse approved investors and agents on the platform</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, company, or focus..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterDealType} onValueChange={setFilterDealType}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Investment Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {DEAL_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterState} onValueChange={setFilterState}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="State / Market" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Markets</SelectItem>
            {US_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Results */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-card rounded-2xl border border-border p-5 h-52 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-lg font-semibold">No investors found</p>
          <p className="text-sm mt-1">Try adjusting your filters</p>
        </div>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">{filtered.length} investor{filtered.length !== 1 ? "s" : ""} found</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((p) => (
              <InvestorCard key={p.id} profile={p} user={userMap[p.user_id]} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}