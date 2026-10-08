import Link from "next/link";
import { Logo } from "@/components/Logo";

/** Simple readable layout for /privacy and /terms. */
export function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-neutral-100">
      <header className="bg-white border-b border-neutral-200">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" aria-label="LikeMinds home">
            <Logo size={32} />
          </Link>
          <nav className="flex gap-4 text-sm font-semibold text-neutral-600">
            <Link href="/privacy" className="hover:text-primary-700">Privacy</Link>
            <Link href="/terms" className="hover:text-primary-700">Terms</Link>
          </nav>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-10">
        <article className="bg-white rounded-2xl border border-neutral-200 p-6 sm:p-10 text-neutral-700 leading-relaxed space-y-4 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-neutral-900 [&_h2]:pt-4 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-1 [&_a]:text-primary-700 [&_a]:underline">
          <h1 className="text-2xl font-bold text-neutral-900">{title}</h1>
          <p className="text-sm text-neutral-500">Last updated {updated}</p>
          {children}
        </article>
      </main>
    </div>
  );
}
