import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, X, CheckCircle2, XCircle, Eye, Mail, Phone, Globe } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const CATEGORIES = ["Title Company", "Private Lender", "Legal", "PropTech", "Insurance", "Document Services", "Other"];
const TIERS = ["preferred", "gold", "platinum"];

const TIER_BADGE = {
  platinum: "bg-teal/10 text-teal border-teal/30",
  gold: "bg-amber-50 text-amber-600 border-amber-300",
  preferred: "bg-cyan/10 text-cyan border-cyan/30",
};

const EMPTY = { company_name: "", category: "Title Company", tier: "preferred", description: "", website_url: "", logo_color: "#1432c8", is_active: true };

export default function AdminPartners() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("partners");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [reviewApp, setReviewApp] = useState(null);
  const [approveForm, setApproveForm] = useState({ tier: "preferred", logo_color: "#1432c8" });
  const [processing, setProcessing] = useState(false);

  // All partner records. Derived partitions below avoid a second round-trip.
  const { data: all = [], isLoading: loading } = useQuery({
    queryKey: ['Partner', 'list', { sort: '-created_date' }],
    queryFn: () => base44.entities.Partner.list("-created_date"),
  });

  const partners = useMemo(
    () => all.filter(p => !p.application_status || p.application_status === "approved"),
    [all]
  );
  const applications = useMemo(
    () => all.filter(p => p.application_status === "pending" || p.application_status === "rejected"),
    [all]
  );

  // Invalidate after any create/update/delete. Always goes through the same
  // query key, so both partitions refresh together.
  const refreshPartners = () => queryClient.invalidateQueries({ queryKey: ['Partner'] });

  const openNew = () => { setForm(EMPTY); setEditing(null); setShowForm(true); };
  const openEdit = (p) => { setForm({ ...p }); setEditing(p.id); setShowForm(true); };
  const cancel = () => { setShowForm(false); setEditing(null); };

  const save = async () => {
    if (!form.company_name.trim()) { toast.error("Company name is required"); return; }
    setSaving(true);
    try {
      if (editing) {
        await base44.entities.Partner.update(editing, form);
        toast.success("Partner updated");
      } else {
        await base44.entities.Partner.create(form);
        toast.success("Partner added");
      }
      setShowForm(false);
      refreshPartners();
    } catch (e) {
      toast.error("Failed to save partner. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    if (!confirm("Remove this partner?")) return;
    try {
      await base44.entities.Partner.delete(id);
      toast.success("Partner removed");
      refreshPartners();
    } catch (e) {
      toast.error("Failed to remove partner.");
    }
  };

  const openReview = (app) => {
    setReviewApp(app);
    setApproveForm({ tier: app.tier || "preferred", logo_color: app.logo_color || "#1432c8" });
  };

  const handleApprove = async () => {
    if (!reviewApp) return;
    setProcessing(true);
    try {
      await base44.entities.Partner.update(reviewApp.id, {
        is_active: true,
        application_status: "approved",
        tier: approveForm.tier,
        logo_color: approveForm.logo_color,
      });
      // Notify applicant
      if (reviewApp.contact_email) {
        try {
          await base44.integrations.Core.SendEmail({
            to: reviewApp.contact_email,
            subject: "Welcome to ALS DealConnect Partners!",
            body: `Hi ${reviewApp.contact_name || reviewApp.company_name},\n\nGreat news! Your partner application for ${reviewApp.company_name} has been approved. Your company is now featured on our Partners page.\n\nThank you for joining the ALS DealConnect network!\n\nThe ALS DealConnect Team`,
          });
        } catch (e) {
          // Email failure doesn't block approval
        }
      }
      toast.success(`${reviewApp.company_name} approved and is now live on the Partners page.`);
      setReviewApp(null);
      refreshPartners();
    } catch (e) {
      toast.error("Failed to approve application. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (appOverride) => {
    const target = appOverride || reviewApp;
    if (!target) return;
    setProcessing(true);
    try {
      await base44.entities.Partner.update(target.id, {
        is_active: false,
        application_status: "rejected",
      });
      if (target.contact_email) {
        try {
          await base44.integrations.Core.SendEmail({
            to: target.contact_email,
            subject: "ALS DealConnect Partner Application Update",
            body: `Hi ${target.contact_name || target.company_name},\n\nThank you for your interest in partnering with ALS DealConnect. After reviewing your application for ${target.company_name}, we are unable to move forward at this time.\n\nIf you have questions or would like to reapply in the future, please contact us.\n\nThe ALS DealConnect Team`,
          });
        } catch (e) {
          // Email failure doesn't block rejection
        }
      }
      toast.success("Application rejected.");
      setReviewApp(null);
      refreshPartners();
    } catch (e) {
      toast.error("Failed to reject application. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  const pendingCount = applications.filter(a => a.application_status === "pending").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-navy">Partners</h1>
        {tab === "partners" && (
          <Button onClick={openNew} className="gap-2 gradient-primary text-white border-0 hover:opacity-90">
            <Plus className="w-4 h-4" /> Add Partner
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted rounded-lg p-1 w-fit">
        {[
          { key: "partners", label: "Active Partners" },
          { key: "applications", label: `Applications${pendingCount > 0 ? ` (${pendingCount})` : ""}` },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "px-4 py-1.5 rounded-md text-sm font-medium transition-colors",
              tab === t.key ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-muted border-t-teal rounded-full animate-spin" /></div>
      ) : tab === "partners" ? (
        /* Active Partners Grid */
        partners.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">No active partners yet.</div>
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
        )
      ) : (
        /* Applications Queue */
        applications.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">No partner applications yet.</div>
        ) : (
          <div className="space-y-3">
            {applications.map((app) => (
              <div key={app.id} className="bg-card rounded-xl border border-border p-5 flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="font-bold text-navy">{app.company_name}</h3>
                    <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{app.category}</span>
                    <span className={cn(
                      "text-xs font-semibold px-2 py-0.5 rounded-full",
                      app.application_status === "pending" ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700"
                    )}>
                      {app.application_status === "pending" ? "Pending" : "Rejected"}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    {app.contact_name && (
                      <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" />{app.contact_name}</span>
                    )}
                    {app.contact_email && (
                      <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" />{app.contact_email}</span>
                    )}
                    {app.contact_phone && (
                      <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" />{app.contact_phone}</span>
                    )}
                    {app.website_url && (
                      <a href={app.website_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-teal hover:underline">
                        <Globe className="w-3.5 h-3.5" />{app.website_url}
                      </a>
                    )}
                  </div>
                  {app.description && (
                    <p className="text-sm text-slate-text line-clamp-2">{app.description}</p>
                  )}
                </div>
                {app.application_status === "pending" && (
                  <div className="flex gap-2 flex-shrink-0">
                    <Button size="sm" variant="outline" onClick={() => openReview(app)} className="gap-1.5 text-xs">
                      <Eye className="w-3.5 h-3.5" /> Review
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleReject(app)}
                      disabled={processing}
                      className="gap-1.5 text-xs border-destructive/30 text-destructive hover:bg-destructive/5"
                    >
                      <XCircle className="w-3.5 h-3.5" /> Reject
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      )}

      {/* Add/Edit Partner Form Modal */}
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

      {/* Approve Application Modal */}
      {reviewApp && reviewApp.application_status === "pending" && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-md p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-navy">Review Application</h2>
              <button onClick={() => setReviewApp(null)}><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>

            {/* Applicant summary */}
            <div className="bg-muted/40 rounded-xl p-4 space-y-2 text-sm">
              <p className="font-bold text-navy text-base">{reviewApp.company_name}</p>
              <p className="text-muted-foreground">{reviewApp.category}</p>
              {reviewApp.description && <p className="text-slate-text">{reviewApp.description}</p>}
              {reviewApp.website_url && (
                <a href={reviewApp.website_url} target="_blank" rel="noopener noreferrer" className="text-teal hover:underline flex items-center gap-1">
                  <Globe className="w-3.5 h-3.5" /> {reviewApp.website_url}
                </a>
              )}
              <div className="border-t border-border pt-2 mt-2 space-y-1">
                <p className="text-muted-foreground">Contact: <span className="font-medium text-navy">{reviewApp.contact_name}</span></p>
                <p className="text-muted-foreground">Email: <span className="font-medium text-navy">{reviewApp.contact_email}</span></p>
                {reviewApp.contact_phone && <p className="text-muted-foreground">Phone: <span className="font-medium text-navy">{reviewApp.contact_phone}</span></p>}
              </div>
            </div>

            {/* Approval settings */}
            <div className="space-y-3">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">If Approving — Set Display Options</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-navy mb-1 block">Partner Tier</label>
                  <select
                    className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background"
                    value={approveForm.tier}
                    onChange={(e) => setApproveForm({ ...approveForm, tier: e.target.value })}
                  >
                    {TIERS.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-navy mb-1 block">Logo Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={approveForm.logo_color}
                      onChange={(e) => setApproveForm({ ...approveForm, logo_color: e.target.value })}
                      className="h-9 w-14 cursor-pointer rounded border border-input"
                    />
                    <span className="text-xs text-muted-foreground">{approveForm.logo_color}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handleReject}
                disabled={processing}
                className="flex-1 border-destructive/30 text-destructive hover:bg-destructive/5"
              >
                <XCircle className="w-4 h-4 mr-1.5" /> Reject
              </Button>
              <Button
                onClick={handleApprove}
                disabled={processing}
                className="flex-1 gradient-primary text-white border-0 hover:opacity-90"
              >
                <CheckCircle2 className="w-4 h-4 mr-1.5" />
                {processing ? "Processing…" : "Approve & Publish"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
