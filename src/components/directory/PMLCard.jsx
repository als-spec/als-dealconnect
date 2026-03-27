import { Link } from "react-router-dom";
import GradientButton from "../GradientButton";
import { MapPin, CheckCircle2, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const TIER_STYLES = {
  platinum: "bg-violet-50 text-violet-700 border-violet-200",
  gold: "bg-amber-50 text-amber-700 border-amber-200",
  preferred: "bg-blue-50 text-blue-700 border-blue-200",
};

export default function PMLCard({ profile, user }) {
  const displayName = user?.full_name || "PML Member";
  const company = profile?.company_name || user?.company_name || "";
  const loanTypes = profile?.loan_types?.slice(0, 3) || [];
  const tierStyle = TIER_STYLES[profile?.tier] || TIER_STYLES.preferred;

  return (
    <div className="bg-card rounded-2xl border border-border p-5 hover:shadow-md hover:border-teal/30 transition-all duration-200 flex flex-col">
      <div className="flex items-start gap-3 mb-4">
        <div className="relative shrink-0">
          <div className="w-14 h-14 rounded-full p-0.5 gradient-primary shadow-sm">
            <div className="w-full h-full rounded-full bg-navy flex items-center justify-center">
              <span className="text-xl font-extrabold text-white">{displayName.charAt(0).toUpperCase()}</span>
            </div>
          </div>
          {profile?.is_verified && (
            <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full gradient-primary flex items-center justify-center border-2 border-card">
              <CheckCircle2 className="w-3 h-3 text-white" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-navy truncate">{displayName}</h3>
          {company && <p className="text-xs text-muted-foreground truncate">{company}</p>}
          {profile?.state && (
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <MapPin className="w-3 h-3 shrink-0" />{profile.state}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-1 shrink-0">
          {profile?.tier && (
            <Badge variant="outline" className={cn("text-xs font-bold", tierStyle)}>
              {profile.tier.charAt(0).toUpperCase() + profile.tier.slice(1)}
            </Badge>
          )}
          {profile?.is_active && (
            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs font-bold gap-1">
              <Zap className="w-3 h-3" /> Active
            </Badge>
          )}
        </div>
      </div>

      {/* Loan size */}
      {(profile?.loan_min || profile?.loan_max) && (
        <div className="mb-3 text-xs text-muted-foreground">
          Loan Range: <span className="font-bold gradient-primary-text">{profile.loan_min || "—"} – {profile.loan_max || "—"}</span>
        </div>
      )}

      {/* Loan type tags */}
      {loanTypes.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {loanTypes.map((t) => (
            <span key={t} className="text-xs font-semibold px-2.5 py-1 rounded-full bg-cyan/10 text-cyan border border-cyan/20">{t}</span>
          ))}
          {profile?.loan_types?.length > 3 && (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-muted text-muted-foreground">+{profile.loan_types.length - 3}</span>
          )}
        </div>
      )}

      {/* Property types with teal checkmarks */}
      {profile?.property_types?.length > 0 && (
        <div className="mb-3 space-y-1">
          {profile.property_types.slice(0, 3).map((pt) => (
            <div key={pt} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CheckCircle2 className="w-3 h-3 text-teal shrink-0" />{pt}
            </div>
          ))}
        </div>
      )}

      {/* Geographic markets as teal pills */}
      {profile?.geographic_markets?.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {profile.geographic_markets.slice(0, 3).map((m) => (
            <span key={m} className="text-xs font-semibold px-2.5 py-1 rounded-full bg-teal/10 text-teal border border-teal/20">{m}</span>
          ))}
          {profile.geographic_markets.length > 3 && (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-muted text-muted-foreground">+{profile.geographic_markets.length - 3}</span>
          )}
        </div>
      )}

      <div className="mt-auto">
        <Link to={`/profile/pml?id=${profile.user_id}`}>
          <GradientButton className="w-full text-sm py-2">Submit a Deal</GradientButton>
        </Link>
      </div>
    </div>
  );
}