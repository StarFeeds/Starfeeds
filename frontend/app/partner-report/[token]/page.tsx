import type { Metadata } from "next";
import { PartnerReportPage } from "./PartnerReportPage";

// Private link: keep it out of search engines.
export const metadata: Metadata = { title: "Community report · LikeMinds", robots: { index: false, follow: false } };

type Props = { params: Promise<{ token: string }> };

/** A partner's live community report, opened from the private link we send them. */
export default async function Page({ params }: Props) {
  return <PartnerReportPage token={(await params).token} />;
}
