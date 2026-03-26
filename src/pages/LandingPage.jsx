import { Link } from "react-router-dom";
import Logo from "../components/Logo";
import { ShieldCheck, TrendingUp, Award, DollarSign, ArrowRight } from "lucide-react";

const MEMBER_CARDS = [
  {
    role: "Transaction Coordinator",
    icon: "📋",
    color: "from-teal to-cyan",
    tags: ["Creative Finance", "Fix & Flip", "DSCR", "Subject-To"],
    desc: "Join a vetted network of TCs specializing in non-traditional real estate transactions.",
  },
  {
    role: "Investor / Agent",
    icon: "🏗️",
    color: "from-cyan to-blue-400",
    tags: ["Deal Flow", "TC Matching", "Private Lending", "Closings"],
    desc: "Access top-tier TCs and private lenders to close your creative finance deals faster.",
  },
  {
    role: "Private Money Lender",
    icon: "💼",
    color: "from-teal to-green-400",
    tags: ["Bridge Loans", "Fix & Flip", "DSCR", "Ground-Up"],
    desc: "Connect with qualified investors and grow your private lending portfolio.",
  },
];

const TRUST_ITEMS = [
  { icon: ShieldCheck, label: "Licensed Professionals" },
  { icon: TrendingUp, label: "Proven Track Record" },
  { icon: Award, label: "Creative Finance Experts" },
  { icon: DollarSign, label: "Vetted Private Lenders" },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen font-barlow" style={{ backgroundColor: "#e8f0f7" }}>
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Logo size="md" />
          <div className="flex items-center gap-4">
            <Link to="/partners" className="text-sm font-semibold text-slate-text hover:text-teal transition-colors">
              Partners
            </Link>
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
      <section className="relative overflow-hidden py-24 px-6">
        {/* Hex decorations */}
        <HexDecorations />

        <div className="relative max-w-4xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center gap-2 bg-teal/10 text-teal text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-full border border-teal/20">
            <Award className="w-3.5 h-3.5" /> Premier Creative Finance Platform
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold text-navy leading-tight">
            ALS Deal Flow:{" "}
            <span className="gradient-primary-text">Premier Creative Finance</span>{" "}
            Transaction Coordination
          </h1>
          <p className="text-lg text-slate-text max-w-2xl mx-auto leading-relaxed">
            Connecting vetted Transaction Coordinators, Investors, and Private Money Lenders
            to close creative finance deals with confidence and speed.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/onboarding"
              className="gradient-primary text-white font-bold px-8 py-3.5 rounded-xl hover:opacity-90 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 inline-flex items-center gap-2"
            >
              Start Your Transaction <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/onboarding"
              className="bg-white border-2 border-teal text-teal font-bold px-8 py-3.5 rounded-xl hover:bg-teal/5 transition-all shadow inline-flex items-center gap-2"
            >
              Join as a Member <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Trust bar */}
      <section className="bg-navy py-6 px-6">
        <div className="max-w-5xl mx-auto flex flex-wrap justify-center gap-8">
          {TRUST_ITEMS.map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-2 text-white/90">
              <Icon className="w-5 h-5 text-teal shrink-0" />
              <span className="text-sm font-semibold">{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Member type cards */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold text-navy mb-3">Who We Serve</h2>
            <p className="text-slate-text">Three pillars of the creative finance ecosystem</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {MEMBER_CARDS.map((card) => (
              <div
                key={card.role}
                className="bg-white rounded-2xl border border-border shadow-sm hover:shadow-lg transition-all hover:-translate-y-1 overflow-hidden"
              >
                <div className={`h-1.5 bg-gradient-to-r ${card.color}`} />
                <div className="p-7">
                  <div className="text-4xl mb-4">{card.icon}</div>
                  <h3 className="text-xl font-extrabold text-navy mb-2">{card.role}</h3>
                  <p className="text-sm text-slate-text mb-5 leading-relaxed">{card.desc}</p>
                  <div className="flex flex-wrap gap-2 mb-6">
                    {card.tags.map((t) => (
                      <span key={t} className="text-xs bg-teal/10 text-teal font-semibold px-2.5 py-1 rounded-full border border-teal/20">
                        {t}
                      </span>
                    ))}
                  </div>
                  <Link
                    to="/onboarding"
                    className="gradient-primary text-white text-sm font-bold px-5 py-2.5 rounded-lg hover:opacity-90 transition-all inline-flex items-center gap-2 w-full justify-center"
                  >
                    Join as {card.role.split(" ")[0]} <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-navy py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8 mb-8 pb-8 border-b border-white/10">
            <Logo size="md" />
            <div className="flex flex-wrap gap-6 text-sm text-white/60">
              <Link to="/partners" className="hover:text-teal transition-colors">Partners</Link>
              <Link to="/onboarding" className="hover:text-teal transition-colors">Join</Link>
            </div>
          </div>
          <p className="text-center text-white/40 text-sm">
            © {new Date().getFullYear()} ALS DealConnect. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

function HexDecorations() {
  const hexes = [
    { top: "5%", left: "3%", size: 180, rotate: 15 },
    { top: "60%", left: "1%", size: 120, rotate: -20 },
    { top: "10%", right: "4%", size: 220, rotate: 30 },
    { top: "55%", right: "2%", size: 150, rotate: -10 },
    { top: "35%", left: "45%", size: 100, rotate: 45 },
  ];
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {hexes.map((h, i) => (
        <svg
          key={i}
          width={h.size}
          height={h.size}
          viewBox="0 0 100 100"
          className="absolute"
          style={{ top: h.top, left: h.left, right: h.right, transform: `rotate(${h.rotate}deg)`, opacity: 0.05 }}
        >
          <polygon points="50,3 97,25 97,75 50,97 3,75 3,25" fill="none" stroke="#00e5b3" strokeWidth="3" />
        </svg>
      ))}
    </div>
  );
}