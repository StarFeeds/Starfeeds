/* Avatar: renders the user's picture when set, else a gradient circle with
   their initial. Used across the app so profile pictures show everywhere. */

export function Avatar({
  src,
  name,
  size = 40,
  className = "",
}: {
  src?: string | null;
  name?: string | null;
  size?: number;
  className?: string;
}) {
  const initial = (name?.trim()?.[0] ?? "?").toUpperCase();
  return (
    <div
      style={{ width: size, height: size }}
      className={`rounded-full overflow-hidden flex-shrink-0 ${className}`}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name ?? "avatar"} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-primary-400 to-secondary-500 flex items-center justify-center">
          <span className="text-white font-bold" style={{ fontSize: Math.max(11, Math.round(size * 0.4)) }}>
            {initial}
          </span>
        </div>
      )}
    </div>
  );
}
