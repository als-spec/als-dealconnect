import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import GradientButton from "@/components/GradientButton";
import { base44 } from "@/api/base44Client";
import { MapPin, Calendar, DollarSign, Star, Building, Tag, Layers } from "lucide-react";
import { format } from "date-fns";

const STAGE_COLORS = {
  "Under Contract": "bg-blue-100 text-blue-700",
  "Pre-Close": "bg-amber-100 text-amber-700",
  "Closing Soon": "bg-red-100 text-red-700",
};

export default function DealDetailModal({ deal, open, onClose, userRole, userId, userName, tcProfileId, onApplied }) {
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [matchScore, setMatchScore] = useState(null);
  const [error, setError] = useState("");

  const handleApply = async () => {
    if (!message.trim()) return;
    setSubmitting(true);
    setError("");

    // Guard: prevent duplicate applications
    try {
      const existing = await base44.entities.DealApplication.filter({ deal_id: deal.id, tc_id: userId });
      if (existing.length > 0) {
        setError("You've already applied to this deal.");
        setSubmitting(false);
        return;
      }
    } catch (e) {
      // If the check fails, proceed — creation will fail at the DB level if constrained
    }

    // Guard: prevent applying to a deal that was filled while modal was open
    if (deal.status === "filled" || deal.status === "closed") {
      setError("This deal is no longer accepting applications.");
      setSubmitting(false);
      return;
    }

    // Get AI match score
    let score = 75;
    let rationale = null;
    try {
      let tcProfile = null;
      if (tcProfileId) {
        const profiles = await base44.entities.TCProfile.filter({ user_id: userId });
        tcProfile = profiles[0] || null;
      }
      const res = await base44.functions.invoke('aiMatchScore', { deal, tcProfile, message });
      score = res.data?.score ?? 75;
      rationale = res.data?.rationale ?? null;
    } catch (e) {
      // fallback to default score
    }
    setMatchScore({ score, rationale });

    try {
      await base44.entities.DealApplication.create({
        deal_id: deal.id,
        tc_id: userId,
        tc_name: userName,
        tc_profile_id: tcProfileId || "",
        message,
        match_score: score,
        ai_rationale: rationale,
        status: "pending",
      });
      if (deal.status === "open") {
        await base44.entities.Deal.update(deal.id, { status: "in_review" });
      }
      setSubmitted(true);
      onApplied?.();
    } catch (e) {
      setError("Failed to submit your application. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!deal) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">{deal.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Tags */}
          <div className="flex flex-wrap gap-2">
            <span className="bg-teal/10 text-teal border border-teal/20 text-xs font-semibold px-3 py-1.5 rounded-full">{deal.property_type}</span>
            <span className="bg-cyan/10 text-cyan border border-cyan/20 text-xs font-semibold px-3 py-1.5 rounded-full">{deal.deal_type}</span>
            {deal.deal_stage && (
              <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${STAGE_COLORS[deal.deal_stage] || "bg-muted text-muted-foreground"}`}>
                {deal.deal_stage}
              </span>
            )}
          </div>

          {/* Details grid */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            {deal.property_address && (
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-teal mt-0.5 flex-shrink-0" />
                <div><p className="text-muted-foreground text-xs">Location</p><p className="font-medium">{deal.property_address}{deal.state ? `, ${deal.state}` : ""}</p></div>
              </div>
            )}
            {deal.compensation && (
              <div className="flex items-start gap-2">
                <DollarSign className="w-4 h-4 text-teal mt-0.5 flex-shrink-0" />
                <div><p className="text-muted-foreground text-xs">Compensation</p><p className="font-semibold text-foreground">{deal.compensation}</p></div>
              </div>
            )}
            {deal.closing_date && (
              <div className="flex items-start gap-2">
                <Calendar className="w-4 h-4 text-teal mt-0.5 flex-shrink-0" />
                <div><p className="text-muted-foreground text-xs">Target Close</p><p className="font-medium">{format(new Date(deal.closing_date), "MMM d, yyyy")}</p></div>
              </div>
            )}
            <div className="flex items-start gap-2">
              <Star className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-muted-foreground text-xs">Posted by</p>
                <p className="font-medium">{deal.investor_name || "Investor"}{deal.investor_rating ? ` · ★ ${deal.investor_rating.toFixed(1)}` : ""}</p>
              </div>
            </div>
          </div>

          {deal.description && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Description</p>
              <p className="text-sm text-foreground leading-relaxed">{deal.description}</p>
            </div>
          )}

          {/* TC Apply section */}
          {userRole === "tc" && deal.status !== "filled" && deal.status !== "closed" && (
            <div className="border-t border-border pt-4">
              {submitted ? (
                <div className="text-center py-4">
                  <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center mx-auto mb-3">
                    <span className="text-white text-xl">✓</span>
                  </div>
                  <p className="font-semibold text-foreground">Interest Submitted!</p>
                  <p className="text-sm text-muted-foreground mt-1">The investor will review your profile and reach out if it's a match.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-foreground">Submit Your Interest</p>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Cover Message *</Label>
                    <Textarea
                      placeholder="Introduce yourself, highlight relevant experience, and explain why you're a great fit for this deal…"
                      rows={4}
                      value={message}
                      onChange={e => setMessage(e.target.value)}
                    />
                  </div>
                  {error && (
                    <p className="text-sm text-destructive font-medium">{error}</p>
                  )}
                  <div className="flex gap-3 justify-end">
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <GradientButton onClick={handleApply} disabled={submitting || !message.trim()}>
                      {submitting ? "Submitting…" : "Submit Interest"}
                    </GradientButton>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}