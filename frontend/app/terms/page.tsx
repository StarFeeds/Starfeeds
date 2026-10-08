import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = { title: "Terms of Service · LikeMinds" };

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" updated="October 8, 2026">
      <p>
        These terms apply when you use LikeMinds at likeminds.live. By creating an account or using the site, you
        agree to them.
      </p>

      <h2>Your account</h2>
      <ul>
        <li>Give accurate information and keep your login secure. You&apos;re responsible for activity on your account.</li>
        <li>You must be at least 13 years old to use LikeMinds.</li>
      </ul>

      <h2>Your content</h2>
      <ul>
        <li>
          You own what you post. You give LikeMinds permission to host, display and share it on the platform (for
          example in feeds, emails and link previews) so the service works.
        </li>
        <li>
          Ideas you post publicly can be seen by anyone, and LikeMinds can&apos;t stop others from building on ideas
          they see. Don&apos;t share anything you need to keep confidential: use members-only visibility, or keep
          the details for your project group.
        </li>
        <li>Only post content you have the right to share.</li>
      </ul>

      <h2>Acceptable use</h2>
      <p>Don&apos;t use LikeMinds to:</p>
      <ul>
        <li>harass, threaten, impersonate or mislead others;</li>
        <li>post spam, scams, illegal content or malware;</li>
        <li>scrape the site, abuse the service, or try to access accounts or data that aren&apos;t yours.</li>
      </ul>
      <p>We may remove content or suspend accounts that break these rules.</p>

      <h2>Collaborations</h2>
      <p>
        LikeMinds helps people connect. Agreements between collaborators, such as ownership, equity or payment, are
        between you and them. We aren&apos;t a party to them and aren&apos;t responsible for how they turn out.
      </p>

      <h2>The service</h2>
      <p>
        LikeMinds is provided &ldquo;as is&rdquo;. We work to keep it available and secure, but we can&apos;t
        guarantee it will be uninterrupted or error-free. To the extent the law allows, we aren&apos;t liable for
        indirect losses from using it. We may change or discontinue features.
      </p>

      <h2>Ending your account</h2>
      <p>You can delete your account at any time in Settings.</p>

      <h2>Changes and contact</h2>
      <p>
        We may update these terms; continuing to use LikeMinds means you accept the changes. Questions:{" "}
        <a href="mailto:hello@likeminds.live">hello@likeminds.live</a>.
      </p>
    </LegalPage>
  );
}
