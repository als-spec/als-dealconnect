import { Link } from "react-router-dom";
import StarRating from "../StarRating";
import GradientButton from "../GradientButton";
import { MapPin, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

const AVAILABILITY_STYLES = {
  available: "bg-emerald-50 text-emerald-700 border-emerald-200",
  limited: "bg-amber-50 text-amber-700 border-amber-200",
  unavailable: "bg-red-50 text-red-700 border-red-200",
};

export default function TCCard({ profile, user }) {
  const displayName = user?.full_name || "TC Member";
  const specialties = profile?.specialties?.slice(0, 3) || [];

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
          {profile?.title && <p className="text-xs text-muted-foreground truncate">{profile.title}</p>}
          {profile?.state && (
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <MapPin className="w-3 h-3 shrink-0" />{profile.state}
            </p>
          )}
        </div>
        {profile?.availability && (
          <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full border shrink-0", AVAILABILITY_STYLES[profile.availability] || AVAILABILITY_STYLES.available)}>
            {profile.availability.charAt(0).toUpperCase() + profile.availability.slice(1)}
          </span>
        )}
      </div>

      {/* Rating */}
      {(profile?.average_rating || 0) > 0 && (
        <div className="flex items-center gap-2 mb-3">
          <StarRating rating={profile.average_rating} size="sm" showValue className="text-teal" />
          <span className="text-xs text-muted-foreground">({profile.review_count || 0} reviews)</span>
        </div>
      )}

      {/* Specialty tags */}
      {specialties.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {specialties.map((s) => (
            <span key={s} className="text-xs font-semibold px-2.5 py-1 rounded-full bg-teal/10 text-teal border border-teal/20">
              {s}
            </span>
          ))}
          {profile?.specialties?.length > 3 && (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-muted text-muted-foreground">
              +{profile.specialties.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Service Rates */}
      {(profile?.rate_residential || profile?.rate_creative_finance) && (
        <div className="mb-4 text-xs text-muted-foreground space-y-1">
          {profile.rate_residential && <div>Residential: <span className="font-semibold text-navy">{profile.rate_residential}</span></div>}
          {profile.rate_creative_finance && <div>Creative Finance: <span className="font-semibold text-navy">{profile.rate_creative_finance}</span></div>}
        </div>
      )}

      <div className="mt-auto flex gap-2">
        <Link to={`/profile/tc?id=${profile.user_id}`} className="flex-1">
          <GradientButton className="w-full text-sm py-2">Request Services</GradientButton>
        </Link>
      </div>
    </div>
  );
}