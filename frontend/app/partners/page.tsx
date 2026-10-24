import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { PartnerForm } from "./PartnerForm";

const description =
  "LikeMinds runs a 4-week Idea → Team sprint for your hub, bootcamp or accelerator. Your members find co-founders and teammates, and you get a live report of every team formed.";

export const metadata: Metadata = {
  title: "Partner with LikeMinds · Turn your community into teams",
  description,
  alternates: { canonical: "/partners" },
  openGraph: { title: "Partner with LikeMinds", description, url: "/partners", type: "website" },
  twitter: { card: "summary_large_image", title: "Partner with LikeMinds", description },
};

const AUDIENCES = [
  {
    who: "Bootcamps",
    problem: "Graduates finish with skills but no team, no real project, and no story to tell employers.",
    gets: "Graduates matched into real project teams, with work they can show and outcomes you can report.",
  },
  {
    who: "Hubs & communities",
    problem: "Members join, attend events, and drift. Funders ask what actually came out of it.",
    gets: "A team-formation programme we run for you, and a live report of who built what, with whom.",
  },
  {
    who: "Accelerators & investors",
    problem: "Applicants arrive late, solo, and unproven. Good teams are found by luck.",
    gets: "Earlier sight of teams forming around real problems, with evidence of progress as they build.",
  },
  {
    who: "Sponsors & programmes",
    problem: "Youth and entrepreneurship budgets need impact that can be measured, not just attendance.",
    gets: "A branded challenge with outcomes you can count: members active, teams formed, projects shipped.",
  },
];

const STEPS = [
  { when: "Week 0", title: "Kick-off", body: "You get a tracking link and a ready-to-send announcement for your members. We agree goals together." },
  { when: "Weeks 1–2", title: "Post & match", body: "Members post what they're building and the roles they need. We actively match people to projects." },
  { when: "Weeks 3–4", title: "Teams start building", body: "Accepted teammates work together in their project group. We nudge anyone who stalls." },
  { when: "Week 4", title: "Report & showcase", body: "You get the full report and a showcase of the strongest teams to share with your network." },
];

const REPORT = [
  "Members who joined through your link",
  "Who posted a project or asked to join one",
  "Who ended up in a team, and how many teams formed",
  "Which teams are still active",
  "Every public project your community is building",
];

