import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import GradientButton from "../GradientButton";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

const LOAN_TYPES = ["Bridge","Fix & Flip","DSCR","Ground-Up Construction","Short-Term Rental","Multi-Family","Mixed-Use","Cash-Out Refi","New Construction","Land","Creative Finance","Sub-To","Wraps","Seller Finance","Cash"];
const PROPERTY_TYPES = ["SFR","Multi-Family 2–4","Multi-Family 5+","Commercial","Mixed-Use","Land (case by case)"];
const US_STATES = ["Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut","Delaware","Florida","Georgia","Hawaii","Idaho","Illinois","Indiana","Iowa","Kansas","Kentucky","Louisiana","Maine","Maryland","Massachusetts","Michigan","Minnesota","Mississippi","Missouri","Montana","Nebraska","Nevada","New Hampshire","New Jersey","New Mexico","New York","North Carolina","North Dakota","Ohio","Oklahoma","Oregon","Pennsylvania","Rhode Island","South Carolina","South Dakota","Tennessee","Texas","Utah","Vermont","Virginia","Washington","West Virginia","Wisconsin","Wyoming"];

export default function PMLProfileEditForm({ profile, onSave, onCancel, saving }) {
  const [form, setForm] = useState({
    title: profile?.title || "",
    bio: profile?.bio || "",
    company_name: profile?.company_name || "",
    state: profile?.state || "",
    tier: profile?.tier || "preferred",
    loan_min: profile?.loan_min || "",
    loan_max: profile?.loan_max || "",
    max_ltv: profile?.max_ltv || "",
    max_arv: profile?.max_arv || "",
    rate_min: profile?.rate_min || "",
    rate_max: profile?.rate_max || "",
    points_min: profile?.points_min || "",
    points_max: profile?.points_max || "",
    term_min: profile?.term_min || "",
    term_max: profile?.term_max || "",
    min_credit_score: profile?.min_credit_score || "",
    prepayment_penalty: profile?.prepayment_penalty ?? false,
    loan_types: profile?.loan_types || [],
    property_types: profile?.property_types || [],
    geographic_markets: profile?.geographic_markets || [],
    is_published: profile?.is_published ?? true,
    is_active: profile?.is_active ?? true,
  });
  const [marketInput, setMarketInput] = useState("");

  const u = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const toggle = (arr, key, val) => u(key, arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val]);

  const addMarket = () => {
    if (marketInput.trim()) {
      u("geographic_markets", [...form.geographic_markets, marketInput.trim()]);
      setMarketInput("");
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="font-semibold text-navy">Title / Role</Label>
          <Input placeholder="e.g. Senior Loan Officer" value={form.title} onChange={(e) => u("title", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label className="font-semibold text-navy">Company Name</Label>
          <Input placeholder="Lending firm or fund name" value={form.company_name} onChange={(e) => u("company_name", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label className="font-semibold text-navy">Primary State</Label>
          <Select value={form.state} onValueChange={(v) => u("state", v)}>
            <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
            <SelectContent>{US_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="font-semibold text-navy">Tier</Label>
          <Select value={form.tier} onValueChange={(v) => u("tier", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="preferred">Preferred</SelectItem>
              <SelectItem value="gold">Gold</SelectItem>
              <SelectItem value="platinum">Platinum</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="font-semibold text-navy">About / Description</Label>
        <Textarea rows={3} placeholder="Describe your lending program..." value={form.bio} onChange={(e) => u("bio", e.target.value)} />
      </div>

      <div>
        <Label className="font-semibold text-navy block mb-3">Lending Criteria</Label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { k: "loan_min", label: "Loan Min" },{ k: "loan_max", label: "Loan Max" },
            { k: "max_ltv", label: "Max LTV" },{ k: "max_arv", label: "Max ARV" },
            { k: "rate_min", label: "Rate Min" },{ k: "rate_max", label: "Rate Max" },
            { k: "points_min", label: "Points Min" },{ k: "points_max", label: "Points Max" },
            { k: "term_min", label: "Term Min" },{ k: "term_max", label: "Term Max" },
            { k: "min_credit_score", label: "Min Credit Score" },
          ].map((f) => (
            <div key={f.k} className="space-y-1">
              <Label className="text-xs text-muted-foreground">{f.label}</Label>
              <Input placeholder="e.g. $100K" value={form[f.k]} onChange={(e) => u(f.k, e.target.value)} className="text-sm" />
            </div>
          ))}
          <div className="space-y-1 flex flex-col justify-end">
            <Label className="text-xs text-muted-foreground">Pre-Payment Penalty</Label>
            <div className="flex items-center gap-2 h-10">
              <Switch checked={form.prepayment_penalty} onCheckedChange={(v) => u("prepayment_penalty", v)} />
              <span className="text-sm text-muted-foreground">{form.prepayment_penalty ? "Yes" : "No"}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <Label className="font-semibold text-navy">Loan Types</Label>
        <div className="flex flex-wrap gap-2">
          {LOAN_TYPES.map((t) => (
            <button key={t} type="button" onClick={() => toggle(form.loan_types, "loan_types", t)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-all ${form.loan_types.includes(t) ? "gradient-primary text-white border-transparent" : "bg-muted text-muted-foreground border-border hover:border-teal/40"}`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <Label className="font-semibold text-navy">Property Types</Label>
        <div className="flex flex-wrap gap-2">
          {PROPERTY_TYPES.map((t) => (
            <button key={t} type="button" onClick={() => toggle(form.property_types, "property_types", t)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-all ${form.property_types.includes(t) ? "gradient-primary text-white border-transparent" : "bg-muted text-muted-foreground border-border hover:border-teal/40"}`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <Label className="font-semibold text-navy">Geographic Markets</Label>
        <div className="flex gap-2">
          <Input placeholder="e.g. Southeast US or Florida" value={marketInput} onChange={(e) => setMarketInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addMarket()} />
          <Button type="button" variant="outline" onClick={addMarket}><Plus className="w-4 h-4" /></Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {form.geographic_markets.map((m, i) => (
            <span key={i} className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-teal/10 text-teal border border-teal/20">
              {m}
              <button onClick={() => u("geographic_markets", form.geographic_markets.filter((_, idx) => idx !== i))} className="hover:opacity-70 text-base leading-none">×</button>
            </span>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Switch checked={form.is_active} onCheckedChange={(v) => u("is_active", v)} />
          <Label className="text-sm font-medium">Active Lender Status</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={form.is_published} onCheckedChange={(v) => u("is_published", v)} />
          <Label className="text-sm font-medium">Published in Directory</Label>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <GradientButton onClick={() => onSave(form)} disabled={saving}>{saving ? "Saving..." : "Save Profile"}</GradientButton>
      </div>
    </div>
  );
}