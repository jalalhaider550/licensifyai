import iconSrc from "@/assets/licensify-icon.png";
import fullSrc from "@/assets/licensify-logo.png";

interface LogoProps {
  variant?: "icon" | "full";
  className?: string;
}

/**
 * Official Licensify AI logo. Uses the approved uploaded artwork as-is.
 * variant="icon" → L+document mark only (navbars, app icon, favicon contexts)
 * variant="full" → full lockup including wordmark (marketing pages)
 */
export const Logo = ({ variant = "icon", className }: LogoProps) => {
  const src = variant === "icon" ? iconSrc : fullSrc;
  return (
    <img
      src={src}
      alt="Licensify AI"
      className={className}
      draggable={false}
      decoding="async"
    />
  );
};

export default Logo;
