import { ImageResponse } from "next/og";
import { fetchPublicIdea, summarize } from "./fetchIdea";

export const alt = "A project on LikeMinds";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Link-preview card for an idea (WhatsApp, X, LinkedIn, iMessage…). */
export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const idea = await fetchPublicIdea((await params).id);
  const title = idea?.title ?? "Find people to build with";
  // A closed team isn't recruiting, so the card shouldn't advertise roles.
  const roles = idea && !idea.team_closed ? idea.looking_for ?? [] : [];
  const blurb = idea ? summarize(idea.body, 140) : "Share what you're building on LikeMinds.";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 72px",
          background: "linear-gradient(135deg, #ffffff 0%, #f9f5ff 55%, #efe3ff 100%)",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div style={{ display: "flex", position: "relative", width: 86, height: 60 }}>
            <div style={{ position: "absolute", left: 0, top: 0, width: 60, height: 60, borderRadius: 30, background: "#4d0695" }} />
            <div style={{ position: "absolute", left: 26, top: 0, width: 60, height: 60, borderRadius: 30, background: "#7e2bd1", opacity: 0.92 }} />
          </div>
          <div style={{ fontSize: 36, fontWeight: 700, color: "#4d0695" }}>LikeMinds</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {roles.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12 }}>
              <div style={{ fontSize: 26, color: "#71717a" }}>Looking for</div>
              {roles.slice(0, 4).map((r) => (
                <div
                  key={r}
                  style={{ fontSize: 26, fontWeight: 700, color: "#ffffff", background: "#7e2bd1", padding: "6px 20px", borderRadius: 999 }}
                >
                  {r}
                </div>
              ))}
            </div>
          )}
          <div style={{ fontSize: title.length > 40 ? 64 : 80, fontWeight: 800, color: "#111114", lineHeight: 1.1 }}>
            {title.length > 80 ? title.slice(0, 79) + "…" : title}
          </div>
          <div style={{ fontSize: 30, color: "#3f3f46", lineHeight: 1.4 }}>{blurb}</div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 28, color: "#71717a" }}>
          <div style={{ display: "flex" }}>{idea ? `by ${idea.author.full_name}` : ""}</div>
          <div style={{ display: "flex", fontWeight: 700, color: "#4d0695" }}>Join on likeminds.live →</div>
        </div>
      </div>
    ),
    size,
  );
}
