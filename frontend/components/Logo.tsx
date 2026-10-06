/* LikeMinds logo: two minds meeting, the overlap is the shared idea.
   Source mark lives at `frontend/public/logo.svg`. Height-based sizing with
   width:auto keeps the aspect ratio undistorted at any size. */

const LOGO_SRC = "/logo.svg";

export function Logo({
  size = 36,
  className = "",
}: {
  /** Rendered height in px; width scales to preserve aspect ratio. */
  size?: number;
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={LOGO_SRC}
      alt="LikeMinds"
      style={{ height: size, width: "auto" }}
      className={className}
    />
  );
}
