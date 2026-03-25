import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import GradientButton from "../GradientButton";
import { Button } from "@/components/ui/button";
import { X, Plus } from "lucide-react";

const DEAL_TYPES = ["Fix & Flip","BRRRR","Wholesale","Seller Finance","Subject-To","New Construction","Land","Multi-Family","Commercial","Short Sale","REO","Lease Option"];
const US_STATES = ["Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut","Delaware","Florida","Georgia","Hawaii","Idaho","Illinois","Indiana","Iowa","Kansas","Kentucky","Louisiana","Maine","Maryland","Massachusetts","Michigan","Minnesota","Mississippi","Missouri","Montana","Nebraska","Nevada","New Hampshire","New Jersey","New Mexico","New York","North Carolina","North Dakota","Ohio","Oklahoma","Oregon","Pennsylvania","Rhode Island","South Carolina","South Dakota","Tennessee","Texas","Utah","Vermont","Virginia","Washington","West Virginia","Wisconsin","Wyoming"];

export default function InvestorProfileEditForm({ profile, onSave, onCancel, saving }) {
  const [form, setForm] = useState({
    bio: profile?.bio || "",
    investment_focus: profile?.investment_focus || "",
    state: profile?.state || "",
    deal_types: profile?.deal_types || [],
    target_markets: profile?.target_markets || [],
    is_published: profile?.is_published ?? true,
  });
  const [marketInput, setMarketInput] = useState("");

  const update = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const toggleDealType = (t) => update("deal_types", form.deal_types.includes(t) ? form.deal_types.filter((x) => x !== t) : [...form.deal_types, t]);
  const addMarket = () => {
    if (marketInput.trim()) {
      update("target_markets", [...form.target_markets, marketInput.trim()]);
      setMarketInput("");
    }
  };
  const removeMarket = (i) => update("target_markets", form.target_markets.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="font-semibold text-navy">Investment Focus</Label>
          <Input placeholder="e.g. Distressed SFR, Creative Finance Deals" value={form.investment_focus} onChange={(e) => update("investment_focus", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label className="font-semibold text-navy">Primary State</Label>
          <Select value={form.state} onValueChange={(v) => update("state", v)}>
            <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
            <SelectContent>{US_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="font-semibold text-navy">Bio</Label>
        <Textarea rows={4} placeholder="Describe your investment strategy and goals..." value={form.bio} onChange={(e) => update("bio", e.target.value)} />
      </div>

      <div className="space-y-3">
        <Label className="font-semibold text-navy">Deal Types</Label>
        <div className="flex flex-wrap gap-2">
          {DEAL_TYPES.map((t) => (
            <button key={t} type="button" onClick={() => toggleDealType(t)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-all ${
                form.deal_types.includes(t) ? "gradient-primary text-white border-transparent" : "bg-muted text-muted-foreground border-border hover:border-teal/40"
              }`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <Label className="font-semibold text-navy">Target Markets</Label>
        <div className="flex gap-2">
          <Input placeholder="e.g. Atlanta, GA" value={marketInput} onChange={(e) => setMarketInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addMarket()} />
          <Button type="button" variant="outline" onClick={addMarket}><Plus className="w-4 h-4" /></Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {form.target_markets.map((m, i) => (
            <span key={i} className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-cyan/10 text-cyan border border-cyan/20">
              {m}
              <button onClick={() => removeMarket(i)} className="hover:opacity-70 text-base leading-none">×</button>
            </span>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <GradientButton onClick={() => onSave(form)} disabled={saving}>
          {saving ? "Saving..." : "Save Profile"}
        </GradientButton>
      </div>
    </div>
  );
}