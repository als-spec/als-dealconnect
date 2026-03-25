const STATS = [
  { key: "deals_closed", label: "Deals Closed", suffix: "" },
  { key: "average_rating", label: "Avg Rating", suffix: "/5" },
  { key: "years_experience", label: "Yrs Experience", suffix: "+" },
  { key: "response_rate", label: "Response Rate", suffix: "%" },
];

export default function TCStatBar({ profile }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {STATS.map((s) => {
        const raw = profile?.[s.key];
        const value = raw != null ? (s.key === "average_rating" ? Number(raw).toFixed(1) : raw) : "—";
        return (
          <div
            key={s.key}
            className="bg-card rounded-xl border border-border overflow-hidden"
            style={{ borderTop: "3px solid transparent", borderImage: "linear-gradient(90deg,#00e5b0,#00aaff) 1" }}
          >
            <div className="p-4 text-center">
              <p className="text-2xl font-extrabold text-navy">
                {value}{raw != null ? s.suffix : ""}
              </p>
              <p className="text-xs text-muted-foreground mt-1 font-medium">{s.label}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}