import Link from "next/link";
import type { PartnerReport } from "@/lib/api/types";
import { ideaPath } from "@/lib/share";

function Stat({ label, value, of, hint }: { label: string; value: number; of?: number; hint?: string }) {
  const pct = of ? Math.round((value / of) * 100) : null;
  return (
    <div className="bg-white rounded-2xl border border-neutral-200 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{label}</p>
      <p className="mt-1 text-3xl font-bold text-neutral-900 tabular-nums">
        {value}
        {pct !== null && <span className="ml-2 text-sm font-semibold text-primary-700">{pct}%</span>}
      </p>
      {hint && <p className="mt-1 text-xs text-neutral-500">{hint}</p>}
    </div>
  );
}

/** A partner community's outcomes: the numbers, the weekly trend, and its projects. */
export function PartnerReportView({ report }: { report: PartnerReport }) {
  const max = Math.max(1, ...report.weeks.map((w) => Math.max(w.signups, w.joined_team)));
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Stat label="Members joined" value={report.members} />
        <Stat label="Posted a project" value={report.posted} of={report.members} />
        <Stat label="Asked to join one" value={report.asked} of={report.members} />
        <Stat label="In a team" value={report.in_team} of={report.members} hint="accepted into a team, or accepted a teammate" />
        <Stat label="Teams formed" value={report.teams} hint={`${report.active_teams} active in the last 14 days`} />
      </div>

      <div className="bg-white rounded-2xl border border-neutral-200 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <h3 className="font-bold text-sm text-neutral-900">Last 8 weeks</h3>
          <div className="flex gap-4 text-xs text-neutral-500">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-primary-200" /> Joined LikeMinds</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-primary-600" /> Joined a team</span>
          </div>
        </div>
        <div className="flex items-end gap-2 h-32">
          {report.weeks.map((w) => (
            <div key={w.week} className="flex-1 h-full flex flex-col items-center gap-1 min-w-0">
              <div className="flex-1 w-full flex items-end justify-center gap-0.5">
                <div className="w-1/2 bg-primary-200 rounded-t min-h-[2px]" style={{ height: `${(w.signups / max) * 100}%` }} title={`${w.signups} joined`} />
                <div className="w-1/2 bg-primary-600 rounded-t min-h-[2px]" style={{ height: `${(w.joined_team / max) * 100}%` }} title={`${w.joined_team} joined a team`} />
              </div>
              <span className="text-[10px] text-neutral-400">{w.week.slice(5)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-neutral-200 p-4">
        <h3 className="font-bold text-sm text-neutral-900 mb-3">Projects your community is building ({report.projects.length})</h3>
        {report.projects.length === 0 ? (
          <p className="text-sm text-neutral-500">No public projects yet.</p>
        ) : (
          <ul className="divide-y divide-neutral-100">
            {report.projects.map((p) => (
              <li key={p.id} className="py-3 flex flex-wrap items-center gap-x-4 gap-y-1">
                <div className="min-w-0 flex-1">
                  <Link href={ideaPath(p)} target="_blank" className="font-semibold text-neutral-900 hover:text-primary-700">
                    {p.title}
                  </Link>
                  <p className="text-xs text-neutral-500">
                    by {p.owner}
                    {!p.owner_is_member && " · a member of your community joined this team"}
                  </p>
                </div>
                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${p.team_size >= 2 ? "bg-primary-50 text-primary-700" : "bg-neutral-100 text-neutral-600"}`}>
                  {p.team_size >= 2 ? `Team of ${p.team_size}` : "Looking for a team"}
                </span>
                {p.looking_for.length > 0 && !p.team_closed && (
                  <span className="text-xs text-neutral-500">Needs: {p.looking_for.join(", ")}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="text-xs text-neutral-400">
        Counts include everyone who joined through the <code>{report.ref}</code> link. Only public projects are listed; no
        contact details are shared. Updated {new Date(report.generated_at).toLocaleString()}.
      </p>
    </div>
  );
}
