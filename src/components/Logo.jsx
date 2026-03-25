export default function Logo({ size = "md" }) {
  const sizes = {
    sm: { icon: 32, text: "text-lg" },
    md: { icon: 40, text: "text-xl" },
    lg: { icon: 56, text: "text-3xl" },
  };
  const s = sizes[size] || sizes.md;

  return (
    <div className="flex items-center gap-2.5">
      <svg width={s.icon} height={s.icon} viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="logoGrad" x1="0" y1="0" x2="56" y2="56" gradientUnits="userSpaceOnUse">
            <stop stopColor="#00e5b0" />
            <stop offset="1" stopColor="#00aaff" />
          </linearGradient>
        </defs>
        {/* Hexagon frame */}
        <path d="M28 3L50.5 16.5V43.5L28 53L5.5 43.5V16.5L28 3Z" stroke="url(#logoGrad)" strokeWidth="2.5" fill="none" />
        {/* Simplified city skyline */}
        <rect x="16" y="26" width="5" height="16" rx="1" fill="url(#logoGrad)" opacity="0.8" />
        <rect x="23" y="20" width="5" height="22" rx="1" fill="url(#logoGrad)" />
        <rect x="30" y="24" width="5" height="18" rx="1" fill="url(#logoGrad)" opacity="0.9" />
        <rect x="37" y="30" width="4" height="12" rx="1" fill="url(#logoGrad)" opacity="0.7" />
        {/* Small windows */}
        <rect x="24.5" y="23" width="2" height="2" rx="0.5" fill="white" opacity="0.6" />
        <rect x="24.5" y="28" width="2" height="2" rx="0.5" fill="white" opacity="0.6" />
        <rect x="24.5" y="33" width="2" height="2" rx="0.5" fill="white" opacity="0.6" />
      </svg>
      <div className="flex flex-col leading-none">
        <span className={`${s.text} font-extrabold tracking-tight text-navy`}>
          ALS <span className="gradient-primary-text">DealConnect</span>
        </span>
      </div>
    </div>
  );
}