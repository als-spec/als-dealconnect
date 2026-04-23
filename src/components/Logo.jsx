const LOGO_URL = "https://media.base44.com/images/public/69c3deabb1ff0abb8edcb2ec/6913ea987_noBgColor.png";

const sizes = {
  sm: "h-10",
  md: "h-14",
  lg: "h-20",
};

export default function Logo({ size = "md" }) {
  const heightClass = sizes[size] || sizes.md;

  return (
    <img
      src={LOGO_URL}
      alt="ALS Deal Flow TC Services"
      className={`${heightClass} w-auto object-contain`}
    />
  );
}