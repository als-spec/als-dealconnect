import { Link } from "react-router-dom";
import GradientButton from "../GradientButton";
import { MapPin, Briefcase } from "lucide-react";

export default function InvestorCard({ profile, user }) {
  const displayName = user?.full_name || "Investor";
  const company = profile?.company_name || user?.company_name || "";
  const dealTypes = profile?.deal_types?.slice(0, 3) || [];

  return (
    <div className="bg-card rounded-2xl border border-border p-5 hover:shadow-md hover:border-teal/30 transition-all duration-200 flex flex-col">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-14 h-14 rounded-full p-0.5 gradient-primary shadow-sm shrink-0">
          <div className="w-full h-full rounded-full bg-navy flex items-center justify-center">
            <span className="text-xl font-extrabold text-white">{displayName.charAt(0).toUpperCase()}</span>
          </div>
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
      </div>

      {profile?.investment_focus && (
        <div className="flex items-start gap-1.5 mb-3">
          <Briefcase className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
          <p className="text-xs text-slate-text line-clamp-2">{profile.investment_focus}</p>
        </div>
      )}

      {dealTypes.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {dealTypes.map((d) => (
            <span key={d} className="text-xs font-semibold px-2.5 py-1 rounded-full bg-teal/10 text-teal border border-teal/20">
              {d}
            </span>
          ))}
          {profile?.deal_types?.length > 3 && (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-muted text-muted-foreground">
              +{profile.deal_types.length - 3}
            </span>
          )}
        </div>
      )}

      {profile?.target_markets?.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-4">
          {profile.target_markets.slice(0, 3).map((m) => (
            <span key={m} className="text-xs px-2 py-0.5 rounded-full bg-cyan/10 text-cyan border border-cyan/20 font-medium">
              {m}
            </span>
          ))}
          {profile.target_markets.length > 3 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
              +{profile.target_markets.length - 3}
            </span>
          )}
        </div>
      )}

      <div className="mt-auto">
        <Link to={`/profile/investor?id=${profile.user_id}`} className="block">
          <GradientButton className="w-full text-sm py-2">View Profile</GradientButton>
        </Link>
      </div>
    </div>
  );
}