import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import Logo from "../components/Logo";
import { ExternalLink, ArrowRight } from "lucide-react";

const TIERS = ["All", "Platinum", "Gold", "Preferred"];

const TIER_STYLES = {
  platinum: { label: "Platinum", border: "border-teal", badge: "bg-teal/10 text-teal border-teal/30" },
  gold: { label: "Gold", border: "border-amber-400", badge: "bg-amber-50 text-amber-600 border-amber-300" },
  preferred: { label: "Preferred", border: "border-cyan", badge: "bg-cyan/10 text-cyan border-cyan/30" },
};

export default function PartnersPage() {
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");

  useEffect(() => {
    base44.entities.Partner.filter({ is_active: true }).then((data) => {
      setPartners(data);
      setLoading(false);
    });
  }, []);

  const filtered = filter === "All"
    ? partners
    : partners.filter((p) => p.tier === filter.toLowerCase());

  return (
    <div className="min-h-screen font-barlow" style={{ backgroundColor: "#d6e4f0" }}>
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/"><Logo size="md" /></Link>
          <div className="flex items-center gap-4">
            <Link to="/partners" className="text-sm font-semibold text-teal">Partners</Link>
            <Link
              to="/onboarding"
              className="gradient-primary text-white text-sm font-bold px-5 py-2 rounded-lg hover:opacity-90 transition-all shadow"
            >
              Join Now
            </Link>
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
          <a
            href="mailto:partners@alsdealconnect.com"
            className="gradient-primary text-white font-bold px-8 py-3.5 rounded-xl hover:opacity-90 transition-all shadow-lg inline-flex items-center gap-2"
          >
            Apply to Partner <ArrowRight className="w-4 h-4" />
          </a>
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
        {/* Tier badge */}
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