export default function PartnersPage() {
  return (
    <div className="min-h-screen bg-white text-neutral-800">
      <header className="border-b border-neutral-200">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" aria-label="LikeMinds home">
            <Logo size={32} />
          </Link>
          <a href="#pilot" className="h-9 px-4 rounded-full bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold flex items-center">
            Run a pilot
          </a>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-b from-primary-50 to-white">
        <div className="max-w-6xl mx-auto px-4 py-16 sm:py-24">
          <p className="text-sm font-semibold text-primary-700 uppercase tracking-wide">For hubs, bootcamps &amp; accelerators</p>
          <h1 className="mt-3 text-4xl sm:text-5xl font-bold text-neutral-900 leading-tight max-w-3xl">
            Turn your community into teams that build.
          </h1>
          <p className="mt-5 text-lg text-neutral-600 max-w-2xl">{description}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#pilot" className="h-12 px-6 rounded-full bg-primary-600 hover:bg-primary-700 text-white font-semibold flex items-center">
              Run a free pilot
            </a>
            <a href="#how" className="h-12 px-6 rounded-full border border-neutral-300 hover:bg-neutral-50 font-semibold flex items-center">
              How it works
            </a>
          </div>
        </div>
      </section>

      {/* Why */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <h2 className="text-2xl sm:text-3xl font-bold text-neutral-900">Talent is everywhere. Teams are rare.</h2>
        <p className="mt-3 text-neutral-600 max-w-3xl">
          Most good ideas die because the person with the idea never meets the people who could build it with them. LikeMinds is
          where builders across Africa share what they&apos;re working on, say who they need, and form teams. Partners bring their
          community; we make the matches happen and show you the results.
        </p>
        <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-4">
          {AUDIENCES.map((a) => (
            <div key={a.who} className="rounded-2xl border border-neutral-200 p-6">
              <h3 className="font-bold text-lg text-neutral-900">{a.who}</h3>
              <p className="mt-2 text-sm text-neutral-500">{a.problem}</p>
              <p className="mt-3 text-sm text-neutral-800">
                <span className="font-semibold text-primary-700">With LikeMinds: </span>
                {a.gets}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* How */}
      <section id="how" className="bg-neutral-50 border-y border-neutral-200">
        <div className="max-w-6xl mx-auto px-4 py-16">
          <h2 className="text-2xl sm:text-3xl font-bold text-neutral-900">How a pilot works</h2>
          <p className="mt-3 text-neutral-600">Four weeks, run with your community. Little effort on your side.</p>
          <ol className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {STEPS.map((s, i) => (
              <li key={s.title} className="rounded-2xl bg-white border border-neutral-200 p-6">
                <span className="w-8 h-8 rounded-full bg-primary-600 text-white text-sm font-bold flex items-center justify-center">{i + 1}</span>
                <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-primary-700">{s.when}</p>
                <h3 className="mt-1 font-bold text-neutral-900">{s.title}</h3>
                <p className="mt-2 text-sm text-neutral-600">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Report */}
      <section className="max-w-6xl mx-auto px-4 py-16 grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-neutral-900">A live report you can show your funders</h2>
          <p className="mt-3 text-neutral-600">
            A private link, updated in real time, showing what your community did on LikeMinds:
          </p>
          <ul className="mt-5 space-y-3">
            {REPORT.map((r) => (
              <li key={r} className="flex gap-3 text-neutral-700">
                <svg className="w-5 h-5 mt-0.5 text-primary-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                {r}
              </li>
            ))}
          </ul>
          <p className="mt-5 text-sm text-neutral-500">
            Members&apos; contact details and private projects are never included.
          </p>
        </div>
        <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-5" aria-hidden>
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Example layout</p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {["Members joined", "In a team", "Teams formed"].map((l) => (
              <div key={l} className="rounded-xl bg-white border border-neutral-200 p-3">
                <p className="text-[10px] font-semibold uppercase text-neutral-500">{l}</p>
                <div className="mt-2 h-6 w-10 rounded bg-neutral-200" />
              </div>
            ))}
          </div>
          <div className="mt-2 rounded-xl bg-white border border-neutral-200 p-3 flex items-end gap-1.5 h-28">
            {[30, 45, 40, 60, 55, 75, 70, 90].map((h, i) => (
              <div key={i} className="flex-1 rounded-t bg-primary-200" style={{ height: `${h}%` }} />
            ))}
          </div>
          <div className="mt-2 rounded-xl bg-white border border-neutral-200 p-3 space-y-2">
            {[70, 55, 62].map((w, i) => (
              <div key={i} className="flex items-center justify-between gap-3">
                <div className="h-3 rounded bg-neutral-200" style={{ width: `${w}%` }} />
                <div className="h-5 w-16 rounded-full bg-primary-50" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-neutral-50 border-y border-neutral-200">
        <div className="max-w-3xl mx-auto px-4 py-16 space-y-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-neutral-900">Questions</h2>
          {[
            ["Do our members pay anything?", "No. LikeMinds is free for builders."],
            [
              "What does the pilot cost?",
              "We're running a small number of free pilots this season. Afterwards we agree a plan based on what the pilot achieved for you.",
            ],
            ["What do you need from us?", "Send the announcement to your members, and give us one contact person. We do the rest."],
            [
              "Can we run it for a specific cohort?",
              "Yes. Each cohort or campaign can have its own link, and they all roll up into your report.",
            ],
          ].map(([q, a]) => (
            <div key={q}>
              <h3 className="font-bold text-neutral-900">{q}</h3>
              <p className="mt-1 text-neutral-600">{a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Form */}
      <section id="pilot" className="max-w-3xl mx-auto px-4 py-16 scroll-mt-16">
        <h2 className="text-2xl sm:text-3xl font-bold text-neutral-900">Run a pilot with your community</h2>
        <p className="mt-3 text-neutral-600">Tell us about your community and we&apos;ll get back to you within two working days.</p>
        <div className="mt-8">
          <PartnerForm />
        </div>
      </section>

      <footer className="border-t border-neutral-200">
        <div className="max-w-6xl mx-auto px-4 py-8 flex flex-wrap items-center justify-between gap-4 text-sm text-neutral-500">
          <span>© {new Date().getFullYear()} LikeMinds</span>
          <nav className="flex gap-4">
            <Link href="/" className="hover:text-primary-700">Home</Link>
            <Link href="/privacy" className="hover:text-primary-700">Privacy</Link>
            <Link href="/terms" className="hover:text-primary-700">Terms</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
