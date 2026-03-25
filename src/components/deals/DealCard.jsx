import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Calendar, DollarSign, Star } from "lucide-react";
import { format } from "date-fns";

const STATUS_STYLES = {
  open: "bg-teal/10 text-teal border-teal/20",
  in_review: "bg-cyan/10 text-cyan border-cyan/20",
  filled: "bg-muted text-muted-foreground border-border",
  closed: "bg-muted text-muted-foreground border-border",
};

const STATUS_LABELS = {
  open: "Open",
  in_review: "In Review",
  filled: "Filled",
  closed: "Closed",
};

const STAGE_COLORS = {
  "Under Contract": "bg-blue-100 text-blue-700 border-blue-200",
  "Pre-Close": "bg-amber-100 text-amber-700 border-amber-200",
  "Closing Soon": "bg-red-100 text-red-700 border-red-200",
};

export default function DealCard({ deal, onView, userRole, onEdit, onClose }) {
  const isOwner = userRole === "investor";

  return (
    <div className="bg-card rounded-xl border border-border shadow-sm hover:shadow-md transition-shadow overflow-hidden flex">
      {/* Teal left accent */}
      <div className="w-1 flex-shrink-0 gradient-primary rounded-l-xl" />

      <div className="flex-1 p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-foreground text-base leading-tight mb-1 truncate">{deal.title}</h3>
            {deal.property_address && (
              <div className="flex items-center gap-1 text-muted-foreground text-xs">
                <MapPin className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{deal.property_address}</span>
              </div>
            )}
          </div>
          <span className={`inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full border ${STATUS_STYLES[deal.status]}`}>
            {STATUS_LABELS[deal.status]}
          </span>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-2 mb-3">
          <span className="bg-teal/10 text-teal border border-teal/20 text-xs font-semibold px-2.5 py-1 rounded-full">{deal.property_type}</span>
          <span className="bg-cyan/10 text-cyan border border-cyan/20 text-xs font-semibold px-2.5 py-1 rounded-full">{deal.deal_type}</span>
          {deal.deal_stage && (
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${STAGE_COLORS[deal.deal_stage] || "bg-muted text-muted-foreground border-border"}`}>
              {deal.deal_stage}
            </span>
          )}
        </div>

        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground mb-4">
          {deal.compensation && (
            <span className="flex items-center gap-1 font-semibold text-foreground">
              <DollarSign className="w-3 h-3 text-teal" />
              {deal.compensation}
            </span>
          )}
          {deal.state && (
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {deal.state}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {deal.created_date ? format(new Date(deal.created_date), "MMM d, yyyy") : "—"}
          </span>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{deal.investor_name || "Investor"}</span>
            {deal.investor_rating && (
              <span className="flex items-center gap-0.5 text-amber-500">
                <Star className="w-3 h-3 fill-amber-400" />
                {deal.investor_rating.toFixed(1)}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isOwner && deal.status === "open" && (
              <>
                <Button variant="ghost" size="sm" onClick={() => onEdit?.(deal)} className="text-xs h-7 px-2">Edit</Button>
                <Button variant="ghost" size="sm" onClick={() => onClose?.(deal)} className="text-xs h-7 px-2 text-destructive hover:text-destructive">Close</Button>
              </>
            )}
            <Button size="sm" onClick={() => onView(deal)}
              className="gradient-primary text-white text-xs h-7 px-3 hover:opacity-90">
              {userRole === "tc" ? "View & Apply" : "View Details"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}