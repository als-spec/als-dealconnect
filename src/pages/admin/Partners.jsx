import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, X, Check } from "lucide-react";
import { toast } from "sonner";

const CATEGORIES = ["Title Company", "Private Lender", "Legal", "PropTech", "Insurance", "Document Services"];
const TIERS = ["preferred", "gold", "platinum"];

const TIER_BADGE = {
  platinum: "bg-teal/10 text-teal border-teal/30",
  gold: "bg-amber-50 text-amber-600 border-amber-300",
  preferred: "bg-cyan/10 text-cyan border-cyan/30",
};

const EMPTY = { company_name: "", category: "Title Company", tier: "preferred", description: "", website_url: "", logo_color: "#1432c8", is_active: true };

export default function AdminPartners() {
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = () => {
    base44.entities.Partner.list("-created_date").then((data) => {
      setPartners(data);
      setLoading(false);
    });
  };

  useEffect(() => { load(); }, []);

  const openNew = () => { setForm(EMPTY); setEditing(null); setShowForm(true); };
  const openEdit = (p) => { setForm({ ...p }); setEditing(p.id); setShowForm(true); };
  const cancel = () => { setShowForm(false); setEditing(null); };

  const save = async () => {
    if (!form.company_name.trim()) { toast.error("Company name is required"); return; }
    setSaving(true);
    if (editing) {
      await base44.entities.Partner.update(editing, form);
      toast.success("Partner updated");
    } else {
      await base44.entities.Partner.create(form);
      toast.success("Partner added");
    }
    setSaving(false);
    setShowForm(false);
    load();
  };

  const remove = async (id) => {
    if (!confirm("Remove this partner?")) return;
    await base44.entities.Partner.delete(id);
    toast.success("Partner removed");
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-navy">Partners</h1>
        <Button onClick={openNew} className="gap-2 gradient-primary text-white border-0 hover:opacity-90">
          <Plus className="w-4 h-4" /> Add Partner
        </Button>
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-navy">{editing ? "Edit Partner" : "Add Partner"}</h2>
              <button onClick={cancel}><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1 block">Company Name *</label>
                <Input value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} placeholder="Acme Title Co." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1 block">Category</label>
                  <select className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                    {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1 block">Tier</label>
                  <select className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background capitalize" value={form.tier} onChange={(e) => setForm({ ...form, tier: e.target.value })}>
                    {TIERS.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1 block">Description</label>
                <textarea className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background resize-none h-20" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Short description..." />
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1 block">Website URL</label>
                <Input value={form.website_url} onChange={(e) => setForm({ ...form, website_url: e.target.value })} placeholder="https://..." />
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1 block">Logo Panel Color</label>
                <div className="flex items-center gap-3">
                  <input type="color" value={form.logo_color} onChange={(e) => setForm({ ...form, logo_color: e.target.value })} className="h-9 w-14 cursor-pointer rounded border border-input" />
                  <span className="text-sm text-muted-foreground">{form.logo_color}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="is_active" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
                <label htmlFor="is_active" className="text-sm font-medium text-foreground">Active (visible on Partners page)</label>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={cancel} className="flex-1">Cancel</Button>
              <Button onClick={save} disabled={saving} className="flex-1 gradient-primary text-white border-0 hover:opacity-90">
                {saving ? "Saving..." : editing ? "Update" : "Add Partner"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-muted border-t-teal rounded-full animate-spin" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {partners.map((p) => (
            <div key={p.id} className="bg-card rounded-xl border border-border p-5 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-bold text-navy">{p.company_name}</h3>
                  <span className="text-xs text-muted-foreground">{p.category}</span>
                </div>
                <Badge className={`text-xs border ${TIER_BADGE[p.tier]} capitalize`}>{p.tier}</Badge>
              </div>
              {p.description && <p className="text-sm text-slate-text line-clamp-2">{p.description}</p>}
              <div className="flex items-center justify-between pt-1">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${p.is_active ? "bg-teal/10 text-teal" : "bg-muted text-muted-foreground"}`}>
                  {p.is_active ? "Active" : "Inactive"}
                </span>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => openEdit(p)} className="gap-1 h-7 text-xs"><Pencil className="w-3 h-3" /></Button>
                  <Button size="sm" variant="outline" onClick={() => remove(p.id)} className="gap-1 h-7 text-xs text-destructive hover:text-destructive"><Trash2 className="w-3 h-3" /></Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}