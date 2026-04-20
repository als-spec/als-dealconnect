import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Star, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";

export default function MatchCard({ application, tcProfile, onUpdate }) {
  const score = application.match_score || 0;
  const [accepting, setAccepting] = useState(false);
  const [declining, setDeclining] = useState(false);

  const handleAccept = async () => {
    setAccepting(true);
    try {
      // Check the deal hasn't already been filled by a concurrent accept
      const deals = await base44.entities.Deal.filter({ id: application.deal_id });
      if (deals[0]?.status === "filled") {
        toast.error("This deal has already been filled.");
        onUpdate?.();
        return;
      }
      await base44.entities.DealApplication.update(application.id, { status: "accepted" });
      await base44.entities.Deal.update(application.deal_id, { status: "filled" });
      onUpdate?.();
    } catch (e) {
      toast.error("Failed to accept application. Please try again.");
      onUpdate?.();
    } finally {
      setAccepting(false);
    }
  };

  const handleDecline = async () => {
    setDeclining(true);
    try {
      await base44.entities.DealApplication.update(application.id, { status: "declined" });
      onUpdate?.();
    } catch (e) {
      toast.error("Failed to decline application. Please try again.");
    } finally {
      setDeclining(false);
    }
  };

  const gradientWidth = `${score}%`;

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3">
      {/* TC Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
          {(application.tc_name || "TC").charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground text-sm truncate">{application.tc_name || "TC Member"}</p>
          {tcProfile?.title && <p className="text-xs text-muted-foreground truncate">{tcProfile.title}</p>}
        </div>
        {tcProfile?.average_rating && (
          <div className="flex items-center gap-1 text-amber-500 text-xs">
            <Star className="w-3 h-3 fill-amber-400" />
            <span className="font-semibold">{tcProfile.average_rating.toFixed(1)}</span>
          </div>
        )}
      </div>

      {/* Specialties */}
      {tcProfile?.specialties?.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tcProfile.specialties.slice(0, 4).map(s => (
            <span key={s} className="bg-teal/10 text-teal border border-teal/20 text-xs px-2 py-0.5 rounded-full">{s}</span>
          ))}
        </div>
      )}

      {/* Match Score */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-muted-foreground">AI Match Score</span>
          <span className="text-xs font-bold gradient-primary-text">{score}%</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div className="h-full gradient-primary rounded-full transition-all duration-500" style={{ width: gradientWidth }} />
        </div>
        {application.ai_rationale && (
          <p className="text-xs text-muted-foreground mt-1.5 italic leading-relaxed">{application.ai_rationale}</p>
        )}
      </div>

      {/* Message */}
      {application.message && (
        <p className="text-xs text-muted-foreground italic leading-relaxed line-clamp-3">"{application.message}"</p>
      )}

      {/* Actions */}
      {application.status === "pending" && (
        <div className="flex gap-2 pt-1">
          <Button variant="outline" size="sm" onClick={handleDecline} disabled={declining || accepting} className="flex-1 gap-1 text-destructive hover:text-destructive border-destructive/30 hover:border-destructive/60 text-xs">
            <XCircle className="w-3.5 h-3.5" /> {declining ? "Declining…" : "Decline"}
          </Button>
          <Button size="sm" onClick={handleAccept} disabled={accepting || declining} className="flex-1 gap-1 gradient-primary text-white hover:opacity-90 text-xs">
            <CheckCircle className="w-3.5 h-3.5" /> {accepting ? "Accepting…" : "Accept"}
          </Button>
        </div>
      )}
      {application.status === "accepted" && (
        <div className="flex items-center gap-1.5 text-teal text-xs font-semibold">
          <CheckCircle className="w-4 h-4" /> Accepted
        </div>
      )}
      {application.status === "declined" && (
        <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
          <XCircle className="w-4 h-4" /> Declined
        </div>
      )}
    </div>
  );
}