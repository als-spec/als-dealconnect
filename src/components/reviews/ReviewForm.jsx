import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { X, Star } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const CATEGORIES = [
  { key: "communication_rating", label: "Communication" },
  { key: "professionalism_rating", label: "Professionalism" },
  { key: "accuracy_rating", label: "Accuracy" },
  { key: "timeliness_rating", label: "Timeliness" },
];

function StarPicker({ value, onChange }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1">
      {[1,2,3,4,5].map(i => (
        <button key={i} type="button"
          onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(0)}
          onClick={() => onChange(i)}>
          <Star className={cn("w-6 h-6 transition-colors",
            i <= (hover || value) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"
          )} />
        </button>
      ))}
    </div>
  );
}

export default function ReviewForm({ tcProfileId, tcName, onClose, onSubmitted, currentUser }) {
  const [ratings, setRatings] = useState({ communication_rating: 0, professionalism_rating: 0, accuracy_rating: 0, timeliness_rating: 0 });
  const [overall, setOverall] = useState(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [dealType, setDealType] = useState("");
  const [saving, setSaving] = useState(false);

  const setRating = (key, val) => setRatings(prev => ({ ...prev, [key]: val }));

  const submit = async () => {
    if (!overall) { toast.error("Please select an overall rating"); return; }
    setSaving(true);
    await base44.entities.Review.create({
      tc_profile_id: tcProfileId,
      reviewer_id: currentUser.id,
      reviewer_name: currentUser.full_name,
      reviewer_company: currentUser.company_name || "",
      rating: overall,
      ...ratings,
      title,
      body,
      deal_type: dealType,
    });

    // Recalculate avg rating on TC profile
    const allRevs = await base44.entities.Review.filter({ tc_profile_id: tcProfileId });
    const avg = allRevs.reduce((sum, r) => sum + r.rating, 0) / allRevs.length;
    await base44.entities.TCProfile.update(tcProfileId, {
      average_rating: Math.round(avg * 10) / 10,
      review_count: allRevs.length,
    });

    toast.success("Review submitted successfully!");
    setSaving(false);
    onSubmitted?.();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-border sticky top-0 bg-card z-10">
          <div>
            <h3 className="font-bold text-navy text-lg">Rate {tcName}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Your feedback helps the community</p>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-muted-foreground hover:text-foreground" /></button>
        </div>

        <div className="p-6 space-y-5">
          {/* Overall */}
          <div>
            <p className="text-sm font-bold text-navy mb-2">Overall Rating *</p>
            <StarPicker value={overall} onChange={setOverall} />
          </div>

          {/* Structured categories */}
          <div className="grid grid-cols-2 gap-4">
            {CATEGORIES.map(cat => (
              <div key={cat.key}>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">{cat.label}</p>
                <StarPicker value={ratings[cat.key]} onChange={val => setRating(cat.key, val)} />
              </div>
            ))}
          </div>

          <div>
            <label className="text-sm font-bold text-navy mb-1.5 block">Deal Type (optional)</label>
            <Input value={dealType} onChange={e => setDealType(e.target.value)} placeholder="e.g. Fix & Flip, DSCR…" />
          </div>

          <div>
            <label className="text-sm font-bold text-navy mb-1.5 block">Review Title (optional)</label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Summarize your experience" />
          </div>

          <div>
            <label className="text-sm font-bold text-navy mb-1.5 block">Your Review</label>
            <Textarea value={body} onChange={e => setBody(e.target.value)} rows={4} placeholder="Describe your experience working with this TC…" />
          </div>

          <div className="flex gap-3 pt-1">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <button
              className="flex-1 gradient-primary text-white font-semibold py-2 rounded-lg disabled:opacity-40 hover:opacity-90 transition-opacity"
              onClick={submit} disabled={saving || !overall}
            >
              {saving ? "Submitting…" : "Submit Review"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}