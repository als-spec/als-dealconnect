import StarRating from "../StarRating";

const SUB_LABELS = [
  { key: "communication_rating", label: "Communication" },
  { key: "professionalism_rating", label: "Professionalism" },
  { key: "accuracy_rating", label: "Accuracy" },
  { key: "timeliness_rating", label: "Timeliness" },
];

export default function ReviewCard({ review }) {
  const subRatings = SUB_LABELS.filter(s => review[s.key] > 0);
  return (
    <div className="bg-card rounded-xl border border-border p-5 hover:shadow-sm transition-shadow">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center shrink-0">
          <span className="text-white text-sm font-bold">
            {review.reviewer_name?.charAt(0)?.toUpperCase() || "?"}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <p className="text-sm font-bold text-navy">{review.reviewer_name || "Anonymous"}</p>
              {review.reviewer_company && (
                <p className="text-xs text-muted-foreground">{review.reviewer_company}</p>
              )}
            </div>
            <div className="flex flex-col items-end gap-1">
              <StarRating rating={review.rating} size="sm" />
              {review.deal_type && (
                <span className="text-xs font-medium bg-teal/10 text-teal px-2 py-0.5 rounded-full">
                  {review.deal_type}
                </span>
              )}
            </div>
          </div>
          {review.title && (
            <p className="text-sm font-semibold text-navy mt-2">"{review.title}"</p>
          )}
          {review.body && (
            <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{review.body}</p>
          )}
          {subRatings.length > 0 && (
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-3 pt-3 border-t border-border/60">
              {subRatings.map(s => (
                <div key={s.key} className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{s.label}</span>
                  <StarRating rating={review[s.key]} size="sm" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}