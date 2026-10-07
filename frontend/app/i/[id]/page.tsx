import type { Metadata } from "next";
import { ideaPath } from "@/lib/share";
import { fetchPublicIdea, summarize } from "./fetchIdea";
import { PublicIdea } from "./PublicIdea";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const idea = await fetchPublicIdea((await params).id);
  if (!idea) return { title: "Project · LikeMinds" };
  const roles = idea.looking_for?.length ? `Looking for: ${idea.looking_for.join(", ")}. ` : "";
  const description = roles + summarize(idea.body);
  return {
    title: `${idea.title} · LikeMinds`,
    description,
    alternates: { canonical: ideaPath(idea) },
    openGraph: { title: idea.title, description, url: ideaPath(idea), type: "article" },
    twitter: { card: "summary_large_image", title: idea.title, description },
  };
}

/** Public, shareable page for one idea: /i/12-alphabag */
export default async function IdeaPage({ params }: Props) {
  const { id } = await params;
  return <PublicIdea ideaId={parseInt(id, 10)} initial={await fetchPublicIdea(id)} />;
}
