import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const PROPERTY_TYPES = ["SFR", "Multi-Family 2-4", "Multi-Family 5+", "Commercial", "Mixed-Use", "Land", "Condo/TH"];
const DEAL_TYPES = ["Fix & Flip", "DSCR", "Creative Finance", "Wholesale", "Ground-Up Construction", "Short-Term Rental", "Bridge", "Lease Option"];
const US_STATES = ["Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut","Delaware","Florida","Georgia","Hawaii","Idaho","Illinois","Indiana","Iowa","Kansas","Kentucky","Louisiana","Maine","Maryland","Massachusetts","Michigan","Minnesota","Mississippi","Missouri","Montana","Nebraska","Nevada","New Hampshire","New Jersey","New Mexico","New York","North Carolina","North Dakota","Ohio","Oklahoma","Oregon","Pennsylvania","Rhode Island","South Carolina","South Dakota","Tennessee","Texas","Utah","Vermont","Virginia","Washington","West Virginia","Wisconsin","Wyoming"];

export default function DealFilters({ filters, onChange, onClear }) {
  const hasActive = Object.values(filters).some(v => v && v !== "all");

  return (
    <div className="bg-card border border-border rounded-xl p-4 flex flex-wrap items-center gap-3">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search deals…"
          className="pl-9"
          value={filters.search || ""}
          onChange={e => onChange({ ...filters, search: e.target.value })}
        />
      </div>

      <Select value={filters.property_type || "all"} onValueChange={v => onChange({ ...filters, property_type: v })}>
        <SelectTrigger className="w-40"><SelectValue placeholder="Property type" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All property types</SelectItem>
          {PROPERTY_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
        </SelectContent>
      </Select>

      <Select value={filters.deal_type || "all"} onValueChange={v => onChange({ ...filters, deal_type: v })}>
        <SelectTrigger className="w-40"><SelectValue placeholder="Deal type" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All deal types</SelectItem>
          {DEAL_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
        </SelectContent>
      </Select>

      <Select value={filters.state || "all"} onValueChange={v => onChange({ ...filters, state: v })}>
        <SelectTrigger className="w-36"><SelectValue placeholder="State" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All states</SelectItem>
          {US_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
        </SelectContent>
      </Select>

      <Select value={filters.status || "all"} onValueChange={v => onChange({ ...filters, status: v })}>
        <SelectTrigger className="w-32"><SelectValue placeholder="Status" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          <SelectItem value="open">Open</SelectItem>
          <SelectItem value="in_review">In Review</SelectItem>
          <SelectItem value="filled">Filled</SelectItem>
        </SelectContent>
      </Select>

      {hasActive && (
        <Button variant="ghost" size="sm" onClick={onClear} className="text-muted-foreground gap-1">
          <X className="w-3 h-3" /> Clear
        </Button>
      )}
    </div>
  );
}