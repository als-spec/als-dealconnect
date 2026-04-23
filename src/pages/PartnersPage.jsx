import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import Logo from "../components/Logo";
import { ExternalLink, ArrowRight, X, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const TIERS = ["All", "Platinum", "Gold", "Preferred"];
const CATEGORIES = ["Title Company", "Private Lender", "Legal", "PropTech", "Insurance", "Document Services", "Other"];

const TIER_STYLES = {
  platinum: { label: "Platinum", border: "border-teal", badge: "bg-teal/10 text-teal border-teal/30" },
  gold: { label: "Gold", border: "border-amber-400", badge: "bg-amber-50 text-amber-600 border-amber-300" },
  preferred: { label: "Preferred", border: "border-cyan", badge: "bg-cyan/10 text-cyan border-cyan/30" },
};

const EMPTY_FORM = {
  company_name: "",
  category: "Title Company",
  description: "",
  website_url: "",
  contact_name: "",
  contact_email: "",
  contact_phone: "",
};

export default function PartnersPage({ user }) {
  const navigate = useNavigate();
  const authedUser = user ?? null;
  const [filter, setFilter] = useState("All");
  const [showApply, setShowApply] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  // Active partners for the public directory. Public page — no auth needed.
  const { data: partners = [], isLoading: loading } = useQuery({
    queryKey: ['Partner', { is_active: true }],
    queryFn: () => base44.entities.Partner.filter({ is_active: true }),
  });

  const filtered = filter === "All"
    ? partners
    : partners.filter((p) => p.tier === filter.toLowerCase());

  const openApply = () => { setForm(EMPTY_FORM); setSubmitted(false); setError(""); setShowApply(true); };
  const closeApply = () => setShowApply(false);

  const handleSubmit = async () => {
    if (!form.company_name.trim() || !form.contact_name.trim() || !form.contact_email.trim()) {
      setError("Company name, your name, and email are required.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await base44.entities.Partner.create({
        ...form,
        is_active: false,
        application_status: "pending",
        tier: "preferred",
        logo_color: "#1432c8",
      });
      setSubmitted(true);
    } catch (e) {
      setError("Failed to submit your application. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen font-barlow" style={{ backgroundColor: "#d6e4f0" }}>
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/"><Logo size="md" /></Link>
          <div className="flex items-center gap-4">
            <Link to="/partners" className="text-sm font-semibold text-teal">Partners</Link>
            {authedUser ? (
              <button
                onClick={() => navigate("/dashboard")}
                className="gradient-primary text-white text-sm font-bold px-5 py-2 rounded-lg hover:opacity-90 transition-all shadow"
              >
                Go to Dashboard
              </button>
            ) : (
              <>
                <button
                  onClick={() => base44.auth.redirectToLogin(window.location.href)}
                  className="text-sm font-semibold text-navy border border-border px-4 py-2 rounded-lg hover:bg-muted transition-colors"
                >
                  Sign In
                </button>
                <Link
                  to="/onboarding"
                  className="gradient-primary text-white text-sm font-bold px-5 py-2 rounded-lg hover:opacity-90 transition-all shadow"
                >
                  Join Now
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="py-20 px-6 text-center">
        <h1 className="text-4xl md:text-5xl font-extrabold text-navy mb-4">
          Our{" "}
          <span className="relative inline-block">
            <span className="gradient-primary-text">Partners</span>
            <span className="absolute -bottom-1 left-0 right-0 h-1 rounded gradient-primary opacity-60" />
          </span>
        </h1>
        <p className="text-slate-text text-lg max-w-xl mx-auto mt-6">
          Trusted service providers vetted by the ALS DealConnect team to support your creative finance transactions.
        </p>
      </section>

      {/* Filter tabs */}
      <section className="px-6 pb-8">
        <div className="max-w-6xl mx-auto flex flex-wrap gap-3 justify-center">
          {TIERS.map((t) => {
            const style = t === "All" ? null : TIER_STYLES[t.toLowerCase()];
            const active = filter === t;
            return (
              <button
                key={t}
                onClick={() => setFilter(t)}
                className={`px-5 py-2 rounded-full text-sm font-bold border-2 transition-all ${
                  active
                    ? t === "All"
                      ? "border-navy bg-navy text-white"
                      : `${style.border} bg-white text-navy shadow`
                    : "border-border bg-white text-slate-text hover:border-navy/30"
                }`}
              >
                {t === "Platinum" && "⭐ "}
                {t === "Gold" && "🥇 "}
                {t === "Preferred" && "✅ "}
                {t}
              </button>
            );
          })}
        </div>
      </section>

      {/* Partner grid */}
      <section className="px-6 pb-20">
        <div className="max-w-6xl mx-auto">
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="w-8 h-8 border-4 border-muted border-t-teal rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-20">No partners found.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((partner) => (
                <PartnerCard key={partner.id} partner={partner} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Become a partner CTA */}
      <section className="px-6 py-16" style={{ backgroundColor: "#d6e4f0" }}>
        <div className="max-w-3xl mx-auto text-center bg-white rounded-2xl border border-border shadow-sm p-10">
          <h2 className="text-2xl font-extrabold text-navy mb-3">Become a Partner</h2>
          <p className="text-slate-text mb-6">
            Join our trusted network of service providers and connect with investors, TCs, and lenders closing creative finance deals.
          </p>
          <button
            onClick={openApply}
            className="gradient-primary text-white font-bold px-8 py-3.5 rounded-xl hover:opacity-90 transition-all shadow-lg inline-flex items-center gap-2"
          >
            Apply to Partner <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-navy py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <Logo size="sm" />
          <div className="flex gap-6 text-sm text-white/60">
            <Link to="/" className="hover:text-teal transition-colors">Home</Link>
            <Link to="/onboarding" className="hover:text-teal transition-colors">Join</Link>
          </div>
          <p className="text-white/40 text-sm">© {new Date().getFullYear()} ALS DealConnect</p>
        </div>
      </footer>

      {/* Partner Application Modal */}
      {showApply && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-border shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <div>
                <h2 className="text-xl font-extrabold text-navy">Partner Application</h2>
                <p className="text-sm text-slate-text mt-0.5">Tell us about your company — we'll review and get back to you.</p>
              </div>
              <button onClick={closeApply} className="p-1 rounded hover:bg-muted transition-colors">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            {submitted ? (
              <div className="p-10 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-teal/10 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8 text-teal" />
                </div>
                <h3 className="text-xl font-extrabold text-navy">Application Received!</h3>
                <p className="text-slate-text leading-relaxed">
                  Thank you for applying to be an ALS DealConnect partner. Our team will review your application and reach out within 2–3 business days.
                </p>
                <Button onClick={closeApply} className="gradient-primary text-white border-0 hover:opacity-90 mt-2">
                  Close
                </Button>
              </div>
            ) : (
              <div className="p-6 space-y-4">
                {/* Company Info */}
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3">Company Information</p>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-semibold text-navy mb-1 block">Company Name <span className="text-destructive">*</span></label>
                      <Input
                        value={form.company_name}
                        onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                        placeholder="Acme Title Co."
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-sm font-semibold text-navy mb-1 block">Category <span className="text-destructive">*</span></label>
                        <select
                          className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background"
                          value={form.category}
                          onChange={(e) => setForm({ ...form, category: e.target.value })}
                        >
                          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-sm font-semibold text-navy mb-1 block">Website</label>
                        <Input
                          value={form.website_url}
                          onChange={(e) => setForm({ ...form, website_url: e.target.value })}
                          placeholder="https://..."
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-navy mb-1 block">Description of Services</label>
                      <textarea
                        className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background resize-none h-20"
                        value={form.description}
                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                        placeholder="Briefly describe what your company offers and how you support creative finance transactions…"
                      />
                    </div>
                  </div>
                </div>

                {/* Contact Info */}
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3">Your Contact Information</p>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-semibold text-navy mb-1 block">Your Name <span className="text-destructive">*</span></label>
                      <Input
                        value={form.contact_name}
                        onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
                        placeholder="Jane Smith"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-sm font-semibold text-navy mb-1 block">Email <span className="text-destructive">*</span></label>
                        <Input
                          type="email"
                          value={form.contact_email}
                          onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
                          placeholder="jane@company.com"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-semibold text-navy mb-1 block">Phone</label>
                        <Input
                          type="tel"
                          value={form.contact_phone}
                          onChange={(e) => setForm({ ...form, contact_phone: e.target.value })}
                          placeholder="(555) 000-0000"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {error && <p className="text-sm text-destructive font-medium">{error}</p>}

                <div className="flex gap-3 pt-2">
                  <Button variant="outline" onClick={closeApply} className="flex-1">Cancel</Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="flex-1 gradient-primary text-white border-0 hover:opacity-90"
                  >
                    {submitting ? "Submitting…" : "Submit Application"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function PartnerCard({ partner }) {
  const tier = TIER_STYLES[partner.tier] || TIER_STYLES.preferred;
  const logoColor = partner.logo_color || "#1432c8";
  const initials = partner.company_name?.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();

  return (
    <div className="bg-white rounded-2xl border border-border shadow-sm hover:shadow-lg transition-all overflow-hidden">
      {/* Logo panel */}
      <div className="relative h-28 flex items-center justify-center" style={{ backgroundColor: logoColor }}>
        <span className="text-3xl font-extrabold text-white/90">{initials}</span>
        <span className={`absolute top-3 right-3 text-xs font-bold px-2.5 py-1 rounded-full border bg-white ${tier.badge}`}>
          {tier.label}
        </span>
      </div>

      {/* Content */}
      <div className="p-5">
        <h3 className="text-lg font-extrabold text-navy mb-1">{partner.company_name}</h3>
        <span className="text-xs font-semibold text-teal bg-teal/10 border border-teal/20 px-2.5 py-0.5 rounded-full">
          {partner.category}
        </span>
        {partner.description && (
          <p className="text-sm text-slate-text mt-3 leading-relaxed line-clamp-3">{partner.description}</p>
        )}
        {partner.website_url && (
          <a
            href={partner.website_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-teal hover:underline"
          >
            Visit Website <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
      </div>
    </div>
  );
}
