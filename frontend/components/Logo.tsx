/* StarFeeds logo. Save the official mark at `frontend/public/logo.png`
   (transparent background, mark only). Height-based sizing with width:auto
   keeps the aspect ratio undistorted at any size. */

const LOGO_SRC = "/logo.png";

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
      alt="StarFeeds"
      style={{ height: size, width: "auto" }}
      className={className}
    />
  );
}
