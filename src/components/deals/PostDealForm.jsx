import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import GradientButton from "@/components/GradientButton";
import { Button } from "@/components/ui/button";
import { toastMutationError } from "@/lib/toasts";

const PROPERTY_TYPES = ["SFR", "Multi-Family 2-4", "Multi-Family 5+", "Commercial", "Mixed-Use", "Land", "Condo/TH"];
const DEAL_TYPES = ["Fix & Flip", "DSCR", "Creative Finance", "Wholesale", "Ground-Up Construction", "Short-Term Rental", "Bridge", "Lease Option"];
const DEAL_STAGES = ["Under Contract", "Pre-Close", "Closing Soon"];
const US_STATES = ["Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut","Delaware","Florida","Georgia","Hawaii","Idaho","Illinois","Indiana","Iowa","Kansas","Kentucky","Louisiana","Maine","Maryland","Massachusetts","Michigan","Minnesota","Mississippi","Missouri","Montana","Nebraska","Nevada","New Hampshire","New Jersey","New Mexico","New York","North Carolina","North Dakota","Ohio","Oklahoma","Oregon","Pennsylvania","Rhode Island","South Carolina","South Dakota","Tennessee","Texas","Utah","Vermont","Virginia","Washington","West Virginia","Wisconsin","Wyoming"];

const EMPTY = { title: "", property_address: "", state: "", property_type: "", deal_type: "", deal_stage: "Under Contract", compensation: "", description: "", closing_date: "" };

export default function PostDealForm({ user, onSave, onCancel, editDeal }) {
  const [form, setForm] = useState(editDeal ? { ...editDeal } : { ...EMPTY });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.property_type || !form.deal_type) return;
    setSaving(true);
    const payload = {
      ...form,
      investor_id: user.id,
      investor_name: user.full_name,
      status: editDeal?.status || "open",
    };
    try {
      if (editDeal) {
        await base44.entities.Deal.update(editDeal.id, payload);
      } else {
        await base44.entities.Deal.create(payload);
      }
    } catch (err) {
      console.error("PostDealForm submit failed:", err);
      toastMutationError(editDeal ? "update deal" : "post deal");
      setSaving(false);
      return;
    }
    setSaving(false);
    onSave();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2 space-y-1.5">
          <Label>Deal Title *</Label>
          <Input placeholder="e.g. 3/2 SFR Fix & Flip — Atlanta GA" value={form.title} onChange={e => set("title", e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label>Property Address / Market</Label>
          <Input placeholder="e.g. 123 Main St, Atlanta, GA" value={form.property_address} onChange={e => set("property_address", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>State *</Label>
          <Select value={form.state} onValueChange={v => set("state", v)}>
            <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
            <SelectContent>{US_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Property Type *</Label>
          <Select value={form.property_type} onValueChange={v => set("property_type", v)}>
            <SelectTrigger><SelectValue placeholder="Select property type" /></SelectTrigger>
            <SelectContent>{PROPERTY_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Deal Type *</Label>
          <Select value={form.deal_type} onValueChange={v => set("deal_type", v)}>
            <SelectTrigger><SelectValue placeholder="Select deal type" /></SelectTrigger>
            <SelectContent>{DEAL_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Deal Stage</Label>
          <Select value={form.deal_stage} onValueChange={v => set("deal_stage", v)}>
            <SelectTrigger><SelectValue placeholder="Select stage" /></SelectTrigger>
            <SelectContent>{DEAL_STAGES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Compensation Offered</Label>
          <Input placeholder="e.g. $800 flat fee or 0.5%" value={form.compensation} onChange={e => set("compensation", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Target Closing Date</Label>
          <Input type="date" value={form.closing_date} onChange={e => set("closing_date", e.target.value)} />
        </div>
        <div className="md:col-span-2 space-y-1.5">
          <Label>Description / Notes</Label>
          <Textarea placeholder="Describe the deal, what you need from the TC, timeline, etc." rows={4} value={form.description} onChange={e => set("description", e.target.value)} />
        </div>
      </div>
      <div className="flex gap-3 justify-end pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <GradientButton type="submit" disabled={saving}>{saving ? "Saving…" : editDeal ? "Save Changes" : "Post Deal"}</GradientButton>
      </div>
    </form>
  );
}