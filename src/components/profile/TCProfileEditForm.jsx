import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import GradientButton from "../GradientButton";
import { Button } from "@/components/ui/button";

const ALL_SPECIALTIES = [
  "Creative Finance","Subject-To","Seller Finance","DSCR","Fix & Flip",
  "Short Sale","REO","Wholesale","Multi-Family","Commercial","Land",
  "Probate","New Construction","Lease Options","Hard Money",
];

const US_STATES = [
  "Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut",
  "Delaware","Florida","Georgia","Hawaii","Idaho","Illinois","Indiana","Iowa",
  "Kansas","Kentucky","Louisiana","Maine","Maryland","Massachusetts","Michigan",
  "Minnesota","Mississippi","Missouri","Montana","Nebraska","Nevada","New Hampshire",
  "New Jersey","New Mexico","New York","North Carolina","North Dakota","Ohio",
  "Oklahoma","Oregon","Pennsylvania","Rhode Island","South Carolina","South Dakota",
  "Tennessee","Texas","Utah","Vermont","Virginia","Washington","West Virginia",
  "Wisconsin","Wyoming",
];

export default function TCProfileEditForm({ profile, onSave, onCancel, saving }) {
  const [form, setForm] = useState({
    title: profile?.title || "",
    bio: profile?.bio || "",
    years_experience: profile?.years_experience || "",
    deals_closed: profile?.deals_closed || "",
    response_rate: profile?.response_rate || "",
    geographic_coverage: profile?.geographic_coverage || "",
    certifications: profile?.certifications || "",
    state: profile?.state || "",
    rate_residential: profile?.rate_residential || "",
    rate_creative_finance: profile?.rate_creative_finance || "",
    rate_commercial: profile?.rate_commercial || "",
    rate_rush: profile?.rate_rush || "",
    specialties: profile?.specialties || [],
    is_published: profile?.is_published ?? true,
  });

  const toggleSpecialty = (s) => {
    setForm((prev) => ({
      ...prev,
      specialties: prev.specialties.includes(s)
        ? prev.specialties.filter((x) => x !== s)
        : [...prev.specialties, s],
    }));
  };

  const update = (key, val) => setForm((prev) => ({ ...prev, [key]: val }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="font-semibold text-navy">Professional Title</Label>
          <Input placeholder="e.g. Senior Transaction Coordinator" value={form.title} onChange={(e) => update("title", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label className="font-semibold text-navy">State</Label>
          <Select value={form.state} onValueChange={(v) => update("state", v)}>
            <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
            <SelectContent>{US_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="font-semibold text-navy">Years Experience</Label>
          <Input type="number" placeholder="0" value={form.years_experience} onChange={(e) => update("years_experience", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label className="font-semibold text-navy">Deals Closed</Label>
          <Input type="number" placeholder="0" value={form.deals_closed} onChange={(e) => update("deals_closed", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label className="font-semibold text-navy">Response Rate (%)</Label>
          <Input type="number" placeholder="95" value={form.response_rate} onChange={(e) => update("response_rate", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label className="font-semibold text-navy">Geographic Coverage</Label>
          <Input placeholder="e.g. Southeast US, Nationwide" value={form.geographic_coverage} onChange={(e) => update("geographic_coverage", e.target.value)} />
        </div>
      </div>

      <div className="space-y-2">
        <Label className="font-semibold text-navy">Bio</Label>
        <Textarea rows={4} placeholder="Describe your experience, approach, and what makes you stand out..." value={form.bio} onChange={(e) => update("bio", e.target.value)} />
      </div>

      <div className="space-y-2">
        <Label className="font-semibold text-navy">Certifications & Credentials</Label>
        <Input placeholder="e.g. Licensed RE Agent, CTCP, Notary Public" value={form.certifications} onChange={(e) => update("certifications", e.target.value)} />
      </div>

      <div className="space-y-3">
        <Label className="font-semibold text-navy">Specialties</Label>
        <div className="flex flex-wrap gap-2">
          {ALL_SPECIALTIES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => toggleSpecialty(s)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-all ${
                form.specialties.includes(s)
                  ? "gradient-primary text-white border-transparent"
                  : "bg-muted text-muted-foreground border-border hover:border-teal/40"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <Label className="font-semibold text-navy">Service Rates</Label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { key: "rate_residential", label: "Residential" },
            { key: "rate_creative_finance", label: "Creative Finance" },
            { key: "rate_commercial", label: "Commercial" },
            { key: "rate_rush", label: "Rush / Expedited" },
          ].map((r) => (
            <div key={r.key} className="space-y-1.5">
              <Label className="text-sm text-muted-foreground">{r.label}</Label>
              <Input placeholder="e.g. $500 flat / $350–$600" value={form[r.key]} onChange={(e) => update(r.key, e.target.value)} />
            </div>
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